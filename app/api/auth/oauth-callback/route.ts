import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { CheckoutService } from '@/lib/services/checkout-service';
import { SubscriptionService } from '@/lib/services/subscription-service';
import { StripeService } from '@/lib/services/stripe-service';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Get the current session
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      // No session, redirect to login
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const userId = session.user.id;
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    // If no token, just redirect to onboarding
    if (!token) {
      return NextResponse.redirect(new URL('/onboarding', request.url));
    }

    // Validate checkout session
    const checkoutSession = await CheckoutService.getSessionByToken(token);
    const validation = CheckoutService.validateSession(checkoutSession);

    if (!validation.isValid) {
      // Invalid token - redirect back to signup with error
      const signupUrl = new URL('/signup', request.url);
      signupUrl.searchParams.set('token', token);

      if (validation.error === 'already_used') {
        signupUrl.searchParams.set('error', 'already_used');
      } else if (validation.error === 'expired') {
        signupUrl.searchParams.set('error', 'expired');
      } else {
        signupUrl.searchParams.set('error', 'invalid');
      }

      return NextResponse.redirect(signupUrl);
    }

    // Check if user already has a subscription
    const existingSubscription =
      await SubscriptionService.getUserSubscription(userId);

    if (existingSubscription) {
      // User already has subscription, just go to onboarding
      return NextResponse.redirect(new URL('/onboarding', request.url));
    }

    // Fetch subscription details from Stripe
    const stripeData = await StripeService.getCheckoutSessionWithSubscription(
      checkoutSession!.stripeSessionId
    );

    if (!stripeData) {
      // Failed to get Stripe data - redirect back to signup with error
      const signupUrl = new URL('/signup', request.url);
      signupUrl.searchParams.set('token', token);
      signupUrl.searchParams.set('stripeError', 'true');
      return NextResponse.redirect(signupUrl);
    }

    // Create subscription and update user in a transaction
    try {
      await db.transaction(async () => {
        // Create the subscription with accurate Stripe data
        await SubscriptionService.createSubscription({
          ownerId: userId,
          planId: checkoutSession!.planId,
          status: stripeData.status === 'trialing' ? 'trialing' : 'active',
          stripeCustomerId: stripeData.customerId,
          stripeSubscriptionId: stripeData.subscriptionId,
          currentPeriodStart: stripeData.currentPeriodStart,
          currentPeriodEnd: stripeData.currentPeriodEnd,
          trialEndsAt: stripeData.trialEnd || undefined,
        });

        // Update user with billing email
        await db
          .update(users)
          .set({ billingEmail: checkoutSession!.email })
          .where(eq(users.id, userId));

        // Mark checkout session as completed
        await CheckoutService.completeSignup(token);
      });

      // Success! Redirect to onboarding
      return NextResponse.redirect(new URL('/onboarding', request.url));
    } catch (error) {
      console.error('Error creating subscription:', error);

      // Transaction failed - redirect back to signup with error
      const signupUrl = new URL('/signup', request.url);
      signupUrl.searchParams.set('token', token);
      signupUrl.searchParams.set('stripeError', 'true');
      return NextResponse.redirect(signupUrl);
    }
  } catch (error) {
    console.error('OAuth callback error:', error);

    // General error - redirect to signup
    return NextResponse.redirect(new URL('/signup', request.url));
  }
}
