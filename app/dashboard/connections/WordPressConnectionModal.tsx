'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  ArrowLeftRight,
  ChevronDown,
  ChevronUp,
  Info,
  Eye,
  EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';

interface WordPressConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  existingDomain?: string;
  onSuccess?: () => void;
}

export function WordPressConnectionModal({
  isOpen,
  onClose,
  workspaceId,
  existingDomain,
  onSuccess,
}: WordPressConnectionModalProps) {
  const [domain, setDomain] = useState(existingDomain || '');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasBlurred, setHasBlurred] = useState(false);
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);
  const [isCredentialsExpanded, setIsCredentialsExpanded] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Update domain when existingDomain changes
  useEffect(() => {
    if (existingDomain) {
      setDomain(existingDomain);
    }
  }, [existingDomain]);

  if (!isOpen) return null;

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

  // Clean and check domain format
  const cleanDomain = domain.replace(/^https?:\/\//, '').trim();
  const isValidFormat = isValidDomainFormat(cleanDomain);
  const showFormatError = hasBlurred && !isValidFormat && domain.length > 0;

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
        body: JSON.stringify({
          domain: cleanDomain,
          username: username.trim(),
          password: password,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        // Show specific message for HTTP Basic Auth
        if (data.error?.includes('HTTP Basic Authentication')) {
          toast.error(
            'This site is protected by HTTP Basic Authentication. Please disable it temporarily or contact your hosting provider.'
          );
        } else {
          toast.error(data.error);
        }
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
          body: JSON.stringify({
            workspaceId,
            domain: cleanDomain,
            username: username.trim(),
            password: password,
          }),
        }
      );

      const connectData = await connectResponse.json();

      if (!connectData.success) {
        toast.error(connectData.error);
        setIsConnecting(false);
        return;
      }

      // Redirect to WordPress for authorization if no credentials provided
      if (connectData.authUrl) {
        window.location.href = connectData.authUrl;
      } else {
        // Direct connection successful (with credentials)
        toast.success('WordPress connection established successfully');
        if (onSuccess) {
          onSuccess();
        } else {
          // Reload the page to show the connection
          window.location.reload();
        }
      }
    } catch {
      toast.error('Failed to connect. Please try again.');
      setIsValidating(false);
      setIsConnecting(false);
    }
  };

  const handleClose = () => {
    if (!existingDomain) {
      setDomain('');
    }
    setUsername('');
    setPassword('');
    setError(null);
    setHasBlurred(false);
    setIsCredentialsExpanded(false);
    setShowPassword(false);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-50" onClick={handleClose} />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div
          className="bg-white rounded-xl shadow-xl w-full max-w-lg relative max-h-[90vh] overflow-hidden flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Content */}
          <div className="relative overflow-y-auto">
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
                  {existingDomain
                    ? 'Update WordPress Connection'
                    : 'Connect SEOmatic to WordPress'}
                </h2>
              </div>

              {/* Subtitle */}
              <div className="text-center">
                <p className="text-sm text-gray-500">
                  {existingDomain
                    ? 'Update your WordPress connection credentials'
                    : 'Let\u0027s establish a connection to WordPress'}
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
                        if (!existingDomain) {
                          setDomain(e.target.value);
                          setError(null);
                          setHasBlurred(false); // Reset blur state when typing
                        }
                      }}
                      onBlur={() => setHasBlurred(true)}
                      placeholder="mydomain.com"
                      className={`flex-1 h-12 px-3 border rounded-r-md text-sm font-medium leading-tight placeholder:text-zinc-400 placeholder:font-medium focus:outline-none ${
                        existingDomain ? 'bg-gray-50' : 'bg-white'
                      } ${
                        showFormatError || error
                          ? 'border-red-500 focus:border-red-600'
                          : 'border-zinc-300 focus:border-zinc-400'
                      }`}
                      required
                      disabled={
                        isValidating || isConnecting || !!existingDomain
                      }
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
                      style={{ cursor: 'pointer' }}
                    >
                      <Info className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="text-left">
                        We&apos;ll redirect you to your WordPress site to create
                        an application password and authorize the connection
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
                            <li>Self-hosted WordPress (WordPress.org)</li>
                            <li>WordPress 5.6 or higher</li>
                            <li>Administrator or Editor permissions</li>
                            <li>Application Passwords enabled</li>
                            <li>
                              REST API accessible (check security plugins like
                              Wordfence)
                            </li>
                            <li>
                              If using Cloudflare, allow /wp-json/* endpoints
                            </li>
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

                {/* Optional WordPress Credentials */}
                <div>
                  <button
                    type="button"
                    onClick={() =>
                      setIsCredentialsExpanded(!isCredentialsExpanded)
                    }
                    className="flex items-center justify-between w-full text-left py-3 border-t border-b border-gray-200 group hover:bg-gray-50 transition-colors"
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="flex items-center gap-2">
                      <div>
                        <span className="text-sm font-medium text-gray-700">
                          If your WordPress is protected with Basic
                          Authentication, please enter your credentials here
                        </span>
                      </div>
                    </div>
                    {isCredentialsExpanded ? (
                      <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0 ml-2" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0 ml-2" />
                    )}
                  </button>

                  {isCredentialsExpanded && (
                    <div className="pt-4 space-y-4">
                      <div>
                        <label
                          htmlFor="username"
                          className="block text-sm font-bold text-zinc-900 mb-2"
                        >
                          Username
                        </label>
                        <input
                          id="username"
                          type="text"
                          value={username}
                          onChange={e => setUsername(e.target.value)}
                          placeholder="user123"
                          className="w-full h-12 px-3 border border-zinc-300 rounded-md text-sm font-medium placeholder:text-zinc-400 placeholder:font-normal focus:outline-none focus:border-zinc-400 bg-white"
                          disabled={isValidating || isConnecting}
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="password"
                          className="block text-sm font-bold text-zinc-900 mb-2"
                        >
                          Password
                        </label>
                        <div className="relative">
                          <input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="securePassword!"
                            className="w-full h-12 px-3 pr-10 border border-zinc-300 rounded-md text-sm font-medium placeholder:text-zinc-400 placeholder:font-normal focus:outline-none focus:border-zinc-400 bg-white"
                            disabled={isValidating || isConnecting}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                            tabIndex={-1}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="text-xs text-gray-600 space-y-1 mt-3">
                        <p className="flex items-start">
                          <span className="text-green-600 mr-1">✓</span>
                          <span>
                            Your credentials will be encrypted and stored
                            securely
                          </span>
                        </p>
                        <p className="flex items-start">
                          <span className="text-green-600 mr-1">✓</span>
                          <span>You can update or remove them anytime</span>
                        </p>
                        <p className="flex items-start">
                          <span className="text-amber-600 mr-1">⚠</span>
                          <span>Less secure than Application Passwords</span>
                        </p>
                      </div>
                    </div>
                  )}
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
                        ? existingDomain
                          ? 'Updating...'
                          : 'Connecting...'
                        : existingDomain
                          ? 'Update Connection'
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
