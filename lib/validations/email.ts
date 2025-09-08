import { isDisposable } from 'disposable-email-domains-js';

export function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;

  return isDisposable(domain);
}

export function validateEmailDomain(email: string): {
  isValid: boolean;
  message?: string;
} {
  if (isDisposableEmail(email)) {
    return {
      isValid: false,
      message:
        'Disposable email addresses are not allowed. Please use a permanent email address.',
    };
  }

  return { isValid: true };
}
