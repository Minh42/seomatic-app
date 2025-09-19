'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface InvitationData {
  email: string;
  role: string;
  organizationName: string;
  inviterEmail: string;
  expiresAt: string;
}

export default function InvitePage() {
  const searchParams = useSearchParams();
  const { status } = useSession();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Validate invitation token on mount
  useEffect(() => {
    if (!token) {
      setError(
        'Invalid invitation link. Please check your email for the correct link.'
      );
      setIsLoading(false);
      return;
    }

    const validateInvitation = async () => {
      try {
        const response = await fetch('/api/invite/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Invalid or expired invitation');
          return;
        }

        setInvitation(data.invitation);
      } catch {
        setError('Failed to validate invitation. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    validateInvitation();
  }, [token]);

  const handleJoinTeam = async () => {
    if (!token || !invitation) return;

    setIsAccepting(true);
    setError(null);

    try {
      // Use the new magic link join endpoint
      const response = await fetch('/api/invite/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to join team');
        return;
      }

      // If successful, redirect to the magic link URL
      // The backend has created/validated the user and accepted the invitation
      if (data.magicLinkUrl) {
        setSuccess(true);
        setTimeout(() => {
          // Redirect to the magic link URL which will authenticate the user
          window.location.href = data.magicLinkUrl;
        }, 1500);
      } else {
        setError('Failed to generate authentication link. Please try again.');
      }
    } catch {
      setError('Failed to join team. Please try again.');
    } finally {
      setIsAccepting(false);
    }
  };

  if (isLoading || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Validating invitation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Logo */}
          <div className="flex items-center justify-center mb-6">
            <Image
              src="/logos/seomatic.svg"
              alt="SEOmatic"
              width={32}
              height={32}
              className="w-8 h-8 mr-2"
            />
            <span className="text-xl font-semibold">SEOmatic</span>
          </div>

          {error ? (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold mb-4">Invitation Error</h1>
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              <Link href="/login">
                <Button variant="outline" className="w-full">
                  Go to Login
                </Button>
              </Link>
            </div>
          ) : success ? (
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-2">Invitation Accepted!</h1>
              <p className="text-gray-600 mb-4">
                You&apos;ve successfully joined the workspace. Redirecting to
                dashboard...
              </p>
            </div>
          ) : invitation ? (
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-2">You&apos;re Invited!</h1>
              <p className="text-gray-600 mb-6">
                <strong>{invitation.inviterEmail}</strong> has invited you to
                join
              </p>

              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-600 mb-1">Organization</p>
                <p className="font-semibold text-lg mb-3">
                  {invitation.organizationName}
                </p>

                <p className="text-sm text-gray-600 mb-1">Your Role</p>
                <p className="font-medium capitalize">{invitation.role}</p>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleJoinTeam}
                  disabled={isAccepting}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                  size="lg"
                >
                  {isAccepting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    `Join ${invitation.organizationName}`
                  )}
                </Button>
              </div>

              <p className="text-xs text-gray-500 mt-4">
                This invitation expires on{' '}
                {new Date(invitation.expiresAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
