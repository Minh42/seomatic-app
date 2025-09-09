/// <reference types="posthog-js" />

declare global {
  interface Window {
    posthog?: import('posthog-js').PostHog;
  }
}

export interface PostHogUserProperties {
  email?: string | null;
  name?: string | null;
  created_at?: string | Date | null;
}

export interface PostHogGroupProperties {
  name?: string;
  plan?: string;
}

export interface PostHogPageViewProperties {
  $current_url: string;
  referrer?: string;
  source?: string;
  medium?: string;
  campaign?: string;
}
