import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { CheckoutService } from '@/lib/services/checkout-service';
import { SubscriptionService } from '@/lib/services/subscription-service';
import { StripeService } from '@/lib/services/stripe-service';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { withRateLimit } from '@/lib/middleware/rate-limit';

export async function GET(request: NextRequest) {
  // Check rate limit (but skip if user is already authenticated)
  const rateLimitResponse = await withRateLimit(request, {
    type: 'login',
    skipIfAuthenticated: true,
  });
  if (rateLimitResponse) return rateLimitResponse;

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

    // Token is required for signup - same as email/password flow
    if (!token) {
      // Redirect to signup page where error will be shown as toast
      const signupUrl = new URL('/signup', request.url);
      signupUrl.searchParams.set('error', 'no-payment-info');
      return NextResponse.redirect(signupUrl);
    }

    // Validate checkout session
    const checkoutSession = await CheckoutService.getSessionByToken(token);
    const validation = CheckoutService.validateSession(checkoutSession);

    if (!validation.isValid) {
      // Handle different validation errors
      if (validation.error === 'already_used') {
        // Token has already been used - redirect to signup with error
        const signupUrl = new URL('/signup', request.url);
        signupUrl.searchParams.set('error', 'already_used');
        return NextResponse.redirect(signupUrl);
      }

      // For other invalid tokens, redirect to signup with error
      const signupUrl = new URL('/signup', request.url);
      signupUrl.searchParams.set('token', token);
      signupUrl.searchParams.set('error', 'invalid');
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
