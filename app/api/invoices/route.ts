import { NextRequest, NextResponse } from 'next/server';
import { SubscriptionService } from '@/lib/services/subscription-service';
import { StripeService } from '@/lib/services/stripe-service';
import { requireRole, getUserFromRequest } from '@/lib/middleware/require-role';
import { StripeErrorHandler } from '@/lib/errors/stripe-errors';

/**
 * GET /api/invoices
 * Get the current user's invoices/transactions from Stripe (owner only)
 */
export async function GET(request: NextRequest) {
  try {
    // Require owner role to view invoices
    const roleCheck = await requireRole(request, { requiredRole: 'owner' });
    if (roleCheck) return roleCheck;

    // Get URL params
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const sortBy = searchParams.get('sortBy') || 'date';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const { user } = getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get subscription to get Stripe customer ID
    const subscription = await SubscriptionService.getByOwnerId(user.id);

    if (!subscription?.stripeCustomerId) {
      return NextResponse.json({
        invoices: [],
        message: 'No Stripe customer found',
      });
    }

    // Get invoices from Stripe
    const invoices = await StripeService.getInvoices(
      subscription.stripeCustomerId,
      limit
    );

    // Format the response
    const formattedInvoices = invoices.map(invoice => ({
      id: invoice.id,
      invoiceNumber: invoice.number || invoice.id,
      date: invoice.created
        ? new Date(invoice.created * 1000).toISOString()
        : null,
      dueDate: invoice.due_date
        ? new Date(invoice.due_date * 1000).toISOString()
        : null,
      amount: (invoice.amount_paid || invoice.amount_due || 0) / 100,
      currency: invoice.currency?.toUpperCase() || 'USD',
      status: invoice.status || 'draft',
      pdfUrl: invoice.invoice_pdf || null,
      hostedUrl: invoice.hosted_invoice_url || null,
      description: invoice.description || 'Subscription payment',
      period: {
        start: invoice.period_start
          ? new Date(invoice.period_start * 1000).toISOString()
          : null,
        end: invoice.period_end
          ? new Date(invoice.period_end * 1000).toISOString()
          : null,
      },
    }));

    // Sort invoices
    const sortedInvoices = [...formattedInvoices].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'date':
          comparison =
            new Date(b.date!).getTime() - new Date(a.date!).getTime();
          break;
        case 'amount':
          comparison = b.amount - a.amount;
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        default:
          comparison =
            new Date(b.date!).getTime() - new Date(a.date!).getTime();
      }

      return sortOrder === 'asc' ? -comparison : comparison;
    });

    return NextResponse.json({
      invoices: sortedInvoices,
      total: sortedInvoices.length,
    });
  } catch (error) {
    const stripeError = StripeErrorHandler.handleInvoiceError(error, 'fetch');
    StripeErrorHandler.logError('GET /api/invoices', stripeError);
    return NextResponse.json(
      StripeErrorHandler.formatApiResponse(stripeError),
      { status: StripeErrorHandler.getStatusCode(stripeError) }
    );
  }
}
