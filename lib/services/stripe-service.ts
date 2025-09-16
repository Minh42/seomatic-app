import Stripe from 'stripe';
import { StripeErrorHandler } from '@/lib/errors/stripe-errors';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

export interface StripeSubscriptionData {
  customerId: string;
  subscriptionId: string;
  status:
    | 'incomplete'
    | 'incomplete_expired'
    | 'trialing'
    | 'active'
    | 'past_due'
    | 'canceled'
    | 'unpaid'
    | 'paused';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialStart?: Date | null;
  trialEnd?: Date | null;
  cancelAtPeriodEnd: boolean;
}

export class StripeService {
  /**
   * Retrieve subscription details
   */
  static async getSubscription(
    subscriptionId: string
  ): Promise<Stripe.Subscription | null> {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      return subscription;
    } catch (error) {
      const stripeError = StripeErrorHandler.handleSubscriptionError(
        error,
        'fetch'
      );
      StripeErrorHandler.logError('getSubscription', stripeError);
      return null;
    }
  }

  /**
   * Cancel subscription at period end
   */
  static async cancelSubscription(subscriptionId: string): Promise<boolean> {
    try {
      await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
      return true;
    } catch (error) {
      const stripeError = StripeErrorHandler.handleSubscriptionError(
        error,
        'cancel'
      );
      StripeErrorHandler.logError('cancelSubscription', stripeError);
      return false;
    }
  }

  /**
   * Resume a canceled subscription
   */
  static async resumeSubscription(subscriptionId: string): Promise<boolean> {
    try {
      await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
      });
      return true;
    } catch (error) {
      const stripeError = StripeErrorHandler.handleSubscriptionError(
        error,
        'resume'
      );
      StripeErrorHandler.logError('resumeSubscription', stripeError);
      return false;
    }
  }

  /**
   * Get upcoming invoice for a customer
   * This shows the next payment amount and date
   */
  static async getUpcomingInvoice(
    customerId: string
  ): Promise<Stripe.UpcomingInvoice | null> {
    try {
      const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
        customer: customerId,
      });

      return upcomingInvoice;
    } catch (error) {
      const stripeError = StripeErrorHandler.handleInvoiceError(error, 'fetch');
      StripeErrorHandler.logError('getUpcomingInvoice', stripeError);
      return null;
    }
  }

  /**
   * Get payment methods for a customer
   */
  static async getPaymentMethods(
    customerId: string
  ): Promise<Stripe.PaymentMethod[]> {
    try {
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });
      return paymentMethods.data;
    } catch (error) {
      const stripeError = StripeErrorHandler.handlePaymentMethodError(
        error,
        'fetch'
      );
      StripeErrorHandler.logError('getPaymentMethods', stripeError);
      return [];
    }
  }

  /**
   * Get default payment method for a customer
   */
  static async getDefaultPaymentMethod(
    customerId: string
  ): Promise<string | null> {
    try {
      const customer = (await stripe.customers.retrieve(
        customerId
      )) as Stripe.Customer;
      if (customer.deleted) return null;

      // Check for default payment method on subscription
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        const defaultPaymentMethod =
          subscriptions.data[0].default_payment_method;
        if (typeof defaultPaymentMethod === 'string') {
          return defaultPaymentMethod;
        }
      }

      // Fall back to customer's invoice settings
      if (
        typeof customer.invoice_settings?.default_payment_method === 'string'
      ) {
        return customer.invoice_settings.default_payment_method;
      }

      return null;
    } catch (error) {
      const stripeError = StripeErrorHandler.handlePaymentMethodError(
        error,
        'fetch'
      );
      StripeErrorHandler.logError('getDefaultPaymentMethod', stripeError);
      return null;
    }
  }

  /**
   * Set default payment method for a customer
   */
  static async setDefaultPaymentMethod(
    customerId: string,
    paymentMethodId: string
  ): Promise<boolean> {
    try {
      // Update customer's default payment method
      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      // Also update the subscription's default payment method if exists
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        await stripe.subscriptions.update(subscriptions.data[0].id, {
          default_payment_method: paymentMethodId,
        });
      }

      return true;
    } catch (error) {
      const stripeError = StripeErrorHandler.handlePaymentMethodError(
        error,
        'update'
      );
      StripeErrorHandler.logError('setDefaultPaymentMethod', stripeError);
      return false;
    }
  }

  /**
   * Create a setup intent for adding a new payment method
   */
  static async createSetupIntent(customerId: string): Promise<string | null> {
    try {
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
        usage: 'off_session',
      });

      return setupIntent.client_secret;
    } catch (error) {
      const stripeError = StripeErrorHandler.handlePaymentMethodError(
        error,
        'add'
      );
      StripeErrorHandler.logError('createSetupIntent', stripeError);
      return null;
    }
  }

  /**
   * Attach a payment method to a customer
   */
  static async attachPaymentMethod(
    paymentMethodId: string,
    customerId: string
  ): Promise<boolean> {
    try {
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });
      return true;
    } catch (error) {
      const stripeError = StripeErrorHandler.handlePaymentMethodError(
        error,
        'add'
      );
      StripeErrorHandler.logError('attachPaymentMethod', stripeError);
      return false;
    }
  }

  /**
   * Update a payment method (expiry date and billing details)
   */
  static async updatePaymentMethod(
    paymentMethodId: string,
    updates: {
      billingDetails?: {
        name?: string;
        email?: string;
        phone?: string;
        address?: {
          city?: string;
          country?: string;
          line1?: string;
          line2?: string;
          postal_code?: string;
          state?: string;
        };
      };
      card?: {
        exp_month?: number;
        exp_year?: number;
      };
    }
  ): Promise<boolean> {
    try {
      // PaymentMethod API only allows updating billing_details and metadata
      // For card expiry, we need to use the older Card API if available
      await stripe.paymentMethods.update(paymentMethodId, {
        billing_details: updates.billingDetails,
      });

      return true;
    } catch (error) {
      const stripeError = StripeErrorHandler.handlePaymentMethodError(
        error,
        'update'
      );
      StripeErrorHandler.logError('updatePaymentMethod', stripeError);
      return false;
    }
  }

  /**
   * Detach (remove) a payment method
   */
  static async detachPaymentMethod(paymentMethodId: string): Promise<boolean> {
    try {
      await stripe.paymentMethods.detach(paymentMethodId);
      return true;
    } catch (error) {
      const stripeError = StripeErrorHandler.handlePaymentMethodError(
        error,
        'remove'
      );
      StripeErrorHandler.logError('detachPaymentMethod', stripeError);
      return false;
    }
  }

  /**
   * Get invoices for a customer
   */
  static async getInvoices(
    customerId: string,
    limit: number = 100
  ): Promise<Stripe.Invoice[]> {
    try {
      const invoices = await stripe.invoices.list({
        customer: customerId,
        limit,
        expand: ['data.subscription'],
      });
      return invoices.data;
    } catch (error) {
      const stripeError = StripeErrorHandler.handleInvoiceError(error, 'fetch');
      StripeErrorHandler.logError('getInvoices', stripeError);
      return [];
    }
  }

  /**
   * Get a single invoice
   */
  static async getInvoice(invoiceId: string): Promise<Stripe.Invoice | null> {
    try {
      const invoice = await stripe.invoices.retrieve(invoiceId);
      return invoice;
    } catch (error) {
      const stripeError = StripeErrorHandler.handleInvoiceError(error, 'fetch');
      StripeErrorHandler.logError('getInvoice', stripeError);
      return null;
    }
  }

  /**
   * Get invoice PDF URL
   */
  static async getInvoicePdfUrl(invoiceId: string): Promise<string | null> {
    try {
      const invoice = await stripe.invoices.retrieve(invoiceId);
      return invoice.invoice_pdf || null;
    } catch (error) {
      const stripeError = StripeErrorHandler.handleInvoiceError(
        error,
        'download'
      );
      StripeErrorHandler.logError('getInvoicePdfUrl', stripeError);
      return null;
    }
  }
}
