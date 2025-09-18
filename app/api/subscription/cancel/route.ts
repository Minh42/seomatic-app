import { NextRequest, NextResponse } from 'next/server';
import { SubscriptionService } from '@/lib/services/subscription-service';
import { StripeService } from '@/lib/services/stripe-service';
import { db } from '@/lib/db';
import { subscriptions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireRole, getUserFromRequest } from '@/lib/middleware/require-role';
import { StripeErrorHandler } from '@/lib/errors/stripe-errors';

/**
 * POST /api/subscription/cancel
 * Cancel the current user's subscription at period end (owner only)
 */
export async function POST(request: NextRequest) {
  try {
    // Require owner role to cancel subscription
    const roleCheck = await requireRole(request, { requiredRole: 'owner' });
    if (roleCheck) return roleCheck;

    const { user } = getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get subscription
    const subscription = await SubscriptionService.getByOwnerId(user.id);

    if (!subscription) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    // If there's a Stripe subscription, handle it properly
    if (subscription.stripeSubscriptionId) {
      // If subscription is paused, we need to resume it first before cancelling
      // Otherwise Stripe keeps the pause_collection state even after cancel_at_period_end
      if (subscription.pausedAt) {
        await StripeService.resumePaymentCollection(
          subscription.stripeSubscriptionId
        );
      }

      // Now cancel the subscription at period end
      const canceled = await StripeService.cancelSubscription(
        subscription.stripeSubscriptionId
      );

      if (!canceled) {
        const stripeError = StripeErrorHandler.handleSubscriptionError(
          new Error('Failed to cancel subscription in Stripe'),
          'cancel'
        );
        return NextResponse.json(
          StripeErrorHandler.formatApiResponse(stripeError),
          { status: StripeErrorHandler.getStatusCode(stripeError) }
        );
      }
    }

    // Update local database
    // When cancelling, clear any pause state to avoid confusion
    const [updated] = await db
      .update(subscriptions)
      .set({
        cancelAtPeriodEnd: true,
        pausedAt: null, // Clear pause state when cancelling
        pauseEndsAt: null, // Clear pause end date
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.ownerId, user.id))
      .returning();

    return NextResponse.json({
      success: true,
      message: 'Subscription will be canceled at the end of the billing period',
      subscription: {
        cancelAtPeriodEnd: updated.cancelAtPeriodEnd,
        currentPeriodEnd: updated.currentPeriodEnd,
      },
    });
  } catch (error) {
    const stripeError = StripeErrorHandler.handleSubscriptionError(
      error,
      'cancel'
    );
    StripeErrorHandler.logError('POST /api/subscription/cancel', stripeError);
    return NextResponse.json(
      StripeErrorHandler.formatApiResponse(stripeError),
      { status: StripeErrorHandler.getStatusCode(stripeError) }
    );
  }
}

/**
 * DELETE /api/subscription/cancel
 * Resume a canceled subscription (remove cancellation) (owner only)
 */
export async function DELETE(request: NextRequest) {
  try {
    // Require owner role to resume subscription
    const roleCheck = await requireRole(request, { requiredRole: 'owner' });
    if (roleCheck) return roleCheck;

    const { user } = getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get subscription
    const subscription = await SubscriptionService.getByOwnerId(user.id);

    if (!subscription) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    // If there's a Stripe subscription, resume it in Stripe
    if (subscription.stripeSubscriptionId) {
      const resumed = await StripeService.resumeSubscription(
        subscription.stripeSubscriptionId
      );

      if (!resumed) {
        const stripeError = StripeErrorHandler.handleSubscriptionError(
          new Error('Failed to resume subscription in Stripe'),
          'resume'
        );
        return NextResponse.json(
          StripeErrorHandler.formatApiResponse(stripeError),
          { status: StripeErrorHandler.getStatusCode(stripeError) }
        );
      }
    }

    // Update local database
    const [updated] = await db
      .update(subscriptions)
      .set({
        cancelAtPeriodEnd: false,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.ownerId, user.id))
      .returning();

    return NextResponse.json({
      success: true,
      message: 'Subscription has been resumed',
      subscription: {
        cancelAtPeriodEnd: updated.cancelAtPeriodEnd,
        currentPeriodEnd: updated.currentPeriodEnd,
      },
    });
  } catch (error) {
    const stripeError = StripeErrorHandler.handleSubscriptionError(
      error,
      'resume'
    );
    StripeErrorHandler.logError('DELETE /api/subscription/cancel', stripeError);
    return NextResponse.json(
      StripeErrorHandler.formatApiResponse(stripeError),
      { status: StripeErrorHandler.getStatusCode(stripeError) }
    );
  }
}
