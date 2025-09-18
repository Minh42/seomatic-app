import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import {
  teamMembers,
  teamInvitations,
  organizations,
  users,
} from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * GET /api/user/invitations
 * Get all pending invitations for the current user's email
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all pending invitations for user's email
    // Join teamInvitations with teamMembers to get the invitation details
    const invitations = await db
      .select({
        id: teamMembers.id,
        role: teamMembers.role,
        createdAt: teamMembers.createdAt,
        organizationId: teamMembers.organizationId,
        organizationName: organizations.name,
        invitedBy: teamMembers.invitedBy,
        email: teamInvitations.email,
      })
      .from(teamInvitations)
      .innerJoin(teamMembers, eq(teamInvitations.teamMemberId, teamMembers.id))
      .innerJoin(
        organizations,
        eq(organizations.id, teamMembers.organizationId)
      )
      .where(
        and(
          eq(teamInvitations.email, session.user.email.toLowerCase()),
          eq(teamMembers.status, 'pending')
        )
      );

    // Get inviter names
    const invitationsWithInviters = await Promise.all(
      invitations.map(async invitation => {
        let inviterName = 'Unknown';

        if (invitation.invitedBy) {
          const [user] = await db
            .select({
              name: users.name,
              email: users.email,
            })
            .from(users)
            .where(eq(users.id, invitation.invitedBy))
            .limit(1);

          inviterName = user?.name || user?.email || 'Unknown';
        }

        return {
          id: invitation.id,
          role: invitation.role,
          createdAt: invitation.createdAt,
          organizationId: invitation.organizationId,
          organizationName: invitation.organizationName,
          inviterName,
        };
      })
    );

    return NextResponse.json({
      invitations: invitationsWithInviters,
      count: invitationsWithInviters.length,
    });
  } catch (error) {
    console.error('Error fetching user invitations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invitations' },
      { status: 500 }
    );
  }
}
