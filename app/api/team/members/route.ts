import { NextRequest, NextResponse } from 'next/server';
import { TeamService } from '@/lib/services/team-service';
import { SubscriptionService } from '@/lib/services/subscription-service';
import { OrganizationService } from '@/lib/services/organization-service';
import { UserService } from '@/lib/services/user-service';
import { requireRole, getUserFromRequest } from '@/lib/middleware/require-role';

/**
 * GET /api/team/members
 * Get team members and pending invitations
 */
export async function GET(request: NextRequest) {
  try {
    // No specific role required - anyone can view team members
    const roleCheck = await requireRole(request);
    if (roleCheck) return roleCheck;

    const { user, role } = getUserFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found in request' },
        { status: 500 }
      );
    }

    const isOwner = role === 'owner';

    // Get team members
    const members = await TeamService.getTeamMembers(user.id);

    // Get pending invitations (only for owners and admins)
    let invitations: any[] = [];
    if (isOwner || role === 'admin') {
      invitations = await TeamService.getPendingInvitations(user.id);
    }

    // Get seat usage information
    let seatUsage = null;
    const organization = await OrganizationService.getUserOrganization(user.id);

    // Add the owner to the members list if organization exists
    let allMembers = [...members];

    if (organization) {
      // Get owner details and add to the members list
      const owner = await UserService.findById(organization.ownerId);
      if (owner) {
        // Add owner as first member with special formatting
        const ownerMember = {
          id: `owner-${owner.id}`,
          role: 'owner' as const,
          status: 'active' as const,
          createdAt: organization.createdAt || new Date().toISOString(),
          member: {
            id: owner.id,
            email: owner.email,
            name: owner.name,
            profileImage: owner.image,
          },
        };
        allMembers = [ownerMember, ...members];
      }
      // Get subscription details
      const subscription = await SubscriptionService.getSubscriptionWithPlan(
        isOwner ? user.id : organization.ownerId
      );

      if (subscription) {
        // For display: show total members including owner
        // Owner counts as 1, plus all team members and pending invitations
        const usedSeats = 1 + members.length + invitations.length; // +1 for owner

        // Count only active members for reference
        // const activeMemberCount = members.filter(m => m.status === 'active').length;

        seatUsage = {
          active: usedSeats, // Total team size including owner
          limit:
            subscription.plan.maxNbOfSeats === -1
              ? 'unlimited'
              : subscription.plan.maxNbOfSeats,
          total: usedSeats, // Same as active since all count toward limit
          isPaused: subscription.pausedAt !== null,
          planName: subscription.plan.name,
        };
      }
    }

    return NextResponse.json({
      members: allMembers, // Return allMembers which includes the owner
      invitations,
      isOwner,
      role,
      seatUsage,
    });
  } catch (error) {
    console.error('Error fetching team members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team members' },
      { status: 500 }
    );
  }
}
