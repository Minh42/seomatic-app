'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { toast } from 'sonner';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { AuthForm } from '@/components/auth/AuthForm';
import { LoginForm } from '@/components/auth/LoginForm';
import { MagicLinkForm } from '@/components/auth/MagicLinkForm';
import { FeaturedTestimonial } from '@/components/common/FeaturedTestimonial';
import { SocialProof } from '@/components/common/SocialProof';
import { type LoginFormData } from '@/lib/validations/auth';
import { useAuthForm } from '@/hooks/useAuthForm';
import { useSocialAuth } from '@/hooks/useSocialAuth';
import { AuthErrorHandler } from '@/lib/errors/auth-errors';

function LoginPageContent() {
  const searchParams = useSearchParams();
  const [useMagicLink, setUseMagicLink] = useState(false);

  // Get token from URL if present (from checkout flow)
  const token = searchParams.get('token');

  // Handle success messages from signup or other redirects
  useEffect(() => {
    const newAccount = searchParams.get('newAccount');
    const message = searchParams.get('message');
    const error = searchParams.get('error');

    if (newAccount === 'true') {
      toast.success(
        'Account created successfully! Please sign in to continue.'
      );
    } else if (message) {
      toast.info(decodeURIComponent(message));
    } else if (error) {
      // Handle OAuth errors
      const errorMessage = AuthErrorHandler.getErrorMessage(error);
      toast.error(errorMessage);
    }
  }, [searchParams]);

  const { form, isLoading, emailError, passwordError, handleAuthError } =
    useAuthForm<LoginFormData>({
      defaultValues: {
        email: '',
        password: '',
        rememberMe: false,
      },
      onSubmit: async values => {
        try {
          if (useMagicLink) {
            // Handle magic link
            const result = await signIn('email', {
              email: values.email,
              redirect: false,
            });

            if (result?.error) {
              const authError = AuthErrorHandler.handleSignInError(
                result.error
              );
              handleAuthError(authError);
            } else if (result?.ok) {
              toast.success('Magic link sent! Check your email to sign in.');
            }
          } else {
            // Handle password login
            const result = await signIn('credentials', {
              email: values.email,
              password: values.password,
              rememberMe: values.rememberMe?.toString() || 'false',
              redirect: false,
            });

            if (result?.error) {
              const authError = AuthErrorHandler.handleSignInError(
                result.error
              );
              handleAuthError(authError);
            } else if (result?.ok) {
              window.location.href = '/dashboard';
            }
          }
        } catch (err) {
          toast.error('An unexpected error occurred. Please try again.');
          console.error('Login error:', err);
        }
      },
    });

  const handleSocialAuth = useSocialAuth('/dashboard');

  return (
    <AuthLayout
      testimonialContent={
        <>
          <FeaturedTestimonial />
          <SocialProof type="pages" />
        </>
      }
    >
      <AuthForm
        title="Welcome back"
        subtitle="Sign in to your account to continue scaling SEO pages fast."
        showSocialFirst={true}
        onSocialAuth={handleSocialAuth}
        error={null}
        isLoading={isLoading}
        extraLinks={[
          {
            text: useMagicLink
              ? 'Use password instead'
              : 'Use magic link instead',
            href: '#',
            onClick: (e: React.MouseEvent) => {
              e.preventDefault();
              setUseMagicLink(!useMagicLink);
            },
          },
          {
            text: 'Forgot your password?',
            href: token
              ? `/forgot-password?token=${token}`
              : '/forgot-password',
          },
        ].filter(
          link => !useMagicLink || link.text !== 'Forgot your password?'
        )}
        bottomLink={{
          text: "Don't have an account?",
          linkText: 'Sign up',
          href: token ? `/signup?token=${token}` : '/signup',
        }}
      >
        {useMagicLink ? (
          <MagicLinkForm
            form={form}
            isLoading={isLoading}
            emailError={emailError}
            onSubmit={e => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
          />
        ) : (
          <LoginForm
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
        )}
      </AuthForm>
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-lg">Loading...</div>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
