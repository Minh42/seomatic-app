'use client';

import { cn } from '@/lib/utils';
import { useMemo } from 'react';
import type { UserRole } from '@/lib/auth/permissions';

const allTabs = [
  { id: 'profile', label: 'Profile' },
  { id: 'password', label: 'Password' },
  { id: 'team', label: 'Team' },
  { id: 'workspaces', label: 'Workspaces' },
  {
    id: 'plans',
    label: 'Plans',
    requiresRole: 'owner' as UserRole,
  },
  {
    id: 'billing',
    label: 'Billing Details',
    requiresRole: 'owner' as UserRole,
  },
];

interface SettingsTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  children: React.ReactNode;
  userRole: UserRole;
}

export function SettingsTabs({
  activeTab,
  onTabChange,
  children,
  userRole,
}: SettingsTabsProps) {
  // Filter tabs based on user role
  const tabs = useMemo(() => {
    return allTabs.filter(tab => {
      // If tab requires a specific role, check if user has it
      if (tab.requiresRole) {
        return userRole === tab.requiresRole;
      }
      // Otherwise, show the tab to everyone
      return true;
    });
  }, [userRole]);

  return (
    <>
      <div className="border-b border-gray-300 mb-8">
        <nav className="flex" aria-label="Tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'whitespace-nowrap py-3 px-6 text-sm font-medium transition-all cursor-pointer',
                activeTab === tab.id
                  ? 'text-indigo-500 border-b-2 border-indigo-500'
                  : 'text-gray-600 hover:text-gray-900'
              )}
              style={{
                borderBottomWidth: activeTab === tab.id ? '2px' : '0px',
                marginBottom: activeTab === tab.id ? '-1px' : '0px',
              }}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div>{children}</div>
    </>
  );
}
