'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/button';

export function VerifyRequestClient() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Cooldown timer
  useEffect(() => {
    if (cooldownSeconds > 0) {
      const timer = setTimeout(() => {
        setCooldownSeconds(cooldownSeconds - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownSeconds]);

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
        setCooldownSeconds(60); // 60 second cooldown
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

          <div className="space-y-4 text-gray-600">
            <p className="text-lg">We&apos;ve sent a verification link to:</p>
            {email && (
              <p className="font-medium text-gray-900 bg-gray-50 px-4 py-2 rounded-md">
                {email}
              </p>
            )}
            <p className="text-sm leading-relaxed max-w-md mx-auto">
              👉 Click the button in the email to verify your account and
              continue. The link will expire in 24 hours.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Didn&apos;t receive the email? Check your spam folder, then:
          </p>

          <Button
            onClick={handleResendEmail}
            disabled={isResending || !email || cooldownSeconds > 0}
            variant="outline"
            className="w-full cursor-pointer"
          >
            {isResending
              ? 'Sending...'
              : cooldownSeconds > 0
                ? `Resend in ${cooldownSeconds}s`
                : 'Resend verification email'}
          </Button>

          {resendMessage && (
            <p
              className={`text-sm text-center ${
                resendMessage.includes('successfully')
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}
            >
              {resendMessage}
            </p>
          )}

          <p className="text-sm text-center text-gray-500">
            Wrong email address?{' '}
            <a
              href="/signup"
              className="text-blue-600 hover:text-blue-500 font-medium"
            >
              Change email
            </a>
          </p>

          <div className="pt-4 border-t border-gray-200">
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
