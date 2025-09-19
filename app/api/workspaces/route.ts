import { NextRequest, NextResponse } from 'next/server';
import { WorkspaceService } from '@/lib/services/workspace-service';
import { WorkspaceErrorHandler } from '@/lib/errors/workspace-errors';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { UserService } from '@/lib/services/user-service';
import { getUserRole } from '@/lib/auth/permissions';
import { OrganizationService } from '@/lib/services/organization-service';

/**
 * GET /api/workspaces
 * Get all workspaces for a specific organization or the user's first organization
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await UserService.findByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get organizationId from query params if provided
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    let organization;

    if (organizationId) {
      // Verify user has access to this organization
      const userOrgs = await OrganizationService.getAllUserOrganizations(
        user.id
      );
      organization = userOrgs.find(org => org.id === organizationId);

      if (!organization) {
        return NextResponse.json(
          { error: 'You do not have access to this organization' },
          { status: 403 }
        );
      }
    } else {
      // Fall back to user's first organization for backward compatibility
      organization = await OrganizationService.getUserOrganization(user.id);
      if (!organization) {
        // User is not part of any organization, return empty list
        return NextResponse.json({ workspaces: [] });
      }
    }

    // Get workspaces with their connections for the organization
    const workspaces =
      await WorkspaceService.getWorkspacesWithConnectionsByOrganization(
        organization.id
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

    // Get or create organization for the user
    let organization = await OrganizationService.getUserOrganization(user.id);

    if (!organization) {
      // Create organization for new user
      organization = await OrganizationService.create({
        name: 'My Organization',
        ownerId: user.id,
      });
    }

    const workspace = await WorkspaceService.create({
      name: name.trim(),
      ownerId: user.id, // Workspace owned by creator
      organizationId: organization.id,
      createdById: user.id,
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
