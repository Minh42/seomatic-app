import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { redirect } from 'next/navigation';
import { DashboardClient } from '@/components/dashboard/DashboardClient';
import { OnboardingService } from '@/lib/services/onboarding-service';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login');
  }

  // Check onboarding status directly
  const hasCompletedOnboarding = await OnboardingService.hasCompletedOnboarding(
    session.user.id
  );

  if (!hasCompletedOnboarding) {
    redirect('/onboarding');
  }

  return <DashboardClient session={session} />;
}
