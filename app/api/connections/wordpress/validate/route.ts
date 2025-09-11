import { NextRequest, NextResponse } from 'next/server';
import { WordPressService } from '@/lib/services/wordpress-service';
import { wordPressValidateSchema } from '@/lib/validations/connection';
import {
  handleConnectionError,
  getErrorMessage,
} from '@/lib/errors/connection-errors';
import { z } from 'zod';

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const { domain } = wordPressValidateSchema.parse(body);

    // Validate WordPress domain
    const result = await WordPressService.validateDomain(domain);

    if (!result.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Invalid WordPress site',
          isWordPress: result.isWordPress,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      isWordPress: result.isWordPress,
      restApiUrl: result.restApiUrl,
      applicationPasswordsEnabled: result.applicationPasswordsEnabled,
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
    const connectionError = handleConnectionError(error, 'wordpress');
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
