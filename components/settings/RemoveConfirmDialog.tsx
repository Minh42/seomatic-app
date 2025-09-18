'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface RemoveConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  memberEmail: string;
  memberName?: string | null;
  isLoading?: boolean;
}

export function RemoveConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  memberEmail,
  memberName,
  isLoading = false,
}: RemoveConfirmDialogProps) {
  const displayName = memberName || memberEmail;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold leading-8 text-zinc-900">
            Remove team member
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <DialogDescription className="text-sm font-normal leading-6 text-zinc-500">
            Are you sure you want to remove{' '}
            <span className="font-medium text-zinc-900">{displayName}</span>{' '}
            from your team?
          </DialogDescription>
          <DialogDescription className="mt-2 text-sm font-normal leading-6 text-zinc-500">
            They will immediately lose access to all team resources. This action
            cannot be undone.
          </DialogDescription>
        </div>

        <DialogFooter className="gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="!h-11 rounded-md border border-zinc-300 bg-white text-sm font-bold leading-6 text-zinc-600 hover:bg-gray-50 cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isLoading}
            className="!h-11 rounded-md bg-red-600 text-sm font-bold leading-6 text-white hover:bg-red-700 cursor-pointer disabled:bg-zinc-300"
          >
            {isLoading ? 'Removing...' : 'Remove member'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
