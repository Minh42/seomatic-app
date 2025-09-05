'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { StepComponentProps } from '@/types/form';

const USE_CASES = [
  {
    id: 'local-business',
    title: 'Local Business Pages',
    description:
      'Target specific cities or regions to attract nearby customers (e.g., "Plumber in Austin").',
  },
  {
    id: 'ecommerce-product',
    title: 'E-commerce Product and Category Pages',
    description:
      'Generate optimized pages for product variations and filtered categories (e.g., "Red Running Shoes Under $100").',
  },
  {
    id: 'comparison-affiliate',
    title: 'Comparison and Affiliate Pages',
    description:
      'Create high-intent landing pages for product or service comparisons (e.g., "Best VPNs for Streaming in 2025").',
  },
  {
    id: 'saas-marketing',
    title: 'SaaS Marketing Pages',
    description:
      'Build pages for SaaS use cases like feature comparisons, integrations, alternatives, templates, or industry-specific solutions.',
  },
  {
    id: 'directory-listing',
    title: 'Directory and Listing Pages',
    description:
      'Automatically create pages for listings like jobs, properties, or professionals (e.g., "Apartments in Miami with Pool").',
  },
  {
    id: 'blog-content',
    title: 'Blog and Informational Content',
    description:
      'Scale content like how-tos, FAQs, and guides based on search trends (e.g., "How to Choose a VPN for Remote Work").',
  },
  {
    id: 'other',
    title: 'Any other use case?',
    description: '',
  },
];

export function Step1UseCases({ form, isSubmitting }: StepComponentProps) {
  return (
    <div>
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
          How do you plan to use SEOmatic?{' '}
          <span className="text-gray-500 text-base md:text-lg font-normal">
            (~ 1 min)
          </span>
        </h1>
        <p className="text-gray-600">
          This will help us personalize your experience in SEOmatic. You can
          select multiple options.
        </p>
      </div>

      <form.Field name="useCases">
        {(field: any) => (
          <div className="space-y-3 md:space-y-4 mb-6 md:mb-8">
            {USE_CASES.map(useCase => (
              <div
                key={useCase.id}
                className="border border-gray-200 rounded-lg p-3 md:p-4"
              >
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id={useCase.id}
                    checked={(field.state.value as string[]).includes(
                      useCase.id
                    )}
                    onCheckedChange={checked => {
                      const useCases = field.state.value as string[];
                      if (checked) {
                        field.handleChange([...useCases, useCase.id]);
                      } else {
                        field.handleChange(
                          useCases.filter(id => id !== useCase.id)
                        );
                      }
                    }}
                    disabled={isSubmitting}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor={useCase.id}
                      className="font-medium text-gray-900 cursor-pointer"
                    >
                      {useCase.title}
                    </Label>
                    {useCase.description && (
                      <p className="text-sm text-gray-600 mt-1">
                        {useCase.description}
                      </p>
                    )}
                  </div>
                </div>

                {useCase.id === 'other' &&
                  (field.state.value as string[]).includes('other') && (
                    <form.Field name="otherUseCase">
                      {(otherField: any) => (
                        <div className="mt-4 ml-6">
                          <Textarea
                            placeholder="Please describe your specific use case..."
                            value={otherField.state.value || ''}
                            onChange={e =>
                              otherField.handleChange(e.target.value)
                            }
                            disabled={isSubmitting}
                            className="w-full"
                            rows={3}
                          />
                          {otherField.state.meta.errors.length > 0 && (
                            <p className="text-sm text-red-600 mt-1">
                              {otherField.state.meta.errors[0]}
                            </p>
                          )}
                        </div>
                      )}
                    </form.Field>
                  )}
              </div>
            ))}
          </div>
        )}
      </form.Field>
    </div>
  );
}
