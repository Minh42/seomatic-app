'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { ArrowLeftRight, Eye, EyeOff, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';

interface GhostConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  existingConnection?: {
    domain?: string;
    siteName?: string;
  };
  onSuccess?: () => void;
}

export function GhostConnectionModal({
  isOpen,
  onClose,
  workspaceId,
  existingConnection,
  onSuccess,
}: GhostConnectionModalProps) {
  const [domain, setDomain] = useState('');
  const [adminApiKey, setAdminApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [tokenValidated, setTokenValidated] = useState(false);
  const [, setSiteInfo] = useState<{ name?: string; url?: string } | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [hasExistingToken, setHasExistingToken] = useState(false);
  const [hasBlurred, setHasBlurred] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setDomain('');
      setAdminApiKey('');
      setSiteInfo(null);
      setTokenValidated(false);
      setError(null);
      setShowApiKey(false);
      setHasExistingToken(false);
      setHasBlurred(false);
      // Clear debounce timer
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    }
  }, [isOpen]);

  // Set existing values if editing
  useEffect(() => {
    if (existingConnection && isOpen) {
      // When editing, fetch the actual credentials
      fetchExistingCredentials();

      if (existingConnection.domain) {
        setDomain(existingConnection.domain);
      }
    }
  }, [existingConnection, isOpen]);

  // Fetch existing credentials (for editing)
  const fetchExistingCredentials = async () => {
    if (!existingConnection || !workspaceId) return;

    setIsValidating(true);
    try {
      // Fetch the actual credentials
      const credResponse = await fetch('/api/connections/ghost/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
        }),
      });

      const credData = await credResponse.json();

      if (credData.success) {
        // Set the actual token and domain
        if (credData.adminApiKey) {
          setAdminApiKey(credData.adminApiKey);
          setHasExistingToken(true);
        }
        if (credData.domain) {
          setDomain(credData.domain);
        }
        if (credData.siteName) {
          setSiteInfo({
            name: credData.siteName,
            url: `https://${credData.domain}`,
          });
          setTokenValidated(true);
        }
      }
    } catch (error) {
      console.error('Failed to fetch credentials:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const isValidDomainFormat = (domain: string): boolean => {
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
  };

  const handleValidateToken = async (
    key?: string,
    domainToUse?: string,
    showErrorToast = false
  ) => {
    const keyToValidate = key || adminApiKey.trim();
    const domainToValidate = domainToUse || domain.trim();

    if (!keyToValidate || !domainToValidate) {
      if (showErrorToast) {
        toast.error('Please enter both API URL and Admin API key');
      }
      return;
    }

    // Validate domain format
    if (!isValidDomainFormat(domainToValidate)) {
      if (showErrorToast) {
        toast.error('Please enter a valid API URL (e.g., yoursite.ghost.io)');
      }
      return;
    }

    // Don't validate if already validating
    if (isValidating) {
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      const response = await fetch('/api/connections/ghost/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: domainToValidate,
          adminApiKey: keyToValidate,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        const errorMessage =
          data.error || 'Failed to validate Ghost credentials';
        if (showErrorToast) {
          toast.error(errorMessage);
        } else {
          setError(errorMessage);
        }
        setTokenValidated(false);
        setSiteInfo(null);
        return;
      }

      // Set site info from validation response
      setSiteInfo({
        name: data.siteName,
        url: data.siteUrl,
      });
      setTokenValidated(true);
    } catch {
      const errorMessage = 'Failed to connect to Ghost. Please try again.';
      if (showErrorToast) {
        toast.error(errorMessage);
      } else {
        setError(errorMessage);
      }
      setTokenValidated(false);
      setSiteInfo(null);
    } finally {
      setIsValidating(false);
    }
  };

  // Clean and check domain format
  const cleanDomain = domain.replace(/^https?:\/\//, '').trim();
  const isValidFormat = isValidDomainFormat(cleanDomain);
  const showFormatError = hasBlurred && !isValidFormat && domain.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidFormat) {
      setError('Please enter a valid API URL (e.g., yoursite.ghost.io)');
      setHasBlurred(true);
      return;
    }

    // Validate if not already validated
    if (!tokenValidated) {
      await handleValidateToken();
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const response = await fetch('/api/connections/ghost/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          domain: domain.trim(),
          adminApiKey: adminApiKey.trim(),
          isUpdate: !!existingConnection, // Flag to indicate this is an update
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to create connection');
        return;
      }

      toast.success('Ghost connection established successfully');
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch {
      setError('Failed to create connection. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-50" onClick={onClose} />

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
                <div className="w-12 h-12 relative flex items-center justify-center">
                  <Image
                    src="/logos/cms/seomatic.svg"
                    alt="SEOmatic"
                    width={48}
                    height={48}
                    className="object-contain"
                  />
                </div>
                <ArrowLeftRight className="h-5 w-5 text-gray-400" />
                <div className="w-12 h-12 relative flex items-center justify-center">
                  <Image
                    src="/logos/cms/ghost.svg"
                    alt="Ghost"
                    width={48}
                    height={48}
                    className="object-contain"
                  />
                </div>
              </div>

              {/* Title */}
              <div className="text-center mb-2">
                <h2 className="text-xl font-bold text-gray-900">
                  {existingConnection
                    ? 'Update Ghost Connection'
                    : 'Connect SEOmatic to Ghost'}
                </h2>
              </div>

              {/* Subtitle */}
              <div className="text-center">
                <p className="text-sm text-gray-500">
                  {existingConnection
                    ? 'Update your Ghost connection settings'
                    : "Let's establish a connection to Ghost"}
                </p>
              </div>
            </div>

            {/* Form section - white background */}
            <div className="px-8 pb-8 pt-4 bg-white">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* API URL Input */}
                <div>
                  <label
                    htmlFor="domain"
                    className="block text-sm font-bold text-zinc-900 leading-relaxed mb-2"
                  >
                    API URL
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
                        const newDomain = e.target.value;
                        setDomain(newDomain);
                        setTokenValidated(false);
                        setError(null);
                        setHasBlurred(false); // Reset blur state when typing

                        // Clear existing timer
                        if (debounceTimer.current) {
                          clearTimeout(debounceTimer.current);
                        }

                        // Set new timer for auto-validation if both fields have values
                        if (newDomain.trim() && adminApiKey.trim()) {
                          debounceTimer.current = setTimeout(() => {
                            handleValidateToken(adminApiKey, newDomain, true);
                          }, 1500); // Wait 1.5 seconds after typing stops
                        }
                      }}
                      onBlur={() => setHasBlurred(true)}
                      placeholder="yoursite.ghost.io"
                      className={`flex-1 h-12 px-3 border rounded-r-md text-sm font-medium placeholder:text-zinc-400 placeholder:font-normal focus:outline-none ${
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
                      Please enter a valid API URL (e.g., yoursite.ghost.io)
                    </p>
                  )}
                </div>

                {/* Admin API Key Input */}
                <div>
                  <label
                    htmlFor="adminApiKey"
                    className="block text-sm font-bold text-zinc-900 leading-relaxed mb-2"
                  >
                    Admin API Key
                  </label>
                  <div className="relative">
                    <input
                      id="adminApiKey"
                      type={showApiKey ? 'text' : 'password'}
                      value={adminApiKey}
                      onChange={e => {
                        const newKey = e.target.value;

                        setAdminApiKey(newKey);

                        // If user modifies the existing token, we need to revalidate
                        if (hasExistingToken) {
                          setHasExistingToken(false);
                          setTokenValidated(false);
                        }

                        setError(null);

                        // Clear existing timer
                        if (debounceTimer.current) {
                          clearTimeout(debounceTimer.current);
                        }

                        // Set new timer for auto-validation if both fields have values
                        if (
                          newKey.trim() &&
                          domain.trim() &&
                          !hasExistingToken
                        ) {
                          debounceTimer.current = setTimeout(() => {
                            handleValidateToken(newKey, domain, true);
                          }, 1500); // Wait 1.5 seconds after typing stops
                        } else if (!newKey.trim()) {
                          setSiteInfo(null);
                          setTokenValidated(false);
                        }
                      }}
                      placeholder="65b38edf8ff4a50001326c0b:64f258ab02098660e47ca0b9"
                      className={`w-full h-12 px-3 pr-10 border rounded-md text-sm font-medium placeholder:text-zinc-400 placeholder:font-normal focus:outline-none ${
                        error && !tokenValidated
                          ? 'border-red-500 focus:border-red-600'
                          : 'border-zinc-300 focus:border-zinc-400'
                      }`}
                      required
                      disabled={isValidating || isConnecting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showApiKey ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  {/* Help Tooltip - only show when token not validated */}
                  {!tokenValidated && (
                    <div className="mt-2">
                      <div className="relative inline-block">
                        <button
                          type="button"
                          onMouseEnter={() => {
                            if (tooltipTimeoutRef.current) {
                              clearTimeout(tooltipTimeoutRef.current);
                            }
                            setShowTooltip(true);
                          }}
                          onMouseLeave={() => {
                            tooltipTimeoutRef.current = setTimeout(() => {
                              setShowTooltip(false);
                            }, 100);
                          }}
                          onClick={() => setShowTooltip(!showTooltip)}
                          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          <HelpCircle className="h-3.5 w-3.5" />
                          <span>How to get your Admin API key</span>
                        </button>

                        {/* Tooltip */}
                        {showTooltip && (
                          <div
                            className="absolute z-10 bottom-full left-0 mb-2 w-72 bg-white border border-gray-200 text-gray-700 text-xs rounded-lg shadow-xl"
                            onMouseEnter={() => {
                              if (tooltipTimeoutRef.current) {
                                clearTimeout(tooltipTimeoutRef.current);
                              }
                            }}
                            onMouseLeave={() => {
                              setShowTooltip(false);
                            }}
                          >
                            <div className="max-h-64 overflow-y-auto p-3 space-y-2">
                              <div>
                                <p className="font-semibold mb-1">Steps:</p>
                                <ol className="space-y-0.5 list-decimal list-inside">
                                  <li>Go to your Ghost admin panel</li>
                                  <li>Navigate to Settings → Integrations</li>
                                  <li>
                                    Click &quot;Add custom integration&quot;
                                  </li>
                                  <li>
                                    Give it a name (e.g., &quot;SEOmatic&quot;)
                                  </li>
                                  <li>Copy the Admin API Key</li>
                                  <li>Paste the key here</li>
                                </ol>
                              </div>
                              <div className="border-l-2 border-amber-400 pl-2">
                                <p className="text-amber-600 font-medium">
                                  Requirements:
                                </p>
                                <ul className="text-amber-600 mt-1 space-y-0.5 list-disc list-inside">
                                  <li>Administrator access to Ghost</li>
                                  <li>Ghost version 5.0 or higher</li>
                                </ul>
                              </div>
                              <div className="mt-2 pt-2 border-t border-gray-200">
                                <a
                                  href="https://docs.seomatic.ai/integrations/7Me35UUvTEqmQNRxyWy6Ke/connect-ghost/rsKhKTK3iccXNYU23bLr49"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-indigo-600 hover:text-indigo-700 font-medium cursor-pointer"
                                >
                                  Read full documentation →
                                </a>
                              </div>
                            </div>
                            {/* Tooltip arrow */}
                            <div className="absolute top-full left-4 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-white"></div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Error Message */}
                {error && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
                    {error}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="h-11 px-6 border border-gray-300 rounded text-sm font-bold leading-relaxed text-gray-700 bg-white hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      !domain || !adminApiKey || !tokenValidated || isConnecting
                    }
                    className="h-11 px-6 text-white rounded text-sm font-bold leading-relaxed transition-colors disabled:bg-zinc-300 disabled:cursor-not-allowed bg-indigo-600 hover:bg-indigo-700 cursor-pointer"
                  >
                    {isConnecting
                      ? existingConnection
                        ? 'Updating...'
                        : 'Connecting...'
                      : existingConnection
                        ? 'Update Connection'
                        : 'Connect'}
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
