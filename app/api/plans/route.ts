import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { plans } from '@/lib/db/schema';
import { asc } from 'drizzle-orm';

/**
 * GET /api/plans
 * Get all available subscription plans
 */
export async function GET() {
  try {
    // Fetch all plans ordered by level
    const allPlans = await db
      .select({
        id: plans.id,
        name: plans.name,
        description: plans.description,
        price: plans.price,
        frequency: plans.frequency,
        level: plans.level,
        isRecommended: plans.isRecommended,
        features: plans.features,
        maxNbOfCredits: plans.maxNbOfCredits,
        maxNbOfPages: plans.maxNbOfPages,
        maxNbOfSeats: plans.maxNbOfSeats,
        maxNbOfSites: plans.maxNbOfSites,
        stripePriceId: plans.stripePriceId,
        stripePaymentLink: plans.stripePaymentLink,
      })
      .from(plans)
      .orderBy(asc(plans.level));

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
        credits: plan.maxNbOfCredits === -1 ? 'Unlimited' : plan.maxNbOfCredits,
        pages: plan.maxNbOfPages === -1 ? 'Unlimited' : plan.maxNbOfPages,
        seats: plan.maxNbOfSeats === -1 ? 'Unlimited' : plan.maxNbOfSeats,
        sites: plan.maxNbOfSites === -1 ? 'Unlimited' : plan.maxNbOfSites,
      },
      stripePriceId: plan.stripePriceId,
      stripePaymentLink: plan.stripePaymentLink,
    }));

    return NextResponse.json({ plans: formattedPlans });
  } catch (error) {
    console.error('Error fetching plans:', error);
    return NextResponse.json(
      { error: 'Failed to fetch plans' },
      { status: 500 }
    );
  }
}
