'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { CheckoutSessionWithPlan } from '@/lib/services/checkout-service';

interface SignupPageClientProps {
  token?: string;
  checkoutSession: CheckoutSessionWithPlan | null;
  sessionError: string | null;
}

export default function SignupPageClient({
  token,
  checkoutSession,
  sessionError,
}: SignupPageClientProps) {
  const router = useRouter();
  const [fingerprint, setFingerprint] = useState<string | null>(null);

  // Handle session errors - only redirect if already used
  useEffect(() => {
    // Only handle already_used on page load - user already has an account
    if (sessionError === 'already_used' && checkoutSession) {
      toast.success(
        'Your account has already been created! Please sign in to continue.'
      );
      router.push(`/login?email=${encodeURIComponent(checkoutSession.email)}`);
    }

    // Don't show errors for invalid/expired tokens on page load
    // These will be handled when the user tries to submit the form
  }, [sessionError, checkoutSession, router]);

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
        email: checkoutSession?.email || '',
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
              token, // Include token if present
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
        } catch (err) {
          toast.error('An unexpected error occurred. Please try again.');
          console.error('Signup error:', err);
        }
      },
    });

  const handleSocialAuth = useSocialAuth('/onboarding');

  // Determine title and subtitle based on whether we have a checkout session
  const title = checkoutSession
    ? `Complete your ${checkoutSession.plan.name} signup`
    : 'Start your 14-day free trial';

  const subtitle = checkoutSession
    ? `You're just one step away from launching your SEO pages with our ${checkoutSession.plan.name} plan.`
    : 'Launch your first SEO pages today — start scaling your content marketing to drive traffic, leads, and sales.';

  return (
    <AuthLayout testimonialContent={<SignupFeatures />}>
      <AuthForm
        title={title}
        subtitle={subtitle}
        showSocialFirst={!checkoutSession} // Don't show social auth if from checkout
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
