'use client';

import { signOut } from 'next-auth/react';

interface SignOutButtonProps {
  callbackUrl?: string;
  className?: string;
  children?: React.ReactNode;
}

export function SignOutButton({
  callbackUrl = '/login',
  className = '',
  children = 'Sign out',
}: SignOutButtonProps) {
  const handleSignOut = async () => {
    await signOut({ callbackUrl });
  };

  return (
    <button onClick={handleSignOut} className={className}>
      {children}
    </button>
  );
}
