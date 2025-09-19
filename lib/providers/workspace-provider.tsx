'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { WorkspaceWithConnection } from '@/lib/services/workspace-service';
import { useOrganization } from './organization-provider';
import { useWorkspacesQuery } from '@/hooks/useWorkspaces';

interface WorkspaceContextType {
  selectedWorkspace: WorkspaceWithConnection | null;
  workspaces: WorkspaceWithConnection[];
  setSelectedWorkspace: (workspace: WorkspaceWithConnection) => void;
  isLoading: boolean;
  refreshWorkspaces: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(
  undefined
);

const WORKSPACE_STORAGE_KEY = 'seomatic_selected_workspace';

interface WorkspaceProviderProps {
  children: ReactNode;
}

export function WorkspaceProvider({ children }: WorkspaceProviderProps) {
  const queryClient = useQueryClient();
  const { selectedOrganization } = useOrganization();
  const [selectedWorkspace, setSelectedWorkspaceState] =
    useState<WorkspaceWithConnection | null>(null);

  // Use the shared query hook for fetching workspaces
  const {
    data: workspaces = [],
    isLoading: isInitialLoading,
    error,
  } = useWorkspacesQuery(selectedOrganization?.id);

  // Only show loading state on initial load, not on background refetches
  const isLoading = isInitialLoading && workspaces.length === 0;

  // Clear workspace selection when organization changes
  useEffect(() => {
    setSelectedWorkspaceState(null);
    localStorage.removeItem(WORKSPACE_STORAGE_KEY);
  }, [selectedOrganization?.id]);

  // Handle workspace selection from localStorage and set initial selection
  useEffect(() => {
    if (workspaces.length === 0) {
      setSelectedWorkspaceState(null);
      return;
    }

    // Only set selection if we don't already have one
    if (!selectedWorkspace) {
      // Try to restore previously selected workspace
      const storedWorkspaceId = localStorage.getItem(WORKSPACE_STORAGE_KEY);

      if (storedWorkspaceId) {
        const storedWorkspace = workspaces.find(
          w => w.id === storedWorkspaceId
        );
        if (storedWorkspace) {
          setSelectedWorkspaceState(storedWorkspace);
          return;
        }
      }

      // Default to first workspace if no stored selection or stored workspace not found
      setSelectedWorkspaceState(workspaces[0]);
      localStorage.setItem(WORKSPACE_STORAGE_KEY, workspaces[0].id);
    } else {
      // Update the selected workspace data if it exists in the new data
      const updatedWorkspace = workspaces.find(
        w => w.id === selectedWorkspace.id
      );
      if (updatedWorkspace) {
        setSelectedWorkspaceState(updatedWorkspace);
      }
    }
  }, [workspaces, selectedWorkspace]);

  // Show error toast if fetching fails
  useEffect(() => {
    if (error) {
      toast.error('Failed to load workspaces');
    }
  }, [error]);

  const setSelectedWorkspace = (workspace: WorkspaceWithConnection) => {
    setSelectedWorkspaceState(workspace);
    localStorage.setItem(WORKSPACE_STORAGE_KEY, workspace.id);
  };

  const refreshWorkspaces = async () => {
    // Invalidate and refetch workspaces query
    await queryClient.invalidateQueries({ queryKey: ['workspaces'] });
  };

  const value: WorkspaceContextType = {
    selectedWorkspace,
    workspaces,
    setSelectedWorkspace,
    isLoading,
    refreshWorkspaces,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
