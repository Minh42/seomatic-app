import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

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

interface TeamData {
  members: TeamMember[];
  invitations: TeamMember[];
  isOwner: boolean;
  role: 'owner' | 'admin' | 'member' | 'viewer' | null;
  seatUsage: SeatUsage | null;
}

interface AddMemberParams {
  email: string;
  role: 'admin' | 'member' | 'viewer';
  organizationId?: string;
}

interface UpdateMemberParams {
  memberId: string;
  role: 'admin' | 'member' | 'viewer';
}

// Fetch team members and invitations
async function fetchTeamMembers(organizationId?: string): Promise<TeamData> {
  const url = organizationId
    ? `/api/team/members?organizationId=${organizationId}`
    : '/api/team/members';

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch team members');
  }
  return response.json();
}

// Add a new team member
async function addTeamMember(params: AddMemberParams): Promise<void> {
  const response = await fetch('/api/team/invite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to add team member');
  }
}

// Update team member role
async function updateTeamMember(params: UpdateMemberParams): Promise<void> {
  const response = await fetch(`/api/team/members/${params.memberId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: params.role }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update team member');
  }
}

// Remove team member
async function removeTeamMember(memberId: string): Promise<void> {
  const response = await fetch(`/api/team/members/${memberId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to remove team member');
  }
}

// Resend invitation
async function resendInvitation(memberId: string): Promise<void> {
  const response = await fetch(`/api/team/members/${memberId}/resend`, {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to resend invitation');
  }
}

export function useTeamMembers(organizationId?: string) {
  const queryClient = useQueryClient();
  const queryKey = ['team-members', organizationId];

  // Fetch team members
  const query = useQuery<TeamData>({
    queryKey,
    queryFn: () => fetchTeamMembers(organizationId),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false,
  });

  // Add member mutation
  const addMember = useMutation({
    mutationFn: (params: Omit<AddMemberParams, 'organizationId'>) =>
      addTeamMember({ ...params, organizationId }),
    onMutate: async variables => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previousData = queryClient.getQueryData<TeamData>(queryKey);

      // Optimistically update
      if (previousData) {
        const optimisticMember: TeamMember = {
          id: `temp-${Date.now()}`,
          role: variables.role,
          status: 'pending',
          createdAt: new Date().toISOString(),
          member: {
            id: '',
            email: variables.email,
            name: null,
            profileImage: null,
          },
        };

        queryClient.setQueryData<TeamData>(queryKey, {
          ...previousData,
          invitations: [...previousData.invitations, optimisticMember],
        });
      }

      return { previousData };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      toast.error(err.message);
    },
    onSuccess: () => {
      toast.success('Invitation sent successfully');
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Update member mutation
  const updateMember = useMutation({
    mutationFn: updateTeamMember,
    onMutate: async variables => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData<TeamData>(queryKey);

      // Optimistically update the member's role
      if (previousData) {
        const updatedMembers = previousData.members.map(member =>
          member.id === variables.memberId
            ? { ...member, role: variables.role }
            : member
        );

        queryClient.setQueryData<TeamData>(queryKey, {
          ...previousData,
          members: updatedMembers,
        });
      }

      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      toast.error(err.message);
    },
    onSuccess: () => {
      toast.success('Member role updated');
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Remove member mutation
  const removeMember = useMutation({
    mutationFn: removeTeamMember,
    onMutate: async memberId => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData<TeamData>(queryKey);

      // Optimistically remove the member
      if (previousData) {
        const filteredMembers = previousData.members.filter(
          member => member.id !== memberId
        );
        const filteredInvitations = previousData.invitations.filter(
          inv => inv.id !== memberId
        );

        queryClient.setQueryData<TeamData>(queryKey, {
          ...previousData,
          members: filteredMembers,
          invitations: filteredInvitations,
        });
      }

      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      toast.error(err.message);
    },
    onSuccess: () => {
      toast.success('Team member removed successfully');
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Resend invitation mutation
  const resendInvite = useMutation({
    mutationFn: resendInvitation,
    onError: err => {
      toast.error(err.message);
    },
    onSuccess: () => {
      toast.success('Invitation resent successfully');
    },
  });

  return {
    // Query state
    members: query.data?.members ?? [],
    invitations: query.data?.invitations ?? [],
    isOwner: query.data?.isOwner ?? false,
    userRole: query.data?.role ?? null,
    seatUsage: query.data?.seatUsage ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,

    // Mutations
    addMember: addMember.mutate,
    updateMember: updateMember.mutate,
    removeMember: removeMember.mutate,
    resendInvitation: resendInvite.mutate,

    // Mutation states
    isAddingMember: addMember.isPending,
    isUpdatingMember: updateMember.isPending,
    isRemovingMember: removeMember.isPending,
    isResendingInvite: resendInvite.isPending,

    // Utility
    refetch: query.refetch,
  };
}

// Hook for user's organizations (used in "Teams you are on" section)
interface Organization {
  id: string;
  name: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  memberCount: number;
  createdAt: Date;
}

async function fetchUserOrganizations(): Promise<{
  organizations: Organization[];
}> {
  const response = await fetch('/api/user/organizations');
  if (!response.ok) {
    throw new Error('Failed to fetch organizations');
  }
  return response.json();
}

async function leaveOrganization(organizationId: string): Promise<void> {
  const response = await fetch(
    `/api/user/organizations/${organizationId}/leave`,
    {
      method: 'POST',
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to leave organization');
  }
}

export function useUserOrganizations() {
  const queryClient = useQueryClient();
  const queryKey = ['user-organizations'];

  const query = useQuery({
    queryKey,
    queryFn: fetchUserOrganizations,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const leaveMutation = useMutation({
    mutationFn: leaveOrganization,
    onSuccess: () => {
      toast.success('Successfully left the organization');
      queryClient.invalidateQueries({ queryKey });
      // Also invalidate the main organizations query
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
    onError: err => {
      toast.error(err.message);
    },
  });

  return {
    organizations: query.data?.organizations ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    leaveOrganization: leaveMutation.mutate,
    isLeaving: leaveMutation.isPending,
    refetch: query.refetch,
  };
}
