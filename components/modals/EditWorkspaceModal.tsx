'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { WorkspaceErrorHandler } from '@/lib/errors/workspace-errors';

interface EditWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (name: string) => void;
  isLoading?: boolean;
  currentName: string;
  serverError?: string | null;
  workspaceId: string;
}

export function EditWorkspaceModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  currentName,
  serverError,
  workspaceId,
}: EditWorkspaceModalProps) {
  const [name, setName] = useState(currentName);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [availabilityStatus, setAvailabilityStatus] = useState<{
    available?: boolean;
    message?: string;
  }>({});
  const [hasBlurred, setHasBlurred] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(currentName);
      setValidationError(null);
      setAvailabilityStatus({});
      setHasBlurred(false);
    }
  }, [isOpen, currentName]);

  // Check for duplicate names when name changes
  useEffect(() => {
    // Skip if name hasn't changed from original
    if (name === currentName) {
      setAvailabilityStatus({});
      return;
    }

    // Reset if empty
    if (!name) {
      setAvailabilityStatus({});
      return;
    }

    // Only check duplicates if name is valid (let onBlur handle validation errors)
    const validationError = WorkspaceErrorHandler.validateWorkspaceName(name);
    if (validationError) {
      setAvailabilityStatus({});
      return;
    }

    // Set up debounce timer for API call
    const timer = setTimeout(async () => {
      setIsCheckingAvailability(true);
      setAvailabilityStatus({});

      try {
        const response = await fetch('/api/workspace/check-name', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name,
            currentWorkspaceId: workspaceId,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          setAvailabilityStatus({
            available: data.available,
            message: data.available ? null : 'This name is already taken',
          });
        }
      } catch (error) {
        console.error('Error checking workspace name:', error);
      } finally {
        setIsCheckingAvailability(false);
      }
    }, 500); // 500ms debounce for API calls

    return () => clearTimeout(timer);
  }, [name, currentName, workspaceId]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Check if name has changed
    if (name.trim() === currentName.trim()) {
      return;
    }

    // Don't submit if checking or has errors
    if (
      isCheckingAvailability ||
      validationError ||
      availabilityStatus.available === false
    ) {
      return;
    }

    onConfirm(name.trim());
  };

  const handleClose = () => {
    onClose();
  };

  const hasChanged = name.trim() !== currentName.trim();

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-50" onClick={handleClose} />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div
          className="bg-white rounded-xl shadow-xl w-full max-w-md relative"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 pb-4">
            <h2 className="text-xl font-bold leading-8 text-zinc-900">
              Edit Workspace
            </h2>
            <button
              onClick={handleClose}
              className="p-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              disabled={isLoading}
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="px-6 pb-6">
              <div>
                <label
                  htmlFor="workspace-name"
                  className="text-sm font-bold leading-6 text-zinc-900"
                >
                  Workspace Name
                </label>
                <div className="relative">
                  <input
                    id="workspace-name"
                    type="text"
                    value={name}
                    onChange={e => {
                      setName(e.target.value);
                      // Clear validation error when user starts typing again
                      if (validationError) {
                        setValidationError(null);
                      }
                    }}
                    onBlur={() => {
                      setHasBlurred(true);
                      // Validate on blur
                      const error =
                        WorkspaceErrorHandler.validateWorkspaceName(name);
                      if (error) {
                        setValidationError(error.message);
                      } else {
                        setValidationError(null);
                      }
                    }}
                    placeholder="e.g., Main Website, Blog, Store"
                    maxLength={50}
                    className={`mt-1 w-full !h-12 px-3 pr-10 rounded-lg border text-sm font-medium leading-5 text-zinc-900 outline-none transition-[color,box-shadow] focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 ${
                      (hasBlurred && validationError) ||
                      availabilityStatus.available === false
                        ? 'border-red-500'
                        : availabilityStatus.available === true && hasChanged
                          ? 'border-green-500'
                          : 'border-zinc-300'
                    }`}
                    disabled={isLoading}
                    autoFocus
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 mt-0.5">
                    {isCheckingAvailability && (
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    )}
                    {!isCheckingAvailability &&
                      hasChanged &&
                      availabilityStatus.available === true && (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                    {!isCheckingAvailability &&
                      ((hasBlurred && validationError) ||
                        availabilityStatus.available === false) && (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                  </div>
                </div>
                {((hasBlurred && validationError) ||
                  availabilityStatus.message ||
                  serverError) && (
                  <p className="mt-2 text-sm text-red-600">
                    {validationError ||
                      availabilityStatus.message ||
                      serverError}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 px-6 pb-6">
              <button
                type="button"
                onClick={handleClose}
                disabled={isLoading}
                className="!h-11 px-4 rounded-md border border-zinc-300 bg-white text-sm font-bold leading-6 text-zinc-600 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  isLoading ||
                  !name.trim() ||
                  name.trim().length < 3 ||
                  !hasChanged ||
                  isCheckingAvailability ||
                  !!validationError ||
                  availabilityStatus.available === false
                }
                className="!h-11 px-4 rounded-md bg-indigo-600 text-sm font-bold leading-6 text-white hover:bg-indigo-700 transition-colors cursor-pointer disabled:bg-zinc-300 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
