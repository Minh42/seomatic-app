import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { SubscriptionService } from '@/lib/services/subscription-service';
import { PlanService } from '@/lib/services/plan-service';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        try {
          const session = event.data.object as Stripe.Checkout.Session;

          // Get user ID from client_reference_id (set during checkout session creation)
          const userId = session.client_reference_id;
          if (!userId) {
            break;
          }

          // Get subscription ID from the session
          const subscriptionId = session.subscription as string;
          if (!subscriptionId) {
            break;
          }

          // Get the full subscription details from Stripe
          const subscription =
            await stripe.subscriptions.retrieve(subscriptionId);

          // Get the price ID from the subscription
          const priceId = subscription.items.data[0]?.price?.id;
          if (!priceId) {
            break;
          }

          // Find the plan in our database by Stripe price ID
          const plan = await PlanService.getPlanByStripePriceId(priceId);
          if (!plan) {
            break;
          }

          const periodStart = subscription.current_period_start;
          const periodEnd = subscription.current_period_end;

          // Check if subscription was created with pause (rare but possible)
          const pauseCollection = (
            subscription as Stripe.Subscription & {
              pause_collection?: {
                behavior?: string;
                resumes_at?: number;
              };
            }
          ).pause_collection;
          let pauseData = {};
          if (pauseCollection && pauseCollection.behavior) {
            pauseData = {
              pausedAt: new Date(),
              pauseEndsAt: pauseCollection.resumes_at
                ? new Date(pauseCollection.resumes_at * 1000)
                : null,
            };
          }

          const updateData = {
            ownerId: userId,
            planId: plan.id,
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: subscriptionId,
            status: subscription.status as
              | 'active'
              | 'canceled'
              | 'past_due'
              | 'trialing'
              | 'unpaid',
            currentPeriodStart: periodStart
              ? new Date(periodStart * 1000)
              : undefined,
            currentPeriodEnd: periodEnd
              ? new Date(periodEnd * 1000)
              : undefined,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            ...pauseData,
          };

          await SubscriptionService.updateSubscription(updateData);
        } catch (error) {
          throw error; // Re-throw to ensure 500 response
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;

        // Find subscription by Stripe subscription ID
        const existingSubscription =
          await SubscriptionService.getByStripeSubscriptionId(subscription.id);

        if (!existingSubscription) {
          break;
        }

        // Check if the plan changed
        const priceId = subscription.items.data[0]?.price?.id;
        if (priceId) {
          const plan = await PlanService.getPlanByStripePriceId(priceId);
          if (plan && plan.id !== existingSubscription.planId) {
            // Plan changed, update it
            await SubscriptionService.updateSubscription({
              ownerId: existingSubscription.ownerId,
              planId: plan.id,
            });
          }
        }

        // Check if pause collection status changed - Stripe is source of truth
        const pauseCollection = (
          subscription as Stripe.Subscription & {
            pause_collection?: {
              behavior?: string;
              resumes_at?: number;
            };
          }
        ).pause_collection;
        let pauseUpdate = {};

        // Sync pause state from Stripe
        if (pauseCollection && pauseCollection.behavior) {
          // Subscription is paused in Stripe

          // Use Stripe's pause state as source of truth
          pauseUpdate = {
            pausedAt: new Date(),
            pauseEndsAt: pauseCollection.resumes_at
              ? new Date(pauseCollection.resumes_at * 1000)
              : null, // null means indefinite pause
          };
        } else if (!pauseCollection || !pauseCollection.behavior) {
          // Subscription is NOT paused in Stripe
          if (existingSubscription.pausedAt) {
            // We think it's paused but Stripe says it's not - clear our pause
            pauseUpdate = {
              pausedAt: null,
              pauseEndsAt: null,
            };
          }
        }

        // Update subscription status and periods
        await SubscriptionService.updateSubscription({
          ownerId: existingSubscription.ownerId,
          status: subscription.status as
            | 'active'
            | 'canceled'
            | 'past_due'
            | 'trialing'
            | 'unpaid',
          currentPeriodStart: new Date(
            subscription.current_period_start * 1000
          ),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          ...pauseUpdate,
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        // Find subscription by Stripe subscription ID
        const existingSubscription =
          await SubscriptionService.getByStripeSubscriptionId(subscription.id);

        if (!existingSubscription) {
          break;
        }

        // Update subscription status to canceled
        await SubscriptionService.updateSubscription({
          ownerId: existingSubscription.ownerId,
          status: 'canceled',
        });
        break;
      }

      case 'invoice.payment_succeeded':
        // Payment successful, subscription remains active
        break;

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;

        if (invoice.subscription) {
          const subscriptionId =
            typeof invoice.subscription === 'string'
              ? invoice.subscription
              : invoice.subscription.id;

          const existingSubscription =
            await SubscriptionService.getByStripeSubscriptionId(subscriptionId);

          if (existingSubscription) {
            // Update status to past_due
            await SubscriptionService.updateSubscription({
              ownerId: existingSubscription.ownerId,
              status: 'past_due',
            });
          }
        }
        break;
      }

      default:
      // Unhandled event type
    }

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
