import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { WorkspaceService } from '@/lib/services/workspace-service';
import { OnboardingService } from '@/lib/services/onboarding-service';
import { TeamService } from '@/lib/services/team-service';
import { SubscriptionService } from '@/lib/services/subscription-service';
import { onboardingSchema } from '@/lib/validations/onboarding';
import { z } from 'zod';
import { EmailService } from '@/lib/services/email-service';

// Extended schema to include workspaceId
const onboardingSubmissionSchema = onboardingSchema.extend({
  workspaceId: z.string().optional(),
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

    // Validate the data with Zod
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
    const userId = session.user.id;

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
      // Get or create user's workspace
      let workspace = await WorkspaceService.getPrimaryWorkspace(userId);

      if (!workspace) {
        workspace = await WorkspaceService.create({
          name: data.workspaceName || 'My Workspace',
          ownerId: userId,
        });
      }

      workspaceId = workspace.id;
    }

    // Process team member invitations (if any)
    if (data.teamMembers && data.teamMembers.length > 0) {
      for (const member of data.teamMembers) {
        try {
          await TeamService.inviteMember({
            email: member.email,
            role: member.role,
            invitedBy: userId,
          });
        } catch (error) {
          console.error('Failed to invite team member:', error);
          // Continue even if invitation fails - don't block onboarding
        }
      }
    }

    // Complete onboarding
    await OnboardingService.completeOnboarding({
      userId,
      workspaceId,
      ...data,
    });

    // Track onboarding completion
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
    console.error('Onboarding error:', error);

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

// GET endpoint to check onboarding status
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Check if user has completed onboarding
    const progress = await OnboardingService.getProgress(userId);

    if (!progress) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If onboarding is completed, also fetch the workspace
    let workspaceData = null;
    if (progress.onboardingCompleted) {
      const workspace = await WorkspaceService.getPrimaryWorkspace(userId);
      if (workspace) {
        workspaceData = {
          id: workspace.id,
          name: workspace.name,
        };
      }
    }

    return NextResponse.json({
      onboardingCompleted: progress.onboardingCompleted,
      onboardingCompletedAt: progress.onboardingCompletedAt,
      workspace: workspaceData,
    });
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return NextResponse.json(
      { error: 'Failed to check onboarding status' },
      { status: 500 }
    );
  }
}
