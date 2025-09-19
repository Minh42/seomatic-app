/**
 * Centralized query keys factory for React Query
 * Ensures consistent key structure and prevents duplication
 */

export const queryKeys = {
  // Organization queries
  organizations: {
    all: ['organizations'] as const,
    lists: () => [...queryKeys.organizations.all, 'list'] as const,
    list: (filters?: any) =>
      [...queryKeys.organizations.lists(), filters] as const,
    details: () => [...queryKeys.organizations.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.organizations.details(), id] as const,
    userOrganizations: (userId?: string) =>
      ['user-organizations', userId] as const,
  },

  // Workspace queries
  workspaces: {
    all: ['workspaces'] as const,
    lists: () => [...queryKeys.workspaces.all, 'list'] as const,
    list: (organizationId?: string) => ['workspaces', organizationId] as const,
    details: () => [...queryKeys.workspaces.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.workspaces.details(), id] as const,
  },

  // Team member queries
  teamMembers: {
    all: ['team-members'] as const,
    lists: () => [...queryKeys.teamMembers.all, 'list'] as const,
    list: (organizationId?: string) =>
      ['team-members', organizationId] as const,
    invitations: (organizationId?: string) =>
      ['team-invitations', organizationId] as const,
  },

  // Subscription queries
  subscription: {
    all: ['subscription'] as const,
    usage: (organizationId?: string) => ['plan-usage', organizationId] as const,
    plans: () => ['plans'] as const,
    limits: (userId: string) => ['subscription-limits', userId] as const,
  },

  // User queries
  users: {
    all: ['users'] as const,
    profile: (userId: string) => ['user-profile', userId] as const,
    onboarding: (userId: string) => ['user-onboarding', userId] as const,
  },

  // Connection queries
  connections: {
    all: ['connections'] as const,
    list: (workspaceId?: string) => ['connections', workspaceId] as const,
    detail: (id: string) => ['connection', id] as const,
  },
} as const;

/**
 * Helper to invalidate all queries under a specific namespace
 * Usage: invalidateQueries({ queryKey: queryKeys.workspaces.all })
 */
export function getInvalidateKeys(namespace: keyof typeof queryKeys) {
  return queryKeys[namespace].all;
}
