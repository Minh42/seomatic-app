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
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        try {
          const session = event.data.object as Stripe.Checkout.Session;
          console.log('Checkout session completed:', session.id);
          console.log('Session data:', {
            customer: session.customer,
            subscription: session.subscription,
            client_reference_id: session.client_reference_id,
            payment_status: session.payment_status,
          });

          // Get user ID from client_reference_id (set during checkout session creation)
          const userId = session.client_reference_id;
          if (!userId) {
            console.error('No user ID found in checkout session');
            break;
          }

          // Get subscription ID from the session
          const subscriptionId = session.subscription as string;
          if (!subscriptionId) {
            console.error('No subscription ID found in checkout session');
            break;
          }

          // Get the full subscription details from Stripe
          console.log('Retrieving subscription from Stripe:', subscriptionId);
          const subscription =
            await stripe.subscriptions.retrieve(subscriptionId);
          console.log('Subscription status from Stripe:', subscription.status);
          console.log('Subscription data:', {
            id: subscription.id,
            status: subscription.status,
            current_period_start: subscription.current_period_start,
            current_period_end: subscription.current_period_end,
            items: subscription.items.data.map(item => ({
              price_id: item.price.id,
              product_id: item.price.product,
            })),
          });

          // Get the price ID from the subscription
          const priceId = subscription.items.data[0]?.price?.id;
          if (!priceId) {
            console.error('No price ID found in subscription');
            break;
          }
          console.log('Price ID:', priceId);

          // Find the plan in our database by Stripe price ID
          console.log('Looking up plan by price ID:', priceId);
          const plan = await PlanService.getPlanByStripePriceId(priceId);
          if (!plan) {
            console.error(`Plan not found for price ID: ${priceId}`);
            break;
          }
          console.log('Found plan:', { id: plan.id, name: plan.name });

          // Update the subscription in our database
          console.log('Updating subscription in database...');

          // Log the raw period values - they are at the root level
          console.log('Raw period values from Stripe:', {
            current_period_start: subscription.current_period_start,
            current_period_end: subscription.current_period_end,
            typeof_start: typeof subscription.current_period_start,
            typeof_end: typeof subscription.current_period_end,
          });

          const periodStart = subscription.current_period_start;
          const periodEnd = subscription.current_period_end;

          // Check if subscription was created with pause (rare but possible)
          const pauseCollection = (subscription as any).pause_collection;
          let pauseData = {};
          if (pauseCollection && pauseCollection.behavior) {
            pauseData = {
              pausedAt: new Date(),
              pauseEndsAt: pauseCollection.resumes_at
                ? new Date(pauseCollection.resumes_at * 1000)
                : null,
            };
            console.log('Subscription created with pause state:', pauseData);
          }

          const updateData = {
            ownerId: userId,
            planId: plan.id,
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: subscriptionId,
            status: subscription.status as any,
            currentPeriodStart: periodStart
              ? new Date(periodStart * 1000)
              : undefined,
            currentPeriodEnd: periodEnd
              ? new Date(periodEnd * 1000)
              : undefined,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            ...pauseData,
          };
          console.log('Update data:', updateData);

          await SubscriptionService.updateSubscription(updateData);

          console.log(
            `✅ Subscription updated for user ${userId} to plan ${plan.name}`
          );
        } catch (error) {
          console.error(
            '❌ Error in checkout.session.completed handler:',
            error
          );
          console.error('Error details:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
          });
          throw error; // Re-throw to ensure 500 response
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('Subscription updated:', subscription.id);

        // Find subscription by Stripe subscription ID
        const existingSubscription =
          await SubscriptionService.getByStripeSubscriptionId(subscription.id);

        if (!existingSubscription) {
          console.error(`Subscription not found: ${subscription.id}`);
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
            console.log(
              `Plan updated to ${plan.name} for subscription ${subscription.id}`
            );
          }
        }

        // Check if pause collection status changed - Stripe is source of truth
        const pauseCollection = (subscription as any).pause_collection;
        let pauseUpdate = {};

        // Sync pause state from Stripe
        if (pauseCollection && pauseCollection.behavior) {
          // Subscription is paused in Stripe
          console.log('Subscription paused in Stripe, syncing to our database');

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
            console.log(
              'Subscription resumed in Stripe, clearing pause in our database'
            );
            pauseUpdate = {
              pausedAt: null,
              pauseEndsAt: null,
            };
          }
        }

        // Update subscription status and periods
        await SubscriptionService.updateSubscription({
          ownerId: existingSubscription.ownerId,
          status: subscription.status as any,
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
        console.log('Subscription deleted:', subscription.id);

        // Find subscription by Stripe subscription ID
        const existingSubscription =
          await SubscriptionService.getByStripeSubscriptionId(subscription.id);

        if (!existingSubscription) {
          console.error(`Subscription not found: ${subscription.id}`);
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
        console.log('Invoice payment succeeded');
        break;

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('Invoice payment failed:', invoice.id);

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
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
