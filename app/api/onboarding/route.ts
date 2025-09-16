import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { OnboardingService } from '@/lib/services/onboarding-service';
import { WorkspaceService } from '@/lib/services/workspace-service';
import { OrganizationService } from '@/lib/services/organization-service';
import { EmailService } from '@/lib/services/email-service';
import { AnalyticsService } from '@/lib/services/analytics-service';
import { onboardingSubmissionSchema } from '@/lib/validations/onboarding';

// GET /api/onboarding - Check onboarding status
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Check if onboarding is completed
    const isCompleted = await OnboardingService.isCompleted(userId);

    if (isCompleted) {
      return NextResponse.json({
        completed: true,
        redirectTo: '/dashboard',
      });
    }

    // Get current progress for incomplete onboarding
    const [progress, organization] = await Promise.all([
      OnboardingService.getProgress(userId),
      OrganizationService.getUserOrganization(userId),
    ]);

    return NextResponse.json({
      completed: false,
      currentStep: progress?.onboardingData?.currentStep || 1,
      hasOrganization: !!organization,
      organizationId: organization?.id || null,
      organizationName: organization?.name || '',
    });
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return NextResponse.json(
      { error: 'Failed to check onboarding status' },
      { status: 500 }
    );
  }
}

// POST /api/onboarding - Complete onboarding
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

    // Validate the submission data
    const validationResult = onboardingSubmissionSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid data',
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Check if user already completed onboarding
    const isCompleted = await OnboardingService.isCompleted(userId);
    if (isCompleted) {
      return NextResponse.json(
        { error: 'Onboarding has already been completed' },
        { status: 400 }
      );
    }

    // Verify user has an organization and workspace (should have been created in Step 2)
    const organization = await OrganizationService.getUserOrganization(userId);

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found. Please complete Step 2 first.' },
        { status: 400 }
      );
    }

    // Get the primary workspace
    const workspace = await WorkspaceService.getPrimaryWorkspace(userId);

    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found. Please complete Step 2 first.' },
        { status: 400 }
      );
    }

    const workspaceId = workspace.id;

    // Team invitations are now sent in Step 3, not during final completion

    // Complete onboarding
    await OnboardingService.completeOnboarding({
      userId,
      workspaceId,
      ...data,
    });

    // Track onboarding completion in PostHog with all properties for pie charts
    await AnalyticsService.trackOnboardingCompleted(userId, data);

    // Track onboarding completion in email service
    await EmailService.trackOnboardingComplete({
      email: session.user.email || '',
      userId,
      workspaceId,
      completedAt: new Date(),
    });

    return NextResponse.json(
      {
        success: true,
        workspaceId,
        message: 'Onboarding completed successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error completing onboarding:', error);

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
      { error: 'Failed to complete onboarding' },
      { status: 500 }
    );
  }
}
