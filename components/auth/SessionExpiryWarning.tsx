'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { signOut } from 'next-auth/react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  isSessionExpiringSoon,
  getRemainingSessionTime,
  formatRemainingTime,
} from '@/lib/auth/session-utils';

export function SessionExpiryWarning() {
  const { data: session, update } = useSession();
  const [showWarning, setShowWarning] = useState(false);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);

  useEffect(() => {
    if (!session) return;

    // Don't show warnings for remember me sessions
    if ((session as { rememberMe?: boolean })?.rememberMe) {
      return;
    }

    // Check session expiry every minute
    const checkExpiry = () => {
      const remaining = getRemainingSessionTime(session);
      setRemainingTime(remaining);

      // Show warning when 5 minutes or less remaining
      if (remaining !== null && remaining <= 300 && remaining > 0) {
        setShowWarning(true);
      } else if (remaining !== null && remaining <= 0) {
        // Session expired, sign out
        handleSignOut();
      } else {
        setShowWarning(false);
      }
    };

    // Initial check
    checkExpiry();

    // Set up interval to check every 30 seconds
    const interval = setInterval(checkExpiry, 30000);

    return () => clearInterval(interval);
  }, [session]);

  const handleExtendSession = async () => {
    try {
      // Trigger a session update to extend the session
      await update();
      toast.success('Session extended successfully');
      setShowWarning(false);
    } catch (error) {
      toast.error('Failed to extend session');
      console.error('Session extension error:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  if (!showWarning || !remainingTime) {
    return null;
  }

  return (
    <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Session Expiring Soon</AlertDialogTitle>
          <AlertDialogDescription>
            Your session will expire in {formatRemainingTime(remainingTime)}.
            Would you like to extend your session or sign out?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleSignOut}>
            Sign Out
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleExtendSession}>
            Extend Session
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Hook to use session expiry information
 */
export function useSessionExpiry() {
  const { data: session } = useSession();
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [isExpiringSoon, setIsExpiringSoon] = useState(false);

  useEffect(() => {
    if (!session) {
      setRemainingTime(null);
      setIsExpiringSoon(false);
      return;
    }

    const updateStatus = () => {
      const remaining = getRemainingSessionTime(session);
      setRemainingTime(remaining);
      setIsExpiringSoon(isSessionExpiringSoon(session));
    };

    // Initial update
    updateStatus();

    // Update every 10 seconds
    const interval = setInterval(updateStatus, 10000);

    return () => clearInterval(interval);
  }, [session]);

  return {
    remainingTime,
    isExpiringSoon,
    hasRememberMe: (session as { rememberMe?: boolean })?.rememberMe || false,
    formattedTime: remainingTime ? formatRemainingTime(remainingTime) : null,
  };
}
