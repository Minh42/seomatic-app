import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

// Simple email-based rate limiting
export const emailRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1h'), // 5 requests per hour
  analytics: true,
});

export const loginRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '15m'), // 5 attempts per 15 minutes
  analytics: true,
});

export const resendRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '10m'), // 3 resends per 10 minutes
  analytics: true,
});

export async function checkRateLimit(
  rateLimit: Ratelimit,
  identifier: string
): Promise<{ success: boolean; remaining?: number; reset?: number }> {
  try {
    const result = await rateLimit.limit(identifier);

    if (!result.success) {
      return {
        success: false,
        remaining: result.remaining,
        reset: result.reset,
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // If Redis fails, allow the request
    return { success: true };
  }
}
