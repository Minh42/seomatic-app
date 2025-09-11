'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Search } from 'lucide-react';
import { ConnectionRow } from './ConnectionRow';
import { DisconnectConfirmModal } from '@/components/modals/DisconnectConfirmModal';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';

type ConnectionStatus = 'not_connected' | 'connected' | 'error';

export function ConnectionsContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const { selectedWorkspace, isLoading } = useWorkspace();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [workspaceConnection, setWorkspaceConnection] = useState<{
    id: string;
    connectionType: string;
    connectionUrl: string;
    status: string;
    cms?: {
      lastSyncAt?: string | null;
    };
  } | null>(null);
  const [isLoadingConnection, setIsLoadingConnection] = useState(true);
  const [isDisconnectModalOpen, setIsDisconnectModalOpen] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Handle WordPress callback when redirected back from WordPress
  useEffect(() => {
    const handleWordPressCallback = async () => {
      // WordPress sends back these parameters:
      // domain_name, site_url, user_login, password
      const domainName = searchParams.get('domain_name');
      const siteUrl = searchParams.get('site_url');
      const userLogin = searchParams.get('user_login');
      const password = searchParams.get('password');

      if (domainName && userLogin && password && selectedWorkspace) {
        // WordPress has redirected back with credentials
        try {
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
              password: decodeURIComponent(password), // WordPress URL encodes the password
              success: true,
            }),
          });

          const data = await response.json();

          if (data.success) {
            toast.success('WordPress connection established successfully!');
            // Clear the URL parameters
            router.replace('/dashboard/connections');
            // Refresh the connection data
            await fetchConnection();
          } else {
            toast.error(data.error || 'Failed to save connection');
            router.replace('/dashboard/connections');
          }
        } catch {
          toast.error('Failed to complete WordPress connection');
          router.replace('/dashboard/connections');
        }
      }
    };

    // Check if we have WordPress callback parameters
    if (searchParams.get('domain_name') && searchParams.get('user_login')) {
      handleWordPressCallback();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, selectedWorkspace, router]);

  // Function to fetch workspace connection
  const fetchConnection = async () => {
    if (!selectedWorkspace) return;

    setIsLoadingConnection(true);
    try {
      const response = await fetch(
        `/api/connections?workspaceId=${selectedWorkspace.id}`
      );
      if (response.ok) {
        const data = await response.json();
        setWorkspaceConnection(data.connection);
      }
    } catch (error) {
      console.error('Failed to fetch connection:', error);
    } finally {
      setIsLoadingConnection(false);
    }
  };

  // Fetch workspace connection on mount and when workspace changes
  useEffect(() => {
    fetchConnection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWorkspace]);

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
        setWorkspaceConnection(null);
        setIsDisconnectModalOpen(false);
        // Refresh the page to update workspace state
        await fetchConnection();
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

  if (isLoading || isLoadingConnection) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

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

        {/* Conditional rendering based on connection status */}
        {workspaceConnection ? (
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
