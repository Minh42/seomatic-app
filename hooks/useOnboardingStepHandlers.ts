'use client';

import { useCallback } from 'react';
import { toast } from 'sonner';
import { OnboardingFormData } from '@/lib/validations/onboarding';
import { OnboardingError } from '@/lib/errors/onboarding-errors';
import { FormApi } from '@tanstack/react-form';

interface StepHandlersProps {
  form: FormApi<OnboardingFormData, any>;
  setOrganizationId: (id: string | null) => void;
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
  setOrganizationId,
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

  // Step 2: Create organization, workspace, and save profile data
  const handleStep2Submit = useCallback(
    async (values: OnboardingFormData) => {
      const organizationName = values.organizationName;
      if (!organizationName) {
        toast.error('Please enter an organization name');
        return false;
      }

      try {
        // Create organization and default workspace
        const response = await fetch('/api/onboarding/step2', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organizationName,
            professionalRole: values.professionalRole || '',
            otherProfessionalRole: values.otherProfessionalRole || '',
            companySize: values.companySize || '',
            industry: values.industry || '',
            otherIndustry: values.otherIndustry || '',
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          const errorMessage = data.error || 'Failed to create organization';
          setError({
            message: errorMessage,
            code: data.code || 'ORGANIZATION_ERROR',
            field: data.field || 'organizationName',
          });
          toast.error(errorMessage);
          return false;
        }

        // Save the organization ID for later use
        if (data.organizationId) {
          setOrganizationId(data.organizationId);
        }

        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Failed to update organization name';

        setError(
          err instanceof OnboardingError
            ? err
            : {
                message: errorMessage,
                code: 'ORGANIZATION_ERROR',
                field: 'organizationName',
              }
        );

        toast.error(errorMessage);
        return false;
      }
    },
    [saveStepProgress, setError]
  );

  // Step 3: Send team invitations
  const handleStep3Submit = useCallback(async (values: OnboardingFormData) => {
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

      // Show appropriate feedback
      if (data.invitations) {
        const sentCount =
          data.invitations?.filter(
            (i: { status: string }) => i.status === 'sent'
          ).length || 0;
        const failCount =
          data.invitations?.filter(
            (i: { status: string }) => i.status === 'failed'
          ).length || 0;

        if (sentCount > 0 && failCount === 0) {
          toast.success(
            `${sentCount} invitation${sentCount > 1 ? 's' : ''} sent successfully`
          );
        } else if (sentCount > 0 && failCount > 0) {
          toast.warning(
            `${sentCount} invitation${sentCount > 1 ? 's' : ''} sent, ${failCount} failed`
          );
        } else if (failCount > 0) {
          toast.error(
            `Failed to send ${failCount} invitation${failCount > 1 ? 's' : ''}`
          );
        }
      }

      return true;
    } catch (error) {
      console.error('Error processing team invitations:', error);
      toast.error('Failed to process team invitations');
      return false;
    }
  }, []);

  // Step 4: Save CMS integration
  const handleStep4Submit = useCallback(
    async (values: OnboardingFormData) => {
      await saveStepProgress(4, {
        cmsIntegration: values.cmsIntegration || '',
        otherCms: values.otherCms || '',
      });
      return true;
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
  const retryOrganizationCreation = useCallback(
    async (newName: string) => {
      try {
        // Update the form value with the new name
        form.setFieldValue('organizationName', newName);

        // This is actually retrying the organization creation during onboarding
        // We just need to update the form value and return success
        // The actual organization creation happens in the onboarding submission
        setError(null);
        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Failed to update organization name';

        setError(
          err instanceof OnboardingError
            ? err
            : {
                message: errorMessage,
                code: 'ORGANIZATION_ERROR',
                field: 'organizationName',
              }
        );

        toast.error(errorMessage);
        return false;
      }
    },
    [form, setError]
  );

  return {
    handleStep1Submit,
    handleStep2Submit,
    handleStep3Submit,
    handleStep4Submit,
    handleStep5Submit,
    retryOrganizationCreation,
  };
}
