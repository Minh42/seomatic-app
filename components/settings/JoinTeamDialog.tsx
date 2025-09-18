'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface Invitation {
  id: string;
  role: 'admin' | 'member' | 'viewer';
  createdAt: string;
  organizationId: string;
  organizationName: string;
  inviterName: string;
}

interface JoinTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function JoinTeamDialog({
  open,
  onOpenChange,
  onSuccess,
}: JoinTeamDialogProps) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchInvitations();
    }
  }, [open]);

  const fetchInvitations = async () => {
    try {
      const response = await fetch('/api/user/invitations');
      if (!response.ok) throw new Error('Failed to fetch invitations');

      const data = await response.json();
      setInvitations(data.invitations || []);
    } catch (error) {
      toast.error('Failed to load invitations');
      console.error('Error fetching invitations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async (invitationId: string) => {
    setProcessingId(invitationId);
    try {
      const response = await fetch(
        `/api/user/invitations/${invitationId}/accept`,
        {
          method: 'POST',
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to accept invitation');
      }

      toast.success('Invitation accepted successfully');

      // Remove the accepted invitation from the list
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId));

      // If no more invitations, close the dialog
      if (invitations.length === 1) {
        onOpenChange(false);
      }

      // Trigger parent refresh
      onSuccess?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to accept invitation'
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (invitationId: string) => {
    setProcessingId(invitationId);
    try {
      const response = await fetch(
        `/api/user/invitations/${invitationId}/decline`,
        {
          method: 'POST',
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to decline invitation');
      }

      toast.success('Invitation declined');

      // Remove the declined invitation from the list
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId));

      // If no more invitations, close the dialog
      if (invitations.length === 1) {
        onOpenChange(false);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to decline invitation'
      );
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'viewer':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Pending Team Invitations</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
            </div>
          ) : invitations.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              You have no pending team invitations
            </div>
          ) : (
            invitations.map(invitation => (
              <div
                key={invitation.id}
                className="border border-zinc-200 rounded-lg p-4 space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h3 className="font-medium text-zinc-900">
                      {invitation.organizationName}
                    </h3>
                    <p className="text-sm text-zinc-500">
                      Invited by {invitation.inviterName} on{' '}
                      {formatDate(invitation.createdAt)}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getRoleBadgeColor(
                      invitation.role
                    )}`}
                  >
                    {invitation.role}
                  </span>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleAccept(invitation.id)}
                    disabled={processingId === invitation.id}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    {processingId === invitation.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Accept'
                    )}
                  </Button>
                  <Button
                    onClick={() => handleDecline(invitation.id)}
                    disabled={processingId === invitation.id}
                    variant="outline"
                    className="flex-1"
                  >
                    {processingId === invitation.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Decline'
                    )}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
