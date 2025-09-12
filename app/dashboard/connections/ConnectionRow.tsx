'use client';

import { useState } from 'react';
import Image from 'next/image';
import { WordPressConnectionModal } from './WordPressConnectionModal';

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

  const handleAddConnection = () => {
    setIsModalOpen(true);
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
          <button className="text-sm font-bold text-zinc-400 leading-relaxed hover:text-zinc-600">
            Learn More
          </button>

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
        />
      )}
    </div>
  );
}
