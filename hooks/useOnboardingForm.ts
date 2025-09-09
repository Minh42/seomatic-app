'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, FormApi } from '@tanstack/react-form';
import { toast } from 'sonner';
import {
  OnboardingFormData,
  defaultOnboardingValues,
} from '@/lib/validations/onboarding';
import { OnboardingError } from '@/lib/errors/onboarding-errors';
import { useOnboardingValidation } from './useOnboardingValidation';
import { useOnboardingProgress } from './useOnboardingProgress';
import { useOnboardingStepHandlers } from './useOnboardingStepHandlers';
import { useOnboardingNavigation } from './useOnboardingNavigation';
import { useSession } from 'next-auth/react';

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
  retryWorkspaceCreation: (newName: string) => Promise<void>;
  clearWorkspaceError: () => void;
  isLoadingProgress: boolean;
  workspaceId: string | null;
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
    workspaceName?: string;
  };
  workspaceId: string | null;
  workspaceName: string;
}

/**
 * Main onboarding form hook that orchestrates all onboarding logic
 */
export function useOnboardingForm(
  initialData?: InitialData
): UseOnboardingFormReturn {
  const router = useRouter();
  useSession(); // We may need session data in the future

  // State management
  const [currentStep, setCurrentStep] = useState(
    initialData?.onboardingData?.currentStep || 1
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<OnboardingErrorData | null>(null);
  const [lastSubmissionData, setLastSubmissionData] =
    useState<OnboardingFormData | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(
    initialData?.workspaceId || null
  );
  const [isLoadingProgress] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // Merge initial data with defaults
  const formDefaults = initialData
    ? {
        useCases: initialData.onboardingData.useCases || [],
        otherUseCase: initialData.onboardingData.otherUseCase || '',
        workspaceName:
          initialData.onboardingData.workspaceName ||
          initialData.workspaceName ||
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
        // Include workspaceId in the submission
        const submissionData = {
          ...value,
          workspaceId,
        };

        // Use the main onboarding endpoint for completion
        const response = await fetch('/api/onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submissionData),
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

        // Show confetti and success message
        setShowConfetti(true);
        toast.success('Welcome! Your account setup is complete.');

        // Redirect after a short delay to let users enjoy the confetti
        setTimeout(() => {
          router.push('/dashboard');
        }, 3000);
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

  // Use progress hook
  const { saveStepProgress, updateSavedStep } = useOnboardingProgress({
    initialData,
    form,
    setCurrentStep,
    setWorkspaceId,
  });

  // Use step handlers hook
  const stepHandlers = useOnboardingStepHandlers({
    form,
    setWorkspaceId,
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
        workspaceId,
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

      // Show confetti and success message
      setShowConfetti(true);
      toast.success('Welcome! Your account setup is complete.');

      // Redirect after a short delay
      setTimeout(() => {
        router.push('/dashboard');
      }, 3000);
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
  }, [lastSubmissionData, isSubmitting, workspaceId, router]);

  // Retry workspace creation with a different name
  const retryWorkspaceCreation = useCallback(
    async (newName: string) => {
      if (isSubmitting) return;

      setIsSubmitting(true);
      const success = await stepHandlers.retryWorkspaceCreation(newName);

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
  const clearWorkspaceError = useCallback(() => {
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
    retryWorkspaceCreation,
    clearWorkspaceError,
    isLoadingProgress,
    workspaceId,
    showConfetti,
  };
}
