import { db } from '@/lib/db';
import { teamMembers, workspaces } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export type UserRole = 'owner' | 'admin' | 'member' | 'viewer' | null;

/**
 * Get the user's highest role across all their workspaces
 * This checks both workspace ownership and team membership
 */
export async function getUserRole(userId: string): Promise<UserRole> {
  try {
    // Check if user owns any workspace
    const ownedWorkspaces = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.ownerId, userId))
      .limit(1);

    if (ownedWorkspaces.length > 0) {
      return 'owner';
    }

    // Check team membership roles
    const memberships = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.memberUserId, userId),
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
  } catch (error) {
    console.error('Error getting user role:', error);
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
    'workspace:create': 'owner',
    'workspace:delete': 'owner',
    'workspace:update': 'admin',
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
    // Check if user owns the workspace
    const workspace = await db
      .select()
      .from(workspaces)
      .where(
        and(eq(workspaces.id, workspaceId), eq(workspaces.ownerId, userId))
      )
      .limit(1);

    if (workspace.length > 0) {
      return 'owner';
    }

    // Check team membership for this specific workspace
    // Note: Current schema has team members at organization level, not workspace level
    // For now, we'll check if they're a team member of the workspace owner
    const workspaceData = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);

    if (workspaceData.length === 0) {
      return null;
    }

    const teamMembership = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.userId, workspaceData[0].ownerId),
          eq(teamMembers.memberUserId, userId),
          eq(teamMembers.status, 'active')
        )
      )
      .limit(1);

    if (teamMembership.length > 0) {
      return teamMembership[0].role as UserRole;
    }

    return null;
  } catch (error) {
    console.error('Error getting user workspace role:', error);
    return null;
  }
}

/**
 * Check if user is part of the organization (owner or team member)
 */
export async function isOrganizationMember(userId: string): Promise<boolean> {
  const role = await getUserRole(userId);
  return role !== null;
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
