'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface Organization {
  id: string;
  name: string;
  createdAt: Date;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  memberCount: number;
}

interface OrganizationContextType {
  selectedOrganization: Organization | null;
  organizations: Organization[];
  setSelectedOrganization: (org: Organization) => void;
  isLoading: boolean;
  refreshOrganizations: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(
  undefined
);

const ORGANIZATION_STORAGE_KEY = 'selectedOrganizationId';

async function fetchOrganizations(): Promise<Organization[]> {
  const response = await fetch('/api/user/organizations');
  if (!response.ok) {
    throw new Error('Failed to fetch organizations');
  }
  const data = await response.json();
  return data.organizations || [];
}

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [selectedOrganization, setSelectedOrganizationState] =
    useState<Organization | null>(null);
  const queryClient = useQueryClient();

  const {
    data: organizations = [],
    isLoading: isInitialLoading,
    error,
  } = useQuery({
    queryKey: ['organizations'],
    queryFn: fetchOrganizations,
    // Data is considered fresh for 5 minutes
    staleTime: 5 * 60 * 1000,
    // Keep data in cache for 10 minutes
    gcTime: 10 * 60 * 1000,
  });

  // Only show loading state on initial load
  const isLoading = isInitialLoading && organizations.length === 0;

  // Handle organization selection from localStorage and set initial selection
  useEffect(() => {
    if (organizations.length === 0) {
      setSelectedOrganizationState(null);
      return;
    }

    // Only set selection if we don't already have one
    if (!selectedOrganization) {
      // Try to restore previously selected organization
      const storedOrgId = localStorage.getItem(ORGANIZATION_STORAGE_KEY);

      if (storedOrgId) {
        const storedOrg = organizations.find(o => o.id === storedOrgId);
        if (storedOrg) {
          setSelectedOrganizationState(storedOrg);
          return;
        }
      }

      // Default to first organization if no stored selection
      setSelectedOrganizationState(organizations[0]);
      localStorage.setItem(ORGANIZATION_STORAGE_KEY, organizations[0].id);
    } else {
      // Update the selected organization data if it exists in the new data
      const updatedOrg = organizations.find(
        o => o.id === selectedOrganization.id
      );
      if (updatedOrg) {
        setSelectedOrganizationState(updatedOrg);
      }
    }
  }, [organizations, selectedOrganization]);

  // Show error toast if fetching fails
  useEffect(() => {
    if (error) {
      toast.error('Failed to load organizations');
    }
  }, [error]);

  const setSelectedOrganization = (org: Organization) => {
    setSelectedOrganizationState(org);
    localStorage.setItem(ORGANIZATION_STORAGE_KEY, org.id);
  };

  const refreshOrganizations = async () => {
    await queryClient.invalidateQueries({ queryKey: ['organizations'] });
  };

  const value: OrganizationContextType = {
    selectedOrganization,
    organizations,
    setSelectedOrganization,
    isLoading,
    refreshOrganizations,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error(
      'useOrganization must be used within an OrganizationProvider'
    );
  }
  return context;
}
