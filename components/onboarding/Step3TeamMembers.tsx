'use client';

import { useState } from 'react';
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
import { Plus, Trash2 } from 'lucide-react';
import { StepComponentProps } from '@/types/form';
import { TeamMember } from '@/lib/validations/onboarding';

// Display labels for roles
const ROLE_DISPLAY_MAP = {
  viewer: 'Viewer (Read-Only)',
  member: 'Editor',
  admin: 'Admin',
} as const;

const TEAM_ROLES: TeamMember['role'][] = ['viewer', 'member', 'admin'];

export function Step3TeamMembers({ form, isSubmitting }: StepComponentProps) {
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<TeamMember['role']>('viewer');
  const [emailError, setEmailError] = useState<string | null>(null);

  return (
    <div>
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
          Who do you usually collaborate with?{' '}
          <span className="text-gray-500 text-base md:text-lg font-normal">
            (~ 2 min)
          </span>
        </h1>
        <p className="text-gray-600">
          Invite your team members to start collaborating and organizing your
          content workflow.
        </p>
      </div>

      <form.Field name="teamMembers">
        {(field: any) => {
          const addTeamMember = () => {
            setEmailError(null);

            // Validate email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(newEmail)) {
              setEmailError('Please enter a valid email address');
              return;
            }

            // Check for duplicates
            if (
              field.state.value.some(
                (member: TeamMember) =>
                  member.email.toLowerCase() === newEmail.toLowerCase()
              )
            ) {
              setEmailError('This team member has already been added');
              return;
            }

            // Add team member with correct role value
            const teamMembers = field.state.value as TeamMember[];
            field.handleChange([
              ...teamMembers,
              { email: newEmail, role: newRole },
            ]);

            // Reset form
            setNewEmail('');
            setNewRole('viewer');
          };

          const removeTeamMember = (index: number) => {
            const teamMembers = field.state.value as TeamMember[];
            field.handleChange(teamMembers.filter((_, i) => i !== index));
          };

          return (
            <div>
              {/* Add Team Member Form */}
              <div className="mb-6 md:mb-8">
                <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">
                  Add Team Member
                </h3>
                <div className="space-y-3 md:space-y-4">
                  <div>
                    <Label htmlFor="member-email">Email address</Label>
                    <Input
                      id="member-email"
                      type="email"
                      placeholder="user@example.com"
                      value={newEmail}
                      onChange={e => {
                        setNewEmail(e.target.value);
                        setEmailError(null);
                      }}
                      className={`mt-2 ${emailError ? 'border-red-500' : ''}`}
                    />
                    {emailError && (
                      <p className="text-sm text-red-600 mt-1">{emailError}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="member-role">Select the role</Label>
                    <Select
                      value={newRole}
                      onValueChange={value =>
                        setNewRole(value as TeamMember['role'])
                      }
                      disabled={isSubmitting}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Choose a role..." />
                      </SelectTrigger>
                      <SelectContent>
                        {TEAM_ROLES.map(role => (
                          <SelectItem key={role} value={role}>
                            {ROLE_DISPLAY_MAP[role]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    type="button"
                    onClick={addTeamMember}
                    disabled={!newEmail.trim() || isSubmitting}
                    variant="outline"
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Team Member
                  </Button>
                </div>
              </div>

              {/* Team Members List */}
              {(field.state.value as TeamMember[]).length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Team Members ({(field.state.value as TeamMember[]).length})
                  </h3>
                  <div className="space-y-3">
                    {(field.state.value as TeamMember[]).map(
                      (member, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg"
                        >
                          <div className="flex-1">
                            <p className="text-gray-900 font-medium">
                              {member.email}
                            </p>
                            <p className="text-gray-500 text-sm">
                              {ROLE_DISPLAY_MAP[member.role]}
                            </p>
                          </div>
                          <Button
                            type="button"
                            onClick={() => removeTeamMember(index)}
                            variant="ghost"
                            size="sm"
                            disabled={isSubmitting}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        }}
      </form.Field>
    </div>
  );
}
