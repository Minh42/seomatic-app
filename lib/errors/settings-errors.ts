import { toast } from 'sonner';

export interface SettingsError {
  type: 'validation' | 'password' | 'profile' | 'general' | 'rate_limit';
  message: string;
  field?: string;
}

export class SettingsErrorHandler {
  static handleProfileUpdateError(
    error: string,
    status?: number
  ): SettingsError {
    if (status === 429) {
      return {
        type: 'rate_limit',
        message: 'Too many update attempts. Please wait before trying again.',
      };
    }

    if (error?.includes('Invalid input') || error?.includes('Validation')) {
      return {
        type: 'validation',
        message: 'Please check your input and try again.',
      };
    }

    if (error?.includes('Name is required')) {
      return {
        type: 'validation',
        message: 'Name cannot be empty',
        field: 'name',
      };
    }

    if (error?.includes('Image size') || error?.includes('Invalid image')) {
      return {
        type: 'profile',
        message: error || 'Invalid image. Please upload a valid image file.',
      };
    }

    return {
      type: 'general',
      message: error || 'Failed to update profile. Please try again.',
    };
  }

  static handlePasswordUpdateError(
    error: string,
    status?: number
  ): SettingsError {
    if (status === 429) {
      return {
        type: 'rate_limit',
        message:
          'Too many password update attempts. Please wait before trying again.',
      };
    }

    if (error?.includes('Current password is required')) {
      return {
        type: 'password',
        message: 'Current password is required',
        field: 'currentPassword',
      };
    }

    if (error?.includes('Current password is incorrect')) {
      return {
        type: 'password',
        message: 'Current password is incorrect',
        field: 'currentPassword',
      };
    }

    if (error?.includes('Password must be at least')) {
      return {
        type: 'validation',
        message: error,
        field: 'newPassword',
      };
    }

    if (error?.includes('do not match')) {
      return {
        type: 'validation',
        message: 'New passwords do not match',
        field: 'confirmPassword',
      };
    }

    return {
      type: 'general',
      message: error || 'Failed to update password. Please try again.',
    };
  }

  static displayError(
    settingsError: SettingsError,
    options?: {
      setFieldError?: (field: string, error: string | null) => void;
    }
  ) {
    switch (settingsError.type) {
      case 'validation':
      case 'password':
        if (settingsError.field && options?.setFieldError) {
          options.setFieldError(settingsError.field, settingsError.message);
        } else {
          toast.error(settingsError.message);
        }
        break;
      case 'profile':
      case 'rate_limit':
      case 'general':
        toast.error(settingsError.message);
        break;
    }
  }
}
