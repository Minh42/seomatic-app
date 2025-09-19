import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { ConnectionService } from '@/lib/services/connection-service';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const connectionId = (await params).id;

    // Get the connection to verify it exists and user has access
    const connection = await ConnectionService.getById(connectionId);

    if (!connection) {
      return NextResponse.json(
        { success: false, error: 'Connection not found' },
        { status: 404 }
      );
    }

    // TODO: Verify user has access to this workspace
    // This would require checking if the user owns the workspace or is a member

    // Delete the connection
    await ConnectionService.delete(connectionId);

    return NextResponse.json({
      success: true,
      message: 'Connection disconnected successfully',
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to disconnect' },
      { status: 500 }
    );
  }
}
