import { NextRequest, NextResponse } from 'next/server';
import { WorkspaceService } from '@/lib/services/workspace-service';
import { WorkspaceErrorHandler } from '@/lib/errors/workspace-errors';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { UserService } from '@/lib/services/user-service';
import { getUserRole } from '@/lib/auth/permissions';
import { db } from '@/lib/db';
import { workspaces } from '@/lib/db/schema';
import { eq, and, ne } from 'drizzle-orm';

/**
 * PUT /api/workspaces/[id]
 * Update workspace details (owner/admin only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await UserService.findByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user has permission to update workspaces (owner/admin)
    const userRole = await getUserRole(user.id);
    if (!userRole || (userRole !== 'owner' && userRole !== 'admin')) {
      const error = WorkspaceErrorHandler.parseWorkspaceError({
        message: 'Only owners and admins can update workspaces',
        code: 'admin_required',
        statusCode: 403,
      });
      return NextResponse.json(WorkspaceErrorHandler.formatApiResponse(error), {
        status: 403,
      });
    }

    const { name } = await request.json();
    const workspaceId = params.id;

    // Validate workspace name if provided
    if (name) {
      const validationError = WorkspaceErrorHandler.validateWorkspaceName(name);
      if (validationError) {
        return NextResponse.json(
          WorkspaceErrorHandler.formatApiResponse(validationError),
          { status: validationError.statusCode }
        );
      }
    }

    // Check if workspace exists
    const workspace = await WorkspaceService.getById(workspaceId);
    if (!workspace) {
      const error = WorkspaceErrorHandler.parseWorkspaceError({
        message: 'Workspace not found',
        code: 'workspace_not_found',
        statusCode: 404,
      });
      return NextResponse.json(WorkspaceErrorHandler.formatApiResponse(error), {
        status: 404,
      });
    }

    // Check if the new name already exists for this user (excluding current workspace)
    if (name && name.trim() !== workspace.name) {
      const existingWorkspace = await db
        .select({ id: workspaces.id })
        .from(workspaces)
        .where(
          and(
            eq(workspaces.name, name.trim()),
            eq(workspaces.ownerId, workspace.ownerId),
            ne(workspaces.id, workspaceId)
          )
        )
        .limit(1);

      if (existingWorkspace.length > 0) {
        const error = WorkspaceErrorHandler.parseWorkspaceError({
          message: `You already have a workspace named "${name}". Please choose a different name.`,
          code: 'duplicate_workspace_name',
          statusCode: 400,
        });
        return NextResponse.json(
          WorkspaceErrorHandler.formatApiResponse(error),
          { status: 400 }
        );
      }
    }

    // Update workspace
    const updatedWorkspace = await WorkspaceService.update({
      id: workspaceId,
      name: name?.trim(),
    });

    return NextResponse.json({ workspace: updatedWorkspace });
  } catch (error) {
    const workspaceError = WorkspaceErrorHandler.handleWorkspaceError(
      error,
      'update'
    );
    WorkspaceErrorHandler.logError('PUT /api/workspaces/[id]', workspaceError);
    return NextResponse.json(
      WorkspaceErrorHandler.formatApiResponse(workspaceError),
      { status: WorkspaceErrorHandler.getStatusCode(workspaceError) }
    );
  }
}

/**
 * DELETE /api/workspaces/[id]
 * Delete a workspace (owner/admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await UserService.findByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user has permission to delete workspaces (owner/admin)
    const userRole = await getUserRole(user.id);
    if (!userRole || (userRole !== 'owner' && userRole !== 'admin')) {
      const error = WorkspaceErrorHandler.parseWorkspaceError({
        message: 'Only owners and admins can delete workspaces',
        code: 'admin_required',
        statusCode: 403,
      });
      return NextResponse.json(WorkspaceErrorHandler.formatApiResponse(error), {
        status: 403,
      });
    }

    const workspaceId = params.id;

    // Check if workspace exists
    const workspace = await WorkspaceService.getById(workspaceId);
    if (!workspace) {
      const error = WorkspaceErrorHandler.parseWorkspaceError({
        message: 'Workspace not found',
        code: 'workspace_not_found',
        statusCode: 404,
      });
      return NextResponse.json(WorkspaceErrorHandler.formatApiResponse(error), {
        status: 404,
      });
    }

    // Delete workspace
    await WorkspaceService.delete(workspaceId);

    return NextResponse.json({
      success: true,
      message: 'Workspace deleted successfully',
    });
  } catch (error) {
    const workspaceError = WorkspaceErrorHandler.handleWorkspaceError(
      error,
      'delete'
    );
    WorkspaceErrorHandler.logError(
      'DELETE /api/workspaces/[id]',
      workspaceError
    );
    return NextResponse.json(
      WorkspaceErrorHandler.formatApiResponse(workspaceError),
      { status: WorkspaceErrorHandler.getStatusCode(workspaceError) }
    );
  }
}
