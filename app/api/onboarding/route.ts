import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import {
  users,
  workspaces,
  teamMembers,
  teamInvitations,
  subscriptions,
} from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import {
  onboardingSchema,
  type UserOnboardingData,
} from '@/lib/validations/onboarding';
import { randomBytes } from 'crypto';

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
    const validationResult = onboardingSchema.safeParse(body);

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

    // Start a transaction to ensure data consistency
    const result = await db.transaction(async tx => {
      // 1. Check if user already completed onboarding
      const existingUser = await tx
        .select({ onboardingCompleted: users.onboardingCompleted })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (existingUser[0]?.onboardingCompleted) {
        throw new Error('Onboarding already completed');
      }

      // 2. Create or get user's default workspace
      let workspace = await tx
        .select()
        .from(workspaces)
        .where(eq(workspaces.ownerId, userId))
        .limit(1);

      if (workspace.length === 0) {
        // Create a new workspace
        const newWorkspace = await tx
          .insert(workspaces)
          .values({
            name: data.workspaceName,
            ownerId: userId,
            whiteLabelEnabled: false,
          })
          .returning();

        workspace = newWorkspace;
      } else {
        // Update existing workspace name if different
        if (workspace[0].name !== data.workspaceName) {
          await tx
            .update(workspaces)
            .set({
              name: data.workspaceName,
              updatedAt: new Date(),
            })
            .where(eq(workspaces.id, workspace[0].id));
        }
      }

      const workspaceId = workspace[0].id;

      // 3. Prepare onboarding data for storage (exclude workspaceName and teamMembers)
      const userOnboardingData: UserOnboardingData = {
        useCases: data.useCases,
        otherUseCase: data.otherUseCase,
        professionalRole: data.professionalRole,
        otherProfessionalRole: data.otherProfessionalRole,
        companySize: data.companySize,
        industry: data.industry,
        otherIndustry: data.otherIndustry,
        discoverySource: data.discoverySource,
        otherDiscoverySource: data.otherDiscoverySource,
        previousAttempts: data.previousAttempts,
      };

      // 4. Process team member invitations (if any)
      if (data.teamMembers && data.teamMembers.length > 0) {
        for (const member of data.teamMembers) {
          // Generate a unique invitation token
          const token = randomBytes(32).toString('hex');
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

          // Roles already match database schema: 'viewer', 'member', 'admin'
          const role = member.role;

          // Create team member record (pending)
          const teamMemberResult = await tx
            .insert(teamMembers)
            .values({
              userId, // plan owner
              memberUserId: userId, // placeholder, will be updated when invitation is accepted
              invitedBy: userId,
              role,
              status: 'pending',
            })
            .returning({ id: teamMembers.id });

          // Create invitation
          await tx.insert(teamInvitations).values({
            token,
            email: member.email.toLowerCase(),
            teamMemberId: teamMemberResult[0].id,
            expiresAt,
          });

          // TODO: Send invitation emails to team members
          // This would typically be handled by an email service
          console.log(
            'Team invitation created for:',
            member.email,
            'with role:',
            role
          );
        }
      }

      // 5. Update user with onboarding data and completion status
      await tx
        .update(users)
        .set({
          onboardingData: userOnboardingData,
          onboardingCompleted: true,
          onboardingCompletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      // 6. Check if user has a subscription, if not create a trial
      const userSubscription = await tx
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.ownerId, userId))
        .limit(1);

      if (userSubscription.length === 0) {
        // Create a trial subscription (14 days)
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 14);

        await tx.insert(subscriptions).values({
          ownerId: userId,
          planType: 'starter',
          status: 'trialing',
          maxDomains: 1,
          maxTeamMembers: 2,
          maxPages: 10,
          maxWords: 50000,
          overageRatePerPage: '0.00',
          whiteLabelEnabled: false,
          currentPeriodStart: new Date(),
          currentPeriodEnd: trialEndDate,
        });
      }

      return {
        success: true,
        workspaceId,
        message: 'Onboarding completed successfully',
      };
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Onboarding error:', error);

    // Check for specific errors
    if (error instanceof Error) {
      if (error.message === 'Onboarding already completed') {
        return NextResponse.json(
          { error: 'Onboarding has already been completed' },
          { status: 400 }
        );
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
    const user = await db
      .select({
        onboardingCompleted: users.onboardingCompleted,
        onboardingCompletedAt: users.onboardingCompletedAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If onboarding is completed, also fetch the workspace
    let workspaceData = null;
    if (user[0].onboardingCompleted) {
      const workspace = await db
        .select({
          id: workspaces.id,
          name: workspaces.name,
        })
        .from(workspaces)
        .where(eq(workspaces.ownerId, userId))
        .limit(1);

      if (workspace.length > 0) {
        workspaceData = workspace[0];
      }
    }

    return NextResponse.json({
      onboardingCompleted: user[0].onboardingCompleted || false,
      onboardingCompletedAt: user[0].onboardingCompletedAt,
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
