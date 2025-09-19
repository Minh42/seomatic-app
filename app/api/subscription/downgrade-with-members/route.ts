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
const downgradeSchema = z.object({
  planId: z.string().uuid('Invalid plan ID'),
  keepMemberIds: z.array(z.string().uuid('Invalid member ID')),
});

/**
 * POST /api/subscription/downgrade-with-members
 * Process downgrade with selected members to keep
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
    const validation = downgradeSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { planId, keepMemberIds } = validation.data;

    // Get current subscription
    const currentSubscription =
      await SubscriptionService.getSubscriptionWithPlan(user.id);
    if (!currentSubscription) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 400 }
      );
    }

    // Get the new plan details
    const newPlan = await PlanService.getPlanById(planId);
    if (!newPlan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    // Validate that keepMemberIds count matches new plan limit (minus 1 for owner)
    const maxMembers = newPlan.maxNbOfSeats - 1; // Subtract 1 for owner
    if (keepMemberIds.length !== maxMembers) {
      return NextResponse.json(
        {
          error: 'Invalid member selection',
          details: `You must select exactly ${maxMembers} members to keep (you selected ${keepMemberIds.length})`,
        },
        { status: 400 }
      );
    }

    // Get organization and all members
    const organization = await OrganizationService.getUserOrganization(user.id);
    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Get all active team members
    const allMembers = await OrganizationService.getOrganizationMembers(
      organization.id
    );
    const selectableMembers = allMembers.filter(m => m.id !== user.id);

    // Validate all keepMemberIds exist in organization
    const memberIds = selectableMembers.map(m => m.id);
    for (const id of keepMemberIds) {
      if (!memberIds.includes(id)) {
        return NextResponse.json(
          {
            error: 'Invalid member selection',
            details: `Member ${id} not found in organization`,
          },
          { status: 400 }
        );
      }
    }

    // Determine which members to suspend
    const membersToSuspend = selectableMembers
      .filter(m => !keepMemberIds.includes(m.id))
      .map(m => m.id);

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
      // Try to revert Stripe change
      await StripeService.updateSubscriptionPlan(
        currentSubscription.stripeSubscriptionId,
        currentSubscription.plan.stripePriceId
      );

      return NextResponse.json(
        { error: 'Failed to update subscription in database' },
        { status: 500 }
      );
    }

    // Suspend the members that weren't selected to keep
    let suspendedCount = 0;
    if (membersToSuspend.length > 0) {
      // Get the actual team member IDs (not user IDs)
      const teamMembers = await TeamService.getTeamMembers(user.id);
      const teamMemberIdsToSuspend = teamMembers
        .filter(tm => membersToSuspend.includes(tm.member.id))
        .map(tm => tm.id);

      if (teamMemberIdsToSuspend.length > 0) {
        const suspended = await TeamService.suspendMembers(
          teamMemberIdsToSuspend
        );
        suspendedCount = suspended.length;
      }
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: `Successfully downgraded to ${newPlan.name}`,
      suspendedMembers: suspendedCount,
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
      'POST /api/subscription/downgrade-with-members',
      stripeError
    );
    return NextResponse.json(
      StripeErrorHandler.formatApiResponse(stripeError),
      { status: StripeErrorHandler.getStatusCode(stripeError) }
    );
  }
}
