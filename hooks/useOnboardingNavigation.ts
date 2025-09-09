'use client';

import { useCallback } from 'react';
import { toast } from 'sonner';
import { stepSchemas } from '@/lib/validations/onboarding';

const MAX_STEPS = 5;

interface NavigationProps {
  currentStep: number;
  setCurrentStep: (step: number) => void;
  form: any; // TanStack Form instance
  isSubmitting: boolean;
  setIsSubmitting: (value: boolean) => void;
  isValidating: boolean;
  setIsValidating: (value: boolean) => void;
  stepHandlers: {
    handleStep1Submit: (values: any) => Promise<boolean>;
    handleStep2Submit: (values: any) => Promise<boolean>;
    handleStep3Submit: (values: any) => Promise<boolean>;
    handleStep4Submit: (values: any) => Promise<boolean>;
    handleStep5Submit: (values: any) => Promise<boolean>;
  };
  updateSavedStep: (step: number) => Promise<void>;
  saveStepProgress: (step: number, data: any) => Promise<void>;
  canSkip: boolean;
}

/**
 * Hook to handle step navigation in onboarding
 */
export function useOnboardingNavigation({
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
}: NavigationProps) {
  // Validate current step
  const validateCurrentStep = useCallback(async (): Promise<boolean> => {
    setIsValidating(true);
    try {
      const schema = stepSchemas[currentStep as keyof typeof stepSchemas];
      if (!schema) return true;

      // Get current form values
      const values = form.state.values;

      // Extract values for current step
      let stepValues: Partial<OnboardingFormData> = {};
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
            cmsIntegration: values.cmsIntegration,
            otherCms: values.otherCms,
          };
          break;
        case 4:
          stepValues = {
            teamMembers: values.teamMembers,
          };
          break;
        case 5:
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
  }, [currentStep, form.state.values, setIsValidating]);

  // Handle next step navigation
  const handleNextStep = useCallback(async () => {
    // Don't proceed if already submitting or validating
    if (isSubmitting || isValidating) return;

    // Validate current step
    const isValid = await validateCurrentStep();
    if (!isValid) return;

    setIsSubmitting(true);
    const values = form.state.values;
    let success = false;

    try {
      // Handle each step with its specific handler
      switch (currentStep) {
        case 1:
          success = await stepHandlers.handleStep1Submit(values);
          break;
        case 2:
          success = await stepHandlers.handleStep2Submit(values);
          break;
        case 3:
          success = await stepHandlers.handleStep3Submit(values);
          break;
        case 4:
          success = await stepHandlers.handleStep4Submit(values);
          break;
        case 5:
          success = await stepHandlers.handleStep5Submit(values);
          if (success) {
            // Submit the complete form
            await form.handleSubmit();
            return; // Don't advance step after final submission
          }
          break;
      }

      // If step handler succeeded, advance to next step
      if (success && currentStep < MAX_STEPS) {
        const nextStep = Math.min(currentStep + 1, MAX_STEPS);
        setCurrentStep(nextStep);
        await updateSavedStep(nextStep);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [
    currentStep,
    form,
    isSubmitting,
    isValidating,
    validateCurrentStep,
    stepHandlers,
    setCurrentStep,
    setIsSubmitting,
    updateSavedStep,
  ]);

  // Handle previous step navigation
  const handlePreviousStep = useCallback(async () => {
    if (isSubmitting) return;

    // Save current step data before going back
    const values = form.state.values;

    try {
      switch (currentStep) {
        case 1:
          await saveStepProgress(1, {
            useCases: values.useCases || [],
            otherUseCase: values.otherUseCase || '',
          });
          break;
        case 2:
          await saveStepProgress(2, {
            professionalRole: values.professionalRole || '',
            otherProfessionalRole: values.otherProfessionalRole || '',
            companySize: values.companySize || '',
            industry: values.industry || '',
            otherIndustry: values.otherIndustry || '',
          });
          break;
        case 3:
          await saveStepProgress(3, {
            cmsIntegration: values.cmsIntegration || '',
            otherCms: values.otherCms || '',
          });
          break;
        case 4:
          await saveStepProgress(4, {
            teamMembers: values.teamMembers || [],
          });
          break;
        case 5:
          await saveStepProgress(5, {
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
    await updateSavedStep(prevStep);
  }, [
    isSubmitting,
    currentStep,
    form.state.values,
    saveStepProgress,
    setCurrentStep,
    updateSavedStep,
  ]);

  // Handle skip step
  const handleSkipStep = useCallback(async () => {
    if (isSubmitting) return;
    if (canSkip) {
      const nextStep = Math.min(currentStep + 1, MAX_STEPS);
      setCurrentStep(nextStep);
      await updateSavedStep(nextStep);
    }
  }, [currentStep, isSubmitting, setCurrentStep, updateSavedStep, canSkip]);

  return {
    handleNextStep,
    handlePreviousStep,
    handleSkipStep,
  };
}
