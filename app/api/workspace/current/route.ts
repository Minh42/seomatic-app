import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { WorkspaceService } from '@/lib/services/workspace-service';

/**
 * GET /api/workspace/current
 * Get the current workspace with connection for the authenticated user
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspace = await WorkspaceService.getCurrentWorkspaceWithConnection(
      session.user.id
    );

    if (!workspace) {
      return NextResponse.json(
        { error: 'No workspace found' },
        { status: 404 }
      );
    }

    return NextResponse.json(workspace);
  } catch (error) {
    console.error('Error fetching current workspace:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
