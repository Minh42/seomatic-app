import { Suspense } from 'react';
import { ResetPasswordClient } from '@/components/auth/ResetPasswordClient';

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-lg">Loading...</div>
        </div>
      }
    >
      <ResetPasswordClient />
    </Suspense>
  );
}
