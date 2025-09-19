import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { queryKeys } from '@/lib/utils/query-keys';

/**
 * Hook for prefetching data on hover or focus
 * Improves perceived performance by loading data before it's needed
 */
export function usePrefetch() {
  const queryClient = useQueryClient();

  // Prefetch organization data
  const prefetchOrganization = useCallback(
    async (organizationId: string) => {
      // Prefetch team members
      await queryClient.prefetchQuery({
        queryKey: queryKeys.teamMembers.list(organizationId),
        queryFn: async () => {
          const response = await fetch(
            `/api/team/members?organizationId=${organizationId}`
          );
          if (!response.ok) throw new Error('Failed to fetch team members');
          return response.json();
        },
        staleTime: 5 * 60 * 1000,
      });

      // Prefetch workspaces
      await queryClient.prefetchQuery({
        queryKey: queryKeys.workspaces.list(organizationId),
        queryFn: async () => {
          const response = await fetch(
            `/api/workspaces?organizationId=${organizationId}`
          );
          if (!response.ok) throw new Error('Failed to fetch workspaces');
          const data = await response.json();
          return data.workspaces || [];
        },
        staleTime: 5 * 60 * 1000,
      });

      // Prefetch subscription usage
      await queryClient.prefetchQuery({
        queryKey: queryKeys.subscription.usage(organizationId),
        queryFn: async () => {
          const response = await fetch(
            `/api/subscription/usage?organizationId=${organizationId}`
          );
          if (!response.ok) throw new Error('Failed to fetch usage');
          return response.json();
        },
        staleTime: 5 * 60 * 1000,
      });
    },
    [queryClient]
  );

  // Prefetch workspace data
  const prefetchWorkspace = useCallback(
    async (workspaceId: string) => {
      await queryClient.prefetchQuery({
        queryKey: queryKeys.connections.list(workspaceId),
        queryFn: async () => {
          const response = await fetch(
            `/api/connections?workspaceId=${workspaceId}`
          );
          if (!response.ok) throw new Error('Failed to fetch connections');
          return response.json();
        },
        staleTime: 5 * 60 * 1000,
      });
    },
    [queryClient]
  );

  // Prefetch team data for settings
  const prefetchTeamData = useCallback(
    async (organizationId?: string) => {
      if (!organizationId) return;

      await Promise.all([
        queryClient.prefetchQuery({
          queryKey: queryKeys.teamMembers.list(organizationId),
          queryFn: async () => {
            const response = await fetch(
              `/api/team/members?organizationId=${organizationId}`
            );
            if (!response.ok) throw new Error('Failed to fetch team members');
            return response.json();
          },
          staleTime: 5 * 60 * 1000,
        }),
        queryClient.prefetchQuery({
          queryKey: ['user-organizations'],
          queryFn: async () => {
            const response = await fetch('/api/user/organizations');
            if (!response.ok) throw new Error('Failed to fetch organizations');
            return response.json();
          },
          staleTime: 5 * 60 * 1000,
        }),
      ]);
    },
    [queryClient]
  );

  // Prefetch workspace settings data
  const prefetchWorkspaceSettings = useCallback(
    async (organizationId?: string) => {
      if (!organizationId) return;

      await queryClient.prefetchQuery({
        queryKey: queryKeys.workspaces.list(organizationId),
        queryFn: async () => {
          const response = await fetch(
            `/api/workspaces?organizationId=${organizationId}`
          );
          if (!response.ok) throw new Error('Failed to fetch workspaces');
          const data = await response.json();
          return data.workspaces || [];
        },
        staleTime: 5 * 60 * 1000,
      });
    },
    [queryClient]
  );

  return {
    prefetchOrganization,
    prefetchWorkspace,
    prefetchTeamData,
    prefetchWorkspaceSettings,
  };
}
