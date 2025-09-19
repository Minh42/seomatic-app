'use client';

import { useEffect, useState, lazy, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SettingsTabs } from '@/components/settings/SettingsTabs';
import { ProfileTab } from '@/components/settings/ProfileTab';
import { PasswordTab } from '@/components/settings/PasswordTab';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import type { UserRole } from '@/lib/auth/permissions';

// Lazy load heavy tabs for better initial performance
const TeamTab = lazy(() =>
  import('@/components/settings/TeamTab').then(m => ({ default: m.TeamTab }))
);
const WorkspacesTab = lazy(() =>
  import('@/components/settings/WorkspacesTab').then(m => ({
    default: m.WorkspacesTab,
  }))
);
const PlansTab = lazy(() =>
  import('@/components/settings/PlansTab').then(m => ({ default: m.PlansTab }))
);
const BillingTab = lazy(() =>
  import('@/components/settings/BillingTab').then(m => ({
    default: m.BillingTab,
  }))
);

// Loading component for lazy loaded tabs
function TabLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>
  );
}

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
          <ErrorBoundary>
            <ProfileTab user={user} />
          </ErrorBoundary>
        </div>
      )}
      {activeTab === 'password' && (
        <div className="max-w-3xl">
          <ErrorBoundary>
            <PasswordTab user={user} />
          </ErrorBoundary>
        </div>
      )}
      {activeTab === 'team' && (
        <div className="max-w-3xl">
          <ErrorBoundary>
            <Suspense fallback={<TabLoader />}>
              <TeamTab user={user} />
            </Suspense>
          </ErrorBoundary>
        </div>
      )}
      {activeTab === 'workspaces' && (
        <ErrorBoundary>
          <Suspense fallback={<TabLoader />}>
            <WorkspacesTab userRole={userRole} />
          </Suspense>
        </ErrorBoundary>
      )}
      {activeTab === 'plans' && userRole === 'owner' && (
        <ErrorBoundary>
          <Suspense fallback={<TabLoader />}>
            <PlansTab />
          </Suspense>
        </ErrorBoundary>
      )}
      {activeTab === 'billing' && userRole === 'owner' && (
        <ErrorBoundary>
          <Suspense fallback={<TabLoader />}>
            <BillingTab user={user} />
          </Suspense>
        </ErrorBoundary>
      )}
    </SettingsTabs>
  );
}
