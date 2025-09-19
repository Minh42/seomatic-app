import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { TeamService } from '@/lib/services/team-service';
import { db } from '@/lib/db';
import { teamMembers, teamInvitations } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * POST /api/user/invitations/[invitationId]/accept
 * Accept a team invitation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { invitationId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { invitationId } = params;

    // Verify the invitation belongs to this user by checking teamInvitations table
    const [invitation] = await db
      .select()
      .from(teamInvitations)
      .innerJoin(teamMembers, eq(teamInvitations.teamMemberId, teamMembers.id))
      .where(
        and(
          eq(teamMembers.id, invitationId),
          eq(teamInvitations.email, session.user.email.toLowerCase()),
          eq(teamMembers.status, 'pending')
        )
      )
      .limit(1);

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found or already processed' },
        { status: 404 }
      );
    }

    // Accept the invitation using TeamService
    // The acceptInvitation method will handle the memberUserId update and status change
    await TeamService.acceptInvitation(invitationId, session.user.id);

    return NextResponse.json({
      success: true,
      message: 'Invitation accepted successfully',
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to accept invitation',
      },
      { status: 500 }
    );
  }
}
