'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { toast } from 'sonner';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { AuthForm } from '@/components/auth/AuthForm';
import { LoginForm } from '@/components/auth/LoginForm';
import { FeaturedTestimonial } from '@/components/common/FeaturedTestimonial';
import { SocialProof } from '@/components/common/SocialProof';
import { type LoginFormData } from '@/lib/validations/auth';
import { useAuthForm } from '@/hooks/useAuthForm';
import { useSocialAuth } from '@/hooks/useSocialAuth';
import { AuthErrorHandler } from '@/lib/auth/errors';

function LoginPageContent() {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('verified') === 'true') {
      toast.success('Email verified successfully! You can now sign in.');
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
          const result = await signIn('credentials', {
            email: values.email,
            password: values.password,
            rememberMe: values.rememberMe?.toString() || 'false',
            redirect: false,
          });

          if (result?.error) {
            const authError = AuthErrorHandler.handleSignInError(result.error);
            handleAuthError(authError);
          } else if (result?.ok) {
            window.location.href = '/dashboard';
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
            text: 'Forgot your password?',
            href: '/forgot-password',
          },
        ]}
        bottomLink={{
          text: "Don't have an account?",
          linkText: 'Sign up',
          href: '/signup',
        }}
      >
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
