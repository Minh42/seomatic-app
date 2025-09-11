'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import {
  getUserWorkspaces,
  type WorkspaceWithConnection,
} from '@/app/dashboard/actions';
import { toast } from 'sonner';

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
  const [selectedWorkspace, setSelectedWorkspaceState] =
    useState<WorkspaceWithConnection | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceWithConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch workspaces and restore selection
  const fetchWorkspaces = async () => {
    try {
      const allWorkspaces = await getUserWorkspaces();
      setWorkspaces(allWorkspaces);

      if (allWorkspaces.length === 0) {
        setSelectedWorkspaceState(null);
        return;
      }

      // Try to restore previously selected workspace
      const storedWorkspaceId = localStorage.getItem(WORKSPACE_STORAGE_KEY);

      if (storedWorkspaceId) {
        const storedWorkspace = allWorkspaces.find(
          w => w.id === storedWorkspaceId
        );
        if (storedWorkspace) {
          setSelectedWorkspaceState(storedWorkspace);
          return;
        }
      }

      // Default to first workspace if no stored selection or stored workspace not found
      setSelectedWorkspaceState(allWorkspaces[0]);
      localStorage.setItem(WORKSPACE_STORAGE_KEY, allWorkspaces[0].id);
    } catch (error) {
      console.error('Error fetching workspaces:', error);
      toast.error('Failed to load workspaces');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const setSelectedWorkspace = (workspace: WorkspaceWithConnection) => {
    setSelectedWorkspaceState(workspace);
    localStorage.setItem(WORKSPACE_STORAGE_KEY, workspace.id);
  };

  const refreshWorkspaces = async () => {
    setIsLoading(true);
    await fetchWorkspaces();
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
