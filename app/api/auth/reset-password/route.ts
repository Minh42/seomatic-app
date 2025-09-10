import { NextRequest, NextResponse } from 'next/server';
import { passwordResetSchema } from '@/lib/validations/auth';
import { AuthService } from '@/lib/services/auth-service';
import {
  withRateLimit,
  addRateLimitHeaders,
} from '@/lib/middleware/rate-limit';

export async function POST(request: NextRequest) {
  // Check rate limit
  const rateLimitResponse = await withRateLimit(request, {
    type: 'passwordResetAttempt',
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await request.json();

    // Validate the input
    const validatedData = passwordResetSchema.parse(body);
    const { token, email, password } = validatedData;

    // Reset password using service
    await AuthService.resetPassword({
      token,
      email,
      newPassword: password,
    });

    const response = NextResponse.json(
      {
        message: 'Password reset successfully.',
      },
      { status: 200 }
    );

    return addRateLimitHeaders(response, request);
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
