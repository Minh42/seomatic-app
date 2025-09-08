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

// Workspace name validation
export const workspaceNameSchema = z
  .string()
  .min(1, 'Workspace name is required')
  .min(2, 'Workspace name must be at least 2 characters')
  .max(50, 'Workspace name must be less than 50 characters')
  .regex(
    /^[a-zA-Z0-9][a-zA-Z0-9\s-]*[a-zA-Z0-9]$/,
    'Workspace name must start and end with a letter or number, and can only contain letters, numbers, spaces, and hyphens'
  )
  .refine(
    name => {
      // Check for consecutive spaces or hyphens
      return !/(  |--|\s-|-\s)/.test(name);
    },
    {
      message: 'Workspace name cannot have consecutive spaces or hyphens',
    }
  )
  .refine(
    name => {
      // Check that it's not just numbers
      return !/^\d+$/.test(name);
    },
    {
      message: 'Workspace name cannot be only numbers',
    }
  );

// Step 2: Workspace Information
export const step2Schema = z
  .object({
    workspaceName: workspaceNameSchema,
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

// Step 3: CMS Integration
export const step3Schema = z
  .object({
    cmsIntegration: z.string().min(1, 'Please select your CMS platform'),
    otherCms: z.string().optional(),
  })
  .refine(
    data => {
      if (data.cmsIntegration === 'Other' && !data.otherCms?.trim()) {
        return false;
      }
      return true;
    },
    {
      message: 'Please provide details about your platform',
      path: ['otherCms'],
    }
  );

// Step 4: Team Collaboration (was Step 3)
export const step4Schema = z.object({
  teamMembers: z.array(teamMemberSchema).default([]),
});

// Step 5: Discovery (was Step 4)
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

// Complete onboarding schema (includes workspaceName for workspace creation)
export const onboardingSchema = z.object({
  // Step 1
  useCases: z.array(z.string()).min(1, 'Please select at least one use case'),
  otherUseCase: z.string().optional(),

  // Step 2
  workspaceName: workspaceNameSchema, // For workspace creation, not stored in user
  professionalRole: z.string().min(1, 'Please select your professional role'),
  otherProfessionalRole: z.string().optional(),
  companySize: z.string().min(1, 'Please select your company size'),
  industry: z.string().min(1, 'Please select your industry'),
  otherIndustry: z.string().optional(),

  // Step 3
  cmsIntegration: z.string().min(1, 'Please select your CMS platform'),
  otherCms: z.string().optional(),

  // Step 4
  teamMembers: z.array(teamMemberSchema).default([]),

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
export const onboardingSubmissionSchema = onboardingSchema.extend({
  workspaceId: z.string().optional(),
});

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
  workspaceName: '',
  professionalRole: '',
  otherProfessionalRole: '',
  companySize: '',
  industry: '',
  otherIndustry: '',
  cmsIntegration: '',
  otherCms: '',
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
  5: step5Schema,
} as const;
