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
  private baseUrl = 'https://app.bentonow.com/api/v1';

  constructor() {
    const publishableKey = process.env.BENTO_PUBLISHABLE_KEY;
    const secretKey = process.env.BENTO_SECRET_KEY;
    const siteUuid = process.env.BENTO_SITE_UUID;

    if (!publishableKey || !secretKey || !siteUuid) {
      throw new Error(
        'Bento publishable key, API key, and Site UUID are required'
      );
    }

    this.publishableKey = publishableKey;
    this.secretKey = secretKey;
    this.siteUuid = siteUuid;
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

  if (!publishableKey || !secretKey || !siteUuid) {
    return null;
  }

  if (!bentoClient) {
    try {
      bentoClient = new BentoClient();
    } catch {
      return null;
    }
  }

  return bentoClient;
}
