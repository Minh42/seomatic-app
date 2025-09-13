'use client';

import { useState } from 'react';
import { SettingsTabs } from '@/components/settings/SettingsTabs';
import { ProfileTab } from '@/components/settings/ProfileTab';
import { PasswordTab } from '@/components/settings/PasswordTab';

interface SettingsClientProps {
  user: {
    id?: string;
    email?: string | null;
    name?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    image?: string | null;
    passwordHash?: string | null;
  };
}

export function SettingsClient({ user }: SettingsClientProps) {
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <SettingsTabs activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'profile' && <ProfileTab user={user} />}
      {activeTab === 'password' && <PasswordTab user={user} />}
      {activeTab === 'team' && (
        <div className="text-gray-500">Team settings coming soon...</div>
      )}
      {activeTab === 'notification' && (
        <div className="text-gray-500">
          Notification settings coming soon...
        </div>
      )}
      {activeTab === 'billing' && (
        <div className="text-gray-500">Billing details coming soon...</div>
      )}
    </SettingsTabs>
  );
}
