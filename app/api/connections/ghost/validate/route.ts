import { NextRequest, NextResponse } from 'next/server';
import { GhostService } from '@/lib/services/ghost-service';
import {
  handleConnectionError,
  getErrorMessage,
} from '@/lib/errors/connection-errors';
import { z } from 'zod';

const ghostValidateSchema = z.object({
  domain: z.string().min(1, 'Domain is required'),
  adminApiKey: z.string().min(1, 'Admin API key is required'),
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const { domain, adminApiKey } = ghostValidateSchema.parse(body);

    // Validate domain and API key
    const result = await GhostService.validateCredentials(domain, adminApiKey);

    if (!result.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Invalid Ghost credentials',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      siteName: result.siteName,
      siteUrl: result.siteUrl,
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
    const connectionError = handleConnectionError(error, 'ghost');
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
