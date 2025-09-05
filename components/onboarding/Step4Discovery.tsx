'use client';

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

const DISCOVERY_SOURCES = [
  'Google Search',
  'Social Media (Twitter, LinkedIn, etc.)',
  'Friend or Colleague Recommendation',
  'YouTube',
  'Blog Post or Article',
  'Email Newsletter',
  'Online Community or Forum',
  'Product Hunt',
  'Online Advertisement',
  'SEO Conference or Event',
  'Other',
];

export function Step4Discovery({ form, isSubmitting }: StepComponentProps) {
  return (
    <div>
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
          Almost done! Just a final quick question.{' '}
          <span className="text-gray-500 text-base md:text-lg font-normal">
            (~ 1min)
          </span>
        </h1>
        <p className="text-gray-600">
          One last thing before you&apos;re all set—we&apos;d love to hear from
          you.
        </p>
      </div>

      <div className="space-y-4 md:space-y-6">
        <form.Field name="discoverySource">
          {(field: any) => (
            <div>
              <Label htmlFor="discovery-source">
                How did you hear about us?
              </Label>
              <Select
                value={field.state.value || ''}
                onValueChange={field.handleChange}
                disabled={isSubmitting}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Choose an option..." />
                </SelectTrigger>
                <SelectContent>
                  {DISCOVERY_SOURCES.map(source => (
                    <SelectItem key={source} value={source}>
                      {source}
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

        {form.state.values.discoverySource === 'Other' && (
          <form.Field name="otherDiscoverySource">
            {(field: any) => (
              <div>
                <Textarea
                  placeholder="Please specify how you heard about us..."
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
        )}

        <form.Field name="previousAttempts">
          {(field: any) => (
            <div>
              <Label htmlFor="previous-attempts">
                What have you tried before, and why didn&apos;t it work for you?
                (optional)
              </Label>
              <Textarea
                id="previous-attempts"
                placeholder="Example: 'I tried [tool/method], but it was too complex/expensive/slow.'"
                value={field.state.value || ''}
                onChange={e => field.handleChange(e.target.value)}
                disabled={isSubmitting}
                className="mt-2"
                rows={4}
              />
            </div>
          )}
        </form.Field>
      </div>
    </div>
  );
}
