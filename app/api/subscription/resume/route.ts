import { NextRequest, NextResponse } from 'next/server';
import { SubscriptionService } from '@/lib/services/subscription-service';
import { StripeService } from '@/lib/services/stripe-service';
import { requireRole, getUserFromRequest } from '@/lib/middleware/require-role';

export async function POST(request: NextRequest) {
  try {
    // Require owner role to resume subscription
    const roleCheck = await requireRole(request, { requiredRole: 'owner' });
    if (roleCheck) return roleCheck;

    const { user } = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get current subscription
    const subscription = await SubscriptionService.getSubscriptionWithPlan(
      user.id
    );
    if (!subscription) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 404 }
      );
    }

    // Check if paused
    const isPaused = await SubscriptionService.isPaused(user.id);
    if (!isPaused) {
      return NextResponse.json(
        { error: 'Subscription is not paused' },
        { status: 400 }
      );
    }

    // Resume in Stripe
    if (subscription.stripeSubscriptionId) {
      const stripeResumed = await StripeService.resumePaymentCollection(
        subscription.stripeSubscriptionId
      );

      if (!stripeResumed) {
        return NextResponse.json(
          { error: 'Failed to resume subscription in Stripe' },
          { status: 500 }
        );
      }
    }

    // Update database
    const resumedSubscription = await SubscriptionService.resumeSubscription(
      user.id
    );

    return NextResponse.json({
      success: true,
      message: 'Subscription resumed successfully',
      subscription: {
        id: resumedSubscription.id,
        status: resumedSubscription.status,
        pausedAt: null,
        pauseEndsAt: null,
      },
    });
  } catch (error) {
    console.error('Error resuming subscription:', error);

    return NextResponse.json(
      { error: 'Failed to resume subscription' },
      { status: 500 }
    );
  }
}
