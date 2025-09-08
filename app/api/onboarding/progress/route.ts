import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { OnboardingService } from '@/lib/services/onboarding-service';
import { WorkspaceService } from '@/lib/services/workspace-service';
import { progressSchema } from '@/lib/validations/onboarding';

// GET endpoint to fetch user's onboarding progress
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch both in parallel for better performance
    const [progress, workspace] = await Promise.all([
      OnboardingService.getProgress(userId),
      WorkspaceService.getPrimaryWorkspace(userId),
    ]);

    if (!progress) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If onboarding is already completed, return that status
    if (progress.onboardingCompleted) {
      return NextResponse.json({
        completed: true,
        onboardingCompleted: true,
        redirectTo: '/dashboard',
      });
    }

    // Return unified response format that works for both old and new endpoints
    return NextResponse.json({
      completed: false,
      onboardingCompleted: false,
      data: {
        ...progress.onboardingData,
        workspaceId: workspace?.id || null,
        workspaceName: workspace?.name || '',
      },
      // Also include these at root level for backward compatibility
      onboardingData: progress.onboardingData,
      workspaceId: workspace?.id || null,
      workspaceName: workspace?.name || '',
    });
  } catch (error) {
    console.error('Error fetching onboarding progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch progress' },
      { status: 500 }
    );
  }
}

// POST endpoint to save user's onboarding progress
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const userId = session.user.id;

    // Validate the progress update
    const validationResult = progressSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid data',
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { step, data } = validationResult.data;

    // Save progress using the service
    const result = await OnboardingService.saveProgress({
      userId,
      step,
      data,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error saving onboarding progress:', error);

    // Handle service-level errors
    if (error instanceof Error) {
      if (error.message === 'User not found') {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message === 'Onboarding already completed') {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      if (error.message.includes('workspace')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json(
      { error: 'Failed to save progress' },
      { status: 500 }
    );
  }
}
