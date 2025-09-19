import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { SubscriptionService } from '@/lib/services/subscription-service';
import { OrganizationService } from '@/lib/services/organization-service';
import { UserService } from '@/lib/services/user-service';

/**
 * GET /api/subscription/usage
 * Get the organization's subscription usage metrics
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await UserService.findByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get user's organization from query params if provided
    const url = new URL(request.url);
    const organizationId = url.searchParams.get('organizationId');

    let organization;
    if (organizationId) {
      // Verify user has access to this organization
      const userOrgs = await OrganizationService.getAllUserOrganizations(
        user.id
      );
      organization = userOrgs.find(org => org.id === organizationId);

      if (!organization) {
        return NextResponse.json(
          { error: 'You do not have access to this organization' },
          { status: 403 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    // Get the organization details to find the owner
    const fullOrg = await OrganizationService.getById(organization.id);
    if (!fullOrg) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Get subscription with plan details using the organization owner's ID
    const subscription = await SubscriptionService.getSubscriptionWithPlan(
      fullOrg.ownerId
    );

    if (!subscription) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    // Get real data we can count
    const [workspaces, teamMembers] = await Promise.all([
      OrganizationService.getOrganizationWorkspaces(fullOrg.id),
      OrganizationService.getOrganizationMembers(fullOrg.id),
    ]);

    // TODO: Replace with real data when tables exist
    // For now, using fake data for demonstration
    const FAKE_PAGES_PUBLISHED = 5;
    const FAKE_AI_CREDITS_USED = 2500;

    // Calculate trial days left if in trial
    let trialDaysLeft = null;
    if (subscription.status === 'trialing' && subscription.trialEndsAt) {
      const daysRemaining = Math.ceil(
        (new Date(subscription.trialEndsAt).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24)
      );
      trialDaysLeft = Math.max(0, daysRemaining);
    }

    // Determine if user can upgrade (not on highest plan)
    const canUpgrade = subscription.plan.level < 3; // Assuming level 3 is highest

    // Format response
    const response = {
      subscription: {
        id: subscription.id,
        status: subscription.status,
        planName: subscription.plan.name,
        planLevel: subscription.plan.level,
        trialDaysLeft,
        canUpgrade,
        limits: {
          maxPages:
            subscription.plan.maxNbOfPages === -1
              ? 'unlimited'
              : subscription.plan.maxNbOfPages,
          maxCredits:
            subscription.plan.maxNbOfCredits === -1
              ? 'unlimited'
              : subscription.plan.maxNbOfCredits,
          maxSeats:
            subscription.plan.maxNbOfSeats === -1
              ? 'unlimited'
              : subscription.plan.maxNbOfSeats,
          maxSites:
            subscription.plan.maxNbOfSites === -1
              ? 'unlimited'
              : subscription.plan.maxNbOfSites,
        },
      },
      usage: {
        // TODO: Replace with real counts from published_pages table
        pagesPublished: FAKE_PAGES_PUBLISHED,

        // TODO: Replace with real sum from ai_usage_logs table
        aiCreditsUsed: FAKE_AI_CREDITS_USED,

        // Real data
        workspaces: workspaces.length,
        teamMembers: teamMembers.length,

        // Calculate percentages for UI
        percentages: {
          pages:
            subscription.plan.maxNbOfPages === -1
              ? 0
              : Math.round(
                  (FAKE_PAGES_PUBLISHED / subscription.plan.maxNbOfPages) * 100
                ),
          credits:
            subscription.plan.maxNbOfCredits === -1
              ? 0
              : Math.round(
                  (FAKE_AI_CREDITS_USED / subscription.plan.maxNbOfCredits) *
                    100
                ),
          sites:
            subscription.plan.maxNbOfSites === -1
              ? 0
              : Math.round(
                  (workspaces.length / subscription.plan.maxNbOfSites) * 100
                ),
          seats:
            subscription.plan.maxNbOfSeats === -1
              ? 0
              : Math.round(
                  (teamMembers.length / subscription.plan.maxNbOfSeats) * 100
                ),
        },
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching subscription usage:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription usage' },
      { status: 500 }
    );
  }
}
