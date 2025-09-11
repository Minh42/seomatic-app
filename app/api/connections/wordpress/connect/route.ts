import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { WordPressService } from '@/lib/services/wordpress-service';
import { ConnectionService } from '@/lib/services/connection-service';
import { wordPressConnectSchema } from '@/lib/validations/connection';
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
    const { workspaceId, domain } = wordPressConnectSchema.parse(body);

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

    // Check if domain is already connected
    const isConnected = await ConnectionService.isDomainConnected(domain);
    if (isConnected) {
      return NextResponse.json(
        {
          success: false,
          error: 'This domain is already connected to another workspace',
        },
        { status: 400 }
      );
    }

    // Validate WordPress domain first
    const validation = await WordPressService.validateDomain(domain);
    if (!validation.isValid || !validation.isWordPress) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error || 'Not a valid WordPress site',
        },
        { status: 400 }
      );
    }

    if (!validation.applicationPasswordsEnabled) {
      return NextResponse.json(
        {
          success: false,
          error: 'Application Passwords are not enabled on this WordPress site',
        },
        { status: 400 }
      );
    }

    // Generate authorization URL with the endpoint from WordPress API
    const authUrl = await WordPressService.generateAuthUrl(
      domain,
      validation.authorizationEndpoint
    );

    // Store pending connection in session or temporary storage
    // This will be completed when the callback is received

    return NextResponse.json({
      success: true,
      authUrl,
      message: 'Redirect user to WordPress for authorization',
    });
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: error.errors?.[0]?.message || 'Invalid request data',
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
