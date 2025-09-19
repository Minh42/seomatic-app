import { useQuery } from '@tanstack/react-query';

interface SubscriptionLimits {
  maxPages: number | 'unlimited';
  maxCredits: number | 'unlimited';
  maxSeats: number | 'unlimited';
  maxSites: number | 'unlimited';
}

interface SubscriptionData {
  id: string;
  status: 'trialing' | 'active' | 'canceled' | 'past_due' | 'unpaid';
  planName: string;
  planLevel: number;
  trialDaysLeft: number | null;
  canUpgrade: boolean;
  limits: SubscriptionLimits;
}

interface UsageData {
  pagesPublished: number;
  aiCreditsUsed: number;
  workspaces: number;
  teamMembers: number;
  percentages: {
    pages: number;
    credits: number;
    sites: number;
    seats: number;
  };
}

interface PlanUsageResponse {
  subscription: SubscriptionData;
  usage: UsageData;
}

export function usePlanUsage(organizationId?: string) {
  return useQuery<PlanUsageResponse>({
    queryKey: ['plan-usage', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        throw new Error('Organization ID is required');
      }

      const response = await fetch(
        `/api/subscription/usage?organizationId=${organizationId}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch plan usage');
      }

      return response.json();
    },
    enabled: !!organizationId,
    // Refetch every 5 minutes to keep usage data fresh
    refetchInterval: 5 * 60 * 1000,
    // Keep data fresh when window regains focus
    refetchOnWindowFocus: true,
    // Keep previous data while refetching
    keepPreviousData: true,
  });
}
