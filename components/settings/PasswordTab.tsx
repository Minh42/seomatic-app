'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { PasswordStrengthIndicator } from '@/components/auth/PasswordStrengthIndicator';
import { SettingsErrorHandler } from '@/lib/errors/settings-errors';

interface PasswordTabProps {
  user: {
    id?: string;
    email?: string | null;
    passwordHash?: string | null;
  };
}

export function PasswordTab({ user }: PasswordTabProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      const settingsError = SettingsErrorHandler.handlePasswordUpdateError(
        'New passwords do not match'
      );
      SettingsErrorHandler.displayError(settingsError);
      return;
    }

    // Validate password length
    if (newPassword.length < 8) {
      const settingsError = SettingsErrorHandler.handlePasswordUpdateError(
        'Password must be at least 8 characters'
      );
      SettingsErrorHandler.displayError(settingsError);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/user/password', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: hasPassword ? currentPassword : undefined,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const settingsError = SettingsErrorHandler.handlePasswordUpdateError(
          data.error || 'Failed to update password',
          response.status
        );
        SettingsErrorHandler.displayError(settingsError);
        return;
      }

      toast.success(
        hasPassword
          ? 'Password updated successfully'
          : 'Password set successfully'
      );

      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      const settingsError = SettingsErrorHandler.handlePasswordUpdateError(
        error instanceof Error ? error.message : 'Failed to update password'
      );
      SettingsErrorHandler.displayError(settingsError);
      console.error('Password update error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Check if user has a password (not OAuth-only account)
  const hasPassword = user.passwordHash !== null;

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
        <div className="mb-12">
          <h2 className="text-base font-bold leading-6 text-zinc-900">
            Password
          </h2>
          <p className="mt-1 text-sm font-normal leading-snug text-zinc-500">
            {hasPassword
              ? 'Manage your account password.'
              : 'Set a password to enable email and password login alongside your OAuth login.'}
          </p>
        </div>

        {/* Current Password - only show if user has a password */}
        {hasPassword && (
          <div className="grid grid-cols-3 gap-4 items-center">
            <Label className="text-sm font-bold leading-snug text-black">
              Current Password
            </Label>
            <div className="col-span-2">
              <Input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="********"
                required
                className="h-12 sm:h-12 md:h-12 rounded-lg border-zinc-300 text-sm font-medium leading-tight text-zinc-900 placeholder:text-zinc-400"
              />
            </div>
          </div>
        )}

        {/* New Password */}
        <div className="grid grid-cols-3 gap-4 items-start">
          <Label className="text-sm font-bold leading-snug text-black pt-3">
            New Password
          </Label>
          <div className="col-span-2">
            <Input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="********"
              required
              minLength={8}
              className="h-12 sm:h-12 md:h-12 rounded-lg border-zinc-300 text-sm font-medium leading-tight text-zinc-900 placeholder:text-zinc-400"
            />
            <PasswordStrengthIndicator password={newPassword} />
          </div>
        </div>

        {/* Confirm New Password */}
        <div className="grid grid-cols-3 gap-4 items-center">
          <Label className="text-sm font-bold leading-snug text-black">
            Confirm New Password
          </Label>
          <div className="col-span-2">
            <Input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="********"
              required
              minLength={8}
              className="h-12 sm:h-12 md:h-12 rounded-lg border-zinc-300 text-sm font-medium leading-tight text-zinc-900 placeholder:text-zinc-400"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white h-10 sm:h-10 px-6 rounded-md text-sm font-medium leading-tight cursor-pointer"
          >
            {isLoading
              ? hasPassword
                ? 'Updating...'
                : 'Setting...'
              : hasPassword
                ? 'Update Password'
                : 'Set Password'}
          </Button>
        </div>
      </div>
    </form>
  );
}
