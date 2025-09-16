import { NextRequest, NextResponse } from 'next/server';
import { StripeService } from '@/lib/services/stripe-service';
import { requireRole, getUserFromRequest } from '@/lib/middleware/require-role';
import { StripeErrorHandler } from '@/lib/errors/stripe-errors';

/**
 * GET /api/invoices/[id]
 * Get invoice details or redirect to PDF (owner only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Get URL params (declare outside try block for catch block access)
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action'); // 'pdf' or 'view'

  try {
    // Require owner role to view invoices
    const roleCheck = await requireRole(request, { requiredRole: 'owner' });
    if (roleCheck) return roleCheck;

    const invoiceId = (await params).id;
    const { user } = getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get invoice from Stripe
    const invoice = await StripeService.getInvoice(invoiceId);

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // For PDF download, redirect to Stripe's PDF URL
    if (action === 'pdf' && invoice.invoice_pdf) {
      return NextResponse.redirect(invoice.invoice_pdf);
    }

    // For viewing, redirect to Stripe's hosted invoice page
    if (action === 'view' && invoice.hosted_invoice_url) {
      return NextResponse.redirect(invoice.hosted_invoice_url);
    }

    // Return invoice details
    return NextResponse.json({
      id: invoice.id,
      number: invoice.number || invoice.id,
      date: invoice.created
        ? new Date(invoice.created * 1000).toISOString()
        : null,
      amount: (invoice.amount_paid || invoice.amount_due || 0) / 100,
      currency: invoice.currency?.toUpperCase() || 'USD',
      status: invoice.status || 'draft',
      pdfUrl: invoice.invoice_pdf || null,
      hostedUrl: invoice.hosted_invoice_url || null,
      description: invoice.description || 'Subscription payment',
    });
  } catch (error) {
    const stripeError = StripeErrorHandler.handleInvoiceError(
      error,
      action === 'pdf' ? 'download' : 'fetch'
    );
    StripeErrorHandler.logError(
      `GET /api/invoices/${(await params).id}`,
      stripeError
    );
    return NextResponse.json(
      StripeErrorHandler.formatApiResponse(stripeError),
      { status: StripeErrorHandler.getStatusCode(stripeError) }
    );
  }
}
