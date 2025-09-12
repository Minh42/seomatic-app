import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { ConnectionService } from '@/lib/services/connection-service';
import { WebflowService } from '@/lib/services/webflow-service';
import {
  handleConnectionError,
  getErrorMessage,
} from '@/lib/errors/connection-errors';

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

    // Parse request body
    const body = await request.json();
    const { workspaceId } = body;

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, error: 'Workspace ID is required' },
        { status: 400 }
      );
    }

    // Get the existing connection
    const connection = await ConnectionService.getByWorkspaceId(workspaceId);

    if (!connection || connection.connectionType !== 'webflow') {
      return NextResponse.json(
        { success: false, error: 'No Webflow connection found' },
        { status: 404 }
      );
    }

    // Get decrypted credentials
    const credentials = await ConnectionService.getCredentials(connection.id);

    if (!credentials || !credentials.apiKey) {
      return NextResponse.json(
        { success: false, error: 'Connection credentials not found' },
        { status: 404 }
      );
    }

    // Fetch sites using the stored API token
    const validationResult = await WebflowService.validateToken(
      credentials.apiKey
    );

    if (!validationResult.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: validationResult.error || 'Failed to fetch sites',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      sites: validationResult.sites || [],
      currentSiteId: connection.cms?.cmsSiteId,
    });
  } catch (error) {
    // Handle connection errors
    const connectionError = handleConnectionError(error, 'webflow');
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
