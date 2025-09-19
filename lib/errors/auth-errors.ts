import { toast } from 'sonner';

export interface AuthError {
  type: 'email' | 'password' | 'general' | 'rate_limit' | 'validation';
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

  static handlePasswordResetError(error: string, status?: number): AuthError {
    if (status === 429) {
      return {
        type: 'rate_limit',
        message:
          'Too many password reset attempts. Please wait before trying again.',
      };
    }

    if (error?.includes('Invalid or expired token')) {
      return {
        type: 'validation',
        message:
          'This password reset link is invalid or has expired. Please request a new one.',
      };
    }

    if (error?.includes('User not found')) {
      return {
        type: 'email',
        message: 'No account found with this email address.',
      };
    }

    return {
      type: 'general',
      message: error || 'Failed to reset password. Please try again.',
    };
  }

  static handleForgotPasswordError(error: string, status?: number): AuthError {
    if (status === 429) {
      return {
        type: 'rate_limit',
        message:
          'Too many password reset requests. Please wait before trying again.',
      };
    }

    // Don't reveal if email exists or not for security
    return {
      type: 'general',
      message:
        'If an account exists with this email, you will receive a password reset link.',
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
      case 'validation':
        toast.error(authError.message);
        break;
    }
  }

  static getErrorMessage(error: string): string {
    // Handle NextAuth OAuth error codes
    const errorMap: Record<string, string> = {
      // OAuth provider errors
      OAuthSignin:
        'There was an error signing in with this provider. Please try again.',
      OAuthCallback:
        'There was an error during authentication. Please try again.',
      OAuthCreateAccount:
        'Could not create an account with this provider. Please try a different method.',
      EmailCreateAccount:
        'Could not create an account with this email. Please try a different method.',
      Callback:
        'There was an error during the authentication callback. Please try again.',

      // OAuth account linking errors
      OAuthAccountNotLinked:
        'This email is already associated with another account. Please sign in with your original method.',
      EmailSignin: 'There was an error sending the email. Please try again.',

      // Credential errors
      CredentialsSignin: 'Invalid email or password. Please try again.',

      // Session errors
      SessionRequired: 'Please sign in to access this page.',

      // General errors
      Default: 'An unexpected error occurred. Please try again.',
      Configuration: 'There is a configuration issue. Please contact support.',
      AccessDenied: 'Access denied. You do not have permission to sign in.',
      Verification:
        'The verification link has expired or has already been used.',

      // Custom errors
      no_payment_info:
        "We couldn't find your payment information. Please check your email for the signup link.",
      already_used:
        'This signup link has already been used. Please log in to your account.',
      invalid:
        'This signup link is invalid or has expired. Please check your email for the correct link.',
      no_subscription:
        'You need an active subscription to access this page. Please complete your purchase first.',
    };

    // Check if error matches a known error code
    const message = errorMap[error];
    if (message) {
      return message;
    }

    // Check if error contains a known error pattern
    for (const [key, value] of Object.entries(errorMap)) {
      if (error.toLowerCase().includes(key.toLowerCase())) {
        return value;
      }
    }

    // Default fallback message
    return 'An error occurred during authentication. Please try again.';
  }
}
