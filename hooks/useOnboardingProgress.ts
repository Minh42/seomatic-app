'use client';

import { useCallback } from 'react';
import { OnboardingFormData } from '@/lib/validations/onboarding';

/**
 * Hook to handle onboarding progress saving only
 * Loading is handled server-side to prevent duplicate fetching
 */
export function useOnboardingProgress() {
  // Save progress for a specific step
  const saveStepProgress = useCallback(
    async (step: number, stepData: Partial<OnboardingFormData>) => {
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
    },
    []
  );

  // Update only the step number
  const updateSavedStep = useCallback(async (newStep: number) => {
    try {
      await fetch('/api/onboarding/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: newStep }),
      });
    } catch {
      // Silently fail - not critical
    }
  }, []);

  return {
    saveStepProgress,
    updateSavedStep,
  };
}
