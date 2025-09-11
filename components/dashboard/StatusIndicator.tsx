import type { ConnectionStatus } from '@/app/dashboard/actions';

interface StatusIndicatorProps {
  status: ConnectionStatus;
  className?: string;
}

const statusConfig = {
  pending: {
    color: 'bg-yellow-400',
    label: 'Pending',
    animation: 'animate-pulse',
  },
  connected: {
    color: 'bg-green-400',
    label: 'Connected',
    animation: '',
  },
  failed: {
    color: 'bg-red-400',
    label: 'Failed',
    animation: '',
  },
  disconnected: {
    color: 'bg-gray-400',
    label: 'Disconnected',
    animation: '',
  },
};

export function StatusIndicator({
  status,
  className = 'h-2 w-2',
}: StatusIndicatorProps) {
  const config = statusConfig[status];

  return (
    <div
      className={`${className} ${config.color} ${config.animation} rounded-full`}
      title={config.label}
    />
  );
}

export function StatusBadge({ status }: { status: ConnectionStatus }) {
  const config = statusConfig[status];

  return (
    <div className="inline-flex items-center gap-1.5">
      <div
        className={`h-2 w-2 ${config.color} ${config.animation} rounded-full`}
      />
      <span className="text-xs text-gray-400">{config.label}</span>
    </div>
  );
}
