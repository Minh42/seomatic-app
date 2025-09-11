import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { WordPressService } from '@/lib/services/wordpress-service';
import { wordPressCallbackSchema } from '@/lib/validations/connection';
import {
  handleConnectionError,
  getErrorMessage,
} from '@/lib/errors/connection-errors';
import { z } from 'zod';

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
    const { workspaceId, domain, username, password, success, error } =
      wordPressCallbackSchema.parse(body);

    // Handle rejection from WordPress
    if (!success || error) {
      return NextResponse.json(
        {
          success: false,
          error: error || 'Authorization was rejected',
        },
        { status: 400 }
      );
    }

    // Create the connection with credentials
    const connection = await WordPressService.createConnection({
      workspaceId,
      domain,
      username,
      applicationPassword: password,
    });

    return NextResponse.json({
      success: true,
      connection: {
        id: connection.id,
        workspaceId: connection.workspaceId,
        connectionUrl: connection.connectionUrl,
        connectionType: connection.connectionType,
        status: connection.status,
      },
      message: 'WordPress connection established successfully',
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

// Handle GET request for OAuth-style callback
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const domain = searchParams.get('domain');
  const status = searchParams.get('status');
  const user_login = searchParams.get('user_login');
  const password = searchParams.get('password');
  const error = searchParams.get('error');

  // Redirect to dashboard with parameters
  const redirectUrl = new URL('/dashboard/connections', request.url);

  if (status === 'success' && user_login && password) {
    // Success - redirect with success params
    redirectUrl.searchParams.set('wordpress_success', 'true');
    redirectUrl.searchParams.set('domain', domain || '');
    redirectUrl.searchParams.set('username', user_login);
    // Note: In production, pass password securely through session storage
    redirectUrl.searchParams.set(
      'temp_token',
      Buffer.from(password).toString('base64')
    );
  } else {
    // Error - redirect with error
    redirectUrl.searchParams.set('wordpress_error', 'true');
    redirectUrl.searchParams.set('error', error || 'Authorization failed');
  }

  return NextResponse.redirect(redirectUrl);
}
