import type { EmailConfig } from 'next-auth/providers/email';
import { getBentoClient } from '@/lib/email/bento-client';

export function createBentoEmailProvider(): EmailConfig {
  return {
    id: 'email',
    type: 'email',
    name: 'Email',
    server: '',
    from: process.env.BENTO_FROM_EMAIL || 'noreply@seomatic.ai',
    maxAge: 24 * 60 * 60,
    options: {},
    async sendVerificationRequest({ identifier: email, url, token }) {
      const bentoClient = getBentoClient();

      if (!bentoClient) {
        throw new Error('Bento email client not configured');
      }

      const result = await bentoClient.sendTransactionalEmail({
        to: email,
        subject: '', // Template will define subject
        html_body: '', // Template will define content
        transactional: true,
        fields: {
          email: email,
          verification_url: url,
          token: token,
        },
      });

      if (!result.success) {
        throw new Error(`Failed to send verification email: ${result.error}`);
      }
    },
  };
}
