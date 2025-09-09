import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { redirect } from 'next/navigation';
import { OnboardingService } from '@/lib/services/onboarding-service';
import { RedirectGuard, isCurrentPath } from '@/lib/utils/redirect-guard';
import { headers } from 'next/headers';
import { SignOutButton } from '@/components/auth/SignOutButton';

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const session = await getServerSession(authOptions);

    // 1. Check if user is authenticated
    if (!session?.user?.id) {
      // Prevent redirect loop
      if (await RedirectGuard.isRedirectLoop('/login')) {
        console.error('Redirect loop detected in OnboardingLayout -> /login');
        return (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">
                Authentication Required
              </h1>
              <p className="mb-4">
                Please{' '}
                <a href="/login" className="text-blue-600 underline">
                  login
                </a>{' '}
                to continue.
              </p>
              <p className="text-sm text-gray-500">
                If you&apos;re experiencing issues, try clearing your browser
                cache.
              </p>
            </div>
          </div>
        );
      }
      redirect('/login');
    }

    // 2. Check if user has already completed onboarding (with caching to prevent repeated DB calls)
    let completedOnboarding = false;
    let checkFailed = false;

    try {
      // Add a cache key to session to prevent repeated checks in the same request
      const headersList = await headers();
      const cacheKey = `onboarding-check-${session.user.id}`;
      const cached = headersList.get(cacheKey);

      if (cached !== null) {
        completedOnboarding = cached === 'true';
      } else {
        completedOnboarding = await OnboardingService.hasCompletedOnboarding(
          session.user.id
        );
      }
    } catch (error) {
      console.error('Error checking onboarding status in layout:', error);
      checkFailed = true;
      // On error, allow access to onboarding page
      completedOnboarding = false;
    }

    if (completedOnboarding && !checkFailed) {
      // Don't redirect if we're already on the dashboard
      if (await isCurrentPath('/dashboard')) {
        // This shouldn't happen, but prevent loop
        console.warn('Already on dashboard but onboarding layout was rendered');
        return <>{children}</>;
      }

      // Prevent redirect loop
      if (await RedirectGuard.isRedirectLoop('/dashboard')) {
        console.error(
          'Redirect loop detected in OnboardingLayout -> /dashboard'
        );
        return (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">
                Onboarding Already Complete
              </h1>
              <p className="mb-4">
                You&apos;ve already completed onboarding.
                <a href="/dashboard" className="text-blue-600 underline ml-1">
                  Go to Dashboard
                </a>
              </p>
              <p className="text-sm text-gray-500">
                If you&apos;re seeing this repeatedly, please{' '}
                <SignOutButton className="text-blue-600 underline bg-transparent border-none cursor-pointer">
                  sign out
                </SignOutButton>{' '}
                and sign back in.
              </p>
            </div>
          </div>
        );
      }

      // User has already completed onboarding, redirect to dashboard
      redirect('/dashboard');
    }

    // User is authenticated and hasn't completed onboarding
    return <>{children}</>;
  } catch (error: any) {
    // Don't catch Next.js redirect errors - let them bubble up
    if (error?.digest?.includes('NEXT_REDIRECT')) {
      throw error;
    }

    console.error('OnboardingLayout error:', error);
    // On unexpected error, show error page
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
          <p className="mb-4">
            We&apos;re having trouble loading the onboarding page.
          </p>
          <a href="/dashboard" className="text-blue-600 underline">
            Try going to Dashboard
          </a>
        </div>
      </div>
    );
  }
}
