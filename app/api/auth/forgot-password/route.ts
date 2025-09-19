import { NextRequest, NextResponse } from 'next/server';
import { passwordResetRequestSchema } from '@/lib/validations/auth';
import { AuthService } from '@/lib/services/auth-service';
import {
  withRateLimit,
  addRateLimitHeaders,
} from '@/lib/middleware/rate-limit';

export async function POST(request: NextRequest) {
  // Check rate limit
  const rateLimitResponse = await withRateLimit(request, {
    type: 'passwordReset',
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await request.json();

    // Validate the input
    const validatedData = passwordResetRequestSchema.parse(body);
    const { email } = validatedData;

    // Create password reset using service
    const result = await AuthService.createPasswordReset({ email });

    // Return appropriate message based on result
    const response = NextResponse.json(
      {
        success: result.success,
        message: result.message,
        // Include additional hints for legitimate users
        hints: result.emailSent
          ? [
              "Check your spam/junk folder if you don't see the email",
              'The link will expire in 1 hour',
              'You can request a new link if this one expires',
            ]
          : [
              'Double-check the email address for typos',
              "Make sure you're using the email associated with your account",
              'If you signed up with Google/Facebook/etc, try signing in with that provider',
            ],
      },
      { status: 200 }
    );

    return addRateLimitHeaders(response, request);
  } catch (error: unknown) {
    // Handle Zod validation errors
    if (error && typeof error === 'object' && 'errors' in error) {
      return NextResponse.json(
        {
          error: 'Invalid email address',
          hints: ['Please enter a valid email address'],
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Unable to process request. Please try again later.',
        hints: ['If the problem persists, contact support'],
      },
      { status: 500 }
    );
  }
}
