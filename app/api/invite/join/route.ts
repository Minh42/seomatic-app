import { NextRequest, NextResponse } from 'next/server';
import { TeamService } from '@/lib/services/team-service';
import { UserService } from '@/lib/services/user-service';
import { z } from 'zod';
import { db } from '@/lib/db';
import { users, verificationTokens } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { randomBytes, createHash } from 'crypto';
import {
  withRateLimit,
  addRateLimitHeaders,
} from '@/lib/middleware/rate-limit';

const joinSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

/**
 * POST /api/invite/join
 * Magic link flow for joining via invitation
 * Creates account if needed, accepts invitation, and returns auth token
 */
export async function POST(req: NextRequest) {
  // Check rate limit using signup limiter (same limits for account creation)
  const rateLimitResponse = await withRateLimit(req, {
    type: 'signup',
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await req.json();
    const validationResult = joinSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }

    const { token } = validationResult.data;

    // Validate the invitation
    const validationResponse = await TeamService.validateInvitation(token);
    if (!validationResponse.valid) {
      return NextResponse.json(
        { error: validationResponse.error },
        { status: 400 }
      );
    }

    // Get full invitation details
    const invitation = validationResponse.invitation;
    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    // Check if user already exists
    let user = await UserService.findByEmail(invitation.email);

    if (!user) {
      // Create new user without password
      const newUser = await db
        .insert(users)
        .values({
          email: invitation.email.toLowerCase(),
          emailVerified: new Date(), // Pre-verified through invitation
          signupMethod: 'team_invitation',
          isActive: true,
          onboardingCompleted: true, // Skip onboarding for invited users
        })
        .returning();

      user = newUser[0];
    } else {
      // Existing user - ensure they skip onboarding since they're joining a workspace
      await db
        .update(users)
        .set({ onboardingCompleted: true })
        .where(eq(users.id, user.id));
    }

    // Accept the invitation
    try {
      const result = await TeamService.acceptInvitationWithWorkspace({
        token,
        userId: user.id,
      });

      // Create a NextAuth verification token for magic link
      const plainToken = randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      // Hash the token the same way NextAuth does
      const hashedToken = createHash('sha256')
        .update(`${plainToken}${process.env.NEXTAUTH_SECRET || ''}`)
        .digest('hex');

      // Store the hashed token in database (NextAuth expects hashed tokens)
      await db.insert(verificationTokens).values({
        identifier: user.email!,
        token: hashedToken,
        expires,
      });

      // Create the magic link URL with the plain token and callback URL
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const callbackUrl = encodeURIComponent('/dashboard');
      const magicLinkUrl = `${baseUrl}/api/auth/callback/email?token=${plainToken}&email=${encodeURIComponent(user.email!)}&callbackUrl=${callbackUrl}`;

      const response = NextResponse.json({
        success: true,
        magicLinkUrl,
        user: {
          id: user.id,
          email: user.email,
          isNewUser: !user.passwordHash,
        },
        workspace: result.workspace,
        redirectUrl: '/dashboard',
      });
      return addRateLimitHeaders(response, req);
    } catch (acceptError) {
      // Handle specific acceptance errors
      if (
        acceptError instanceof Error &&
        acceptError.message === 'You are already a member of this workspace'
      ) {
        // Still create magic link for existing member
        const plainToken = randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 5 * 60 * 1000);

        // Hash the token the same way NextAuth does
        const hashedToken = createHash('sha256')
          .update(`${plainToken}${process.env.NEXTAUTH_SECRET || ''}`)
          .digest('hex');

        await db.insert(verificationTokens).values({
          identifier: user.email!,
          token: hashedToken,
          expires,
        });

        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const callbackUrl = encodeURIComponent('/dashboard');
        const magicLinkUrl = `${baseUrl}/api/auth/callback/email?token=${plainToken}&email=${encodeURIComponent(user.email!)}&callbackUrl=${callbackUrl}`;

        const response = NextResponse.json({
          success: true,
          magicLinkUrl,
          user: {
            id: user.id,
            email: user.email,
            isNewUser: false,
          },
          alreadyMember: true,
          redirectUrl: '/dashboard',
        });
        return addRateLimitHeaders(response, req);
      }

      throw acceptError;
    }
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { error: 'Failed to join via invitation' },
      { status: 500 }
    );
  }
}
