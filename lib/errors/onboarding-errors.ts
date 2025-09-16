/**
 * Onboarding-related error classes
 */

export class OnboardingError extends Error {
  field?: string;
  code?: string;

  constructor(message: string, field?: string, code?: string) {
    super(message);
    this.name = 'OnboardingError';
    this.field = field;
    this.code = code;
  }
}

export class OrganizationError extends OnboardingError {
  constructor(message: string, field: string = 'organizationName') {
    super(message, field, 'ORGANIZATION_ERROR');
    this.name = 'OrganizationError';
  }
}

export class DuplicateOrganizationError extends OrganizationError {
  constructor(organizationName: string) {
    super(
      `An organization with the name "${organizationName}" already exists. Please choose a different name.`,
      'organizationName'
    );
    this.code = 'DUPLICATE_ORGANIZATION';
    this.name = 'DuplicateOrganizationError';
  }
}

export class SessionError extends OnboardingError {
  constructor() {
    super('Session expired. Please sign in again.', undefined, 'UNAUTHORIZED');
    this.name = 'SessionError';
  }
}

export class AlreadyCompletedError extends OnboardingError {
  constructor() {
    super('Onboarding already completed', undefined, 'ALREADY_COMPLETED');
    this.name = 'AlreadyCompletedError';
  }
}

export class ValidationError extends OnboardingError {
  constructor(message: string = 'Invalid form data', field?: string) {
    super(message, field, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class ServerError extends OnboardingError {
  constructor(message: string = 'Server error. Please try again later.') {
    super(message, undefined, 'SERVER_ERROR');
    this.name = 'ServerError';
  }
}
