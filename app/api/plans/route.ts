import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { SubscriptionService } from '@/lib/services/subscription-service';
import { UserService } from '@/lib/services/user-service';
import { db } from '@/lib/db';
import { plans } from '@/lib/db/schema';
import { asc, ne, eq, and } from 'drizzle-orm';

/**
 * GET /api/plans
 * Get all available plans and current subscription
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await UserService.findByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get all plans except Trial, ordered by level
    const allPlans = await db
      .select()
      .from(plans)
      .where(and(ne(plans.name, 'Trial'), eq(plans.isActive, true)))
      .orderBy(asc(plans.level));

    // Get current subscription
    const subscription = await SubscriptionService.getSubscriptionWithPlan(
      user.id
    );

    // Format plans for display
    const formattedPlans = allPlans.map(plan => ({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      price: plan.price / 100, // Convert cents to dollars
      frequency: plan.frequency,
      level: plan.level,
      isRecommended: plan.isRecommended,
      features: plan.features || [],
      limits: {
        credits:
          plan.maxNbOfCredits === -1
            ? 'Unlimited'
            : plan.maxNbOfCredits.toLocaleString(),
        pages:
          plan.maxNbOfPages === -1
            ? 'Unlimited'
            : plan.maxNbOfPages.toLocaleString(),
        seats: plan.maxNbOfSeats === -1 ? 'Unlimited' : plan.maxNbOfSeats,
        sites: plan.maxNbOfSites === -1 ? 'Unlimited' : plan.maxNbOfSites,
      },
      stripePriceId: plan.stripePriceId,
      // Determine action type based on current plan
      // All users have a subscription (at least trial), so no 'subscribe' action
      action:
        subscription && plan.id === subscription.planId
          ? 'current'
          : // If same plan name but different frequency, it's the current plan (different billing cycle)
            subscription && plan.name === subscription.plan.name
            ? 'current'
            : // If higher level, it's an upgrade
              !subscription || plan.level > subscription.plan.level
              ? 'upgrade'
              : // If lower level (and not Trial which is filtered out), it's a downgrade
                plan.level < subscription.plan.level
                ? 'downgrade'
                : // Same level but different plan (shouldn't happen in practice)
                  'current',
    }));

    return NextResponse.json({
      plans: formattedPlans,
      currentPlan: subscription
        ? {
            id: subscription.planId,
            name: subscription.plan.name,
            level: subscription.plan.level,
          }
        : null,
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch plans' },
      { status: 500 }
    );
  }
}
