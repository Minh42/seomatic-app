'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Home,
  FileText,
  BookOpen,
  BarChart3,
  Layout,
  Database,
  Settings,
  ChevronDown,
  ChevronsLeft,
  Plus,
} from 'lucide-react';
import { useWorkspace } from '@/hooks/useWorkspace';
import { StatusIndicator } from './StatusIndicator';
import { useRouter } from 'next/navigation';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const { selectedWorkspace, workspaces, setSelectedWorkspace, isLoading } =
    useWorkspace();

  const navigationItems = [
    {
      section: 'workspace',
      items: [
        { name: 'Dashboard', href: '/dashboard', icon: Home },
        {
          name: 'Landing Pages',
          href: '/dashboard/landing-pages',
          icon: FileText,
        },
        { name: 'Blog Posts', href: '/dashboard/blog-posts', icon: BookOpen },
        { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
      ],
    },
    {
      section: 'shared',
      items: [
        { name: 'Templates', href: '/dashboard/templates', icon: Layout },
        { name: 'Datasets', href: '/dashboard/datasets', icon: Database },
      ],
    },
    {
      section: 'settings',
      items: [
        { name: 'Settings', href: '/dashboard/settings', icon: Settings },
      ],
    },
  ];

  return (
    <div
      className={`group flex h-full flex-col bg-slate-900 text-white transition-all duration-300 relative ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className="p-4 border-b border-gray-200/10">
        <div className="flex items-center justify-between">
          {isCollapsed ? (
            <button
              onClick={onToggle}
              className="flex items-center justify-center flex-1 hover:opacity-80 transition-opacity cursor-pointer"
            >
              <Image
                src="/logos/seomatic.svg"
                alt="SEOmatic"
                width={32}
                height={32}
              />
            </button>
          ) : (
            <>
              <Link href="/dashboard" className="flex items-center space-x-2">
                <Image
                  src="/logos/seomatic.svg"
                  alt="SEOmatic"
                  width={32}
                  height={32}
                />
                <div className="text-xl font-semibold">SEOmatic</div>
              </Link>
              <button
                onClick={onToggle}
                className="p-1 rounded-lg hover:bg-gray-800/30 transition-all opacity-0 group-hover:opacity-100"
              >
                <ChevronsLeft className="h-5 w-5 text-gray-500" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Workspace Switcher */}
      {!isCollapsed && (
        <div className="px-3 py-2">
          {selectedWorkspace ? (
            <button
              onClick={() => setIsWorkspaceOpen(!isWorkspaceOpen)}
              className="w-full text-left group"
              disabled={isLoading}
            >
              <div className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-800/30 transition-all">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 bg-gray-800/50 rounded-lg flex items-center justify-center text-gray-400 font-medium text-sm border border-gray-700/50 p-1.5">
                    {selectedWorkspace.connectionType ? (
                      <Image
                        src={`/logos/cms/${selectedWorkspace.connectionType === 'hosted' ? 'seomatic' : selectedWorkspace.connectionType}.svg`}
                        alt={selectedWorkspace.connectionType}
                        width={20}
                        height={20}
                        className="object-contain"
                      />
                    ) : (
                      selectedWorkspace.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white">
                      {selectedWorkspace.name}
                    </div>
                    {selectedWorkspace.connectionType ? (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          router.push('/dashboard/connections');
                        }}
                        className="flex items-center gap-1.5 mt-0.5 text-left"
                        title="Manage connection"
                      >
                        <span className="text-xs text-gray-500 hover:text-gray-400 transition-colors truncate cursor-pointer">
                          {selectedWorkspace.connectionUrl}
                        </span>
                      </button>
                    ) : (
                      <div
                        onClick={e => {
                          e.stopPropagation();
                          router.push('/dashboard/connections');
                        }}
                        className="flex items-center gap-1 mt-0.5 text-xs text-orange-500 hover:text-orange-600 transition-colors cursor-pointer"
                      >
                        <span className="text-sm leading-none">+</span>
                        <span>Add connection</span>
                      </div>
                    )}
                  </div>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-gray-500 transition-transform flex-shrink-0 cursor-pointer ${
                    isWorkspaceOpen ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </button>
          ) : (
            // Show skeleton while loading
            <div className="p-2.5 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-800/50 rounded-lg animate-pulse"></div>
                <div className="flex-1">
                  <div className="h-4 w-24 bg-gray-800/50 rounded animate-pulse"></div>
                  <div className="h-3 w-16 bg-gray-800/50 rounded animate-pulse mt-1"></div>
                </div>
              </div>
            </div>
          )}

          {/* Workspace Dropdown */}
          {isWorkspaceOpen && (
            <div className="absolute left-3 right-3 mt-1 bg-slate-800 border border-gray-700/30 rounded-xl shadow-xl z-10 overflow-hidden">
              {/* Workspace list */}
              {workspaces.length > 1 && (
                <div className="p-1">
                  {workspaces.map(workspace => {
                    const isActive = workspace.id === selectedWorkspace.id;

                    return (
                      <button
                        key={workspace.id}
                        onClick={() => {
                          if (!isActive) {
                            setSelectedWorkspace(workspace);
                            setIsWorkspaceOpen(false);
                          }
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-lg transition-colors flex items-center gap-2.5 ${
                          isActive
                            ? 'bg-gray-800/40 cursor-default'
                            : 'hover:bg-gray-800/30'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded flex items-center justify-center font-medium text-xs p-1 ${
                            isActive
                              ? 'bg-gray-700 text-white border border-gray-600'
                              : 'bg-gray-800 text-gray-400 border border-gray-700'
                          }`}
                        >
                          {workspace.connectionType ? (
                            <Image
                              src={`/logos/cms/${workspace.connectionType === 'hosted' ? 'seomatic' : workspace.connectionType}.svg`}
                              alt={workspace.connectionType}
                              width={16}
                              height={16}
                              className="object-contain"
                            />
                          ) : (
                            workspace.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-white flex items-center gap-1.5">
                            {workspace.name}
                            {isActive && (
                              <span className="text-[10px] text-gray-500">
                                Current
                              </span>
                            )}
                          </div>
                          {workspace.connectionType ? (
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-[10px] text-gray-500 truncate">
                                {workspace.connectionUrl}
                              </span>
                            </div>
                          ) : (
                            <div className="text-[10px] text-amber-500 mt-0.5">
                              No connection configured
                            </div>
                          )}
                        </div>
                        {workspace.connectionType && (
                          <StatusIndicator
                            status={workspace.status}
                            className="h-2 w-2"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* New workspace */}
              <div
                className={`p-1 ${workspaces.length > 1 ? 'border-t border-gray-700/50' : ''}`}
              >
                <Link
                  href="/dashboard/workspaces/new"
                  onClick={() => setIsWorkspaceOpen(false)}
                  className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-gray-800/30 transition-colors flex items-center gap-2.5 group/create"
                >
                  <div className="w-7 h-7 border border-dashed border-gray-600 rounded flex items-center justify-center group-hover/create:border-gray-500 transition-colors">
                    <Plus className="h-3.5 w-3.5 text-gray-500 group-hover/create:text-gray-400" />
                  </div>
                  <span className="text-xs text-gray-400 group-hover/create:text-gray-300">
                    Create workspace
                  </span>
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {/* Workspace-specific items */}
        {navigationItems[0].items.map(item => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.name}
              href={item.href}
              title={item.name}
              className={`group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800/40 hover:text-white'
              } ${isCollapsed ? 'justify-center px-2' : ''}`}
            >
              <Icon
                className={`h-5 w-5 flex-shrink-0 ${!isCollapsed && 'mr-3'}`}
              />
              {!isCollapsed && item.name}
            </Link>
          );
        })}

        {/* Divider */}
        <div className="my-4 border-t border-gray-200/10" />

        {/* Shared resources */}
        {navigationItems[1].items.map(item => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.name}
              href={item.href}
              title={item.name}
              className={`group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800/40 hover:text-white'
              } ${isCollapsed ? 'justify-center px-2' : ''}`}
            >
              <Icon
                className={`h-5 w-5 flex-shrink-0 ${!isCollapsed && 'mr-3'}`}
              />
              {!isCollapsed && item.name}
            </Link>
          );
        })}

        {/* Divider */}
        <div className="my-4 border-t border-gray-200/10" />

        {/* Settings */}
        {navigationItems[2].items.map(item => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.name}
              href={item.href}
              title={item.name}
              className={`group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800/40 hover:text-white'
              } ${isCollapsed ? 'justify-center px-2' : ''}`}
            >
              <Icon
                className={`h-5 w-5 flex-shrink-0 ${!isCollapsed && 'mr-3'}`}
              />
              {!isCollapsed && item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
