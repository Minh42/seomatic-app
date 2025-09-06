import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { count } from 'drizzle-orm';
import { SocialProof } from './SocialProof';

type SocialProofType = 'pages' | 'users';

interface SocialProofWrapperProps {
  type?: SocialProofType;
  message?: string;
  pageCount?: number;
}

async function getUserCount() {
  try {
    const result = await db.select({ count: count() }).from(users);
    return result[0]?.count || 0;
  } catch (error) {
    console.error('Failed to fetch user count:', error);
    return 0;
  }
}

export async function SocialProofWrapper({
  type = 'pages',
  message,
  pageCount = 15400,
}: SocialProofWrapperProps) {
  const userCount = type === 'users' ? await getUserCount() : undefined;

  return (
    <SocialProof
      type={type}
      message={message}
      pageCount={pageCount}
      userCount={userCount}
    />
  );
}
