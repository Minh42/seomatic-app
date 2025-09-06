import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/services/user-service';
import { signupSchema } from '@/lib/validations/auth';
import {
  emailRateLimit,
  ipSignupRateLimit,
  fingerprintSignupRateLimit,
  checkRateLimit,
} from '@/lib/auth/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate the input
    const validatedData = signupSchema.parse(body);
    const { email, password, fingerprint } = validatedData;

    // Get IP address for rate limiting
    const ip =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';

    // Check rate limits
    const emailRateCheck = await checkRateLimit(emailRateLimit, email);
    if (!emailRateCheck.success) {
      return NextResponse.json(
        {
          error:
            'Too many signup attempts from this email. Please wait before trying again.',
          retryAfter: emailRateCheck.reset,
        },
        { status: 429 }
      );
    }

    // Check IP rate limit
    const ipRateCheck = await checkRateLimit(ipSignupRateLimit, ip as string);
    if (!ipRateCheck.success) {
      return NextResponse.json(
        {
          error:
            'Too many accounts created from this location. Please try again later.',
          retryAfter: ipRateCheck.reset,
        },
        { status: 429 }
      );
    }

    // Check fingerprint rate limit (if fingerprint provided)
    if (fingerprint) {
      const fingerprintRateCheck = await checkRateLimit(
        fingerprintSignupRateLimit,
        fingerprint
      );
      if (!fingerprintRateCheck.success) {
        return NextResponse.json(
          {
            error:
              'Too many accounts created from this device. Please try again later.',
            retryAfter: fingerprintRateCheck.reset,
          },
          { status: 429 }
        );
      }
    }

    // Create the user using UserService
    const newUser = await UserService.createUser({
      email,
      password,
      fingerprint,
    });

    return NextResponse.json(
      {
        message: 'Account created successfully! Please sign in to continue.',
        user: newUser,
        shouldRedirect: '/login?newAccount=true',
      },
      { status: 201 }
    );
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
