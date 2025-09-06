'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AlertCircle } from 'lucide-react';

interface SessionGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export function SessionGuard({
  children,
  redirectTo = '/login',
}: SessionGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Check session status
    if (status === 'loading') return;

    if (!session) {
      // Save current path for redirect after login
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
      }

      toast.error('Session expired. Please sign in again.', {
        icon: <AlertCircle className="h-4 w-4" />,
        duration: 5000,
      });

      router.push(redirectTo);
    }
  }, [session, status, router, redirectTo]);

  // Handle network errors that might cause session issues
  useEffect(() => {
    const handleOnline = () => {
      toast.success('Connection restored');
    };

    const handleOffline = () => {
      toast.warning('No internet connection. Some features may not work.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Handle visibility change to check session
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && status !== 'loading') {
        // Trigger a session check when page becomes visible
        if (!session) {
          router.push(redirectTo);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [session, status, router, redirectTo]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">
          <p className="text-gray-500">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return <>{children}</>;
}
