'use client';

import { Session } from 'next-auth';
import { signOut } from 'next-auth/react';

interface DashboardClientProps {
  session: Session;
}

export function DashboardClient({ session }: DashboardClientProps) {
  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="bg-white shadow-sm border rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Dashboard</h1>

        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">
              Welcome back!
            </h2>
            <p className="text-gray-600">
              You have successfully completed onboarding and are ready to start
              using SEOmatic.
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-md">
            <h3 className="font-medium text-gray-800 mb-2">
              Account Information:
            </h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>
                <span className="font-medium">Email:</span>{' '}
                {session.user?.email}
              </p>
              <p>
                <span className="font-medium">Name:</span>{' '}
                {session.user?.name || 'Not set'}
              </p>
              <p>
                <span className="font-medium">User ID:</span> {session.user?.id}
              </p>
            </div>
          </div>

          <div className="pt-4">
            <button
              onClick={handleSignOut}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
