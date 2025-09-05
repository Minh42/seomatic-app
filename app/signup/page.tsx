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
import { AuthErrorHandler } from '@/lib/auth/error-handler';

export default function SignUpPage() {
  const [fingerprint, setFingerprint] = useState<string | null>(null);

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
          // First create the user account
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
        } catch (err) {
          toast.error('An unexpected error occurred. Please try again.');
          console.error('Signup error:', err);
        }
      },
    });

  const handleSocialAuth = useSocialAuth('/onboarding');

  return (
    <AuthLayout testimonialContent={<SignupFeatures />}>
      <AuthForm
        title="Start your 14-day free trial"
        subtitle="Launch your first SEO pages today — start scaling your content marketing to drive traffic, leads, and sales."
        showSocialFirst={true}
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
