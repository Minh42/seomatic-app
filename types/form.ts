// Type for the form prop passed to step components
export type OnboardingForm = any; // TanStack Form API - complex type signature

// Type for form field
export interface FormFieldState<T = any> {
  state: {
    value: T;
    meta: {
      errors: string[];
      isValidating: boolean;
      isTouched: boolean;
      isDirty: boolean;
    };
  };
  handleChange: (value: T) => void;
  handleBlur: () => void;
}

// Props for step components
export interface StepComponentProps {
  form: OnboardingForm;
  isSubmitting?: boolean;
  error?: {
    message: string;
    code?: string;
    field?: string;
  } | null;
  onRetryWorkspace?: (newName: string) => Promise<void>;
  onCancelWorkspaceRecovery?: () => void;
}
