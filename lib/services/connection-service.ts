import { db } from '@/lib/db';
import { connections, connectionCms, workspaces } from '@/lib/db/schema';
import { eq, and, ne } from 'drizzle-orm';
import {
  encryptCredentials,
  decryptCredentials,
  type ConnectionCredentials,
} from '@/lib/utils/encryption';
import {
  ConnectionError,
  ConnectionErrorCode,
} from '@/lib/errors/connection-errors';
import type {
  ConnectionType,
  ConnectionStatus,
} from '@/lib/validations/connection';

export interface CreateConnectionParams {
  workspaceId: string;
  connectionUrl: string;
  connectionType: ConnectionType;
  credentials?: ConnectionCredentials;
  apiUsername?: string;
  cmsSiteId?: string;
}

export interface UpdateConnectionParams {
  connectionId: string;
  status?: ConnectionStatus;
  credentials?: ConnectionCredentials;
  lastSyncError?: string | null;
}

export class ConnectionService {
  /**
   * Create or replace a connection for a workspace
   */
  static async createOrReplace({
    workspaceId,
    connectionUrl,
    connectionType,
    credentials,
    apiUsername,
    cmsSiteId,
    status = 'pending',
  }: CreateConnectionParams & { status?: ConnectionStatus }) {
    try {
      // Check if workspace already has a connection
      const [existingWorkspaceConnection] = await db
        .select()
        .from(connections)
        .where(eq(connections.workspaceId, workspaceId))
        .limit(1);

      if (existingWorkspaceConnection) {
        // Delete existing connection (cascade will delete related records)
        await this.delete(existingWorkspaceConnection.id);
      }

      // Check if another workspace is using this URL
      const [existingUrlConnection] = await db
        .select()
        .from(connections)
        .where(eq(connections.connectionUrl, connectionUrl))
        .limit(1);

      if (existingUrlConnection) {
        // Delete the connection using this URL
        await this.delete(existingUrlConnection.id);
      }

      // Now create the new connection
      return await this.create({
        workspaceId,
        connectionUrl,
        connectionType,
        credentials,
        apiUsername,
        cmsSiteId,
        status,
      });
    } catch (error) {
      console.error('Error in createOrReplace:', error);
      throw error;
    }
  }

  /**
   * Create a new connection for a workspace
   */
  static async create({
    workspaceId,
    connectionUrl,
    connectionType,
    credentials,
    apiUsername,
    cmsSiteId,
    status = 'pending',
  }: CreateConnectionParams & { status?: ConnectionStatus }) {
    // Verify workspace exists and user has access
    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);

    if (!workspace) {
      throw new ConnectionError(
        ConnectionErrorCode.INSUFFICIENT_PERMISSIONS,
        'Workspace not found or access denied',
        { statusCode: 404 }
      );
    }

    // Check if workspace already has a connection
    const existingConnection = await db
      .select()
      .from(connections)
      .where(eq(connections.workspaceId, workspaceId))
      .limit(1);

    if (existingConnection.length > 0) {
      throw new ConnectionError(
        ConnectionErrorCode.UNKNOWN_ERROR,
        'This workspace already has a connection. Please remove the existing connection first.',
        { statusCode: 400 }
      );
    }

    // Start transaction
    return await db.transaction(async tx => {
      // Create main connection record
      const [connection] = await tx
        .insert(connections)
        .values({
          workspaceId,
          connectionUrl,
          connectionType,
          status,
        })
        .returning();

      // Create CMS-specific record if needed
      if (connectionType !== 'seomatic' && (credentials || apiUsername)) {
        const encryptedToken = credentials
          ? encryptCredentials(credentials)
          : null;

        await tx.insert(connectionCms).values({
          connectionId: connection.id,
          apiUsername,
          encryptedApiToken: encryptedToken,
          cmsSiteId,
        });
      }

      return connection;
    });
  }

  /**
   * Update connection status and credentials
   */
  static async update({
    connectionId,
    status,
    credentials,
    lastSyncError,
  }: UpdateConnectionParams) {
    const [connection] = await db
      .select()
      .from(connections)
      .where(eq(connections.id, connectionId))
      .limit(1);

    if (!connection) {
      throw new ConnectionError(
        ConnectionErrorCode.UNKNOWN_ERROR,
        'Connection not found',
        { statusCode: 404 }
      );
    }

    // Update main connection status if provided
    if (status) {
      await db
        .update(connections)
        .set({
          status,
          updatedAt: new Date(),
        })
        .where(eq(connections.id, connectionId));
    }

    // Update CMS-specific data if provided
    if (credentials || lastSyncError !== undefined) {
      const encryptedToken = credentials
        ? encryptCredentials(credentials)
        : undefined;

      await db
        .update(connectionCms)
        .set({
          ...(encryptedToken && { encryptedApiToken: encryptedToken }),
          ...(lastSyncError !== undefined && { lastSyncError }),
          updatedAt: new Date(),
        })
        .where(eq(connectionCms.connectionId, connectionId));
    }

    return connection;
  }

  /**
   * Get connection by workspace ID
   */
  static async getByWorkspaceId(workspaceId: string) {
    const result = await db
      .select({
        connection: connections,
        cms: connectionCms,
      })
      .from(connections)
      .leftJoin(connectionCms, eq(connections.id, connectionCms.connectionId))
      .where(eq(connections.workspaceId, workspaceId))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return {
      ...result[0].connection,
      cms: result[0].cms,
    };
  }

  /**
   * Get connection by ID
   */
  static async getById(connectionId: string) {
    const result = await db
      .select({
        connection: connections,
        cms: connectionCms,
      })
      .from(connections)
      .leftJoin(connectionCms, eq(connections.id, connectionCms.connectionId))
      .where(eq(connections.id, connectionId))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return {
      ...result[0].connection,
      cms: result[0].cms,
    };
  }

  /**
   * Delete a connection
   */
  static async delete(connectionId: string) {
    // Delete connection (cascade will handle related records)
    await db.delete(connections).where(eq(connections.id, connectionId));
  }

  /**
   * Get decrypted credentials for a connection
   */
  static async getCredentials(
    connectionId: string
  ): Promise<ConnectionCredentials | null> {
    const [cmsConnection] = await db
      .select()
      .from(connectionCms)
      .where(eq(connectionCms.connectionId, connectionId))
      .limit(1);

    if (!cmsConnection || !cmsConnection.encryptedApiToken) {
      return null;
    }

    try {
      return decryptCredentials(cmsConnection.encryptedApiToken);
    } catch (error) {
      throw new ConnectionError(
        ConnectionErrorCode.UNKNOWN_ERROR,
        'Failed to decrypt connection credentials',
        { cause: error as Error }
      );
    }
  }

  /**
   * Delete a connection
   */
  static async delete(connectionId: string) {
    // CMS records will be cascade deleted due to foreign key constraint
    await db.delete(connections).where(eq(connections.id, connectionId));
  }

  /**
   * Update last sync timestamp
   */
  static async updateLastSync(connectionId: string, error?: string) {
    await db
      .update(connectionCms)
      .set({
        lastSyncAt: new Date(),
        lastSyncError: error || null,
        updatedAt: new Date(),
      })
      .where(eq(connectionCms.connectionId, connectionId));
  }

  /**
   * Update connection status
   */
  static async updateStatus(connectionId: string, status: ConnectionStatus) {
    await db
      .update(connections)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(connections.id, connectionId));
  }

  /**
   * Check if a domain is already connected in any workspace
   */
  static async isDomainConnected(
    domain: string,
    excludeWorkspaceId?: string
  ): Promise<boolean> {
    const query = db
      .select()
      .from(connections)
      .where(eq(connections.connectionUrl, domain));

    // If excludeWorkspaceId is provided, exclude that workspace from the check
    if (excludeWorkspaceId) {
      const existing = await query
        .where(
          and(
            eq(connections.connectionUrl, domain),
            ne(connections.workspaceId, excludeWorkspaceId)
          )
        )
        .limit(1);
      return existing.length > 0;
    }

    const existing = await query.limit(1);
    return existing.length > 0;
  }

  /**
   * Verify user has access to manage connection
   */
  static async verifyAccess(
    connectionId: string,
    userId: string
  ): Promise<boolean> {
    const result = await db
      .select()
      .from(connections)
      .innerJoin(workspaces, eq(connections.workspaceId, workspaces.id))
      .where(
        and(eq(connections.id, connectionId), eq(workspaces.ownerId, userId))
      )
      .limit(1);

    return result.length > 0;
  }

  /**
   * Verify user owns the workspace
   */
  static async verifyWorkspaceOwnership(
    workspaceId: string,
    userId: string
  ): Promise<boolean> {
    const result = await db
      .select()
      .from(workspaces)
      .where(
        and(eq(workspaces.id, workspaceId), eq(workspaces.ownerId, userId))
      )
      .limit(1);

    return result.length > 0;
  }
}
