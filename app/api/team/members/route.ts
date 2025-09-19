import { NextRequest, NextResponse } from 'next/server';
import { TeamService } from '@/lib/services/team-service';
import { SubscriptionService } from '@/lib/services/subscription-service';
import { OrganizationService } from '@/lib/services/organization-service';
import { UserService } from '@/lib/services/user-service';
import { requireRole, getUserFromRequest } from '@/lib/middleware/require-role';
import { db } from '@/lib/db';
import { teamMembers } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * GET /api/team/members
 * Get team members and pending invitations
 */
export async function GET(request: NextRequest) {
  try {
    // Get organizationId from query params
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    // No specific role required - anyone can view team members
    const roleCheck = await requireRole(request);
    if (roleCheck) return roleCheck;

    const { user } = getUserFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found in request' },
        { status: 500 }
      );
    }

    let organization;
    if (organizationId) {
      // Verify user has access to this organization
      const userOrgs = await OrganizationService.getAllUserOrganizations(
        user.id
      );
      organization = userOrgs.find(org => org.id === organizationId);

      if (!organization) {
        return NextResponse.json(
          { error: 'You do not have access to this organization' },
          { status: 403 }
        );
      }

      // Get the full organization details
      organization = await OrganizationService.getById(organizationId);
    } else {
      // Fall back to user's first organization for backward compatibility
      organization = await OrganizationService.getUserOrganization(user.id);
    }

    if (!organization) {
      return NextResponse.json({
        members: [],
        invitations: [],
        isOwner: false,
        role: null,
        seatUsage: null,
      });
    }

    const isOwner = organization.ownerId === user.id;

    // Run parallel queries for better performance
    const [memberInfo, members, ownerDetails, subscription] = await Promise.all(
      [
        // Get user's role in this organization (if not owner)
        !isOwner
          ? db
              .select({ role: teamMembers.role })
              .from(teamMembers)
              .where(
                and(
                  eq(teamMembers.organizationId, organization.id),
                  eq(teamMembers.memberUserId, user.id),
                  eq(teamMembers.status, 'active')
                )
              )
              .limit(1)
          : Promise.resolve([]),

        // Get team members
        TeamService.getTeamMembersByOrganization(organization.id),

        // Get owner details
        UserService.findById(organization.ownerId),

        // Get subscription details
        SubscriptionService.getSubscriptionWithPlan(organization.ownerId),
      ]
    );

    // Determine user's role
    let actualRole: string = 'viewer';
    if (isOwner) {
      actualRole = 'owner';
    } else if (memberInfo.length > 0 && memberInfo[0]) {
      actualRole = memberInfo[0].role;
    }

    // Get pending invitations (only for owners and admins) - do this after role check
    let invitations: Array<{
      id: string;
      email: string;
      role: string;
      status: string;
      createdAt: Date;
      expiresAt: Date;
    }> = [];
    if (isOwner || actualRole === 'admin') {
      invitations = await TeamService.getPendingInvitationsByOrganization(
        organization.id
      );
    }

    // Build the members list with owner
    let allMembers = [...members];
    if (ownerDetails) {
      const ownerMember = {
        id: `owner-${ownerDetails.id}`,
        role: 'owner' as const,
        status: 'active' as const,
        createdAt: organization.createdAt || new Date().toISOString(),
        member: {
          id: ownerDetails.id,
          email: ownerDetails.email,
          name: ownerDetails.name,
          profileImage: ownerDetails.image,
        },
      };
      allMembers = [ownerMember, ...members];
    }

    // Calculate seat usage
    let seatUsage = null;
    if (subscription) {
      const usedSeats = 1 + members.length + invitations.length; // +1 for owner

      seatUsage = {
        active: usedSeats,
        limit:
          subscription.plan.maxNbOfSeats === -1
            ? 'unlimited'
            : subscription.plan.maxNbOfSeats,
        total: usedSeats,
        isPaused: subscription.pausedAt !== null,
        planName: subscription.plan.name,
      };
    }

    return NextResponse.json({
      members: allMembers, // Return allMembers which includes the owner
      invitations,
      isOwner,
      role: actualRole,
      seatUsage,
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch team members' },
      { status: 500 }
    );
  }
}
