import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { ConnectionService } from '@/lib/services/connection-service';
import { WordPressService } from '@/lib/services/wordpress-service';
import {
  handleConnectionError,
  getErrorMessage,
} from '@/lib/errors/connection-errors';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the connection
    const connection = await ConnectionService.getById(params.id);
    if (!connection) {
      return NextResponse.json(
        { success: false, error: 'Connection not found' },
        { status: 404 }
      );
    }

    // Get decrypted credentials
    const credentials = await ConnectionService.getCredentials(params.id);
    if (!credentials) {
      return NextResponse.json(
        { success: false, error: 'Connection credentials not found' },
        { status: 404 }
      );
    }

    // Test the connection based on type
    if (connection.connectionType === 'wordpress') {
      // Test WordPress connection by validating credentials
      const isValid = await WordPressService.validateCredentials(
        connection.connectionUrl,
        credentials.username!,
        credentials.password!
      );

      if (isValid) {
        // Update connection status to active if it was in error
        if (connection.status !== 'active') {
          await ConnectionService.updateStatus(params.id, 'active');
        }

        return NextResponse.json({
          success: true,
          message: 'Connection is working properly',
          connection: {
            ...connection,
            status: 'active',
          },
        });
      } else {
        // Update connection status to error
        await ConnectionService.updateStatus(params.id, 'error');

        return NextResponse.json(
          {
            success: false,
            error: 'Connection test failed. Please check your credentials.',
            connection: {
              ...connection,
              status: 'error',
            },
          },
          { status: 400 }
        );
      }
    }

    // Other connection types can be added here

    return NextResponse.json(
      { success: false, error: 'Connection type not supported for testing' },
      { status: 400 }
    );
  } catch (error) {
    // Handle connection errors
    const connectionError = handleConnectionError(error);
    const message = getErrorMessage(connectionError);

    // Update connection status to error if test fails
    try {
      await ConnectionService.updateStatus(params.id, 'error');
    } catch {
      // Ignore if we can't update status
    }

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
