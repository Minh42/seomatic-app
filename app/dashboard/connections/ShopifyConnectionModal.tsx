'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { ArrowLeftRight, Eye, EyeOff, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ShopifyConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  existingConnection?: {
    storeDomain?: string;
    shopName?: string;
  };
  onSuccess?: () => void;
}

export function ShopifyConnectionModal({
  isOpen,
  onClose,
  workspaceId,
  existingConnection,
  onSuccess,
}: ShopifyConnectionModalProps) {
  const [storeDomain, setStoreDomain] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [tokenValidated, setTokenValidated] = useState(false);
  const [, setShopInfo] = useState<{ name?: string; domain?: string } | null>(
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
      setStoreDomain('');
      setAccessToken('');
      setShopInfo(null);
      setTokenValidated(false);
      setError(null);
      setShowToken(false);
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

      if (existingConnection.storeDomain) {
        setStoreDomain(existingConnection.storeDomain);
      }
    }
  }, [existingConnection, isOpen]);

  // Fetch existing credentials (for editing)
  const fetchExistingCredentials = async () => {
    if (!existingConnection || !workspaceId) return;

    setIsValidating(true);
    try {
      // Fetch the actual credentials
      const credResponse = await fetch('/api/connections/shopify/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
        }),
      });

      const credData = await credResponse.json();

      if (credData.success) {
        // Set the actual token and domain
        if (credData.accessToken) {
          setAccessToken(credData.accessToken);
          setHasExistingToken(true);
        }
        if (credData.storeDomain) {
          setStoreDomain(credData.storeDomain);
        }
        if (credData.shopName) {
          setShopInfo({
            name: credData.shopName,
            domain: credData.storeDomain,
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
    const trimmedDomain = domain.trim();
    if (!trimmedDomain) {
      return false;
    }

    // Check if it ends with .myshopify.com
    if (!trimmedDomain.endsWith('.myshopify.com')) {
      return false;
    }

    // Check if there's a store name before .myshopify.com
    const storeName = trimmedDomain.replace('.myshopify.com', '');
    if (!storeName || storeName.length < 1) {
      return false;
    }

    return true;
  };

  const getDomainError = (domain: string): string | null => {
    const trimmedDomain = domain.trim();
    if (!trimmedDomain) {
      return 'Store domain is required';
    }

    // Check if it ends with .myshopify.com or if format is invalid
    if (!trimmedDomain.endsWith('.myshopify.com')) {
      return 'Please enter a valid domain name (e.g., mystore.myshopify.com)';
    }

    // Check if there's a store name before .myshopify.com
    const storeName = trimmedDomain.replace('.myshopify.com', '');
    if (!storeName || storeName.length < 1) {
      return 'Please enter a valid domain name (e.g., mystore.myshopify.com)';
    }

    return null;
  };

  const handleValidateToken = async (
    token?: string,
    domain?: string,
    showErrorToast = false
  ) => {
    const tokenToValidate = token || accessToken.trim();
    const domainToValidate = domain || storeDomain.trim();

    if (!tokenToValidate || !domainToValidate) {
      if (showErrorToast) {
        toast.error('Please enter both store domain and access token');
      }
      return;
    }

    // Validate domain format
    if (!isValidDomainFormat(domainToValidate)) {
      if (showErrorToast) {
        const error = getDomainError(domainToValidate);
        if (error) toast.error(error);
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
      const response = await fetch('/api/connections/shopify/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeDomain: domainToValidate,
          accessToken: tokenToValidate,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        const errorMessage =
          data.error || 'Failed to validate Shopify credentials';
        if (showErrorToast) {
          toast.error(errorMessage);
        } else {
          setError(errorMessage);
        }
        setTokenValidated(false);
        setShopInfo(null);
        return;
      }

      // Set shop info from validation response
      setShopInfo({
        name: data.shopName,
        domain: data.primaryDomain,
      });
      setTokenValidated(true);
    } catch {
      const errorMessage = 'Failed to connect to Shopify. Please try again.';
      if (showErrorToast) {
        toast.error(errorMessage);
      } else {
        setError(errorMessage);
      }
      setTokenValidated(false);
      setShopInfo(null);
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate domain format first
    if (!isValidDomainFormat(storeDomain)) {
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
      const response = await fetch('/api/connections/shopify/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          storeDomain: storeDomain.trim(),
          accessToken: accessToken.trim(),
          isUpdate: !!existingConnection, // Flag to indicate this is an update
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to create connection');
        return;
      }

      toast.success('Shopify connection established successfully');
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
                    src="/logos/cms/shopify.svg"
                    alt="Shopify"
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
                    ? 'Update Shopify Connection'
                    : 'Connect SEOmatic to Shopify'}
                </h2>
              </div>

              {/* Subtitle */}
              <div className="text-center">
                <p className="text-sm text-gray-500">
                  {existingConnection
                    ? 'Update your Shopify connection settings'
                    : "Let's establish a connection to Shopify"}
                </p>
              </div>
            </div>

            {/* Form section - white background */}
            <div className="px-8 pb-8 pt-4 bg-white">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Store Domain Input */}
                <div>
                  <label
                    htmlFor="storeDomain"
                    className="block text-sm font-bold text-zinc-900 leading-relaxed mb-2"
                  >
                    Store Domain Name
                  </label>
                  <div className="flex">
                    <div
                      className={`flex items-center px-3 bg-gray-50 border border-r-0 rounded-l-md ${
                        hasBlurred &&
                        storeDomain.length > 0 &&
                        !isValidDomainFormat(storeDomain)
                          ? 'border-red-500'
                          : error && !tokenValidated
                            ? 'border-red-500'
                            : 'border-zinc-300'
                      }`}
                    >
                      <span className="text-sm font-medium text-zinc-900 leading-tight">
                        https://
                      </span>
                    </div>
                    <input
                      id="storeDomain"
                      type="text"
                      value={storeDomain}
                      onChange={e => {
                        const newDomain = e.target.value;
                        setStoreDomain(newDomain);
                        setTokenValidated(false);
                        setError(null);
                        setHasBlurred(false); // Reset blur state when typing

                        // Clear existing timer
                        if (debounceTimer.current) {
                          clearTimeout(debounceTimer.current);
                        }

                        // Set new timer for auto-validation if both fields have values
                        if (newDomain.trim() && accessToken.trim()) {
                          debounceTimer.current = setTimeout(() => {
                            handleValidateToken(accessToken, newDomain, true);
                          }, 1500); // Wait 1.5 seconds after typing stops
                        }
                      }}
                      onBlur={() => setHasBlurred(true)}
                      placeholder="mystore.myshopify.com"
                      className={`flex-1 h-12 px-3 border rounded-r-md text-sm font-medium placeholder:text-zinc-400 placeholder:font-normal focus:outline-none ${
                        hasBlurred &&
                        storeDomain.length > 0 &&
                        !isValidDomainFormat(storeDomain)
                          ? 'border-red-500 focus:border-red-600'
                          : error && !tokenValidated
                            ? 'border-red-500 focus:border-red-600'
                            : 'border-zinc-300 focus:border-zinc-400'
                      }`}
                      required
                      disabled={isValidating || isConnecting}
                    />
                  </div>
                  {/* Domain Error Message */}
                  {hasBlurred &&
                    storeDomain.length > 0 &&
                    !isValidDomainFormat(storeDomain) && (
                      <p className="mt-1.5 text-xs text-red-600">
                        {getDomainError(storeDomain)}
                      </p>
                    )}
                </div>

                {/* Access Token Input */}
                <div>
                  <label
                    htmlFor="accessToken"
                    className="block text-sm font-bold text-zinc-900 leading-relaxed mb-2"
                  >
                    X-Shopify-Access-Token
                  </label>
                  <div className="relative">
                    <input
                      id="accessToken"
                      type={showToken ? 'text' : 'password'}
                      value={accessToken}
                      onChange={e => {
                        const newToken = e.target.value;

                        setAccessToken(newToken);

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
                          newToken.trim() &&
                          storeDomain.trim() &&
                          !hasExistingToken
                        ) {
                          debounceTimer.current = setTimeout(() => {
                            handleValidateToken(newToken, storeDomain, true);
                          }, 1500); // Wait 1.5 seconds after typing stops
                        } else if (!newToken.trim()) {
                          setShopInfo(null);
                          setTokenValidated(false);
                        }
                      }}
                      placeholder="shpat_0561dd055fe1aa253e6d01855b4a1c8z"
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
                      onClick={() => setShowToken(!showToken)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showToken ? (
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
                          <span>How to get your access token</span>
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
                                  <li>
                                    Go to Settings → Apps and sales channels
                                  </li>
                                  <li>
                                    Click &quot;Develop apps&quot; (enable if
                                    needed)
                                  </li>
                                  <li>
                                    Create a custom app (e.g.,
                                    &quot;SEOmatic&quot;)
                                  </li>
                                  <li>
                                    Configure Admin API scopes (see below)
                                  </li>
                                  <li>Install the app</li>
                                  <li>Generate and copy the access token</li>
                                </ol>
                              </div>
                              <div className="border-l-2 border-blue-400 pl-2">
                                <p className="text-blue-600 font-medium">
                                  Required Permissions:
                                </p>
                                <ul className="text-blue-600 mt-1 space-y-0.5 list-disc list-inside">
                                  <li>Store content (Read and write)</li>
                                  <li>Themes (Read and write)</li>
                                  <li>Products (Read and write)</li>
                                </ul>
                              </div>
                              <div className="border-l-2 border-amber-400 pl-2">
                                <p className="text-amber-600 font-medium">
                                  Requirements:
                                </p>
                                <ul className="text-amber-600 mt-1 space-y-0.5 list-disc list-inside">
                                  <li>Store owner or staff admin access</li>
                                  <li>Paid Shopify plan</li>
                                </ul>
                              </div>
                              <div className="mt-2 pt-2 border-t border-gray-200">
                                <a
                                  href="https://docs.seomatic.ai/integrations/7Me35UUvTEqmQNRxyWy6Ke/connect-shopify/dwFLYQUwArfJNHEVYC6VAP"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-indigo-600 hover:text-indigo-700 font-medium cursor-pointer"
                                >
                                  Read full documentation →
                                </a>
                              </div>
                            </div>
                            {/* Tooltip arrow */}
                            <div className="absolute top-full left-4 w-0 h-0 border-l-2 border-l-transparent border-r-2 border-r-transparent border-t-2 border-t-white"></div>
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
                      !storeDomain ||
                      !accessToken ||
                      !tokenValidated ||
                      isConnecting
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
