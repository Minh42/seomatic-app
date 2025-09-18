'use client';

import { useState, useEffect, useRef } from 'react';
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
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { validateWorkEmail } from '@/lib/utils/email-validation';

interface TeamMember {
  email: string;
  role: 'viewer' | 'member' | 'admin';
  error?: string;
  touched?: boolean;
}

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  currentUserEmail?: string | null;
}

export function AddMemberDialog({
  open,
  onOpenChange,
  onSuccess,
  currentUserEmail,
}: AddMemberDialogProps) {
  const [members, setMembers] = useState<TeamMember[]>([
    { email: '', role: 'member', touched: false },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [existingEmails, setExistingEmails] = useState<Set<string>>(new Set());
  const debounceTimers = useRef<{ [key: number]: NodeJS.Timeout }>({});

  const addMember = () => {
    setMembers([...members, { email: '', role: 'member', touched: false }]);
  };

  const removeMember = (index: number) => {
    // Clear any pending debounce timer for this index
    if (debounceTimers.current[index]) {
      clearTimeout(debounceTimers.current[index]);
      delete debounceTimers.current[index];
    }
    setMembers(members.filter((_, i) => i !== index));
  };

  const validateEmail = (email: string, currentIndex?: number) => {
    if (!email) return undefined;

    const normalizedEmail = email.toLowerCase().trim();

    // Check if trying to invite yourself
    if (
      currentUserEmail &&
      normalizedEmail === currentUserEmail.toLowerCase()
    ) {
      return 'You are already a member of this team';
    }

    // Check if email already exists in team
    if (existingEmails.has(normalizedEmail)) {
      return 'This user is already a team member or has a pending invitation';
    }

    // Check for duplicates within the current form
    if (currentIndex !== undefined) {
      const duplicate = members.some(
        (m, idx) =>
          idx !== currentIndex &&
          m.email.toLowerCase().trim() === normalizedEmail
      );
      if (duplicate) {
        return 'This email address has already been added';
      }
    }

    const validation = validateWorkEmail(email);
    return !validation.isValid ? validation.error : undefined;
  };

  const updateMember = (
    index: number,
    field: keyof TeamMember,
    value: string
  ) => {
    const updated = [...members];
    updated[index] = { ...updated[index], [field]: value };

    // For email field, set up debounced validation
    if (field === 'email') {
      // Clear existing timer for this index
      if (debounceTimers.current[index]) {
        clearTimeout(debounceTimers.current[index]);
      }

      // Set up new debounce timer
      debounceTimers.current[index] = setTimeout(() => {
        setMembers(prev => {
          const updatedWithValidation = [...prev];
          updatedWithValidation[index] = {
            ...updatedWithValidation[index],
            error: validateEmail(value, index),
            touched: true,
          };
          return updatedWithValidation;
        });
        delete debounceTimers.current[index];
      }, 500); // Wait 500ms after user stops typing
    }

    setMembers(updated);
  };

  // Fetch existing team members when dialog opens
  useEffect(() => {
    if (open) {
      fetchExistingMembers();
    }
  }, [open]);

  // Clean up debounce timers on unmount
  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach(timer =>
        clearTimeout(timer)
      );
    };
  }, []);

  const fetchExistingMembers = async () => {
    try {
      const response = await fetch('/api/team/members');
      if (response.ok) {
        const data = await response.json();
        const emails = new Set<string>();

        // Add active and suspended members
        if (data.members) {
          data.members.forEach((member: any) => {
            if (member.member?.email) {
              emails.add(member.member.email.toLowerCase());
            }
          });
        }

        // Add pending invitations
        if (data.invitations) {
          data.invitations.forEach((invitation: any) => {
            if (invitation.member?.email) {
              emails.add(invitation.member.email.toLowerCase());
            }
          });
        }

        setExistingEmails(emails);
      }
    } catch (error) {
      console.error('Failed to fetch existing members:', error);
    }
  };

  // Check if all email addresses are valid (no empty fields, no errors)
  const hasValidEmails =
    members.length > 0 &&
    members.every(m => {
      const trimmedEmail = m.email.trim();
      // Email must be non-empty
      if (trimmedEmail === '') return false;
      // If touched and has error, it's invalid
      if (m.touched && m.error) return false;
      // If not touched yet, validate it now
      if (!m.touched) {
        const error = validateEmail(trimmedEmail, members.indexOf(m));
        return !error;
      }
      return true;
    });

  const handleSubmit = async () => {
    // Validate all emails before submitting (final check)
    const updatedMembers = [...members];
    let hasErrors = false;

    for (let i = 0; i < updatedMembers.length; i++) {
      const trimmedEmail = updatedMembers[i].email.trim();
      if (!trimmedEmail) {
        updatedMembers[i] = {
          ...updatedMembers[i],
          error: 'Email address is required',
          touched: true,
        };
        hasErrors = true;
      } else {
        const error = validateEmail(trimmedEmail, i);
        if (error) {
          updatedMembers[i] = { ...updatedMembers[i], error, touched: true };
          hasErrors = true;
        }
      }
    }

    if (hasErrors) {
      setMembers(updatedMembers);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/team/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamMembers: members.map(m => ({
            email: m.email.trim().toLowerCase(),
            role: m.role,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to send invitations');
        return;
      }

      if (data.message) {
        toast.success(data.message);
      }

      // Reset form and close dialog
      setMembers([{ email: '', role: 'member', touched: false }]);
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error('Failed to send invitations');
      console.error('Error sending invitations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[70vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold leading-8 text-zinc-900">
            Invite Team Members
          </DialogTitle>
          <DialogDescription className="text-sm font-normal leading-6 text-zinc-500">
            Send invitations to add new members to your team. They&apos;ll
            receive an email with instructions to join.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {members.map((member, index) => (
            <div key={index} className="space-y-1">
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <Label className="text-sm font-bold leading-6 text-zinc-900">
                    Email Address
                  </Label>
                  <Input
                    type="email"
                    placeholder="colleague@company.com"
                    value={member.email}
                    onChange={e => updateMember(index, 'email', e.target.value)}
                    onBlur={() => {
                      // Validate immediately on blur
                      const updatedMembers = [...members];
                      const trimmedEmail = updatedMembers[index].email.trim();
                      updatedMembers[index] = {
                        ...updatedMembers[index],
                        error:
                          trimmedEmail === ''
                            ? 'Email address is required'
                            : validateEmail(trimmedEmail, index),
                        touched: true,
                      };
                      setMembers(updatedMembers);
                    }}
                    className={`mt-1 !h-12 rounded-lg border border-zinc-300 text-sm font-medium leading-5 placeholder:text-zinc-400 ${member.error && member.touched ? 'border-red-500' : ''} ${member.email ? 'text-zinc-900' : ''}`}
                  />
                </div>

                <div className="w-32">
                  <Label className="text-sm font-bold leading-6 text-zinc-900">
                    Role
                  </Label>
                  <Select
                    value={member.role}
                    onValueChange={value =>
                      updateMember(index, 'role', value as TeamMember['role'])
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

                {members.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeMember(index)}
                    className="mb-0.5 p-2 rounded-md hover:bg-zinc-100 transition-colors cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {member.error && member.touched && (
                <p className="text-xs text-red-500 pl-1">{member.error}</p>
              )}
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={addMember}
            className="w-full !h-11 cursor-pointer"
          >
            Add Another Member
          </Button>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="!h-11 rounded-md border border-zinc-300 bg-white text-sm font-bold leading-6 text-zinc-600 hover:bg-gray-50 cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !hasValidEmails}
            className="!h-11 rounded-md bg-indigo-600 text-sm font-bold leading-6 text-white hover:bg-indigo-700 cursor-pointer disabled:bg-zinc-300 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Sending...' : 'Send Invitations'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
