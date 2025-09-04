import { Suspense } from 'react';
import { VerifyRequestClient } from '@/components/auth/VerifyRequestClient';

export default function VerifyRequestPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-lg">Loading...</div>
        </div>
      }
    >
      <VerifyRequestClient />
    </Suspense>
  );
}
