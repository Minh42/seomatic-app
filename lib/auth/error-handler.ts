import { toast } from 'sonner';

export interface AuthError {
  type: 'email' | 'password' | 'general' | 'rate_limit';
  message: string;
}

export class AuthErrorHandler {
  static handleSignInError(error: string): AuthError {
    if (error.includes('Too many login attempts')) {
      return {
        type: 'rate_limit',
        message: 'Too many login attempts. Please wait before trying again.',
      };
    }

    return {
      type: 'general',
      message: 'Invalid email or password. Please try again.',
    };
  }

  static handleSignUpError(error: string, status?: number): AuthError {
    if (status === 429) {
      return {
        type: 'rate_limit',
        message:
          error || 'Too many signup attempts. Please wait before trying again.',
      };
    }

    if (
      error?.includes('email already exists') ||
      error?.includes('User with this email')
    ) {
      return {
        type: 'email',
        message: 'A user with this email already exists',
      };
    }

    return {
      type: 'general',
      message: error || 'Failed to create account. Please try again.',
    };
  }

  static displayError(
    authError: AuthError,
    setEmailError?: (error: string | null) => void,
    setPasswordError?: (error: string | null) => void
  ) {
    // Clear existing errors
    setEmailError?.(null);
    setPasswordError?.(null);

    switch (authError.type) {
      case 'email':
        setEmailError?.(authError.message);
        break;
      case 'password':
        setPasswordError?.(authError.message);
        break;
      case 'rate_limit':
      case 'general':
        toast.error(authError.message);
        break;
    }
  }
}
