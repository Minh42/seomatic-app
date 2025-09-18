'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SettingsTabs } from '@/components/settings/SettingsTabs';
import { ProfileTab } from '@/components/settings/ProfileTab';
import { PasswordTab } from '@/components/settings/PasswordTab';
import { TeamTab } from '@/components/settings/TeamTab';
import { WorkspacesTab } from '@/components/settings/WorkspacesTab';
import { PlansTab } from '@/components/settings/PlansTab';
import { BillingTab } from '@/components/settings/BillingTab';
import type { UserRole } from '@/lib/auth/permissions';

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
  userRole: UserRole;
}

export function SettingsClient({ user, userRole }: SettingsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Valid tab values based on user role
  const validTabs = ['profile', 'password', 'team', 'workspaces'];

  // Add billing tabs only for owners
  if (userRole === 'owner') {
    validTabs.push('plans', 'billing');
  }

  // Get tab from URL, validate it, default to 'profile'
  const tabParam = searchParams.get('tab');
  const initialTab = validTabs.includes(tabParam || '') ? tabParam : 'profile';

  const [activeTab, setActiveTab] = useState(initialTab);

  // Update activeTab when URL changes
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && validTabs.includes(tab)) {
      setActiveTab(tab);
    } else if (tab && !validTabs.includes(tab)) {
      // If trying to access unauthorized tab, redirect to profile
      setActiveTab('profile');
      router.push('/dashboard/settings?tab=profile', { scroll: false });
    }
  }, [searchParams, validTabs, router]);

  // Handle tab change - update URL
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    router.push(`/dashboard/settings?tab=${newTab}`, { scroll: false });
  };

  return (
    <SettingsTabs
      activeTab={activeTab}
      onTabChange={handleTabChange}
      userRole={userRole}
    >
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
      {activeTab === 'workspaces' && <WorkspacesTab userRole={userRole} />}
      {activeTab === 'plans' && userRole === 'owner' && <PlansTab />}
      {activeTab === 'billing' && userRole === 'owner' && (
        <BillingTab user={user} />
      )}
    </SettingsTabs>
  );
}
