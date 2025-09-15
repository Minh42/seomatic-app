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

    // Check if workspace name already exists for this user only
    // If currentWorkspaceId is provided, exclude it from the check (for editing existing workspace)
    const conditions = [
      eq(workspaces.name, name),
      eq(workspaces.ownerId, session.user.id),
    ];

    if (currentWorkspaceId) {
      conditions.push(ne(workspaces.id, currentWorkspaceId));
    }

    const existingWorkspace = await db
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(and(...conditions))
      .limit(1);

    const isAvailable = existingWorkspace.length === 0;

    return NextResponse.json({
      available: isAvailable,
      message: isAvailable
        ? 'This workspace name is available'
        : `You already have a workspace named "${name}". Please choose a different name.`,
    });
  } catch (error) {
    console.error('Error checking workspace name:', error);
    return NextResponse.json(
      { error: 'Failed to check workspace name availability' },
      { status: 500 }
    );
  }
}
