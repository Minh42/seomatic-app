import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { OnboardingService } from '@/lib/services/onboarding-service';
import { WorkspaceService } from '@/lib/services/workspace-service';
import { CheckoutService } from '@/lib/services/checkout-service';
import { SubscriptionService } from '@/lib/services/subscription-service';
import { StripeService } from '@/lib/services/stripe-service';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { OnboardingPageClient } from './OnboardingPageClient';

interface OnboardingPageProps {
  searchParams: { token?: string };
}

export default async function OnboardingPage({
  searchParams,
}: OnboardingPageProps) {
  // Get session on server
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login');
  }

  const userId = session.user.id;

  // Check if there's a checkout token (from OAuth signup with Stripe)
  if (searchParams.token) {
    try {
      // Validate checkout session
      const checkoutSession = await CheckoutService.getSessionByToken(
        searchParams.token
      );
      const validation = CheckoutService.validateSession(checkoutSession);

      if (validation.isValid && checkoutSession) {
        // Check if user already has a subscription
        const existingSubscription =
          await SubscriptionService.getUserSubscription(userId);

        if (!existingSubscription) {
          // Fetch subscription details from Stripe
          const stripeData =
            await StripeService.getCheckoutSessionWithSubscription(
              checkoutSession.stripeSessionId
            );

          if (stripeData) {
            await db.transaction(async () => {
              // Create the subscription with accurate Stripe data
              await SubscriptionService.createSubscription({
                ownerId: userId,
                planId: checkoutSession.planId,
                status:
                  stripeData.status === 'trialing' ? 'trialing' : 'active',
                stripeCustomerId: stripeData.customerId,
                stripeSubscriptionId: stripeData.subscriptionId,
                currentPeriodStart: stripeData.currentPeriodStart,
                currentPeriodEnd: stripeData.currentPeriodEnd,
                trialEndsAt: stripeData.trialEnd || undefined,
              });

              // Update user with billing email
              await db
                .update(users)
                .set({ billingEmail: checkoutSession.email })
                .where(eq(users.id, userId));

              // Mark checkout session as completed
              await CheckoutService.completeSignup(searchParams.token!);
            });
          }
        }
      }
    } catch (error) {
      console.error('Error processing checkout token in onboarding:', error);
      // Continue with onboarding even if token processing fails
    }
  }

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
