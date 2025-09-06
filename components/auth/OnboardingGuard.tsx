import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { OnboardingService } from '@/lib/services/onboarding-service';

interface OnboardingGuardProps {
  children: React.ReactNode;
}

/**
 * Server component that checks if user has completed onboarding
 * and redirects them if not
 */
export async function OnboardingGuard({ children }: OnboardingGuardProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login');
  }

  const completedOnboarding = await OnboardingService.hasCompletedOnboarding(
    session.user.id
  );

  if (!completedOnboarding) {
    redirect('/onboarding');
  }

  return <>{children}</>;
}
