'use client';

import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { QueryProvider } from '@/lib/providers/query-provider';
import { WorkspaceProvider } from '@/lib/providers/workspace-provider';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <QueryProvider>
      <WorkspaceProvider>
        <div className="flex h-screen bg-gray-50">
          {/* Sidebar */}
          <Sidebar
            isCollapsed={isSidebarCollapsed}
            onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          />

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </WorkspaceProvider>
    </QueryProvider>
  );
}
