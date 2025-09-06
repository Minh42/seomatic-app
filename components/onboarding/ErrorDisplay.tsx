'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';
import type { OnboardingErrorData } from '@/hooks/useOnboardingForm';

interface ErrorDisplayProps {
  error: OnboardingErrorData | null;
  onRetry?: () => void;
  canRetry?: boolean;
}

export function ErrorDisplay({
  error,
  onRetry,
  canRetry = true,
}: ErrorDisplayProps) {
  if (!error) return null;

  const getErrorTitle = () => {
    switch (error.code) {
      case 'DUPLICATE_WORKSPACE':
        return 'Workspace Name Taken';
      case 'UNAUTHORIZED':
        return 'Session Expired';
      case 'SERVER_ERROR':
        return 'Server Error';
      case 'VALIDATION_ERROR':
        return 'Validation Error';
      case 'ALREADY_COMPLETED':
        return 'Onboarding Already Completed';
      case 'WORKSPACE_ERROR':
        return 'Workspace Creation Failed';
      default:
        return 'Something went wrong';
    }
  };

  const showRetryButton =
    canRetry &&
    error.code !== 'ALREADY_COMPLETED' &&
    error.code !== 'DUPLICATE_WORKSPACE' &&
    error.code !== 'VALIDATION_ERROR';

  return (
    <Alert variant="destructive" className="mb-6">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{getErrorTitle()}</AlertTitle>
      <AlertDescription className="mt-2">
        <p>{error.message}</p>
        {showRetryButton && onRetry && (
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={onRetry}
          >
            <RefreshCw className="mr-2 h-3 w-3" />
            Retry
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
