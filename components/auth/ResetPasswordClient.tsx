'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useForm } from '@tanstack/react-form';
import {
  passwordResetSchema,
  type PasswordResetFormData,
} from '@/lib/validations/auth';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordStrengthIndicator } from '@/components/auth/PasswordStrengthIndicator';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

export function ResetPasswordClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmPasswordBlurred, setConfirmPasswordBlurred] = useState(false);

  const form = useForm({
    defaultValues: {
      token: token || '',
      email: email || '',
      password: '',
      confirmPassword: '',
    } as PasswordResetFormData,
    validators: {
      onChange: passwordResetSchema,
    },
    onSubmit: async ({ value }) => {
      // Check if passwords match
      if (value.password !== value.confirmPassword) {
        setSubmitMessage({
          type: 'error',
          message:
            "Passwords don't match. Please make sure both passwords are identical.",
        });
        return;
      }
      // Show confirmation dialog before proceeding
      setShowConfirmation(true);
    },
  });

  const handleConfirmReset = async () => {
    setShowConfirmation(false);
    setIsSubmitting(true);
    setSubmitMessage(null);

    const value = form.state.values;

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(value),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitMessage({
          type: 'success',
          message:
            'Password reset successfully! You can now login with your new password.',
        });
      } else {
        setSubmitMessage({
          type: 'error',
          message: data.error || 'Failed to reset password. Please try again.',
        });
      }
    } catch (error) {
      setSubmitMessage({
        type: 'error',
        message: 'Network error. Please check your connection and try again.',
      });
      console.error('Reset password error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token || !email) {
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
              Invalid Reset Link
            </h1>
            <p className="text-gray-600 max-w-md mx-auto">
              This password reset link is invalid or has expired. Please request
              a new one.
            </p>
          </div>

          <div className="mb-6 rounded-lg border p-4 text-left border-red-200 bg-red-50">
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-red-800">
                  The reset link you followed is no longer valid.
                </p>
                <ul className="mt-3 space-y-1 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-gray-400 mt-0.5">•</span>
                    <span className="text-red-700">
                      Reset links expire after 1 hour
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-400 mt-0.5">•</span>
                    <span className="text-red-700">
                      Each link can only be used once
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Button
              size="lg"
              className="w-full text-sm md:text-base cursor-pointer"
              asChild
            >
              <a href="/forgot-password">Request New Reset Link</a>
            </Button>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Remember your password?{' '}
                <a
                  href="/login"
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Back to login
                </a>
              </p>
            </div>
          </div>
        </div>
      </AuthLayout>
    );
  }

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
            Set new password
          </h1>
          <p className="text-gray-600 max-w-md mx-auto">
            Enter your new password below.
          </p>
        </div>

        {submitMessage && (
          <div
            className={`mb-6 rounded-lg border p-4 text-left ${
              submitMessage.type === 'success'
                ? 'border-green-200 bg-green-50'
                : 'border-red-200 bg-red-50'
            }`}
          >
            <div className="flex gap-3">
              {submitMessage.type !== 'success' && (
                <div className="flex-shrink-0">
                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                </div>
              )}
              <div className="flex-1">
                <p
                  className={`text-sm ${
                    submitMessage.type === 'success'
                      ? 'text-green-800'
                      : 'text-red-800'
                  }`}
                >
                  {submitMessage.message}
                </p>
                {submitMessage.type === 'success' && (
                  <div className="mt-3">
                    <a
                      href="/login"
                      className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Go to Login
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <form
          onSubmit={e => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="space-y-4 md:space-y-6"
        >
          <div>
            <form.Field name="password">
              {field => (
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your new password"
                      value={field.state.value}
                      onChange={e => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className={`pr-10 ${
                        field.state.meta.errors.length > 0 &&
                        field.state.meta.isTouched
                          ? 'border-red-500'
                          : ''
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {field.state.meta.errors.length > 0 &&
                    field.state.meta.isTouched && (
                      <p className="text-sm text-red-600 text-left">
                        {typeof field.state.meta.errors[0] === 'string'
                          ? field.state.meta.errors[0]
                          : field.state.meta.errors[0]?.message ||
                            'Invalid password'}
                      </p>
                    )}
                  <PasswordStrengthIndicator password={field.state.value} />
                </div>
              )}
            </form.Field>
          </div>

          <div>
            <form.Field name="confirmPassword">
              {field => {
                const passwordValue = form.state.values.password;
                const confirmValue = field.state.value;
                const passwordsMatch = passwordValue === confirmValue;
                const showError =
                  confirmPasswordBlurred && confirmValue && !passwordsMatch;

                return (
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirm your new password"
                        value={field.state.value}
                        onChange={e => field.handleChange(e.target.value)}
                        onBlur={() => {
                          field.handleBlur();
                          setConfirmPasswordBlurred(true);
                        }}
                        className={`pr-10 ${
                          showError || (confirmPasswordBlurred && !confirmValue)
                            ? 'border-red-500'
                            : ''
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 cursor-pointer"
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {showError && (
                      <p className="text-sm text-red-600 text-left">
                        Passwords don&apos;t match
                      </p>
                    )}
                    {!confirmValue && confirmPasswordBlurred && (
                      <p className="text-sm text-red-600 text-left">
                        Please confirm your password
                      </p>
                    )}
                  </div>
                );
              }}
            </form.Field>
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full text-sm md:text-base cursor-pointer"
            disabled={isSubmitting || submitMessage?.type === 'success'}
          >
            {isSubmitting ? 'Updating...' : 'Update Password'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Remember your password?{' '}
            <a
              href="/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Back to login
            </a>
          </p>
        </div>
      </div>

      <ConfirmationDialog
        isOpen={showConfirmation}
        title="Reset Password?"
        message="This will change your password. Are you sure you want to continue?"
        confirmText="Reset Password"
        cancelText="Cancel"
        variant="warning"
        onConfirm={handleConfirmReset}
        onCancel={() => setShowConfirmation(false)}
      />
    </AuthLayout>
  );
}
