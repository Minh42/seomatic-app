import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { ShopifyService } from '@/lib/services/shopify-service';
import { ConnectionService } from '@/lib/services/connection-service';
import {
  handleConnectionError,
  getErrorMessage,
} from '@/lib/errors/connection-errors';
import { z } from 'zod';

const shopifyConnectSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID'),
  storeDomain: z.string().min(1, 'Store domain is required'),
  accessToken: z.string().min(1, 'Access token is required'),
  isUpdate: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const { workspaceId, storeDomain, accessToken } =
      shopifyConnectSchema.parse(body);

    // Verify user owns the workspace
    const hasAccess = await ConnectionService.verifyWorkspaceOwnership(
      workspaceId,
      session.user.id
    );
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied to this workspace' },
        { status: 403 }
      );
    }

    // Create or update the connection
    const result = await ShopifyService.createConnection({
      workspaceId,
      storeDomain,
      accessToken,
    });

    return NextResponse.json({
      success: true,
      message: 'Shopify connection established successfully',
      shopName: result.shopName,
      primaryDomain: result.primaryDomain,
    });
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: error.errors[0]?.message || 'Invalid request data',
        },
        { status: 400 }
      );
    }

    // Handle connection errors
    const connectionError = handleConnectionError(error, 'shopify');
    const message = getErrorMessage(connectionError);

    return NextResponse.json(
      {
        success: false,
        error: message,
        code: connectionError.code,
      },
      { status: connectionError.statusCode || 500 }
    );
  }
}
