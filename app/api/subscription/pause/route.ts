import { NextRequest, NextResponse } from 'next/server';
import { SubscriptionService } from '@/lib/services/subscription-service';
import { StripeService } from '@/lib/services/stripe-service';
import { requireRole, getUserFromRequest } from '@/lib/middleware/require-role';
import { z } from 'zod';

const pauseSchema = z.object({
  duration: z.number().min(1).max(3), // 1-3 months
});

export async function POST(request: NextRequest) {
  try {
    // Require owner role to pause subscription
    const roleCheck = await requireRole(request, { requiredRole: 'owner' });
    if (roleCheck) return roleCheck;

    const { user } = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const { duration } = pauseSchema.parse(body);

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

    // Check if already paused
    const isPaused = await SubscriptionService.isPaused(user.id);
    if (isPaused) {
      return NextResponse.json(
        { error: 'Subscription is already paused' },
        { status: 400 }
      );
    }

    // Check if subscription has Stripe subscription ID (not trial)
    if (
      !subscription.stripeSubscriptionId ||
      subscription.status === 'trialing'
    ) {
      return NextResponse.json(
        { error: 'Cannot pause trial subscriptions' },
        { status: 400 }
      );
    }

    // Check if subscription is scheduled to cancel
    if (subscription.cancelAtPeriodEnd) {
      return NextResponse.json(
        { error: 'Cannot pause subscription scheduled to cancel' },
        { status: 400 }
      );
    }

    // Pause in Stripe
    if (subscription.stripeSubscriptionId) {
      const stripePaused = await StripeService.pausePaymentCollection(
        subscription.stripeSubscriptionId
      );

      if (!stripePaused) {
        return NextResponse.json(
          { error: 'Failed to pause subscription in Stripe' },
          { status: 500 }
        );
      }
    }

    // Update database
    const pausedSubscription = await SubscriptionService.pauseSubscription(
      user.id,
      duration
    );

    // Get pause details
    const pauseDetails = await SubscriptionService.getPauseDetails(user.id);

    return NextResponse.json({
      success: true,
      message: `Subscription paused for ${duration} month${duration > 1 ? 's' : ''}`,
      pauseDetails,
      subscription: {
        id: pausedSubscription.id,
        pausedAt: pausedSubscription.pausedAt,
        pauseEndsAt: pausedSubscription.pauseEndsAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to pause subscription' },
      { status: 500 }
    );
  }
}
