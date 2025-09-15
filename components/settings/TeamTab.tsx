'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { AddMemberDialog } from './AddMemberDialog';
import { EditMemberDialog } from './EditMemberDialog';
import { RemoveConfirmDialog } from './RemoveConfirmDialog';

interface TeamMember {
  id: string;
  role: 'admin' | 'member' | 'viewer';
  status: 'active' | 'pending';
  createdAt: string;
  member?: {
    id: string;
    email: string;
    name: string | null;
    profileImage: string | null;
  };
}

interface TeamTabProps {
  user: {
    id?: string;
    email?: string | null;
  };
}

export function TeamTab({ user }: TeamTabProps) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [userRole, setUserRole] = useState<
    'owner' | 'admin' | 'member' | 'viewer' | null
  >(null);
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [showEditMemberDialog, setShowEditMemberDialog] = useState(false);
  const [showRemoveConfirmDialog, setShowRemoveConfirmDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  // Permission checks based on role
  const canInviteMembers = isOwner || userRole === 'admin';
  const canEditMembers = isOwner || userRole === 'admin';
  const canRemoveMembers = isOwner;

  useEffect(() => {
    fetchTeamData();
  }, []);

  const fetchTeamData = async () => {
    try {
      const response = await fetch('/api/team/members');
      if (!response.ok) throw new Error('Failed to fetch team data');

      const data = await response.json();
      setMembers(data.members || []);
      setInvitations(data.invitations || []);
      setIsOwner(data.isOwner || false);
      setUserRole(data.role || null);
    } catch (error) {
      toast.error('Failed to load team members');
      console.error('Error fetching team:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMember = (member: TeamMember) => {
    setSelectedMember(member);
    setShowRemoveConfirmDialog(true);
  };

  const confirmRemoveMember = async () => {
    if (!selectedMember) return;

    setIsRemoving(true);
    try {
      const response = await fetch(`/api/team/members/${selectedMember.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove member');
      }

      toast.success('Team member removed successfully');
      setShowRemoveConfirmDialog(false);
      setSelectedMember(null);
      fetchTeamData();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to remove member'
      );
    } finally {
      setIsRemoving(false);
    }
  };

  const handleEditMember = (member: TeamMember) => {
    setSelectedMember(member);
    setShowEditMemberDialog(true);
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  // Combine active members and pending invitations
  const allMembers = [...members, ...invitations];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-zinc-200">
        <div className="p-6 border-b border-zinc-200">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-base font-bold leading-6 text-zinc-900">
                Team Members
              </h2>
              <p className="mt-1 text-sm font-normal leading-snug text-zinc-500">
                Manage your team members and their roles.
              </p>
            </div>
            {canInviteMembers && (
              <Button
                onClick={() => setShowAddMemberDialog(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white h-10 sm:h-10 px-6 rounded-md text-sm font-medium leading-tight cursor-pointer"
              >
                Add New Member
              </Button>
            )}
          </div>
        </div>

        <div className="divide-y divide-zinc-200">
          {isLoading ? (
            <div className="p-6 text-center text-zinc-500">
              Loading team members...
            </div>
          ) : allMembers.length === 0 ? (
            <div className="p-6 text-center text-zinc-500">
              No team members yet.
            </div>
          ) : (
            allMembers.map(member => (
              <div
                key={member.id}
                className="p-6 flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    {member.member?.profileImage && (
                      <AvatarImage src={member.member.profileImage} />
                    )}
                    <AvatarFallback className="bg-zinc-100 text-zinc-600 text-sm font-medium">
                      {member.member
                        ? getInitials(member.member.name, member.member.email)
                        : '??'}
                    </AvatarFallback>
                  </Avatar>

                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-zinc-900">
                        {member.member?.name ||
                          member.member?.email ||
                          'Unknown'}
                      </p>
                      {member.status === 'pending' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                          Pending
                        </span>
                      )}
                    </div>
                    {member.member?.name && member.member?.email && (
                      <p className="text-sm text-zinc-500">
                        {member.member.email}
                      </p>
                    )}
                  </div>
                </div>

                {member.member?.id !== user.id && (
                  <div className="flex items-center space-x-2">
                    {canEditMembers && (
                      <Button
                        onClick={() => handleEditMember(member)}
                        variant="ghost"
                        size="sm"
                        className="text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 cursor-pointer"
                      >
                        Edit
                      </Button>
                    )}
                    {canRemoveMembers && (
                      <Button
                        onClick={() => handleRemoveMember(member)}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <AddMemberDialog
        open={showAddMemberDialog}
        onOpenChange={setShowAddMemberDialog}
        onSuccess={fetchTeamData}
      />

      <EditMemberDialog
        open={showEditMemberDialog}
        onOpenChange={setShowEditMemberDialog}
        member={selectedMember}
        onSuccess={fetchTeamData}
      />

      {selectedMember && (
        <RemoveConfirmDialog
          isOpen={showRemoveConfirmDialog}
          onClose={() => {
            setShowRemoveConfirmDialog(false);
            setSelectedMember(null);
          }}
          onConfirm={confirmRemoveMember}
          memberEmail={selectedMember.member.email}
          memberName={selectedMember.member.name}
          isLoading={isRemoving}
        />
      )}
    </div>
  );
}
