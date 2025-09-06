'use client';

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

export function Step2WorkspaceInfo({ form, isSubmitting }: StepComponentProps) {
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
            onChange: ({ value }: { value: any }) =>
              !value ? 'Workspace name is required' : undefined,
          }}
        >
          {(field: any) => (
            <div>
              <Label htmlFor="workspace-name">Workspace name</Label>
              <Input
                id="workspace-name"
                placeholder="My Workspace"
                value={field.state.value || ''}
                onChange={e => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                disabled={isSubmitting}
                className="mt-2"
              />
              {field.state.meta.errors.length > 0 && (
                <p className="text-sm text-red-600 mt-1">
                  {field.state.meta.errors[0]}
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
