import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
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

  return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-full text-gray-500">
        <p>Select an item from the sidebar to get started</p>
      </div>
    </DashboardLayout>
  );
}
