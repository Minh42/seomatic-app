'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface UseNavigationGuardOptions {
  enabled?: boolean;
  message?: string;
  onNavigate?: () => boolean | Promise<boolean>; // Return true to allow navigation
}

export function useNavigationGuard({
  enabled = true,
  message = 'You have unsaved changes. Are you sure you want to leave?',
  onNavigate,
}: UseNavigationGuardOptions = {}) {
  const router = useRouter();

  // Handle browser navigation (back/forward buttons)
  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = message;
      return message;
    };

    const handlePopState = async () => {
      if (onNavigate) {
        const canNavigate = await onNavigate();
        if (!canNavigate) {
          // Push the current state back to prevent navigation
          window.history.pushState(null, '', window.location.href);

          // Show a toast notification
          toast.warning(message, {
            action: {
              label: 'Leave anyway',
              onClick: () => {
                window.removeEventListener('beforeunload', handleBeforeUnload);
                window.history.back();
              },
            },
            duration: 5000,
          });
        }
      }
    };

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    // Push initial state to enable popstate handling
    window.history.pushState(null, '', window.location.href);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [enabled, message, onNavigate]);

  // Safe navigation method that checks before proceeding
  const safeNavigate = useCallback(
    async (path: string) => {
      if (!enabled) {
        router.push(path);
        return;
      }

      if (onNavigate) {
        const canNavigate = await onNavigate();
        if (canNavigate) {
          router.push(path);
        } else {
          toast.warning(message, {
            action: {
              label: 'Leave anyway',
              onClick: () => router.push(path),
            },
            duration: 5000,
          });
        }
      } else {
        router.push(path);
      }
    },
    [enabled, message, onNavigate, router]
  );

  return { safeNavigate };
}

// Specific hook for onboarding navigation
export function useOnboardingNavigationGuard(hasUnsavedChanges: boolean) {
  return useNavigationGuard({
    enabled: hasUnsavedChanges,
    message:
      'You have unsaved progress. Your changes will be lost if you leave.',
    onNavigate: async () => {
      // Could add logic here to save progress before allowing navigation
      return !hasUnsavedChanges;
    },
  });
}
