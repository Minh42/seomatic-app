'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { WorkspaceService } from '@/lib/services/workspace-service';
import { db } from '@/lib/db';
import { connections } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export type ConnectionType =
  | 'wordpress'
  | 'webflow'
  | 'shopify'
  | 'ghost'
  | 'hosted';
export type ConnectionStatus =
  | 'pending'
  | 'connected'
  | 'failed'
  | 'disconnected';

export interface WorkspaceWithConnection {
  id: string;
  name: string;
  connectionUrl: string | null;
  connectionType: ConnectionType | null;
  status: ConnectionStatus | null;
}

export async function getUserWorkspaces(): Promise<WorkspaceWithConnection[]> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return [];
  }

  try {
    // Get all workspaces for the user
    const workspaces = await WorkspaceService.getByOwnerId(session.user.id);

    // Get connections for each workspace
    const workspacesWithConnections = await Promise.all(
      workspaces.map(async workspace => {
        const [connection] = await db
          .select()
          .from(connections)
          .where(eq(connections.workspaceId, workspace.id))
          .limit(1);

        return {
          id: workspace.id,
          name: workspace.name,
          connectionUrl: connection?.connectionUrl || null,
          connectionType: connection?.connectionType as ConnectionType | null,
          status: connection?.status as ConnectionStatus | null,
        };
      })
    );

    return workspacesWithConnections;
  } catch (error) {
    console.error('Error fetching workspaces:', error);
    return [];
  }
}

export async function getCurrentWorkspace(): Promise<WorkspaceWithConnection | null> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  try {
    // Get the primary (first) workspace
    const workspace = await WorkspaceService.getPrimaryWorkspace(
      session.user.id
    );

    if (!workspace) {
      return null;
    }

    // Get the connection for this workspace
    const [connection] = await db
      .select()
      .from(connections)
      .where(eq(connections.workspaceId, workspace.id))
      .limit(1);

    return {
      id: workspace.id,
      name: workspace.name,
      connectionUrl: connection?.domain || null, // Still using 'domain' field for now
      connectionType: connection?.connectionType as ConnectionType | null,
      status: connection?.status as ConnectionStatus | null,
    };
  } catch (error) {
    console.error('Error fetching current workspace:', error);
    return null;
  }
}
