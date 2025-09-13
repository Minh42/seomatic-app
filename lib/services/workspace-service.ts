import { db } from '@/lib/db';
import { workspaces, connections } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export interface CreateWorkspaceParams {
  name: string;
  ownerId: string;
}

export interface UpdateWorkspaceParams {
  id: string;
  name?: string;
  whiteLabelEnabled?: boolean;
}

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

export class WorkspaceService {
  /**
   * Create a new workspace for a user
   */
  static async create({ name, ownerId }: CreateWorkspaceParams) {
    // Check if workspace name already exists for this user
    const existing = await db
      .select()
      .from(workspaces)
      .where(and(eq(workspaces.name, name), eq(workspaces.ownerId, ownerId)))
      .limit(1);

    if (existing.length > 0) {
      throw new Error(
        `You already have a workspace named "${name}". Please choose a different name to avoid confusion.`
      );
    }

    const [workspace] = await db
      .insert(workspaces)
      .values({
        name,
        ownerId,
        whiteLabelEnabled: false,
      })
      .returning();

    return workspace;
  }

  /**
   * Get a workspace by ID
   */
  static async getById(id: string) {
    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, id))
      .limit(1);

    return workspace || null;
  }

  /**
   * Get all workspaces for a user
   */
  static async getByOwnerId(ownerId: string) {
    return db.select().from(workspaces).where(eq(workspaces.ownerId, ownerId));
  }

  /**
   * Get the first workspace for a user (primary workspace)
   */
  static async getPrimaryWorkspace(ownerId: string) {
    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.ownerId, ownerId))
      .limit(1);

    return workspace || null;
  }

  /**
   * Update a workspace
   */
  static async update({ id, ...data }: UpdateWorkspaceParams) {
    const [updated] = await db
      .update(workspaces)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(workspaces.id, id))
      .returning();

    return updated;
  }

  /**
   * Delete a workspace
   */
  static async delete(id: string) {
    const [deleted] = await db
      .delete(workspaces)
      .where(eq(workspaces.id, id))
      .returning();

    return deleted;
  }

  /**
   * Verify workspace ownership
   */
  static async verifyOwnership(workspaceId: string, userId: string) {
    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(
        and(eq(workspaces.id, workspaceId), eq(workspaces.ownerId, userId))
      )
      .limit(1);

    return !!workspace;
  }

  /**
   * Get all workspaces with their connections for a user
   */
  static async getWorkspacesWithConnections(
    userId: string
  ): Promise<WorkspaceWithConnection[]> {
    const result = await db
      .select({
        workspaceId: workspaces.id,
        workspaceName: workspaces.name,
        connectionUrl: connections.connectionUrl,
        connectionType: connections.connectionType,
        status: connections.status,
      })
      .from(workspaces)
      .leftJoin(connections, eq(workspaces.id, connections.workspaceId))
      .where(eq(workspaces.ownerId, userId));

    // Map to the expected format
    return result.map(row => ({
      id: row.workspaceId,
      name: row.workspaceName,
      connectionUrl: row.connectionUrl || null,
      connectionType: row.connectionType as ConnectionType | null,
      status: row.status as ConnectionStatus | null,
    }));
  }

  /**
   * Get current workspace with connection for a user
   */
  static async getCurrentWorkspaceWithConnection(
    userId: string
  ): Promise<WorkspaceWithConnection | null> {
    // Get the primary (first) workspace
    const workspace = await this.getPrimaryWorkspace(userId);

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
  }
}
