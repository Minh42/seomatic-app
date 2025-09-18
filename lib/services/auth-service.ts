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

export class AuthService {
  /**
   * Create a password reset token and trigger email
   */
  static async createPasswordReset({ email }: CreatePasswordResetParams) {
    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (!user) {
      // Return success with hint that helps legitimate users
      return {
        success: true,
        emailSent: false,
        message:
          'If an account exists with this email, a password reset link has been sent. Please check your inbox and spam folder.',
      };
    }

    // Check if user has set a password (OAuth users might not have one)
    if (!user.passwordHash) {
      // User signed up with OAuth, send different email
      await EmailService.sendOAuthPasswordResetEmail({
        email: normalizedEmail,
        provider: user.googleId
          ? 'Google'
          : user.facebookId
            ? 'Facebook'
            : user.linkedinId
              ? 'LinkedIn'
              : user.twitterId
                ? 'Twitter'
                : 'OAuth',
      });

      return {
        success: true,
        emailSent: true,
        message: 'Check your email for instructions on accessing your account.',
      };
    }

    // Delete any existing password reset tokens
    await db
      .delete(verificationTokens)
      .where(
        and(
          eq(verificationTokens.identifier, normalizedEmail),
          eq(verificationTokens.type, 'password_reset')
        )
      );

    // Generate new token
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store token
    await db.insert(verificationTokens).values({
      identifier: normalizedEmail,
      token,
      expires,
      type: 'password_reset',
    });

    // Send password reset email
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/reset-password?token=${token}&email=${encodeURIComponent(normalizedEmail)}`;

    try {
      await EmailService.sendPasswordResetEmail({
        email: normalizedEmail,
        resetUrl,
        expiresAt: expires,
      });

      return {
        success: true,
        emailSent: true,
        token,
        message:
          'Password reset link sent! Check your email inbox. The link will expire in 1 hour.',
      };
    } catch (error) {
      console.error('Failed to send password reset email:', error);

      // Clean up token if email failed
      await db
        .delete(verificationTokens)
        .where(eq(verificationTokens.token, token));

      return {
        success: false,
        emailSent: false,
        message: 'Failed to send email. Please try again later.',
      };
    }
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
}
