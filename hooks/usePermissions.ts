'use client';

import { useState, useEffect } from 'react';
import { UserRole } from '@/types/permissions';

interface PermissionsState {
  role: UserRole;
  isLoading: boolean;
  error: Error | null;
  canPerform: (action: string) => boolean;
  hasRole: (requiredRole: UserRole) => boolean;
}

/**
 * Client-side hook for checking user permissions
 * Fetches the user's role and provides helper functions
 */
export function usePermissions(): PermissionsState {
  const [role, setRole] = useState<UserRole>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetchUserRole();
  }, []);

  const fetchUserRole = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/user/role');

      if (!response.ok) {
        throw new Error('Failed to fetch user role');
      }

      const data = await response.json();
      setRole(data.role);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setRole(null);
    } finally {
      setIsLoading(false);
    }
  };

  const hasRole = (requiredRole: UserRole): boolean => {
    if (!role || !requiredRole) return false;

    const roleHierarchy: Record<NonNullable<UserRole>, number> = {
      owner: 4,
      admin: 3,
      member: 2,
      viewer: 1,
    };

    return roleHierarchy[role] >= roleHierarchy[requiredRole];
  };

  const canPerform = (action: string): boolean => {
    const permissions: Record<string, UserRole> = {
      // Team management
      'team:invite': 'owner',
      'team:remove': 'owner',
      'team:update_role': 'owner',

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

    return hasRole(requiredRole);
  };

  return {
    role,
    isLoading,
    error,
    canPerform,
    hasRole,
  };
}
