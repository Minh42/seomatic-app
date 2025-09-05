import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { redirect } from 'next/navigation';
import { hasCompletedOnboarding } from '@/lib/auth/onboarding-check';

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  // 1. Check if user is authenticated
  if (!session?.user?.id) {
    redirect('/login');
  }

  // 2. Check if user has already completed onboarding
  const completedOnboarding = await hasCompletedOnboarding(session.user.id);
  if (completedOnboarding) {
    // User has already completed onboarding, redirect to dashboard
    redirect('/dashboard');
  }

  // User is authenticated and hasn't completed onboarding
  return <>{children}</>;
}
