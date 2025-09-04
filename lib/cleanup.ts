import { db } from '@/lib/db';
import { verificationTokens } from '@/lib/db/schema';
import { lt } from 'drizzle-orm';

export async function cleanupExpiredTokens() {
  try {
    const result = await db
      .delete(verificationTokens)
      .where(lt(verificationTokens.expires, new Date()));

    console.log(`Cleaned up expired verification tokens`);
    return result;
  } catch (error) {
    console.error('Token cleanup error:', error);
    throw error;
  }
}

export async function scheduleTokenCleanup() {
  if (process.env.NODE_ENV === 'development') {
    return;
  }

  setInterval(
    async () => {
      try {
        await cleanupExpiredTokens();
      } catch (error) {
        console.error('Scheduled token cleanup failed:', error);
      }
    },
    6 * 60 * 60 * 1000
  ); // Every 6 hours
}
