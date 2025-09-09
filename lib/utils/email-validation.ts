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
 * Consolidated from email-validation.ts and email-suggestions.ts
 */
const DOMAIN_TYPOS: Record<string, string> = {
  // Gmail typos
  'gmial.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmil.com': 'gmail.com',
  'gmal.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gmali.com': 'gmail.com',
  'gmial.co': 'gmail.com',
  'gmeil.com': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmail.cm': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gmail.vom': 'gmail.com',

  // Outlook/Hotmail typos
  'outlok.com': 'outlook.com',
  'outook.com': 'outlook.com',
  'outlok.co': 'outlook.com',
  'outlook.co': 'outlook.com',
  'outlook.cm': 'outlook.com',
  'outloo.com': 'outlook.com',
  'outloook.com': 'outlook.com',
  'hotmial.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'hotmil.com': 'hotmail.com',
  'hotmal.com': 'hotmail.com',

  // Yahoo typos
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'yahoo.co': 'yahoo.com',
  'yhoo.com': 'yahoo.com',
  'yaho.co': 'yahoo.com',
  'yhaoo.com': 'yahoo.com',

  // iCloud typos
  'iclould.com': 'icloud.com',
  'icloude.com': 'icloud.com',
  'icloud.co': 'icloud.com',

  // Other common domains
  'aol.co': 'aol.com',
  'protonmail.co': 'protonmail.com',
  'mail.co': 'mail.com',
};

/**
 * Common email providers for validation
 */
const COMMON_PROVIDERS = new Set([
  'gmail.com',
  'yahoo.com',
  'outlook.com',
  'hotmail.com',
  'icloud.com',
  'aol.com',
  'mail.com',
  'protonmail.com',
  'yandex.com',
  'zoho.com',
  'fastmail.com',
  'tutanota.com',
  'live.com',
  'msn.com',
  'me.com',
  'mac.com',
]);

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

/**
 * Check if an email might have a typo and suggest correction
 * Migrated from email-suggestions.ts
 */
export function getEmailSuggestion(email: string): string | null {
  if (!email || !email.includes('@')) {
    return null;
  }

  const [localPart, domain] = email.split('@');

  if (!domain) {
    return null;
  }

  // Check for exact typo match
  const correction = DOMAIN_TYPOS[domain.toLowerCase()];
  if (correction) {
    return `${localPart}@${correction}`;
  }

  // Check for close matches using Levenshtein distance
  const lowerDomain = domain.toLowerCase();
  for (const commonDomain of COMMON_PROVIDERS) {
    const distance = levenshteinDistance(lowerDomain, commonDomain);

    // If very close match (1-2 character difference)
    if (distance > 0 && distance <= 2 && lowerDomain.length >= 5) {
      // Additional check: first few characters should match
      if (lowerDomain.substring(0, 3) === commonDomain.substring(0, 3)) {
        return `${localPart}@${commonDomain}`;
      }
    }
  }

  return null;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  // Initialize first column
  for (let i = 0; i <= str1.length; i++) {
    matrix[i] = [i];
  }

  // Initialize first row
  for (let j = 0; j <= str2.length; j++) {
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= str1.length; i++) {
    for (let j = 1; j <= str2.length; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[str1.length][str2.length];
}

/**
 * Validate if email looks legitimate
 */
export function isLikelyValidEmail(email: string): boolean {
  if (!email || !email.includes('@')) {
    return false;
  }

  const [localPart, domain] = email.split('@');

  // Basic checks
  if (!localPart || !domain || localPart.length < 1 || domain.length < 4) {
    return false;
  }

  // Check for common patterns that indicate typos
  if (domain.includes('..') || domain.startsWith('.') || domain.endsWith('.')) {
    return false;
  }

  // Check if domain has at least one dot
  if (!domain.includes('.')) {
    return false;
  }

  // Check TLD length (should be 2-6 characters typically)
  const tld = domain.split('.').pop();
  if (!tld || tld.length < 2 || tld.length > 6) {
    return false;
  }

  return true;
}
