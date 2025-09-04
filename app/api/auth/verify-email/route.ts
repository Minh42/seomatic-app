import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, verificationTokens } from '@/lib/db/schema';
import { cleanupExpiredTokens } from '@/lib/cleanup';
import { eq, and, sql } from 'drizzle-orm';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  if (!token || !email) {
    return NextResponse.redirect(
      new URL('/auth/error?error=Verification', request.url)
    );
  }

  try {
    // Clean up expired tokens periodically
    await cleanupExpiredTokens();

    // Find the verification token
    const [verificationRecord] = await db
      .select()
      .from(verificationTokens)
      .where(
        and(
          eq(verificationTokens.identifier, email),
          eq(verificationTokens.token, token),
          // Handle existing NULL type tokens and new typed tokens
          sql`(type IS NULL OR type = 'email_verification')`
        )
      )
      .limit(1);

    if (!verificationRecord) {
      return NextResponse.redirect(
        new URL('/auth/error?error=Verification', request.url)
      );
    }

    // Check if token has expired
    if (verificationRecord.expires < new Date()) {
      // Delete expired token
      await db
        .delete(verificationTokens)
        .where(
          and(
            eq(verificationTokens.identifier, email),
            eq(verificationTokens.token, token)
          )
        );

      return NextResponse.redirect(
        new URL('/auth/error?error=Verification', request.url)
      );
    }

    // Update user as verified
    await db
      .update(users)
      .set({
        emailVerified: true,
        updatedAt: new Date(),
      })
      .where(eq(users.email, email));

    // Delete the verification token (one-time use)
    await db
      .delete(verificationTokens)
      .where(
        and(
          eq(verificationTokens.identifier, email),
          eq(verificationTokens.token, token)
        )
      );

    // Redirect to login with success message
    return NextResponse.redirect(new URL('/login?verified=true', request.url));
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.redirect(
      new URL('/auth/error?error=Default', request.url)
    );
  }
}
