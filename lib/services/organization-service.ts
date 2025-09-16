import { db } from '@/lib/db';
import { organizations, users, workspaces, teamMembers } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export interface CreateOrganizationParams {
  name: string;
  ownerId: string;
}

export interface OrganizationWithMembers {
  id: string;
  name: string;
  ownerId: string;
  createdAt: Date;
  members?: Array<{
    id: string;
    email: string;
    name: string | null;
    role: string;
  }>;
}

export class OrganizationService {
  /**
   * Create a new organization
   */
  static async create({ name, ownerId }: CreateOrganizationParams) {
    const [organization] = await db
      .insert(organizations)
      .values({
        name,
        ownerId,
      })
      .returning();

    return organization;
  }

  /**
   * Get organization by ID
   */
  static async getById(id: string) {
    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, id))
      .limit(1);

    return organization || null;
  }

  /**
   * Get user's organization
   * User can be either the owner or a team member
   */
  static async getUserOrganization(userId: string) {
    // First check if user owns an organization
    const [ownedOrg] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.ownerId, userId))
      .limit(1);

    if (ownedOrg) {
      return ownedOrg;
    }

    // Check if user is a team member
    const [membership] = await db
      .select({
        organizationId: teamMembers.organizationId,
      })
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.memberUserId, userId),
          eq(teamMembers.status, 'active')
        )
      )
      .limit(1);

    if (membership?.organizationId) {
      return this.getById(membership.organizationId);
    }

    return null;
  }

  /**
   * Get all workspaces for an organization
   */
  static async getOrganizationWorkspaces(organizationId: string) {
    return db
      .select()
      .from(workspaces)
      .where(eq(workspaces.organizationId, organizationId))
      .orderBy(workspaces.createdAt);
  }

  /**
   * Get all members of an organization
   */
  static async getOrganizationMembers(organizationId: string) {
    // Get the owner
    const [org] = await db
      .select({
        ownerId: organizations.ownerId,
      })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    if (!org) {
      return [];
    }

    // Get owner details
    const [owner] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
      })
      .from(users)
      .where(eq(users.id, org.ownerId))
      .limit(1);

    // Get team members
    const members = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: teamMembers.role,
      })
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.memberUserId, users.id))
      .where(
        and(
          eq(teamMembers.organizationId, organizationId),
          eq(teamMembers.status, 'active')
        )
      );

    // Combine owner and members
    const allMembers = [];

    if (owner) {
      allMembers.push({
        ...owner,
        role: 'owner' as const,
      });
    }

    allMembers.push(...members);

    return allMembers;
  }

  /**
   * Update organization
   */
  static async update(id: string, data: Partial<{ name: string }>) {
    const [updated] = await db
      .update(organizations)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, id))
      .returning();

    return updated;
  }

  /**
   * Check if user belongs to an organization
   */
  static async userBelongsToOrganization(
    userId: string,
    organizationId: string
  ): Promise<boolean> {
    // Check if user is the owner
    const [org] = await db
      .select()
      .from(organizations)
      .where(
        and(
          eq(organizations.id, organizationId),
          eq(organizations.ownerId, userId)
        )
      )
      .limit(1);

    if (org) {
      return true;
    }

    // Check if user is a team member
    const [membership] = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.organizationId, organizationId),
          eq(teamMembers.memberUserId, userId),
          eq(teamMembers.status, 'active')
        )
      )
      .limit(1);

    return !!membership;
  }

  /**
   * Get organization by workspace ID
   */
  static async getByWorkspaceId(workspaceId: string) {
    const [workspace] = await db
      .select({
        organizationId: workspaces.organizationId,
      })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);

    if (!workspace?.organizationId) {
      return null;
    }

    return this.getById(workspace.organizationId);
  }
}
