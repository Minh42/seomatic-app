import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { teamMembers, teamInvitations } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * POST /api/user/invitations/[invitationId]/decline
 * Decline a team invitation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { invitationId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { invitationId } = params;

    // Verify the invitation belongs to this user
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

    // Delete the invitation from both tables in a transaction
    await db.transaction(async tx => {
      // Delete from teamInvitations first (due to foreign key)
      await tx
        .delete(teamInvitations)
        .where(eq(teamInvitations.teamMemberId, invitationId));

      // Then delete from teamMembers
      await tx.delete(teamMembers).where(eq(teamMembers.id, invitationId));
    });

    return NextResponse.json({
      success: true,
      message: 'Invitation declined',
    });
  } catch (error) {
    console.error('Error declining invitation:', error);
    return NextResponse.json(
      { error: 'Failed to decline invitation' },
      { status: 500 }
    );
  }
}
