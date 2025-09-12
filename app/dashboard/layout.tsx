import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { OnboardingService } from '@/lib/services/onboarding-service';

export default async function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login');
  }

  // Check onboarding status
  const hasCompletedOnboarding = await OnboardingService.hasCompletedOnboarding(
    session.user.id
  );

  if (!hasCompletedOnboarding) {
    redirect('/onboarding');
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
