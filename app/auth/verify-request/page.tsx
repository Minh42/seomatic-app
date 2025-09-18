'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { AuthLayout } from '@/components/auth/AuthLayout';

export default function VerifyRequestPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');

  useEffect(() => {
    // Prevent users from navigating back to this page after verification
    if (window.history.length > 1) {
      window.history.replaceState(null, '', window.location.href);
    }
  }, []);

  return (
    <AuthLayout>
      <div className="text-center">
        <div className="flex items-center justify-center mb-6">
          <Image
            src="/logos/seomatic.svg"
            alt="SEOmatic"
            width={140}
            height={40}
            className="h-8 w-auto"
            priority
          />
          <span className="ml-3 text-xl font-semibold">SEOmatic</span>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-4">
            Check your email
          </h1>
          <p className="text-gray-600 max-w-md mx-auto">
            We&apos;ve sent a magic link to sign in to your account
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <p className="font-medium text-gray-900 break-all">
            {email || 'your email address'}
          </p>
        </div>

        <div className="space-y-3 text-sm text-gray-600">
          <p>Click the link in your email to continue.</p>
          <p>
            If you don&apos;t see the email, check your spam folder or{' '}
            <a
              href="/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              request a new link
            </a>
            .
          </p>
        </div>

        <p className="text-xs text-gray-500 mt-6">
          The magic link will expire in 24 hours
        </p>
      </div>
    </AuthLayout>
  );
}
