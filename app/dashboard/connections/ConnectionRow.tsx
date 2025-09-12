'use client';

import { useState } from 'react';
import Image from 'next/image';
import { WordPressConnectionModal } from './WordPressConnectionModal';
import { WebflowConnectionModal } from './WebflowConnectionModal';
import { ShopifyConnectionModal } from './ShopifyConnectionModal';
import { GhostConnectionModal } from './GhostConnectionModal';
import { useQueryClient } from '@tanstack/react-query';

interface ConnectionRowProps {
  connection: {
    id: string;
    name: string;
    description: string;
    icon: string;
    status: 'not_connected' | 'connected' | 'error';
    isConfigured: boolean;
  };
  workspaceId?: string;
  isLast?: boolean;
}

export function ConnectionRow({
  connection,
  workspaceId,
  isLast = false,
}: ConnectionRowProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const handleAddConnection = () => {
    setIsModalOpen(true);
  };

  const handleConnectionSuccess = () => {
    setIsModalOpen(false);
    // Invalidate queries to refresh the connection data
    queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    queryClient.invalidateQueries({
      queryKey: ['connection', workspaceId],
    });
  };

  // Get documentation URL based on connection ID
  const getDocumentationUrl = () => {
    switch (connection.id) {
      case 'wordpress':
        return 'https://docs.seomatic.ai/integrations/7Me35UUvTEqmQNRxyWy6Ke/connect-wordpress/3PjSKfTt8Ju6Gt4DVinfJN';
      case 'webflow':
        return 'https://docs.seomatic.ai/integrations/7Me35UUvTEqmQNRxyWy6Ke/connect-webflow/5UWtaZhoqtFZc4fc8TggVs';
      case 'shopify':
        return 'https://docs.seomatic.ai/integrations/7Me35UUvTEqmQNRxyWy6Ke/connect-shopify/dwFLYQUwArfJNHEVYC6VAP';
      case 'ghost':
        return 'https://docs.seomatic.ai/integrations/7Me35UUvTEqmQNRxyWy6Ke/connect-ghost/rsKhKTK3iccXNYU23bLr49';
      default:
        return null;
    }
  };

  return (
    <div
      className={`bg-white px-6 py-5 hover:bg-gray-50 transition-colors ${!isLast ? 'border-b border-gray-200' : ''}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 relative flex-shrink-0">
            <Image
              src={connection.icon}
              alt={`${connection.name} logo`}
              width={32}
              height={32}
              className="object-contain"
            />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm leading-relaxed">
              {connection.name}
            </h3>
            <p className="text-sm font-normal text-zinc-500 leading-relaxed mt-0.5">
              {connection.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {getDocumentationUrl() && (
            <a
              href={getDocumentationUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-bold text-zinc-400 leading-relaxed hover:text-zinc-600 cursor-pointer"
            >
              Learn More
            </a>
          )}

          <button
            onClick={handleAddConnection}
            className="h-10 px-4 bg-slate-900 text-white rounded text-sm font-bold leading-relaxed hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Add Connection
          </button>
        </div>
      </div>

      {/* WordPress Connection Modal */}
      {connection.id === 'wordpress' && workspaceId && (
        <WordPressConnectionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          workspaceId={workspaceId}
          onSuccess={handleConnectionSuccess}
        />
      )}

      {/* Webflow Connection Modal */}
      {connection.id === 'webflow' && workspaceId && (
        <WebflowConnectionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          workspaceId={workspaceId}
          onSuccess={handleConnectionSuccess}
        />
      )}

      {/* Shopify Connection Modal */}
      {connection.id === 'shopify' && workspaceId && (
        <ShopifyConnectionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          workspaceId={workspaceId}
          onSuccess={handleConnectionSuccess}
        />
      )}

      {/* Ghost Connection Modal */}
      {connection.id === 'ghost' && workspaceId && (
        <GhostConnectionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          workspaceId={workspaceId}
          onSuccess={handleConnectionSuccess}
        />
      )}
    </div>
  );
}
