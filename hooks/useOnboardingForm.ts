'use client';

import { useState, useCallback, useEffect } from 'react';
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
  isLoadingProgress: boolean;
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
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [isLoadingProgress, setIsLoadingProgress] = useState(true);
  const [initialValues] = useState<OnboardingFormData>(defaultOnboardingValues);

  const form = useForm({
    defaultValues: initialValues,
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

  // Load any existing onboarding progress on mount
  useEffect(() => {
    const loadProgress = async () => {
      try {
        const response = await fetch('/api/onboarding/progress');
        if (response.ok) {
          const data = await response.json();

          // If onboarding is already completed, redirect
          if (data.onboardingCompleted) {
            router.push('/dashboard');
            return;
          }

          // Load any saved onboarding data
          if (
            data.onboardingData &&
            Object.keys(data.onboardingData).length > 0
          ) {
            // Merge saved data with defaults, with validation
            const savedData = {
              ...defaultOnboardingValues,
              ...data.onboardingData,
              // Ensure arrays are actually arrays
              useCases: Array.isArray(data.onboardingData.useCases)
                ? data.onboardingData.useCases
                : [],
              teamMembers: Array.isArray(data.onboardingData.teamMembers)
                ? data.onboardingData.teamMembers
                : [],
            };

            // Update form state by setting each field individually
            Object.keys(savedData).forEach(key => {
              if (savedData[key] !== undefined && savedData[key] !== null) {
                form.setFieldValue(key, savedData[key]);
              }
            });

            // Set step based on current step from database
            const savedStep = data.onboardingData.currentStep;
            if (savedStep && savedStep >= 1 && savedStep <= 4) {
              setCurrentStep(savedStep);
            }
          }

          // If they have a workspace, they've at least completed step 2
          if (data.workspaceId) {
            setWorkspaceId(data.workspaceId);
            // Set workspace name in form if available
            if (data.workspaceName) {
              form.setFieldValue('workspaceName', data.workspaceName);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load progress:', error);
      } finally {
        setIsLoadingProgress(false);
      }
    };

    loadProgress();
  }, [router, form]);

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
            useCases: values.useCases || [],
            otherUseCase: values.otherUseCase || '',
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

  const saveStepProgress = useCallback(async (step: number, stepData: any) => {
    try {
      const response = await fetch('/api/onboarding/save-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step, data: stepData }),
      });

      if (!response.ok) {
        console.error('Failed to save progress');
      }
    } catch (error) {
      console.error('Failed to save progress:', error);
    }
  }, []);

  const updateSavedStep = useCallback(async (newStep: number) => {
    try {
      await fetch('/api/onboarding/save-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: newStep }), // No data = step update only
      });
    } catch {
      // Silently fail - not critical
    }
  }, []);

  const handleNextStep = useCallback(async () => {
    // Don't proceed if already submitting or validating
    if (isSubmitting || isValidating) return;

    // Validate current step
    const isValid = await validateCurrentStep();
    if (!isValid) return;

    // Save progress after each step
    const values = form.state.values;

    // Save Step 1 data (use cases)
    if (currentStep === 1) {
      await saveStepProgress(1, {
        useCases: values.useCases || [],
        otherUseCase: values.otherUseCase || '',
      });
      const nextStep = Math.min(currentStep + 1, MAX_STEPS);
      setCurrentStep(nextStep);
      await updateSavedStep(nextStep); // Update the saved step after moving forward
    }
    // Step 2: Create workspace and save other data
    else if (currentStep === 2) {
      setIsSubmitting(true);
      try {
        const workspaceName = values.workspaceName;
        if (!workspaceName) {
          toast.error('Please enter a workspace name');
          setIsSubmitting(false);
          return;
        }

        const response = await fetch('/api/workspace', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: workspaceName }),
        });

        const data = await response.json();

        if (!response.ok) {
          // Handle duplicate workspace name
          if (response.status === 409) {
            throw new OnboardingError(
              'A workspace with this name already exists. Please choose a different name.',
              'workspaceName',
              'DUPLICATE_WORKSPACE'
            );
          }
          throw new OnboardingError(
            data.error || 'Failed to create workspace',
            'workspaceName',
            'WORKSPACE_ERROR'
          );
        }

        // Store workspace ID for final submission
        setWorkspaceId(data.workspace.id);

        // Also save the Step 2 form data
        await saveStepProgress(2, {
          professionalRole: values.professionalRole || '',
          otherProfessionalRole: values.otherProfessionalRole || '',
          companySize: values.companySize || '',
          industry: values.industry || '',
          otherIndustry: values.otherIndustry || '',
        });

        toast.success('Workspace created successfully!');
        const nextStep = Math.min(currentStep + 1, MAX_STEPS);
        setCurrentStep(nextStep);
        await updateSavedStep(nextStep);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to create workspace';

        // Set error state for display in UI
        setError(
          err instanceof OnboardingError
            ? err
            : {
                message: errorMessage,
                code: 'WORKSPACE_ERROR',
                field: 'workspaceName',
              }
        );

        toast.error(errorMessage);
        // Don't advance step on error - user needs to fix and retry
      } finally {
        setIsSubmitting(false);
      }
      return; // Exit early on workspace creation error
    }
    // Step 3: Team members - save the current state
    else if (currentStep === 3) {
      // Save team members temporarily (will be processed in final submission)
      await saveStepProgress(3, {
        teamMembers: values.teamMembers || [],
        teamMembersCompleted: true,
      });
      const nextStep = Math.min(currentStep + 1, MAX_STEPS);
      setCurrentStep(nextStep);
      await updateSavedStep(nextStep);
    }
    // Step 4: Final submission
    else if (currentStep === MAX_STEPS) {
      // Save Step 4 data before final submission
      await saveStepProgress(4, {
        discoverySource: values.discoverySource || '',
        otherDiscoverySource: values.otherDiscoverySource || '',
        previousAttempts: values.previousAttempts || '',
      });
      // Submit the complete form
      await form.handleSubmit();
    }
  }, [
    currentStep,
    form,
    isSubmitting,
    isValidating,
    validateCurrentStep,
    saveStepProgress,
    updateSavedStep,
  ]);

  const handlePreviousStep = useCallback(async () => {
    if (isSubmitting) return;

    // Save current step data before going back
    const values = form.state.values;

    try {
      switch (currentStep) {
        case 2:
          // Save Step 2 data before going back
          await saveStepProgress(2, {
            professionalRole: values.professionalRole || '',
            otherProfessionalRole: values.otherProfessionalRole || '',
            companySize: values.companySize || '',
            industry: values.industry || '',
            otherIndustry: values.otherIndustry || '',
          });
          break;
        case 3:
          // Save Step 3 data before going back
          await saveStepProgress(3, {
            teamMembers: values.teamMembers || [],
          });
          break;
        case 4:
          // Save Step 4 data before going back
          await saveStepProgress(4, {
            discoverySource: values.discoverySource || '',
            otherDiscoverySource: values.otherDiscoverySource || '',
            previousAttempts: values.previousAttempts || '',
          });
          break;
      }
    } catch {
      // Silently fail - not critical for navigation
    }

    const prevStep = Math.max(currentStep - 1, 1);
    setCurrentStep(prevStep);
    await updateSavedStep(prevStep); // Update saved step when going back
  }, [
    isSubmitting,
    currentStep,
    form.state.values,
    saveStepProgress,
    updateSavedStep,
  ]);

  const handleSkipStep = useCallback(async () => {
    if (isSubmitting) return;
    if (SKIPPABLE_STEPS.includes(currentStep)) {
      const nextStep = Math.min(currentStep + 1, MAX_STEPS);
      setCurrentStep(nextStep);
      await updateSavedStep(nextStep);
    }
  }, [currentStep, isSubmitting, updateSavedStep]);

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

      toast.success('Welcome! Your account setup is complete.');
      router.push('/dashboard');
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

  return {
    form,
    currentStep,
    isSubmitting,
    isValidating,
    error,
    handleNextStep,
    handlePreviousStep,
    handleSkipStep,
    canGoNext: !isSubmitting && !isValidating && !isLoadingProgress,
    canGoPrevious: currentStep > 1 && !isSubmitting,
    canSkip: SKIPPABLE_STEPS.includes(currentStep) && !isSubmitting,
    retrySubmission,
    isLoadingProgress,
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
