import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { OnboardingService } from '@/lib/services/onboarding-service';
import { RedirectGuard, isCurrentPath } from '@/lib/utils/redirect-guard';

interface OnboardingGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode; // Optional fallback UI for redirect loop scenarios
}

/**
 * Server component that checks if user has completed onboarding
 * and redirects them if not. Includes protection against redirect loops.
 */
export async function OnboardingGuard({
  children,
  fallback,
}: OnboardingGuardProps) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      // Check for redirect loop before redirecting to login
      if (await RedirectGuard.isRedirectLoop('/login')) {
        console.error('Redirect loop detected in OnboardingGuard -> /login');
        return (
          fallback || (
            <div>
              Authentication required. Please <a href="/login">login</a>.
            </div>
          )
        );
      }
      redirect('/login');
    }

    // Check onboarding status with error handling
    let completedOnboarding = false;
    try {
      completedOnboarding = await OnboardingService.hasCompletedOnboarding(
        session.user.id
      );
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      // On error, assume onboarding is complete to prevent blocking
      completedOnboarding = true;
    }

    if (!completedOnboarding) {
      // Don't redirect if we're already on the onboarding page
      if (await isCurrentPath('/onboarding')) {
        return <>{children}</>;
      }

      // Check for redirect loop before redirecting to onboarding
      if (await RedirectGuard.isRedirectLoop('/onboarding')) {
        console.error(
          'Redirect loop detected in OnboardingGuard -> /onboarding'
        );
        return (
          fallback || (
            <div>
              Please complete your <a href="/onboarding">onboarding</a> to
              continue. If you&apos;re having issues, please{' '}
              <button
                onClick={() => (window.location.href = '/api/auth/signout')}
              >
                sign out
              </button>{' '}
              and try again.
            </div>
          )
        );
      }

      redirect('/onboarding');
    }

    return <>{children}</>;
  } catch (error) {
    console.error('OnboardingGuard error:', error);
    // On any unexpected error, render children to prevent blocking
    return <>{children}</>;
  }
}
