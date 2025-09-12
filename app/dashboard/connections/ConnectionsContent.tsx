'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Search, Loader2 } from 'lucide-react';
import { ConnectionRow } from './ConnectionRow';
import { DisconnectConfirmModal } from '@/components/modals/DisconnectConfirmModal';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';

type ConnectionStatus = 'not_connected' | 'connected' | 'error';

// Fetch function for connection data
async function fetchConnectionData(workspaceId: string | undefined) {
  if (!workspaceId) return null;

  const response = await fetch(`/api/connections?workspaceId=${workspaceId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch connection');
  }
  const data = await response.json();
  return data.connection;
}

export function ConnectionsContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const { selectedWorkspace, isLoading: isLoadingWorkspace } = useWorkspace();
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isDisconnectModalOpen, setIsDisconnectModalOpen] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isProcessingCallback, setIsProcessingCallback] = useState(false);
  const [callbackStatus, setCallbackStatus] = useState<string>('');

  // Check if we have callback params
  const hasCallbackParams = !!(
    searchParams.get('domain_name') && searchParams.get('user_login')
  );

  // Use TanStack Query for connection data
  const { data: workspaceConnection, isLoading: isLoadingConnection } =
    useQuery({
      queryKey: ['connection', selectedWorkspace?.id],
      queryFn: () => fetchConnectionData(selectedWorkspace?.id),
      enabled: !!selectedWorkspace?.id && !hasCallbackParams, // Don't fetch during callback processing
      staleTime: 30 * 1000, // Consider data fresh for 30 seconds
      gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    });

  // Handle WordPress callback when redirected back from WordPress
  useEffect(() => {
    const handleWordPressCallback = async () => {
      const domainName = searchParams.get('domain_name');
      const siteUrl = searchParams.get('site_url');
      const userLogin = searchParams.get('user_login');
      const password = searchParams.get('password');

      if (!domainName || !userLogin || !password) return;

      // Start processing immediately, don't wait for workspace
      setIsProcessingCallback(true);
      setCallbackStatus('Validating credentials...');

      // Wait for workspace if needed, but show progress
      if (!selectedWorkspace) {
        setCallbackStatus('Loading workspace...');
        // Wait a bit for workspace to load
        await new Promise(resolve => setTimeout(resolve, 100));
        if (!selectedWorkspace) {
          // If still no workspace after wait, we'll retry on next effect run
          return;
        }
      }

      try {
        setCallbackStatus('Saving connection...');

        // Call the callback API to store the connection
        const response = await fetch('/api/connections/wordpress/callback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            workspaceId: selectedWorkspace.id,
            domain: domainName,
            siteUrl: siteUrl || `https://${domainName}`,
            username: userLogin,
            password: decodeURIComponent(password),
            success: true,
          }),
        });

        const data = await response.json();

        if (data.success) {
          setCallbackStatus('Connection established!');

          // Optimistically update the cache with the new connection
          queryClient.setQueryData(
            ['connection', selectedWorkspace.id],
            data.connection
          );

          // Clear URL params and show success
          router.replace('/dashboard/connections');
          toast.success('WordPress connection established successfully!');

          // Invalidate both queries to update UI everywhere (including sidebar)
          await queryClient.invalidateQueries({ queryKey: ['workspaces'] });
          await queryClient.invalidateQueries({
            queryKey: ['connection', selectedWorkspace.id],
          });
        } else {
          toast.error(data.error || 'Failed to save connection');
          router.replace('/dashboard/connections');
        }
      } catch (error) {
        console.error('Callback error:', error);
        toast.error('Failed to complete WordPress connection');
        router.replace('/dashboard/connections');
      } finally {
        setIsProcessingCallback(false);
        setCallbackStatus('');
      }
    };

    if (hasCallbackParams) {
      handleWordPressCallback();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, selectedWorkspace, hasCallbackParams]);

  // Available platforms data
  const platforms = [
    {
      id: 'wordpress',
      name: 'WordPress',
      description: 'Connect your WordPress site',
      icon: '/logos/cms/wordpress.svg',
      status: 'not_connected' as ConnectionStatus,
      isConfigured: false,
    },
    {
      id: 'webflow',
      name: 'Webflow',
      description: 'Sync with Webflow CMS',
      icon: '/logos/cms/webflow.svg',
      status: 'not_connected' as ConnectionStatus,
      isConfigured: false,
    },
    {
      id: 'shopify',
      name: 'Shopify',
      description: 'Integrate your Shopify store',
      icon: '/logos/cms/shopify.svg',
      status: 'not_connected' as ConnectionStatus,
      isConfigured: false,
    },
    {
      id: 'ghost',
      name: 'Ghost',
      description: 'Connect Ghost CMS',
      icon: '/logos/cms/ghost.svg',
      status: 'not_connected' as ConnectionStatus,
      isConfigured: false,
    },
    {
      id: 'seomatic',
      name: 'SEOmatic',
      description: 'Host directly on SEOmatic',
      icon: '/logos/cms/seomatic.svg',
      status: 'not_connected' as ConnectionStatus,
      isConfigured: false,
    },
  ];

  const filteredPlatforms = platforms.filter(
    platform =>
      platform.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      platform.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle disconnect
  const handleDisconnect = async () => {
    if (!workspaceConnection) return;

    setIsDisconnecting(true);
    try {
      const response = await fetch(
        `/api/connections/${workspaceConnection.id}`,
        {
          method: 'DELETE',
        }
      );

      if (response.ok) {
        toast.success('Connection disconnected successfully');
        setIsDisconnectModalOpen(false);
        // Optimistically remove from cache
        queryClient.setQueryData(['connection', selectedWorkspace?.id], null);
        // Invalidate both queries to update UI everywhere (including sidebar)
        await queryClient.invalidateQueries({ queryKey: ['workspaces'] });
        await queryClient.invalidateQueries({
          queryKey: ['connection', selectedWorkspace?.id],
        });
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to disconnect');
      }
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast.error('Failed to disconnect connection');
    } finally {
      setIsDisconnecting(false);
    }
  };

  // Show processing state if we're handling a callback
  if (isProcessingCallback) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-8 py-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 leading-normal">
              Setting Up Connection
            </h1>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              <p className="text-gray-600 font-medium">{callbackStatus}</p>
              <p className="text-sm text-gray-500">
                Please wait while we configure your WordPress connection...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state while workspace is loading
  if (isLoadingWorkspace) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-8 py-8">
          <div className="mb-8">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6 animate-pulse">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                <div>
                  <div className="h-6 w-32 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 w-48 bg-gray-200 rounded"></div>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="h-10 w-20 bg-gray-200 rounded-lg"></div>
                <div className="h-10 w-24 bg-gray-200 rounded-lg"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Only show "No workspace selected" after loading is complete
  if (!selectedWorkspace) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">No workspace selected</p>
          <p className="text-sm text-gray-400">
            Please select or create a workspace to manage connections.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 leading-normal">
            {workspaceConnection ? 'Current Connection' : 'Connections'}
          </h1>
        </div>

        {/* Show loading skeleton while fetching */}
        {isLoadingConnection ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6 animate-pulse">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                <div>
                  <div className="h-6 w-32 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 w-48 bg-gray-200 rounded"></div>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="h-10 w-20 bg-gray-200 rounded-lg"></div>
                <div className="h-10 w-24 bg-gray-200 rounded-lg"></div>
              </div>
            </div>
          </div>
        ) : workspaceConnection ? (
          // Show connection details when connected
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Image
                    src={`/logos/cms/${workspaceConnection.connectionType}.svg`}
                    alt={workspaceConnection.connectionType}
                    width={32}
                    height={32}
                    className="object-contain"
                  />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 capitalize">
                    {workspaceConnection.connectionType}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {workspaceConnection.connectionUrl}
                  </p>
                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex items-center gap-1.5">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          workspaceConnection.status === 'active'
                            ? 'bg-green-500'
                            : workspaceConnection.status === 'error'
                              ? 'bg-red-500'
                              : 'bg-yellow-500'
                        }`}
                      />
                      <span className="text-xs text-gray-600 capitalize">
                        {workspaceConnection.status}
                      </span>
                    </div>
                    {workspaceConnection.cms?.lastSyncAt && (
                      <span className="text-xs text-gray-500">
                        Last sync:{' '}
                        {new Date(
                          workspaceConnection.cms.lastSyncAt
                        ).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="px-4 py-2 text-zinc-600 text-sm font-bold leading-relaxed bg-white border border-zinc-300 rounded-lg hover:bg-gray-50 transition-colors">
                  Settings
                </button>
                <button
                  onClick={() => setIsDisconnectModalOpen(true)}
                  className="px-4 py-2 text-red-500 text-sm font-bold leading-relaxed bg-white border border-red-500 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Disconnect
                </button>
              </div>
            </div>
          </div>
        ) : (
          // Show platform grid when not connected
          <>
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-gray-900 leading-normal">
                    Connect Your Platform
                  </h2>
                  <p className="text-sm font-normal text-zinc-500 leading-relaxed">
                    Connect your CMS or host directly to start publishing pages.
                  </p>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search Platform"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="h-10 pl-10 pr-4 border border-gray-300 rounded-lg text-xs font-medium leading-tight placeholder:text-zinc-400 placeholder:font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-64"
                  />
                </div>
              </div>
            </div>

            {/* Platforms List */}
            {filteredPlatforms.length > 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {filteredPlatforms.map((platform, index) => (
                  <ConnectionRow
                    key={platform.id}
                    connection={platform}
                    workspaceId={selectedWorkspace.id}
                    isLast={index === filteredPlatforms.length - 1}
                    onStatusChange={(id, newStatus) => {
                      // Handle status change if needed
                      console.log('Status change:', id, newStatus);
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">No platforms found.</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Disconnect Confirmation Modal */}
      <DisconnectConfirmModal
        isOpen={isDisconnectModalOpen}
        onClose={() => setIsDisconnectModalOpen(false)}
        onConfirm={handleDisconnect}
        connectionType={workspaceConnection?.connectionType}
        connectionUrl={workspaceConnection?.connectionUrl}
        isLoading={isDisconnecting}
      />
    </div>
  );
}
