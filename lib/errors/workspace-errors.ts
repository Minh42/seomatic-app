import { toast } from 'sonner';

export type WorkspaceErrorType =
  | 'workspace_not_found'
  | 'workspace_exists'
  | 'workspace_limit_reached'
  | 'workspace_creation_failed'
  | 'workspace_update_failed'
  | 'workspace_delete_failed'
  | 'permission_denied'
  | 'invalid_workspace_name'
  | 'connection_failed'
  | 'validation_error'
  | 'general';

export interface WorkspaceError {
  type: WorkspaceErrorType;
  message: string;
  code?: string;
  statusCode?: number;
  field?: string;
  originalError?: unknown;
}

export class WorkspaceErrorHandler {
  /**
   * Map workspace error codes to user-friendly messages
   */
  private static errorMessages: Record<string, string> = {
    // Workspace errors
    workspace_not_found: 'Workspace not found.',
    workspace_exists: 'A workspace with this name already exists.',
    workspace_limit_reached:
      'You have reached the maximum number of workspaces allowed.',
    workspace_creation_failed: 'Failed to create workspace. Please try again.',
    workspace_update_failed: 'Failed to update workspace. Please try again.',
    workspace_delete_failed: 'Failed to delete workspace. Please try again.',
    workspace_has_active_connection:
      'Cannot delete workspace with active connections.',

    // Permission errors
    permission_denied: 'You do not have permission to perform this action.',
    owner_only: 'Only workspace owners can perform this action.',
    admin_required: 'Admin privileges required for this action.',
    viewer_restricted: 'Viewers cannot modify workspaces.',

    // Validation errors
    invalid_workspace_name:
      'Workspace name is invalid. Please use only letters, numbers, spaces, and hyphens.',
    workspace_name_required: 'Workspace name is required.',
    workspace_name_too_long: 'Workspace name must be less than 50 characters.',
    workspace_name_too_short: 'Workspace name must be at least 3 characters.',

    // Connection errors
    connection_failed: 'Failed to connect to the workspace.',
    connection_url_exists:
      'This domain is already connected to another workspace.',
    invalid_connection_url:
      'Invalid connection URL. Please check and try again.',

    // General errors
    network_error: 'Network error. Please check your connection and try again.',
    server_error: 'Server error. Please try again later.',
  };

  /**
   * Parse workspace error and return standardized error object
   */
  static parseWorkspaceError(error: unknown): WorkspaceError {
    // Type guard for error with message property
    const errorWithMessage = error as {
      message?: string;
      code?: string;
      statusCode?: number;
    };

    // Handle specific error messages
    if (errorWithMessage?.message) {
      if (errorWithMessage.message.includes('already exists')) {
        return {
          type: 'workspace_exists',
          message: this.errorMessages['workspace_exists'],
          code: 'workspace_exists',
          statusCode: 409,
          originalError: error,
        };
      }

      if (errorWithMessage.message.includes('not found')) {
        return {
          type: 'workspace_not_found',
          message: this.errorMessages['workspace_not_found'],
          code: 'workspace_not_found',
          statusCode: 404,
          originalError: error,
        };
      }

      if (
        errorWithMessage.message.includes('permission') ||
        errorWithMessage.message.includes('unauthorized')
      ) {
        return {
          type: 'permission_denied',
          message: this.errorMessages['permission_denied'],
          code: 'permission_denied',
          statusCode: 403,
          originalError: error,
        };
      }
    }

    // Handle error codes
    if (errorWithMessage?.code && this.errorMessages[errorWithMessage.code]) {
      return {
        type: this.getErrorTypeFromCode(errorWithMessage.code),
        message: this.errorMessages[errorWithMessage.code],
        code: errorWithMessage.code,
        statusCode: errorWithMessage.statusCode || 400,
        originalError: error,
      };
    }

    // Default error
    return {
      type: 'general',
      message: errorWithMessage?.message || 'An unexpected error occurred',
      code: errorWithMessage?.code,
      statusCode: errorWithMessage?.statusCode || 500,
      originalError: error,
    };
  }

  /**
   * Get error type from error code
   */
  private static getErrorTypeFromCode(code: string): WorkspaceErrorType {
    if (code.includes('workspace')) {
      if (code.includes('not_found')) return 'workspace_not_found';
      if (code.includes('exists')) return 'workspace_exists';
      if (code.includes('limit')) return 'workspace_limit_reached';
      return 'workspace_creation_failed';
    }
    if (code.includes('permission') || code.includes('denied'))
      return 'permission_denied';
    if (code.includes('validation') || code.includes('invalid'))
      return 'validation_error';
    if (code.includes('connection')) return 'connection_failed';
    return 'general';
  }

  /**
   * Handle workspace CRUD errors
   */
  static handleWorkspaceError(
    error: unknown,
    action: 'create' | 'update' | 'delete' | 'fetch' = 'fetch'
  ): WorkspaceError {
    const workspaceError = this.parseWorkspaceError(error);

    // Customize message based on action
    switch (action) {
      case 'create':
        workspaceError.message =
          workspaceError.message ||
          this.errorMessages['workspace_creation_failed'];
        break;
      case 'update':
        workspaceError.message =
          workspaceError.message ||
          this.errorMessages['workspace_update_failed'];
        break;
      case 'delete':
        workspaceError.message =
          workspaceError.message ||
          this.errorMessages['workspace_delete_failed'];
        break;
      default:
        workspaceError.message =
          workspaceError.message || 'Failed to fetch workspaces.';
    }

    return workspaceError;
  }

  /**
   * Handle connection errors
   */
  static handleConnectionError(error: unknown): WorkspaceError {
    const workspaceError = this.parseWorkspaceError(error);
    const errorWithMessage = error as { message?: string };

    if (errorWithMessage?.message?.includes('already connected')) {
      workspaceError.message = this.errorMessages['connection_url_exists'];
      workspaceError.type = 'connection_failed';
    } else {
      workspaceError.message =
        workspaceError.message || this.errorMessages['connection_failed'];
    }

    return workspaceError;
  }

  /**
   * Validate workspace name
   */
  static validateWorkspaceName(name: string): WorkspaceError | null {
    if (!name || name.trim().length === 0) {
      return {
        type: 'validation_error',
        message: this.errorMessages['workspace_name_required'],
        code: 'workspace_name_required',
        statusCode: 400,
        field: 'name',
      };
    }

    if (name.length < 3) {
      return {
        type: 'validation_error',
        message: this.errorMessages['workspace_name_too_short'],
        code: 'workspace_name_too_short',
        statusCode: 400,
        field: 'name',
      };
    }

    if (name.length > 50) {
      return {
        type: 'validation_error',
        message: this.errorMessages['workspace_name_too_long'],
        code: 'workspace_name_too_long',
        statusCode: 400,
        field: 'name',
      };
    }

    // Allow letters, numbers, spaces, hyphens, and common business characters
    const validNameRegex = /^[a-zA-Z0-9\s\-_&.']+$/;
    if (!validNameRegex.test(name)) {
      return {
        type: 'validation_error',
        message: this.errorMessages['invalid_workspace_name'],
        code: 'invalid_workspace_name',
        statusCode: 400,
        field: 'name',
      };
    }

    return null;
  }

  /**
   * Display error to user (for client-side usage)
   */
  static displayError(error: WorkspaceError) {
    toast.error(error.message);
  }

  /**
   * Log error for debugging (server-side)
   */
  static logError(context: string, error: WorkspaceError) {
    console.error(`[Workspace Error - ${context}]`, {
      type: error.type,
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      field: error.field,
      originalError: error.originalError,
    });
  }

  /**
   * Format error for API response
   */
  static formatApiResponse(error: WorkspaceError) {
    return {
      error: error.message,
      code: error.code,
      type: error.type,
      field: error.field,
    };
  }

  /**
   * Get HTTP status code from error
   */
  static getStatusCode(error: WorkspaceError): number {
    return error.statusCode || 500;
  }
}
