'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowRight } from 'lucide-react';

interface ResumeSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onCancelInstead?: () => void;
  isLoading?: boolean;
  planName?: string;
  nextPaymentDate?: string;
  nextPaymentAmount?: number;
  currency?: string;
}

export function ResumeSubscriptionModal({
  isOpen,
  onClose,
  onConfirm,
  onCancelInstead,
  isLoading = false,
  planName = 'subscription',
  nextPaymentDate,
  nextPaymentAmount,
  currency = 'USD',
}: ResumeSubscriptionModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
              Resume Subscription
            </h2>
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
              Are you sure you want to resume your{' '}
              <span className="font-medium text-zinc-900">{planName}</span>{' '}
              subscription?
            </p>

            {nextPaymentDate && nextPaymentAmount && (
              <p className="text-sm font-normal leading-6 text-zinc-500 mb-4">
                Your next payment of{' '}
                <span className="font-medium text-zinc-900">
                  ${nextPaymentAmount.toFixed(2)} {currency}
                </span>{' '}
                will be charged on{' '}
                <span className="font-medium text-zinc-900">
                  {nextPaymentDate}
                </span>
                .
              </p>
            )}

            {/* What happens next */}
            <div className="mt-4 p-3 bg-zinc-50 border border-zinc-200 rounded-lg">
              <p className="text-sm font-medium text-zinc-900 mb-2">
                What happens when you resume:
              </p>
              <ul className="space-y-1">
                <li className="text-sm text-zinc-600 flex items-start">
                  <span className="mr-2">•</span>
                  <span>Your subscription will be immediately reactivated</span>
                </li>
                <li className="text-sm text-zinc-600 flex items-start">
                  <span className="mr-2">•</span>
                  <span>
                    Billing will continue at the end of your current period
                  </span>
                </li>
                <li className="text-sm text-zinc-600 flex items-start">
                  <span className="mr-2">•</span>
                  <span>You&apos;ll retain access to all premium features</span>
                </li>
                <li className="text-sm text-zinc-600 flex items-start">
                  <span className="mr-2">•</span>
                  <span>Your payment method will be charged automatically</span>
                </li>
              </ul>
            </div>

            {/* Cancel instead option */}
            {onCancelInstead && (
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={onCancelInstead}
                  className="text-sm text-zinc-500 hover:text-zinc-700 underline transition-colors flex items-center gap-1 mx-auto cursor-pointer"
                  disabled={isLoading}
                >
                  Cancel subscription instead
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 px-6 pb-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="!h-11 px-4 rounded-md border border-zinc-300 bg-white text-sm font-bold leading-6 text-zinc-600 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className="!h-11 px-4 rounded-md bg-indigo-600 text-sm font-bold leading-6 text-white hover:bg-indigo-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Processing...' : 'Resume Subscription'}
            </button>
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
