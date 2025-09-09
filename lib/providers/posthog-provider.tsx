'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import { usePathname, useSearchParams } from 'next/navigation';

// PostHog initialization
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
    loaded: posthog => {
      if (process.env.NODE_ENV === 'development') posthog.debug();
    },
    capture_pageview: false, // We'll manually capture pageviews for better control
    capture_pageleave: true,
    autocapture: true,
    persistence: 'localStorage+cookie',
    session_recording: {
      maskAllInputs: true, // Privacy: mask sensitive input fields
      maskTextSelector: '[data-sensitive]', // Custom selector for sensitive text
    },
  });
}

export function PostHogPageView(): JSX.Element | null {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname && posthog) {
      let url = window.origin + pathname;
      if (searchParams && searchParams.toString()) {
        url = url + '?' + searchParams.toString();
      }
      posthog.capture('$pageview', {
        $current_url: url,
      });
    }
  }, [pathname, searchParams]);

  return null;
}

export function PostHogAuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'loading') return;

    if (session?.user) {
      // Identify the user
      posthog.identify(session.user.id, {
        email: session.user.email,
        name: session.user.name,
        created_at: session.user.createdAt,
      });

      // Set user properties
      if (session.user.workspaceId) {
        posthog.group('workspace', session.user.workspaceId, {
          name: session.user.workspaceName,
          plan: session.user.plan,
        });
      }
    } else {
      // Reset when user logs out
      posthog.reset();
    }
  }, [session, status]);

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
