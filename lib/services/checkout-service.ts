import { db } from '@/lib/db';
import { checkoutSessions, plans } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export interface CheckoutSession {
  id: string;
  stripeSessionId: string;
  email: string;
  planId: string;
  signupToken: string;
  status: 'pending' | 'completed';
  createdAt: Date;
}

export interface CheckoutSessionWithPlan extends CheckoutSession {
  plan: {
    id: string;
    name: string;
    price: number;
    frequency: 'monthly' | 'yearly';
    maxNbOfCredits: number;
    maxNbOfPages: number;
    maxNbOfSeats: number;
    maxNbOfSites: number;
  };
}

export class CheckoutService {
  /**
   * Get checkout session by token
   */
  static async getSessionByToken(
    token: string
  ): Promise<CheckoutSessionWithPlan | null> {
    try {
      const [session] = await db
        .select({
          id: checkoutSessions.id,
          stripeSessionId: checkoutSessions.stripeSessionId,
          email: checkoutSessions.email,
          planId: checkoutSessions.planId,
          signupToken: checkoutSessions.signupToken,
          status: checkoutSessions.status,
          createdAt: checkoutSessions.createdAt,
          plan: {
            id: plans.id,
            name: plans.name,
            price: plans.price,
            frequency: plans.frequency,
            maxNbOfCredits: plans.maxNbOfCredits,
            maxNbOfPages: plans.maxNbOfPages,
            maxNbOfSeats: plans.maxNbOfSeats,
            maxNbOfSites: plans.maxNbOfSites,
          },
        })
        .from(checkoutSessions)
        .innerJoin(plans, eq(checkoutSessions.planId, plans.id))
        .where(eq(checkoutSessions.signupToken, token))
        .limit(1);

      return session || null;
    } catch (error) {
      console.error('Error fetching checkout session:', error);
      return null;
    }
  }

  /**
   * Validate if session is usable
   */
  static validateSession(session: CheckoutSessionWithPlan | null): {
    isValid: boolean;
    error?: string;
  } {
    if (!session) {
      return { isValid: false, error: 'Session not found' };
    }

    // Check if already used
    if (session.status === 'completed') {
      return { isValid: false, error: 'already_used' };
    }

    return { isValid: true };
  }

  /**
   * Mark checkout session as completed after successful signup
   */
  static async completeSignup(token: string): Promise<void> {
    await db
      .update(checkoutSessions)
      .set({
        status: 'completed',
      })
      .where(
        and(
          eq(checkoutSessions.signupToken, token),
          eq(checkoutSessions.status, 'pending')
        )
      );
  }

  /**
   * Check if a checkout session exists for an email (to prevent duplicate signups)
   */
  static async getActiveSessionByEmail(
    email: string
  ): Promise<CheckoutSession | null> {
    const [session] = await db
      .select()
      .from(checkoutSessions)
      .where(
        and(
          eq(checkoutSessions.email, email.toLowerCase()),
          eq(checkoutSessions.status, 'pending')
        )
      )
      .limit(1);

    return session || null;
  }
}
