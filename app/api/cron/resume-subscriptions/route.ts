import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { subscriptions } from '@/lib/db/schema';
import { and, lte, isNotNull, eq } from 'drizzle-orm';
import { StripeService } from '@/lib/services/stripe-service';

/**
 * GET /api/cron/resume-subscriptions
 * Cron job to automatically resume paused subscriptions when pause period expires
 *
 * This endpoint should be called daily by a cron job (Vercel cron, system cron, or external service)
 * Protected by CRON_SECRET environment variable
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('CRON_SECRET not configured');
      return NextResponse.json(
        { error: 'Cron endpoint not configured' },
        { status: 500 }
      );
    }

    // Check authorization - support both Bearer token and direct secret
    const providedSecret = authHeader?.replace('Bearer ', '');
    if (providedSecret !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find all subscriptions where pause has expired
    const now = new Date();
    const expiredPauses = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          isNotNull(subscriptions.pausedAt),
          isNotNull(subscriptions.pauseEndsAt),
          lte(subscriptions.pauseEndsAt, now)
        )
      );

    console.log(`Found ${expiredPauses.length} expired pauses to resume`);

    let resumedCount = 0;
    const errors: string[] = [];

    // Resume each expired pause
    for (const subscription of expiredPauses) {
      try {
        // Resume in Stripe if subscription exists
        if (subscription.stripeSubscriptionId) {
          const stripeResumed = await StripeService.resumePaymentCollection(
            subscription.stripeSubscriptionId
          );

          if (!stripeResumed) {
            errors.push(
              `Failed to resume Stripe subscription ${subscription.stripeSubscriptionId}`
            );
            continue;
          }
        }

        // Update database to clear pause state
        await db
          .update(subscriptions)
          .set({
            pausedAt: null,
            pauseEndsAt: null,
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.id, subscription.id));

        resumedCount++;

        console.log(
          `Successfully resumed subscription ${subscription.id} for owner ${subscription.ownerId}`
        );
      } catch (error) {
        console.error(`Error resuming subscription ${subscription.id}:`, error);
        errors.push(
          `Failed to resume subscription ${subscription.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    // Return summary
    return NextResponse.json({
      success: true,
      message: `Auto-resume cron completed`,
      summary: {
        checked: expiredPauses.length,
        resumed: resumedCount,
        failed: expiredPauses.length - resumedCount,
      },
      errors: errors.length > 0 ? errors : undefined,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      {
        error: 'Failed to run auto-resume cron',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cron/resume-subscriptions
 * Alternative method for cron triggers that prefer POST
 */
export async function POST(request: NextRequest) {
  return GET(request);
}
