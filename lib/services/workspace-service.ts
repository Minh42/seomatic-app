import { db } from '@/lib/db';
import { workspaces, connections, organizations } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

export interface CreateWorkspaceParams {
  name: string;
  ownerId: string;
  organizationId: string;
  createdById: string;
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
  organizationId?: string;
  organizationName?: string;
}

export class WorkspaceService {
  /**
   * Create a new workspace for a user
   */
  static async create({
    name,
    ownerId,
    organizationId,
    createdById,
  }: CreateWorkspaceParams) {
    // Check if workspace name already exists in this organization
    const existing = await db
      .select()
      .from(workspaces)
      .where(
        and(
          eq(workspaces.name, name),
          eq(workspaces.organizationId, organizationId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      throw new Error(
        `A workspace named "${name}" already exists in your organization. Please choose a different name.`
      );
    }

    const [workspace] = await db
      .insert(workspaces)
      .values({
        name,
        ownerId,
        organizationId,
        createdById,
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
   * Get all workspaces for a user (as owner or team member)
   */
  static async getWorkspacesForUser(userId: string) {
    // Get workspaces where user is the owner
    const ownedWorkspaces = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.ownerId, userId));

    // TODO: In the future, also get workspaces where user is a team member
    // For now, just return owned workspaces
    return ownedWorkspaces;
  }

  /**
   * Get all workspaces with their connections for a user
   * This includes workspaces from all organizations the user belongs to
   */
  static async getWorkspacesWithConnections(
    userId: string
  ): Promise<WorkspaceWithConnection[]> {
    // Get all organizations the user belongs to
    const { OrganizationService } = await import('./organization-service');
    const userOrganizations =
      await OrganizationService.getAllUserOrganizations(userId);

    if (userOrganizations.length === 0) {
      return [];
    }

    // Get all organization IDs
    const organizationIds = userOrganizations.map(org => org.id);

    // Fetch workspaces from all organizations with organization names
    const result = await db
      .select({
        workspaceId: workspaces.id,
        workspaceName: workspaces.name,
        connectionUrl: connections.connectionUrl,
        connectionType: connections.connectionType,
        status: connections.status,
        createdAt: workspaces.createdAt,
        organizationId: workspaces.organizationId,
        organizationName: organizations.name,
      })
      .from(workspaces)
      .leftJoin(connections, eq(workspaces.id, connections.workspaceId))
      .innerJoin(organizations, eq(workspaces.organizationId, organizations.id))
      .where(inArray(workspaces.organizationId, organizationIds))
      .orderBy(organizations.name, workspaces.name);

    // Map to the expected format with organization info
    return result.map(row => ({
      id: row.workspaceId,
      name: row.workspaceName,
      connectionUrl: row.connectionUrl || null,
      connectionType: row.connectionType as ConnectionType | null,
      status: row.status as ConnectionStatus | null,
      organizationId: row.organizationId || undefined,
      organizationName: row.organizationName || undefined,
    }));
  }

  /**
   * Get all workspaces with their connections for an organization
   */
  static async getWorkspacesWithConnectionsByOrganization(
    organizationId: string
  ): Promise<WorkspaceWithConnection[]> {
    const result = await db
      .select({
        workspaceId: workspaces.id,
        workspaceName: workspaces.name,
        connectionUrl: connections.connectionUrl,
        connectionType: connections.connectionType,
        status: connections.status,
        createdAt: workspaces.createdAt,
      })
      .from(workspaces)
      .leftJoin(connections, eq(workspaces.id, connections.workspaceId))
      .where(eq(workspaces.organizationId, organizationId))
      .orderBy(workspaces.createdAt);

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
