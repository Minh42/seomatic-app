import { Suspense } from 'react';
import { ForgotPasswordClient } from '@/components/auth/ForgotPasswordClient';

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-lg">Loading...</div>
        </div>
      }
    >
      <ForgotPasswordClient />
    </Suspense>
  );
}
