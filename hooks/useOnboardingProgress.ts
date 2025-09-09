'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { OnboardingFormData } from '@/lib/validations/onboarding';

interface UseOnboardingProgressProps {
  initialData?: any;
  form: any; // TanStack Form instance
  setCurrentStep: (step: number) => void;
  setWorkspaceId: (id: string | null) => void;
}

/**
 * Hook to handle onboarding progress loading and saving
 */
export function useOnboardingProgress({
  initialData,
  form,
  setCurrentStep,
  setWorkspaceId,
}: UseOnboardingProgressProps) {
  const router = useRouter();
  const hasLoadedProgress = useRef(false);

  // Load progress on mount
  useEffect(() => {
    // Skip if initial data was provided (server-side rendered)
    if (initialData || hasLoadedProgress.current) return;
    hasLoadedProgress.current = true;

    const loadProgress = async () => {
      try {
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
              savedData.currentStep <= 5
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

            // Step 3 data (CMS integration)
            if (savedData.cmsIntegration)
              formData.cmsIntegration = savedData.cmsIntegration;
            if (savedData.otherCms) formData.otherCms = savedData.otherCms;

            // Step 4 data (team members)
            if (savedData.teamMembers)
              formData.teamMembers = savedData.teamMembers;

            // Step 5 data
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
  }, [router, form, initialData, setCurrentStep, setWorkspaceId]);

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
