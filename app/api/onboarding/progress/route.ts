import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { OnboardingService } from '@/lib/services/onboarding-service';
import { WorkspaceService } from '@/lib/services/workspace-service';

// GET endpoint to fetch user's onboarding progress
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get onboarding progress from service
    const progress = await OnboardingService.getProgress(userId);

    if (!progress) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If onboarding is already completed, return that status
    if (progress.onboardingCompleted) {
      return NextResponse.json({
        onboardingCompleted: true,
        redirectTo: '/dashboard',
      });
    }

    // Get user's workspace if it exists
    const workspace = await WorkspaceService.getPrimaryWorkspace(userId);

    return NextResponse.json({
      onboardingCompleted: false,
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
