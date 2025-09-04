'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AuthLayout } from '@/components/auth/AuthLayout';

export function VerifyRequestClient() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const handleResendEmail = async () => {
    if (!email) {
      setResendMessage('Email address is required.');
      return;
    }

    setIsResending(true);
    setResendMessage(null);

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setResendMessage('Verification email sent successfully!');
      } else if (response.status === 429) {
        setResendMessage(
          data.error || 'Too many requests. Please wait before trying again.'
        );
      } else {
        setResendMessage(data.error || 'Failed to resend email');
      }
    } catch (error) {
      setResendMessage('Failed to resend email. Please try again.');
      console.error('Resend verification error:', error);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthLayout>
      <div className="text-center">
        <div className="flex items-center justify-center mb-6">
          <div className="bg-blue-600 rounded-lg p-2 mr-3">
            <span className="text-white font-bold">S</span>
          </div>
          <span className="text-xl font-semibold">SEOmatic</span>
        </div>

        <div className="mb-8">
          <div className="w-16 h-16 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-4">
            Check your email
          </h1>

          <div className="space-y-4 text-gray-600">
            <p className="text-lg">We&apos;ve sent a verification link to:</p>
            {email && (
              <p className="font-medium text-gray-900 bg-gray-50 px-4 py-2 rounded-md">
                {email}
              </p>
            )}
            <p className="text-sm leading-relaxed max-w-md mx-auto">
              Click the link in the email to verify your account and complete
              your registration. The link will expire in 24 hours.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {resendMessage && (
            <div
              className={`p-3 rounded-md text-sm ${
                resendMessage.includes('success')
                  ? 'bg-green-50 border border-green-200 text-green-600'
                  : 'bg-red-50 border border-red-200 text-red-600'
              }`}
            >
              {resendMessage}
            </div>
          )}

          <p className="text-sm text-gray-500">
            Didn&apos;t receive the email? Check your spam folder or{' '}
            <button
              onClick={handleResendEmail}
              disabled={isResending || !email}
              className="text-blue-600 hover:text-blue-500 font-medium disabled:opacity-50"
            >
              {isResending ? 'Sending...' : 'resend verification email'}
            </button>
          </p>

          <div className="pt-4">
            <a
              href="/login"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← Back to login
            </a>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
