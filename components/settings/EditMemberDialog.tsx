'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useOrganization } from '@/lib/providers/organization-provider';

interface TeamMember {
  id: string;
  role: 'admin' | 'member' | 'viewer';
  status: 'active' | 'pending';
  member?: {
    email: string;
    name: string | null;
  };
}

interface EditMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: TeamMember | null;
  onSuccess: () => void;
}

export function EditMemberDialog({
  open,
  onOpenChange,
  member,
  onSuccess,
}: EditMemberDialogProps) {
  const { selectedOrganization } = useOrganization();
  const {
    updateMember,
    isUpdatingMember,
    resendInvitation,
    isResendingInvite,
  } = useTeamMembers(selectedOrganization?.id);
  const [role, setRole] = useState<'admin' | 'member' | 'viewer'>('member');

  // Update role when member changes or dialog opens
  useEffect(() => {
    if (member) {
      setRole(member.role);
    }
  }, [member]);

  const handleSubmit = () => {
    if (!member) return;

    // Don't submit if role hasn't changed
    if (role === member.role) {
      onOpenChange(false);
      return;
    }

    updateMember(
      { memberId: member.id, role },
      {
        onSuccess: () => {
          onOpenChange(false);
          onSuccess();
        },
      }
    );
  };

  const handleResendInvite = () => {
    if (!member) return;
    resendInvitation(member.id);
  };

  if (!member) return null;

  const memberEmail = member.member?.email || '';
  const memberName = member.member?.name || '';
  const isPending = member.status === 'pending';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold leading-8 text-zinc-900">
            Edit Team Member
          </DialogTitle>
          <DialogDescription className="text-sm font-normal leading-6 text-zinc-500">
            {isPending
              ? 'Update the role for this pending invitation.'
              : 'Change the role and permissions for this team member.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Label className="text-sm font-bold leading-6 text-zinc-900">
                Email Address
              </Label>
              <Input
                type="email"
                value={memberEmail}
                disabled
                className="mt-1 !h-12 rounded-lg border border-zinc-300 bg-zinc-50 text-sm font-medium leading-5 text-zinc-900"
              />
            </div>

            <div className="w-32">
              <Label className="text-sm font-bold leading-6 text-zinc-900">
                Role
              </Label>
              <Select
                value={role}
                onValueChange={value =>
                  setRole(value as 'admin' | 'member' | 'viewer')
                }
              >
                <SelectTrigger className="mt-1 !h-12 rounded-lg border border-zinc-300 text-sm font-medium leading-5 text-zinc-900 cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer" className="cursor-pointer">
                    Viewer
                  </SelectItem>
                  <SelectItem value="member" className="cursor-pointer">
                    Member
                  </SelectItem>
                  <SelectItem value="admin" className="cursor-pointer">
                    Admin
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {!isPending && memberName && (
            <div>
              <Label className="text-sm font-bold leading-6 text-zinc-900">
                Name
              </Label>
              <Input
                type="text"
                value={memberName}
                disabled
                className="mt-1 !h-12 rounded-lg border border-zinc-300 bg-zinc-50 text-sm font-medium leading-5 text-zinc-900"
              />
            </div>
          )}

          {isPending && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <p className="text-sm text-yellow-800">
                Invitation sent. Waiting for user to accept and join the team.
              </p>
              <Button
                variant="link"
                onClick={handleResendInvite}
                disabled={isResendingInvite}
                className="text-yellow-700 hover:text-yellow-800 underline p-0 h-auto mt-1 cursor-pointer"
              >
                {isResendingInvite ? 'Resending...' : 'Resend invitation email'}
              </Button>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUpdatingMember}
            className="!h-11 rounded-md border border-zinc-300 bg-white text-sm font-bold leading-6 text-zinc-600 hover:bg-gray-50 cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isUpdatingMember || role === member?.role}
            className="!h-11 rounded-md bg-indigo-600 text-sm font-bold leading-6 text-white hover:bg-indigo-700 cursor-pointer disabled:bg-zinc-300 disabled:cursor-not-allowed"
          >
            {isUpdatingMember ? 'Updating...' : 'Update Role'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
