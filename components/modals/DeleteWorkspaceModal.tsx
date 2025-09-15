'use client';

import { AlertTriangle, X } from 'lucide-react';

interface DeleteWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
  workspaceName: string;
}

export function DeleteWorkspaceModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  workspaceName,
}: DeleteWorkspaceModalProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div
          className="bg-white rounded-xl shadow-xl w-full max-w-md relative"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <h2 className="text-xl font-bold leading-8 text-zinc-900">
                Delete Workspace
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              disabled={isLoading}
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 pb-6">
            <p className="text-sm font-normal leading-6 text-zinc-500 mb-4">
              Are you sure you want to delete{' '}
              <span className="font-bold text-zinc-900">
                &quot;{workspaceName}&quot;
              </span>
              ?
            </p>

            <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
              <p className="text-sm text-red-800 font-medium">
                This action cannot be undone
              </p>
              <p className="text-sm text-red-700 mt-1">
                All data, connections, and configurations associated with this
                workspace will be permanently deleted.
              </p>
            </div>

            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg">
              <p className="text-sm text-zinc-600">
                If you need to preserve any data, make sure to export it before
                proceeding with the deletion.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 px-6 pb-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="!h-11 px-4 rounded-md border border-zinc-300 bg-white text-sm font-bold leading-6 text-zinc-600 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className="!h-11 px-4 rounded-md bg-red-600 text-sm font-bold leading-6 text-white hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Deleting...' : 'Delete Workspace'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
