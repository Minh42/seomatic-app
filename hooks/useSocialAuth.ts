import { signIn } from 'next-auth/react';

export function useSocialAuth(callbackUrl: string = '/onboarding') {
  return {
    google: () => signIn('google', { callbackUrl }),
    facebook: () => signIn('facebook', { callbackUrl }),
    linkedin: () => signIn('linkedin', { callbackUrl }),
    twitter: () => signIn('twitter', { callbackUrl }),
  };
}
