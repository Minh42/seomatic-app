'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { StripeErrorHandler } from '@/lib/errors/stripe-errors';
import {
  CreditCard,
  Plus,
  MoreHorizontal,
  Check,
  Download,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CancelSubscriptionModal } from '@/components/modals/CancelSubscriptionModal';
import { ResumeSubscriptionModal } from '@/components/modals/ResumeSubscriptionModal';
import { AddPaymentMethodModal } from '@/components/modals/AddPaymentMethodModal';
import { SetPrimaryPaymentMethodModal } from '@/components/modals/SetPrimaryPaymentMethodModal';
import { RemovePaymentMethodModal } from '@/components/modals/RemovePaymentMethodModal';

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  isPrimary: boolean;
}

interface Transaction {
  id: string;
  invoiceNumber: string;
  date: string;
  amount: number;
  currency: string;
  status: 'paid' | 'open' | 'draft' | 'uncollectible' | 'void';
  pdfUrl?: string | null;
  hostedUrl?: string | null;
}

interface SubscriptionData {
  plan: string;
  price: number;
  currency: string;
  frequency: string;
  nextPaymentDate: string;
  status: string;
  cancelAtPeriodEnd: boolean;
  cancelledAt?: string | null;
  pausedAt?: string | null;
  pauseEndsAt?: string | null;
}

interface BillingTabProps {
  user: {
    id?: string;
    email?: string | null;
  };
}

export function BillingTab({}: BillingTabProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isCanceling, setIsCanceling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [showSetPrimaryModal, setShowSetPrimaryModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod | null>(null);
  const [skipPauseInCancel, setSkipPauseInCancel] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionData>({
    plan: 'No Plan',
    price: 0,
    currency: 'USD',
    frequency: 'monthly',
    nextPaymentDate: '',
    status: 'inactive',
    cancelAtPeriodEnd: false,
  });
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoadingPaymentMethods, setIsLoadingPaymentMethods] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showSortMenu, setShowSortMenu] = useState(false);

  const fetchTransactions = useCallback(async () => {
    setIsLoadingTransactions(true);
    try {
      const params = new URLSearchParams({
        limit: '10',
        sortBy,
        sortOrder,
      });

      const response = await fetch(`/api/invoices?${params}`);
      const data = await response.json();

      if (data.invoices) {
        // Format the transactions for display
        const formattedTransactions = data.invoices.map((invoice: any) => ({
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          date: invoice.date
            ? new Date(invoice.date).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })
            : '',
          amount: invoice.amount,
          currency: invoice.currency,
          status: invoice.status,
          pdfUrl: invoice.pdfUrl,
          hostedUrl: invoice.hostedUrl,
        }));

        setTransactions(formattedTransactions);
      }
    } catch (error) {
      const stripeError = StripeErrorHandler.handleInvoiceError(error, 'fetch');
      StripeErrorHandler.displayError(stripeError);
    } finally {
      setIsLoadingTransactions(false);
    }
  }, [sortBy, sortOrder]);

  useEffect(() => {
    // Fetch subscription data
    fetchSubscription();
    // Fetch payment methods
    fetchPaymentMethods();
  }, []);

  useEffect(() => {
    // Fetch transactions when component mounts or sorting changes
    fetchTransactions();
  }, [fetchTransactions]);

  const fetchSubscription = async () => {
    try {
      const response = await fetch('/api/subscription');
      const data = await response.json();

      if (data.subscription) {
        const sub = data.subscription;

        // Format the next payment date
        const nextPaymentDate = sub.currentPeriodEnd
          ? new Date(sub.currentPeriodEnd).toLocaleDateString('en-US', {
              month: 'long',
              day: '2-digit',
              year: 'numeric',
            })
          : '';

        const cancelledAt = sub.cancelledAt
          ? new Date(sub.cancelledAt).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })
          : null;

        const pausedAt = sub.pausedAt
          ? new Date(sub.pausedAt).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })
          : null;

        const pauseEndsAt = sub.pauseEndsAt
          ? new Date(sub.pauseEndsAt).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })
          : null;

        setSubscription({
          plan: sub.planName || 'No Plan',
          price: parseFloat(sub.planPrice) || 0,
          currency: 'USD',
          frequency: sub.planFrequency || 'monthly',
          nextPaymentDate,
          status: sub.status || 'inactive',
          cancelAtPeriodEnd: sub.cancelAtPeriodEnd || false,
          cancelledAt,
          pausedAt,
          pauseEndsAt,
        });
      }
    } catch (error) {
      const stripeError = StripeErrorHandler.handleSubscriptionError(
        error,
        'fetch'
      );
      StripeErrorHandler.displayError(stripeError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    setIsCanceling(true);
    try {
      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel subscription');
      }

      await response.json();

      // Update local state
      setSubscription(prev => ({
        ...prev,
        cancelAtPeriodEnd: true,
      }));

      toast.success(
        'Subscription will be cancelled at the end of your billing period'
      );

      // Close modal
      setShowCancelModal(false);

      // Refresh subscription data
      await fetchSubscription();
    } catch (error) {
      const stripeError = StripeErrorHandler.handleSubscriptionError(
        error,
        'cancel'
      );
      StripeErrorHandler.displayError(stripeError);
    } finally {
      setIsCanceling(false);
    }
  };

  const handleResumeSubscription = async () => {
    setIsCanceling(true);
    try {
      // Check if subscription is paused or cancelled
      const endpoint = subscription.pausedAt
        ? '/api/subscription/resume'
        : '/api/subscription/cancel';

      const method = subscription.pausedAt ? 'POST' : 'DELETE';

      const response = await fetch(endpoint, { method });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to resume subscription');
      }

      await response.json();

      // Update local state based on what was resumed
      if (subscription.pausedAt) {
        setSubscription(prev => ({
          ...prev,
          pausedAt: null,
          pauseEndsAt: null,
        }));
        toast.success('Subscription resumed successfully');
      } else {
        setSubscription(prev => ({
          ...prev,
          cancelAtPeriodEnd: false,
        }));
        toast.success('Subscription reactivated');
      }

      // Close modal
      setShowResumeModal(false);

      // Refresh subscription data
      await fetchSubscription();
    } catch (error) {
      const stripeError = StripeErrorHandler.handleSubscriptionError(
        error,
        'resume'
      );
      StripeErrorHandler.displayError(stripeError);
    } finally {
      setIsCanceling(false);
    }
  };

  const handleCancelInstead = () => {
    // Close resume modal and open cancel modal
    setShowResumeModal(false);
    setSkipPauseInCancel(true); // Skip pause option when coming from paused state
    setShowCancelModal(true);
  };

  const handleBackToResume = () => {
    // Close cancel modal and reopen resume modal
    setShowCancelModal(false);
    setSkipPauseInCancel(false);
    setShowResumeModal(true);
  };

  const handleAddPaymentMethod = () => {
    setShowAddPaymentModal(true);
  };

  const fetchPaymentMethods = async () => {
    setIsLoadingPaymentMethods(true);
    try {
      const response = await fetch('/api/payment-methods');
      if (response.ok) {
        const data = await response.json();
        setPaymentMethods(data.paymentMethods || []);
      }
    } catch (error) {
      const stripeError = StripeErrorHandler.handlePaymentMethodError(
        error,
        'fetch'
      );
      StripeErrorHandler.displayError(stripeError);
    } finally {
      setIsLoadingPaymentMethods(false);
    }
  };

  const handleSetPrimary = async (methodId: string) => {
    setIsCanceling(true);
    try {
      const response = await fetch('/api/payment-methods/default', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethodId: methodId }),
      });

      if (response.ok) {
        setPaymentMethods(methods =>
          methods.map(method => ({
            ...method,
            isPrimary: method.id === methodId,
          }))
        );
        toast.success('Primary payment method updated');
        setShowSetPrimaryModal(false);
        setSelectedPaymentMethod(null);
      } else {
        const errorData = await response.json();
        toast.error(
          errorData.error || 'Failed to update primary payment method'
        );
      }
    } catch (error) {
      const stripeError = StripeErrorHandler.handlePaymentMethodError(
        error,
        'update'
      );
      StripeErrorHandler.displayError(stripeError);
    } finally {
      setIsCanceling(false);
    }
  };

  const handleConfirmRemovePaymentMethod = async (methodId: string) => {
    setIsCanceling(true);
    try {
      const response = await fetch('/api/payment-methods', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethodId: methodId }),
      });

      if (response.ok) {
        setPaymentMethods(methods => methods.filter(m => m.id !== methodId));
        toast.success('Payment method removed');
        setShowRemoveModal(false);
        setSelectedPaymentMethod(null);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to remove payment method');
      }
    } catch (error) {
      const stripeError = StripeErrorHandler.handlePaymentMethodError(
        error,
        'remove'
      );
      StripeErrorHandler.displayError(stripeError);
    } finally {
      setIsCanceling(false);
    }
  };

  const handleRemovePaymentMethod = (method: PaymentMethod) => {
    setSelectedPaymentMethod(method);
    setShowRemoveModal(true);
  };

  const handleSetPrimaryClick = (method: PaymentMethod) => {
    setSelectedPaymentMethod(method);
    setShowSetPrimaryModal(true);
  };

  const handleExportCSV = () => {
    if (transactions.length === 0) {
      toast.error('No transactions to export');
      return;
    }

    // Create CSV content
    const headers = ['Invoice Number', 'Date', 'Amount', 'Currency', 'Status'];
    const rows = transactions.map(t => [
      t.invoiceNumber,
      t.date,
      t.amount.toFixed(2),
      t.currency,
      t.status,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `invoices_${new Date().toISOString().split('T')[0]}.csv`
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Transactions exported to CSV');
  };

  const handleViewInvoice = (transaction: Transaction) => {
    if (transaction.hostedUrl) {
      window.open(transaction.hostedUrl, '_blank');
    } else {
      toast.error('Invoice view not available');
    }
  };

  const handleDownloadPDF = (transaction: Transaction) => {
    if (transaction.pdfUrl) {
      window.open(transaction.pdfUrl, '_blank');
    } else {
      toast.error('PDF not available');
    }
  };

  const handleSort = (field: 'date' | 'amount' | 'status') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setShowSortMenu(false);
  };

  const formatExpiry = (month: number, year: number) => {
    return `${month.toString().padStart(2, '0')}/${year}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading billing information...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Subscription Plan Section */}
      <div>
        <div className="flex items-start justify-between mb-4 pb-4 border-b border-zinc-200">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold leading-6 text-zinc-900">
                Subscription Plan:{' '}
                <span className="text-indigo-600">{subscription.plan}</span>
              </h3>
              {subscription.pausedAt && (
                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                  Paused
                </span>
              )}
            </div>
            <p className="text-sm font-normal leading-5 text-zinc-500">
              {subscription.frequency === 'yearly' ? 'Yearly' : 'Monthly'} Plan
            </p>
          </div>
          {subscription.plan !== 'No Plan' &&
            (subscription.pausedAt ? (
              <Button
                onClick={() => setShowResumeModal(true)}
                className="!h-10 px-4 text-sm font-medium leading-5 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
              >
                Resume Subscription
              </Button>
            ) : subscription.cancelAtPeriodEnd ? (
              <Button
                onClick={() => setShowResumeModal(true)}
                className="!h-10 px-4 text-sm font-medium leading-5 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
              >
                Reactivate Subscription
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => {
                  setSkipPauseInCancel(false); // Show pause option for regular cancel flow
                  setShowCancelModal(true);
                }}
                className="!h-10 px-4 text-sm font-medium leading-5 text-zinc-600 hover:text-zinc-900 border border-zinc-300 hover:bg-zinc-50 rounded-lg cursor-pointer"
              >
                Cancel Subscription
              </Button>
            ))}
        </div>

        {(subscription.nextPaymentDate || subscription.pausedAt) && (
          <div className="flex items-center justify-between">
            <p className="text-sm leading-5 text-zinc-900">
              {subscription.pausedAt ? (
                <>
                  <span className="font-medium">Your next payment is</span>{' '}
                  <strong className="font-bold">
                    ${subscription.price.toFixed(2)} {subscription.currency}
                  </strong>
                  <span className="font-medium">, to be charged on</span>{' '}
                  <strong className="font-bold">
                    {subscription.pauseEndsAt || subscription.nextPaymentDate}
                  </strong>
                </>
              ) : subscription.cancelAtPeriodEnd ? (
                <>
                  <span className="font-medium">Your subscription ends on</span>{' '}
                  <strong className="font-bold">
                    {subscription.nextPaymentDate}
                  </strong>
                </>
              ) : (
                <>
                  <span className="font-medium">Your next payment is</span>{' '}
                  <strong className="font-bold">
                    ${subscription.price.toFixed(2)} {subscription.currency}
                  </strong>
                  <span className="font-medium">, to be charged on</span>{' '}
                  <strong className="font-bold">
                    {subscription.nextPaymentDate}
                  </strong>
                </>
              )}
            </p>
            {subscription.pausedAt ? (
              <p className="text-xs font-normal leading-5 text-zinc-500">
                {(() => {
                  if (subscription.pausedAt && subscription.pauseEndsAt) {
                    // Calculate the pause duration in months
                    const pauseStart = new Date(subscription.pausedAt);
                    const pauseEnd = new Date(subscription.pauseEndsAt);
                    const monthsDiff = Math.round(
                      (pauseEnd.getTime() - pauseStart.getTime()) /
                        (1000 * 60 * 60 * 24 * 30)
                    );
                    return `Subscription paused for ${monthsDiff} month${monthsDiff !== 1 ? 's' : ''} until ${subscription.pauseEndsAt}`;
                  }
                  return 'Subscription paused';
                })()}
              </p>
            ) : subscription.cancelAtPeriodEnd ? (
              subscription.cancelledAt && (
                <p className="text-xs font-normal leading-5 text-red-600">
                  This subscription was cancelled on {subscription.cancelledAt}.
                </p>
              )
            ) : (
              <p className="text-xs font-normal leading-5 text-zinc-500">
                Your payment will be automatically renewed each{' '}
                {subscription.frequency === 'yearly' ? 'year' : 'month'}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Payment Method Section */}
      <div className="bg-white border border-zinc-200 rounded-lg p-6">
        <div className="flex gap-8">
          <div className="flex-1">
            <h3 className="text-base font-bold leading-6 text-zinc-900 mb-1">
              Payment Method
            </h3>
            <p className="text-sm font-normal leading-5 text-zinc-500">
              Choose your preferred payment method
              <br />
              for making future payments
            </p>
          </div>

          <div className="flex-1 space-y-3">
            {isLoadingPaymentMethods ? (
              <div className="text-sm text-zinc-500">
                Loading payment methods...
              </div>
            ) : paymentMethods.length === 0 ? (
              <div className="text-sm text-zinc-500">
                No payment methods added
              </div>
            ) : (
              paymentMethods.map(method => (
                <div
                  key={method.id}
                  className={`relative border rounded-lg p-4 ${
                    method.isPrimary
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-zinc-300 bg-white'
                  }`}
                >
                  {method.isPrimary && (
                    <div className="absolute top-4 right-4 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-6 bg-white rounded border border-zinc-200 flex items-center justify-center mt-1">
                      <CreditCard className="h-4 w-4 text-zinc-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold leading-5 text-zinc-900 capitalize">
                        {method.brand} ending {method.last4}
                      </p>
                      <p className="text-sm font-normal leading-5 text-zinc-500 mb-2">
                        Expiry{' '}
                        {formatExpiry(method.expiryMonth, method.expiryYear)}
                      </p>
                      <div className="flex items-center gap-3">
                        {method.isPrimary ? (
                          <span className="text-xs font-medium text-zinc-600">
                            Primary Card
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSetPrimaryClick(method)}
                            className="text-xs font-medium text-zinc-600 hover:text-zinc-900 cursor-pointer"
                          >
                            Set as Primary
                          </button>
                        )}
                        <button
                          onClick={() => handleRemovePaymentMethod(method)}
                          className="text-xs font-medium text-red-600 hover:text-red-700 cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}

            <button
              onClick={handleAddPaymentMethod}
              className="w-full p-4 text-left cursor-pointer flex items-center gap-2"
            >
              <Plus className="h-4 w-4 text-zinc-600" />
              <span className="text-sm font-normal leading-5 text-zinc-600">
                Add New Payment Method
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Latest Transactions Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold leading-6 text-zinc-900">
            Latest Transactions
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-500">Sort by:</span>
            <DropdownMenu open={showSortMenu} onOpenChange={setShowSortMenu}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-sm font-medium text-zinc-900 hover:bg-zinc-100 cursor-pointer"
                >
                  {sortBy === 'date'
                    ? 'Date'
                    : sortBy === 'amount'
                      ? 'Amount'
                      : 'Status'}
                  <svg
                    className="ml-1 h-3 w-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleSort('date')}>
                  Date {sortBy === 'date' && (sortOrder === 'desc' ? '↓' : '↑')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort('amount')}>
                  Amount{' '}
                  {sortBy === 'amount' && (sortOrder === 'desc' ? '↓' : '↑')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort('status')}>
                  Status{' '}
                  {sortBy === 'status' && (sortOrder === 'desc' ? '↓' : '↑')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="!h-9 px-3 text-xs font-bold leading-none text-zinc-900 hover:bg-zinc-50 border border-zinc-300 rounded cursor-pointer flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        <div className="border border-zinc-200 rounded-lg overflow-hidden">
          <table className="w-full bg-white">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="text-left text-sm font-normal leading-5 text-zinc-500 px-4 py-3">
                  Invoice
                </th>
                <th className="text-left text-sm font-normal leading-5 text-zinc-500 px-4 py-3">
                  Date
                </th>
                <th className="text-left text-sm font-normal leading-5 text-zinc-500 px-4 py-3">
                  Amount
                </th>
                <th className="text-left text-sm font-normal leading-5 text-zinc-500 px-4 py-3">
                  Status
                </th>
                <th className="text-left text-sm font-normal leading-5 text-zinc-500 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 bg-white">
              {isLoadingTransactions ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-sm text-zinc-500"
                  >
                    Loading transactions...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-sm text-zinc-500"
                  >
                    No transactions found
                  </td>
                </tr>
              ) : (
                transactions.map(transaction => (
                  <tr
                    key={transaction.id}
                    className="hover:bg-zinc-50 bg-white"
                  >
                    <td className="px-4 py-3 bg-white">
                      <span className="text-sm font-bold leading-5 text-zinc-900">
                        {transaction.invoiceNumber}
                      </span>
                    </td>
                    <td className="px-4 py-3 bg-white">
                      <span className="text-sm font-medium leading-5 text-zinc-500">
                        {transaction.date}
                      </span>
                    </td>
                    <td className="px-4 py-3 bg-white">
                      <span className="text-sm font-bold leading-5 text-zinc-900">
                        ${transaction.amount.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3 bg-white">
                      <div className="flex items-center gap-1">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            transaction.status === 'paid'
                              ? 'bg-green-500'
                              : transaction.status === 'open'
                                ? 'bg-yellow-500'
                                : transaction.status === 'draft'
                                  ? 'bg-gray-400'
                                  : 'bg-red-500'
                          }`}
                        ></div>
                        <span className="text-sm font-normal leading-5 text-zinc-900 capitalize">
                          {transaction.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 bg-white">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-zinc-100 cursor-pointer"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => handleViewInvoice(transaction)}
                          >
                            View Invoice
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => handleDownloadPDF(transaction)}
                          >
                            Download PDF
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cancel Subscription Modal */}
      <CancelSubscriptionModal
        isOpen={showCancelModal}
        onClose={() => {
          setShowCancelModal(false);
          setSkipPauseInCancel(false); // Reset skip flag when modal closes
        }}
        onConfirm={handleCancelSubscription}
        isLoading={isCanceling}
        planName={subscription.plan}
        nextPaymentDate={subscription.nextPaymentDate}
        skipPauseOption={skipPauseInCancel}
        onBackToResume={skipPauseInCancel ? handleBackToResume : undefined}
      />

      {/* Resume Subscription Modal */}
      <ResumeSubscriptionModal
        isOpen={showResumeModal}
        onClose={() => setShowResumeModal(false)}
        onConfirm={handleResumeSubscription}
        onCancelInstead={handleCancelInstead}
        isLoading={isCanceling}
        planName={subscription.plan}
        nextPaymentDate={subscription.nextPaymentDate}
        nextPaymentAmount={subscription.price}
        currency={subscription.currency}
      />

      {/* Add Payment Method Modal */}
      <AddPaymentMethodModal
        isOpen={showAddPaymentModal}
        onClose={() => setShowAddPaymentModal(false)}
        onSuccess={() => {
          setShowAddPaymentModal(false);
          fetchPaymentMethods();
        }}
      />

      {/* Set Primary Payment Method Modal */}
      <SetPrimaryPaymentMethodModal
        isOpen={showSetPrimaryModal}
        onClose={() => {
          setShowSetPrimaryModal(false);
          setSelectedPaymentMethod(null);
        }}
        onConfirm={() => {
          if (selectedPaymentMethod) {
            handleSetPrimary(selectedPaymentMethod.id);
          }
        }}
        isLoading={isCanceling}
        cardBrand={selectedPaymentMethod?.brand}
        cardLast4={selectedPaymentMethod?.last4}
      />

      {/* Remove Payment Method Modal */}
      <RemovePaymentMethodModal
        isOpen={showRemoveModal}
        onClose={() => {
          setShowRemoveModal(false);
          setSelectedPaymentMethod(null);
        }}
        onConfirm={() => {
          if (selectedPaymentMethod) {
            handleConfirmRemovePaymentMethod(selectedPaymentMethod.id);
          }
        }}
        isLoading={isCanceling}
        cardBrand={selectedPaymentMethod?.brand}
        cardLast4={selectedPaymentMethod?.last4}
        isPrimary={selectedPaymentMethod?.isPrimary}
      />
    </div>
  );
}
