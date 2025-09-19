import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { TeamService } from '@/lib/services/team-service';
import { z } from 'zod';

const acceptSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'You must be logged in to accept an invitation' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validationResult = acceptSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }

    const { token } = validationResult.data;
    const userId = session.user.id;

    // Accept the invitation using TeamService
    const result = await TeamService.acceptInvitationWithWorkspace({
      token,
      userId,
    });

    return NextResponse.json({
      success: result.success,
      workspaceId: result.workspace.id,
      workspaceName: result.workspace.name,
      role: result.role,
    });
  } catch (error) {
    if (error instanceof Error) {
      // Handle specific error cases
      if (error.message === 'Invalid or expired invitation') {
        return NextResponse.json(
          { error: 'This invitation is invalid or has expired' },
          { status: 404 }
        );
      }

      if (error.message === 'You are already a member of this workspace') {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }

      if (error.message.includes('This invitation is for')) {
        // Email mismatch error
        return NextResponse.json({ error: error.message }, { status: 403 });
      }

      if (error.message.includes('not found')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
    }

    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    );
  }
}
