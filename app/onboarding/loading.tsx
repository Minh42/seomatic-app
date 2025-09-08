import Image from 'next/image';
import { ProgressBar } from '@/components/onboarding/ProgressBar';

export default function OnboardingLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
      {/* Left side - Form skeleton */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-4 py-6 sm:px-6 md:px-8 lg:py-12 lg:px-16 xl:px-20 2xl:px-24">
        <div className="w-full max-w-2xl">
          {/* Logo */}
          <div className="flex items-center mb-6 md:mb-8">
            <Image
              src="/logos/seomatic.svg"
              alt="SEOmatic"
              width={32}
              height={32}
              className="w-6 h-6 md:w-8 md:h-8 mr-2"
            />
            <span className="text-lg md:text-xl font-semibold text-gray-900">
              SEOmatic
            </span>
          </div>

          <ProgressBar currentStep={1} totalSteps={4} />

          {/* Loading skeleton */}
          <div className="animate-pulse mt-8 space-y-6">
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="space-y-4 mt-8">
              <div className="h-12 bg-gray-200 rounded"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Testimonial skeleton */}
      <div className="hidden lg:flex lg:flex-1 lg:items-center lg:justify-center bg-slate-900 text-white p-12">
        <div className="max-w-md">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-slate-700 rounded w-3/4"></div>
            <div className="h-4 bg-slate-700 rounded w-full"></div>
            <div className="h-4 bg-slate-700 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
