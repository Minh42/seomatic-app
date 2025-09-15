import { NextRequest, NextResponse } from 'next/server';
import { WorkspaceService } from '@/lib/services/workspace-service';
import { WorkspaceErrorHandler } from '@/lib/errors/workspace-errors';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { UserService } from '@/lib/services/user-service';
import { getUserRole } from '@/lib/auth/permissions';

/**
 * GET /api/workspaces
 * Get all workspaces for the current user's organization
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await UserService.findByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get workspaces with their connections
    const workspaces = await WorkspaceService.getWorkspacesWithConnections(
      user.id
    );

    return NextResponse.json({ workspaces });
  } catch (error) {
    const workspaceError = WorkspaceErrorHandler.handleWorkspaceError(
      error,
      'fetch'
    );
    WorkspaceErrorHandler.logError('GET /api/workspaces', workspaceError);
    return NextResponse.json(
      WorkspaceErrorHandler.formatApiResponse(workspaceError),
      { status: WorkspaceErrorHandler.getStatusCode(workspaceError) }
    );
  }
}

/**
 * POST /api/workspaces
 * Create a new workspace (owner/admin/member can create)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await UserService.findByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user has permission to create workspaces (not viewer)
    const userRole = await getUserRole(user.id);
    if (userRole === 'viewer' || !userRole) {
      const error = WorkspaceErrorHandler.parseWorkspaceError({
        message: 'Viewers cannot create workspaces',
        code: 'viewer_restricted',
        statusCode: 403,
      });
      return NextResponse.json(WorkspaceErrorHandler.formatApiResponse(error), {
        status: 403,
      });
    }

    const { name } = await request.json();

    // Validate workspace name
    const validationError = WorkspaceErrorHandler.validateWorkspaceName(name);
    if (validationError) {
      return NextResponse.json(
        WorkspaceErrorHandler.formatApiResponse(validationError),
        { status: validationError.statusCode }
      );
    }

    // Create workspace - always owned by the organization owner
    // For now, we'll use the current user as owner if they are an owner,
    // otherwise we need to find the actual owner
    let ownerId = user.id;

    if (userRole !== 'owner') {
      // Find the actual owner of the organization
      // This would need to be implemented based on your organization structure
      // For now, we'll use the current user
      ownerId = user.id;
    }

    const workspace = await WorkspaceService.create({
      name: name.trim(),
      ownerId,
    });

    return NextResponse.json({ workspace }, { status: 201 });
  } catch (error) {
    const workspaceError = WorkspaceErrorHandler.handleWorkspaceError(
      error,
      'create'
    );
    WorkspaceErrorHandler.logError('POST /api/workspaces', workspaceError);
    return NextResponse.json(
      WorkspaceErrorHandler.formatApiResponse(workspaceError),
      { status: WorkspaceErrorHandler.getStatusCode(workspaceError) }
    );
  }
}
