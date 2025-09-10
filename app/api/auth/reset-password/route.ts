import { NextRequest, NextResponse } from 'next/server';
import { passwordResetSchema } from '@/lib/validations/auth';
import { AuthService } from '@/lib/services/auth-service';
import { RateLimitService } from '@/lib/services/rate-limit-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate the input
    const validatedData = passwordResetSchema.parse(body);
    const { token, email, password } = validatedData;

    // Get IP for rate limiting
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';

    // Check rate limit for reset attempts (by email AND IP combination)
    const rateLimitResult = await RateLimitService.check(
      'passwordResetAttempt',
      `reset:${email}:${ip}`
    );

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error:
            'Too many password reset attempts. Please wait before trying again.',
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: RateLimitService.formatHeaders(rateLimitResult),
        }
      );
    }

    // Check if this email has too many failed attempts
    const failedCheck = await RateLimitService.trackFailedAttempt(
      'password-reset',
      email,
      10, // Max 10 failed attempts
      15 * 60 * 1000 // 15 minute window
    );

    if (failedCheck.blocked) {
      return NextResponse.json(
        {
          error:
            'Too many failed reset attempts. Please contact support for assistance.',
          attempts: failedCheck.attempts,
        },
        { status: 429 }
      );
    }

    try {
      // Reset password using service
      await AuthService.resetPassword({
        token,
        email,
        newPassword: password,
      });

      // Clear failed attempts on success
      await RateLimitService.clearFailedAttempts('password-reset', email);
    } catch (resetError) {
      // Track this as a failed attempt
      // Note: The failed attempt was already tracked above, so it will count
      throw resetError; // Re-throw to be handled by outer catch
    }

    return NextResponse.json(
      {
        message: 'Password reset successfully.',
      },
      {
        status: 200,
        headers: RateLimitService.formatHeaders(rateLimitResult),
      }
    );
  } catch (error: unknown) {
    console.error('Password reset error:', error);

    // Handle service-level errors
    if (error instanceof Error) {
      if (
        error.message === 'Invalid or expired reset token' ||
        error.message === 'Reset token has expired'
      ) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      if (error.message === 'User not found') {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
    }

    // Handle Zod validation errors
    if (error && typeof error === 'object' && 'errors' in error) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
