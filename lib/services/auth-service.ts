import { db } from '@/lib/db';
import { users, verificationTokens } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { EmailService } from '@/lib/services/email-service';

export interface CreatePasswordResetParams {
  email: string;
}

export interface ResetPasswordParams {
  token: string;
  email: string;
  newPassword: string;
}

export interface VerifyEmailParams {
  token: string;
  email: string;
}

export class AuthService {
  /**
   * Create a password reset token and trigger email
   */
  static async createPasswordReset({ email }: CreatePasswordResetParams) {
    // Check if user exists
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      // Return success anyway to prevent email enumeration
      return { success: true };
    }

    // Delete any existing password reset tokens
    await db
      .delete(verificationTokens)
      .where(
        and(
          eq(verificationTokens.identifier, email),
          eq(verificationTokens.type, 'password_reset')
        )
      );

    // Generate new token
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store token
    await db.insert(verificationTokens).values({
      identifier: email,
      token,
      expires,
      type: 'password_reset',
    });

    // Send password reset email
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

    await EmailService.sendPasswordResetEmail({
      email,
      resetUrl,
      token,
      expiresAt: expires,
    });

    return { success: true, token };
  }

  /**
   * Reset password using token
   */
  static async resetPassword({
    token,
    email,
    newPassword,
  }: ResetPasswordParams) {
    // Verify token
    const [validToken] = await db
      .select()
      .from(verificationTokens)
      .where(
        and(
          eq(verificationTokens.identifier, email),
          eq(verificationTokens.token, token),
          eq(verificationTokens.type, 'password_reset')
        )
      )
      .limit(1);

    if (!validToken) {
      throw new Error('Invalid or expired reset token');
    }

    // Check if token is expired
    if (validToken.expires < new Date()) {
      // Clean up expired token
      await db
        .delete(verificationTokens)
        .where(eq(verificationTokens.token, token));
      throw new Error('Reset token has expired');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user password
    const [updated] = await db
      .update(users)
      .set({
        passwordHash: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.email, email))
      .returning();

    if (!updated) {
      throw new Error('User not found');
    }

    // Delete used token
    await db
      .delete(verificationTokens)
      .where(eq(verificationTokens.token, token));

    // Clean up any other expired password reset tokens for this user
    await this.cleanupExpiredPasswordResetTokens(email);

    // Track password reset completion
    await EmailService.sendPasswordResetCompletedEmail(email);

    return { success: true };
  }

  /**
   * Clean up expired password reset tokens for a specific user
   */
  private static async cleanupExpiredPasswordResetTokens(email: string) {
    try {
      await db
        .delete(verificationTokens)
        .where(
          and(
            eq(verificationTokens.identifier, email),
            eq(verificationTokens.type, 'password_reset')
          )
        );
    } catch (error) {
      // Log but don't throw - this is a cleanup operation
      console.error('Failed to cleanup expired tokens:', error);
    }
  }

  /**
   * Create email verification token
   */
  static async createEmailVerification(email: string) {
    // Delete any existing verification tokens
    await db
      .delete(verificationTokens)
      .where(
        and(
          eq(verificationTokens.identifier, email),
          eq(verificationTokens.type, 'email')
        )
      );

    // Generate new token
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store token
    await db.insert(verificationTokens).values({
      identifier: email,
      token,
      expires,
      type: 'email',
    });

    // Send verification email
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const verifyUrl = `${baseUrl}/verify-email?token=${token}&email=${encodeURIComponent(email)}`;

    await EmailService.sendEmailVerification({
      email,
      verificationUrl: verifyUrl,
      token,
      expiresAt: expires,
    });

    return { success: true, token };
  }

  /**
   * Verify email using token
   */
  static async verifyEmail({ token, email }: VerifyEmailParams) {
    // Verify token
    const [validToken] = await db
      .select()
      .from(verificationTokens)
      .where(
        and(
          eq(verificationTokens.identifier, email),
          eq(verificationTokens.token, token),
          eq(verificationTokens.type, 'email')
        )
      )
      .limit(1);

    if (!validToken) {
      throw new Error('Invalid verification token');
    }

    // Check if token is expired
    if (validToken.expires < new Date()) {
      // Clean up expired token
      await db
        .delete(verificationTokens)
        .where(eq(verificationTokens.token, token));
      throw new Error('Verification token has expired');
    }

    // Mark email as verified
    const [updated] = await db
      .update(users)
      .set({
        emailVerified: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.email, email))
      .returning();

    if (!updated) {
      throw new Error('User not found');
    }

    // Delete used token
    await db
      .delete(verificationTokens)
      .where(eq(verificationTokens.token, token));

    // Track email verification
    await EmailService.sendEmailVerifiedNotification(email);

    return { success: true };
  }
}
