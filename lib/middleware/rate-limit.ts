import { NextRequest, NextResponse } from 'next/server';
import {
  RateLimitService,
  RateLimitType,
} from '@/lib/services/rate-limit-service';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';

export interface RateLimitOptions {
  type: RateLimitType;
  useUserId?: boolean; // Whether to use user ID if available
  skipIfAuthenticated?: boolean; // Skip rate limiting for authenticated users
  customIdentifier?: string; // Custom identifier to use
}

/**
 * Rate limit middleware for API routes
 *
 * Usage:
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const rateLimitResult = await withRateLimit(request, { type: 'login' });
 *   if (rateLimitResult) return rateLimitResult;
 *
 *   // Your API logic here
 * }
 * ```
 */
export async function withRateLimit(
  request: NextRequest,
  options: RateLimitOptions
): Promise<NextResponse | null> {
  try {
    const {
      type,
      useUserId = false,
      skipIfAuthenticated = false,
      customIdentifier,
    } = options;

    // Get user session if needed
    let userId: string | undefined;
    if (useUserId || skipIfAuthenticated) {
      const session = await getServerSession(authOptions);
      userId = session?.user?.id;

      // Skip rate limiting for authenticated users if requested
      if (skipIfAuthenticated && userId) {
        return null;
      }
    }

    // Check rate limit
    const result = await RateLimitService.check(
      type,
      customIdentifier || (userId ? `user:${userId}` : undefined)
    );

    // If rate limit exceeded, return error response
    if (!result.success) {
      return NextResponse.json(RateLimitService.createErrorResponse(result), {
        status: 429,
        headers: RateLimitService.formatHeaders(result),
      });
    }

    // Add rate limit headers to successful responses
    // Note: You'll need to add these headers to your actual response
    // Store them in the request for later use
    (
      request as NextRequest & { rateLimitHeaders?: Record<string, string> }
    ).rateLimitHeaders = RateLimitService.formatHeaders(result);

    return null; // Continue with request
  } catch {
    // On error, allow the request (fail open)
    return null;
  }
}

/**
 * Helper to add rate limit headers to a response
 *
 * Usage:
 * ```typescript
 * const response = NextResponse.json({ data });
 * return addRateLimitHeaders(response, request);
 * ```
 */
export function addRateLimitHeaders(
  response: NextResponse,
  request: NextRequest
): NextResponse {
  const headers = (
    request as NextRequest & { rateLimitHeaders?: Record<string, string> }
  ).rateLimitHeaders;
  if (headers) {
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value as string);
    });
  }
  return response;
}

/**
 * Simpler rate limit check that returns boolean
 * Useful for conditional logic without immediate response
 */
export async function checkRateLimit(
  type: RateLimitType,
  identifier?: string
): Promise<boolean> {
  const result = await RateLimitService.check(type, identifier);
  return result.success;
}
