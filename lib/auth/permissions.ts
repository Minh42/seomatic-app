import { db } from '@/lib/db';
import { teamMembers, workspaces, organizations } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { OrganizationService } from '@/lib/services/organization-service';

export type UserRole = 'owner' | 'admin' | 'member' | 'viewer' | null;

/**
 * Get the user's highest role in their organization
 * This checks both organization ownership and team membership
 */
export async function getUserRole(userId: string): Promise<UserRole> {
  try {
    // Get user's organization
    const organization = await OrganizationService.getUserOrganization(userId);

    if (!organization) {
      return null;
    }

    // Check if user owns the organization
    if (organization.ownerId === userId) {
      return 'owner';
    }

    // Check team membership roles in the organization
    const memberships = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.memberUserId, userId),
          eq(teamMembers.organizationId, organization.id),
          eq(teamMembers.status, 'active')
        )
      );

    if (memberships.length === 0) {
      return null;
    }

    // Return the highest role (admin > member > viewer)
    const hasAdmin = memberships.some(m => m.role === 'admin');
    const hasMember = memberships.some(m => m.role === 'member');

    if (hasAdmin) return 'admin';
    if (hasMember) return 'member';
    return 'viewer';
  } catch {
    return null;
  }
}

/**
 * Check if user has a specific role or higher
 * Hierarchy: owner > admin > member > viewer
 */
export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  if (!userRole || !requiredRole) return false;

  const roleHierarchy: Record<NonNullable<UserRole>, number> = {
    owner: 4,
    admin: 3,
    member: 2,
    viewer: 1,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

/**
 * Check if user can perform a specific action
 * This can be extended with more granular permissions later
 */
export function canPerformAction(userRole: UserRole, action: string): boolean {
  const permissions: Record<string, UserRole> = {
    // Team management
    'team:invite': 'admin', // Admins and owners can invite
    'team:remove': 'owner', // Only owners can remove
    'team:update_role': 'admin', // Admins and owners can update roles

    // Workspace management
    'workspace:create': 'member', // Members and above can create
    'workspace:delete': 'admin', // Admins and owners can delete
    'workspace:update': 'admin', // Admins and owners can update
    'workspace:view': 'viewer',

    // Content management
    'content:create': 'member',
    'content:update': 'member',
    'content:delete': 'admin',
    'content:view': 'viewer',

    // Settings
    'settings:billing': 'owner',
    'settings:team': 'owner',
    'settings:workspace': 'admin',
    'settings:profile': 'viewer',
  };

  const requiredRole = permissions[action];
  if (!requiredRole) return false;

  return hasRole(userRole, requiredRole);
}

/**
 * Get user's role for a specific workspace
 */
export async function getUserWorkspaceRole(
  userId: string,
  workspaceId: string
): Promise<UserRole> {
  try {
    // Get the workspace with its organization
    const workspace = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);

    if (workspace.length === 0) {
      return null;
    }

    const ws = workspace[0];

    // Check if user is the creator/owner of the workspace
    if (ws.ownerId === userId) {
      return 'owner';
    }

    // If workspace has no organization, user has no access
    if (!ws.organizationId) {
      return null;
    }

    // Get the organization to check ownership
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, ws.organizationId))
      .limit(1);

    if (!org) {
      return null;
    }

    // Check if user owns the organization
    if (org.ownerId === userId) {
      return 'owner';
    }

    // Check team membership in the organization
    const teamMembership = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.memberUserId, userId),
          eq(teamMembers.organizationId, ws.organizationId),
          eq(teamMembers.status, 'active')
        )
      )
      .limit(1);

    if (teamMembership.length > 0) {
      return teamMembership[0].role as UserRole;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Check if user is part of any organization (owner or team member)
 */
export async function isOrganizationMember(userId: string): Promise<boolean> {
  const organization = await OrganizationService.getUserOrganization(userId);
  return organization !== null;
}

/**
 * Check if user can access a specific workspace
 */
export async function canAccessWorkspace(
  userId: string,
  workspaceId: string
): Promise<boolean> {
  const role = await getUserWorkspaceRole(userId, workspaceId);
  return role !== null;
}
