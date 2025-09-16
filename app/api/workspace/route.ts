import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { WorkspaceService } from '@/lib/services/workspace-service';
import { OrganizationService } from '@/lib/services/organization-service';
import { UserService } from '@/lib/services/user-service';
import { z } from 'zod';

const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().optional(),
});

/**
 * GET /api/workspace
 * Get all workspaces with connections for the current user
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspaces = await WorkspaceService.getWorkspacesWithConnections(
      session.user.id
    );

    return NextResponse.json(workspaces);
  } catch (error) {
    console.error('Error fetching workspaces:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workspace
 * Create a new workspace within the user's organization
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user
    const user = await UserService.findByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get the user's organization
    const organization = await OrganizationService.getUserOrganization(user.id);
    if (!organization) {
      return NextResponse.json(
        { error: 'You must be part of an organization to create workspaces' },
        { status: 400 }
      );
    }

    // Parse and validate the request body
    const body = await request.json();
    const validatedData = createWorkspaceSchema.parse(body);

    // Create the workspace
    const workspace = await WorkspaceService.create({
      name: validatedData.name,
      description: validatedData.description,
      ownerId: user.id,
      organizationId: organization.id,
      createdById: user.id,
    });

    return NextResponse.json(workspace, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      if (
        error.message.includes('duplicate') ||
        error.message.includes('already exists')
      ) {
        return NextResponse.json(
          {
            error:
              'A workspace with this name already exists in your organization',
          },
          { status: 409 }
        );
      }
    }

    console.error('Error creating workspace:', error);
    return NextResponse.json(
      { error: 'Failed to create workspace' },
      { status: 500 }
    );
  }
}
