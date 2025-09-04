interface BentoEmailData {
  to: string;
  from_name?: string;
  from_email?: string;
  subject: string;
  html_body: string;
  text_body?: string;
  transactional?: boolean;
  fields?: Record<string, unknown>;
}

interface BentoEventData {
  email: string;
  type: string;
  fields?: Record<string, unknown>;
}

interface BentoResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

export class BentoClient {
  private publishableKey: string;
  private secretKey: string;
  private siteUuid: string;
  private fromEmail: string;
  private baseUrl = 'https://app.bentonow.com/api/v1';

  constructor() {
    const publishableKey = process.env.BENTO_PUBLISHABLE_KEY;
    const secretKey = process.env.BENTO_SECRET_KEY;
    const siteUuid = process.env.BENTO_SITE_UUID;
    const fromEmail = process.env.BENTO_FROM_EMAIL;

    if (!publishableKey || !secretKey || !siteUuid || !fromEmail) {
      throw new Error(
        'Bento publishable key, API key, Site UUID, and from email are required'
      );
    }

    this.publishableKey = publishableKey;
    this.secretKey = secretKey;
    this.siteUuid = siteUuid;
    this.fromEmail = fromEmail;
  }

  async sendTransactionalEmail(
    emailData: BentoEmailData
  ): Promise<BentoResponse> {
    try {
      const auth = Buffer.from(
        `${this.publishableKey}:${this.secretKey}`
      ).toString('base64');

      const payload = {
        emails: [
          {
            to: emailData.to,
            from: emailData.from_email || this.fromEmail,
            subject: emailData.subject,
            html_body: emailData.html_body,
            transactional: emailData.transactional !== false,
            personalizations: emailData.fields || {},
          },
        ],
      };

      const response = await fetch(
        `${this.baseUrl}/batch/emails?site_uuid=${this.siteUuid}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Basic ${auth}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Bento API error:', errorText);
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Error sending email via Bento:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  async triggerEvent(eventData: BentoEventData): Promise<BentoResponse> {
    try {
      const auth = Buffer.from(
        `${this.publishableKey}:${this.secretKey}`
      ).toString('base64');

      const payload = {
        events: [
          {
            email: eventData.email,
            type: eventData.type,
            fields: eventData.fields || {},
          },
        ],
      };

      const response = await fetch(
        `${this.baseUrl}/batch/events?site_uuid=${this.siteUuid}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Basic ${auth}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Bento API error:', errorText);
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Error triggering Bento event:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}

let bentoClient: BentoClient | null = null;

export function getBentoClient(): BentoClient | null {
  const publishableKey = process.env.BENTO_PUBLISHABLE_KEY;
  const secretKey = process.env.BENTO_SECRET_KEY;
  const siteUuid = process.env.BENTO_SITE_UUID;
  const fromEmail = process.env.BENTO_FROM_EMAIL;

  if (!publishableKey || !secretKey || !siteUuid || !fromEmail) {
    return null;
  }

  if (!bentoClient) {
    try {
      bentoClient = new BentoClient();
    } catch (error) {
      console.error('Failed to initialize Bento client:', error);
      return null;
    }
  }

  return bentoClient;
}
