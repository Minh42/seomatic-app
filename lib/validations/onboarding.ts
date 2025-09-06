import { z } from 'zod';

// Step 1: Use Cases
export const step1Schema = z
  .object({
    useCases: z.array(z.string()).min(1, 'Please select at least one use case'),
    otherUseCase: z.string().optional(),
  })
  .refine(
    data => {
      // If "other" is selected, otherUseCase must be provided
      if (data.useCases.includes('other') && !data.otherUseCase?.trim()) {
        return false;
      }
      return true;
    },
    {
      message: 'Please describe your use case',
      path: ['otherUseCase'],
    }
  );

// Step 2: Workspace Information
export const step2Schema = z
  .object({
    workspaceName: z
      .string()
      .min(1, 'Workspace name is required')
      .min(2, 'Workspace name must be at least 2 characters')
      .max(50, 'Workspace name must be less than 50 characters'),
    professionalRole: z.string().min(1, 'Please select your professional role'),
    otherProfessionalRole: z.string().optional(),
    companySize: z.string().min(1, 'Please select your company size'),
    industry: z.string().min(1, 'Please select your industry'),
    otherIndustry: z.string().optional(),
  })
  .refine(
    data => {
      if (
        data.professionalRole === 'Other' &&
        !data.otherProfessionalRole?.trim()
      ) {
        return false;
      }
      return true;
    },
    {
      message: 'Please specify your professional role',
      path: ['otherProfessionalRole'],
    }
  )
  .refine(
    data => {
      if (data.industry === 'Other' && !data.otherIndustry?.trim()) {
        return false;
      }
      return true;
    },
    {
      message: 'Please specify your industry',
      path: ['otherIndustry'],
    }
  );

// Team member schema - matches database roles
export const teamMemberSchema = z.object({
  email: z
    .string()
    .email('Please enter a valid email address')
    .min(1, 'Email is required'),
  role: z.enum(['viewer', 'member', 'admin']),
});

// Step 3: Team Collaboration
export const step3Schema = z.object({
  teamMembers: z.array(teamMemberSchema).default([]),
});

// Step 4: Discovery
export const step4Schema = z
  .object({
    discoverySource: z.string().min(1, 'Please tell us how you heard about us'),
    otherDiscoverySource: z.string().optional(),
    previousAttempts: z.string().optional(),
  })
  .refine(
    data => {
      if (
        data.discoverySource === 'Other' &&
        !data.otherDiscoverySource?.trim()
      ) {
        return false;
      }
      return true;
    },
    {
      message: 'Please specify how you heard about us',
      path: ['otherDiscoverySource'],
    }
  );

// Complete onboarding schema (includes workspaceName for workspace creation)
export const onboardingSchema = z.object({
  // Step 1
  useCases: z.array(z.string()).min(1, 'Please select at least one use case'),
  otherUseCase: z.string().optional(),

  // Step 2
  workspaceName: z.string().min(1, 'Workspace name is required'), // For workspace creation, not stored in user
  professionalRole: z.string().min(1, 'Please select your professional role'),
  otherProfessionalRole: z.string().optional(),
  companySize: z.string().min(1, 'Please select your company size'),
  industry: z.string().min(1, 'Please select your industry'),
  otherIndustry: z.string().optional(),

  // Step 3
  teamMembers: z.array(teamMemberSchema).default([]),

  // Step 4
  discoverySource: z.string().min(1, 'Please tell us how you heard about us'),
  otherDiscoverySource: z.string().optional(),
  previousAttempts: z.string().optional(),
});

export type OnboardingFormData = z.infer<typeof onboardingSchema>;
export type Step1Data = z.infer<typeof step1Schema>;
export type Step2Data = z.infer<typeof step2Schema>;
export type Step3Data = z.infer<typeof step3Schema>;
export type Step4Data = z.infer<typeof step4Schema>;
export type TeamMember = z.infer<typeof teamMemberSchema>;

// Default values for form initialization
export const defaultOnboardingValues: OnboardingFormData = {
  useCases: [],
  otherUseCase: '',
  workspaceName: '',
  professionalRole: '',
  otherProfessionalRole: '',
  companySize: '',
  industry: '',
  otherIndustry: '',
  teamMembers: [],
  discoverySource: '',
  otherDiscoverySource: '',
  previousAttempts: '',
};

// Validation by step
export const stepSchemas = {
  1: step1Schema,
  2: step2Schema,
  3: step3Schema,
  4: step4Schema,
} as const;
