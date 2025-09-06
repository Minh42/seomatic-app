import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { count } from 'drizzle-orm';

export async function GET() {
  try {
    const result = await db.select({ count: count() }).from(users);
    const userCount = result[0]?.count || 0;

    // Cache for 1 hour to reduce database load
    return NextResponse.json(
      { count: userCount },
      {
        headers: {
          'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching user count:', error);
    return NextResponse.json({ count: 0 }, { status: 500 });
  }
}
