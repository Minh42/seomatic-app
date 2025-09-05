import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { redirect } from 'next/navigation';
import { OnboardingGuard } from '@/components/auth/OnboardingGuard';
import { DashboardClient } from '@/components/dashboard/DashboardClient';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return (
    <OnboardingGuard>
      <DashboardClient session={session} />
    </OnboardingGuard>
  );
}
