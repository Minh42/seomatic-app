import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { OnboardingFormData } from '@/lib/validations/onboarding';

export interface SaveProgressParams {
  userId: string;
  step: number;
  data?: any;
}

export interface CompleteOnboardingParams extends OnboardingFormData {
  userId: string;
  workspaceId: string;
}

export class OnboardingService {
  /**
   * Get onboarding progress for a user
   */
  static async getProgress(userId: string) {
    const [user] = await db
      .select({
        onboardingCompleted: users.onboardingCompleted,
        onboardingCompletedAt: users.onboardingCompletedAt,
        onboardingCurrentStep: users.onboardingCurrentStep,
        // Step 1
        useCases: users.useCases,
        otherUseCase: users.otherUseCase,
        // Step 2
        professionalRole: users.professionalRole,
        otherProfessionalRole: users.otherProfessionalRole,
        companySize: users.companySize,
        industry: users.industry,
        otherIndustry: users.otherIndustry,
        // Step 4
        discoverySource: users.discoverySource,
        otherDiscoverySource: users.otherDiscoverySource,
        previousAttempts: users.previousAttempts,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return null;
    }

    // Format onboarding data for the form
    const onboardingData = {
      currentStep: user.onboardingCurrentStep || 1,
      useCases: user.useCases || [],
      otherUseCase: user.otherUseCase || '',
      professionalRole: user.professionalRole || '',
      otherProfessionalRole: user.otherProfessionalRole || '',
      companySize: user.companySize || '',
      industry: user.industry || '',
      otherIndustry: user.otherIndustry || '',
      discoverySource: user.discoverySource || '',
      otherDiscoverySource: user.otherDiscoverySource || '',
      previousAttempts: user.previousAttempts || '',
      teamMembers: [], // Loaded separately from teamMembers table
    };

    return {
      onboardingCompleted: user.onboardingCompleted || false,
      onboardingCompletedAt: user.onboardingCompletedAt,
      onboardingData,
    };
  }

  /**
   * Save onboarding progress for a specific step
   */
  static async saveProgress({ userId, step, data }: SaveProgressParams) {
    // Check if onboarding is already completed
    const [user] = await db
      .select({ onboardingCompleted: users.onboardingCompleted })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new Error('User not found');
    }

    if (user.onboardingCompleted) {
      throw new Error('Onboarding already completed');
    }

    // Build update object
    const updateData: any = {
      updatedAt: new Date(),
    };

    // If data is provided, save it based on step
    if (data && Object.keys(data).length > 0) {
      switch (step) {
        case 1:
          // Step 1: Use Cases
          if (data.useCases !== undefined) updateData.useCases = data.useCases;
          if (data.otherUseCase !== undefined)
            updateData.otherUseCase = data.otherUseCase;
          break;

        case 2:
          // Step 2: Professional/Company Info
          if (data.professionalRole !== undefined)
            updateData.professionalRole = data.professionalRole;
          if (data.otherProfessionalRole !== undefined)
            updateData.otherProfessionalRole = data.otherProfessionalRole;
          if (data.companySize !== undefined)
            updateData.companySize = data.companySize;
          if (data.industry !== undefined) updateData.industry = data.industry;
          if (data.otherIndustry !== undefined)
            updateData.otherIndustry = data.otherIndustry;
          break;

        case 3:
          // Step 3: Team members - handled separately
          break;

        case 4:
          // Step 4: Discovery
          if (data.discoverySource !== undefined)
            updateData.discoverySource = data.discoverySource;
          if (data.otherDiscoverySource !== undefined)
            updateData.otherDiscoverySource = data.otherDiscoverySource;
          if (data.previousAttempts !== undefined)
            updateData.previousAttempts = data.previousAttempts;
          break;
      }
    } else {
      // If no data provided, just update the step (for navigation)
      updateData.onboardingCurrentStep = step;
    }

    // Update user's onboarding data
    await db.update(users).set(updateData).where(eq(users.id, userId));

    return {
      success: true,
      message: `Step ${step} progress saved`,
      savedFields: Object.keys(updateData),
    };
  }

  /**
   * Complete onboarding for a user
   */
  static async completeOnboarding({
    userId,
    ...data
  }: CompleteOnboardingParams) {
    // Check if already completed
    const [user] = await db
      .select({ onboardingCompleted: users.onboardingCompleted })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new Error('User not found');
    }

    if (user.onboardingCompleted) {
      throw new Error('Onboarding already completed');
    }

    // Update user with all onboarding data
    await db
      .update(users)
      .set({
        // Step 1 fields
        useCases: data.useCases,
        otherUseCase: data.otherUseCase || null,
        // Step 2 fields
        professionalRole: data.professionalRole,
        otherProfessionalRole: data.otherProfessionalRole || null,
        companySize: data.companySize,
        industry: data.industry,
        otherIndustry: data.otherIndustry || null,
        // Step 4 fields
        discoverySource: data.discoverySource,
        otherDiscoverySource: data.otherDiscoverySource || null,
        previousAttempts: data.previousAttempts || null,
        // Completion tracking
        onboardingCurrentStep: 4,
        onboardingCompleted: true,
        onboardingCompletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return {
      success: true,
      message: 'Onboarding completed successfully',
    };
  }

  /**
   * Check if onboarding is completed
   */
  static async isCompleted(userId: string) {
    const [user] = await db
      .select({ onboardingCompleted: users.onboardingCompleted })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return user?.onboardingCompleted || false;
  }

  /**
   * Check if a user has completed onboarding
   * (Alias for isCompleted for backward compatibility)
   */
  static async hasCompletedOnboarding(userId: string): Promise<boolean> {
    try {
      return await this.isCompleted(userId);
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      return false;
    }
  }

  /**
   * Check if a path requires onboarding completion
   */
  static requiresOnboarding(pathname: string): boolean {
    // Check if it's a public path
    if (
      this.ONBOARDING_REDIRECT.publicPaths.some(path =>
        pathname.startsWith(path)
      )
    ) {
      return false;
    }

    // Check if it's the onboarding page itself
    if (pathname === this.ONBOARDING_REDIRECT.onboardingPath) {
      return false;
    }

    // Check if it's a protected path
    return this.ONBOARDING_REDIRECT.protectedPaths.some(path =>
      pathname.startsWith(path)
    );
  }

  /**
   * Redirect paths configuration based on onboarding status
   */
  static readonly ONBOARDING_REDIRECT = {
    // Pages that require onboarding to be completed
    protectedPaths: [
      '/dashboard',
      '/projects',
      '/settings',
      '/team',
      '/billing',
    ],

    // Path to redirect to when onboarding is not complete
    onboardingPath: '/onboarding',

    // Paths that don't require onboarding
    publicPaths: [
      '/login',
      '/signup',
      '/forgot-password',
      '/reset-password',
      '/auth',
      '/api',
    ],
  };
}
