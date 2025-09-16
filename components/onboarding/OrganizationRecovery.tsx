'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, RefreshCw, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface OrganizationRecoveryProps {
  error: {
    message: string;
    code?: string;
    field?: string;
  };
  originalName: string;
  onRetry: (newName: string) => Promise<void>;
  onCancel: () => void;
}

export function OrganizationRecovery({
  error,
  originalName,
  onRetry,
  onCancel,
}: OrganizationRecoveryProps) {
  const [organizationName, setOrganizationName] = useState(originalName);
  const [isRetrying, setIsRetrying] = useState(false);
  const [suggestions] = useState(() => {
    // Generate name suggestions
    const timestamp = Date.now().toString().slice(-4);
    return [
      `${originalName} ${timestamp}`,
      `${originalName} (${new Date().getFullYear()})`,
      `My ${originalName}`,
      `${originalName} Team`,
    ].filter(name => name.length <= 50);
  });

  const handleRetry = async () => {
    if (!organizationName.trim()) {
      toast.error('Please enter an organization name');
      return;
    }

    setIsRetrying(true);
    try {
      await onRetry(organizationName);
    } catch {
      // Error handling is done in parent component
    } finally {
      setIsRetrying(false);
    }
  };

  const isDuplicateError = error.code === 'DUPLICATE_ORGANIZATION';

  return (
    <div className="space-y-4">
      <Alert variant={isDuplicateError ? 'default' : 'destructive'}>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>
          {isDuplicateError
            ? 'Organization Name Taken'
            : 'Organization Creation Failed'}
        </AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>

      <div className="space-y-4">
        <div>
          <Label htmlFor="organization-name">Organization Name</Label>
          <Input
            id="organization-name"
            value={organizationName}
            onChange={e => setOrganizationName(e.target.value)}
            placeholder="Enter a unique organization name"
            className="mt-1"
            maxLength={50}
            disabled={isRetrying}
          />
          {organizationName.length > 40 && (
            <p className="text-xs text-yellow-600 mt-1">
              {50 - organizationName.length} characters remaining
            </p>
          )}
        </div>

        {isDuplicateError && suggestions.length > 0 && (
          <div>
            <p className="text-sm text-gray-600 mb-2">Suggestions:</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => setOrganizationName(suggestion)}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  disabled={isRetrying}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            onClick={handleRetry}
            disabled={isRetrying || !organizationName.trim()}
            className="flex-1"
          >
            {isRetrying ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Create Organization
              </>
            )}
          </Button>

          <Button variant="outline" onClick={onCancel} disabled={isRetrying}>
            Cancel
          </Button>
        </div>
      </div>

      {!isDuplicateError && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            If the problem persists, please contact support for assistance. Your
            progress has been saved.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
