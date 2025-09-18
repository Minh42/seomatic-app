'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Crown } from 'lucide-react';
import { usePlanUsage } from '@/hooks/usePlanUsage';

interface UsageBarProps {
  label: string;
  current: number;
  max: number | 'unlimited';
  unit?: string;
}

function UsageBar({ label, current, max, unit = '' }: UsageBarProps) {
  const isUnlimited = max === 'unlimited';
  const percentage = isUnlimited ? 0 : Math.round((current / max) * 100);

  // Determine color based on percentage
  const getBarColor = () => {
    if (isUnlimited) return 'bg-gray-600';
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // Format display numbers
  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };

  return (
    <div className="space-y-0.5">
      <div className="flex justify-between items-baseline">
        <span className="text-xs text-gray-400">{label}</span>
        <span className="text-xs text-gray-300">
          {formatNumber(current)}
          {unit}
          {!isUnlimited && (
            <>
              <span className="text-gray-500">/</span>
              {formatNumber(max)}
              {unit}
            </>
          )}
          {isUnlimited && <span className="text-gray-500">/∞</span>}
        </span>
      </div>
      <div className="h-1 bg-gray-700/50 rounded-full overflow-hidden">
        {!isUnlimited && (
          <div
            className={`h-full transition-all duration-300 ${getBarColor()}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        )}
      </div>
    </div>
  );
}

export function PlanUsage() {
  const { data, isLoading, error } = usePlanUsage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isLoading) {
    return (
      <div className="border-t border-gray-200/10 p-3">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700/50 rounded w-24 mb-3"></div>
          <div className="space-y-3">
            <div className="h-6 bg-gray-700/50 rounded"></div>
            <div className="h-6 bg-gray-700/50 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return null;
  }

  const { subscription, usage } = data;
  const isTrialing = subscription.status === 'trialing';
  const daysLeft = subscription.trialDaysLeft;

  // Determine if we should show upgrade button
  const shouldShowUpgrade = isTrialing || subscription.canUpgrade;

  // Check if any usage is near limit (>70%)
  const nearingLimits = Object.values(usage).some(u => {
    if (typeof u === 'object' && u !== null && 'percentage' in u) {
      return u.percentage >= 70;
    }
    return false;
  });

  return (
    <div className="border-t border-gray-200/10">
      <div className="p-2.5 space-y-2">
        {/* Plan name and status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {subscription.planLevel >= 2 && (
              <Crown className="h-3 w-3 text-yellow-500" />
            )}
            <span className="text-xs font-medium text-gray-300">
              {subscription.planName}
            </span>
          </div>
          {isTrialing && daysLeft !== null && (
            <span className="text-xs text-yellow-500 font-medium">
              {daysLeft} days left
            </span>
          )}
        </div>

        {/* Usage bars */}
        <div className="space-y-1.5">
          <UsageBar
            label="Pages"
            current={usage.pagesPublished}
            max={subscription.limits.maxPages}
          />
          <UsageBar
            label="AI Credits"
            current={usage.aiCreditsUsed}
            max={subscription.limits.maxCredits}
          />
          <UsageBar
            label="Sites"
            current={usage.workspaces}
            max={subscription.limits.maxSites}
          />
          {subscription.limits.maxSeats > 1 && (
            <UsageBar
              label="Team"
              current={usage.teamMembers}
              max={subscription.limits.maxSeats}
            />
          )}
        </div>

        {/* Actions */}
        {shouldShowUpgrade && (
          <div className="pt-0.5">
            <Link
              href="/dashboard/settings?tab=plans"
              className={`flex items-center justify-center gap-1 w-full px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                isTrialing || nearingLimits
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  : 'bg-gray-800/50 hover:bg-gray-800 text-gray-300'
              }`}
            >
              <span>{isTrialing ? 'Upgrade Now' : 'Upgrade Plan'}</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
