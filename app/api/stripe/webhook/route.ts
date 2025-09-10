import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db';
import { checkoutSessions, plans } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { EmailService } from '@/lib/services/email-service';

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
        const session = event.data.object as Stripe.Checkout.Session;

        // Extract relevant data (Payment Links use customer_details.email)
        const { id: stripeSessionId, customer_details } = session;
        const customer_email = customer_details?.email;

        if (!customer_email) {
          console.error(
            'No customer email in checkout session:',
            stripeSessionId
          );
          return NextResponse.json(
            { error: 'No customer email' },
            { status: 400 }
          );
        }

        // Get line items to find the price ID
        const lineItemsData = await stripe.checkout.sessions.listLineItems(
          stripeSessionId,
          { limit: 1 }
        );

        const priceId = lineItemsData.data[0]?.price?.id;
        if (!priceId) {
          console.error('No price ID found for session:', stripeSessionId);
          return NextResponse.json(
            { error: 'No price ID found' },
            { status: 400 }
          );
        }

        // Find the plan by Stripe price ID
        const [plan] = await db
          .select()
          .from(plans)
          .where(eq(plans.stripePriceId, priceId))
          .limit(1);

        if (!plan) {
          console.error('Plan not found for price ID:', priceId);
          // Still store the session but flag it for manual review
          console.warn(
            'Creating checkout session without plan ID for manual review'
          );
        }

        // Check if session already exists (idempotency)
        const [existingSession] = await db
          .select()
          .from(checkoutSessions)
          .where(eq(checkoutSessions.stripeSessionId, stripeSessionId))
          .limit(1);

        if (existingSession) {
          return NextResponse.json({ received: true });
        }

        // Store checkout session in database
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // Valid for 7 days

        // Generate secure random token for signup
        const signupToken = uuidv4();

        await db.insert(checkoutSessions).values({
          stripeSessionId,
          email: customer_email.toLowerCase(),
          planId: plan?.id || null!, // Will need manual intervention if plan not found
          signupToken, // Use secure UUID instead of Stripe session ID
          status: 'pending',
          expiresAt,
          createdAt: new Date(),
        });

        // Send trial started event to Bento for email automation
        if (plan) {
          await EmailService.trackEvent({
            email: customer_email.toLowerCase(),
            type: '$trial_started',
            details: {
              plan_name: plan.name,
              plan_frequency: plan.frequency,
              trial_duration_days: 14,
              trial_ends_at: new Date(
                Date.now() + 14 * 24 * 60 * 60 * 1000
              ).toISOString(),
              plan_price: plan.price,
              max_credits: plan.maxNbOfCredits,
              max_pages: plan.maxNbOfPages,
              max_seats: plan.maxNbOfSeats,
              max_sites: plan.maxNbOfSites,
              checkout_session_id: stripeSessionId,
              signup_url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/signup?token=${signupToken}`,
            },
          });
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
      case 'invoice.payment_succeeded':
      case 'invoice.payment_failed':
        // TODO: Implement subscription lifecycle events
        console.log(`Unhandled event type: ${event.type}`);
        break;

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
