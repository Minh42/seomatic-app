import { db } from '@/lib/db';
import { subscriptions, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export interface CreateTrialParams {
  ownerId: string;
  trialDays?: number;
}

export interface UpdateSubscriptionParams {
  ownerId: string;
  planType?: 'starter' | 'growth' | 'enterprise';
  status?: 'trialing' | 'active' | 'canceled' | 'past_due';
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  stripeCustomerId?: string;
  currentPeriodEnd?: Date;
}

export interface UpdateUsageParams {
  ownerId: string;
  domainsUsed?: number;
  pagesPublished?: number;
  wordsGenerated?: number;
}

export class SubscriptionService {
  /**
   * Create a trial subscription for a new user
   */
  static async createTrial({ ownerId, trialDays = 14 }: CreateTrialParams) {
    // Check if subscription already exists
    const existing = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.ownerId, ownerId))
      .limit(1);

    if (existing.length > 0) {
      throw new Error('Subscription already exists for this user');
    }

    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + trialDays);

    const [subscription] = await db
      .insert(subscriptions)
      .values({
        ownerId,
        planType: 'starter',
        status: 'trialing',
        maxDomains: 1,
        maxTeamMembers: 2,
        maxPages: 10,
        maxWords: 50000,
        overageRatePerPage: '0.00',
        whiteLabelEnabled: false,
        currentPeriodStart: new Date(),
        currentPeriodEnd: trialEndDate,
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
   * Update subscription details
   */
  static async updateSubscription({
    ownerId,
    ...updates
  }: UpdateSubscriptionParams) {
    const updateData: any = {
      ...updates,
      updatedAt: new Date(),
    };

    // Update plan limits based on plan type
    if (updates.planType) {
      switch (updates.planType) {
        case 'starter':
          updateData.maxDomains = 1;
          updateData.maxTeamMembers = 2;
          updateData.maxPages = 10;
          updateData.maxWords = 50000;
          updateData.overageRatePerPage = '0.00';
          updateData.whiteLabelEnabled = false;
          break;
        case 'growth':
          updateData.maxDomains = 5;
          updateData.maxTeamMembers = 10;
          updateData.maxPages = 100;
          updateData.maxWords = 500000;
          updateData.overageRatePerPage = '2.00';
          updateData.whiteLabelEnabled = false;
          break;
        case 'enterprise':
          updateData.maxDomains = -1; // unlimited
          updateData.maxTeamMembers = -1; // unlimited
          updateData.maxPages = -1; // unlimited
          updateData.maxWords = -1; // unlimited
          updateData.overageRatePerPage = '0.00';
          updateData.whiteLabelEnabled = true;
          break;
      }
    }

    const [updated] = await db
      .update(subscriptions)
      .set(updateData)
      .where(eq(subscriptions.ownerId, ownerId))
      .returning();

    return updated;
  }

  /**
   * Update usage metrics
   */
  static async updateUsage({ ownerId, ...usage }: UpdateUsageParams) {
    const [updated] = await db
      .update(subscriptions)
      .set({
        ...usage,
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
    const subscription = await this.getByOwnerId(ownerId);

    if (!subscription) {
      throw new Error('No subscription found');
    }

    const limits = {
      canAddDomain:
        subscription.maxDomains === -1 ||
        subscription.domainsUsed < subscription.maxDomains,
      canAddTeamMember:
        subscription.maxTeamMembers === -1 ||
        subscription.teamMembersUsed < subscription.maxTeamMembers,
      canPublishPage:
        subscription.maxPages === -1 ||
        subscription.pagesPublished < subscription.maxPages,
      canGenerateWords:
        subscription.maxWords === -1 ||
        subscription.wordsGenerated < subscription.maxWords,
      remainingDomains:
        subscription.maxDomains === -1
          ? 'unlimited'
          : subscription.maxDomains - subscription.domainsUsed,
      remainingTeamMembers:
        subscription.maxTeamMembers === -1
          ? 'unlimited'
          : subscription.maxTeamMembers - subscription.teamMembersUsed,
      remainingPages:
        subscription.maxPages === -1
          ? 'unlimited'
          : subscription.maxPages - subscription.pagesPublished,
      remainingWords:
        subscription.maxWords === -1
          ? 'unlimited'
          : subscription.maxWords - subscription.wordsGenerated,
    };

    return limits;
  }

  /**
   * Cancel subscription
   */
  static async cancelSubscription(ownerId: string) {
    const [canceled] = await db
      .update(subscriptions)
      .set({
        status: 'canceled',
        canceledAt: new Date(),
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
          firstName: users.firstName,
          lastName: users.lastName,
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
