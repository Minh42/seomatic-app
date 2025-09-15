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
    const { username, password } = body; // Optional credentials

    // If credentials are provided, try to validate them first
    // This handles sites where REST API requires authentication
    if (username && password) {
      try {
        const credentialsValid = await WordPressService.validateCredentials(
          domain,
          username,
          password
        );

        if (credentialsValid) {
          // Credentials work, so it's definitely WordPress
          return NextResponse.json({
            success: true,
            isWordPress: true,
            restApiUrl: `https://${domain}/wp-json/wp/v2`,
            applicationPasswordsEnabled: true, // Credentials work, so auth is enabled
            credentialsValid: true,
          });
        }
      } catch (error) {
        // Credentials failed, but let's still check if it's WordPress
        console.error('Credential validation failed:', error);
      }
    }

    // Validate WordPress domain (without credentials)
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
      credentialsValid: false, // Credentials either not provided or invalid
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
