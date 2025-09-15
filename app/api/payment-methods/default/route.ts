import { NextRequest, NextResponse } from 'next/server';
import { SubscriptionService } from '@/lib/services/subscription-service';
import { StripeService } from '@/lib/services/stripe-service';
import { requireRole, getUserFromRequest } from '@/lib/middleware/require-role';
import { StripeErrorHandler } from '@/lib/errors/stripe-errors';

/**
 * PUT /api/payment-methods/default
 * Set a payment method as default (owner only)
 */
export async function PUT(request: NextRequest) {
  try {
    // Require owner role to set default payment method
    const roleCheck = await requireRole(request, { requiredRole: 'owner' });
    if (roleCheck) return roleCheck;

    const { paymentMethodId } = await request.json();

    if (!paymentMethodId) {
      return NextResponse.json(
        { error: 'Payment method ID is required' },
        { status: 400 }
      );
    }

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

    // Set default payment method in Stripe
    const success = await StripeService.setDefaultPaymentMethod(
      subscription.stripeCustomerId,
      paymentMethodId
    );

    if (!success) {
      const stripeError = StripeErrorHandler.handlePaymentMethodError(
        new Error('Failed to set default payment method'),
        'update'
      );
      return NextResponse.json(
        StripeErrorHandler.formatApiResponse(stripeError),
        { status: StripeErrorHandler.getStatusCode(stripeError) }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Default payment method updated successfully',
    });
  } catch (error) {
    const stripeError = StripeErrorHandler.handlePaymentMethodError(
      error,
      'update'
    );
    StripeErrorHandler.logError(
      'PUT /api/payment-methods/default',
      stripeError
    );
    return NextResponse.json(
      StripeErrorHandler.formatApiResponse(stripeError),
      { status: StripeErrorHandler.getStatusCode(stripeError) }
    );
  }
}
