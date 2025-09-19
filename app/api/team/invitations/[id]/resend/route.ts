import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { TeamService } from '@/lib/services/team-service';
import { UserService } from '@/lib/services/user-service';
import { WorkspaceService } from '@/lib/services/workspace-service';

/**
 * POST /api/team/invitations/[id]/resend
 * Resend a team invitation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from database
    const user = await UserService.findByEmail(session.user.email);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user owns a workspace (is the plan owner)
    const workspaces = await WorkspaceService.getWorkspacesForUser(user.id);
    const isOwner = workspaces.some(w => w.ownerId === user.id);

    if (!isOwner) {
      return NextResponse.json(
        { error: 'You do not have permission to resend invitations' },
        { status: 403 }
      );
    }

    // Resend invitation
    const result = await TeamService.resendInvitation((await params).id);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'Invitation not found') {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: 'Failed to resend invitation' },
      { status: 500 }
    );
  }
}
