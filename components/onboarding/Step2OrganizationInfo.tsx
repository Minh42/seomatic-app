'use client';

import { useState, useEffect, useCallback, useDeferredValue } from 'react';
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
import { organizationNameSchema } from '@/lib/validations/onboarding';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { OrganizationRecovery } from './OrganizationRecovery';

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
  organizationId?: string | null;
  onRetryOrganization: (newName: string) => Promise<void>;
  onCancelOrganizationRecovery: () => void;
}

export function Step2OrganizationInfo({
  form,
  isSubmitting,
  error,
  onRetryOrganization,
  onCancelOrganizationRecovery,
  organizationId,
}: Step2Props) {
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [availabilityStatus, setAvailabilityStatus] = useState<{
    available?: boolean;
    message?: string;
  }>({});

  // Get current organization name value
  const [organizationName, setOrganizationName] = useState('');
  const debouncedOrganizationName = useDeferredValue(organizationName);

  // Check workspace name availability
  const checkAvailability = useCallback(
    async (name: string) => {
      if (!name || name.length < 2) {
        setAvailabilityStatus({});
        return;
      }

      // First validate the format
      try {
        organizationNameSchema.parse(name);
      } catch {
        // Format is invalid, no need to check availability
        setAvailabilityStatus({});
        return;
      }

      setIsCheckingAvailability(true);
      setAvailabilityStatus({});

      try {
        const response = await fetch('/api/organization/check-name', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name,
            currentOrganizationId: organizationId,
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
        console.error('Error checking organization name:', error);
        setAvailabilityStatus({
          available: false,
          message: 'Failed to check availability',
        });
      } finally {
        setIsCheckingAvailability(false);
      }
    },
    [organizationId]
  );

  // Check availability when name changes (debounced)
  useEffect(() => {
    if (debouncedOrganizationName) {
      checkAvailability(debouncedOrganizationName);
    } else {
      setAvailabilityStatus({});
    }
  }, [debouncedOrganizationName, checkAvailability]);

  // Show organization recovery UI if there's an organization-related error
  const isOrganizationError =
    error &&
    (error.code === 'DUPLICATE_ORGANIZATION' ||
      error.code === 'ORGANIZATION_ERROR' ||
      error.field === 'organizationName');

  if (
    isOrganizationError &&
    onRetryOrganization &&
    onCancelOrganizationRecovery
  ) {
    return (
      <div>
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
            Let&apos;s fix your organization setup
          </h1>
          <p className="text-gray-600">
            We encountered an issue creating your organization. Let&apos;s
            resolve it together.
          </p>
        </div>

        <OrganizationRecovery
          error={error}
          originalName={form.state.values.organizationName || 'My Organization'}
          onRetry={onRetryOrganization}
          onCancel={onCancelOrganizationRecovery}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
          What would you like to name your organization?{' '}
          <span className="text-gray-500 text-base md:text-lg font-normal">
            (~ 1 min)
          </span>
        </h1>
        <p className="text-gray-600">
          Share your company details and role so we can set up your
          organization.
        </p>
      </div>

      <div className="space-y-4 md:space-y-6">
        <form.Field
          name="organizationName"
          validators={{
            onBlur: ({ value }: { value: any }) => {
              // Validate format first
              try {
                if (!value) {
                  return 'Organization name is required';
                }
                organizationNameSchema.parse(value);

                // If format is valid and we have availability info, check if it's taken
                if (
                  availabilityStatus.available === false &&
                  value === debouncedOrganizationName
                ) {
                  return 'Organization name is already taken';
                }

                return undefined;
              } catch (error: any) {
                // Return the validation error message
                if (error.issues && error.issues[0]) {
                  return error.issues[0].message;
                }
                return 'Invalid organization name';
              }
            },
          }}
        >
          {(field: any) => (
            <div>
              <Label htmlFor="organization-name">Organization name</Label>
              <div className="relative">
                <Input
                  id="organization-name"
                  placeholder="My Organization"
                  value={field.state.value || ''}
                  onChange={e => {
                    field.handleChange(e.target.value);
                    setOrganizationName(e.target.value);
                  }}
                  onBlur={field.handleBlur}
                  disabled={isSubmitting}
                  className={`mt-2 pr-10 ${
                    (field.state.meta.isTouched &&
                      field.state.meta.errors.length > 0) ||
                    (field.state.meta.isTouched &&
                      availabilityStatus.available === false &&
                      field.state.value === debouncedOrganizationName)
                      ? 'border-red-500'
                      : field.state.meta.isTouched &&
                          availabilityStatus.available === true &&
                          field.state.value === debouncedOrganizationName
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
                    field.state.value === debouncedOrganizationName && (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                  {!isCheckingAvailability &&
                    field.state.meta.isTouched &&
                    availabilityStatus.available === false &&
                    field.state.value === debouncedOrganizationName && (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                </div>
              </div>
              {field.state.meta.isTouched && (
                <p className="text-sm mt-1">
                  {field.state.meta.errors.length > 0 ? (
                    <span className="text-red-600">
                      {field.state.meta.errors[0]}
                    </span>
                  ) : availabilityStatus.available === false &&
                    field.state.value === debouncedOrganizationName ? (
                    <span className="text-red-600">
                      {availabilityStatus.message ||
                        'Organization name is not available'}
                    </span>
                  ) : availabilityStatus.available === true &&
                    field.state.value === debouncedOrganizationName ? (
                    <span className="text-green-600">
                      Organization name is available
                    </span>
                  ) : null}
                </p>
              )}
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

        <form.Subscribe
          selector={(state: any) => state.values.professionalRole}
        >
          {(professionalRole: any) =>
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
                Which industry best describes you?
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

        <form.Subscribe selector={(state: any) => state.values.industry}>
          {(industry: any) =>
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
