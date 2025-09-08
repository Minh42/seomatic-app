import { getServerSession } from 'next-auth';
import { getSession } from 'next-auth/react';
import { authOptions } from './config';

/**
 * Server-side utility to get the current session with remember me info
 */
export async function getAuthSession() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return null;
  }

  // Return session with additional metadata
  return {
    ...session,
    rememberMe: (session as any).rememberMe || false,
    expiresAt: (session as any).expires || session.expires,
  };
}

/**
 * Client-side utility to check if session is about to expire
 * @param session - The current session object
 * @param warningMinutes - Number of minutes before expiry to show warning (default: 5)
 */
export function isSessionExpiringSoon(
  session: any,
  warningMinutes = 5
): boolean {
  if (!session?.expires) {
    return false;
  }

  const expiryTime = new Date(session.expires).getTime();
  const now = Date.now();
  const warningThreshold = warningMinutes * 60 * 1000; // Convert to milliseconds

  return expiryTime - now <= warningThreshold;
}

/**
 * Client-side utility to get remaining session time
 * @param session - The current session object
 * @returns Remaining time in seconds, or null if no session
 */
export function getRemainingSessionTime(session: any): number | null {
  if (!session?.expires) {
    return null;
  }

  const expiryTime = new Date(session.expires).getTime();
  const now = Date.now();
  const remainingMs = Math.max(0, expiryTime - now);

  return Math.floor(remainingMs / 1000); // Return in seconds
}

/**
 * Format remaining time for display
 * @param seconds - Remaining time in seconds
 */
export function formatRemainingTime(seconds: number): string {
  if (seconds <= 0) {
    return 'Session expired';
  }

  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);

  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} remaining`;
  }

  if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} remaining`;
  }

  return `${minutes} minute${minutes > 1 ? 's' : ''} remaining`;
}

/**
 * Check if user has remember me enabled
 */
export async function hasRememberMe(): Promise<boolean> {
  const session = await getSession();
  return (session as any)?.rememberMe === true;
}
