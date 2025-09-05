import Image from 'next/image';
import { useCountAnimation } from '@/hooks/useCountAnimation';

type SocialProofType = 'pages' | 'users';

interface SocialProofProps {
  type?: SocialProofType;
  message?: string;
  pageCount?: number;
}

export function SocialProof({
  type = 'pages',
  message,
  pageCount = 15400,
}: SocialProofProps) {
  const userCount = 1200; // Hardcoded for now, could come from props or API later

  const displayUserCount = useCountAnimation({
    targetCount: userCount,
    enabled: type === 'users',
  });

  const displayPageCount = useCountAnimation({
    targetCount: pageCount,
    enabled: type === 'pages',
  });

  // Format number consistently to avoid hydration mismatch
  const formatNumber = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const getDefaultMessage = () => {
    if (type === 'users') {
      return 'Trusted by';
    }
    return 'Helping businesses launch over';
  };

  const renderMessage = () => {
    if (type === 'users') {
      return (
        <>
          {message || getDefaultMessage()}{' '}
          <span className="tabular-nums">{formatNumber(displayUserCount)}</span>
          + SEO agencies, in-house SEO teams, and affiliate marketers.
        </>
      );
    }
    return (
      <>
        {message || getDefaultMessage()}{' '}
        <span className="tabular-nums">{formatNumber(displayPageCount)}</span>+
        lead generation pages — with more pages going live every day.
      </>
    );
  };

  return (
    <div className="pt-8">
      <p className="text-xl font-semibold mb-6">{renderMessage()}</p>

      {/* Brand logos */}
      <div className="grid grid-cols-2 gap-6 opacity-60">
        <div className="flex items-center justify-center h-10">
          <Image
            src="/logos/betamark.svg"
            alt="Betamark"
            width={120}
            height={40}
            className="h-7 w-auto object-contain"
          />
        </div>
        <div className="flex items-center justify-center h-10">
          <Image
            src="/logos/salespitch.svg"
            alt="Salespitch"
            width={120}
            height={40}
            className="h-8 w-auto object-contain"
          />
        </div>
        <div className="flex items-center justify-center h-10">
          <Image
            src="/logos/plusgrowth.svg"
            alt="PLUSGROWTH"
            width={120}
            height={40}
            className="h-4 w-auto object-contain"
          />
        </div>
        <div className="flex items-center justify-center h-10">
          <Image
            src="/logos/robostellar.svg"
            alt="RoboStellar"
            width={120}
            height={40}
            className="h-7 w-auto object-contain"
          />
        </div>
        <div className="flex items-center justify-center h-10">
          <Image
            src="/logos/social-firm.svg"
            alt="SOCIALFIRM"
            width={120}
            height={40}
            className="h-7 w-auto object-contain"
          />
        </div>
        <div className="flex items-center justify-center h-10">
          <Image
            src="/logos/levity.svg"
            alt="LEVITY"
            width={120}
            height={40}
            className="h-7 w-auto object-contain"
          />
        </div>
      </div>
    </div>
  );
}
