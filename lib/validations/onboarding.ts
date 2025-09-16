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

// Organization name validation
export const organizationNameSchema = z
  .string()
  .min(3, 'Organization name must be at least 3 characters')
  .max(50, 'Organization name must be less than 50 characters')
  .regex(
    /^[a-zA-Z0-9][a-zA-Z0-9\s-]*[a-zA-Z0-9]$/,
    'Must start and end with a letter or number'
  )
  .refine(
    name => {
      // Check for consecutive spaces or hyphens
      return !/(  |--|\s-|-\s)/.test(name);
    },
    {
      message: 'Organization name cannot have consecutive spaces or hyphens',
    }
  )
  .refine(
    name => {
      // Check that it's not just numbers
      return !/^\d+$/.test(name);
    },
    {
      message: 'Organization name cannot be only numbers',
    }
  );

// Step 2: Organization Information
export const step2Schema = z
  .object({
    organizationName: organizationNameSchema,
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
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .toLowerCase()
    .trim()
    .refine(
      email => {
        // Additional validation for common email issues
        const parts = email.split('@');
        if (parts.length !== 2) return false;

        const [localPart, domain] = parts;

        // Check local part
        if (localPart.length === 0 || localPart.length > 64) return false;
        if (localPart.startsWith('.') || localPart.endsWith('.')) return false;
        if (localPart.includes('..')) return false;

        // Check domain
        if (domain.length === 0 || domain.length > 253) return false;
        if (!domain.includes('.')) return false;
        if (domain.startsWith('.') || domain.endsWith('.')) return false;
        if (domain.includes('..')) return false;

        // Check for valid TLD
        const tldParts = domain.split('.');
        const tld = tldParts[tldParts.length - 1];
        if (tld.length < 2) return false;

        return true;
      },
      {
        message: 'Please enter a valid email address with proper domain',
      }
    ),
  role: z.enum(['viewer', 'member', 'admin']),
});

// Step 3: Team Collaboration
export const step3Schema = z.object({
  teamMembers: z.array(teamMemberSchema).default([]),
});

// Step 4: CMS Integration
export const step4Schema = z.object({
  cmsIntegration: z.string().min(1, 'Please select your CMS platform'),
  otherCms: z.string().optional(), // Can be a dropdown selection or custom text
});

// Step 5: Discovery
export const step5Schema = z
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

// Complete onboarding schema (for final submission)
export const onboardingSchema = z.object({
  // Step 1
  useCases: z.array(z.string()).min(1, 'Please select at least one use case'),
  otherUseCase: z.string().optional(),

  // Step 2 (excluding organizationName which is handled separately in step2)
  professionalRole: z.string().min(1, 'Please select your professional role'),
  otherProfessionalRole: z.string().optional(),
  companySize: z.string().min(1, 'Please select your company size'),
  industry: z.string().min(1, 'Please select your industry'),
  otherIndustry: z.string().optional(),

  // Step 3
  teamMembers: z.array(teamMemberSchema).default([]),

  // Step 4
  cmsIntegration: z.string().min(1, 'Please select your CMS platform'),
  otherCms: z.string().optional(),

  // Step 5
  discoverySource: z.string().min(1, 'Please tell us how you heard about us'),
  otherDiscoverySource: z.string().optional(),
  previousAttempts: z.string().optional(),
});

// Progress update schema - for saving step progress
export const progressSchema = z.object({
  step: z.number().min(1).max(5),
  data: z.any().optional(), // Data is optional for step-only updates
  complete: z.boolean().optional(), // Flag to indicate final completion
});

// Extended submission schema - for final onboarding completion
// Currently same as onboardingSchema but kept separate for potential future extensions
export const onboardingSubmissionSchema = onboardingSchema;

export type OnboardingFormData = z.infer<typeof onboardingSchema>;
export type Step1Data = z.infer<typeof step1Schema>;
export type Step2Data = z.infer<typeof step2Schema>;
export type Step3Data = z.infer<typeof step3Schema>;
export type Step4Data = z.infer<typeof step4Schema>;
export type Step5Data = z.infer<typeof step5Schema>;
export type TeamMember = z.infer<typeof teamMemberSchema>;
export type ProgressUpdate = z.infer<typeof progressSchema>;
export type OnboardingSubmission = z.infer<typeof onboardingSubmissionSchema>;

// Default values for form initialization
export const defaultOnboardingValues: OnboardingFormData = {
  useCases: [],
  otherUseCase: '',
  professionalRole: '',
  otherProfessionalRole: '',
  companySize: '',
  industry: '',
  otherIndustry: '',
  teamMembers: [],
  cmsIntegration: '',
  otherCms: '',
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
  5: step5Schema,
} as const;
