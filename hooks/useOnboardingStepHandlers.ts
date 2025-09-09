'use client';

import { useCallback } from 'react';
import { toast } from 'sonner';
import { OnboardingFormData } from '@/lib/validations/onboarding';
import {
  OnboardingError,
  DuplicateWorkspaceError,
  WorkspaceError,
} from '@/lib/errors/onboarding-errors';
import { FormApi } from '@tanstack/react-form';

interface StepHandlersProps {
  form: FormApi<OnboardingFormData, any>;
  setWorkspaceId: (id: string | null) => void;
  setError: (error: any) => void;
  saveStepProgress: (
    step: number,
    data: Partial<OnboardingFormData>
  ) => Promise<void>;
}

/**
 * Hook containing step-specific submission handlers
 */
export function useOnboardingStepHandlers({
  form,
  setWorkspaceId,
  setError,
  saveStepProgress,
}: StepHandlersProps) {
  // Step 1: Save use cases
  const handleStep1Submit = useCallback(
    async (values: OnboardingFormData) => {
      await saveStepProgress(1, {
        useCases: values.useCases || [],
        otherUseCase: values.otherUseCase || '',
      });
      return true;
    },
    [saveStepProgress]
  );

  // Step 2: Create workspace and save profile data
  const handleStep2Submit = useCallback(
    async (values: OnboardingFormData) => {
      const workspaceName = values.workspaceName;
      if (!workspaceName) {
        toast.error('Please enter a workspace name');
        return false;
      }

      try {
        // Create workspace via API
        const response = await fetch('/api/workspace', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: workspaceName }),
        });

        const data = await response.json();

        if (!response.ok) {
          // Handle duplicate workspace name
          if (response.status === 409) {
            throw new DuplicateWorkspaceError(workspaceName);
          }
          throw new WorkspaceError(data.error || 'Failed to create workspace');
        }

        // Store workspace ID for final submission
        setWorkspaceId(data.workspace.id);

        // Save the Step 2 form data
        await saveStepProgress(2, {
          professionalRole: values.professionalRole || '',
          otherProfessionalRole: values.otherProfessionalRole || '',
          companySize: values.companySize || '',
          industry: values.industry || '',
          otherIndustry: values.otherIndustry || '',
        });

        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to create workspace';

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
        return false;
      }
    },
    [setWorkspaceId, setError, saveStepProgress]
  );

  // Step 3: Save CMS integration
  const handleStep3Submit = useCallback(
    async (values: OnboardingFormData) => {
      await saveStepProgress(3, {
        cmsIntegration: values.cmsIntegration || '',
        otherCms: values.otherCms || '',
      });
      return true;
    },
    [saveStepProgress]
  );

  // Step 4: Send team invitations
  const handleStep4Submit = useCallback(
    async (values: OnboardingFormData) => {
      try {
        // Use the team API endpoint to handle invitations
        const response = await fetch('/api/team/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ teamMembers: values.teamMembers || [] }),
        });

        const data = await response.json();

        if (!response.ok) {
          toast.error(data.error || 'Failed to process team members');
          return false;
        }

        // Only show error toasts
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
        await saveStepProgress(4, {
          teamMembers: values.teamMembers || [],
        });

        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to send invitations';
        toast.error(errorMessage);
        return false;
      }
    },
    [saveStepProgress]
  );

  // Step 5: Save discovery data before final submission
  const handleStep5Submit = useCallback(
    async (values: OnboardingFormData) => {
      await saveStepProgress(5, {
        discoverySource: values.discoverySource || '',
        otherDiscoverySource: values.otherDiscoverySource || '',
        previousAttempts: values.previousAttempts || '',
      });
      return true;
    },
    [saveStepProgress]
  );

  // Retry workspace creation with a new name
  const retryWorkspaceCreation = useCallback(
    async (newName: string) => {
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
            throw new DuplicateWorkspaceError(workspaceName);
          }
          throw new WorkspaceError(data.error || 'Failed to create workspace');
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

        // Clear error
        setError(null);
        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to create workspace';

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
        return false;
      }
    },
    [form, setWorkspaceId, setError, saveStepProgress]
  );

  return {
    handleStep1Submit,
    handleStep2Submit,
    handleStep3Submit,
    handleStep4Submit,
    handleStep5Submit,
    retryWorkspaceCreation,
  };
}
