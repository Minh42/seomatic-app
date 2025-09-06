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
    options: {},
    async sendVerificationRequest({ identifier: email, url, token }) {
      // Send magic link email
      const result = await EmailService.sendMagicLink({
        email,
        url,
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      if (!result.success) {
        throw new Error('Failed to send verification email');
      }
    },
  };
}
