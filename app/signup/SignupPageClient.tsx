'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
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
  stripeError?: boolean;
}

export default function SignupPageClient({
  token,
  checkoutSession,
  stripeError,
}: SignupPageClientProps) {
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const searchParams = useSearchParams();

  // Check URL params for OAuth errors using Next.js hook
  useEffect(() => {
    const urlError = searchParams.get('error');

    if (urlError) {
      // Small timeout to ensure component is fully mounted
      setTimeout(() => {
        if (urlError === 'no-payment-info') {
          toast.error(
            "We couldn't find your payment information. Please check your email for the signup link."
          );
        } else if (urlError === 'already_used') {
          toast.error(
            'This signup link has already been used. Please log in to your account.'
          );
        } else if (urlError === 'invalid') {
          toast.error(
            'This signup link is invalid or has expired. Please check your email for the correct link.'
          );
        } else if (urlError === 'no-subscription') {
          toast.error(
            'You need an active subscription. Please complete your purchase first.'
          );
        }
      }, 100);
    }
  }, [searchParams]);

  // Handle Stripe errors
  useEffect(() => {
    // Show Stripe error if OAuth callback failed to set up subscription
    if (stripeError) {
      toast.error('Failed to retrieve subscription details from Stripe');
    }
  }, [stripeError]);

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

  // Always use oauth-callback for signup to ensure token validation
  const handleSocialAuth = useSocialAuth('/api/auth/oauth-callback', token);

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
        showSocialFirst={true} // Always show OAuth options first
        onSocialAuth={handleSocialAuth}
        error={null}
        isLoading={isLoading}
        bottomLink={{
          text: 'Already have an account?',
          linkText: 'Login Now',
          href: token ? `/login?token=${token}` : '/login',
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
