'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface InvitationData {
  email: string;
  role: string;
  organizationName: string;
  inviterName: string;
  expiresAt: string;
}

export default function InvitePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();
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
      } catch (err) {
        setError('Failed to validate invitation. Please try again.');
        console.error('Invitation validation error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    validateInvitation();
  }, [token]);

  const handleAcceptInvitation = async () => {
    if (!token || !invitation) return;

    // Check for email mismatch before attempting
    if (
      session?.user?.email &&
      session.user.email.toLowerCase() !== invitation.email.toLowerCase()
    ) {
      setError(
        `This invitation is for ${invitation.email}. You are currently logged in as ${session.user.email}. Please log out and sign in with the correct account.`
      );
      return;
    }

    setIsAccepting(true);
    setError(null);

    try {
      // Check if user is logged in
      if (!session) {
        // Store invitation token in session storage for after login/signup
        sessionStorage.setItem('pendingInvitation', token);
        router.push(`/signup?email=${encodeURIComponent(invitation.email)}`);
        return;
      }

      // User is logged in, accept the invitation
      const response = await fetch('/api/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to accept invitation');
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err) {
      setError('Failed to accept invitation. Please try again.');
      console.error('Accept invitation error:', err);
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
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
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
                <strong>{invitation.inviterName}</strong> has invited you to
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

              {session?.user?.email &&
                session.user.email.toLowerCase() !==
                  invitation.email.toLowerCase() && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Email mismatch!</strong> You&apos;re logged in as{' '}
                      <strong>{session.user.email}</strong>, but this invitation
                      is for <strong>{invitation.email}</strong>.
                      <br />
                      <br />
                      For security reasons, you must log in with the correct
                      account to accept this invitation.
                    </AlertDescription>
                  </Alert>
                )}

              <div className="space-y-3">
                {session?.user?.email &&
                session.user.email.toLowerCase() !==
                  invitation.email.toLowerCase() ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={async () => {
                        // Sign out and redirect to login with the invitation email
                        await signOut({
                          callbackUrl: `/login?email=${encodeURIComponent(invitation.email)}`,
                        });
                      }}
                      className="w-full"
                    >
                      Switch Account
                    </Button>
                    <p className="text-sm text-gray-500 text-center">
                      You need to switch to {invitation.email} to accept this
                      invitation
                    </p>
                  </>
                ) : (
                  <Button
                    onClick={handleAcceptInvitation}
                    disabled={isAccepting}
                    className="w-full"
                  >
                    {isAccepting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Accepting...
                      </>
                    ) : session ? (
                      'Accept Invitation'
                    ) : (
                      'Sign up & Accept'
                    )}
                  </Button>
                )}

                {session &&
                  session.user.email?.toLowerCase() ===
                    invitation.email.toLowerCase() && (
                    <Button
                      variant="outline"
                      onClick={() => router.push('/dashboard')}
                      className="w-full"
                    >
                      Cancel
                    </Button>
                  )}
              </div>

              <p className="text-xs text-gray-500 mt-4">
                This invitation expires on{' '}
                {new Date(invitation.expiresAt).toLocaleDateString()}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
