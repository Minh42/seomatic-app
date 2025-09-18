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
  currentPeriodStart?: Date | undefined;
  currentPeriodEnd?: Date | undefined;
  cancelAtPeriodEnd?: boolean;
  trialEndsAt?: Date | null;
  pausedAt?: Date | null;
  pauseEndsAt?: Date | null;
}

export class SubscriptionService {
  /**
   * Get subscription by Stripe subscription ID
   */
  static async getByStripeSubscriptionId(stripeSubscriptionId: string) {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId))
      .limit(1);

    return subscription || null;
  }

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

    // Check if subscription is paused
    const isPaused = await this.isPaused(ownerId);
    if (isPaused) {
      return {
        canAddPage: false,
        canUseCredits: false,
        canAddSeat: false,
        canAddSite: false,
        remainingPages: 0,
        remainingCredits: 0,
        remainingSeats: 0,
        remainingSites: 0,
        isPaused: true,
        pauseDetails: await this.getPauseDetails(ownerId),
      };
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
      isPaused: false,
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
        pausedAt: subscriptions.pausedAt,
        pauseEndsAt: subscriptions.pauseEndsAt,
        plan: {
          id: plans.id,
          name: plans.name,
          price: plans.price,
          frequency: plans.frequency,
          level: plans.level,
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
   * Change subscription plan
   */
  static async changePlan(ownerId: string, newPlanId: string) {
    const [updated] = await db
      .update(subscriptions)
      .set({
        planId: newPlanId,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.ownerId, ownerId))
      .returning();

    return updated;
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

  /**
   * Pause subscription for a specified duration
   */
  static async pauseSubscription(ownerId: string, durationInMonths: number) {
    const pausedAt = new Date();
    const pauseEndsAt = new Date();
    pauseEndsAt.setMonth(pauseEndsAt.getMonth() + durationInMonths);

    const [paused] = await db
      .update(subscriptions)
      .set({
        pausedAt,
        pauseEndsAt,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.ownerId, ownerId))
      .returning();

    return paused;
  }

  /**
   * Resume paused subscription
   */
  static async resumeSubscription(ownerId: string) {
    const [resumed] = await db
      .update(subscriptions)
      .set({
        pausedAt: null,
        pauseEndsAt: null,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.ownerId, ownerId))
      .returning();

    return resumed;
  }

  /**
   * Check if subscription is paused
   */
  static async isPaused(ownerId: string) {
    const subscription = await this.getByOwnerId(ownerId);

    if (!subscription || !subscription.pausedAt) {
      return false;
    }

    // Check if pause period has ended
    if (subscription.pauseEndsAt && subscription.pauseEndsAt < new Date()) {
      // Auto-resume if pause period has ended
      await this.resumeSubscription(ownerId);
      return false;
    }

    return true;
  }

  /**
   * Get pause details
   */
  static async getPauseDetails(ownerId: string) {
    const subscription = await this.getByOwnerId(ownerId);

    if (!subscription || !subscription.pausedAt) {
      return null;
    }

    return {
      pausedAt: subscription.pausedAt,
      pauseEndsAt: subscription.pauseEndsAt,
      daysRemaining: subscription.pauseEndsAt
        ? Math.ceil(
            (subscription.pauseEndsAt.getTime() - Date.now()) /
              (1000 * 60 * 60 * 24)
          )
        : null,
    };
  }

  /**
   * Check if user can add team members based on subscription
   */
  static async canAddTeamMember(ownerId: string) {
    // Check if subscription is paused
    const isPaused = await this.isPaused(ownerId);
    if (isPaused) {
      return {
        canAdd: false,
        reason:
          'Subscription is paused. Resume your subscription to invite team members.',
      };
    }

    // Get subscription with plan
    const subscription = await this.getSubscriptionWithPlan(ownerId);
    if (!subscription) {
      return {
        canAdd: false,
        reason: 'No active subscription found.',
      };
    }

    // If unlimited seats, always allow
    if (subscription.plan.maxNbOfSeats === -1) {
      return {
        canAdd: true,
        reason: null,
      };
    }

    // Get current member count from organization
    const { OrganizationService } = await import('./organization-service');
    const { TeamService } = await import('./team-service');

    const organization = await OrganizationService.getUserOrganization(ownerId);
    if (!organization) {
      return {
        canAdd: false,
        reason: 'Organization not found.',
      };
    }

    const activeMemberCount = await TeamService.getActiveMemberCount(
      organization.id
    );

    // Check if at or over limit
    if (activeMemberCount >= subscription.plan.maxNbOfSeats) {
      return {
        canAdd: false,
        reason: `Seat limit reached (${activeMemberCount}/${subscription.plan.maxNbOfSeats} seats used). Upgrade your plan to add more team members.`,
        currentCount: activeMemberCount,
        limit: subscription.plan.maxNbOfSeats,
      };
    }

    return {
      canAdd: true,
      reason: null,
      currentCount: activeMemberCount,
      limit: subscription.plan.maxNbOfSeats,
    };
  }

  /**
   * Get actual member count for an owner's organization
   */
  static async getActualMemberCount(ownerId: string) {
    const { OrganizationService } = await import('./organization-service');
    const { TeamService } = await import('./team-service');

    const organization = await OrganizationService.getUserOrganization(ownerId);
    if (!organization) {
      return 0;
    }

    return await TeamService.getActiveMemberCount(organization.id);
  }
}
