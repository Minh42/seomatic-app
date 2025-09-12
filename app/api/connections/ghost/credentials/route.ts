import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { ConnectionService } from '@/lib/services/connection-service';
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

    if (!connection || connection.connectionType !== 'ghost') {
      return NextResponse.json(
        { success: false, error: 'No Ghost connection found' },
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

    // Return the decrypted token and domain info
    return NextResponse.json({
      success: true,
      adminApiKey: credentials.apiKey,
      domain: connection.connectionUrl,
      siteName: connection.cms?.cmsSiteId, // We store site name in cmsSiteId
    });
  } catch (error) {
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
