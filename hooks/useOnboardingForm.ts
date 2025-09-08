'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
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
  retryWorkspaceCreation: (newName: string) => Promise<void>;
  clearWorkspaceError: () => void;
  isLoadingProgress: boolean;
  workspaceId: string | null;
}

const MAX_STEPS = 4;
const SKIPPABLE_STEPS = [3]; // Only team members step is skippable

class OnboardingError extends Error {
  field?: string;
  code?: string;

  constructor(message: string, field?: string, code?: string) {
    super(message);
    this.field = field;
    this.code = code;
  }
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
    discoverySource: string;
    otherDiscoverySource: string;
    previousAttempts: string;
    teamMembers: any[];
    workspaceName?: string;
  };
  workspaceId: string | null;
  workspaceName: string;
}

export function useOnboardingForm(
  initialData?: InitialData
): UseOnboardingFormReturn {
  const router = useRouter();

  // Use initial data if provided (server-side), otherwise defaults
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
  const [isLoadingProgress] = useState(false); // Start with false for optimistic UI
  const hasLoadedProgress = useRef(false);
  const [, forceUpdate] = useState({});

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
        teamMembers: initialData.onboardingData.teamMembers || [],
        discoverySource: initialData.onboardingData.discoverySource || '',
        otherDiscoverySource:
          initialData.onboardingData.otherDiscoverySource || '',
        previousAttempts: initialData.onboardingData.previousAttempts || '',
      }
    : defaultOnboardingValues;

  const form = useForm({
    defaultValues: formDefaults,
    onFieldChange: () => {
      // Force re-render when any field changes
      forceUpdate({});
    },
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

  // Load progress in the background without blocking UI (only if no initial data)
  useEffect(() => {
    // Skip if initial data was provided (server-side rendered)
    if (initialData || hasLoadedProgress.current) return;
    hasLoadedProgress.current = true;

    const loadProgress = async () => {
      try {
        // Use the unified progress endpoint
        const response = await fetch('/api/onboarding/progress');
        if (response.ok) {
          const data = await response.json();

          // If onboarding is already completed, redirect
          if (data.completed) {
            router.push('/dashboard');
            return;
          }

          // Apply saved data if available
          if (data.data) {
            const savedData = data.data;

            // Set current step
            if (
              savedData.currentStep &&
              savedData.currentStep >= 1 &&
              savedData.currentStep <= 4
            ) {
              setCurrentStep(savedData.currentStep);
            }

            // Set workspace info
            if (savedData.workspaceId) {
              setWorkspaceId(savedData.workspaceId);
            }

            // Update form values
            const formData: Partial<OnboardingFormData> = {};

            // Step 1 data
            if (savedData.useCases) formData.useCases = savedData.useCases;
            if (savedData.otherUseCase)
              formData.otherUseCase = savedData.otherUseCase;

            // Step 2 data
            if (savedData.workspaceName)
              formData.workspaceName = savedData.workspaceName;
            if (savedData.professionalRole)
              formData.professionalRole = savedData.professionalRole;
            if (savedData.otherProfessionalRole)
              formData.otherProfessionalRole = savedData.otherProfessionalRole;
            if (savedData.companySize)
              formData.companySize = savedData.companySize;
            if (savedData.industry) formData.industry = savedData.industry;
            if (savedData.otherIndustry)
              formData.otherIndustry = savedData.otherIndustry;

            // Step 3 data (team members)
            if (savedData.teamMembers)
              formData.teamMembers = savedData.teamMembers;

            // Step 4 data
            if (savedData.discoverySource)
              formData.discoverySource = savedData.discoverySource;
            if (savedData.otherDiscoverySource)
              formData.otherDiscoverySource = savedData.otherDiscoverySource;
            if (savedData.previousAttempts)
              formData.previousAttempts = savedData.previousAttempts;

            // Apply all form values at once
            Object.entries(formData).forEach(([key, value]) => {
              if (value !== undefined && value !== null) {
                form.setFieldValue(key, value);
              }
            });
          }
        }
      } catch (error) {
        console.error('Failed to load progress:', error);
      }
    };

    // Load progress without blocking UI
    loadProgress();
  }, [router, form, initialData]);

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
      const response = await fetch('/api/onboarding/progress', {
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
      await fetch('/api/onboarding/progress', {
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

        // Removed success toast - just progress smoothly
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
    // Step 3: Team members - send invitations immediately
    else if (currentStep === 3) {
      setIsSubmitting(true);
      try {
        // Always call the API to handle both sending new invitations and deleting removed ones
        // Even if teamMembers is empty, we need to delete any existing invitations
        const response = await fetch('/api/team/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ teamMembers: values.teamMembers || [] }),
        });

        const data = await response.json();

        if (!response.ok) {
          toast.error(data.error || 'Failed to process team members');
          // Don't proceed if the request failed
          setIsSubmitting(false);
          return;
        }

        // Only show error toasts - success/info toasts are too disruptive during onboarding
        if (data.invitations) {
          const failCount =
            data.invitations?.filter(
              (i: { status: string }) => i.status === 'failed'
            ).length || 0;

          if (failCount > 0) {
            toast.error(
              `${failCount} invitation${failCount !== 1 ? 's' : ''} failed to send`
            );
          }
        }

        // Save team members data
        await saveStepProgress(3, {
          teamMembers: values.teamMembers || [],
        });

        const nextStep = Math.min(currentStep + 1, MAX_STEPS);
        setCurrentStep(nextStep);
        await updateSavedStep(nextStep);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to send invitations';
        toast.error(errorMessage);
      } finally {
        setIsSubmitting(false);
      }
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
        case 1:
          // Save Step 1 data before going back (shouldn't happen but just in case)
          await saveStepProgress(1, {
            useCases: values.useCases || [],
            otherUseCase: values.otherUseCase || '',
          });
          break;
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

  const retryWorkspaceCreation = useCallback(
    async (newName: string) => {
      if (isSubmitting) return;

      setIsSubmitting(true);
      setError(null);

      try {
        // Update the form value with the new name
        form.setFieldValue('workspaceName', newName);

        const response = await fetch('/api/workspace', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newName }),
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

        // Save the workspace data and other Step 2 form data
        const values = form.state.values;
        await saveStepProgress(2, {
          professionalRole: values.professionalRole || '',
          otherProfessionalRole: values.otherProfessionalRole || '',
          companySize: values.companySize || '',
          industry: values.industry || '',
          otherIndustry: values.otherIndustry || '',
        });

        // Removed success toast - just progress smoothly

        // Clear error and move to next step
        setError(null);
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
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, form, currentStep, saveStepProgress, updateSavedStep]
  );

  const clearWorkspaceError = useCallback(() => {
    setError(null);
  }, []);

  // Check if current step has valid data for enabling Next button
  // Using form.state.values directly for reactivity
  const isStepValid = () => {
    const values = form.state.values;

    switch (currentStep) {
      case 1:
        // Step 1: Must have at least one use case selected
        const hasUseCases =
          values.useCases &&
          Array.isArray(values.useCases) &&
          values.useCases.length > 0;
        if (!hasUseCases) return false;
        // If "other" is selected, must have description
        if (values.useCases.includes('other') && !values.otherUseCase?.trim())
          return false;
        return true;

      case 2:
        // Step 2: Must have all required fields
        if (!values.workspaceName?.trim()) return false;
        if (!values.professionalRole) return false;
        if (
          values.professionalRole === 'Other' &&
          !values.otherProfessionalRole?.trim()
        )
          return false;
        if (!values.companySize) return false;
        if (!values.industry) return false;
        if (values.industry === 'Other' && !values.otherIndustry?.trim())
          return false;
        return true;

      case 3:
        // Step 3: Team members is optional (skippable)
        return true;

      case 4:
        // Step 4: Must have discovery source
        if (!values.discoverySource) return false;
        if (
          values.discoverySource === 'Other' &&
          !values.otherDiscoverySource?.trim()
        )
          return false;
        return true;

      default:
        return true;
    }
  };

  // Make these functions so they re-evaluate on each render
  const getCanGoNext = () => !isSubmitting && !isValidating && isStepValid();
  const getCanGoPrevious = () =>
    currentStep > 1 && !isSubmitting && !isValidating;
  const getCanSkip = () =>
    SKIPPABLE_STEPS.includes(currentStep) && !isSubmitting && !isValidating;

  return {
    form,
    currentStep,
    isSubmitting,
    isValidating,
    error,
    handleNextStep,
    handlePreviousStep,
    handleSkipStep,
    canGoNext: getCanGoNext(),
    canGoPrevious: getCanGoPrevious(),
    canSkip: getCanSkip(),
    retrySubmission,
    retryWorkspaceCreation,
    clearWorkspaceError,
    isLoadingProgress,
    workspaceId,
  };
}
