'use client';

import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { WorkspaceErrorHandler } from '@/lib/errors/workspace-errors';
import Image from 'next/image';
import Link from 'next/link';
import { useWorkspace } from '@/hooks/useWorkspace';
import { Plus, MoreHorizontal, Globe } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CreateWorkspaceModal } from '@/components/modals/CreateWorkspaceModal';
import { EditWorkspaceModal } from '@/components/modals/EditWorkspaceModal';
import { DeleteWorkspaceModal } from '@/components/modals/DeleteWorkspaceModal';
import type { UserRole } from '@/lib/auth/permissions';

interface Workspace {
  id: string;
  name: string;
  connectionUrl: string | null;
  connectionType:
    | 'wordpress'
    | 'webflow'
    | 'shopify'
    | 'ghost'
    | 'hosted'
    | null;
  status: 'pending' | 'active' | 'error' | null;
}

interface WorkspacesTabProps {
  userRole: UserRole;
}

export function WorkspacesTab({ userRole }: WorkspacesTabProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { refreshWorkspaces } = useWorkspace();

  // Check if user can perform actions
  const canCreate = userRole && userRole !== 'viewer';
  const canEdit = userRole === 'owner' || userRole === 'admin';
  const canDelete = userRole === 'owner' || userRole === 'admin';

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const fetchWorkspaces = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/workspaces');
      if (!response.ok) {
        throw new Error('Failed to fetch workspaces');
      }
      const data = await response.json();
      setWorkspaces(data.workspaces || []);
    } catch (error) {
      const workspaceError = WorkspaceErrorHandler.handleWorkspaceError(
        error,
        'fetch'
      );
      WorkspaceErrorHandler.displayError(workspaceError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateWorkspace = async (name: string) => {
    setIsSubmitting(true);
    setCreateError(null);
    try {
      const response = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create workspace');
      }

      toast.success('Workspace created successfully');
      setShowCreateModal(false);
      setCreateError(null);
      await fetchWorkspaces();
      await refreshWorkspaces(); // Refresh workspace selector in sidebar
    } catch (error) {
      const workspaceError = WorkspaceErrorHandler.handleWorkspaceError(
        error,
        'create'
      );
      setCreateError(workspaceError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditWorkspace = async (name: string) => {
    if (!selectedWorkspace) return;

    setIsSubmitting(true);
    setEditError(null);
    try {
      const response = await fetch(`/api/workspaces/${selectedWorkspace.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update workspace');
      }

      toast.success('Workspace updated successfully');
      setShowEditModal(false);
      setSelectedWorkspace(null);
      setEditError(null);
      await fetchWorkspaces();
      await refreshWorkspaces(); // Refresh workspace selector in sidebar
    } catch (error) {
      const workspaceError = WorkspaceErrorHandler.handleWorkspaceError(
        error,
        'update'
      );
      setEditError(workspaceError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!selectedWorkspace) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/workspaces/${selectedWorkspace.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete workspace');
      }

      toast.success('Workspace deleted successfully');
      setShowDeleteModal(false);
      setSelectedWorkspace(null);
      await fetchWorkspaces();
      await refreshWorkspaces(); // Refresh workspace selector in sidebar
    } catch (error) {
      const workspaceError = WorkspaceErrorHandler.handleWorkspaceError(
        error,
        'delete'
      );
      WorkspaceErrorHandler.displayError(workspaceError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getConnectionIcon = (type: Workspace['connectionType']) => {
    switch (type) {
      case 'wordpress':
        return (
          <Image
            src="/logos/cms/wordpress.svg"
            alt="WordPress"
            width={20}
            height={20}
            className="w-5 h-5"
          />
        );
      case 'shopify':
        return (
          <Image
            src="/logos/cms/shopify.svg"
            alt="Shopify"
            width={20}
            height={20}
            className="w-5 h-5"
          />
        );
      case 'ghost':
        return (
          <Image
            src="/logos/cms/ghost.svg"
            alt="Ghost"
            width={20}
            height={20}
            className="w-5 h-5"
          />
        );
      case 'webflow':
        return (
          <Image
            src="/logos/cms/webflow.svg"
            alt="Webflow"
            width={20}
            height={20}
            className="w-5 h-5"
          />
        );
      case 'hosted':
        return (
          <Image
            src="/logos/cms/seomatic.svg"
            alt="Hosted"
            width={20}
            height={20}
            className="w-5 h-5"
          />
        );
      default:
        return <Globe className="h-5 w-5 text-gray-400" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading workspaces...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="flex-1">
          <h2 className="text-lg font-bold text-zinc-900">Workspaces</h2>
          <p className="text-sm text-zinc-500 mt-1">
            Manage your organization&apos;s workspaces and connections
          </p>
        </div>

        {/* Search Bar */}
        {workspaces.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search workspaces"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="h-10 pl-10 pr-4 border border-gray-300 rounded-lg text-sm font-medium placeholder:text-zinc-400 placeholder:font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-64"
            />
          </div>
        )}

        {canCreate && (
          <Button
            onClick={() => setShowCreateModal(true)}
            className="!h-10 px-4 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer flex items-center gap-2 whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            Create Workspace
          </Button>
        )}
      </div>

      {/* Workspaces List */}
      {workspaces.length === 0 ? (
        <div className="bg-gradient-to-b from-gray-50 to-white border border-gray-200 rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Globe className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No workspaces yet
          </h3>
          <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
            Create your first workspace to start managing your SEO content
            across different platforms.
          </p>
          {canCreate && (
            <Button
              onClick={() => setShowCreateModal(true)}
              className="!h-10 px-5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
            >
              Create First Workspace
            </Button>
          )}
        </div>
      ) : (
        <>
          {(() => {
            const filteredWorkspaces = workspaces.filter(workspace => {
              const query = searchQuery.toLowerCase();
              return (
                workspace.name.toLowerCase().includes(query) ||
                (workspace.connectionUrl &&
                  workspace.connectionUrl.toLowerCase().includes(query))
              );
            });

            if (filteredWorkspaces.length === 0 && searchQuery) {
              return (
                <div className="text-center py-12">
                  <p className="text-gray-500">
                    No workspaces found matching &quot;{searchQuery}&quot;
                  </p>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="mt-3 text-sm text-indigo-600 hover:text-indigo-700 cursor-pointer"
                  >
                    Clear search
                  </button>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {filteredWorkspaces.map(workspace => (
                  <div
                    key={workspace.id}
                    className="bg-white border border-zinc-200 rounded-lg hover:border-zinc-300 transition-colors"
                  >
                    <div className="p-6">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          {workspace.connectionType ? (
                            <div className="w-10 h-10 bg-zinc-50 rounded-lg flex items-center justify-center">
                              {getConnectionIcon(workspace.connectionType)}
                            </div>
                          ) : (
                            <div className="w-10 h-10 bg-zinc-100 rounded-lg flex items-center justify-center">
                              <Globe className="h-5 w-5 text-zinc-400" />
                            </div>
                          )}
                          <div>
                            <h3 className="text-sm font-bold text-zinc-900 truncate">
                              {workspace.name}
                            </h3>
                            {workspace.connectionType && (
                              <p className="text-xs text-zinc-500 capitalize mt-1">
                                {workspace.connectionType}
                              </p>
                            )}
                          </div>
                        </div>
                        {(canEdit || canDelete) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 hover:bg-zinc-100 cursor-pointer"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {canEdit && (
                                <DropdownMenuItem
                                  className="cursor-pointer"
                                  onClick={() => {
                                    setSelectedWorkspace(workspace);
                                    setShowEditModal(true);
                                  }}
                                >
                                  Edit Workspace
                                </DropdownMenuItem>
                              )}
                              {canDelete && (
                                <DropdownMenuItem
                                  className="cursor-pointer text-red-600"
                                  onClick={() => {
                                    setSelectedWorkspace(workspace);
                                    setShowDeleteModal(true);
                                  }}
                                >
                                  Delete Workspace
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>

                      {/* Connection Info */}
                      {workspace.connectionUrl ? (
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs text-zinc-500 mb-1">Domain</p>
                            <Link
                              href="/dashboard/connections"
                              className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                            >
                              {workspace.connectionUrl}
                            </Link>
                          </div>

                          <div>
                            <p className="text-xs text-zinc-500 mb-1">Status</p>
                            <div className="flex items-center justify-between">
                              {workspace.status === 'active' ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-md bg-green-50 text-xs font-medium text-green-700">
                                  Active
                                </span>
                              ) : workspace.status === 'pending' ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-md bg-yellow-50 text-xs font-medium text-yellow-700">
                                  Pending
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 rounded-md bg-red-50 text-xs font-medium text-red-700">
                                  Error
                                </span>
                              )}
                              {workspace.status !== 'active' && (
                                <Link
                                  href="/dashboard/connections"
                                  className="!h-7 px-3 text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 cursor-pointer inline-flex items-center rounded-md"
                                >
                                  Configure
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2">
                          <Link
                            href="/dashboard/connections"
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <Plus className="h-4 w-4" />
                            Add Connection
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </>
      )}

      {/* Modals */}
      <CreateWorkspaceModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setCreateError(null);
        }}
        onConfirm={handleCreateWorkspace}
        isLoading={isSubmitting}
        serverError={createError}
      />

      <EditWorkspaceModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedWorkspace(null);
          setEditError(null);
        }}
        onConfirm={handleEditWorkspace}
        isLoading={isSubmitting}
        currentName={selectedWorkspace?.name || ''}
        workspaceId={selectedWorkspace?.id || ''}
        serverError={editError}
      />

      <DeleteWorkspaceModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedWorkspace(null);
        }}
        onConfirm={handleDeleteWorkspace}
        isLoading={isSubmitting}
        workspaceName={selectedWorkspace?.name || ''}
      />
    </div>
  );
}
