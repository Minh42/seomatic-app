import { getBentoClient } from '@/lib/email/bento-client';

export interface EmailEventData {
  email: string;
  type: string;
  fields?: Record<string, unknown>;
}

export interface PasswordResetEmailParams {
  email: string;
  resetUrl: string;
  expiresAt: Date;
}

export interface WelcomeEmailParams {
  email: string;
  userId: string;
  createdAt: Date;
}

export interface TeamInvitationEmailParams {
  email: string;
  inviterEmail: string;
  organizationName?: string;
  role: 'viewer' | 'member' | 'admin';
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
  expiresAt: Date;
}

export interface TrackEventParams {
  email: string;
  type: string;
  details?: Record<string, unknown>;
}

export class EmailService {
  /**
   * Send a password reset email
   */
  static async sendPasswordResetEmail({
    email,
    resetUrl,
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
        type: '$password_reset_requested_V2',
        fields: {
          reset_url: resetUrl,
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
   * Send OAuth account notification when user tries to reset password
   */
  static async sendOAuthPasswordResetEmail({
    email,
    provider,
  }: {
    email: string;
    provider: string;
  }): Promise<boolean> {
    const bentoClient = getBentoClient();
    if (!bentoClient) return false;

    try {
      await bentoClient.triggerEvent({
        email,
        type: '$oauth_account_reminder_V2',
        fields: {
          provider,
          login_url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/login`,
          requested_at: new Date().toISOString(),
        },
      });
      return true;
    } catch (error) {
      console.error('Failed to send OAuth account reminder email:', error);
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

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const loginUrl = `${baseUrl}/login`;

    try {
      await bentoClient.triggerEvent({
        email,
        type: '$password_reset_completed_V2',
        fields: {
          reset_at: new Date().toISOString(),
          login_url: loginUrl,
        },
      });
      return true;
    } catch (error) {
      console.error('Failed to send password reset completed email:', error);
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
    inviterEmail,
    organizationName,
    role,
    inviteUrl,
    expiresAt,
  }: TeamInvitationEmailParams): Promise<boolean> {
    const bentoClient = getBentoClient();
    if (!bentoClient) return false;

    // Format role for better display in email
    const roleDisplay = {
      admin: 'an Admin',
      member: 'a Member',
      viewer: 'a Viewer',
    }[role];

    try {
      await bentoClient.triggerEvent({
        email,
        type: '$team_member_invited_V2',
        fields: {
          inviter_email: inviterEmail,
          organization_name: organizationName,
          role: roleDisplay,
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
    organizationName: string,
    role: 'admin' | 'member' | 'viewer'
  ): Promise<boolean> {
    const bentoClient = getBentoClient();
    if (!bentoClient) return false;

    // Format role for better display in email
    const roleDisplay = {
      admin: 'an Admin',
      member: 'a Member',
      viewer: 'a Viewer',
    }[role];

    // Get the base URL for the team settings link
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const teamSettingsUrl = `${baseUrl}/dashboard/settings?tab=team`;

    try {
      await bentoClient.triggerEvent({
        email: inviterEmail,
        type: '$team_invitation_accepted_V2',
        fields: {
          accepted_by_email: acceptedByEmail,
          organization_name: organizationName,
          role: roleDisplay,
          accepted_at: new Date().toISOString(),
          team_settings_url: teamSettingsUrl,
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
    expiresAt,
  }: MagicLinkEmailParams): Promise<{ success: boolean; messageId?: string }> {
    const bentoClient = getBentoClient();
    if (!bentoClient) {
      return { success: false };
    }

    try {
      const result = await bentoClient.triggerEvent({
        email,
        type: '$magic_link_requested_V2',
        fields: {
          magic_link: url,
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
    organizationName?: string,
    removedByEmail?: string
  ): Promise<boolean> {
    const bentoClient = getBentoClient();
    if (!bentoClient) return false;

    try {
      await bentoClient.triggerEvent({
        email: removedEmail,
        type: '$workspace_member_removed_V2',
        fields: {
          organization_name: organizationName,
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
   * Notify organization owner when a member leaves voluntarily
   */
  static async notifyMemberLeft(
    ownerEmail: string,
    memberEmail: string,
    organizationName?: string
  ): Promise<boolean> {
    const bentoClient = getBentoClient();
    if (!bentoClient) return false;

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const teamSettingsUrl = `${baseUrl}/dashboard/settings?tab=team`;

    try {
      await bentoClient.triggerEvent({
        email: ownerEmail,
        type: '$team_member_left_V2',
        fields: {
          member_email: memberEmail,
          organization_name: organizationName,
          left_at: new Date().toISOString(),
          team_settings_url: teamSettingsUrl,
        },
      });
      return true;
    } catch (error) {
      console.error('Failed to notify member left:', error);
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

  /**
   * Track custom events (alias for triggerEvent with clearer naming)
   */
  static async trackEvent({
    email,
    type,
    details,
  }: TrackEventParams): Promise<boolean> {
    return EmailService.triggerEvent({
      email,
      type,
      fields: details,
    });
  }
}
