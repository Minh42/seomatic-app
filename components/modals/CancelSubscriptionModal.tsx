'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowRight, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface CancelSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
  planName?: string;
  nextPaymentDate?: string;
  skipPauseOption?: boolean;
  onBackToResume?: () => void;
}

export function CancelSubscriptionModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  planName = 'subscription',
  nextPaymentDate,
  skipPauseOption = false,
  onBackToResume,
}: CancelSubscriptionModalProps) {
  const [mounted, setMounted] = useState(false);
  const [showCancelOption, setShowCancelOption] = useState(false);
  const [selectedPauseDuration, setSelectedPauseDuration] = useState<number>(1);
  const [isPausing, setIsPausing] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Reset state when modal opens/closes
    if (isOpen) {
      setShowCancelOption(skipPauseOption);
      setSelectedPauseDuration(1);
    }
  }, [isOpen, skipPauseOption]);

  const handlePause = async () => {
    setIsPausing(true);
    try {
      const response = await fetch('/api/subscription/pause', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          duration: selectedPauseDuration,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to pause subscription');
      }

      toast.success(
        data.message ||
          `Subscription paused for ${selectedPauseDuration} month${selectedPauseDuration > 1 ? 's' : ''}`
      );

      // Refresh the page to show updated status
      setTimeout(() => {
        window.location.reload();
      }, 1500);

      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to pause subscription'
      );
    } finally {
      setIsPausing(false);
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
        <div
          className="bg-white rounded-xl shadow-xl w-full max-w-md relative pointer-events-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 pb-4">
            <h2 className="text-xl font-bold leading-8 text-zinc-900">
              {!showCancelOption
                ? 'Need a break instead of leaving?'
                : 'Cancel Subscription'}
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              disabled={isLoading || isPausing}
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 pb-6">
            {!showCancelOption ? (
              <>
                <p className="text-sm font-normal leading-6 text-zinc-500 mb-4">
                  Pause your subscription and come back anytime. All your data
                  stays safe.
                </p>

                {/* Pause duration selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-zinc-900 mb-2">
                    How long would you like to pause?
                  </label>
                  <div className="space-y-2">
                    {[1, 2, 3].map(months => (
                      <label
                        key={months}
                        className="flex items-center p-3 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="pauseDuration"
                          value={months}
                          checked={selectedPauseDuration === months}
                          onChange={() => setSelectedPauseDuration(months)}
                          className="mr-3"
                        />
                        <span className="text-sm font-medium text-zinc-900">
                          {months} month{months > 1 ? 's' : ''}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* What happens when paused */}
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-medium text-blue-900 mb-2">
                    During your pause:
                  </p>
                  <ul className="space-y-1">
                    <li className="text-sm text-blue-700 flex items-start">
                      <span className="mr-2">•</span>
                      <span>No charges during the pause period</span>
                    </li>
                    <li className="text-sm text-blue-700 flex items-start">
                      <span className="mr-2">•</span>
                      <span>All your data and settings are preserved</span>
                    </li>
                    <li className="text-sm text-blue-700 flex items-start">
                      <span className="mr-2">•</span>
                      <span>Resume anytime with one click</span>
                    </li>
                    <li className="text-sm text-blue-700 flex items-start">
                      <span className="mr-2">•</span>
                      <span>
                        Automatically resumes after {selectedPauseDuration}{' '}
                        month{selectedPauseDuration > 1 ? 's' : ''}
                      </span>
                    </li>
                  </ul>
                </div>

                {/* Continue with cancellation link */}
                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={() => setShowCancelOption(true)}
                    className="text-sm text-zinc-500 hover:text-zinc-700 underline transition-colors flex items-center gap-1 mx-auto cursor-pointer"
                  >
                    Continue with cancellation
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm font-normal leading-6 text-zinc-500 mb-2">
                  Are you sure you want to cancel your{' '}
                  <span className="font-medium text-zinc-900">{planName}</span>{' '}
                  subscription?
                </p>

                {nextPaymentDate && (
                  <p className="text-sm font-normal leading-6 text-zinc-500 mb-4">
                    You&apos;ll continue to have access to all features until{' '}
                    <span className="font-medium text-zinc-900">
                      {nextPaymentDate}
                    </span>
                    . After that, your subscription will end and you&apos;ll
                    lose access to paid features.
                  </p>
                )}

                {/* What happens when cancelled */}
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm font-medium text-red-900 mb-2">
                    What happens when you cancel:
                  </p>
                  <ul className="space-y-1">
                    <li className="text-sm text-red-700 flex items-start">
                      <span className="mr-2">•</span>
                      <span>
                        You&apos;ll keep your current plan until the end of the
                        billing period
                      </span>
                    </li>
                    <li className="text-sm text-red-700 flex items-start">
                      <span className="mr-2">•</span>
                      <span>No further charges will be made</span>
                    </li>
                    <li className="text-sm text-red-700 flex items-start">
                      <span className="mr-2">•</span>
                      <span>
                        You can reactivate anytime before the period ends
                      </span>
                    </li>
                    <li className="text-sm text-red-700 flex items-start">
                      <span className="mr-2">•</span>
                      <span>
                        Your data will be preserved for 30 days after
                        cancellation
                      </span>
                    </li>
                  </ul>
                </div>

                {/* Back navigation - different text based on context */}
                {!skipPauseOption ? (
                  <div className="mt-4 text-center">
                    <button
                      type="button"
                      onClick={() => setShowCancelOption(false)}
                      className="text-sm text-zinc-500 hover:text-zinc-700 underline transition-colors flex items-center gap-1 mx-auto cursor-pointer"
                    >
                      <ArrowLeft className="h-3 w-3" />
                      Back to pause option
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onBackToResume?.();
                      }}
                      className="text-sm text-zinc-500 hover:text-zinc-700 underline transition-colors flex items-center gap-1 mx-auto cursor-pointer"
                    >
                      <ArrowLeft className="h-3 w-3" />
                      Back to resume option
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 px-6 pb-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading || isPausing}
              className="!h-11 px-4 rounded-md border border-zinc-300 bg-white text-sm font-bold leading-6 text-zinc-600 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Keep Subscription
            </button>
            {!showCancelOption ? (
              <button
                type="button"
                onClick={handlePause}
                disabled={isPausing}
                className="!h-11 px-4 rounded-md bg-indigo-600 text-sm font-bold leading-6 text-white hover:bg-indigo-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPausing
                  ? 'Pausing...'
                  : `Pause for ${selectedPauseDuration} Month${selectedPauseDuration > 1 ? 's' : ''}`}
              </button>
            ) : (
              <button
                type="button"
                onClick={onConfirm}
                disabled={isLoading}
                className="!h-11 px-4 rounded-md bg-red-600 text-sm font-bold leading-6 text-white hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Canceling...' : 'Cancel Subscription'}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );

  // Render modal in portal to ensure it's not constrained by parent containers
  if (mounted && typeof window !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return null;
}
