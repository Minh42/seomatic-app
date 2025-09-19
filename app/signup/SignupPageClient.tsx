'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { toast } from 'sonner';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { AuthForm } from '@/components/auth/AuthForm';
import { SignupForm } from '@/components/auth/SignupForm';
import { SignupFeatures } from '@/components/auth/SignupFeatures';
import { type SignupFormData } from '@/lib/validations/auth';
import { useAuthForm } from '@/hooks/useAuthForm';
import { useSocialAuth } from '@/hooks/useSocialAuth';
import { AuthErrorHandler } from '@/lib/errors/auth-errors';

interface SignupPageClientProps {
  error?: string;
}

export default function SignupPageClient({ error }: SignupPageClientProps) {
  const [fingerprint, setFingerprint] = useState<string | null>(null);

  // Check URL params for errors
  useEffect(() => {
    if (error === 'no-subscription') {
      toast.error('Unable to create account. Please try again later.');
    }
  }, [error]);

  // Initialize fingerprinting
  useEffect(() => {
    const getFingerprint = async () => {
      try {
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        setFingerprint(result.visitorId);
      } catch (error) {
        console.error('Failed to get fingerprint:', error);
      }
    };

    getFingerprint();
  }, []);

  const { form, isLoading, emailError, passwordError, handleAuthError } =
    useAuthForm<SignupFormData>({
      defaultValues: {
        email: '',
        password: '',
        fingerprint: '',
      },
      onSubmit: async values => {
        try {
          // Create the user account with optional token
          const signupResponse = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: values.email,
              password: values.password,
              fingerprint,
            }),
          });

          const signupData = await signupResponse.json();

          if (!signupResponse.ok) {
            const authError = AuthErrorHandler.handleSignUpError(
              signupData.error,
              signupResponse.status
            );
            handleAuthError(authError);
            return;
          }

          // Account created successfully - sign in automatically
          const result = await signIn('credentials', {
            email: values.email,
            password: values.password,
            redirect: false,
          });

          if (result?.error) {
            // If auto sign-in fails, redirect to login with a success message
            toast.success('Account created! Please sign in to continue.');
            window.location.href = '/login?newAccount=true';
          } else if (result?.ok) {
            // Successfully signed in - redirect to onboarding
            window.location.href = '/onboarding';
          }
        } catch {
          toast.error('An unexpected error occurred. Please try again.');
        }
      },
    });

  // Use simple social auth without token
  const handleSocialAuth = useSocialAuth();

  const title = 'Start your 14-day free trial';
  const subtitle =
    'Launch your first SEO pages today — start scaling your content marketing to drive traffic, leads, and sales.';

  return (
    <AuthLayout testimonialContent={<SignupFeatures />}>
      <AuthForm
        title={title}
        subtitle={subtitle}
        showSocialFirst={true} // Always show OAuth options first
        onSocialAuth={handleSocialAuth}
        error={null}
        isLoading={isLoading}
        bottomLink={{
          text: 'Already have an account?',
          linkText: 'Login Now',
          href: '/login',
        }}
      >
        <SignupForm
          form={form}
          isLoading={isLoading}
          emailError={emailError}
          passwordError={passwordError}
          onSubmit={e => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        />
      </AuthForm>
    </AuthLayout>
  );
}
