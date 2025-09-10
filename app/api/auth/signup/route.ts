import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/services/user-service';
import { AnalyticsService } from '@/lib/services/analytics-service';
import { CheckoutService } from '@/lib/services/checkout-service';
import { SubscriptionService } from '@/lib/services/subscription-service';
import { signupApiSchema } from '@/lib/validations/auth';
import { db } from '@/lib/db';
import {
  withRateLimit,
  addRateLimitHeaders,
} from '@/lib/middleware/rate-limit';

export async function POST(request: NextRequest) {
  // Check rate limit
  const rateLimitResponse = await withRateLimit(request, { type: 'signup' });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await request.json();

    // Validate the input
    const validatedData = signupApiSchema.parse(body);
    const { email, password, fingerprint, token } = validatedData;

    // If token is provided, validate checkout session
    let checkoutSession = null;
    if (token) {
      checkoutSession = await CheckoutService.getSessionByToken(token);
      const validation = CheckoutService.validateSession(checkoutSession);

      if (!validation.isValid) {
        if (validation.error === 'already_used') {
          return NextResponse.json(
            {
              error:
                'This signup link has already been used. Please log in to your account.',
            },
            { status: 400 }
          );
        } else if (validation.error === 'Session not found') {
          return NextResponse.json(
            {
              error:
                "We couldn't find your payment information. Please check your email for the signup link.",
            },
            { status: 400 }
          );
        } else if (validation.error === 'expired') {
          return NextResponse.json(
            {
              error:
                'This signup link has expired for security reasons. Please contact support for assistance.',
            },
            { status: 400 }
          );
        }
      }

      // Verify email matches
      if (
        checkoutSession &&
        checkoutSession.email.toLowerCase() !== email.toLowerCase()
      ) {
        return NextResponse.json(
          { error: 'Email does not match the checkout session' },
          { status: 400 }
        );
      }
    }

    // Start a transaction to create user and subscription atomically
    let newUser;

    if (checkoutSession) {
      // Create user with subscription in a transaction
      await db.transaction(async () => {
        // Create the user with billing email from checkout
        newUser = await UserService.createUser({
          email,
          password,
          fingerprint,
          billingEmail: checkoutSession.email, // Store the Stripe checkout email
        });

        // Create the subscription
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 14); // 14-day trial

        await SubscriptionService.createSubscription({
          ownerId: newUser.id,
          planId: checkoutSession.planId,
          status: 'trialing',
          trialEndsAt: trialEndDate,
        });

        // Mark checkout session as completed
        await CheckoutService.completeSignup(token);
      });
    } else {
      // Regular signup without subscription
      newUser = await UserService.createUser({
        email,
        password,
        fingerprint,
      });
    }

    // Track email signup event
    await AnalyticsService.trackEvent(newUser.id, 'user_signed_up', {
      method: 'email',
      email: newUser.email,
      timestamp: new Date().toISOString(),
    });

    // Identify the user in PostHog
    await AnalyticsService.identify(newUser.id, {
      email: newUser.email,
      name: newUser.name,
      created_at: new Date().toISOString(),
      signup_method: 'email',
    });

    const response = NextResponse.json(
      {
        message: 'Account created successfully! Please sign in to continue.',
        user: newUser,
        shouldRedirect: '/login?newAccount=true',
      },
      { status: 201 }
    );

    return addRateLimitHeaders(response, request);
  } catch (error: unknown) {
    console.error('Signup error:', error);

    // Handle service-level errors
    if (error instanceof Error) {
      if (
        error.message === 'User with this email already exists' ||
        error.message.includes('Invalid email domain')
      ) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    // Handle Zod validation errors
    if (error && typeof error === 'object' && 'errors' in error) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: (error as { errors: unknown[] }).errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
