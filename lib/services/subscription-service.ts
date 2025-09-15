import { db } from '@/lib/db';
import { subscriptions, users, plans } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export interface CreateSubscriptionParams {
  ownerId: string;
  planId: string;
  status?: 'trialing' | 'active' | 'canceled' | 'past_due' | 'unpaid';
  trialEndsAt?: Date;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
}

export interface UpdateSubscriptionParams {
  ownerId: string;
  planId?: string;
  status?: 'trialing' | 'active' | 'canceled' | 'past_due' | 'unpaid';
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
}

export class SubscriptionService {
  /**
   * Create a subscription for a user
   */
  static async createSubscription(params: CreateSubscriptionParams) {
    const {
      ownerId,
      planId,
      status = 'trialing',
      trialEndsAt,
      stripeCustomerId,
      stripeSubscriptionId,
      currentPeriodStart,
      currentPeriodEnd,
    } = params;

    // Check if subscription already exists
    const existing = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.ownerId, ownerId))
      .limit(1);

    if (existing.length > 0) {
      throw new Error('Subscription already exists for this user');
    }

    const [subscription] = await db
      .insert(subscriptions)
      .values({
        ownerId,
        planId,
        status,
        trialEndsAt,
        stripeCustomerId,
        stripeSubscriptionId,
        currentPeriodStart,
        currentPeriodEnd,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return subscription;
  }

  /**
   * Get subscription for a user
   */
  static async getByOwnerId(ownerId: string) {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.ownerId, ownerId))
      .limit(1);

    return subscription || null;
  }

  /**
   * Alias for getByOwnerId for consistency
   */
  static async getUserSubscription(userId: string) {
    return this.getByOwnerId(userId);
  }

  /**
   * Update subscription details
   */
  static async updateSubscription({
    ownerId,
    ...updates
  }: UpdateSubscriptionParams) {
    const [updated] = await db
      .update(subscriptions)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.ownerId, ownerId))
      .returning();

    return updated;
  }

  /**
   * Check if user has reached plan limits
   */
  static async checkLimits(ownerId: string) {
    const subscription = await this.getSubscriptionWithPlan(ownerId);

    if (!subscription) {
      throw new Error('No subscription found');
    }

    // TODO: Get actual usage from workspace_usage table
    const currentUsage = {
      pagesUsed: 0,
      creditsUsed: 0,
      seatsUsed: 1,
      sitesUsed: 1,
    };

    const limits = {
      canAddPage:
        subscription.plan.maxNbOfPages === -1 ||
        currentUsage.pagesUsed < subscription.plan.maxNbOfPages,
      canUseCredits:
        subscription.plan.maxNbOfCredits === -1 ||
        currentUsage.creditsUsed < subscription.plan.maxNbOfCredits,
      canAddSeat:
        subscription.plan.maxNbOfSeats === -1 ||
        currentUsage.seatsUsed < subscription.plan.maxNbOfSeats,
      canAddSite:
        subscription.plan.maxNbOfSites === -1 ||
        currentUsage.sitesUsed < subscription.plan.maxNbOfSites,
      remainingPages:
        subscription.plan.maxNbOfPages === -1
          ? 'unlimited'
          : subscription.plan.maxNbOfPages - currentUsage.pagesUsed,
      remainingCredits:
        subscription.plan.maxNbOfCredits === -1
          ? 'unlimited'
          : subscription.plan.maxNbOfCredits - currentUsage.creditsUsed,
      remainingSeats:
        subscription.plan.maxNbOfSeats === -1
          ? 'unlimited'
          : subscription.plan.maxNbOfSeats - currentUsage.seatsUsed,
      remainingSites:
        subscription.plan.maxNbOfSites === -1
          ? 'unlimited'
          : subscription.plan.maxNbOfSites - currentUsage.sitesUsed,
    };

    return limits;
  }

  /**
   * Get subscription with plan details
   */
  static async getSubscriptionWithPlan(ownerId: string) {
    const [subscription] = await db
      .select({
        id: subscriptions.id,
        ownerId: subscriptions.ownerId,
        status: subscriptions.status,
        stripeSubscriptionId: subscriptions.stripeSubscriptionId,
        stripeCustomerId: subscriptions.stripeCustomerId,
        currentPeriodStart: subscriptions.currentPeriodStart,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
        cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
        trialEndsAt: subscriptions.trialEndsAt,
        plan: {
          id: plans.id,
          name: plans.name,
          price: plans.price,
          frequency: plans.frequency,
          maxNbOfCredits: plans.maxNbOfCredits,
          maxNbOfPages: plans.maxNbOfPages,
          maxNbOfSeats: plans.maxNbOfSeats,
          maxNbOfSites: plans.maxNbOfSites,
          overageRatePerPage: plans.overageRatePerPage,
        },
      })
      .from(subscriptions)
      .innerJoin(plans, eq(subscriptions.planId, plans.id))
      .where(eq(subscriptions.ownerId, ownerId))
      .limit(1);

    return subscription || null;
  }

  /**
   * Cancel subscription at period end
   */
  static async cancelSubscription(ownerId: string) {
    const [canceled] = await db
      .update(subscriptions)
      .set({
        cancelAtPeriodEnd: true,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.ownerId, ownerId))
      .returning();

    return canceled;
  }

  /**
   * Check if trial has expired
   */
  static async isTrialExpired(ownerId: string) {
    const subscription = await this.getByOwnerId(ownerId);

    if (!subscription) {
      return false;
    }

    if (subscription.status !== 'trialing') {
      return false;
    }

    return subscription.currentPeriodEnd < new Date();
  }

  /**
   * Get subscription with owner details
   */
  static async getWithOwner(ownerId: string) {
    const result = await db
      .select({
        subscription: subscriptions,
        owner: {
          id: users.id,
          email: users.email,
          name: users.name,
        },
      })
      .from(subscriptions)
      .innerJoin(users, eq(users.id, subscriptions.ownerId))
      .where(eq(subscriptions.ownerId, ownerId))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Calculate overage charges
   */
  static async calculateOverage(ownerId: string) {
    const subscription = await this.getByOwnerId(ownerId);

    if (!subscription) {
      throw new Error('No subscription found');
    }

    // No overage for unlimited plans or trial
    if (subscription.maxPages === -1 || subscription.status === 'trialing') {
      return {
        overagePages: 0,
        overageAmount: 0,
      };
    }

    const overagePages = Math.max(
      0,
      subscription.pagesPublished - subscription.maxPages
    );
    const overageAmount =
      overagePages * parseFloat(subscription.overageRatePerPage);

    return {
      overagePages,
      overageAmount,
    };
  }
}
