import { NextRequest, NextResponse } from 'next/server';
import { TeamService } from '@/lib/services/team-service';
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

    return NextResponse.json({
      members,
      invitations,
      isOwner,
      role,
    });
  } catch (error) {
    console.error('Error fetching team members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team members' },
      { status: 500 }
    );
  }
}
