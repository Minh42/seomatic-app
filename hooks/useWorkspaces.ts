import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { WorkspaceErrorHandler } from '@/lib/errors/workspace-errors';

interface Workspace {
  id: string;
  name: string;
  connectionUrl: string | null;
  connectionType:
    | 'wordpress'
    | 'webflow'
    | 'shopify'
    | 'ghost'
    | 'hosted'
    | null;
  status: 'pending' | 'active' | 'error' | null;
}

interface WorkspacesResponse {
  workspaces: Workspace[];
}

interface CreateWorkspaceParams {
  name: string;
  organizationId?: string;
}

interface UpdateWorkspaceParams {
  id: string;
  name: string;
}

// Fetch workspaces for an organization
async function fetchWorkspaces(organizationId?: string): Promise<Workspace[]> {
  if (!organizationId) return [];

  const response = await fetch(
    `/api/workspaces?organizationId=${organizationId}`
  );
  if (!response.ok) {
    throw new Error('Failed to fetch workspaces');
  }

  const data: WorkspacesResponse = await response.json();
  return data.workspaces || [];
}

// Create a new workspace
async function createWorkspace(
  params: CreateWorkspaceParams
): Promise<Workspace> {
  const response = await fetch('/api/workspaces', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: params.name,
      organizationId: params.organizationId,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create workspace');
  }

  return response.json();
}

// Update workspace
async function updateWorkspace(
  params: UpdateWorkspaceParams
): Promise<Workspace> {
  const response = await fetch(`/api/workspaces/${params.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: params.name }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update workspace');
  }

  return response.json();
}

// Delete workspace
async function deleteWorkspace(workspaceId: string): Promise<void> {
  const response = await fetch(`/api/workspaces/${workspaceId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete workspace');
  }
}

export function useWorkspaces(organizationId?: string) {
  const queryClient = useQueryClient();
  const queryKey = ['workspaces', organizationId];

  // Fetch workspaces query
  const query = useQuery<Workspace[]>({
    queryKey,
    queryFn: () => fetchWorkspaces(organizationId),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false,
  });

  // Create workspace mutation
  const createMutation = useMutation({
    mutationFn: (name: string) => createWorkspace({ name, organizationId }),
    onMutate: async name => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previousWorkspaces =
        queryClient.getQueryData<Workspace[]>(queryKey);

      // Optimistically add the new workspace
      if (previousWorkspaces) {
        const optimisticWorkspace: Workspace = {
          id: `temp-${Date.now()}`,
          name,
          connectionUrl: null,
          connectionType: null,
          status: null,
        };

        queryClient.setQueryData<Workspace[]>(queryKey, [
          ...previousWorkspaces,
          optimisticWorkspace,
        ]);
      }

      return { previousWorkspaces };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousWorkspaces) {
        queryClient.setQueryData(queryKey, context.previousWorkspaces);
      }

      const workspaceError = WorkspaceErrorHandler.handleWorkspaceError(
        err,
        'create'
      );
      WorkspaceErrorHandler.displayError(workspaceError);
    },
    onSuccess: () => {
      toast.success('Workspace created successfully');
      // Invalidate both workspace queries
      queryClient.invalidateQueries({ queryKey });
      // Also invalidate the workspace provider's query
      queryClient.invalidateQueries({
        queryKey: ['workspaces', organizationId],
      });
    },
  });

  // Update workspace mutation
  const updateMutation = useMutation({
    mutationFn: updateWorkspace,
    onMutate: async params => {
      await queryClient.cancelQueries({ queryKey });
      const previousWorkspaces =
        queryClient.getQueryData<Workspace[]>(queryKey);

      // Optimistically update the workspace
      if (previousWorkspaces) {
        const updatedWorkspaces = previousWorkspaces.map(workspace =>
          workspace.id === params.id
            ? { ...workspace, name: params.name }
            : workspace
        );

        queryClient.setQueryData<Workspace[]>(queryKey, updatedWorkspaces);
      }

      return { previousWorkspaces };
    },
    onError: (err, variables, context) => {
      if (context?.previousWorkspaces) {
        queryClient.setQueryData(queryKey, context.previousWorkspaces);
      }

      const workspaceError = WorkspaceErrorHandler.handleWorkspaceError(
        err,
        'update'
      );
      WorkspaceErrorHandler.displayError(workspaceError);
    },
    onSuccess: () => {
      toast.success('Workspace updated successfully');
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({
        queryKey: ['workspaces', organizationId],
      });
    },
  });

  // Delete workspace mutation
  const deleteMutation = useMutation({
    mutationFn: deleteWorkspace,
    onMutate: async workspaceId => {
      await queryClient.cancelQueries({ queryKey });
      const previousWorkspaces =
        queryClient.getQueryData<Workspace[]>(queryKey);

      // Optimistically remove the workspace
      if (previousWorkspaces) {
        const filteredWorkspaces = previousWorkspaces.filter(
          workspace => workspace.id !== workspaceId
        );

        queryClient.setQueryData<Workspace[]>(queryKey, filteredWorkspaces);
      }

      return { previousWorkspaces };
    },
    onError: (err, variables, context) => {
      if (context?.previousWorkspaces) {
        queryClient.setQueryData(queryKey, context.previousWorkspaces);
      }

      const workspaceError = WorkspaceErrorHandler.handleWorkspaceError(
        err,
        'delete'
      );
      WorkspaceErrorHandler.displayError(workspaceError);
    },
    onSuccess: () => {
      toast.success('Workspace deleted successfully');
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({
        queryKey: ['workspaces', organizationId],
      });
    },
  });

  return {
    // Query state
    workspaces: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,

    // Mutations
    createWorkspace: createMutation.mutate,
    updateWorkspace: updateMutation.mutate,
    deleteWorkspace: deleteMutation.mutate,

    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,

    // Errors from mutations
    createError: createMutation.error?.message || null,
    updateError: updateMutation.error?.message || null,

    // Utility
    refetch: query.refetch,
  };
}

// Type export for workspace with connection info
export type WorkspaceWithConnection = Workspace;

// Shared hook that can be used by both WorkspaceProvider and WorkspacesTab
export function useWorkspacesQuery(organizationId?: string) {
  return useQuery<Workspace[]>({
    queryKey: ['workspaces', organizationId],
    queryFn: () => fetchWorkspaces(organizationId),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
