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

export class WorkspaceError extends OnboardingError {
  constructor(message: string, field: string = 'workspaceName') {
    super(message, field, 'WORKSPACE_ERROR');
    this.name = 'WorkspaceError';
  }
}

export class DuplicateWorkspaceError extends WorkspaceError {
  constructor(workspaceName: string) {
    super(
      `A workspace with the name "${workspaceName}" already exists. Please choose a different name.`,
      'workspaceName'
    );
    this.code = 'DUPLICATE_WORKSPACE';
    this.name = 'DuplicateWorkspaceError';
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
