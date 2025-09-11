'use client';

import Image from 'next/image';

type ConnectionStatus = 'not_connected' | 'connected' | 'error';

interface ConnectionRowProps {
  connection: {
    id: string;
    name: string;
    description: string;
    icon: string;
    status: ConnectionStatus;
    isConfigured: boolean;
  };
  onStatusChange: (id: string, status: ConnectionStatus) => void;
  isLast?: boolean;
}

export function ConnectionRow({
  connection,
  onStatusChange,
  isLast = false,
}: ConnectionRowProps) {
  const handleAddConnection = () => {
    // Simulate connection (in real app, this would open a modal or redirect)
    onStatusChange(connection.id, 'connected');
  };

  const handleManage = () => {
    // Handle manage action
    console.log('Manage connection:', connection.id);
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

          {connection.status === 'connected' ? (
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <span className="text-sm text-gray-600 mr-3">Connected</span>
              <button
                onClick={handleManage}
                className="px-5 py-2 bg-indigo-600 text-white rounded-full text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                Manage
              </button>
            </div>
          ) : (
            <button
              onClick={handleAddConnection}
              className="h-10 px-4 bg-slate-900 text-white rounded text-sm font-bold leading-relaxed hover:bg-slate-800 transition-colors"
            >
              Add Connection
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
