'use client';

import { useState } from 'react';
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
import { cn } from '@/lib/utils';
import Image from 'next/image';

const MAIN_PLATFORMS = [
  {
    id: 'seomatic',
    name: 'SEOmatic',
    subtitle: 'We host your pages',
    logo: '/logos/cms/seomatic.svg',
  },
  {
    id: 'wordpress',
    name: 'WordPress',
    subtitle: 'Self-hosted (wordpress.org)',
    logo: '/logos/cms/wordpress.svg',
  },
  {
    id: 'webflow',
    name: 'Webflow',
    logo: '/logos/cms/webflow.svg',
  },
  {
    id: 'ghost',
    name: 'Ghost',
    logo: '/logos/cms/ghost.svg',
  },
  {
    id: 'shopify',
    name: 'Shopify',
    logo: '/logos/cms/shopify.svg',
  },
];

const OTHER_PLATFORMS = [
  { value: 'hubspot', label: 'HubSpot' },
  { value: 'framer', label: 'Framer' },
  { value: 'notion', label: 'Notion' },
  { value: 'prismic', label: 'Prismic' },
  { value: 'builderio', label: 'Builder.io' },
  { value: 'craftcms', label: 'Craft CMS' },
  { value: 'storyblok', label: 'Storyblok' },
  { value: 'directus', label: 'Directus' },
  { value: 'statamic', label: 'Statamic' },
  { value: 'payload', label: 'Payload CMS' },
  { value: 'plasmic', label: 'Plasmic' },
  { value: 'sitecore', label: 'Sitecore' },
  { value: 'aem', label: 'Adobe Experience Manager' },
  { value: 'joomla', label: 'Joomla' },
  { value: 'drupal', label: 'Drupal' },
  { value: 'typo3', label: 'TYPO3' },
  { value: 'woocommerce', label: 'WooCommerce' },
  { value: 'magento', label: 'Magento' },
  { value: 'prestashop', label: 'PrestaShop' },
  { value: 'contentful', label: 'Contentful' },
  { value: 'strapi', label: 'Strapi' },
  { value: 'sanity', label: 'Sanity' },
  { value: 'squarespace', label: 'Squarespace' },
  { value: 'wix', label: 'Wix' },
  { value: 'bigcommerce', label: 'BigCommerce' },
  { value: 'other', label: 'Other' },
];

export function Step3CMSIntegration({
  form,
  isSubmitting,
}: StepComponentProps) {
  const initialCmsValue = form.state.values.cmsIntegration || '';
  const initialOtherValue = form.state.values.otherCms || '';

  // Check if the initial CMS value is one of the main platforms
  const isMainPlatform = MAIN_PLATFORMS.some(p => p.id === initialCmsValue);

  // Initialize selected platform (main card selection)
  const [selectedPlatform, setSelectedPlatform] = useState(
    isMainPlatform ? initialCmsValue : ''
  );

  // Initialize dropdown selection
  // If they have an otherCms value, check if it's in the dropdown or is custom text
  const [otherPlatformSelection, setOtherPlatformSelection] = useState(() => {
    if (!initialOtherValue) return '';
    // Check if it's one of the dropdown options
    const isDropdownOption = OTHER_PLATFORMS.some(
      p => p.value === initialOtherValue
    );
    if (isDropdownOption) return initialOtherValue;
    // If there's text but it's not a dropdown option, they must have selected "other"
    return initialOtherValue ? 'other' : '';
  });

  const handlePlatformSelect = (platformId: string) => {
    // If clicking the already selected platform, deselect it
    if (selectedPlatform === platformId) {
      setSelectedPlatform('');
      form.setFieldValue('cmsIntegration', '');
    } else {
      setSelectedPlatform(platformId);
      form.setFieldValue('cmsIntegration', platformId);
    }

    // Don't reset the dropdown selection - they can have both
  };

  const handleOtherDropdownChange = (value: string) => {
    // If selecting the same value, deselect it
    if (otherPlatformSelection === value) {
      setOtherPlatformSelection('');
      form.setFieldValue('otherCms', '');
    } else {
      setOtherPlatformSelection(value);

      // Store the dropdown selection in otherCms field
      // If they selected "other", they'll fill in the text field
      // Otherwise, store the platform name they selected
      if (value !== 'other') {
        form.setFieldValue('otherCms', value);
      }
    }
  };

  return (
    <div>
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
          Which CMS do you primarily use?{' '}
          <span className="text-gray-500 text-base md:text-lg font-normal">
            (~ 1 min)
          </span>
        </h1>
        <p className="text-gray-600">
          Select your CMS or where we&apos;ll publish your pages. This helps us
          provide the right setup instructions.
        </p>
      </div>

      <div className="space-y-6">
        {/* Platform Selection Grid */}
        <div>
          <Label className="text-base font-medium mb-2 block">
            Select your CMS
          </Label>
          <p className="text-sm text-gray-600 mb-4">
            These are our supported CMS options.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {MAIN_PLATFORMS.map(platform => (
              <button
                key={platform.id}
                type="button"
                onClick={() => handlePlatformSelect(platform.id)}
                disabled={isSubmitting}
                className={cn(
                  'relative p-4 rounded-lg border-2 transition-all duration-200',
                  'hover:shadow-md hover:border-gray-400',
                  'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  selectedPlatform === platform.id
                    ? 'border-blue-500 bg-blue-50 shadow-sm'
                    : 'border-gray-200 bg-white'
                )}
              >
                <div className="flex flex-col items-center">
                  {/* Logo */}
                  <div className="w-12 h-12 flex items-center justify-center mb-3">
                    {platform.logo.startsWith('/') ? (
                      <Image
                        src={platform.logo}
                        alt={`${platform.name} logo`}
                        width={48}
                        height={48}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-3xl">{platform.logo}</div>
                    )}
                  </div>

                  {/* Platform Name */}
                  <div className="text-center">
                    <h3 className="font-medium text-gray-900">
                      {platform.name}
                    </h3>
                    <div className="h-4 mt-0.5">
                      {platform.subtitle && (
                        <p className="text-xs text-gray-500">
                          {platform.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Selected Indicator */}
                  {selectedPlatform === platform.id && (
                    <div className="absolute top-2 left-2">
                      <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg
                          className="w-3 h-3 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Don't see your CMS? */}
          <div className="mt-6">
            <Label className="text-base font-medium mb-2 block">
              Don&apos;t see your CMS?
            </Label>
            <p className="text-sm text-gray-500 mb-3">
              We&apos;re always adding new CMS support. Let us know what
              you&apos;re using.
            </p>
            <Select
              value={otherPlatformSelection}
              onValueChange={handleOtherDropdownChange}
              disabled={isSubmitting}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a CMS..." />
              </SelectTrigger>
              <SelectContent>
                {OTHER_PLATFORMS.map(platform => (
                  <SelectItem key={platform.value} value={platform.value}>
                    {platform.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Validation Error */}
          <form.Field name="cmsIntegration">
            {(field: any) => (
              <>
                {field.state.meta.isTouched &&
                  field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-red-600 mt-2">
                      {field.state.meta.errors[0]}
                    </p>
                  )}
              </>
            )}
          </form.Field>
        </div>

        {/* Other Platform Details - Only show when "other" is selected from dropdown */}
        {otherPlatformSelection === 'other' && (
          <form.Field name="otherCms">
            {(field: any) => (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <Label htmlFor="other-cms-details">
                  Tell us about your CMS
                </Label>
                <Textarea
                  id="other-cms-details"
                  placeholder="What CMS are you using?"
                  value={field.state.value || ''}
                  onChange={e => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  disabled={isSubmitting}
                  className="mt-2 w-full"
                  rows={4}
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
      </div>
    </div>
  );
}
