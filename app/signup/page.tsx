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

  let checkoutSession = null;

  // Fetch checkout session if token is provided
  if (token) {
    checkoutSession = await CheckoutService.getSessionByToken(token);
  }

  return (
    <SignupPageClient
      token={token}
      checkoutSession={checkoutSession}
      stripeError={stripeError === 'true'}
    />
  );
}
