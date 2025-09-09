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
import { Eye, EyeOff } from 'lucide-react';

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

  const form = useForm({
    defaultValues: {
      token: token || '',
      email: email || '',
      password: '',
    } as PasswordResetFormData,
    validators: {
      onChange: passwordResetSchema,
    },
    onSubmit: async () => {
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
            <div className="w-16 h-16 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>

            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-4">
              Invalid Reset Link
            </h1>

            <p className="text-gray-600 max-w-md mx-auto mb-6">
              This password reset link is invalid or has expired. Please request
              a new one.
            </p>
          </div>

          <div className="space-y-4">
            <a
              href="/forgot-password"
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Request New Reset Link
            </a>
            <div>
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
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-4">
            Set new password
          </h1>
          <p className="text-gray-600 max-w-md mx-auto">
            Enter your new password below.
          </p>
        </div>

        {submitMessage && (
          <div
            className={`mb-6 p-4 rounded-md text-sm ${
              submitMessage.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-600'
                : 'bg-red-50 border border-red-200 text-red-600'
            }`}
          >
            {submitMessage.message}
            {submitMessage.type === 'success' && (
              <div className="mt-3">
                <a
                  href="/login"
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                >
                  Go to Login
                </a>
              </div>
            )}
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
                        field.state.meta.errors.length > 0
                          ? 'border-red-500'
                          : ''
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-red-600">
                      {String(field.state.meta.errors[0])}
                    </p>
                  )}
                  <PasswordStrengthIndicator password={field.state.value} />
                </div>
              )}
            </form.Field>
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full text-sm md:text-base"
            disabled={isSubmitting || submitMessage?.type === 'success'}
          >
            {isSubmitting ? 'Updating...' : 'Update Password'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <a
            href="/login"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Back to login
          </a>
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
