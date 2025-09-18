'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { AddMemberDialog } from './AddMemberDialog';
import { EditMemberDialog } from './EditMemberDialog';
import { RemoveConfirmDialog } from './RemoveConfirmDialog';
import { JoinTeamDialog } from './JoinTeamDialog';
import { LeaveOrganizationDialog } from './LeaveOrganizationDialog';

interface TeamMember {
  id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  status: 'active' | 'pending' | 'suspended';
  createdAt: string;
  member?: {
    id: string;
    email: string;
    name: string | null;
    profileImage: string | null;
  };
}

interface SeatUsage {
  active: number;
  limit: number | 'unlimited';
  total: number;
  isPaused: boolean;
  planName: string;
}

interface TeamTabProps {
  user: {
    id?: string;
    email?: string | null;
  };
}

interface Organization {
  id: string;
  name: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  memberCount: number;
  createdAt: Date;
}

export function TeamTab({ user }: TeamTabProps) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamMember[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [seatUsage, setSeatUsage] = useState<SeatUsage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [userRole, setUserRole] = useState<
    'owner' | 'admin' | 'member' | 'viewer' | null
  >(null);
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [showEditMemberDialog, setShowEditMemberDialog] = useState(false);
  const [showRemoveConfirmDialog, setShowRemoveConfirmDialog] = useState(false);
  const [showJoinTeamDialog, setShowJoinTeamDialog] = useState(false);
  const [showLeaveOrgDialog, setShowLeaveOrgDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  // Permission checks based on role
  const canInviteMembers = isOwner || userRole === 'admin';
  const canEditMembers = isOwner || userRole === 'admin';
  const canRemoveMembers = isOwner;

  useEffect(() => {
    fetchTeamData();
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const response = await fetch('/api/user/organizations');
      if (!response.ok) throw new Error('Failed to fetch organizations');

      const data = await response.json();
      setOrganizations(data.organizations || []);
    } catch (error) {
      console.error('Error fetching organizations:', error);
    } finally {
      setIsLoadingOrgs(false);
    }
  };

  const fetchTeamData = async () => {
    try {
      const response = await fetch('/api/team/members');
      if (!response.ok) throw new Error('Failed to fetch team data');

      const data = await response.json();
      setMembers(data.members || []);
      setInvitations(data.invitations || []);
      setIsOwner(data.isOwner || false);
      setUserRole(data.role || null);
      setSeatUsage(data.seatUsage || null);
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

  const handleLeaveOrganization = (org: Organization) => {
    setSelectedOrg(org);
    setShowLeaveOrgDialog(true);
  };

  const confirmLeaveOrganization = async () => {
    if (!selectedOrg) return;

    setIsLeaving(true);
    try {
      const response = await fetch(
        `/api/user/organizations/${selectedOrg.id}/leave`,
        {
          method: 'POST',
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to leave organization');
      }

      toast.success('Successfully left the organization');
      setShowLeaveOrgDialog(false);
      setSelectedOrg(null);
      fetchOrganizations();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to leave organization'
      );
    } finally {
      setIsLeaving(false);
    }
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
      {/* Teams you are on section */}
      <div className="bg-white rounded-lg border border-zinc-200">
        <div className="p-6 border-b border-zinc-200">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-base font-bold leading-6 text-zinc-900">
                Teams you are on
              </h2>
              <p className="mt-1 text-sm font-normal leading-snug text-zinc-500">
                View and manage the organizations you belong to.
              </p>
            </div>
            <Button
              onClick={() => setShowJoinTeamDialog(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white h-10 sm:h-10 px-6 rounded-md text-sm font-medium leading-tight cursor-pointer"
            >
              Join Another Team
            </Button>
          </div>
        </div>
        <div className="divide-y divide-zinc-200">
          {isLoadingOrgs ? (
            <div className="p-6 text-center text-zinc-500">
              Loading organizations...
            </div>
          ) : organizations.length === 0 ? (
            <div className="p-6 text-center text-zinc-500">
              You are not part of any organizations yet.
            </div>
          ) : (
            organizations.map(org => (
              <div
                key={org.id}
                className="p-6 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-zinc-900">
                      {org.name}
                    </p>
                    <span className="text-sm text-zinc-500">
                      {org.memberCount}{' '}
                      {org.memberCount === 1 ? 'member' : 'members'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {org.role !== 'owner' && (
                    <Button
                      onClick={() => handleLeaveOrganization(org)}
                      variant="ghost"
                      size="sm"
                      className="text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 cursor-pointer"
                    >
                      Leave
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-zinc-200">
        <div className="p-6 border-b border-zinc-200">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-base font-bold leading-6 text-zinc-900">
                Team Members
                {seatUsage &&
                  seatUsage.limit !== 'unlimited' &&
                  seatUsage.limit > 0 && (
                    <span className="ml-2 text-sm font-normal text-zinc-500">
                      ({seatUsage.active}/{seatUsage.limit})
                    </span>
                  )}
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
                className={`p-6 flex items-center justify-between ${
                  member.status === 'suspended' ? 'opacity-60' : ''
                }`}
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
                      {/* Role Badge */}
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          member.role === 'owner'
                            ? 'bg-purple-100 text-purple-800'
                            : member.role === 'admin'
                              ? 'bg-blue-100 text-blue-800'
                              : member.role === 'member'
                                ? 'bg-gray-100 text-gray-800'
                                : 'bg-zinc-100 text-zinc-600'
                        }`}
                      >
                        {member.role.charAt(0).toUpperCase() +
                          member.role.slice(1)}
                      </span>
                      {/* Status Badge */}
                      {member.status === 'pending' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                          Pending
                        </span>
                      )}
                      {member.status === 'suspended' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                          Suspended
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

                {member.member?.id !== user.id && member.role !== 'owner' && (
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
        currentUserEmail={user.email}
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

      <JoinTeamDialog
        open={showJoinTeamDialog}
        onOpenChange={setShowJoinTeamDialog}
        onSuccess={fetchOrganizations}
      />

      {selectedOrg && (
        <LeaveOrganizationDialog
          open={showLeaveOrgDialog}
          onOpenChange={setShowLeaveOrgDialog}
          organizationName={selectedOrg.name}
          onConfirm={confirmLeaveOrganization}
          isLoading={isLeaving}
        />
      )}
    </div>
  );
}
