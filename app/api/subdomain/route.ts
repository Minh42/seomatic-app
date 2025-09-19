import { NextRequest, NextResponse } from 'next/server';
import { SubdomainService } from '@/lib/services/subdomain-service';
import { rootDomain, protocol } from '@/lib/utils';

/**
 * POST /api/subdomain
 * Create a new subdomain
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subdomain, icon } = body;

    if (!subdomain || !icon) {
      return NextResponse.json(
        { error: 'Subdomain and icon are required' },
        { status: 400 }
      );
    }

    const result = await SubdomainService.create(subdomain, icon);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Return success with redirect URL
    return NextResponse.json({
      success: true,
      redirectUrl: `${protocol}://${subdomain}.${rootDomain}`,
    });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/subdomain
 * Get all subdomains (admin only)
 */
export async function GET() {
  try {
    const subdomains = await SubdomainService.getAll();
    return NextResponse.json(subdomains);
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/subdomain
 * Delete a subdomain
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subdomain = searchParams.get('subdomain');

    if (!subdomain) {
      return NextResponse.json(
        { error: 'Subdomain is required' },
        { status: 400 }
      );
    }

    await SubdomainService.delete(subdomain);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
