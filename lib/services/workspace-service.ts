import { db } from '@/lib/db';
import { workspaces } from '@/lib/db/schema';
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
      throw new Error('A workspace with this name already exists');
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
}
