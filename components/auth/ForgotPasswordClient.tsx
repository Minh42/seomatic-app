'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useForm } from '@tanstack/react-form';
import {
  passwordResetRequestSchema,
  type PasswordResetRequestFormData,
} from '@/lib/validations/auth';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ForgotPasswordClient() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const form = useForm({
    defaultValues: {
      email: '',
    } as PasswordResetRequestFormData,
    validators: {
      onChange: passwordResetRequestSchema,
    },
    onSubmit: async ({ value }) => {
      setIsSubmitting(true);
      setSubmitMessage(null);

      try {
        const response = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(value),
        });

        const data = await response.json();

        if (response.status === 429) {
          setSubmitMessage({
            type: 'error',
            message:
              data.error ||
              'Too many requests. Please wait before trying again.',
          });
        } else if (response.ok) {
          setSubmitMessage({
            type: 'success',
            message: data.message,
          });
        } else {
          setSubmitMessage({
            type: 'error',
            message: data.error || 'An error occurred. Please try again.',
          });
        }
      } catch (error) {
        setSubmitMessage({
          type: 'error',
          message: 'Network error. Please check your connection and try again.',
        });
        console.error('Forgot password error:', error);
      } finally {
        setIsSubmitting(false);
      }
    },
  });

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
            Reset your password
          </h1>
          <p className="text-gray-600 max-w-md mx-auto">
            Enter your email address and we&apos;ll send you a link to reset
            your password.
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
          </div>
        )}

        <form
          onSubmit={e => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="space-y-6"
        >
          <div>
            <form.Field name="email">
              {field => (
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    value={field.state.value}
                    onChange={e => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    className={
                      field.state.meta.errors.length > 0 ? 'border-red-500' : ''
                    }
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-red-600">
                      {String(field.state.meta.errors[0])}
                    </p>
                  )}
                </div>
              )}
            </form.Field>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || submitMessage?.type === 'success'}
          >
            {isSubmitting ? 'Sending...' : 'Send reset link'}
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
    </AuthLayout>
  );
}
