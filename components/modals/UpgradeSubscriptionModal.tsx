'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface UpgradeSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
  currentPlan?: string;
  newPlan?: string;
  currentPrice?: number;
  newPrice?: number;
  currency?: string;
  currentFrequency?: 'monthly' | 'yearly';
  newFrequency?: 'monthly' | 'yearly';
}

export function UpgradeSubscriptionModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  currentPlan = 'current plan',
  newPlan = 'new plan',
  currentPrice = 0,
  newPrice = 0,
  // currency = 'USD',
  currentFrequency = 'monthly',
  newFrequency = 'monthly',
}: UpgradeSubscriptionModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen) return null;

  const currentFrequencyText = currentFrequency === 'yearly' ? 'year' : 'month';
  const newFrequencyText = newFrequency === 'yearly' ? 'year' : 'month';

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
              Upgrade Subscription
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
            <p className="text-sm font-normal leading-6 text-zinc-500 mb-4">
              You&apos;re upgrading from{' '}
              <span className="font-medium text-zinc-900">{currentPlan}</span>{' '}
              to <span className="font-medium text-zinc-900">{newPlan}</span>.
            </p>

            {/* Pricing info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600">Current plan</span>
                  <span className="font-medium text-zinc-900">
                    ${currentPrice.toFixed(2)}/{currentFrequencyText}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600">New plan</span>
                  <span className="font-medium text-zinc-900">
                    ${newPrice.toFixed(2)}/{newFrequencyText}
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-zinc-200">
                <p className="text-xs text-zinc-500">
                  <span className="font-medium">Note:</span> You&apos;ll be
                  charged a prorated amount today based on the remaining days in
                  your current billing cycle. The full new price starts next
                  billing cycle.
                </p>
              </div>
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
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className="!h-11 px-4 rounded-md bg-indigo-600 text-sm font-bold leading-6 text-white hover:bg-indigo-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Processing...' : 'Confirm Upgrade'}
            </button>
          </div>
        </div>
      </div>
    </>
  );

  // Render modal in portal
  if (mounted && typeof window !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return null;
}
