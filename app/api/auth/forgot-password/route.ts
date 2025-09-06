import { NextRequest, NextResponse } from 'next/server';
import { passwordResetRequestSchema } from '@/lib/validations/auth';
import { AuthService } from '@/lib/services/auth-service';
import { emailRateLimit, checkRateLimit } from '@/lib/auth/rate-limit';

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

    // Create password reset using service
    await AuthService.createPasswordReset({ email });

    // Always return success to prevent email enumeration
    return NextResponse.json(
      {
        message:
          'If an account exists with this email, a password reset link has been sent.',
      },
      { status: 200 }
    );
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
