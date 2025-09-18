import { db } from '@/lib/db';
import { plans } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';

export interface Plan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  frequency: 'monthly' | 'yearly';
  level: number;
  isRecommended: boolean;
  features: string[] | null;
  maxNbOfCredits: number;
  maxNbOfPages: number;
  maxNbOfSeats: number;
  maxNbOfSites: number;
  stripePriceId: string | null;
  stripeProductId: string | null;
}

export class PlanService {
  /**
   * Get all available plans
   */
  static async getAllPlans(): Promise<Plan[]> {
    const allPlans = await db.select().from(plans).orderBy(asc(plans.level));

    return allPlans;
  }

  /**
   * Get a single plan by ID
   */
  static async getPlanById(planId: string): Promise<Plan | null> {
    const [plan] = await db
      .select()
      .from(plans)
      .where(eq(plans.id, planId))
      .limit(1);

    return plan || null;
  }

  /**
   * Get a plan by Stripe price ID
   */
  static async getPlanByStripePriceId(
    stripePriceId: string
  ): Promise<Plan | null> {
    const [plan] = await db
      .select()
      .from(plans)
      .where(eq(plans.stripePriceId, stripePriceId))
      .limit(1);

    return plan || null;
  }

  /**
   * Get a plan by name
   */
  static async getPlanByName(name: string): Promise<Plan | null> {
    const [plan] = await db
      .select()
      .from(plans)
      .where(eq(plans.name, name))
      .limit(1);

    return plan || null;
  }

  /**
   * Get the recommended plan
   */
  static async getRecommendedPlan(): Promise<Plan | null> {
    const [plan] = await db
      .select()
      .from(plans)
      .where(eq(plans.isRecommended, true))
      .limit(1);

    return plan || null;
  }

  /**
   * Format plan for display (converts cents to dollars, etc.)
   */
  static formatPlanForDisplay(plan: Plan) {
    return {
      ...plan,
      price: plan.price / 100, // Convert cents to dollars
      features: plan.features || [],
      limits: {
        credits: plan.maxNbOfCredits === -1 ? 'Unlimited' : plan.maxNbOfCredits,
        pages: plan.maxNbOfPages === -1 ? 'Unlimited' : plan.maxNbOfPages,
        seats: plan.maxNbOfSeats === -1 ? 'Unlimited' : plan.maxNbOfSeats,
        sites: plan.maxNbOfSites === -1 ? 'Unlimited' : plan.maxNbOfSites,
      },
    };
  }

  /**
   * Compare two plans to determine if it's an upgrade or downgrade
   */
  static comparePlans(
    currentPlanId: string,
    newPlanId: string
  ): Promise<'upgrade' | 'downgrade' | 'same' | null> {
    return db.transaction(async tx => {
      const [currentPlan] = await tx
        .select({ level: plans.level })
        .from(plans)
        .where(eq(plans.id, currentPlanId))
        .limit(1);

      const [newPlan] = await tx
        .select({ level: plans.level })
        .from(plans)
        .where(eq(plans.id, newPlanId))
        .limit(1);

      if (!currentPlan || !newPlan) {
        return null;
      }

      if (newPlan.level > currentPlan.level) {
        return 'upgrade';
      } else if (newPlan.level < currentPlan.level) {
        return 'downgrade';
      } else {
        return 'same';
      }
    });
  }
}
