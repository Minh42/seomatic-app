import { PostHog } from 'posthog-node';

let posthogClient: PostHog | null = null;

/**
 * Get PostHog client instance for server-side tracking
 */
function getPostHogClient(): PostHog | null {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return null;
  }

  if (!posthogClient) {
    posthogClient = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
      flushAt: 1, // Flush events immediately in serverless environment
      flushInterval: 0, // Disable interval flushing in serverless
    });
  }

  return posthogClient;
}

export class AnalyticsService {
  /**
   * Track an event on the server side
   */
  static async trackEvent(
    distinctId: string,
    event: string,
    properties?: Record<string, unknown>
  ): Promise<void> {
    const client = getPostHogClient();
    if (!client) return;

    try {
      client.capture({
        distinctId,
        event,
        properties,
      });

      // Flush events immediately in serverless environment
      await client.flush();
    } catch (error) {
      console.error('Error tracking event:', error);
    }
  }

  /**
   * Identify a user with properties
   */
  static async identify(
    distinctId: string,
    properties?: Record<string, unknown>
  ): Promise<void> {
    const client = getPostHogClient();
    if (!client) return;

    try {
      client.identify({
        distinctId,
        properties,
      });

      await client.flush();
    } catch (error) {
      console.error('Error identifying user:', error);
    }
  }

  /**
   * Track onboarding events with consistent properties
   */
  static async trackOnboardingEvent(
    userId: string,
    event: string,
    properties?: Record<string, unknown>
  ): Promise<void> {
    await AnalyticsService.trackEvent(userId, event, {
      ...properties,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track onboarding completion with all required properties for pie charts
   */
  static async trackOnboardingCompleted(
    userId: string,
    data: {
      useCases: string[];
      otherUseCase?: string;
      professionalRole: string;
      otherProfessionalRole?: string;
      companySize: string;
      industry: string;
      otherIndustry?: string;
      cmsIntegration: string;
      otherCms?: string;
      discoverySource: string;
      otherDiscoverySource?: string;
    }
  ): Promise<void> {
    // Process use cases - replace 'other' with actual value
    const processedUseCases = data.useCases.map(useCase => {
      if (useCase === 'other' && data.otherUseCase) {
        return data.otherUseCase;
      }
      return useCase;
    });

    // Process professional role
    const professionalRole =
      data.professionalRole === 'Other' && data.otherProfessionalRole
        ? data.otherProfessionalRole
        : data.professionalRole;

    // Process industry
    const industry =
      data.industry === 'Other' && data.otherIndustry
        ? data.otherIndustry
        : data.industry;

    // Process discovery source
    const discoverySource =
      data.discoverySource === 'Other' && data.otherDiscoverySource
        ? data.otherDiscoverySource
        : data.discoverySource;

    // Process desired CMS (otherCms field)
    const desiredCms = data.otherCms || 'none';

    await AnalyticsService.trackEvent(userId, 'onboarding_completed', {
      use_cases: processedUseCases,
      professional_role: professionalRole,
      company_size: data.companySize,
      industry: industry,
      current_cms: data.cmsIntegration,
      desired_cms: desiredCms,
      discovery_source: discoverySource,
    });
  }
}
