'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from '@tanstack/react-form';
import { toast } from 'sonner';
import {
  OnboardingFormData,
  defaultOnboardingValues,
  stepSchemas,
} from '@/lib/validations/onboarding';

export interface OnboardingErrorData {
  message: string;
  field?: string;
  code?: string;
}

export interface UseOnboardingFormReturn {
  form: any; // TanStack Form API - complex type
  currentStep: number;
  isSubmitting: boolean;
  isValidating: boolean;
  error: OnboardingErrorData | null;
  handleNextStep: () => Promise<void>;
  handlePreviousStep: () => void;
  handleSkipStep: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
  canSkip: boolean;
  retrySubmission: () => Promise<void>;
}

const MAX_STEPS = 4;
const SKIPPABLE_STEPS = [3]; // Only team members step is skippable

export function useOnboardingForm(): UseOnboardingFormReturn {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<OnboardingErrorData | null>(null);
  const [lastSubmissionData, setLastSubmissionData] =
    useState<OnboardingFormData | null>(null);

  const form = useForm({
    defaultValues: defaultOnboardingValues,
    onSubmit: async ({ value }: { value: OnboardingFormData }) => {
      setIsSubmitting(true);
      setError(null);
      setLastSubmissionData(value);

      try {
        const response = await fetch('/api/onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(value),
        });

        const data = await response.json();

        if (!response.ok) {
          // Handle specific error cases
          if (response.status === 409) {
            throw new OnboardingError(
              data.error || 'Onboarding already completed',
              undefined,
              'ALREADY_COMPLETED'
            );
          } else if (response.status === 400) {
            throw new OnboardingError(
              data.error || 'Invalid form data',
              data.field,
              'VALIDATION_ERROR'
            );
          } else if (response.status === 401) {
            throw new OnboardingError(
              'Session expired. Please sign in again.',
              undefined,
              'UNAUTHORIZED'
            );
          } else if (response.status >= 500) {
            throw new OnboardingError(
              'Server error. Please try again later.',
              undefined,
              'SERVER_ERROR'
            );
          } else {
            throw new OnboardingError(
              data.error || 'Failed to complete onboarding',
              data.field
            );
          }
        }

        toast.success('Welcome! Your account setup is complete.');
        router.push('/dashboard');
      } catch (err) {
        const errorMessage =
          err instanceof OnboardingError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'An unexpected error occurred';

        setError(
          err instanceof OnboardingError
            ? err
            : { message: errorMessage, code: 'UNKNOWN' }
        );
        toast.error(errorMessage);

        // Handle specific error codes
        if (err instanceof OnboardingError && err.code === 'UNAUTHORIZED') {
          setTimeout(() => router.push('/login'), 2000);
        }
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  const validateCurrentStep = useCallback(async (): Promise<boolean> => {
    setIsValidating(true);
    try {
      const schema = stepSchemas[currentStep as keyof typeof stepSchemas];
      if (!schema) return true;

      // Get current form values
      const values = form.state.values;

      // Extract values for current step
      let stepValues: any = {};
      switch (currentStep) {
        case 1:
          stepValues = {
            useCases: values.useCases,
            otherUseCase: values.otherUseCase,
          };
          break;
        case 2:
          stepValues = {
            workspaceName: values.workspaceName,
            professionalRole: values.professionalRole,
            otherProfessionalRole: values.otherProfessionalRole,
            companySize: values.companySize,
            industry: values.industry,
            otherIndustry: values.otherIndustry,
          };
          break;
        case 3:
          stepValues = {
            teamMembers: values.teamMembers,
          };
          break;
        case 4:
          stepValues = {
            discoverySource: values.discoverySource,
            otherDiscoverySource: values.otherDiscoverySource,
            previousAttempts: values.previousAttempts,
          };
          break;
      }

      // Validate with Zod
      const result = await schema.safeParseAsync(stepValues);
      if (!result.success) {
        const firstError = result.error.issues[0];
        toast.error(
          firstError?.message || 'Please complete all required fields'
        );
        return false;
      }

      return true;
    } catch (err) {
      console.error('Validation error:', err);
      return false;
    } finally {
      setIsValidating(false);
    }
  }, [currentStep, form.state.values]);

  const handleNextStep = useCallback(async () => {
    // Don't proceed if already submitting or validating
    if (isSubmitting || isValidating) return;

    // Validate current step
    const isValid = await validateCurrentStep();
    if (!isValid) return;

    // If last step, submit the form
    if (currentStep === MAX_STEPS) {
      await form.handleSubmit();
    } else {
      setCurrentStep(prev => Math.min(prev + 1, MAX_STEPS));
    }
  }, [currentStep, form, isSubmitting, isValidating, validateCurrentStep]);

  const handlePreviousStep = useCallback(() => {
    if (isSubmitting) return;
    setCurrentStep(prev => Math.max(prev - 1, 1));
  }, [isSubmitting]);

  const handleSkipStep = useCallback(() => {
    if (isSubmitting) return;
    if (SKIPPABLE_STEPS.includes(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, MAX_STEPS));
    }
  }, [currentStep, isSubmitting]);

  const retrySubmission = useCallback(async () => {
    if (!lastSubmissionData || isSubmitting) return;
    setError(null);
    await form.handleSubmit();
  }, [form, lastSubmissionData, isSubmitting]);

  return {
    form,
    currentStep,
    isSubmitting,
    isValidating,
    error,
    handleNextStep,
    handlePreviousStep,
    handleSkipStep,
    canGoNext: !isSubmitting && !isValidating,
    canGoPrevious: currentStep > 1 && !isSubmitting,
    canSkip: SKIPPABLE_STEPS.includes(currentStep) && !isSubmitting,
    retrySubmission,
  };
}

// Custom error class for better error handling
class OnboardingError extends Error {
  constructor(
    message: string,
    public field?: string,
    public code?: string
  ) {
    super(message);
    this.name = 'OnboardingError';
  }
}
