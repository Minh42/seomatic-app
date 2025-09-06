import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { WorkspaceService } from '@/lib/services/workspace-service';
import { z } from 'zod';

// Schema for workspace creation
const createWorkspaceSchema = z.object({
  name: z.string().min(1, 'Workspace name is required').max(100),
});

export async function POST(req: NextRequest) {
  try {
    // Get the current user session
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    // Parse and validate the request body
    const body = await req.json();
    const validationResult = createWorkspaceSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid data',
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { name } = validationResult.data;
    const userId = session.user.id;

    // Check if user already has a workspace
    const existingWorkspace =
      await WorkspaceService.getPrimaryWorkspace(userId);

    if (existingWorkspace) {
      // Update existing workspace name
      const updatedWorkspace = await WorkspaceService.update({
        id: existingWorkspace.id,
        name,
      });

      return NextResponse.json(
        {
          workspace: {
            id: updatedWorkspace.id,
            name: updatedWorkspace.name,
          },
          message: 'Workspace updated successfully',
        },
        { status: 200 }
      );
    }

    // Create a new workspace
    const newWorkspace = await WorkspaceService.create({
      name,
      ownerId: userId,
    });

    return NextResponse.json(
      {
        workspace: {
          id: newWorkspace.id,
          name: newWorkspace.name,
        },
        message: 'Workspace created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Workspace creation error:', error);

    // Handle service-level errors
    if (error instanceof Error) {
      if (error.message === 'A workspace with this name already exists') {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
    }

    return NextResponse.json(
      { error: 'Failed to create workspace' },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch user's workspace
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get user's primary workspace
    const workspace = await WorkspaceService.getPrimaryWorkspace(userId);

    if (!workspace) {
      return NextResponse.json({ workspace: null }, { status: 200 });
    }

    return NextResponse.json(
      {
        workspace: {
          id: workspace.id,
          name: workspace.name,
          createdAt: workspace.createdAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching workspace:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workspace' },
      { status: 500 }
    );
  }
}
