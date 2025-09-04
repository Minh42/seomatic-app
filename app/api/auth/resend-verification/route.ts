import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, verificationTokens } from '@/lib/db/schema';
import { emailVerificationSchema } from '@/lib/validations/auth';
import { getBentoClient } from '@/lib/email/bento-client';
import { resendRateLimit, checkRateLimit } from '@/lib/rate-limit';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate the input
    const validatedData = emailVerificationSchema.parse(body);
    const { email } = validatedData;

    // Check rate limit (email-based)
    const emailRateCheck = await checkRateLimit(resendRateLimit, email);
    if (!emailRateCheck.success) {
      return NextResponse.json(
        {
          error:
            'Too many verification emails sent. Please wait before requesting another.',
          retryAfter: emailRateCheck.reset,
        },
        { status: 429 }
      );
    }

    // Check if user exists and is not already verified
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { error: 'No account found with this email address' },
        { status: 404 }
      );
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { error: 'Email is already verified' },
        { status: 400 }
      );
    }

    // Delete any existing verification tokens for this email
    await db
      .delete(verificationTokens)
      .where(eq(verificationTokens.identifier, email));

    // Generate new verification token
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store new verification token
    await db.insert(verificationTokens).values({
      identifier: email,
      token,
      expires,
      type: 'email_verification',
    });

    // Send verification email
    const bentoClient = getBentoClient();
    if (!bentoClient) {
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      );
    }

    try {
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const verificationUrl = `${baseUrl}/api/auth/verify-email?token=${token}&email=${encodeURIComponent(email)}`;

      await bentoClient.triggerEvent({
        email,
        type: '$email_verification',
        fields: {
          verification_url: verificationUrl,
          expires_in: '24 hours',
        },
      });

      return NextResponse.json(
        { message: 'Verification email sent successfully' },
        { status: 200 }
      );
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      return NextResponse.json(
        { error: 'Failed to send verification email' },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    console.error('Resend verification error:', error);

    // Handle Zod validation errors
    if (error && typeof error === 'object' && 'errors' in error) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
