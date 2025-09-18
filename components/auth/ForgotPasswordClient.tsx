'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useForm } from '@tanstack/react-form';
import {
  passwordResetRequestSchema,
  type PasswordResetRequestFormData,
} from '@/lib/validations/auth';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Info, Mail } from 'lucide-react';
import { getEmailSuggestion } from '@/lib/utils/email-validation';

export function ForgotPasswordClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
    hints?: string[];
  } | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [emailSuggestion, setEmailSuggestion] = useState<string | null>(null);

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
      setSubmittedEmail(value.email);
      setAttemptCount(prev => prev + 1);

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
            hints: data.hints,
          });
        } else if (response.ok) {
          // Determine type based on actual email sending
          const messageType =
            data.success && data.message.includes('sent') ? 'success' : 'info';

          setSubmitMessage({
            type: messageType,
            message: data.message,
            hints: data.hints,
          });

          // Clear form on success
          if (messageType === 'success') {
            form.reset();
          }
        } else {
          setSubmitMessage({
            type: 'error',
            message: data.error || 'An error occurred. Please try again.',
            hints: data.hints,
          });
        }
      } catch (error) {
        setSubmitMessage({
          type: 'error',
          message: 'Network error. Please check your connection and try again.',
          hints: ['Check your internet connection', 'Try refreshing the page'],
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
            className={`mb-6 rounded-lg border p-4 text-left ${
              submitMessage.type === 'success'
                ? 'border-green-200 bg-green-50'
                : submitMessage.type === 'error'
                  ? 'border-red-200 bg-red-50'
                  : 'border-blue-200 bg-blue-50'
            }`}
          >
            <div className="flex gap-3">
              {submitMessage.type !== 'success' && (
                <div className="flex-shrink-0">
                  {submitMessage.type === 'error' ? (
                    <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                  ) : (
                    <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                  )}
                </div>
              )}
              <div className="flex-1">
                <p
                  className={`text-sm ${
                    submitMessage.type === 'success'
                      ? 'text-green-800'
                      : submitMessage.type === 'error'
                        ? 'text-red-800'
                        : 'text-blue-800'
                  }`}
                >
                  {submitMessage.message}
                </p>

                {submittedEmail && submitMessage.type === 'success' && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-green-700">
                    <Mail className="h-4 w-4" />
                    <span className="font-medium">{submittedEmail}</span>
                  </div>
                )}

                {submitMessage.hints && submitMessage.hints.length > 0 && (
                  <ul className="mt-3 space-y-1 text-sm">
                    {submitMessage.hints.map((hint, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-gray-400 mt-0.5">•</span>
                        <span
                          className={
                            submitMessage.type === 'success'
                              ? 'text-green-700'
                              : submitMessage.type === 'error'
                                ? 'text-red-700'
                                : 'text-blue-700'
                          }
                        >
                          {hint}
                        </span>
                      </li>
                    ))}
                  </ul>
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
            <form.Field name="email">
              {field => (
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    value={field.state.value}
                    onChange={e => {
                      const value = e.target.value;
                      field.handleChange(value);

                      // Check for email suggestions
                      if (value && value.includes('@')) {
                        const suggestion = getEmailSuggestion(value);
                        setEmailSuggestion(suggestion);
                      } else {
                        setEmailSuggestion(null);
                      }
                    }}
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
                  {emailSuggestion && field.state.value !== emailSuggestion && (
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="text-sm text-blue-800">
                        Did you mean{' '}
                        <button
                          type="button"
                          className="font-medium underline hover:no-underline"
                          onClick={() => {
                            field.handleChange(emailSuggestion);
                            setEmailSuggestion(null);
                          }}
                        >
                          {emailSuggestion}
                        </button>
                        ?
                      </p>
                    </div>
                  )}
                </div>
              )}
            </form.Field>
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full text-sm md:text-base cursor-pointer"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? 'Sending...'
              : attemptCount > 0 && submitMessage?.type !== 'error'
                ? 'Resend reset link'
                : 'Send reset link'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Remember your password?{' '}
            <a
              href={token ? `/login?token=${token}` : '/login'}
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
