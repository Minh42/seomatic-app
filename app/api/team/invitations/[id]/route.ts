import { NextRequest, NextResponse } from 'next/server';
import { TeamService } from '@/lib/services/team-service';
import { requireRole, getUserFromRequest } from '@/lib/middleware/require-role';

/**
 * DELETE /api/team/invitations/[id]
 * Cancel a pending invitation
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check if user has permission to cancel invitations
    const roleCheck = await requireRole(request, {
      requiredAction: 'team:invite',
    });
    if (roleCheck) return roleCheck;

    const { user } = getUserFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found in request' },
        { status: 500 }
      );
    }

    // Delete invitation
    await TeamService.deleteInvitation((await params).id, user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error canceling invitation:', error);

    if (
      error instanceof Error &&
      error.message === 'Unauthorized to delete this invitation'
    ) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: 'Failed to cancel invitation' },
      { status: 500 }
    );
  }
}
