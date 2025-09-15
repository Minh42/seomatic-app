import { toast } from 'sonner';

export interface TeamError {
  type: 'invitation' | 'permission' | 'validation' | 'general' | 'rate_limit';
  message: string;
  field?: string;
}

export class TeamErrorHandler {
  static handleInvitationError(error: string, status?: number): TeamError {
    if (status === 429) {
      return {
        type: 'rate_limit',
        message: 'Too many invitations. Please wait before trying again.',
      };
    }

    if (error?.includes('already a team member')) {
      return {
        type: 'invitation',
        message: 'This user is already a team member',
        field: 'email',
      };
    }

    if (error?.includes('already invited')) {
      return {
        type: 'invitation',
        message: 'An invitation has already been sent to this email',
        field: 'email',
      };
    }

    if (error?.includes('invalid email')) {
      return {
        type: 'validation',
        message: 'Please enter a valid email address',
        field: 'email',
      };
    }

    if (error?.includes('limit reached')) {
      return {
        type: 'invitation',
        message: 'Team member limit reached. Please upgrade your plan.',
      };
    }

    return {
      type: 'general',
      message: error || 'Failed to send invitation. Please try again.',
    };
  }

  static handleMemberUpdateError(error: string, status?: number): TeamError {
    if (status === 403) {
      return {
        type: 'permission',
        message: 'You do not have permission to perform this action',
      };
    }

    if (status === 429) {
      return {
        type: 'rate_limit',
        message: 'Too many requests. Please wait before trying again.',
      };
    }

    if (error?.includes('not found')) {
      return {
        type: 'general',
        message: 'Team member not found',
      };
    }

    if (error?.includes('cannot remove owner')) {
      return {
        type: 'permission',
        message: 'Cannot remove the workspace owner',
      };
    }

    if (error?.includes('cannot change own role')) {
      return {
        type: 'permission',
        message: 'You cannot change your own role',
      };
    }

    return {
      type: 'general',
      message: error || 'Failed to update team member. Please try again.',
    };
  }

  static handleFetchError(error: string, status?: number): TeamError {
    if (status === 401) {
      return {
        type: 'permission',
        message: 'Please log in to view team members',
      };
    }

    if (status === 403) {
      return {
        type: 'permission',
        message: 'You do not have permission to view team members',
      };
    }

    return {
      type: 'general',
      message: error || 'Failed to load team members. Please try again.',
    };
  }

  static displayError(teamError: TeamError) {
    switch (teamError.type) {
      case 'permission':
        toast.error(teamError.message);
        break;
      case 'invitation':
      case 'validation':
        toast.error(teamError.message);
        break;
      case 'rate_limit':
        toast.error(teamError.message);
        break;
      case 'general':
        toast.error(teamError.message);
        break;
    }
  }
}
