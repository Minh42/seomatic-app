import { redirect } from 'next/navigation';
import { CheckoutService } from '@/lib/services/checkout-service';
import SignupPageClient from './SignupPageClient';

interface SignupPageProps {
  searchParams: Promise<{
    token?: string;
  }>;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;
  const token = params.token;

  // Redirect to pricing if no token provided
  if (!token) {
    redirect('https://seomatic.ai/pricing');
  }

  let checkoutSession = null;
  let sessionError = null;

  // Fetch checkout session
  checkoutSession = await CheckoutService.getSessionByToken(token);

  // Validate session
  const validation = CheckoutService.validateSession(checkoutSession);
  if (!validation.isValid) {
    sessionError = validation.error;
  }

  return (
    <SignupPageClient
      token={token}
      checkoutSession={checkoutSession}
      sessionError={sessionError}
    />
  );
}
