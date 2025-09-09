import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { OnboardingService } from '@/lib/services/onboarding-service';
import { WorkspaceService } from '@/lib/services/workspace-service';
import { SubscriptionService } from '@/lib/services/subscription-service';
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
    const [progress, workspace] = await Promise.all([
      OnboardingService.getProgress(userId),
      WorkspaceService.getPrimaryWorkspace(userId),
    ]);

    return NextResponse.json({
      completed: false,
      currentStep: progress?.onboardingData?.currentStep || 1,
      hasWorkspace: !!workspace,
      workspaceId: workspace?.id || null,
      workspaceName: workspace?.name || '',
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

    // Use the provided workspaceId or get user's workspace
    let workspaceId: string;

    if (data.workspaceId) {
      // Verify the workspace belongs to the user
      const isOwner = await WorkspaceService.verifyOwnership(
        data.workspaceId,
        userId
      );
      if (!isOwner) {
        return NextResponse.json(
          { error: 'Invalid workspace' },
          { status: 400 }
        );
      }
      workspaceId = data.workspaceId;
    } else {
      // Get or create user's workspace with proper error handling
      let workspace = await WorkspaceService.getPrimaryWorkspace(userId);

      if (!workspace) {
        try {
          workspace = await WorkspaceService.create({
            name: data.workspaceName || 'My Workspace',
            ownerId: userId,
          });
        } catch (error) {
          console.error('Failed to create workspace during onboarding:', error);

          // Provide helpful error message based on the error type
          if (error instanceof Error) {
            if (
              error.message.includes('duplicate') ||
              error.message.includes('already exists')
            ) {
              return NextResponse.json(
                {
                  error:
                    'A workspace with this name already exists. Please choose a different name.',
                  code: 'DUPLICATE_WORKSPACE',
                  field: 'workspaceName',
                },
                { status: 409 }
              );
            }
          }

          return NextResponse.json(
            {
              error: 'Failed to create workspace. Please try again.',
              code: 'WORKSPACE_ERROR',
              field: 'workspaceName',
            },
            { status: 500 }
          );
        }
      }

      workspaceId = workspace.id;
    }

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

    // Check if user has a subscription, if not create a trial
    const subscription = await SubscriptionService.getByOwnerId(userId);

    if (!subscription) {
      await SubscriptionService.createTrial({
        ownerId: userId,
        trialDays: 14,
      });
    }

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
