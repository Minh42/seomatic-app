'use client';

import { AlertTriangle, X } from 'lucide-react';

interface CancelSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
  planName?: string;
  nextPaymentDate?: string;
}

export function CancelSubscriptionModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  planName = 'subscription',
  nextPaymentDate,
}: CancelSubscriptionModalProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div
          className="bg-white rounded-xl shadow-xl w-full max-w-md relative"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <h2 className="text-xl font-bold leading-8 text-zinc-900">
                Cancel Subscription
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              disabled={isLoading}
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 pb-6">
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
                . After that, your subscription will end and you&apos;ll lose
                access to paid features.
              </p>
            )}

            {/* What happens next */}
            <div className="mt-4 p-3 bg-zinc-50 border border-zinc-200 rounded-lg">
              <p className="text-sm font-medium text-zinc-900 mb-2">
                What happens when you cancel:
              </p>
              <ul className="space-y-1">
                <li className="text-sm text-zinc-600 flex items-start">
                  <span className="mr-2">•</span>
                  <span>
                    You&apos;ll keep your current plan until the end of the
                    billing period
                  </span>
                </li>
                <li className="text-sm text-zinc-600 flex items-start">
                  <span className="mr-2">•</span>
                  <span>No further charges will be made</span>
                </li>
                <li className="text-sm text-zinc-600 flex items-start">
                  <span className="mr-2">•</span>
                  <span>You can reactivate anytime before the period ends</span>
                </li>
                <li className="text-sm text-zinc-600 flex items-start">
                  <span className="mr-2">•</span>
                  <span>
                    Your data will be preserved for 30 days after cancellation
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 px-6 pb-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="!h-11 px-4 rounded-md border border-zinc-300 bg-white text-sm font-bold leading-6 text-zinc-600 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Keep Subscription
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className="!h-11 px-4 rounded-md bg-red-600 text-sm font-bold leading-6 text-white hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Canceling...' : 'Cancel Subscription'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
