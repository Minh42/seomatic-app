'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm } from '@tanstack/react-form';
import { signIn } from 'next-auth/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { AuthForm } from '@/components/auth/AuthForm';
import { loginSchema, type LoginFormData } from '@/lib/validations/auth';

export function LoginPageClient() {
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('verified') === 'true') {
      toast.success('Email verified successfully! You can now sign in.');
    }
  }, [searchParams]);

  const form = useForm({
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    } as LoginFormData,
    onSubmit: async ({ value }) => {
      setIsLoading(true);
      setEmailError(null);
      setPasswordError(null);

      try {
        const result = await signIn('credentials', {
          email: value.email,
          password: value.password,
          redirect: false,
        });

        if (result?.error) {
          // Handle specific error messages from credentials provider
          if (result.error.includes('verify your email')) {
            setEmailError(
              'Please verify your email address before signing in.'
            );
          } else if (result.error.includes('Too many login attempts')) {
            toast.error(
              'Too many login attempts. Please wait before trying again.'
            );
          } else {
            toast.error('Invalid email or password. Please try again.');
          }
        } else if (result?.ok) {
          // Redirect to dashboard
          window.location.href = '/dashboard';
        }
      } catch (err) {
        toast.error('An unexpected error occurred. Please try again.');
        console.error('Login error:', err);
      } finally {
        setIsLoading(false);
      }
    },
  });

  const handleSocialAuth = {
    google: () => signIn('google', { callbackUrl: '/dashboard' }),
    facebook: () => signIn('facebook', { callbackUrl: '/dashboard' }),
    linkedin: () => signIn('linkedin', { callbackUrl: '/dashboard' }),
    twitter: () => signIn('twitter', { callbackUrl: '/dashboard' }),
  };

  return (
    <AuthLayout>
      <AuthForm
        title="Welcome back"
        subtitle="Sign in to your account to continue building SEO pages."
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
        <form
          className="space-y-4 md:space-y-6"
          onSubmit={e => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <form.Field
            name="email"
            validators={{
              onBlur: ({ value }) => {
                try {
                  loginSchema.shape.email.parse(value);
                  return undefined;
                } catch (error: unknown) {
                  return error && typeof error === 'object' && 'errors' in error
                    ? (error as { errors: { message: string }[] }).errors?.[0]
                        ?.message
                    : 'Invalid email';
                }
              },
            }}
          >
            {field => (
              <div className="space-y-2">
                <Label htmlFor="email">Work Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="rand.fishkin@company.com"
                  value={field.state.value}
                  onChange={e => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  disabled={isLoading}
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="text-sm text-red-600">
                    {field.state.meta.errors[0]}
                  </p>
                )}
                {emailError && (
                  <p className="text-sm text-red-600">{emailError}</p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field
            name="password"
            validators={{
              onBlur: ({ value }) => {
                try {
                  loginSchema.shape.password.parse(value);
                  return undefined;
                } catch (error: unknown) {
                  return error && typeof error === 'object' && 'errors' in error
                    ? (error as { errors: { message: string }[] }).errors?.[0]
                        ?.message
                    : 'Invalid password';
                }
              },
            }}
          >
            {field => (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••••"
                  value={field.state.value}
                  onChange={e => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  disabled={isLoading}
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="text-sm text-red-600">
                    {field.state.meta.errors[0]}
                  </p>
                )}
                {passwordError && (
                  <p className="text-sm text-red-600">{passwordError}</p>
                )}
              </div>
            )}
          </form.Field>

          <form.Subscribe
            selector={state => [state.canSubmit, state.isSubmitting]}
          >
            {([canSubmit, isSubmitting]) => (
              <Button
                type="submit"
                className="w-full h-10 md:h-12 text-sm md:text-base font-medium"
                disabled={!canSubmit || isSubmitting || isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign In →'}
              </Button>
            )}
          </form.Subscribe>
        </form>
      </AuthForm>
    </AuthLayout>
  );
}
