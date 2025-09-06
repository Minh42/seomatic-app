import { getBentoClient } from '@/lib/email/bento-client';

export interface EmailEventData {
  email: string;
  type: string;
  fields?: Record<string, any>;
}

export interface PasswordResetEmailParams {
  email: string;
  resetUrl: string;
  token: string;
  expiresAt: Date;
}

export interface EmailVerificationParams {
  email: string;
  verificationUrl: string;
  token: string;
  expiresAt: Date;
}

export interface WelcomeEmailParams {
  email: string;
  userId: string;
  createdAt: Date;
}

export interface TeamInvitationEmailParams {
  email: string;
  inviterName?: string;
  workspaceName?: string;
  inviteUrl: string;
  expiresAt: Date;
}

export interface OnboardingCompleteParams {
  email: string;
  userId: string;
  workspaceId: string;
  completedAt: Date;
}

export interface MagicLinkEmailParams {
  email: string;
  url: string;
  token: string;
  expiresAt: Date;
}

export class EmailService {
  /**
   * Send a password reset email
   */
  static async sendPasswordResetEmail({
    email,
    resetUrl,
    token,
    expiresAt,
  }: PasswordResetEmailParams): Promise<boolean> {
    const bentoClient = getBentoClient();
    if (!bentoClient) {
      console.warn('Bento client not configured, skipping email');
      return false;
    }

    try {
      await bentoClient.triggerEvent({
        email,
        type: '$password_reset_requested',
        fields: {
          reset_url: resetUrl,
          token,
          expires_at: expiresAt.toISOString(),
        },
      });
      return true;
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      return false;
    }
  }

  /**
   * Send password reset completion notification
   */
  static async sendPasswordResetCompletedEmail(
    email: string
  ): Promise<boolean> {
    const bentoClient = getBentoClient();
    if (!bentoClient) return false;

    try {
      await bentoClient.triggerEvent({
        email,
        type: '$password_reset_completed',
        fields: {
          reset_at: new Date().toISOString(),
        },
      });
      return true;
    } catch (error) {
      console.error('Failed to send password reset completed email:', error);
      return false;
    }
  }

  /**
   * Send email verification
   */
  static async sendEmailVerification({
    email,
    verificationUrl,
    token,
    expiresAt,
  }: EmailVerificationParams): Promise<boolean> {
    const bentoClient = getBentoClient();
    if (!bentoClient) return false;

    try {
      await bentoClient.triggerEvent({
        email,
        type: '$email_verification_requested',
        fields: {
          verification_url: verificationUrl,
          token,
          expires_at: expiresAt.toISOString(),
        },
      });
      return true;
    } catch (error) {
      console.error('Failed to send email verification:', error);
      return false;
    }
  }

  /**
   * Send email verified notification
   */
  static async sendEmailVerifiedNotification(email: string): Promise<boolean> {
    const bentoClient = getBentoClient();
    if (!bentoClient) return false;

    try {
      await bentoClient.triggerEvent({
        email,
        type: '$email_verified',
        fields: {
          verified_at: new Date().toISOString(),
        },
      });
      return true;
    } catch (error) {
      console.error('Failed to send email verified notification:', error);
      return false;
    }
  }

  /**
   * Send welcome email for new users
   */
  static async sendWelcomeEmail({
    email,
    userId,
    createdAt,
  }: WelcomeEmailParams): Promise<boolean> {
    const bentoClient = getBentoClient();
    if (!bentoClient) return false;

    try {
      await bentoClient.triggerEvent({
        email,
        type: '$user_created',
        fields: {
          user_id: userId,
          created_at: createdAt.toISOString(),
        },
      });
      return true;
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      return false;
    }
  }

  /**
   * Send team invitation email
   */
  static async sendTeamInvitation({
    email,
    inviterName,
    workspaceName,
    inviteUrl,
    expiresAt,
  }: TeamInvitationEmailParams): Promise<boolean> {
    const bentoClient = getBentoClient();
    if (!bentoClient) return false;

    try {
      await bentoClient.triggerEvent({
        email,
        type: '$team_member_invited',
        fields: {
          inviter_name: inviterName,
          workspace_name: workspaceName,
          invite_url: inviteUrl,
          expires_at: expiresAt.toISOString(),
        },
      });
      return true;
    } catch (error) {
      console.error('Failed to send team invitation:', error);
      return false;
    }
  }

  /**
   * Send team invitation accepted notification
   */
  static async sendInvitationAcceptedNotification(
    inviterEmail: string,
    acceptedByEmail: string,
    acceptedByName?: string
  ): Promise<boolean> {
    const bentoClient = getBentoClient();
    if (!bentoClient) return false;

    try {
      await bentoClient.triggerEvent({
        email: inviterEmail,
        type: '$team_invitation_accepted',
        fields: {
          accepted_by_email: acceptedByEmail,
          accepted_by_name: acceptedByName,
          accepted_at: new Date().toISOString(),
        },
      });
      return true;
    } catch (error) {
      console.error('Failed to send invitation accepted notification:', error);
      return false;
    }
  }

  /**
   * Send magic link for passwordless authentication
   */
  static async sendMagicLink({
    email,
    url,
    token,
    expiresAt,
  }: MagicLinkEmailParams): Promise<{ success: boolean; messageId?: string }> {
    const bentoClient = getBentoClient();
    if (!bentoClient) {
      return { success: false };
    }

    try {
      const result = await bentoClient.triggerEvent({
        email,
        type: '$magic_link_requested',
        fields: {
          magic_link: url,
          token,
          expires_at: expiresAt.toISOString(),
        },
      });

      return {
        success: true,
        messageId: result?.messageId,
      };
    } catch (error) {
      console.error('Failed to send magic link:', error);
      return { success: false };
    }
  }

  /**
   * Track onboarding completion
   */
  static async trackOnboardingComplete({
    email,
    userId,
    workspaceId,
    completedAt,
  }: OnboardingCompleteParams): Promise<boolean> {
    const bentoClient = getBentoClient();
    if (!bentoClient) return false;

    try {
      await bentoClient.triggerEvent({
        email,
        type: '$onboarding_completed',
        fields: {
          user_id: userId,
          workspace_id: workspaceId,
          completed_at: completedAt.toISOString(),
        },
      });
      return true;
    } catch (error) {
      console.error('Failed to track onboarding completion:', error);
      return false;
    }
  }

  /**
   * Track workspace member removed
   */
  static async trackMemberRemoved(
    removedEmail: string,
    workspaceName?: string,
    removedByEmail?: string
  ): Promise<boolean> {
    const bentoClient = getBentoClient();
    if (!bentoClient) return false;

    try {
      await bentoClient.triggerEvent({
        email: removedEmail,
        type: '$workspace_member_removed',
        fields: {
          workspace_name: workspaceName,
          removed_by: removedByEmail,
          removed_at: new Date().toISOString(),
        },
      });
      return true;
    } catch (error) {
      console.error('Failed to track member removal:', error);
      return false;
    }
  }

  /**
   * Generic event trigger for custom events
   */
  static async triggerEvent({
    email,
    type,
    fields,
  }: EmailEventData): Promise<boolean> {
    const bentoClient = getBentoClient();
    if (!bentoClient) return false;

    try {
      await bentoClient.triggerEvent({
        email,
        type,
        fields,
      });
      return true;
    } catch (error) {
      console.error(`Failed to trigger event ${type}:`, error);
      return false;
    }
  }
}
