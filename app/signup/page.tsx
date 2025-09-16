import SignupPageClient from './SignupPageClient';

interface SignupPageProps {
  searchParams: Promise<{
    error?: string;
  }>;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;
  const error = params.error;

  return <SignupPageClient error={error} />;
}
