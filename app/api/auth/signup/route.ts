import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/services/user-service';
import { AnalyticsService } from '@/lib/services/analytics-service';
import { SubscriptionService } from '@/lib/services/subscription-service';
import { PlanService } from '@/lib/services/plan-service';
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
    const { email, password, fingerprint } = validatedData;

    // Check if user already exists
    const existingUser = await UserService.findByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Get the trial plan
    const trialPlan = await PlanService.getPlanByName('Trial');
    if (!trialPlan) {
      console.error('Trial plan not found');
      return NextResponse.json(
        { error: 'Unable to create account. Please try again later.' },
        { status: 500 }
      );
    }

    // Create user with trial subscription in a transaction
    let newUser;
    await db.transaction(async () => {
      // Create the user
      newUser = await UserService.createUser({
        email,
        password,
        fingerprint,
        billingEmail: email, // Use signup email as billing email
      });

      // Create a 14-day trial subscription
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 14);

      const subscriptionData = {
        ownerId: newUser.id,
        planId: trialPlan.id,
        status: 'trialing' as const,
        currentPeriodStart: new Date(),
        currentPeriodEnd: trialEndsAt,
        trialEndsAt: trialEndsAt,
        // No Stripe IDs for trial - they'll be added when user upgrades
      };

      await SubscriptionService.createSubscription(subscriptionData);
    });

    // Track email signup event
    await AnalyticsService.trackEvent(newUser!.id, 'user_signed_up', {
      method: 'email',
      email: newUser!.email,
      timestamp: new Date().toISOString(),
    });

    // Identify the user in PostHog
    await AnalyticsService.identify(newUser!.id, {
      email: newUser!.email,
      name: newUser!.name,
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
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: (error as { issues: unknown[] }).issues,
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
