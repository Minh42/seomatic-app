import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/services/user-service';
import { AnalyticsService } from '@/lib/services/analytics-service';
import { signupApiSchema } from '@/lib/validations/auth';
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

    // Create the user using UserService
    const newUser = await UserService.createUser({
      email,
      password,
      fingerprint,
    });

    // Track signup event in PostHog
    await AnalyticsService.trackEvent(newUser.id, 'user_signed_up', {
      email: newUser.email,
      signup_method: 'email', // We can expand this later for OAuth signups
      timestamp: new Date().toISOString(),
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
