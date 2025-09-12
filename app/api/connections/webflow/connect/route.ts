import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { WebflowService } from '@/lib/services/webflow-service';
import { ConnectionService } from '@/lib/services/connection-service';
import {
  handleConnectionError,
  getErrorMessage,
} from '@/lib/errors/connection-errors';
import { z } from 'zod';

const webflowConnectSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID'),
  apiToken: z.string().min(1, 'API token is required'),
  siteId: z.string().min(1, 'Site ID is required'),
  siteName: z.string().min(1, 'Site name is required'),
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
    const { workspaceId, apiToken, siteId, siteName } =
      webflowConnectSchema.parse(body);

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

    // Validate the token
    const validation = await WebflowService.validateToken(apiToken);
    if (!validation.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error || 'Invalid Webflow API token',
        },
        { status: 400 }
      );
    }

    // Make sure the selected site exists in the validated sites
    const siteExists = validation.sites?.some(site => site.id === siteId);
    if (!siteExists) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Selected site not found or not accessible with this API token',
        },
        { status: 400 }
      );
    }

    // Create or update the connection
    await WebflowService.createConnection({
      workspaceId,
      apiToken,
      siteId,
      siteName,
    });

    return NextResponse.json({
      success: true,
      message: 'Webflow connection established successfully',
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
