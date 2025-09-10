import { signIn } from 'next-auth/react';

export function useSocialAuth(
  callbackUrl: string = '/dashboard',
  token?: string
) {
  // If token is provided, append it to the callback URL
  const finalCallbackUrl = token
    ? `${callbackUrl}?token=${encodeURIComponent(token)}`
    : callbackUrl;

  return {
    google: () => signIn('google', { callbackUrl: finalCallbackUrl }),
    facebook: () => signIn('facebook', { callbackUrl: finalCallbackUrl }),
    linkedin: () => signIn('linkedin', { callbackUrl: finalCallbackUrl }),
    twitter: () => signIn('twitter', { callbackUrl: finalCallbackUrl }),
  };
}
