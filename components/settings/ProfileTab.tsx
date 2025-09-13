'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { SettingsErrorHandler } from '@/lib/errors/settings-errors';

interface ProfileTabProps {
  user: {
    id?: string;
    email?: string | null;
    name?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    image?: string | null;
  };
}

export function ProfileTab({ user }: ProfileTabProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [profileImage, setProfileImage] = useState(user.image || '');
  const [firstName, setFirstName] = useState(user.firstName || '');
  const [lastName, setLastName] = useState(user.lastName || '');

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setProfileImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setProfileImage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const fullName = `${firstName} ${lastName}`.trim();

      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: fullName || undefined, // Send undefined instead of empty string
          firstName: firstName || undefined, // Send undefined instead of empty string
          lastName: lastName || undefined, // Send undefined instead of empty string
          image: profileImage === '' ? null : profileImage || undefined, // Explicitly send null when image is removed
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const settingsError = SettingsErrorHandler.handleProfileUpdateError(
          data.error || 'Failed to update profile',
          response.status
        );
        SettingsErrorHandler.displayError(settingsError);
        return;
      }

      toast.success('Profile updated successfully');
    } catch (error) {
      const settingsError = SettingsErrorHandler.handleProfileUpdateError(
        error instanceof Error ? error.message : 'Failed to update profile'
      );
      SettingsErrorHandler.displayError(settingsError);
      console.error('Profile update error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
        <div className="mb-12">
          <h2 className="text-base font-bold leading-6 text-zinc-900">
            Profile
          </h2>
          <p className="mt-1 text-sm font-normal leading-snug text-zinc-500">
            Manage your personal information.
          </p>
        </div>

        {/* Profile Photo */}
        <div className="grid grid-cols-3 gap-4 items-center">
          <Label className="text-sm font-bold leading-snug text-black">
            Profile Photo
          </Label>
          <div className="col-span-2 flex items-center space-x-4">
            <div className="h-16 w-16 rounded-full overflow-hidden bg-gray-100">
              {profileImage ? (
                <Image
                  src={profileImage}
                  alt="Profile"
                  width={64}
                  height={64}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <Camera className="h-6 w-6 text-gray-400" />
                </div>
              )}
            </div>
            <div className="flex items-center space-x-3">
              {profileImage && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="text-sm font-bold leading-snug text-zinc-400 hover:text-zinc-500 cursor-pointer"
                >
                  Remove
                </button>
              )}
              <label
                htmlFor="photo-upload"
                className="text-sm font-bold leading-snug text-indigo-600 hover:text-indigo-700 cursor-pointer"
              >
                Update
                <input
                  id="photo-upload"
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                />
              </label>
            </div>
          </div>
        </div>

        {/* First & Last Name */}
        <div className="grid grid-cols-3 gap-4 items-center">
          <Label className="text-sm font-bold leading-snug text-black">
            First & Last Name
          </Label>
          <div className="col-span-2 grid grid-cols-2 gap-3">
            <Input
              type="text"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              placeholder="First name"
              className="h-12 sm:h-12 md:h-12 rounded-lg border-zinc-300 text-sm font-medium leading-tight text-zinc-900 placeholder:text-zinc-400"
            />
            <Input
              type="text"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              placeholder="Last name"
              className="h-12 sm:h-12 md:h-12 rounded-lg border-zinc-300 text-sm font-medium leading-tight text-zinc-900 placeholder:text-zinc-400"
            />
          </div>
        </div>

        {/* Email Address */}
        <div className="grid grid-cols-3 gap-4 items-center">
          <Label className="text-sm font-bold leading-snug text-black">
            Email Address
          </Label>
          <div className="col-span-2">
            <Input
              type="email"
              value={user.email || ''}
              disabled
              className="h-12 sm:h-12 md:h-12 rounded-lg border-zinc-300 bg-gray-50 text-sm font-medium leading-tight text-zinc-900"
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
            {isLoading ? 'Updating...' : 'Update'}
          </Button>
        </div>
      </div>
    </form>
  );
}
