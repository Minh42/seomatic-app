'use client';

import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StepComponentProps } from '@/types/form';
import { workspaceNameSchema } from '@/lib/validations/onboarding';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { WorkspaceRecovery } from './WorkspaceRecovery';

const PROFESSIONAL_ROLES = [
  'Founder',
  'Marketing Manager',
  'Content Strategist',
  'SEO Specialist',
  'Developer',
  'Agency Professional',
  'Freelancer',
  'Other',
];

const COMPANY_SIZES = [
  'Just me',
  '2-10 employees',
  '11-50 employees',
  '51-200 employees',
  '201-1000 employees',
  '1000+ employees',
];

const INDUSTRIES = [
  'E-commerce',
  'SaaS',
  'Media or Publishing',
  'Professional Services',
  'Healthcare',
  'Education',
  'Finance or Insurance',
  'Real Estate',
  'Travel or Hospitality',
  'Marketing or Advertising',
  'Nonprofit',
  'Agency or Consulting',
  'Other',
];

interface Step2Props extends StepComponentProps {
  workspaceId?: string | null;
}

export function Step2WorkspaceInfo({
  form,
  isSubmitting,
  error,
  onRetryWorkspace,
  onCancelWorkspaceRecovery,
  workspaceId,
}: Step2Props) {
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [availabilityStatus, setAvailabilityStatus] = useState<{
    available?: boolean;
    message?: string;
  }>({});

  // Get current workspace name value
  const [workspaceName, setWorkspaceName] = useState('');
  const debouncedWorkspaceName = useDebounce(workspaceName, 300);

  // Check workspace name availability
  const checkAvailability = useCallback(
    async (name: string) => {
      if (!name || name.length < 2) {
        setAvailabilityStatus({});
        return;
      }

      // First validate the format
      try {
        workspaceNameSchema.parse(name);
      } catch {
        // Format is invalid, no need to check availability
        setAvailabilityStatus({});
        return;
      }

      setIsCheckingAvailability(true);
      setAvailabilityStatus({});

      try {
        const response = await fetch('/api/workspace/check-name', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name,
            currentWorkspaceId: workspaceId,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          setAvailabilityStatus({
            available: data.available,
            message: data.message,
          });
        } else {
          setAvailabilityStatus({
            available: false,
            message: data.error || 'Failed to check availability',
          });
        }
      } catch (error) {
        console.error('Error checking workspace name:', error);
        setAvailabilityStatus({
          available: false,
          message: 'Failed to check availability',
        });
      } finally {
        setIsCheckingAvailability(false);
      }
    },
    [workspaceId]
  );

  // Check availability when name changes (debounced)
  useEffect(() => {
    if (debouncedWorkspaceName) {
      checkAvailability(debouncedWorkspaceName);
    } else {
      setAvailabilityStatus({});
    }
  }, [debouncedWorkspaceName, checkAvailability]);

  // Show workspace recovery UI if there's a workspace-related error
  const isWorkspaceError =
    error &&
    (error.code === 'DUPLICATE_WORKSPACE' ||
      error.code === 'WORKSPACE_ERROR' ||
      error.field === 'workspaceName');

  if (isWorkspaceError && onRetryWorkspace && onCancelWorkspaceRecovery) {
    return (
      <div>
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
            Let&apos;s fix your workspace setup
          </h1>
          <p className="text-gray-600">
            We encountered an issue creating your workspace. Let&apos;s resolve
            it together.
          </p>
        </div>

        <WorkspaceRecovery
          error={error}
          originalName={form.state.values.workspaceName || 'My Workspace'}
          onRetry={onRetryWorkspace}
          onCancel={onCancelWorkspaceRecovery}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
          What would you like to name your Workspace?{' '}
          <span className="text-gray-500 text-base md:text-lg font-normal">
            (~ 1 min)
          </span>
        </h1>
        <p className="text-gray-600">
          Your Workspace is where you can find all your projects and collaborate
          with your team.
        </p>
      </div>

      <div className="space-y-4 md:space-y-6">
        <form.Field
          name="workspaceName"
          validators={{
            onBlur: ({ value }: { value: any }) => {
              // Validate format first
              try {
                if (!value) {
                  return 'Workspace name is required';
                }
                workspaceNameSchema.parse(value);

                // If format is valid and we have availability info, check if it's taken
                if (
                  availabilityStatus.available === false &&
                  value === debouncedWorkspaceName
                ) {
                  return 'Workspace name is already taken';
                }

                return undefined;
              } catch (error: any) {
                // Return the validation error message
                if (error.errors && error.errors[0]) {
                  return error.errors[0].message;
                }
                return 'Invalid workspace name';
              }
            },
          }}
        >
          {(field: any) => (
            <div>
              <Label htmlFor="workspace-name">Workspace name</Label>
              <div className="relative">
                <Input
                  id="workspace-name"
                  placeholder="My Workspace"
                  value={field.state.value || ''}
                  onChange={e => {
                    field.handleChange(e.target.value);
                    setWorkspaceName(e.target.value);
                  }}
                  onBlur={field.handleBlur}
                  disabled={isSubmitting}
                  className={`mt-2 pr-10 ${
                    field.state.meta.isTouched &&
                    field.state.meta.errors.length > 0
                      ? 'border-red-500'
                      : field.state.meta.isTouched &&
                          availabilityStatus.available === true
                        ? 'border-green-500'
                        : ''
                  }`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 mt-1">
                  {isCheckingAvailability && (
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  )}
                  {!isCheckingAvailability &&
                    field.state.meta.isTouched &&
                    availabilityStatus.available === true &&
                    field.state.value === debouncedWorkspaceName && (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                  {!isCheckingAvailability &&
                    field.state.meta.isTouched &&
                    availabilityStatus.available === false &&
                    field.state.value === debouncedWorkspaceName && (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                </div>
              </div>
              <p className="text-sm mt-1">
                {field.state.meta.isTouched &&
                field.state.meta.errors.length > 0 ? (
                  <span className="text-red-600">
                    {field.state.meta.errors[0]}
                  </span>
                ) : field.state.meta.isTouched &&
                  availabilityStatus.available === false &&
                  field.state.value === debouncedWorkspaceName ? (
                  <span className="text-red-600">
                    {availabilityStatus.message ||
                      'Workspace name is not available'}
                  </span>
                ) : field.state.meta.isTouched &&
                  availabilityStatus.available === true &&
                  field.state.value === debouncedWorkspaceName ? (
                  <span className="text-green-600">
                    Workspace name is available
                  </span>
                ) : (
                  <span className="text-gray-500">
                    Must be 2-50 characters, start and end with a letter or
                    number
                  </span>
                )}
              </p>
            </div>
          )}
        </form.Field>

        <form.Field name="professionalRole">
          {(field: any) => (
            <div>
              <Label htmlFor="professional-role">
                Please select your primary professional role
              </Label>
              <Select
                value={field.state.value || ''}
                onValueChange={value => {
                  field.handleChange(value);
                  // Force form to re-render when selecting Other
                  form.setFieldValue('professionalRole', value);
                }}
                disabled={isSubmitting}
              >
                <SelectTrigger className="mt-2 w-full">
                  <SelectValue placeholder="Choose an option..." />
                </SelectTrigger>
                <SelectContent>
                  {PROFESSIONAL_ROLES.map(role => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {field.state.meta.errors.length > 0 && (
                <p className="text-sm text-red-600 mt-1">
                  {field.state.meta.errors[0]}
                </p>
              )}
            </div>
          )}
        </form.Field>

        <form.Subscribe selector={state => state.values.professionalRole}>
          {professionalRole =>
            professionalRole === 'Other' && (
              <form.Field name="otherProfessionalRole">
                {(field: any) => (
                  <div>
                    <Textarea
                      placeholder="Please specify your professional role..."
                      value={field.state.value || ''}
                      onChange={e => field.handleChange(e.target.value)}
                      disabled={isSubmitting}
                      className="w-full"
                      rows={3}
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-red-600 mt-1">
                        {field.state.meta.errors[0]}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>
            )
          }
        </form.Subscribe>

        <form.Field name="companySize">
          {(field: any) => (
            <div>
              <Label htmlFor="company-size">
                What is the size of your company?
              </Label>
              <Select
                value={field.state.value || ''}
                onValueChange={field.handleChange}
                disabled={isSubmitting}
              >
                <SelectTrigger className="mt-2 w-full">
                  <SelectValue placeholder="Choose an option..." />
                </SelectTrigger>
                <SelectContent>
                  {COMPANY_SIZES.map(size => (
                    <SelectItem key={size} value={size}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {field.state.meta.errors.length > 0 && (
                <p className="text-sm text-red-600 mt-1">
                  {field.state.meta.errors[0]}
                </p>
              )}
            </div>
          )}
        </form.Field>

        <form.Field name="industry">
          {(field: any) => (
            <div>
              <Label htmlFor="industry">
                Which industry best describes your organization?
              </Label>
              <Select
                value={field.state.value || ''}
                onValueChange={value => {
                  field.handleChange(value);
                  // Force form to re-render when selecting Other
                  form.setFieldValue('industry', value);
                }}
                disabled={isSubmitting}
              >
                <SelectTrigger className="mt-2 w-full">
                  <SelectValue placeholder="Choose an option..." />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map(ind => (
                    <SelectItem key={ind} value={ind}>
                      {ind}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {field.state.meta.errors.length > 0 && (
                <p className="text-sm text-red-600 mt-1">
                  {field.state.meta.errors[0]}
                </p>
              )}
            </div>
          )}
        </form.Field>

        <form.Subscribe selector={state => state.values.industry}>
          {industry =>
            industry === 'Other' && (
              <form.Field name="otherIndustry">
                {(field: any) => (
                  <div>
                    <Textarea
                      placeholder="Please specify your industry..."
                      value={field.state.value || ''}
                      onChange={e => field.handleChange(e.target.value)}
                      disabled={isSubmitting}
                      className="w-full"
                      rows={3}
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-red-600 mt-1">
                        {field.state.meta.errors[0]}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>
            )
          }
        </form.Subscribe>
      </div>
    </div>
  );
}
