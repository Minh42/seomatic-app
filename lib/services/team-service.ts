import { db } from '@/lib/db';
import {
  teamMembers,
  teamInvitations,
  users,
  workspaces,
  workspaceMembers,
} from '@/lib/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import crypto from 'crypto';
import { EmailService } from '@/lib/services/email-service';

export interface InviteTeamMemberParams {
  email: string;
  role: 'viewer' | 'member' | 'admin';
  invitedBy: string;
}

export interface AcceptInvitationParams {
  token: string;
  userId: string;
}

export interface UpdateMemberRoleParams {
  teamMemberId: string;
  role: 'viewer' | 'member' | 'admin';
}

export class TeamService {
  /**
   * Invite a team member
   */
  static async inviteMember({
    email,
    role,
    invitedBy,
  }: InviteTeamMemberParams) {
    // Check if user is already a team member
    const existingMember = await db
      .select()
      .from(teamMembers)
      .innerJoin(users, eq(users.id, teamMembers.memberUserId))
      .where(and(eq(users.email, email), eq(teamMembers.status, 'active')))
      .limit(1);

    if (existingMember.length > 0) {
      throw new Error('User is already a team member');
    }

    // Check for pending invitation
    const existingInvite = await db
      .select()
      .from(teamInvitations)
      .where(eq(teamInvitations.email, email.toLowerCase()))
      .limit(1);

    if (existingInvite.length > 0 && existingInvite[0].expiresAt > new Date()) {
      throw new Error('An invitation has already been sent to this email');
    }

    // Generate invitation token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    // Create team member record (pending)
    const [teamMember] = await db
      .insert(teamMembers)
      .values({
        userId: invitedBy, // plan owner
        memberUserId: invitedBy, // placeholder, will be updated when accepted
        invitedBy,
        role,
        status: 'pending',
      })
      .returning();

    // Create invitation
    await db.insert(teamInvitations).values({
      token,
      email: email.toLowerCase(),
      teamMemberId: teamMember.id,
      expiresAt,
    });

    // Get inviter details
    const [inviter] = await db
      .select({
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, invitedBy))
      .limit(1);

    const inviterName =
      inviter?.firstName && inviter?.lastName
        ? `${inviter.firstName} ${inviter.lastName}`
        : inviter?.email || 'A team member';

    // Send invitation email
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const inviteUrl = `${baseUrl}/invite?token=${token}`;

    await EmailService.sendTeamInvitation({
      email: email.toLowerCase(),
      inviterName,
      workspaceName: undefined, // TODO: Get workspace name if needed
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

    // Update team member record
    const [updated] = await db
      .update(teamMembers)
      .set({
        memberUserId: userId,
        status: 'active',
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
   * Get team members for a user
   */
  static async getTeamMembers(userId: string) {
    const members = await db
      .select({
        id: teamMembers.id,
        role: teamMembers.role,
        status: teamMembers.status,
        createdAt: teamMembers.createdAt,
        member: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImage: users.profileImage,
        },
      })
      .from(teamMembers)
      .innerJoin(users, eq(users.id, teamMembers.memberUserId))
      .where(
        and(eq(teamMembers.userId, userId), eq(teamMembers.status, 'active'))
      );

    return members;
  }

  /**
   * Get pending invitations
   */
  static async getPendingInvitations(userId: string) {
    const invitations = await db
      .select({
        id: teamInvitations.id,
        email: teamInvitations.email,
        expiresAt: teamInvitations.expiresAt,
        role: teamMembers.role,
      })
      .from(teamInvitations)
      .innerJoin(teamMembers, eq(teamMembers.id, teamInvitations.teamMemberId))
      .where(
        and(eq(teamMembers.userId, userId), eq(teamMembers.status, 'pending'))
      );

    return invitations;
  }

  /**
   * Update team member role
   */
  static async updateMemberRole({
    teamMemberId,
    role,
  }: UpdateMemberRoleParams) {
    // Verify updater has permission (should be owner or admin)
    // This check should be done at the API route level with proper auth

    const [updated] = await db
      .update(teamMembers)
      .set({
        role,
        updatedAt: new Date(),
      })
      .where(eq(teamMembers.id, teamMemberId))
      .returning();

    if (!updated) {
      throw new Error('Team member not found');
    }

    return { success: true, teamMember: updated };
  }

  /**
   * Remove team member
   */
  static async removeMember(teamMemberId: string) {
    // Check if member exists
    const [member] = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.id, teamMemberId))
      .limit(1);

    if (!member) {
      throw new Error('Team member not found');
    }

    // If pending, also delete invitation
    if (member.status === 'pending') {
      await db
        .delete(teamInvitations)
        .where(eq(teamInvitations.teamMemberId, teamMemberId));
    }

    // Delete team member
    const [deleted] = await db
      .delete(teamMembers)
      .where(eq(teamMembers.id, teamMemberId))
      .returning();

    return { success: true, deleted };
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
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, invitation.team_members.invitedBy))
      .limit(1);

    const inviterName =
      inviter?.firstName && inviter?.lastName
        ? `${inviter.firstName} ${inviter.lastName}`
        : inviter?.email || 'A team member';

    // Send new invitation email
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const inviteUrl = `${baseUrl}/invite?token=${token}`;

    await EmailService.sendTeamInvitation({
      email: invitation.team_invitations.email,
      inviterName,
      workspaceName: undefined, // TODO: Get workspace name if needed
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

    // Get workspace details
    const [workspace] = await db
      .select({
        id: workspaces.id,
        name: workspaces.name,
      })
      .from(workspaces)
      .where(eq(workspaces.ownerId, teamMember.userId))
      .limit(1);

    if (!workspace) {
      return { valid: false, error: 'Workspace not found' };
    }

    // Get inviter details
    const [inviter] = await db
      .select({
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, teamMember.invitedBy))
      .limit(1);

    const inviterName =
      inviter?.firstName && inviter?.lastName
        ? `${inviter.firstName} ${inviter.lastName}`
        : inviter?.email || 'Someone';

    return {
      valid: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        expiresAt: invitation.expiresAt,
        role: teamMember.role,
        workspace: {
          id: workspace.id,
          name: workspace.name,
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

      // Warning: Email mismatch but allow to continue
      if (currentUser.email.toLowerCase() !== invitation.email.toLowerCase()) {
        console.warn(
          `Email mismatch: User ${currentUser.email} accepting invitation for ${invitation.email}`
        );
      }

      // Check if user is already a member of this workspace
      const [existingMember] = await tx
        .select()
        .from(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, workspace.id),
            eq(workspaceMembers.userId, userId)
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

      // Add user to workspace_members table
      await tx.insert(workspaceMembers).values({
        workspaceId: workspace.id,
        userId,
        role: teamMember.role,
        joinedAt: new Date(),
      });

      // Delete the invitation as it's been used
      await tx
        .delete(teamInvitations)
        .where(eq(teamInvitations.id, invitation.id));

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
          currentUser.firstName && currentUser.lastName
            ? `${currentUser.firstName} ${currentUser.lastName}`
            : undefined
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
    const members = await db
      .select({
        id: workspaceMembers.id,
        role: workspaceMembers.role,
        joinedAt: workspaceMembers.joinedAt,
        user: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImage: users.profileImage,
        },
      })
      .from(workspaceMembers)
      .innerJoin(users, eq(users.id, workspaceMembers.userId))
      .where(eq(workspaceMembers.workspaceId, workspaceId));

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
    const [updated] = await db
      .update(workspaceMembers)
      .set({
        role,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, userId)
        )
      )
      .returning();

    if (!updated) {
      throw new Error('Workspace member not found');
    }

    // Also update in teamMembers if exists
    await db
      .update(teamMembers)
      .set({
        role,
        updatedAt: new Date(),
      })
      .where(eq(teamMembers.memberUserId, userId));

    return updated;
  }

  /**
   * Remove workspace member
   */
  static async removeWorkspaceMember(workspaceId: string, userId: string) {
    // Remove from workspace_members
    const [deleted] = await db
      .delete(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, userId)
        )
      )
      .returning();

    if (!deleted) {
      throw new Error('Workspace member not found');
    }

    // Also update teamMembers status to removed
    await db
      .update(teamMembers)
      .set({
        status: 'removed',
        updatedAt: new Date(),
      })
      .where(eq(teamMembers.memberUserId, userId));

    return { success: true, deleted };
  }

  /**
   * Check if user is workspace member
   */
  static async isWorkspaceMember(workspaceId: string, userId: string) {
    const [member] = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, userId)
        )
      )
      .limit(1);

    return !!member;
  }
}
