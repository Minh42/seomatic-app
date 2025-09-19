import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { ConnectionService } from '@/lib/services/connection-service';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get workspace ID from query params
    const searchParams = request.nextUrl.searchParams;
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, error: 'Workspace ID is required' },
        { status: 400 }
      );
    }

    // Fetch connection for the workspace
    const connection = await ConnectionService.getByWorkspaceId(workspaceId);

    return NextResponse.json({
      success: true,
      connection: connection || null,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch connection' },
      { status: 500 }
    );
  }
}
