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
import { Plus, Trash2, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { StepComponentProps } from '@/types/form';
import { TeamMember, teamMemberSchema } from '@/lib/validations/onboarding';
import { z } from 'zod';
import { validateWorkEmail } from '@/lib/utils/email-validation';

// Display labels for roles
const ROLE_DISPLAY_MAP = {
  viewer: 'Viewer (Read-Only)',
  member: 'Editor',
  admin: 'Admin',
} as const;

const TEAM_ROLES: TeamMember['role'][] = ['viewer', 'member', 'admin'];

// Email validation cache to prevent repeated API calls
const emailCache = new Map<string, { available: boolean; error?: string }>();

interface Step3TeamMembersProps extends StepComponentProps {
  currentUserEmail?: string;
}

export function Step3TeamMembers({
  form,
  isSubmitting,
  currentUserEmail,
}: Step3TeamMembersProps) {
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<TeamMember['role']>('viewer');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailTouched, setEmailTouched] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(
    null
  );
  const [emailAvailable, setEmailAvailable] = useState(false);

  const checkEmailUniqueness = async (email: string) => {
    if (!email || !email.includes('@')) return;

    // Check cache first
    const cached = emailCache.get(email);
    if (cached) {
      setEmailAvailable(cached.available);
      setEmailError(cached.error || null);
      return;
    }

    setIsCheckingEmail(true);
    try {
      const response = await fetch('/api/team/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      // Cache the result
      emailCache.set(email, {
        available: data.available,
        error: data.error,
      });

      if (data.available) {
        setEmailAvailable(true);
        setEmailError(null);
      } else {
        setEmailAvailable(false);
        // Use the error message from the API if provided
        if (data.error) {
          setEmailError(data.error);
        }
      }
    } catch {
      setEmailAvailable(false);
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const validateEmailAfterTyping = (value: string) => {
    if (!value.trim()) {
      setEmailError(null);
      setEmailAvailable(false);
      return;
    }

    const normalizedEmail = value.trim().toLowerCase();

    try {
      // Basic Zod validation first
      teamMemberSchema.shape.email.parse(normalizedEmail);

      // Check if trying to invite yourself
      if (
        currentUserEmail &&
        normalizedEmail === currentUserEmail.toLowerCase()
      ) {
        setEmailError('You are already a member of this team');
        setEmailAvailable(false);
        return;
      }

      // Check if already added to the list
      const field = form.getFieldValue('teamMembers') || [];
      if (
        field.some(
          (member: TeamMember) => member.email.toLowerCase() === normalizedEmail
        )
      ) {
        setEmailError('This email address has already been added');
        setEmailAvailable(false);
        return;
      }

      // Then check for disposable emails and typos
      const validation = validateWorkEmail(value);
      if (!validation.isValid) {
        setEmailError(validation.error || 'Invalid email address');
        setEmailAvailable(false);
      } else {
        setEmailError(null);
        // Check uniqueness against database
        checkEmailUniqueness(normalizedEmail);
      }
    } catch (error) {
      setEmailAvailable(false);
      if (
        error instanceof z.ZodError &&
        error.issues &&
        error.issues.length > 0
      ) {
        setEmailError(error.issues[0].message);
      } else {
        setEmailError('Please enter a valid email address');
      }
    }
  };

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
        {(field: {
          state: { value: string[] };
          handleChange: (value: string[]) => void;
        }) => {
          const addTeamMember = () => {
            setEmailError(null);

            // Trim and lowercase the email
            const trimmedEmail = newEmail.trim().toLowerCase();

            // Validate using Zod schema
            try {
              const validatedMember = teamMemberSchema.parse({
                email: trimmedEmail,
                role: newRole,
              });

              // Check if trying to invite yourself
              if (
                currentUserEmail &&
                validatedMember.email === currentUserEmail.toLowerCase()
              ) {
                setEmailError('You are already a member of this team');
                return;
              }

              // Duplicate check is already done in validateEmailAfterTyping
              // Just double-check here for safety
              if (
                field.state.value.some(
                  (member: TeamMember) =>
                    member.email.toLowerCase() === validatedMember.email
                )
              ) {
                setEmailError('This email address has already been added');
                return;
              }

              // Check for disposable emails and typos
              const validation = validateWorkEmail(validatedMember.email);
              if (!validation.isValid) {
                setEmailError(validation.error || 'Invalid email address');
                return;
              }

              // Add team member with validated email
              const teamMembers = field.state.value as TeamMember[];
              field.handleChange([...teamMembers, validatedMember]);

              // Reset form
              setNewEmail('');
              setNewRole('viewer');
              setEmailTouched(false);
              setIsTyping(false);
              setEmailError(null);
              setEmailAvailable(false);
            } catch (error) {
              if (
                error instanceof z.ZodError &&
                error.issues &&
                error.issues.length > 0
              ) {
                setEmailError(error.issues[0].message);
              } else {
                setEmailError('Please enter a valid email address');
              }
            }
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
                    <Label htmlFor="member-email">Work Email</Label>
                    <div className="relative">
                      <Input
                        id="member-email"
                        type="email"
                        placeholder="colleague@company.com"
                        value={newEmail}
                        onChange={e => {
                          const value = e.target.value;
                          setNewEmail(value);
                          setEmailTouched(true);
                          setIsTyping(true);

                          // Clear any existing error and availability while typing
                          setEmailError(null);
                          setEmailAvailable(false);

                          // Clear previous timeout
                          if (typingTimeout) {
                            clearTimeout(typingTimeout);
                          }

                          // Set a timeout to validate after user stops typing (500ms)
                          const timeout = setTimeout(() => {
                            setIsTyping(false);
                            validateEmailAfterTyping(value);
                          }, 500);
                          setTypingTimeout(timeout);
                        }}
                        onBlur={() => {
                          setEmailTouched(true);
                          setIsTyping(false);

                          // Clear any pending validation timeout
                          if (typingTimeout) {
                            clearTimeout(typingTimeout);
                          }

                          // Validate immediately on blur
                          validateEmailAfterTyping(newEmail);
                        }}
                        className={`mt-2 pr-10 ${
                          emailTouched && !isTyping && emailError
                            ? 'border-red-500'
                            : emailTouched &&
                                !isTyping &&
                                emailAvailable &&
                                !isCheckingEmail
                              ? 'border-green-500'
                              : ''
                        }`}
                        disabled={isSubmitting}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 mt-1">
                        {isCheckingEmail && (
                          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                        )}
                        {!isCheckingEmail &&
                          emailTouched &&
                          !isTyping &&
                          emailAvailable &&
                          newEmail.trim() && (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          )}
                        {!isCheckingEmail &&
                          emailTouched &&
                          !isTyping &&
                          emailError && (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                      </div>
                    </div>
                    {(emailTouched && !isTyping && emailError) ||
                    (emailTouched &&
                      !isTyping &&
                      emailAvailable &&
                      newEmail.trim()) ? (
                      <p className="text-sm mt-1">
                        {emailError ? (
                          <span className="text-red-600">{emailError}</span>
                        ) : (
                          <span className="text-green-600">
                            Email address is valid
                          </span>
                        )}
                      </p>
                    ) : null}
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
                      <SelectTrigger className="mt-2 w-full">
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
                          className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-gray-900 font-medium">
                                {member.email}
                              </p>
                            </div>
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
