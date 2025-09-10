import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Initialize Redis client
const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

// Define rate limit configurations for different endpoints
const rateLimiters = {
  // Auth endpoints - strict limits
  login: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 m'), // 5 attempts per minute
    analytics: true,
    prefix: 'ratelimit:login',
  }),

  signup: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '10 m'), // 10 signups per 10 minutes
    analytics: true,
    prefix: 'ratelimit:signup',
  }),

  passwordReset: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, '15 m'), // 3 password reset requests per 15 minutes
    analytics: true,
    prefix: 'ratelimit:password-reset',
  }),

  passwordResetAttempt: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '15 m'), // 5 reset attempts per 15 minutes
    analytics: true,
    prefix: 'ratelimit:password-reset-attempt',
  }),

  // API endpoints - moderate limits
  api: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests per minute
    analytics: true,
    prefix: 'ratelimit:api',
  }),

  // Workspace operations
  workspaceCreate: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 h'), // 5 workspace creations per hour
    analytics: true,
    prefix: 'ratelimit:workspace-create',
  }),

  // Team invitations
  teamInvite: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '1 h'), // 20 invitations per hour
    analytics: true,
    prefix: 'ratelimit:team-invite',
  }),

  // General purpose - lenient limits
  general: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(300, '1 m'), // 300 requests per minute
    analytics: true,
    prefix: 'ratelimit:general',
  }),
};

export type RateLimitType = keyof typeof rateLimiters;

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: Date;
  retryAfter?: number;
}

export class RateLimitService {
  /**
   * Get identifier for rate limiting (IP address or user ID)
   */
  private static getIdentifier(userId?: string, request?: Request): string {
    if (userId) {
      return `user:${userId}`;
    }

    // Get IP from request headers if available
    if (request) {
      const forwardedFor = request.headers.get('x-forwarded-for');
      const realIp = request.headers.get('x-real-ip');

      if (forwardedFor) {
        return `ip:${forwardedFor.split(',')[0].trim()}`;
      }

      if (realIp) {
        return `ip:${realIp}`;
      }
    }

    // Fallback to a generic identifier (not recommended for production)
    return 'ip:unknown';
  }

  /**
   * Check rate limit for a specific operation
   */
  static async check(
    type: RateLimitType,
    identifier?: string,
    request?: Request
  ): Promise<RateLimitResult> {
    try {
      const rateLimiter = rateLimiters[type];
      const id = identifier || this.getIdentifier(undefined, request);

      const { success, limit, remaining, reset } = await rateLimiter.limit(id);

      const result: RateLimitResult = {
        success,
        limit,
        remaining,
        reset: new Date(reset),
      };

      if (!success) {
        result.retryAfter = Math.floor((reset - Date.now()) / 1000);
      }

      return result;
    } catch (error) {
      console.error('Rate limit check failed:', error);
      // On error, allow the request (fail open)
      return {
        success: true,
        limit: 100,
        remaining: 100,
        reset: new Date(Date.now() + 60000),
      };
    }
  }

  /**
   * Check rate limit with automatic user detection from session
   */
  static async checkWithUser(
    type: RateLimitType,
    userId?: string,
    request?: Request
  ): Promise<RateLimitResult> {
    const identifier = userId
      ? `user:${userId}`
      : this.getIdentifier(undefined, request);
    return this.check(type, identifier, request);
  }

  /**
   * Reset rate limit for a specific identifier (useful for testing or admin operations)
   */
  static async reset(type: RateLimitType, identifier: string): Promise<void> {
    const prefix = `ratelimit:${type}`;
    const key = `${prefix}:${identifier}`;

    try {
      await redis.del(key);
    } catch (error) {
      console.error('Failed to reset rate limit:', error);
    }
  }

  /**
   * Get analytics for a specific rate limiter
   */
  static async getAnalytics(type: RateLimitType) {
    try {
      // Note: Analytics methods depend on your Upstash plan
      // This is a placeholder for when analytics are available
      return {
        type,
        message: 'Analytics available in Upstash dashboard',
      };
    } catch (error) {
      console.error('Failed to get analytics:', error);
      return null;
    }
  }

  /**
   * Track failed attempt for enhanced security
   * Used for sensitive operations like password resets
   */
  static async trackFailedAttempt(
    type: string,
    identifier: string,
    maxAttempts: number = 10,
    windowMs: number = 15 * 60 * 1000 // 15 minutes
  ): Promise<{ blocked: boolean; attempts: number }> {
    const key = `failed:${type}:${identifier}`;

    try {
      // Increment counter
      const attempts = await redis.incr(key);

      // Set expiry on first attempt
      if (attempts === 1) {
        await redis.expire(key, Math.floor(windowMs / 1000));
      }

      return {
        blocked: attempts >= maxAttempts,
        attempts,
      };
    } catch (error) {
      console.error('Failed to track failed attempt:', error);
      return { blocked: false, attempts: 0 };
    }
  }

  /**
   * Clear failed attempts (e.g., after successful operation)
   */
  static async clearFailedAttempts(
    type: string,
    identifier: string
  ): Promise<void> {
    const key = `failed:${type}:${identifier}`;

    try {
      await redis.del(key);
    } catch (error) {
      console.error('Failed to clear failed attempts:', error);
    }
  }

  /**
   * Format rate limit headers for HTTP response
   */
  static formatHeaders(result: RateLimitResult): Record<string, string> {
    const headers: Record<string, string> = {
      'X-RateLimit-Limit': result.limit.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': result.reset.toISOString(),
    };

    if (result.retryAfter) {
      headers['Retry-After'] = result.retryAfter.toString();
    }

    return headers;
  }

  /**
   * Create a rate limit error response
   */
  static createErrorResponse(result: RateLimitResult) {
    return {
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: result.retryAfter,
      reset: result.reset.toISOString(),
    };
  }
}
