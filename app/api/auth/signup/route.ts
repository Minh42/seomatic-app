import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { hashPassword } from '@/lib/utils/password';
import { signupSchema } from '@/lib/validations/auth';
import {
  emailRateLimit,
  ipSignupRateLimit,
  fingerprintSignupRateLimit,
  checkRateLimit,
} from '@/lib/auth/rate-limit';
import { validateEmailDomain } from '@/lib/validations/email';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate the input
    const validatedData = signupSchema.parse(body);
    const { email, password, fingerprint } = validatedData;

    // Validate email domain (block disposable emails)
    const emailValidation = validateEmailDomain(email);
    if (!emailValidation.isValid) {
      return NextResponse.json(
        { error: emailValidation.message },
        { status: 400 }
      );
    }

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

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Hash the password
    const passwordHash = await hashPassword(password);

    // Create the user
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        isActive: true,
      })
      .returning({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
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

    // Handle database errors
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === '23505'
    ) {
      // PostgreSQL unique violation
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
