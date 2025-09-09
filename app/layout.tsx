import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { SessionProvider } from '@/components/providers/SessionProvider';
import {
  PostHogAuthProvider,
  PostHogPageView,
} from '@/lib/providers/posthog-provider';
import { Toaster } from '@/components/ui/sonner';
import { Suspense } from 'react';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Platforms Starter Kit',
  description: 'Next.js template for building a multi-tenant SaaS.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} antialiased`}>
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
