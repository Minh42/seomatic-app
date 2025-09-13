'use client';

import { cn } from '@/lib/utils';

const tabs = [
  { id: 'profile', label: 'Profile' },
  { id: 'password', label: 'Password' },
  { id: 'team', label: 'Team' },
  { id: 'notification', label: 'Notification' },
  { id: 'billing', label: 'Billing Details' },
];

interface SettingsTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  children: React.ReactNode;
}

export function SettingsTabs({
  activeTab,
  onTabChange,
  children,
}: SettingsTabsProps) {
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

      <div className="max-w-3xl">{children}</div>
    </>
  );
}
