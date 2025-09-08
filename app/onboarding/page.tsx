import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { OnboardingService } from '@/lib/services/onboarding-service';
import { WorkspaceService } from '@/lib/services/workspace-service';
import { OnboardingPageClient } from './OnboardingPageClient';

export default async function OnboardingPage() {
  // Get session on server
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login');
  }

  const userId = session.user.id;

  // Fetch data in parallel on server
  const [progress, workspace] = await Promise.all([
    OnboardingService.getProgress(userId),
    WorkspaceService.getPrimaryWorkspace(userId),
  ]);

  // If onboarding is already completed, redirect
  if (progress?.onboardingCompleted) {
    redirect('/dashboard');
  }

  // Prepare initial data for client
  const initialData = {
    onboardingData: progress?.onboardingData || {
      currentStep: 1,
      useCases: [],
      otherUseCase: '',
      professionalRole: '',
      otherProfessionalRole: '',
      companySize: '',
      industry: '',
      otherIndustry: '',
      cmsIntegration: '',
      otherCms: '',
      discoverySource: '',
      otherDiscoverySource: '',
      previousAttempts: '',
      teamMembers: [],
    },
    workspaceId: workspace?.id || null,
    workspaceName: workspace?.name || '',
  };

  return <OnboardingPageClient initialData={initialData} />;
}
