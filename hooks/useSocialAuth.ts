import { signIn } from 'next-auth/react';

export function useSocialAuth(
  callbackUrl: string = '/dashboard',
  token?: string
) {
  // If token is provided, redirect to oauth-callback to handle subscription
  // Otherwise, use the provided callback URL
  const finalCallbackUrl = token
    ? `/api/auth/oauth-callback?token=${encodeURIComponent(token)}`
    : callbackUrl;

  return {
    google: () => signIn('google', { callbackUrl: finalCallbackUrl }),
    facebook: () => signIn('facebook', { callbackUrl: finalCallbackUrl }),
    linkedin: () => signIn('linkedin', { callbackUrl: finalCallbackUrl }),
    twitter: () => signIn('twitter', { callbackUrl: finalCallbackUrl }),
  };
}
