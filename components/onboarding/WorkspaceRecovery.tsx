'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, RefreshCw, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface WorkspaceRecoveryProps {
  error: {
    message: string;
    code?: string;
    field?: string;
  };
  originalName: string;
  onRetry: (newName: string) => Promise<void>;
  onCancel: () => void;
}

export function WorkspaceRecovery({
  error,
  originalName,
  onRetry,
  onCancel,
}: WorkspaceRecoveryProps) {
  const [workspaceName, setWorkspaceName] = useState(originalName);
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
    if (!workspaceName.trim()) {
      toast.error('Please enter a workspace name');
      return;
    }

    setIsRetrying(true);
    try {
      await onRetry(workspaceName);
    } catch {
      // Error handling is done in parent component
    } finally {
      setIsRetrying(false);
    }
  };

  const isDuplicateError = error.code === 'DUPLICATE_WORKSPACE';

  return (
    <div className="space-y-4">
      <Alert variant={isDuplicateError ? 'default' : 'destructive'}>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>
          {isDuplicateError
            ? 'Workspace Name Taken'
            : 'Workspace Creation Failed'}
        </AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>

      <div className="space-y-4">
        <div>
          <Label htmlFor="workspace-name">Workspace Name</Label>
          <Input
            id="workspace-name"
            value={workspaceName}
            onChange={e => setWorkspaceName(e.target.value)}
            placeholder="Enter a unique workspace name"
            className="mt-1"
            maxLength={50}
            disabled={isRetrying}
          />
          {workspaceName.length > 40 && (
            <p className="text-xs text-yellow-600 mt-1">
              {50 - workspaceName.length} characters remaining
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
                  onClick={() => setWorkspaceName(suggestion)}
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
            disabled={isRetrying || !workspaceName.trim()}
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
                Create Workspace
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
