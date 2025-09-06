'use client';

import { useEffect, useState } from 'react';
import {
  CheckCircle,
  Loader2,
  AlertCircle,
  Cloud,
  CloudOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'offline';

interface SaveIndicatorProps {
  status: SaveStatus;
  message?: string;
  className?: string;
  showAlways?: boolean;
}

export function SaveIndicator({
  status,
  message,
  className,
  showAlways = false,
}: SaveIndicatorProps) {
  const [isVisible, setIsVisible] = useState(showAlways || status !== 'idle');

  useEffect(() => {
    if (status === 'saved' && !showAlways) {
      // Hide after 3 seconds when saved
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 3000);
      return () => clearTimeout(timer);
    } else if (status !== 'idle' || showAlways) {
      setIsVisible(true);
    }
  }, [status, showAlways]);

  if (!isVisible && !showAlways) return null;

  const getStatusConfig = () => {
    switch (status) {
      case 'saving':
        return {
          icon: <Loader2 className="h-4 w-4 animate-spin" />,
          text: message || 'Saving...',
          className: 'text-blue-600 bg-blue-50 border-blue-200',
        };
      case 'saved':
        return {
          icon: <CheckCircle className="h-4 w-4" />,
          text: message || 'Saved',
          className: 'text-green-600 bg-green-50 border-green-200',
        };
      case 'error':
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          text: message || 'Failed to save',
          className: 'text-red-600 bg-red-50 border-red-200',
        };
      case 'offline':
        return {
          icon: <CloudOff className="h-4 w-4" />,
          text: message || 'Offline - changes will sync when online',
          className: 'text-yellow-600 bg-yellow-50 border-yellow-200',
        };
      case 'idle':
      default:
        return {
          icon: <Cloud className="h-4 w-4" />,
          text: message || 'Ready',
          className: 'text-gray-500 bg-gray-50 border-gray-200',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm font-medium transition-all duration-200',
        config.className,
        className
      )}
      role="status"
      aria-live="polite"
    >
      {config.icon}
      <span>{config.text}</span>
    </div>
  );
}

// Compact version for inline use
export function SaveIndicatorCompact({ status }: { status: SaveStatus }) {
  if (status === 'idle') return null;

  const getIcon = () => {
    switch (status) {
      case 'saving':
        return <Loader2 className="h-3 w-3 animate-spin text-blue-600" />;
      case 'saved':
        return <CheckCircle className="h-3 w-3 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-3 w-3 text-red-600" />;
      case 'offline':
        return <CloudOff className="h-3 w-3 text-yellow-600" />;
      default:
        return null;
    }
  };

  return (
    <span className="inline-flex items-center" role="status" aria-live="polite">
      {getIcon()}
    </span>
  );
}

// Hook for managing save states
export function useSaveStatus() {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    const handleOnline = () => {
      if (status === 'offline') {
        setStatus('idle');
        setMessage('');
      }
    };

    const handleOffline = () => {
      setStatus('offline');
      setMessage('Working offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check initial state
    if (!navigator.onLine) {
      handleOffline();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [status]);

  const setSaving = (msg?: string) => {
    setStatus('saving');
    setMessage(msg || 'Saving...');
  };

  const setSaved = (msg?: string) => {
    setStatus('saved');
    setMessage(msg || 'Saved');
  };

  const setError = (msg?: string) => {
    setStatus('error');
    setMessage(msg || 'Failed to save');
  };

  const setIdle = () => {
    setStatus('idle');
    setMessage('');
  };

  return {
    status,
    message,
    setSaving,
    setSaved,
    setError,
    setIdle,
    isOnline: navigator.onLine,
  };
}
