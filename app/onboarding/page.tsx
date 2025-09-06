'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { OnboardingTestimonial } from '@/components/common/OnboardingTestimonial';
import { SocialProof } from '@/components/common/SocialProof';
import { Step1UseCases } from '@/components/onboarding/Step1UseCases';
import { Step2WorkspaceInfo } from '@/components/onboarding/Step2WorkspaceInfo';
import { Step3TeamMembers } from '@/components/onboarding/Step3TeamMembers';
import { Step4Discovery } from '@/components/onboarding/Step4Discovery';
import { ProgressBar } from '@/components/onboarding/ProgressBar';
import { ErrorDisplay } from '@/components/onboarding/ErrorDisplay';
import { useOnboardingForm } from '@/hooks/useOnboardingForm';

export default function OnboardingPage() {
  const {
    form,
    currentStep,
    isSubmitting,
    isValidating,
    error,
    handleNextStep,
    handlePreviousStep,
    handleSkipStep,
    canGoNext,
    canGoPrevious,
    canSkip,
    retrySubmission,
    isLoadingProgress,
  } = useOnboardingForm();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
      {/* Left side - Form */}
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

          <ProgressBar currentStep={currentStep} totalSteps={4} />

          {/* Error Display */}
          <ErrorDisplay
            error={error}
            onRetry={retrySubmission}
            canRetry={!isSubmitting && currentStep === 4}
          />

          {/* Step Components */}
          {isLoadingProgress ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading your progress...</p>
              </div>
            </div>
          ) : (
            <>
              {currentStep === 1 && (
                <Step1UseCases form={form} isSubmitting={isSubmitting} />
              )}
              {currentStep === 2 && (
                <Step2WorkspaceInfo form={form} isSubmitting={isSubmitting} />
              )}
              {currentStep === 3 && (
                <Step3TeamMembers form={form} isSubmitting={isSubmitting} />
              )}
              {currentStep === 4 && (
                <Step4Discovery form={form} isSubmitting={isSubmitting} />
              )}
            </>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            {canGoPrevious ? (
              <Button
                onClick={handlePreviousStep}
                variant="outline"
                disabled={!canGoPrevious}
                className="px-6 md:px-8 h-10 md:h-12 text-sm md:text-base font-medium cursor-pointer disabled:cursor-not-allowed"
              >
                ← Back
              </Button>
            ) : (
              <div />
            )}

            <div className="flex items-center space-x-3 md:space-x-4">
              {canSkip && (
                <button
                  onClick={handleSkipStep}
                  disabled={!canSkip}
                  className="text-gray-500 hover:text-gray-700 text-xs md:text-sm font-medium disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                >
                  Skip for now
                </button>
              )}
              <Button
                onClick={handleNextStep}
                disabled={!canGoNext}
                className="px-6 md:px-8 h-10 md:h-12 text-sm md:text-base font-medium cursor-pointer disabled:cursor-not-allowed"
              >
                {isSubmitting
                  ? 'Processing...'
                  : isValidating
                    ? 'Validating...'
                    : currentStep === 4
                      ? 'Complete'
                      : 'Next →'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Testimonial */}
      <div className="hidden lg:flex lg:flex-1 lg:items-center lg:justify-center bg-slate-900 text-white p-12">
        <div className="max-w-md">
          <OnboardingTestimonial />
          <SocialProof type="pages" />
        </div>
      </div>
    </div>
  );
}
