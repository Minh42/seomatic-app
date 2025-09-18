import { NextRequest, NextResponse } from 'next/server';
import { SubscriptionService } from '@/lib/services/subscription-service';
import { PlanService } from '@/lib/services/plan-service';
import { StripeService } from '@/lib/services/stripe-service';
import { TeamService } from '@/lib/services/team-service';
import { OrganizationService } from '@/lib/services/organization-service';
import { requireRole, getUserFromRequest } from '@/lib/middleware/require-role';
import { StripeErrorHandler } from '@/lib/errors/stripe-errors';
import { z } from 'zod';

// Validation schema
const changePlanSchema = z.object({
  planId: z.string().uuid('Invalid plan ID'),
});

/**
 * POST /api/subscription/change-plan
 * Change the current subscription to a different plan
 */
export async function POST(request: NextRequest) {
  try {
    // Require owner role to change plans
    const roleCheck = await requireRole(request, { requiredRole: 'owner' });
    if (roleCheck) return roleCheck;

    const { user } = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Validate request body
    const body = await request.json();
    const validation = changePlanSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { planId } = validation.data;

    // Get current subscription
    const currentSubscription =
      await SubscriptionService.getSubscriptionWithPlan(user.id);
    if (!currentSubscription) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 400 }
      );
    }

    // Can't change to the same plan
    if (currentSubscription.planId === planId) {
      return NextResponse.json(
        { error: 'You are already on this plan' },
        { status: 400 }
      );
    }

    // Get the new plan details
    const newPlan = await PlanService.getPlanById(planId);
    if (!newPlan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    // Check if new plan has a Stripe price ID
    if (!newPlan.stripePriceId) {
      return NextResponse.json(
        { error: 'This plan is not available for subscription' },
        { status: 400 }
      );
    }

    // Check if downgrading and has too many members
    if (
      newPlan.level < currentSubscription.plan.level &&
      newPlan.maxNbOfSeats !== -1
    ) {
      const organization = await OrganizationService.getUserOrganization(
        user.id
      );
      if (organization) {
        const activeMemberCount = await TeamService.getActiveMemberCount(
          organization.id
        );

        // If member count exceeds new plan limit, return special response
        if (activeMemberCount > newPlan.maxNbOfSeats) {
          // Get all active team members for selection
          const allMembers = await OrganizationService.getOrganizationMembers(
            organization.id
          );

          // Filter out the owner and only include active members
          const selectableMembers = allMembers
            .filter(m => m.id !== user.id)
            .map(m => ({
              id: m.id,
              email: m.email,
              name: m.name,
              role: m.role,
            }));

          return NextResponse.json({
            requiresMemberSelection: true,
            currentMembers: activeMemberCount,
            newLimit: newPlan.maxNbOfSeats,
            membersToRemove: activeMemberCount - newPlan.maxNbOfSeats,
            members: selectableMembers,
            newPlanId: planId,
            newPlanName: newPlan.name,
            message: `Your new plan allows ${newPlan.maxNbOfSeats} team members, but you currently have ${activeMemberCount}. Please select which members should keep access.`,
          });
        }
      }
    }

    // If user is on trial or doesn't have Stripe subscription, create checkout session
    if (
      !currentSubscription.stripeSubscriptionId ||
      currentSubscription.status === 'trialing'
    ) {
      // Create a checkout session with user's email
      const baseUrl =
        request.headers.get('origin') ||
        process.env.NEXTAUTH_URL ||
        'http://localhost:3000';
      const successUrl = `${baseUrl}/dashboard/settings?tab=billing&success=true`;
      const cancelUrl = `${baseUrl}/dashboard/settings?tab=plans`;

      const checkoutUrl = await StripeService.createCheckoutSession(
        newPlan.stripePriceId,
        user.email!,
        user.id,
        successUrl,
        cancelUrl
      );

      if (!checkoutUrl) {
        return NextResponse.json(
          { error: 'Failed to create checkout session' },
          { status: 500 }
        );
      }

      // Return a special response indicating redirect is needed
      return NextResponse.json(
        {
          requiresCheckout: true,
          checkoutUrl: checkoutUrl,
          message: 'Please complete checkout to upgrade your plan',
        },
        { status: 200 }
      );
    }

    // If subscription is paused, we need to resume it first
    if (currentSubscription.pausedAt) {
      const resumed = await StripeService.resumePaymentCollection(
        currentSubscription.stripeSubscriptionId
      );

      if (!resumed) {
        return NextResponse.json(
          {
            error:
              'Failed to resume subscription before changing plan. Please resume your subscription first.',
          },
          { status: 400 }
        );
      }

      // Clear pause state in database
      await SubscriptionService.updateSubscription({
        ownerId: user.id,
        pausedAt: null,
        pauseEndsAt: null,
      });
    }

    // Update subscription in Stripe
    const updatedStripeSubscription =
      await StripeService.updateSubscriptionPlan(
        currentSubscription.stripeSubscriptionId,
        newPlan.stripePriceId
      );

    if (!updatedStripeSubscription) {
      return NextResponse.json(
        { error: 'Failed to update subscription in Stripe' },
        { status: 500 }
      );
    }

    // Update subscription in database
    const updatedSubscription = await SubscriptionService.changePlan(
      user.id,
      planId
    );

    if (!updatedSubscription) {
      return NextResponse.json(
        { error: 'Failed to update subscription in database' },
        { status: 500 }
      );
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: `Successfully ${newPlan.level > currentSubscription.plan.level ? 'upgraded' : 'downgraded'} to ${newPlan.name}`,
      subscription: {
        id: updatedSubscription.id,
        planId: updatedSubscription.planId,
        planName: newPlan.name,
        status: updatedStripeSubscription.status,
      },
    });
  } catch (error) {
    const stripeError = StripeErrorHandler.handleSubscriptionError(
      error,
      'update'
    );
    StripeErrorHandler.logError(
      'POST /api/subscription/change-plan',
      stripeError
    );
    return NextResponse.json(
      StripeErrorHandler.formatApiResponse(stripeError),
      { status: StripeErrorHandler.getStatusCode(stripeError) }
    );
  }
}
