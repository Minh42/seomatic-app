import { Suspense } from 'react';
import { AuthErrorClient } from '@/components/auth/AuthErrorClient';

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-lg">Loading...</div>
        </div>
      }
    >
      <AuthErrorClient />
    </Suspense>
  );
}
