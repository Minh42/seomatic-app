import { toast } from 'sonner';

export type StripeErrorType =
  | 'payment_failed'
  | 'card_declined'
  | 'insufficient_funds'
  | 'expired_card'
  | 'invalid_card'
  | 'subscription_error'
  | 'invoice_error'
  | 'customer_error'
  | 'setup_intent_error'
  | 'payment_method_error'
  | 'webhook_error'
  | 'api_error'
  | 'rate_limit'
  | 'network_error'
  | 'general';

export interface StripeError {
  type: StripeErrorType;
  message: string;
  code?: string;
  statusCode?: number;
  originalError?: any;
}

export class StripeErrorHandler {
  /**
   * Map Stripe error codes to user-friendly messages
   */
  private static errorMessages: Record<string, string> = {
    // Card errors
    card_declined: 'Your card was declined. Please try a different card.',
    insufficient_funds: 'Your card has insufficient funds.',
    expired_card: 'Your card has expired. Please update your payment method.',
    incorrect_cvc: 'The card security code is incorrect.',
    processing_error:
      'An error occurred while processing your card. Please try again.',
    incorrect_number: 'The card number is incorrect.',

    // Subscription errors
    subscription_payment_failed:
      'Subscription payment failed. Please update your payment method.',
    subscription_canceled: 'This subscription has been canceled.',
    subscription_not_found: 'Subscription not found.',

    // Invoice errors
    invoice_not_found: 'Invoice not found.',
    invoice_payment_failed: 'Invoice payment failed.',

    // Customer errors
    customer_not_found: 'Customer record not found in Stripe.',
    no_payment_method:
      'No payment method on file. Please add a payment method.',

    // General errors
    api_key_expired: 'API key expired. Please contact support.',
    rate_limit_error: 'Too many requests. Please try again later.',
    api_connection_error:
      'Unable to connect to payment service. Please try again.',
  };

  /**
   * Parse Stripe error and return standardized error object
   */
  static parseStripeError(error: any): StripeError {
    // Handle Stripe-specific error structure
    if (error?.type === 'StripeCardError') {
      return {
        type: 'card_declined',
        message:
          this.errorMessages[error.code] ||
          error.message ||
          'Card error occurred',
        code: error.code,
        statusCode: error.statusCode || 400,
        originalError: error,
      };
    }

    if (error?.type === 'StripeRateLimitError') {
      return {
        type: 'rate_limit',
        message: this.errorMessages['rate_limit_error'],
        code: 'rate_limit_error',
        statusCode: 429,
        originalError: error,
      };
    }

    if (error?.type === 'StripeConnectionError') {
      return {
        type: 'network_error',
        message: this.errorMessages['api_connection_error'],
        code: 'api_connection_error',
        statusCode: 500,
        originalError: error,
      };
    }

    if (error?.type === 'StripeAPIError') {
      return {
        type: 'api_error',
        message: error.message || 'An error occurred with the payment service',
        code: error.code,
        statusCode: error.statusCode || 500,
        originalError: error,
      };
    }

    // Handle error codes
    if (error?.code) {
      const message = this.errorMessages[error.code];
      if (message) {
        return {
          type: this.getErrorTypeFromCode(error.code),
          message,
          code: error.code,
          statusCode: error.statusCode || 400,
          originalError: error,
        };
      }
    }

    // Default error
    return {
      type: 'general',
      message: error?.message || 'An unexpected error occurred',
      code: error?.code,
      statusCode: error?.statusCode || 500,
      originalError: error,
    };
  }

  /**
   * Get error type from Stripe error code
   */
  private static getErrorTypeFromCode(code: string): StripeErrorType {
    if (code.includes('card') || code.includes('declined'))
      return 'card_declined';
    if (code.includes('subscription')) return 'subscription_error';
    if (code.includes('invoice')) return 'invoice_error';
    if (code.includes('customer')) return 'customer_error';
    if (code.includes('payment_method')) return 'payment_method_error';
    if (code.includes('setup_intent')) return 'setup_intent_error';
    return 'general';
  }

  /**
   * Handle subscription-related errors
   */
  static handleSubscriptionError(
    error: any,
    action: 'fetch' | 'cancel' | 'resume' = 'fetch'
  ): StripeError {
    const stripeError = this.parseStripeError(error);

    // Customize message based on action
    switch (action) {
      case 'cancel':
        stripeError.message =
          stripeError.message ||
          'Failed to cancel subscription. Please try again.';
        break;
      case 'resume':
        stripeError.message =
          stripeError.message ||
          'Failed to resume subscription. Please try again.';
        break;
      default:
        stripeError.message =
          stripeError.message || 'Failed to fetch subscription details.';
    }

    return stripeError;
  }

  /**
   * Handle payment method errors
   */
  static handlePaymentMethodError(
    error: any,
    action: 'add' | 'remove' | 'update' | 'fetch' = 'fetch'
  ): StripeError {
    const stripeError = this.parseStripeError(error);

    // Customize message based on action
    switch (action) {
      case 'add':
        stripeError.message =
          stripeError.message ||
          'Failed to add payment method. Please check your card details.';
        break;
      case 'remove':
        stripeError.message =
          stripeError.message ||
          'Failed to remove payment method. Please try again.';
        break;
      case 'update':
        stripeError.message =
          stripeError.message ||
          'Failed to update payment method. Please try again.';
        break;
      default:
        stripeError.message =
          stripeError.message || 'Failed to fetch payment methods.';
    }

    return stripeError;
  }

  /**
   * Handle invoice errors
   */
  static handleInvoiceError(
    error: any,
    action: 'fetch' | 'download' = 'fetch'
  ): StripeError {
    const stripeError = this.parseStripeError(error);

    // Customize message based on action
    if (action === 'download') {
      stripeError.message =
        stripeError.message || 'Failed to download invoice. Please try again.';
    } else {
      stripeError.message = stripeError.message || 'Failed to fetch invoices.';
    }

    return stripeError;
  }

  /**
   * Display error to user (for client-side usage)
   */
  static displayError(error: StripeError) {
    toast.error(error.message);
  }

  /**
   * Log error for debugging (server-side)
   */
  static logError(context: string, error: StripeError) {
    console.error(`[Stripe Error - ${context}]`, {
      type: error.type,
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      originalError: error.originalError,
    });
  }

  /**
   * Format error for API response
   */
  static formatApiResponse(error: StripeError) {
    return {
      error: error.message,
      code: error.code,
      type: error.type,
    };
  }

  /**
   * Get HTTP status code from error
   */
  static getStatusCode(error: StripeError): number {
    return error.statusCode || 500;
  }
}
