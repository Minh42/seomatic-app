'use client';

import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { AuthLayout } from '@/components/auth/AuthLayout';

const errorMessages = {
  Configuration: 'There is a problem with the server configuration.',
  AccessDenied: 'You do not have permission to sign in.',
  Verification: 'The verification token has expired or has already been used.',
  Default: 'An error occurred during authentication.',
};

export function AuthErrorClient() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error') as keyof typeof errorMessages;

  const errorMessage = errorMessages[error] || errorMessages.Default;

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
          <div className="w-16 h-16 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-4">
            Authentication Error
          </h1>

          <p className="text-gray-600 max-w-md mx-auto mb-6">{errorMessage}</p>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="/login"
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Try Again
            </a>
            <a
              href="/signup"
              className="border border-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-50 transition-colors"
            >
              Create Account
            </a>
          </div>

          <p className="text-sm text-gray-500 pt-4">
            If the problem persists, please contact support.
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
