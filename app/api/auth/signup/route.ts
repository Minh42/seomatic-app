import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, verificationTokens } from '@/lib/db/schema';
import { hashPassword } from '@/lib/utils/password';
import { signupSchema } from '@/lib/validations/auth';
import { getBentoClient } from '@/lib/email/bento-client';
import {
  emailRateLimit,
  ipSignupRateLimit,
  fingerprintSignupRateLimit,
  checkRateLimit,
} from '@/lib/auth/rate-limit';
import { validateEmailDomain } from '@/lib/validations/email';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

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
        emailVerified: false,
        isActive: true,
      })
      .returning({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        emailVerified: users.emailVerified,
      });

    // Generate verification token
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store verification token
    await db.insert(verificationTokens).values({
      identifier: email,
      token,
      expires,
      type: 'email_verification',
    });

    // Trigger email verification event in Bento
    const bentoClient = getBentoClient();
    if (bentoClient) {
      try {
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const verificationUrl = `${baseUrl}/api/auth/verify-email?token=${token}&email=${encodeURIComponent(email)}`;

        await bentoClient.triggerEvent({
          email,
          type: '$email_verification_v2',
          fields: {
            verification_url: verificationUrl,
            expires_in: '24 hours',
          },
        });
      } catch (emailError) {
        console.error('Failed to trigger verification event:', emailError);
        // Continue anyway - user can request another verification email
      }
    }

    return NextResponse.json(
      {
        message:
          'User created successfully. Please check your email to verify your account.',
        user: newUser,
        requiresVerification: true,
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
