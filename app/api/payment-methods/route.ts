import { NextRequest, NextResponse } from 'next/server';
import { SubscriptionService } from '@/lib/services/subscription-service';
import { StripeService } from '@/lib/services/stripe-service';
import { requireRole, getUserFromRequest } from '@/lib/middleware/require-role';
import { StripeErrorHandler } from '@/lib/errors/stripe-errors';

/**
 * GET /api/payment-methods
 * Get the current user's payment methods from Stripe (owner only)
 */
export async function GET(request: NextRequest) {
  try {
    // Require owner role to view payment methods
    const roleCheck = await requireRole(request, { requiredRole: 'owner' });
    if (roleCheck) return roleCheck;

    const { user } = getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get subscription to get Stripe customer ID
    const subscription = await SubscriptionService.getByOwnerId(user.id);

    if (!subscription?.stripeCustomerId) {
      return NextResponse.json({
        paymentMethods: [],
        defaultPaymentMethodId: null,
      });
    }

    // Get payment methods from Stripe
    const paymentMethods = await StripeService.getPaymentMethods(
      subscription.stripeCustomerId
    );
    const defaultPaymentMethodId = await StripeService.getDefaultPaymentMethod(
      subscription.stripeCustomerId
    );

    // Format the response
    const formattedPaymentMethods = paymentMethods.map(pm => ({
      id: pm.id,
      brand: pm.card?.brand || 'unknown',
      last4: pm.card?.last4 || '****',
      expiryMonth: pm.card?.exp_month || 0,
      expiryYear: pm.card?.exp_year || 0,
      isPrimary: pm.id === defaultPaymentMethodId,
    }));

    return NextResponse.json({
      paymentMethods: formattedPaymentMethods,
      defaultPaymentMethodId,
    });
  } catch (error) {
    const stripeError = StripeErrorHandler.handlePaymentMethodError(
      error,
      'fetch'
    );
    StripeErrorHandler.logError('GET /api/payment-methods', stripeError);
    return NextResponse.json(
      StripeErrorHandler.formatApiResponse(stripeError),
      { status: StripeErrorHandler.getStatusCode(stripeError) }
    );
  }
}

/**
 * POST /api/payment-methods
 * Create a setup intent for adding a new payment method (owner only)
 */
export async function POST(request: NextRequest) {
  try {
    // Require owner role to add payment methods
    const roleCheck = await requireRole(request, { requiredRole: 'owner' });
    if (roleCheck) return roleCheck;

    const { user } = getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get subscription to get Stripe customer ID
    const subscription = await SubscriptionService.getByOwnerId(user.id);

    if (!subscription?.stripeCustomerId) {
      return NextResponse.json(
        { error: 'No Stripe customer found' },
        { status: 404 }
      );
    }

    // Create setup intent
    const clientSecret = await StripeService.createSetupIntent(
      subscription.stripeCustomerId
    );

    if (!clientSecret) {
      const stripeError = StripeErrorHandler.handlePaymentMethodError(
        new Error('Failed to create setup intent'),
        'add'
      );
      return NextResponse.json(
        StripeErrorHandler.formatApiResponse(stripeError),
        { status: StripeErrorHandler.getStatusCode(stripeError) }
      );
    }

    return NextResponse.json({
      clientSecret,
    });
  } catch (error) {
    const stripeError = StripeErrorHandler.handlePaymentMethodError(
      error,
      'add'
    );
    StripeErrorHandler.logError('POST /api/payment-methods', stripeError);
    return NextResponse.json(
      StripeErrorHandler.formatApiResponse(stripeError),
      { status: StripeErrorHandler.getStatusCode(stripeError) }
    );
  }
}

/**
 * DELETE /api/payment-methods
 * Remove a payment method (owner only)
 */
export async function DELETE(request: NextRequest) {
  try {
    // Require owner role to remove payment methods
    const roleCheck = await requireRole(request, { requiredRole: 'owner' });
    if (roleCheck) return roleCheck;

    const { paymentMethodId } = await request.json();

    if (!paymentMethodId) {
      return NextResponse.json(
        { error: 'Payment method ID is required' },
        { status: 400 }
      );
    }

    // Detach payment method from Stripe
    const success = await StripeService.detachPaymentMethod(paymentMethodId);

    if (!success) {
      const stripeError = StripeErrorHandler.handlePaymentMethodError(
        new Error('Failed to remove payment method'),
        'remove'
      );
      return NextResponse.json(
        StripeErrorHandler.formatApiResponse(stripeError),
        { status: StripeErrorHandler.getStatusCode(stripeError) }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Payment method removed successfully',
    });
  } catch (error) {
    const stripeError = StripeErrorHandler.handlePaymentMethodError(
      error,
      'remove'
    );
    StripeErrorHandler.logError('DELETE /api/payment-methods', stripeError);
    return NextResponse.json(
      StripeErrorHandler.formatApiResponse(stripeError),
      { status: StripeErrorHandler.getStatusCode(stripeError) }
    );
  }
}
