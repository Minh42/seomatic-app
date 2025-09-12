import { NextRequest, NextResponse } from 'next/server';
import { ShopifyService } from '@/lib/services/shopify-service';
import {
  handleConnectionError,
  getErrorMessage,
} from '@/lib/errors/connection-errors';
import { z } from 'zod';

const shopifyValidateSchema = z.object({
  storeDomain: z.string().min(1, 'Store domain is required'),
  accessToken: z.string().min(1, 'Access token is required'),
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const { storeDomain, accessToken } = shopifyValidateSchema.parse(body);

    // Validate store and token
    const result = await ShopifyService.validateStore(storeDomain, accessToken);

    if (!result.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Invalid Shopify credentials',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
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
