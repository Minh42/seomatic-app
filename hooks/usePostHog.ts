'use client';

import { usePostHog as usePostHogOriginal } from 'posthog-js/react';

export function usePostHog() {
  const posthog = usePostHogOriginal();

  const trackEvent = (
    eventName: string,
    properties?: Record<string, unknown>
  ) => {
    if (posthog) {
      posthog.capture(eventName, properties);
    }
  };

  const trackPageView = (url?: string) => {
    if (posthog) {
      posthog.capture('$pageview', {
        $current_url: url || window.location.href,
      });
    }
  };

  const identifyUser = (userId: string, traits?: Record<string, unknown>) => {
    if (posthog) {
      posthog.identify(userId, traits);
    }
  };

  const setUserProperties = (properties: Record<string, unknown>) => {
    if (posthog) {
      posthog.people.set(properties);
    }
  };

  const resetUser = () => {
    if (posthog) {
      posthog.reset();
    }
  };

  const setGroup = (
    groupType: string,
    groupId: string,
    groupProperties?: Record<string, unknown>
  ) => {
    if (posthog) {
      posthog.group(groupType, groupId, groupProperties);
    }
  };

  return {
    posthog,
    trackEvent,
    trackPageView,
    identifyUser,
    setUserProperties,
    resetUser,
    setGroup,
  };
}
