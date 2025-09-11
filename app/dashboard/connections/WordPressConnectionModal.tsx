'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ArrowLeftRight, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { toast } from 'sonner';

interface WordPressConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
}

export function WordPressConnectionModal({
  isOpen,
  onClose,
  workspaceId,
}: WordPressConnectionModalProps) {
  const [domain, setDomain] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasBlurred, setHasBlurred] = useState(false);
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);

  if (!isOpen) return null;

  // Clean and check domain format
  const cleanDomain = domain.replace(/^https?:\/\//, '').trim();
  const isValidFormat = isValidDomainFormat(cleanDomain);
  const showFormatError = hasBlurred && !isValidFormat && domain.length > 0;

  function isValidDomainFormat(domain: string): boolean {
    if (!domain) return false;

    // Basic domain validation regex
    const domainRegex =
      /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;

    // Must have at least one dot (e.g., example.com)
    if (!domain.includes('.') || !domainRegex.test(domain)) {
      return false;
    }

    // Check for valid TLD length (2-63 characters after last dot)
    const parts = domain.split('.');
    const tld = parts[parts.length - 1];
    if (tld.length < 2 || tld.length > 63) {
      return false;
    }

    return true;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidFormat) {
      setError('Please enter a valid domain name (e.g., example.com)');
      setHasBlurred(true);
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      // Validate with WordPress API
      const response = await fetch('/api/connections/wordpress/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: cleanDomain }),
      });

      const data = await response.json();

      if (!data.success) {
        toast.error(data.error);
        setIsValidating(false);
        return;
      }

      if (!data.applicationPasswordsEnabled) {
        toast.error(
          'Application Passwords must be enabled in WordPress settings'
        );
        setIsValidating(false);
        return;
      }

      setIsValidating(false);

      // Now connect
      setIsConnecting(true);

      const connectResponse = await fetch(
        '/api/connections/wordpress/connect',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workspaceId, domain: cleanDomain }),
        }
      );

      const connectData = await connectResponse.json();

      if (!connectData.success) {
        toast.error(connectData.error);
        setIsConnecting(false);
        return;
      }

      // Redirect to WordPress for authorization
      if (connectData.authUrl) {
        console.log('Redirecting to WordPress auth URL:', connectData.authUrl);
        window.location.href = connectData.authUrl;
      }
    } catch {
      toast.error('Failed to connect. Please try again.');
      setIsValidating(false);
      setIsConnecting(false);
    }
  };

  const handleClose = () => {
    setDomain('');
    setError(null);
    setHasBlurred(false);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-50" onClick={handleClose} />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div
          className="bg-white rounded-xl shadow-xl w-full max-w-lg relative overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Content */}
          <div className="relative">
            {/* Upper section with gradient background */}
            <div
              className="relative px-8 pt-12 pb-2"
              style={{
                backgroundImage: 'url(/background/gradiant.png)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              {/* Header with Logos */}
              <div className="flex items-center justify-center gap-3 mb-6">
                <div className="w-12 h-12 relative">
                  <Image
                    src="/logos/cms/seomatic.svg"
                    alt="SEOmatic"
                    width={48}
                    height={48}
                    className="object-contain"
                  />
                </div>
                <ArrowLeftRight className="h-5 w-5 text-gray-400" />
                <div className="w-12 h-12 relative">
                  <Image
                    src="/logos/cms/wordpress.svg"
                    alt="WordPress"
                    width={48}
                    height={48}
                    className="object-contain"
                  />
                </div>
              </div>

              {/* Title */}
              <div className="text-center mb-2">
                <h2 className="text-xl font-bold text-gray-900">
                  Connect SEOmatic to WordPress
                </h2>
              </div>

              {/* Subtitle */}
              <div className="text-center">
                <p className="text-sm text-gray-500">
                  Let&apos;s establish a connection to WordPress
                </p>
              </div>
            </div>

            {/* Form section - white background */}
            <div className="px-8 pb-8 pt-4 bg-white">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="domain"
                    className="block text-sm font-bold text-zinc-900 leading-relaxed mb-2"
                  >
                    Domain name
                  </label>
                  <div className="flex">
                    <div
                      className={`flex items-center px-3 bg-gray-50 border border-r-0 rounded-l-md ${
                        showFormatError || error
                          ? 'border-red-500'
                          : 'border-zinc-300'
                      }`}
                    >
                      <span className="text-sm font-medium text-zinc-900 leading-tight">
                        https://
                      </span>
                    </div>
                    <input
                      id="domain"
                      type="text"
                      value={domain}
                      onChange={e => {
                        setDomain(e.target.value);
                        setError(null);
                        setHasBlurred(false); // Reset blur state when typing
                      }}
                      onBlur={() => setHasBlurred(true)}
                      placeholder="mydomain.com"
                      className={`flex-1 h-12 px-3 bg-white border rounded-r-md text-sm font-medium leading-tight placeholder:text-zinc-400 placeholder:font-medium focus:outline-none ${
                        showFormatError || error
                          ? 'border-red-500 focus:border-red-600'
                          : 'border-zinc-300 focus:border-zinc-400'
                      }`}
                      required
                      disabled={isValidating || isConnecting}
                    />
                  </div>
                  {showFormatError && (
                    <p className="text-xs text-red-600 mt-2">
                      Please enter a valid domain name (e.g., example.com)
                    </p>
                  )}
                  {error && !showFormatError && (
                    <p className="text-xs text-red-600 mt-2">{error}</p>
                  )}
                </div>

                {/* Authorization Info */}
                <div>
                  <div className="mb-3">
                    <button
                      type="button"
                      onClick={() => setIsInfoExpanded(!isInfoExpanded)}
                      className="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      <Info className="h-3.5 w-3.5" />
                      <span>
                        We&apos;ll redirect you to your WordPress site to
                        authorize the connection
                      </span>
                      {isInfoExpanded ? (
                        <ChevronUp className="h-3.5 w-3.5 ml-auto" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5 ml-auto" />
                      )}
                    </button>

                    {isInfoExpanded && (
                      <div className="mt-2 pl-5 space-y-2">
                        <ol className="text-xs text-gray-500 space-y-1 list-decimal list-inside">
                          <li>
                            You&apos;ll be redirected to your WordPress admin
                            panel
                          </li>
                          <li>Log in if you&apos;re not already logged in</li>
                          <li>Approve the Application Password for SEOmatic</li>
                          <li>
                            You&apos;ll be redirected back here automatically
                          </li>
                        </ol>
                        <div className="border-l-2 border-amber-400 pl-2">
                          <p className="text-xs text-amber-600 font-medium">
                            Requirements:
                          </p>
                          <ul className="text-xs text-amber-600 mt-1 space-y-0.5 list-disc list-inside">
                            <li>WordPress 5.6 or higher</li>
                            <li>Administrator or Editor permissions</li>
                            <li>Application Passwords enabled</li>
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="relative w-full rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                    <Image
                      src="/screens/authorize.avif"
                      alt="WordPress authorization screen"
                      width={500}
                      height={200}
                      className="w-full h-auto"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="h-11 px-6 border border-gray-300 rounded text-sm font-bold leading-relaxed text-gray-700 bg-white hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      !domain || !isValidFormat || isConnecting || isValidating
                    }
                    className="h-11 px-6 text-white rounded text-sm font-bold leading-relaxed transition-colors disabled:bg-zinc-300 disabled:cursor-not-allowed bg-indigo-600 hover:bg-indigo-700 cursor-pointer"
                  >
                    {isValidating
                      ? 'Validating...'
                      : isConnecting
                        ? 'Connecting...'
                        : 'Continue'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
