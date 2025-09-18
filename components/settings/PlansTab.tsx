'use client';

import { useState, useEffect } from 'react';
import { ArrowUpRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { UpgradeSubscriptionModal } from '@/components/modals/UpgradeSubscriptionModal';
import { DowngradeSubscriptionModal } from '@/components/modals/DowngradeSubscriptionModal';
import { SelectMembersModal } from '@/components/modals/SelectMembersModal';

interface PlanLimits {
  credits: string;
  pages: string;
  seats: string | number;
  sites: string | number;
}

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  frequency: 'monthly' | 'yearly';
  level: number;
  isRecommended: boolean;
  features: string[] | null;
  limits: PlanLimits;
  stripePriceId: string | null;
  action: 'current' | 'upgrade' | 'downgrade';
}

interface PlansResponse {
  plans: Plan[];
  currentPlan: {
    id: string;
    name: string;
    level: number;
  } | null;
}

export function PlansTab() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPlan, setCurrentPlan] =
    useState<PlansResponse['currentPlan']>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [billingFrequency, setBillingFrequency] = useState<
    'monthly' | 'yearly'
  >('monthly');
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showDowngradeModal, setShowDowngradeModal] = useState(false);
  const [showSelectMembersModal, setShowSelectMembersModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [currentSubscriptionPrice, setCurrentSubscriptionPrice] =
    useState<number>(0);
  const [currentSubscriptionFrequency, setCurrentSubscriptionFrequency] =
    useState<'monthly' | 'yearly'>('monthly');
  const [memberSelectionData, setMemberSelectionData] = useState<any>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/plans');
      if (!response.ok) throw new Error('Failed to fetch plans');

      const data: PlansResponse = await response.json();
      setPlans(data.plans);
      setCurrentPlan(data.currentPlan);

      // Set default frequency based on current plan if exists
      const currentSub = data.plans.find(p => p.action === 'current');
      if (currentSub) {
        setBillingFrequency(currentSub.frequency);
        setCurrentSubscriptionPrice(currentSub.price);
        setCurrentSubscriptionFrequency(currentSub.frequency);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast.error('Failed to load plans');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlanAction = async (plan: Plan) => {
    if (plan.action === 'current') return;

    setSelectedPlan(plan);

    if (plan.action === 'upgrade') {
      setShowUpgradeModal(true);
    } else if (plan.action === 'downgrade') {
      setShowDowngradeModal(true);
    }
  };

  const handleConfirmPlanChange = async () => {
    if (!selectedPlan) return;

    setProcessingPlanId(selectedPlan.id);

    try {
      // All users have subscriptions (at least trial), so always use API for plan changes
      const response = await fetch('/api/subscription/change-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: selectedPlan.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change plan');
      }

      // Check if member selection is required for downgrade
      if (data.requiresMemberSelection) {
        setMemberSelectionData({
          members: data.members,
          currentMembers: data.currentMembers,
          newLimit: data.newLimit,
          newPlanId: data.newPlanId,
          newPlanName: data.newPlanName,
        });
        setShowDowngradeModal(false);
        setShowSelectMembersModal(true);
        setProcessingPlanId(null);
        return;
      }

      // Check if checkout is required (for trial users)
      if (data.requiresCheckout && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      // Show success message
      toast.success(
        data.message || `Successfully changed to ${selectedPlan.name}`
      );

      // Close modals
      setShowUpgradeModal(false);
      setShowDowngradeModal(false);

      // Refresh the page to show updated plan
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Error processing plan change:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to process plan change'
      );
      setProcessingPlanId(null);
    } finally {
      setSelectedPlan(null);
    }
  };

  const handleConfirmMemberSelection = async (selectedMemberIds: string[]) => {
    if (!memberSelectionData) return;

    setProcessingPlanId(memberSelectionData.newPlanId);

    try {
      const response = await fetch('/api/subscription/downgrade-with-members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: memberSelectionData.newPlanId,
          keepMemberIds: selectedMemberIds,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to downgrade plan');
      }

      // Show success message
      toast.success(
        data.message ||
          `Successfully downgraded to ${memberSelectionData.newPlanName}. ${data.suspendedMembers} member(s) suspended.`
      );

      // Close modal
      setShowSelectMembersModal(false);

      // Refresh the page to show updated plan
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Error processing downgrade:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to process downgrade'
      );
    } finally {
      setProcessingPlanId(null);
      setMemberSelectionData(null);
    }
  };

  const getActionButtonText = (action: string) => {
    switch (action) {
      case 'current':
        return 'Current Plan';
      case 'upgrade':
        return 'Upgrade';
      case 'downgrade':
        return 'Downgrade';
      default:
        return 'Upgrade';
    }
  };

  // Filter plans by selected frequency
  const displayPlans = plans.filter(
    plan => plan.frequency === billingFrequency
  );

  // Check if we have both monthly and yearly plans
  const hasMultipleFrequencies =
    plans.some(p => p.frequency === 'monthly') &&
    plans.some(p => p.frequency === 'yearly');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const styles: { [key: string]: React.CSSProperties } = {
    container: {
      background:
        'linear-gradient(90deg, #44ff9a -0.55%, #44b0ff 22.86%, #8b44ff 48.36%, #ff6644 73.33%, #ebff70 99.34%)',
    },
  };

  return (
    <div className="max-w-6xl">
      {/* Header with billing toggle */}
      {hasMultipleFrequencies && (
        <div className="mb-8 flex justify-center">
          <div className="inline-flex items-center space-x-2.5 rounded border border-gray-300 px-5 py-4">
            <span
              className={`text-sm font-bold tracking-widest uppercase ${
                billingFrequency === 'monthly'
                  ? 'text-gray-900'
                  : 'text-gray-400'
              }`}
            >
              Billed Monthly
            </span>
            <button
              type="button"
              className="relative inline-flex h-4 w-20 flex-shrink-0 cursor-pointer rounded bg-gray-100 transition-colors duration-200 ease-in-out focus:outline-none"
              role="switch"
              aria-checked={billingFrequency === 'yearly'}
              onClick={() =>
                setBillingFrequency(
                  billingFrequency === 'monthly' ? 'yearly' : 'monthly'
                )
              }
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-4 w-10 rounded shadow transition duration-200 ease-in-out ${
                  billingFrequency === 'yearly'
                    ? 'translate-x-10 bg-gray-900'
                    : 'translate-x-0 bg-gray-900'
                }`}
              />
            </button>
            <span
              className={`text-sm font-bold tracking-widest uppercase ${
                billingFrequency === 'yearly'
                  ? 'text-gray-900'
                  : 'text-gray-400'
              }`}
            >
              Billed Yearly
            </span>
            {billingFrequency === 'yearly' && (
              <span className="ml-2 rounded-md bg-purple-100 px-2 py-1 text-sm font-bold text-gray-900">
                4 months off 🎁
              </span>
            )}
          </div>
        </div>
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {displayPlans.map(plan => {
          const isCurrentPlan = plan.action === 'current';
          const isRecommended = plan.isRecommended && !isCurrentPlan;

          return (
            <div key={plan.id} className="relative">
              {/* Gradient background for recommended plan */}
              {isRecommended && (
                <div className="absolute -inset-4">
                  <div
                    className="mx-auto h-full w-full rotate-180 opacity-30 blur-lg filter"
                    style={styles.container}
                  ></div>
                </div>
              )}

              <div
                className={`relative overflow-hidden rounded-2xl border ${
                  isRecommended
                    ? 'border-gray-200 bg-gray-900'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="p-5 lg:px-6 lg:py-6">
                  <h3
                    className={`text-base font-semibold ${
                      isRecommended ? 'text-white' : 'text-gray-900'
                    }`}
                  >
                    {plan.name}
                  </h3>

                  {/* Price */}
                  <div className="flex items-end">
                    <p
                      className={`mt-2 text-3xl font-bold ${
                        isRecommended ? 'text-white' : 'text-gray-900'
                      }`}
                    >
                      ${plan.price}
                    </p>
                    <p
                      className={`text-sm font-medium ${
                        isRecommended ? 'text-white' : 'text-gray-900'
                      }`}
                    >
                      /{billingFrequency === 'monthly' ? 'mo' : 'yr'}
                    </p>
                  </div>

                  {/* Description */}
                  {plan.description && (
                    <p className="mt-3 text-sm font-normal leading-6 text-gray-600">
                      {plan.description}
                    </p>
                  )}

                  {/* Action Button */}
                  <button
                    onClick={() => handlePlanAction(plan)}
                    disabled={isCurrentPlan || processingPlanId === plan.id}
                    className={`mt-6 inline-flex w-full items-center justify-center rounded-lg px-6 py-2.5 text-sm font-semibold transition-all duration-200 ${
                      isCurrentPlan
                        ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                        : isRecommended
                          ? 'border-2 border-transparent bg-white text-gray-900 hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-900 cursor-pointer'
                          : 'border-2 border-gray-400 text-gray-900 hover:border-gray-900 hover:bg-gray-900 hover:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 cursor-pointer'
                    }`}
                  >
                    {processingPlanId === plan.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        {getActionButtonText(plan.action)}
                        {plan.action !== 'current' && (
                          <ArrowUpRight className="ml-2 h-4 w-4" />
                        )}
                      </>
                    )}
                  </button>

                  {/* Features */}
                  <p
                    className={`mt-6 text-sm font-semibold ${
                      isRecommended ? 'text-white' : 'text-gray-900'
                    }`}
                  >
                    What&apos;s included:
                  </p>
                  <ul className="mt-3 space-y-2">
                    {/* Features from database */}
                    {plan.features?.map((feature, index) => (
                      <li
                        key={index}
                        className={`text-sm ${
                          isRecommended ? 'text-gray-400' : 'text-gray-600'
                        }`}
                      >
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Note about billing */}
      <div className="mt-8 rounded-lg bg-gray-50 p-4">
        <p className="text-sm text-gray-600">
          <strong>Note:</strong> Plan changes take effect immediately. When
          upgrading, you&apos;ll be charged the prorated difference. When
          downgrading, you&apos;ll receive a prorated credit applied to your
          next invoice.
        </p>
      </div>

      {/* Upgrade Modal */}
      {selectedPlan && currentPlan && (
        <UpgradeSubscriptionModal
          isOpen={showUpgradeModal}
          onClose={() => {
            setShowUpgradeModal(false);
            setSelectedPlan(null);
            setProcessingPlanId(null);
          }}
          onConfirm={handleConfirmPlanChange}
          isLoading={processingPlanId === selectedPlan.id}
          currentPlan={currentPlan.name}
          newPlan={selectedPlan.name}
          currentPrice={currentSubscriptionPrice}
          newPrice={selectedPlan.price}
          currentFrequency={currentSubscriptionFrequency}
          newFrequency={selectedPlan.frequency}
        />
      )}

      {/* Downgrade Modal */}
      {selectedPlan && currentPlan && (
        <DowngradeSubscriptionModal
          isOpen={showDowngradeModal}
          onClose={() => {
            setShowDowngradeModal(false);
            setSelectedPlan(null);
            setProcessingPlanId(null);
          }}
          onConfirm={handleConfirmPlanChange}
          isLoading={processingPlanId === selectedPlan.id}
          currentPlan={currentPlan.name}
          newPlan={selectedPlan.name}
          currentPrice={currentSubscriptionPrice}
          newPrice={selectedPlan.price}
          currentFrequency={currentSubscriptionFrequency}
          newFrequency={selectedPlan.frequency}
        />
      )}

      {/* Member Selection Modal */}
      {memberSelectionData && (
        <SelectMembersModal
          isOpen={showSelectMembersModal}
          onClose={() => {
            setShowSelectMembersModal(false);
            setMemberSelectionData(null);
            setProcessingPlanId(null);
          }}
          members={memberSelectionData.members}
          currentLimit={memberSelectionData.currentMembers}
          newLimit={memberSelectionData.newLimit}
          newPlanName={memberSelectionData.newPlanName}
          onConfirm={handleConfirmMemberSelection}
          isLoading={processingPlanId === memberSelectionData.newPlanId}
        />
      )}
    </div>
  );
}
