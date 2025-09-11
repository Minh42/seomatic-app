import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { SessionProvider } from '@/components/providers/SessionProvider';
import {
  PostHogAuthProvider,
  PostHogPageView,
} from '@/lib/providers/posthog-provider';
import { Toaster } from '@/components/ui/sonner';
import { Suspense } from 'react';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: '--font-plus-jakarta-sans',
  subsets: ['latin'],
  weight: ['200', '300', '400', '500', '600', '700', '800'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SEOmatic - Programmatic SEO Platform',
  description: 'Create, optimize, and publish thousands of SEO pages at scale.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${plusJakartaSans.variable} font-sans antialiased`}>
        <SessionProvider>
          <PostHogAuthProvider>
            <Suspense fallback={null}>
              <PostHogPageView />
            </Suspense>
            {children}
          </PostHogAuthProvider>
        </SessionProvider>
        <Toaster />
        <SpeedInsights />
      </body>
    </html>
  );
}
