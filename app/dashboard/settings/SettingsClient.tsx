'use client';

import { useState } from 'react';
import { SettingsTabs } from '@/components/settings/SettingsTabs';
import { ProfileTab } from '@/components/settings/ProfileTab';
import { PasswordTab } from '@/components/settings/PasswordTab';
import { TeamTab } from '@/components/settings/TeamTab';
import { BillingTab } from '@/components/settings/BillingTab';

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
      {activeTab === 'profile' && (
        <div className="max-w-3xl">
          <ProfileTab user={user} />
        </div>
      )}
      {activeTab === 'password' && (
        <div className="max-w-3xl">
          <PasswordTab user={user} />
        </div>
      )}
      {activeTab === 'team' && (
        <div className="max-w-3xl">
          <TeamTab user={user} />
        </div>
      )}
      {activeTab === 'billing' && <BillingTab user={user} />}
    </SettingsTabs>
  );
}
