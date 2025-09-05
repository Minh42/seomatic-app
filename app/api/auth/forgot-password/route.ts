import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, verificationTokens } from '@/lib/db/schema';
import { passwordResetRequestSchema } from '@/lib/validations/auth';
import { getBentoClient } from '@/lib/email/bento-client';
import { emailRateLimit, checkRateLimit } from '@/lib/auth/rate-limit';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate the input
    const validatedData = passwordResetRequestSchema.parse(body);
    const { email } = validatedData;

    // Check rate limit (email-based)
    const emailRateCheck = await checkRateLimit(emailRateLimit, email);
    if (!emailRateCheck.success) {
      return NextResponse.json(
        {
          error:
            'Too many password reset requests. Please wait before trying again.',
          retryAfter: emailRateCheck.reset,
        },
        { status: 429 }
      );
    }

    // Check if user exists and is verified
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    // Always return success to prevent email enumeration
    const successResponse = NextResponse.json(
      {
        message:
          'If an account exists with this email, a password reset link has been sent.',
      },
      { status: 200 }
    );

    if (!user || !user.emailVerified) {
      return successResponse;
    }

    // Delete any existing password reset tokens for this email
    await db
      .delete(verificationTokens)
      .where(
        and(
          eq(verificationTokens.identifier, email),
          eq(verificationTokens.type, 'password_reset')
        )
      );

    // Generate new password reset token
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store password reset token
    await db.insert(verificationTokens).values({
      identifier: email,
      token,
      expires,
      type: 'password_reset',
    });

    // Send password reset email
    const bentoClient = getBentoClient();
    if (bentoClient) {
      try {
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const resetUrl = `${baseUrl}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

        await bentoClient.sendTransactionalEmail({
          to: email,
          subject: 'Reset your SEOmatic password',
          html_body: `
            <h2>Reset your SEOmatic password</h2>
            <p>We received a request to reset your password. Click the link below to choose a new password:</p>
            <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Reset Password
            </a>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this password reset, you can safely ignore this email.</p>
          `,
          transactional: true,
          fields: {
            email,
            reset_url: resetUrl,
            token,
          },
        });
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
      }
    }

    return successResponse;
  } catch (error: unknown) {
    console.error('Password reset request error:', error);

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
