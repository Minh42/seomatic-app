import { NextRequest, NextResponse } from 'next/server';
import { WebflowService } from '@/lib/services/webflow-service';
import {
  handleConnectionError,
  getErrorMessage,
} from '@/lib/errors/connection-errors';
import { z } from 'zod';

const webflowValidateSchema = z.object({
  apiToken: z.string().min(1, 'API token is required'),
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const { apiToken } = webflowValidateSchema.parse(body);

    // Validate token and fetch sites
    const result = await WebflowService.validateToken(apiToken);

    if (!result.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Invalid Webflow API token',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      sites: result.sites,
    });
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: error.issues[0]?.message || 'Invalid request data',
        },
        { status: 400 }
      );
    }

    // Handle connection errors
    const connectionError = handleConnectionError(error, 'webflow');
    const message = getErrorMessage(connectionError);

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: connectionError.statusCode || 500 }
    );
  }
}
