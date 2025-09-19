'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { toast } from 'sonner';

// Initialize Stripe with English locale
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
  {
    locale: 'en', // Force English locale for error messages
  }
);

interface AddPaymentMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Card element options
const cardElementOptions = {
  style: {
    base: {
      fontSize: '14px',
      color: '#18181b',
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      '::placeholder': {
        color: '#71717a',
      },
      lineHeight: '40px',
    },
    invalid: {
      color: '#ef4444',
      iconColor: '#ef4444',
    },
  },
  hidePostalCode: true, // Hide the postal code field
};

function PaymentForm({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCardComplete, setIsCardComplete] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get the card element
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      // Create setup intent on the server
      const response = await fetch('/api/payment-methods', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to create setup intent');
      }

      const { clientSecret } = await response.json();

      // Confirm the setup intent with the card details
      const { error: confirmError, setupIntent } =
        await stripe.confirmCardSetup(clientSecret, {
          payment_method: {
            card: cardElement,
          },
        });

      if (confirmError) {
        setError(confirmError.message || 'Failed to add payment method');
        return;
      }

      if (setupIntent?.status === 'succeeded') {
        toast.success('Payment method added successfully');
        onSuccess();
        onClose();
      } else {
        setError('Failed to add payment method');
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to add payment method'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="px-6 pb-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-zinc-900 mb-2">
            Card Information
          </label>
          <div className="border border-zinc-300 rounded-lg p-3 focus-within:border-indigo-600 focus-within:ring-1 focus-within:ring-indigo-600">
            <CardElement
              options={cardElementOptions}
              onChange={event => {
                // Update card complete state based on whether all fields are filled
                setIsCardComplete(event.complete);
                // Clear error when user starts typing
                if (event.error) {
                  setError(event.error.message);
                } else {
                  setError(null);
                }
              }}
            />
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg">
          <p className="text-sm text-zinc-600">
            Your card will be securely saved for future payments. You can remove
            it or change your default payment method at any time.
          </p>
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
          type="submit"
          disabled={!stripe || isLoading || !isCardComplete}
          className="!h-11 px-4 rounded-md bg-indigo-600 text-sm font-bold leading-6 text-white hover:bg-indigo-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Adding...' : 'Add Payment Method'}
        </button>
      </div>
    </form>
  );
}

export function AddPaymentMethodModal({
  isOpen,
  onClose,
  onSuccess,
}: AddPaymentMethodModalProps) {
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
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div
          className="bg-white rounded-xl shadow-xl w-full max-w-md relative"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 pb-4">
            <h2 className="text-xl font-bold leading-8 text-zinc-900">
              Add Payment Method
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Stripe Elements Provider */}
          <Elements stripe={stripePromise}>
            <PaymentForm onClose={onClose} onSuccess={onSuccess} />
          </Elements>
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
