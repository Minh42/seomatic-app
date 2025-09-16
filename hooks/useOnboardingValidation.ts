'use client';

import { useMemo } from 'react';
import { OnboardingFormData } from '@/lib/validations/onboarding';

const SKIPPABLE_STEPS = [3]; // Only team members step is skippable

interface UseOnboardingValidationReturn {
  canGoNext: boolean;
  canGoPrevious: boolean;
  canSkip: boolean;
  isStepValid: boolean;
}

/**
 * Hook to handle onboarding step validation logic
 * Determines if user can navigate between steps based on form data
 */
export function useOnboardingValidation(
  currentStep: number,
  formValues: Partial<OnboardingFormData>,
  isSubmitting: boolean = false,
  isValidating: boolean = false
): UseOnboardingValidationReturn {
  const isStepValid = useMemo(() => {
    switch (currentStep) {
      case 1:
        // Step 1: Must have at least one use case selected
        const hasUseCases =
          formValues.useCases &&
          Array.isArray(formValues.useCases) &&
          formValues.useCases.length > 0;
        if (!hasUseCases) return false;
        // If "other" is selected, must have description
        if (
          formValues.useCases.includes('other') &&
          !formValues.otherUseCase?.trim()
        )
          return false;
        return true;

      case 2:
        // Step 2: Must have all required fields
        if (!formValues.organizationName?.trim()) return false;
        if (!formValues.professionalRole) return false;
        if (
          formValues.professionalRole === 'Other' &&
          !formValues.otherProfessionalRole?.trim()
        )
          return false;
        if (!formValues.companySize) return false;
        if (!formValues.industry) return false;
        if (
          formValues.industry === 'Other' &&
          !formValues.otherIndustry?.trim()
        )
          return false;
        return true;

      case 3:
        // Step 3: Team members is optional (skippable)
        return true;

      case 4:
        // Step 4: Must have CMS integration selected (either main platform or dropdown)
        const hasCmsSelection =
          formValues.cmsIntegration || formValues.otherCms;
        return !!hasCmsSelection;

      case 5:
        // Step 5: Must have discovery source
        if (!formValues.discoverySource) return false;
        if (
          formValues.discoverySource === 'Other' &&
          !formValues.otherDiscoverySource?.trim()
        )
          return false;
        return true;

      default:
        return true;
    }
  }, [currentStep, formValues]);

  const canGoNext = useMemo(() => {
    const result = !isSubmitting && !isValidating && isStepValid;
    return result;
  }, [isSubmitting, isValidating, isStepValid]);

  const canGoPrevious = useMemo(() => {
    return currentStep > 1 && !isSubmitting && !isValidating;
  }, [currentStep, isSubmitting, isValidating]);

  const canSkip = useMemo(() => {
    return (
      SKIPPABLE_STEPS.includes(currentStep) && !isSubmitting && !isValidating
    );
  }, [currentStep, isSubmitting, isValidating]);

  return {
    canGoNext,
    canGoPrevious,
    canSkip,
    isStepValid,
  };
}
