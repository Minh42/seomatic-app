import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Check if a user has completed onboarding
 */
export async function hasCompletedOnboarding(userId: string): Promise<boolean> {
  try {
    const user = await db
      .select({
        onboardingCompleted: users.onboardingCompleted,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return user[0]?.onboardingCompleted || false;
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return false;
  }
}

/**
 * Redirect paths based on onboarding status
 */
export const ONBOARDING_REDIRECT = {
  // Pages that require onboarding to be completed
  protectedPaths: ['/dashboard', '/projects', '/settings', '/team', '/billing'],

  // Path to redirect to when onboarding is not complete
  onboardingPath: '/onboarding',

  // Paths that don't require onboarding
  publicPaths: [
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/auth',
    '/api',
  ],
};

/**
 * Check if a path requires onboarding completion
 */
export function requiresOnboarding(pathname: string): boolean {
  // Check if it's a public path
  if (ONBOARDING_REDIRECT.publicPaths.some(path => pathname.startsWith(path))) {
    return false;
  }

  // Check if it's the onboarding page itself
  if (pathname === ONBOARDING_REDIRECT.onboardingPath) {
    return false;
  }

  // Check if it's a protected path
  return ONBOARDING_REDIRECT.protectedPaths.some(path =>
    pathname.startsWith(path)
  );
}
