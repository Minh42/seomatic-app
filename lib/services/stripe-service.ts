import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

export interface StripeSubscriptionData {
  customerId: string;
  subscriptionId: string;
  status:
    | 'incomplete'
    | 'incomplete_expired'
    | 'trialing'
    | 'active'
    | 'past_due'
    | 'canceled'
    | 'unpaid'
    | 'paused';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialStart?: Date | null;
  trialEnd?: Date | null;
  cancelAtPeriodEnd: boolean;
}

export class StripeService {
  /**
   * Retrieve full checkout session with subscription details
   */
  static async getCheckoutSessionWithSubscription(
    sessionId: string
  ): Promise<StripeSubscriptionData | null> {
    try {
      // Retrieve the checkout session with expanded subscription
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['subscription', 'subscription.default_payment_method'],
      });

      if (!session.customer || !session.subscription) {
        console.error(
          'Missing data - customer:',
          session.customer,
          'subscription:',
          session.subscription
        );
        return null;
      }

      // The subscription is expanded, so we have full details
      const subscription = session.subscription as Stripe.Subscription;

      // Get period dates from subscription items (Payment Links store them here)
      const periodStart = subscription.items?.data?.[0]?.current_period_start;
      const periodEnd = subscription.items?.data?.[0]?.current_period_end;

      // If not found, we can't proceed
      if (!periodStart || !periodEnd) {
        console.error(
          'Could not find period dates in subscription items:',
          subscription.id
        );
        return null;
      }

      const result = {
        customerId: session.customer as string,
        subscriptionId: subscription.id,
        status: subscription.status,
        currentPeriodStart: new Date(periodStart * 1000),
        currentPeriodEnd: new Date(periodEnd * 1000),
        trialStart: subscription.trial_start
          ? new Date(subscription.trial_start * 1000)
          : null,
        trialEnd: subscription.trial_end
          ? new Date(subscription.trial_end * 1000)
          : null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      };

      return result;
    } catch (error) {
      console.error('Error fetching checkout session from Stripe:', error);
      return null;
    }
  }

  /**
   * Retrieve subscription details
   */
  static async getSubscription(
    subscriptionId: string
  ): Promise<Stripe.Subscription | null> {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      return subscription;
    } catch (error) {
      console.error('Error fetching subscription from Stripe:', error);
      return null;
    }
  }

  /**
   * Cancel subscription at period end
   */
  static async cancelSubscription(subscriptionId: string): Promise<boolean> {
    try {
      await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
      return true;
    } catch (error) {
      console.error('Error canceling subscription:', error);
      return false;
    }
  }

  /**
   * Resume a canceled subscription
   */
  static async resumeSubscription(subscriptionId: string): Promise<boolean> {
    try {
      await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
      });
      return true;
    } catch (error) {
      console.error('Error resuming subscription:', error);
      return false;
    }
  }
}
