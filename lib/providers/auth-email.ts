import type { EmailConfig } from 'next-auth/providers/email';
import { EmailService } from '@/lib/services/email-service';

export function createBentoEmailProvider(): EmailConfig {
  return {
    id: 'email',
    type: 'email',
    name: 'Email',
    server: '',
    from: 'noreply@seomatic.ai',
    maxAge: 24 * 60 * 60,
    allowDangerousEmailAccountLinking: true,
    options: {},
    async sendVerificationRequest({ identifier: email, url }) {
      // Send magic link email
      const result = await EmailService.sendMagicLink({
        email,
        url,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      if (!result.success) {
        throw new Error('Failed to send verification email');
      }
    },
  };
}
