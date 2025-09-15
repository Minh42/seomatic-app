import { NextRequest, NextResponse } from 'next/server';
import { SubscriptionService } from '@/lib/services/subscription-service';
import { StripeService } from '@/lib/services/stripe-service';
import { requireRole, getUserFromRequest } from '@/lib/middleware/require-role';
import { StripeErrorHandler } from '@/lib/errors/stripe-errors';

/**
 * GET /api/subscription
 * Get the current user's subscription details (owner only)
 */
export async function GET(request: NextRequest) {
  try {
    // Require owner role to access billing details
    const roleCheck = await requireRole(request, { requiredRole: 'owner' });
    if (roleCheck) return roleCheck;

    const { user } = getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get subscription with plan details
    const subscription = await SubscriptionService.getSubscriptionWithPlan(
      user.id
    );

    if (!subscription) {
      return NextResponse.json({
        subscription: null,
        message: 'No active subscription',
      });
    }

    // If there's a Stripe subscription, get the latest details from Stripe
    let stripeDetails = null;
    let upcomingInvoice = null;

    if (subscription.stripeSubscriptionId && subscription.stripeCustomerId) {
      const stripeSubscription = await StripeService.getSubscription(
        subscription.stripeSubscriptionId
      );

      if (stripeSubscription) {
        // Get upcoming invoice for accurate next payment info
        upcomingInvoice = await StripeService.getUpcomingInvoice(
          subscription.stripeCustomerId
        );

        // Stripe subscription period dates (cast to any to handle type mismatch)
        const periodEnd = (stripeSubscription as any).current_period_end;

        stripeDetails = {
          status: stripeSubscription.status,
          currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
          cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
          cancelledAt: stripeSubscription.canceled_at
            ? new Date(stripeSubscription.canceled_at * 1000)
            : null,
          // Use upcoming invoice for next payment info if available
          nextPaymentAmount: upcomingInvoice
            ? upcomingInvoice.amount_due / 100
            : null,
          nextPaymentDate:
            upcomingInvoice && upcomingInvoice.period_end
              ? new Date(upcomingInvoice.period_end * 1000)
              : periodEnd
                ? new Date(periodEnd * 1000)
                : null,
        };
      }
    }

    // Format the response - prefer Stripe data when available
    const response = {
      subscription: {
        id: subscription.id,
        status: stripeDetails?.status || subscription.status,
        planName: subscription.plan.name,
        // Use upcoming invoice amount if available, otherwise fall back to plan price
        planPrice:
          stripeDetails?.nextPaymentAmount ?? subscription.plan.price / 100,
        planFrequency: subscription.plan.frequency,
        // Use Stripe's next payment date if available
        currentPeriodEnd:
          stripeDetails?.nextPaymentDate ||
          stripeDetails?.currentPeriodEnd ||
          subscription.currentPeriodEnd,
        cancelAtPeriodEnd:
          stripeDetails?.cancelAtPeriodEnd ?? subscription.cancelAtPeriodEnd,
        cancelledAt: stripeDetails?.cancelledAt || null,
        trialEndsAt: subscription.trialEndsAt,
        limits: {
          maxPages:
            subscription.plan.maxNbOfPages === -1
              ? 'Unlimited'
              : subscription.plan.maxNbOfPages,
          maxCredits:
            subscription.plan.maxNbOfCredits === -1
              ? 'Unlimited'
              : subscription.plan.maxNbOfCredits,
          maxSeats:
            subscription.plan.maxNbOfSeats === -1
              ? 'Unlimited'
              : subscription.plan.maxNbOfSeats,
          maxSites:
            subscription.plan.maxNbOfSites === -1
              ? 'Unlimited'
              : subscription.plan.maxNbOfSites,
        },
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    const stripeError = StripeErrorHandler.handleSubscriptionError(
      error,
      'fetch'
    );
    StripeErrorHandler.logError('GET /api/subscription', stripeError);
    return NextResponse.json(
      StripeErrorHandler.formatApiResponse(stripeError),
      { status: StripeErrorHandler.getStatusCode(stripeError) }
    );
  }
}
