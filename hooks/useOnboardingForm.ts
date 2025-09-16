'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, FormApi } from '@tanstack/react-form';
import { toast } from 'sonner';
import {
  OnboardingFormData,
  defaultOnboardingValues,
} from '@/lib/validations/onboarding';
import {
  OnboardingError,
  AlreadyCompletedError,
  SessionError,
  ValidationError,
  ServerError,
} from '@/lib/errors/onboarding-errors';
import { useOnboardingValidation } from './useOnboardingValidation';
import { useOnboardingProgress } from './useOnboardingProgress';
import { useOnboardingStepHandlers } from './useOnboardingStepHandlers';
import { useOnboardingNavigation } from './useOnboardingNavigation';

export interface OnboardingErrorData {
  message: string;
  field?: string;
  code?: string;
}

export interface UseOnboardingFormReturn {
  form: FormApi<OnboardingFormData, unknown>;
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
  retryOrganizationCreation: (newName: string) => Promise<void>;
  clearOrganizationError: () => void;
  isLoadingProgress: boolean;
  organizationId: string | null;
  showConfetti: boolean;
}

interface InitialData {
  onboardingData: {
    currentStep: number;
    useCases: string[];
    otherUseCase: string;
    professionalRole: string;
    otherProfessionalRole: string;
    companySize: string;
    industry: string;
    otherIndustry: string;
    cmsIntegration: string;
    otherCms: string;
    discoverySource: string;
    otherDiscoverySource: string;
    previousAttempts: string;
    teamMembers: Array<{ email: string; role: string }>;
    organizationName?: string;
  };
  organizationId: string | null;
  organizationName: string;
}

/**
 * Main onboarding form hook that orchestrates all onboarding logic
 */
export function useOnboardingForm(
  initialData?: InitialData
): UseOnboardingFormReturn {
  const router = useRouter();

  // State management
  const [currentStep, setCurrentStep] = useState(
    initialData?.onboardingData?.currentStep || 1
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<OnboardingErrorData | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [lastSubmissionData, setLastSubmissionData] =
    useState<OnboardingFormData | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(
    initialData?.organizationId || null
  );
  const [isLoadingProgress] = useState(false);

  // Merge initial data with defaults
  const formDefaults = initialData
    ? {
        useCases: initialData.onboardingData.useCases || [],
        otherUseCase: initialData.onboardingData.otherUseCase || '',
        organizationName:
          initialData.onboardingData.organizationName ||
          initialData.organizationName ||
          '',
        professionalRole: initialData.onboardingData.professionalRole || '',
        otherProfessionalRole:
          initialData.onboardingData.otherProfessionalRole || '',
        companySize: initialData.onboardingData.companySize || '',
        industry: initialData.onboardingData.industry || '',
        otherIndustry: initialData.onboardingData.otherIndustry || '',
        cmsIntegration: initialData.onboardingData.cmsIntegration || '',
        otherCms: initialData.onboardingData.otherCms || '',
        teamMembers: initialData.onboardingData.teamMembers || [],
        discoverySource: initialData.onboardingData.discoverySource || '',
        otherDiscoverySource:
          initialData.onboardingData.otherDiscoverySource || '',
        previousAttempts: initialData.onboardingData.previousAttempts || '',
      }
    : defaultOnboardingValues;

  // Initialize form with reactivity
  const form = useForm({
    defaultValues: formDefaults,
    onSubmit: async ({ value }: { value: OnboardingFormData }) => {
      setIsSubmitting(true);
      setError(null);
      setLastSubmissionData(value);

      try {
        // Use the main onboarding endpoint for completion
        const response = await fetch('/api/onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(value),
        });

        const data = await response.json();

        if (!response.ok) {
          // Handle specific error cases
          if (response.status === 409) {
            throw new AlreadyCompletedError();
          } else if (response.status === 400) {
            throw new ValidationError(
              data.error || 'Invalid form data',
              data.field
            );
          } else if (response.status === 401) {
            throw new SessionError();
          } else if (response.status >= 500) {
            throw new ServerError();
          } else {
            throw new OnboardingError(
              data.error || 'Failed to complete onboarding',
              data.field
            );
          }
        }

        // Show success message and confetti, then redirect
        setShowConfetti(true);
        toast.success('Welcome! Your account setup is complete.');

        // Redirect after a short delay to show confetti
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } catch (err) {
        const errorMessage =
          err instanceof OnboardingError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'An unexpected error occurred';

        // Only set error state for critical errors (not validation)
        if (
          err instanceof OnboardingError &&
          err.code !== 'VALIDATION_ERROR' &&
          err.code !== 'ALREADY_COMPLETED'
        ) {
          setError(err);
        } else if (!(err instanceof OnboardingError)) {
          setError({ message: errorMessage, code: 'UNKNOWN' });
        }

        // Always show toast for user feedback
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

  // Use progress hook for saving only (loading is done server-side)
  const { saveStepProgress, updateSavedStep } = useOnboardingProgress();

  // Use step handlers hook
  const stepHandlers = useOnboardingStepHandlers({
    form,
    setOrganizationId,
    setError,
    saveStepProgress,
  });

  // Subscribe to form state changes to ensure reactivity
  const [formValues, setFormValues] = useState(form.state.values);

  // Update formValues when form state changes
  useEffect(() => {
    const unsubscribe = form.store.subscribe(() => {
      setFormValues(form.store.state.values);
    });
    return unsubscribe;
  }, [form.store]);

  // Note: Removed onboarding_started event as it's redundant
  // Users go directly from signup to onboarding, so user_signed_up is sufficient

  // Use validation hook with reactive form values
  const { canGoNext, canGoPrevious, canSkip } = useOnboardingValidation(
    currentStep,
    formValues,
    isSubmitting,
    isValidating
  );

  // Use navigation hook
  const { handleNextStep, handlePreviousStep, handleSkipStep } =
    useOnboardingNavigation({
      currentStep,
      setCurrentStep,
      form,
      isSubmitting,
      setIsSubmitting,
      isValidating,
      setIsValidating,
      stepHandlers,
      updateSavedStep,
      saveStepProgress,
      canSkip,
    });

  // Retry submission after error
  const retrySubmission = useCallback(async () => {
    if (!lastSubmissionData || isSubmitting) return;

    setError(null);
    setIsSubmitting(true);

    try {
      // Retry with the last submission data
      const submissionData = {
        ...lastSubmissionData,
        workspaceId: null, // Will be created during onboarding
      };

      // Use the main onboarding endpoint for completion
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new OnboardingError(
          data.error || 'Failed to complete onboarding',
          data.field
        );
      }

      // Show success message and confetti, then redirect
      setShowConfetti(true);
      toast.success('Welcome! Your account setup is complete.');

      // Redirect after a short delay to show confetti
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to complete onboarding';
      setError(
        err instanceof OnboardingError
          ? err
          : { message: errorMessage, code: 'RETRY_FAILED' }
      );
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [lastSubmissionData, isSubmitting, organizationId, router]);

  // Retry workspace creation with a different name
  const retryOrganizationCreation = useCallback(
    async (newName: string) => {
      if (isSubmitting) return;

      setIsSubmitting(true);
      const success = await stepHandlers.retryOrganizationCreation(newName);

      if (success) {
        // Move to next step
        const nextStep = Math.min(currentStep + 1, 5);
        setCurrentStep(nextStep);
        await updateSavedStep(nextStep);
      }

      setIsSubmitting(false);
    },
    [isSubmitting, currentStep, stepHandlers, setCurrentStep, updateSavedStep]
  );

  // Clear workspace error
  const clearOrganizationError = useCallback(() => {
    setError(null);
  }, []);

  return {
    form,
    currentStep,
    isSubmitting,
    isValidating,
    error,
    handleNextStep,
    handlePreviousStep,
    handleSkipStep,
    canGoNext,
    canGoPrevious,
    canSkip,
    retrySubmission,
    retryOrganizationCreation,
    clearOrganizationError,
    isLoadingProgress,
    organizationId,
    showConfetti,
  };
}
