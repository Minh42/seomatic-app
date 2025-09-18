import { db } from '@/lib/db';
import {
  teamMembers,
  teamInvitations,
  users,
  workspaces,
  organizations,
} from '@/lib/db/schema';
import { eq, and, gt, or, not, sql } from 'drizzle-orm';
import crypto from 'crypto';
import { EmailService } from '@/lib/services/email-service';
import { OrganizationService } from '@/lib/services/organization-service';

export interface InviteTeamMemberParams {
  email: string;
  role: 'viewer' | 'member' | 'admin';
  invitedBy: string;
  organizationId: string;
}

export interface AcceptInvitationParams {
  token: string;
  userId: string;
}

export interface UpdateMemberRoleParams {
  teamMemberId: string;
  role: 'viewer' | 'member' | 'admin';
  updatedBy: string; // User ID of person making the update
  updaterRole?: 'owner' | 'admin' | 'member' | 'viewer'; // Role of person making update
}

export class TeamService {
  /**
   * Get all pending invitations for an organization
   */
  static async getPendingInvitations(userId: string) {
    // First get the user's organization
    const organization = await OrganizationService.getUserOrganization(userId);
    if (!organization) {
      return [];
    }

    const result = await db
      .select()
      .from(teamMembers)
      .innerJoin(
        teamInvitations,
        eq(teamInvitations.teamMemberId, teamMembers.id)
      )
      .where(
        and(
          eq(teamMembers.organizationId, organization.id),
          eq(teamMembers.status, 'pending')
        )
      );

    // Map the results to match TeamMember interface
    const invitations = result.map(row => ({
      id: row.team_members.id,
      role: row.team_members.role,
      status: 'pending' as const,
      createdAt: row.team_members.createdAt.toISOString(),
      member: {
        id: '', // No user ID yet for pending invitations
        email: row.team_invitations.email,
        name: null,
        profileImage: null,
      },
    }));

    return invitations;
  }

  /**
   * Delete a team invitation and its associated team member record
   */
  static async deleteInvitation(teamMemberId: string, userId: string) {
    if (!teamMemberId) {
      throw new Error('Team member ID is required for deletion');
    }

    // Verify ownership before deletion
    const [member] = await db
      .select({ userId: teamMembers.userId })
      .from(teamMembers)
      .where(eq(teamMembers.id, teamMemberId))
      .limit(1);

    if (!member || member.userId !== userId) {
      throw new Error('Unauthorized to delete this invitation');
    }

    // Delete invitation first (foreign key constraint)
    await db
      .delete(teamInvitations)
      .where(eq(teamInvitations.teamMemberId, teamMemberId));

    // Then delete team member
    await db.delete(teamMembers).where(eq(teamMembers.id, teamMemberId));
  }

  /**
   * Check if an invitation already exists for an email from a specific user
   */
  static async checkExistingInvitation(
    email: string,
    invitedBy: string
  ): Promise<boolean> {
    const existingInvite = await db
      .select()
      .from(teamInvitations)
      .innerJoin(teamMembers, eq(teamInvitations.teamMemberId, teamMembers.id))
      .where(
        and(
          eq(teamInvitations.email, email.toLowerCase()),
          eq(teamMembers.userId, invitedBy),
          eq(teamMembers.status, 'pending')
        )
      )
      .limit(1);

    return existingInvite.length > 0;
  }

  /**
   * Invite a team member
   */
  static async inviteMember({
    email,
    role,
    invitedBy,
    organizationId,
  }: InviteTeamMemberParams) {
    // Check if user is already a team member in this organization
    const existingMember = await db
      .select()
      .from(teamMembers)
      .innerJoin(users, eq(users.id, teamMembers.memberUserId))
      .where(
        and(
          eq(users.email, email),
          eq(teamMembers.organizationId, organizationId),
          eq(teamMembers.status, 'active')
        )
      )
      .limit(1);

    if (existingMember.length > 0) {
      throw new Error('User is already a team member of this organization');
    }

    // Check for pending invitation
    const existingInvite = await db
      .select()
      .from(teamInvitations)
      .where(eq(teamInvitations.email, email.toLowerCase()))
      .limit(1);

    if (existingInvite.length > 0 && existingInvite[0].expiresAt > new Date()) {
      // Return early instead of throwing - invitation already exists
      return {
        success: true,
        status: 'already_invited',
        teamMemberId: existingInvite[0].teamMemberId,
      };
    }

    // Generate invitation token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    // Use transaction to ensure consistency
    await db.transaction(async tx => {
      // Create team member record (pending)
      const [member] = await tx
        .insert(teamMembers)
        .values({
          userId: invitedBy, // person inviting
          invitedBy,
          role,
          status: 'pending',
          organizationId,
          // memberUserId is intentionally omitted - it will be null for pending invitations
        })
        .returning();

      // Create invitation
      await tx.insert(teamInvitations).values({
        token,
        email: email.toLowerCase(),
        teamMemberId: member.id,
        expiresAt,
      });

      return member;
    });

    // Get inviter details
    const [inviter] = await db
      .select({
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, invitedBy))
      .limit(1);

    // Get organization name
    const [organization] = await db
      .select({ name: organizations.name })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    // Send invitation email
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const inviteUrl = `${baseUrl}/invite?token=${token}`;

    await EmailService.sendTeamInvitation({
      email: email.toLowerCase(),
      inviterEmail: inviter!.email,
      organizationName: organization?.name,
      role,
      inviteUrl,
      expiresAt,
    });

    return {
      success: true,
      invitation: {
        token,
        email,
        role,
        expiresAt,
      },
    };
  }

  /**
   * Accept a team invitation
   */
  static async acceptInvitation({ token, userId }: AcceptInvitationParams) {
    // Find invitation
    const [invitation] = await db
      .select()
      .from(teamInvitations)
      .where(eq(teamInvitations.token, token))
      .limit(1);

    if (!invitation) {
      throw new Error('Invalid invitation token');
    }

    // Check if expired
    if (invitation.expiresAt < new Date()) {
      throw new Error('Invitation has expired');
    }

    // Get team member info to find organization
    const [teamMember] = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.id, invitation.teamMemberId))
      .limit(1);

    if (!teamMember || !teamMember.organizationId) {
      throw new Error('Team member record not found');
    }

    // Check if member should be active or suspended based on seat limits
    let memberStatus: 'active' | 'suspended' = 'active';

    // Get organization owner to check subscription limits
    const [org] = await db
      .select({ ownerId: organizations.ownerId })
      .from(organizations)
      .where(eq(organizations.id, teamMember.organizationId))
      .limit(1);

    if (org) {
      // Check current active member count
      const currentActiveCount = await this.getActiveMemberCount(
        teamMember.organizationId
      );

      // Get subscription limits
      const { SubscriptionService } = await import('./subscription-service');
      const subscription = await SubscriptionService.getSubscriptionWithPlan(
        org.ownerId
      );

      if (subscription && subscription.plan.maxNbOfSeats !== -1) {
        // If we're at or over the limit, new member should be suspended
        if (currentActiveCount >= subscription.plan.maxNbOfSeats) {
          memberStatus = 'suspended';
        }
      }
    }

    // Update team member record with appropriate status
    const [updated] = await db
      .update(teamMembers)
      .set({
        memberUserId: userId,
        status: memberStatus,
        updatedAt: new Date(),
      })
      .where(eq(teamMembers.id, invitation.teamMemberId))
      .returning();

    if (!updated) {
      throw new Error('Failed to accept invitation');
    }

    // Delete invitation
    await db
      .delete(teamInvitations)
      .where(eq(teamInvitations.id, invitation.id));

    // Track acceptance - notify inviter
    const [user] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const [inviter] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, updated.invitedBy))
      .limit(1);

    if (user && inviter) {
      await EmailService.sendInvitationAcceptedNotification(
        inviter.email,
        user.email
      );
    }

    return { success: true, teamMember: updated };
  }

  /**
   * Get team members for a user's organization (including suspended)
   */
  static async getTeamMembers(userId: string) {
    // First get the user's organization
    const organization = await OrganizationService.getUserOrganization(userId);
    if (!organization) {
      return [];
    }

    const members = await db
      .select({
        id: teamMembers.id,
        role: teamMembers.role,
        status: teamMembers.status,
        createdAt: teamMembers.createdAt,
        member: {
          id: users.id,
          email: users.email,
          name: users.name,
          profileImage: users.image,
        },
      })
      .from(teamMembers)
      .innerJoin(users, eq(users.id, teamMembers.memberUserId))
      .where(
        and(
          eq(teamMembers.organizationId, organization.id),
          or(
            eq(teamMembers.status, 'active'),
            eq(teamMembers.status, 'suspended')
          )
        )
      );

    return members;
  }

  /**
   * Update team member role
   */
  static async updateMemberRole({
    teamMemberId,
    role,
    updatedBy,
    updaterRole,
  }: UpdateMemberRoleParams) {
    // Get the team member to check ownership and current role
    const [member] = await db
      .select({
        id: teamMembers.id,
        organizationId: teamMembers.organizationId,
        memberUserId: teamMembers.memberUserId,
        currentRole: teamMembers.role,
        status: teamMembers.status,
      })
      .from(teamMembers)
      .where(eq(teamMembers.id, teamMemberId))
      .limit(1);

    if (!member) {
      throw new Error('Team member not found');
    }

    if (!member.organizationId) {
      throw new Error('Team member not associated with an organization');
    }

    // Get the organization to verify permissions
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, member.organizationId))
      .limit(1);

    if (!org) {
      throw new Error('Organization not found');
    }

    // Check if updater is the organization owner
    if (org.ownerId === updatedBy) {
      // Owner can update any member in their organization
    } else {
      // Check if updater is an admin in this organization
      const [updaterMembership] = await db
        .select({ role: teamMembers.role })
        .from(teamMembers)
        .where(
          and(
            eq(teamMembers.organizationId, member.organizationId),
            eq(teamMembers.memberUserId, updatedBy),
            eq(teamMembers.status, 'active')
          )
        )
        .limit(1);

      if (!updaterMembership || updaterMembership.role !== 'admin') {
        throw new Error(
          'You do not have permission to update this team member'
        );
      }
    }

    // Prevent changing the organization owner's role
    if (member.memberUserId === org.ownerId) {
      throw new Error('Cannot change the role of the organization owner');
    }

    // Prevent role escalation - can't give someone a higher role than you have
    if (updaterRole && updaterRole !== 'owner') {
      const roleHierarchy: Record<string, number> = {
        owner: 4,
        admin: 3,
        member: 2,
        viewer: 1,
      };

      if (roleHierarchy[role] > roleHierarchy[updaterRole]) {
        throw new Error('Cannot assign a role higher than your own');
      }
    }

    // Update the role
    const [updated] = await db
      .update(teamMembers)
      .set({
        role,
        updatedAt: new Date(),
      })
      .where(eq(teamMembers.id, teamMemberId))
      .returning();

    if (!updated) {
      throw new Error('Failed to update team member role');
    }

    return { success: true, teamMember: updated };
  }

  /**
   * Remove team member
   */
  static async removeMember(teamMemberId: string, removedBy: string) {
    // Use transaction for consistency
    return await db.transaction(async tx => {
      // Get member details
      const [member] = await tx
        .select()
        .from(teamMembers)
        .where(eq(teamMembers.id, teamMemberId))
        .limit(1);

      if (!member) {
        throw new Error('Team member not found');
      }

      // Check if the remover has permission (must be organization owner)
      if (!member.organizationId) {
        throw new Error('Team member not associated with an organization');
      }

      const [org] = await tx
        .select()
        .from(organizations)
        .where(eq(organizations.id, member.organizationId))
        .limit(1);

      if (!org || org.ownerId !== removedBy) {
        throw new Error('Only the organization owner can remove team members');
      }

      // Prevent removing the organization owner from their own team
      if (member.memberUserId === org.ownerId) {
        throw new Error('Cannot remove the organization owner from the team');
      }

      // If pending, also delete invitation
      if (member.status === 'pending') {
        await tx
          .delete(teamInvitations)
          .where(eq(teamInvitations.teamMemberId, teamMemberId));
      }

      // Delete team member
      const [deleted] = await tx
        .delete(teamMembers)
        .where(eq(teamMembers.id, teamMemberId))
        .returning();

      return { success: true, deleted };
    });
  }

  /**
   * Resend invitation
   */
  static async resendInvitation(teamMemberId: string) {
    // Get invitation details
    const [invitation] = await db
      .select()
      .from(teamInvitations)
      .innerJoin(teamMembers, eq(teamMembers.id, teamInvitations.teamMemberId))
      .where(eq(teamInvitations.teamMemberId, teamMemberId))
      .limit(1);

    if (!invitation) {
      throw new Error('Invitation not found');
    }

    // Generate new token and expiry
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Update invitation
    await db
      .update(teamInvitations)
      .set({
        token,
        expiresAt,
      })
      .where(eq(teamInvitations.teamMemberId, teamMemberId));

    // Get inviter details
    const [inviter] = await db
      .select({
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, invitation.team_members.invitedBy))
      .limit(1);

    // Get organization name
    let organizationName: string | undefined;
    if (invitation.team_members.organizationId) {
      const [org] = await db
        .select({ name: organizations.name })
        .from(organizations)
        .where(eq(organizations.id, invitation.team_members.organizationId))
        .limit(1);
      organizationName = org?.name;
    }

    // Send new invitation email
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const inviteUrl = `${baseUrl}/invite?token=${token}`;

    await EmailService.sendTeamInvitation({
      email: invitation.team_invitations.email,
      inviterEmail: inviter!.email,
      organizationName,
      role: invitation.team_members.role,
      inviteUrl,
      expiresAt,
    });

    return {
      success: true,
      token,
      expiresAt,
    };
  }

  /**
   * Validate an invitation token
   */
  static async validateInvitation(token: string) {
    const [invitation] = await db
      .select({
        id: teamInvitations.id,
        email: teamInvitations.email,
        expiresAt: teamInvitations.expiresAt,
        teamMemberId: teamInvitations.teamMemberId,
      })
      .from(teamInvitations)
      .where(
        and(
          eq(teamInvitations.token, token),
          gt(teamInvitations.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!invitation) {
      return { valid: false, error: 'Invalid or expired invitation' };
    }

    // Get team member details
    const [teamMember] = await db
      .select({
        id: teamMembers.id,
        role: teamMembers.role,
        userId: teamMembers.userId,
        invitedBy: teamMembers.invitedBy,
      })
      .from(teamMembers)
      .where(eq(teamMembers.id, invitation.teamMemberId))
      .limit(1);

    if (!teamMember) {
      return { valid: false, error: 'Team member record not found' };
    }

    // Get organization details
    const organization = await OrganizationService.getUserOrganization(
      teamMember.userId
    );

    if (!organization) {
      return { valid: false, error: 'Organization not found' };
    }

    // Get inviter details
    const [inviter] = await db
      .select({
        name: users.name,
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, teamMember.invitedBy))
      .limit(1);

    const inviterName = inviter?.name || inviter?.email || 'Someone';

    return {
      valid: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        expiresAt: invitation.expiresAt,
        role: teamMember.role,
        organization: {
          id: organization.id,
          name: organization.name,
        },
        inviter: {
          name: inviterName,
          email: inviter?.email || '',
        },
      },
    };
  }

  /**
   * Accept an invitation with workspace member creation
   */
  static async acceptInvitationWithWorkspace({
    token,
    userId,
  }: AcceptInvitationParams) {
    return db.transaction(async tx => {
      // Find and validate the invitation
      const [invitation] = await tx
        .select({
          id: teamInvitations.id,
          email: teamInvitations.email,
          expiresAt: teamInvitations.expiresAt,
          teamMemberId: teamInvitations.teamMemberId,
        })
        .from(teamInvitations)
        .where(
          and(
            eq(teamInvitations.token, token),
            gt(teamInvitations.expiresAt, new Date())
          )
        )
        .limit(1);

      if (!invitation) {
        throw new Error('Invalid or expired invitation');
      }

      // Get the team member record with workspace info
      const [teamMember] = await tx
        .select({
          id: teamMembers.id,
          role: teamMembers.role,
          userId: teamMembers.userId, // This is the workspace owner
          invitedBy: teamMembers.invitedBy,
          organizationId: teamMembers.organizationId,
        })
        .from(teamMembers)
        .where(eq(teamMembers.id, invitation.teamMemberId))
        .limit(1);

      if (!teamMember) {
        throw new Error('Team member record not found');
      }

      // Get the workspace
      const [workspace] = await tx
        .select({
          id: workspaces.id,
          name: workspaces.name,
          ownerId: workspaces.ownerId,
        })
        .from(workspaces)
        .where(eq(workspaces.ownerId, teamMember.userId))
        .limit(1);

      if (!workspace) {
        throw new Error('Workspace not found');
      }

      // Check if the user's email matches the invitation
      const [currentUser] = await tx
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!currentUser) {
        throw new Error('User not found');
      }

      // Strict email verification - must match exactly
      if (currentUser.email.toLowerCase() !== invitation.email.toLowerCase()) {
        throw new Error(
          `This invitation is for ${invitation.email}. You are currently logged in as ${currentUser.email}. Please log in with the correct account to accept this invitation.`
        );
      }

      // Check if user is already a member of this workspace through teamMembers
      const [existingMember] = await tx
        .select()
        .from(teamMembers)
        .where(
          and(
            eq(teamMembers.userId, workspace.ownerId),
            eq(teamMembers.memberUserId, userId),
            eq(teamMembers.status, 'active')
          )
        )
        .limit(1);

      if (existingMember) {
        throw new Error('You are already a member of this workspace');
      }

      // Update the team member record with the actual user
      await tx
        .update(teamMembers)
        .set({
          memberUserId: userId,
          status: 'active',
          updatedAt: new Date(),
        })
        .where(eq(teamMembers.id, teamMember.id));

      // The team member record is already updated above with memberUserId and status
      // No need to insert into a separate workspace_members table
      // The joinedAt is handled by the updatedAt field in teamMembers

      // Delete the invitation as it's been used
      await tx
        .delete(teamInvitations)
        .where(eq(teamInvitations.id, invitation.id));

      // Get organization name for the email
      let organizationName = 'the workspace';
      if (teamMember.organizationId) {
        const [org] = await tx
          .select({ name: organizations.name })
          .from(organizations)
          .where(eq(organizations.id, teamMember.organizationId))
          .limit(1);
        if (org) {
          organizationName = org.name;
        }
      }

      // Notify inviter about acceptance
      const [inviter] = await tx
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, teamMember.invitedBy))
        .limit(1);

      if (inviter) {
        await EmailService.sendInvitationAcceptedNotification(
          inviter.email,
          currentUser.email,
          organizationName,
          teamMember.role
        );
      }

      return {
        success: true,
        workspace: {
          id: workspace.id,
          name: workspace.name,
        },
        role: teamMember.role,
      };
    });
  }

  /**
   * Get workspace members
   */
  static async getWorkspaceMembers(workspaceId: string) {
    // Get workspace owner first
    const [workspace] = await db
      .select({ ownerId: workspaces.ownerId })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);

    if (!workspace) {
      throw new Error('Workspace not found');
    }

    // Get all team members for this workspace owner
    const members = await db
      .select({
        id: teamMembers.id,
        role: teamMembers.role,
        joinedAt: teamMembers.updatedAt, // Using updatedAt as joinedAt
        user: {
          id: users.id,
          email: users.email,
          name: users.name,
          profileImage: users.profileImage,
        },
      })
      .from(teamMembers)
      .innerJoin(users, eq(users.id, teamMembers.memberUserId))
      .where(
        and(
          eq(teamMembers.userId, workspace.ownerId),
          eq(teamMembers.status, 'active')
        )
      );

    return members;
  }

  /**
   * Update workspace member role
   */
  static async updateWorkspaceMemberRole(
    workspaceId: string,
    userId: string,
    role: 'viewer' | 'member' | 'admin'
  ) {
    // Get workspace owner first
    const [workspace] = await db
      .select({ ownerId: workspaces.ownerId })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);

    if (!workspace) {
      throw new Error('Workspace not found');
    }

    // Update the team member's role
    const [updated] = await db
      .update(teamMembers)
      .set({
        role,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(teamMembers.userId, workspace.ownerId),
          eq(teamMembers.memberUserId, userId),
          eq(teamMembers.status, 'active')
        )
      )
      .returning();

    if (!updated) {
      throw new Error('Team member not found');
    }

    return updated;
  }

  /**
   * Remove workspace member
   */
  static async removeWorkspaceMember(workspaceId: string, userId: string) {
    // Get workspace owner first
    const [workspace] = await db
      .select({ ownerId: workspaces.ownerId })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);

    if (!workspace) {
      throw new Error('Workspace not found');
    }

    // Update teamMembers status to removed
    const [deleted] = await db
      .update(teamMembers)
      .set({
        status: 'removed',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(teamMembers.userId, workspace.ownerId),
          eq(teamMembers.memberUserId, userId),
          eq(teamMembers.status, 'active')
        )
      )
      .returning();

    return { success: true, deleted };
  }

  /**
   * Check if user is workspace member
   */
  static async isWorkspaceMember(workspaceId: string, userId: string) {
    // Get workspace owner first
    const [workspace] = await db
      .select({ ownerId: workspaces.ownerId })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);

    if (!workspace) {
      return false;
    }

    // Check if user is a team member
    const [member] = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.userId, workspace.ownerId),
          eq(teamMembers.memberUserId, userId),
          eq(teamMembers.status, 'active')
        )
      )
      .limit(1);

    return !!member;
  }

  /**
   * Suspend multiple team members
   */
  static async suspendMembers(memberIds: string[]) {
    if (memberIds.length === 0) return [];

    const suspended = await db
      .update(teamMembers)
      .set({
        status: 'suspended',
        updatedAt: new Date(),
      })
      .where(
        and(
          teamMembers.id as any,
          memberIds
            .map(id => eq(teamMembers.id, id))
            .reduce((acc, curr) => (acc ? or(acc, curr) : curr))
        )
      )
      .returning();

    return suspended;
  }

  /**
   * Reactivate suspended members for an organization
   */
  static async reactivateMembers(organizationId: string, limit?: number) {
    // Get suspended members sorted by original join date
    const suspendedMembers = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.organizationId, organizationId),
          eq(teamMembers.status, 'suspended')
        )
      )
      .orderBy(teamMembers.joinedAt);

    // If no limit, reactivate all
    const membersToReactivate = limit
      ? suspendedMembers.slice(0, limit)
      : suspendedMembers;

    if (membersToReactivate.length === 0) return [];

    const reactivated = await db
      .update(teamMembers)
      .set({
        status: 'active',
        updatedAt: new Date(),
      })
      .where(
        and(
          teamMembers.id as any,
          membersToReactivate
            .map(m => eq(teamMembers.id, m.id))
            .reduce((acc, curr) => (acc ? or(acc, curr) : curr))
        )
      )
      .returning();

    return reactivated;
  }

  /**
   * Get count of active team members for an organization
   */
  static async getActiveMemberCount(organizationId: string) {
    const result = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.organizationId, organizationId),
          eq(teamMembers.status, 'active')
        )
      );

    // Owner is not counted in seat limits
    return result[0]?.count || 0;
  }

  /**
   * Suspend all non-owner members of an organization
   */
  static async suspendAllMembers(organizationId: string) {
    // Get the organization to find the owner
    const [org] = await db
      .select({ ownerId: organizations.ownerId })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    if (!org) {
      throw new Error('Organization not found');
    }

    // Suspend all active members except the owner
    const suspended = await db
      .update(teamMembers)
      .set({
        status: 'suspended',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(teamMembers.organizationId, organizationId),
          eq(teamMembers.status, 'active'),
          not(eq(teamMembers.memberUserId, org.ownerId))
        )
      )
      .returning();

    return suspended;
  }

  /**
   * Get member status
   */
  static async getMemberStatus(userId: string, organizationId: string) {
    const [member] = await db
      .select({
        id: teamMembers.id,
        status: teamMembers.status,
        role: teamMembers.role,
      })
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.organizationId, organizationId),
          eq(teamMembers.memberUserId, userId)
        )
      )
      .limit(1);

    return member || null;
  }
}
