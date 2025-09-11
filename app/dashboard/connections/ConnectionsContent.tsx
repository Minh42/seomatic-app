'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { ConnectionRow } from './ConnectionRow';

type ConnectionStatus = 'not_connected' | 'connected' | 'error';

type Connection = {
  id: string;
  name: string;
  description: string;
  icon: string;
  status: ConnectionStatus;
  isConfigured: boolean;
};

export function ConnectionsContent() {
  const [activeTab, setActiveTab] = useState<'available' | 'configured'>(
    'available'
  );
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data - replace with actual data
  const [connections, setConnections] = useState<Connection[]>([
    {
      id: 'wordpress',
      name: 'WordPress',
      description: 'Connect your WordPress site',
      icon: '/logos/cms/wordpress.svg',
      status: 'not_connected',
      isConfigured: false,
    },
    {
      id: 'webflow',
      name: 'Webflow',
      description: 'Sync with Webflow CMS',
      icon: '/logos/cms/webflow.svg',
      status: 'not_connected',
      isConfigured: false,
    },
    {
      id: 'shopify',
      name: 'Shopify',
      description: 'Integrate your Shopify store',
      icon: '/logos/cms/shopify.svg',
      status: 'not_connected',
      isConfigured: false,
    },
    {
      id: 'ghost',
      name: 'Ghost',
      description: 'Connect Ghost CMS',
      icon: '/logos/cms/ghost.svg',
      status: 'not_connected',
      isConfigured: false,
    },
    {
      id: 'seomatic',
      name: 'SEOmatic',
      description: 'Host directly on SEOmatic',
      icon: '/logos/cms/seomatic.svg',
      status: 'not_connected',
      isConfigured: false,
    },
  ]);

  const availableConnections = connections.filter(c => !c.isConfigured);
  const configuredConnections = connections.filter(c => c.isConfigured);

  const filteredConnections =
    activeTab === 'available'
      ? availableConnections.filter(
          conn =>
            conn.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            conn.description.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : configuredConnections.filter(
          conn =>
            conn.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            conn.description.toLowerCase().includes(searchQuery.toLowerCase())
        );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 leading-normal">
            Connections
          </h1>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('available')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'available'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Available
            </button>
            <button
              onClick={() => setActiveTab('configured')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'configured'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Configured
            </button>
          </nav>
        </div>

        {/* Connect Apps Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900 leading-normal">
                Connect Apps
              </h2>
              <p className="text-sm font-normal text-zinc-500 leading-relaxed">
                Connect your CMS or host directly to start publishing pages.
              </p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
              <input
                type="text"
                placeholder="Search App"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="h-10 pl-10 pr-4 border border-gray-300 rounded-lg text-xs font-medium leading-tight placeholder:text-zinc-400 placeholder:font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-64"
              />
            </div>
          </div>
        </div>

        {/* Connections List */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {filteredConnections.map((connection, index) => (
            <ConnectionRow
              key={connection.id}
              connection={connection}
              isLast={index === filteredConnections.length - 1}
              onStatusChange={(id, newStatus) => {
                setConnections(prev =>
                  prev.map(c =>
                    c.id === id
                      ? {
                          ...c,
                          status: newStatus,
                          isConfigured: newStatus === 'connected',
                        }
                      : c
                  )
                );
              }}
            />
          ))}
        </div>

        {filteredConnections.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No connections found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
