import { isDisposable } from 'disposable-email-domains-js';

/**
 * Check if an email domain is disposable/temporary
 */
export function isDisposableEmail(email: string): boolean {
  try {
    const domain = email.split('@')[1];
    if (!domain) return false;

    return isDisposable(domain.toLowerCase());
  } catch {
    return false;
  }
}

/**
 * Common domain typos and their corrections
 */
const DOMAIN_TYPOS: Record<string, string> = {
  // Gmail typos
  'gmial.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmil.com': 'gmail.com',
  'gmal.com': 'gmail.com',
  'gmeil.com': 'gmail.com',

  // Yahoo typos
  'yahooo.com': 'yahoo.com',
  'yaho.com': 'yahoo.com',
  'yhoo.com': 'yahoo.com',
  'yhaoo.com': 'yahoo.com',

  // Hotmail typos
  'hotmial.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'hotmal.com': 'hotmail.com',
  'hotmil.com': 'hotmail.com',

  // Outlook typos
  'outlok.com': 'outlook.com',
  'outloo.com': 'outlook.com',
  'outlok.com': 'outlook.com',
  'outloook.com': 'outlook.com',
};

/**
 * Check for common email domain typos
 */
export function checkDomainTypo(email: string): {
  hasTypo: boolean;
  suggestion?: string;
} {
  try {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return { hasTypo: false };

    if (DOMAIN_TYPOS[domain]) {
      return {
        hasTypo: true,
        suggestion: DOMAIN_TYPOS[domain],
      };
    }

    return { hasTypo: false };
  } catch {
    return { hasTypo: false };
  }
}

/**
 * Comprehensive email validation
 */
export interface EmailValidationResult {
  isValid: boolean;
  error?: string;
  suggestion?: string;
}

export function validateWorkEmail(email: string): EmailValidationResult {
  if (!email || !email.includes('@')) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Check for disposable email
  if (isDisposableEmail(normalizedEmail)) {
    return {
      isValid: false,
      error: 'Please use a permanent work email address, not a temporary one',
    };
  }

  // Check for domain typos
  const typoCheck = checkDomainTypo(normalizedEmail);
  if (typoCheck.hasTypo) {
    return {
      isValid: false,
      error: `Invalid domain. Did you mean @${typoCheck.suggestion}?`,
      suggestion: typoCheck.suggestion,
    };
  }

  return { isValid: true };
}
