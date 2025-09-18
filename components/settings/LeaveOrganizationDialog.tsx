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

interface LeaveOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationName: string;
  onConfirm: () => void;
  isLoading: boolean;
}

export function LeaveOrganizationDialog({
  open,
  onOpenChange,
  organizationName,
  onConfirm,
  isLoading,
}: LeaveOrganizationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold leading-8 text-zinc-900">
            Leave Organization
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <DialogDescription className="text-sm font-normal leading-6 text-zinc-500">
            Are you sure you want to leave{' '}
            <span className="font-medium text-zinc-900">
              {organizationName}
            </span>
            ?
          </DialogDescription>
          <DialogDescription className="mt-2 text-sm font-normal leading-6 text-zinc-500">
            You will lose access to all workspaces and resources in this
            organization. You can only rejoin if invited again by an
            organization admin.
          </DialogDescription>
        </div>

        <DialogFooter className="gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
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
            {isLoading ? 'Leaving...' : 'Leave Organization'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
