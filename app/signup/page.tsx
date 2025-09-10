import { CheckoutService } from '@/lib/services/checkout-service';
import SignupPageClient from './SignupPageClient';

interface SignupPageProps {
  searchParams: Promise<{
    token?: string;
    stripeError?: string;
    error?: string;
  }>;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;
  const token = params.token;
  const stripeError = params.stripeError;
  const error = params.error;

  let checkoutSession = null;
  let sessionError = null;

  // Fetch checkout session if token is provided
  if (token) {
    checkoutSession = await CheckoutService.getSessionByToken(token);
  }

  // Validate session
  const validation = CheckoutService.validateSession(checkoutSession);
  if (!validation.isValid) {
    sessionError = validation.error;
  }

  // Handle error from OAuth callback
  if (error) {
    sessionError = error;
  }

  return (
    <SignupPageClient
      token={token}
      checkoutSession={checkoutSession}
      sessionError={sessionError}
      stripeError={stripeError === 'true'}
    />
  );
}
