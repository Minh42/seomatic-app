'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';

type SocialAuthProps = {
  google: () => void;
  facebook: () => void;
  linkedin: () => void;
  twitter: () => void;
};

type AuthFormProps = {
  title: string;
  subtitle: string;
  error?: string | null;
  successMessage?: string | null;
  isLoading?: boolean;
  showSocialFirst?: boolean;
  onSocialAuth?: SocialAuthProps;
  bottomLink?: {
    text: string;
    linkText: string;
    href: string;
  };
  extraLinks?: Array<{
    text: string;
    href: string;
    onClick?: (e: React.MouseEvent) => void;
  }>;
  children: React.ReactNode;
};

function SocialAuthButtons({
  onSocialAuth,
  isLoading,
}: {
  onSocialAuth: SocialAuthProps;
  isLoading?: boolean;
}) {
  return (
    <div className="flex justify-center gap-3 sm:gap-4">
      <Button
        type="button"
        variant="outline"
        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white border-2 border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 p-0 cursor-pointer"
        onClick={onSocialAuth.google}
        disabled={isLoading}
        title="Continue with Google"
      >
        <svg className="w-6 h-6" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
      </Button>
      <Button
        type="button"
        variant="outline"
        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white border-2 border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 p-0 cursor-pointer"
        onClick={onSocialAuth.facebook}
        disabled={isLoading}
        title="Continue with Facebook"
      >
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#1877F2">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      </Button>
      <Button
        type="button"
        variant="outline"
        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white border-2 border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 p-0 cursor-pointer"
        onClick={onSocialAuth.linkedin}
        disabled={isLoading}
        title="Continue with LinkedIn"
      >
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#0A66C2">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      </Button>
      <Button
        type="button"
        variant="outline"
        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white border-2 border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 p-0 cursor-pointer"
        onClick={onSocialAuth.twitter}
        disabled={isLoading}
        title="Continue with X"
      >
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="black">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </Button>
    </div>
  );
}

export function AuthForm({
  title,
  subtitle,
  error,
  successMessage,
  isLoading,
  showSocialFirst,
  onSocialAuth,
  bottomLink,
  extraLinks,
  children,
}: AuthFormProps) {
  return (
    <div>
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-6">
          <Image
            src="/logos/seomatic.svg"
            alt="SEOmatic"
            width={140}
            height={40}
            className="h-8 w-auto"
            priority
          />
          <span className="ml-3 text-xl font-semibold">SEOmatic</span>
        </div>

        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-2">
          {title}
        </h2>
        <p className="text-sm md:text-base text-gray-600 leading-relaxed">
          {subtitle}
        </p>
      </div>

      {showSocialFirst && onSocialAuth && (
        <>
          <SocialAuthButtons
            onSocialAuth={onSocialAuth}
            isLoading={isLoading}
          />
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">or</span>
            </div>
          </div>
        </>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-3 rounded-md bg-green-50 border border-green-200">
          <p className="text-sm text-green-600">{successMessage}</p>
        </div>
      )}

      {children}

      {!showSocialFirst && onSocialAuth && (
        <>
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">or</span>
            </div>
          </div>
          <SocialAuthButtons
            onSocialAuth={onSocialAuth}
            isLoading={isLoading}
          />
        </>
      )}

      {extraLinks && extraLinks.length > 0 && (
        <div className="mt-4 text-center space-y-2">
          {extraLinks.map((link, index) => (
            <div key={index}>
              <a
                href={link.href}
                onClick={link.onClick}
                className="text-sm font-medium text-blue-600 hover:text-blue-500 cursor-pointer"
              >
                {link.text}
              </a>
            </div>
          ))}
        </div>
      )}

      {bottomLink && (
        <p className="mt-6 text-center text-sm text-gray-600">
          {bottomLink.text}{' '}
          <a
            href={bottomLink.href}
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            {bottomLink.linkText}
          </a>
        </p>
      )}
    </div>
  );
}
