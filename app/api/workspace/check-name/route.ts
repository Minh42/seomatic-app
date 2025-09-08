import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { workspaces } from '@/lib/db/schema';
import { eq, and, ne } from 'drizzle-orm';
import { workspaceNameSchema } from '@/lib/validations/onboarding';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, currentWorkspaceId } = body;

    // Validate the workspace name format
    try {
      workspaceNameSchema.parse(name);
    } catch {
      return NextResponse.json(
        {
          available: false,
          error: 'Invalid workspace name format',
        },
        { status: 400 }
      );
    }

    // Check if workspace name already exists globally (across all users)
    // If currentWorkspaceId is provided, exclude it from the check (for editing existing workspace)
    const existingWorkspace = await db
      .select({ id: workspaces.id, ownerId: workspaces.ownerId })
      .from(workspaces)
      .where(
        currentWorkspaceId
          ? and(
              eq(workspaces.name, name),
              ne(workspaces.id, currentWorkspaceId)
            )
          : eq(workspaces.name, name)
      )
      .limit(1);

    const isAvailable = existingWorkspace.length === 0;
    const isOwnWorkspace =
      existingWorkspace.length > 0 &&
      existingWorkspace[0].ownerId === session.user.id;

    return NextResponse.json({
      available: isAvailable,
      message: isAvailable
        ? 'This workspace name is available'
        : isOwnWorkspace
          ? `You already have a workspace named "${name}". Please choose a different name.`
          : `This workspace name is already taken. Please choose a different name.`,
    });
  } catch (error) {
    console.error('Error checking workspace name:', error);
    return NextResponse.json(
      { error: 'Failed to check workspace name availability' },
      { status: 500 }
    );
  }
}
