'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
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
  status: 'complete' | 'pending' | 'failed';
}

interface BillingTabProps {
  user: {
    id?: string;
    email?: string | null;
  };
}

export function BillingTab({}: BillingTabProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [subscription] = useState({
    plan: 'Standard',
    price: 59.0,
    currency: 'USD',
    nextPaymentDate: 'April 08, 2022',
  });
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    {
      id: '1',
      brand: 'visa',
      last4: '4331',
      expiryMonth: 9,
      expiryYear: 2024,
      isPrimary: true,
    },
    {
      id: '2',
      brand: 'visa',
      last4: '5442',
      expiryMonth: 8,
      expiryYear: 2023,
      isPrimary: false,
    },
  ]);
  const [transactions] = useState<Transaction[]>([
    {
      id: '1',
      invoiceNumber: 'Standard Plan - Feb 2022',
      date: '07 February, 2022',
      amount: 59.0,
      status: 'complete',
    },
    {
      id: '2',
      invoiceNumber: 'Standard Plan - Jan 2022',
      date: '09 January, 2022',
      amount: 59.0,
      status: 'complete',
    },
    {
      id: '3',
      invoiceNumber: 'Basic Plan - Dec 2021',
      date: '15 December, 2021',
      amount: 29.0,
      status: 'complete',
    },
    {
      id: '4',
      invoiceNumber: 'Basic Plan - Nov 2021',
      date: '14 November, 2021',
      amount: 29.0,
      status: 'complete',
    },
    {
      id: '5',
      invoiceNumber: 'Basic Plan - Oct 2021',
      date: '15 October, 2021',
      amount: 29.0,
      status: 'complete',
    },
  ]);

  useEffect(() => {
    // Simulate loading billing data
    setTimeout(() => {
      setIsLoading(false);
    }, 500);
  }, []);

  const handleCancelSubscription = () => {
    if (
      confirm(
        'Are you sure you want to cancel your subscription? You will continue to have access until the end of your billing period.'
      )
    ) {
      toast.success('Subscription cancelled successfully');
    }
  };

  const handleAddPaymentMethod = () => {
    toast.info('Add payment method feature coming soon');
  };

  const handleSetPrimary = (methodId: string) => {
    setPaymentMethods(methods =>
      methods.map(method => ({
        ...method,
        isPrimary: method.id === methodId,
      }))
    );
    toast.success('Primary payment method updated');
  };

  const handleEditPaymentMethod = () => {
    toast.info('Edit payment method feature coming soon');
  };

  const handleExportCSV = () => {
    toast.info('Export feature coming soon');
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
            <h3 className="text-base font-bold leading-6 text-zinc-900">
              Subscription Plan:{' '}
              <span className="text-indigo-600">{subscription.plan}</span>
            </h3>
            <p className="text-sm font-normal leading-5 text-zinc-500">
              Monthly Plan
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleCancelSubscription}
            className="!h-10 px-4 text-sm font-medium leading-5 text-zinc-600 hover:text-zinc-900 border border-zinc-300 hover:bg-zinc-50 rounded-lg cursor-pointer"
          >
            Cancel Subscription
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm leading-5 text-zinc-900">
            <span className="font-medium">Your next payment is</span>{' '}
            <strong className="font-bold">
              ${subscription.price.toFixed(2)} {subscription.currency}
            </strong>
            <span className="font-medium">, to be charged on</span>{' '}
            <strong className="font-bold">
              {subscription.nextPaymentDate}
            </strong>
          </p>
          <p className="text-xs font-normal leading-5 text-zinc-500">
            Your payment will be automatically renewed each month
          </p>
        </div>
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
            {paymentMethods.map(method => (
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
                          onClick={() => handleSetPrimary(method.id)}
                          className="text-xs font-medium text-zinc-600 hover:text-zinc-900 cursor-pointer"
                        >
                          Set as Primary
                        </button>
                      )}
                      <button
                        onClick={() => handleEditPaymentMethod()}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-700 cursor-pointer"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

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
            <Button
              variant="ghost"
              size="sm"
              className="text-sm font-medium text-zinc-900 hover:bg-zinc-100 cursor-pointer"
            >
              Recent
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
              {transactions.map(transaction => (
                <tr key={transaction.id} className="hover:bg-zinc-50 bg-white">
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
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
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
                        <DropdownMenuItem className="cursor-pointer">
                          View Invoice
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer">
                          Download PDF
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
