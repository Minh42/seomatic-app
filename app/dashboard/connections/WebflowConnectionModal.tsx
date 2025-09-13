'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  ArrowLeftRight,
  ChevronDown,
  Eye,
  EyeOff,
  HelpCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface WebflowSite {
  id: string;
  displayName: string;
  shortName: string;
}

interface WebflowConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  existingConnection?: {
    apiToken?: string;
    siteId?: string;
    siteName?: string;
  };
  onSuccess?: () => void;
}

export function WebflowConnectionModal({
  isOpen,
  onClose,
  workspaceId,
  existingConnection,
  onSuccess,
}: WebflowConnectionModalProps) {
  const [apiToken, setApiToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [sites, setSites] = useState<WebflowSite[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [tokenValidated, setTokenValidated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [hasExistingToken, setHasExistingToken] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setApiToken('');
      setSelectedSiteId('');
      setSites([]);
      setTokenValidated(false);
      setError(null);
      setShowToken(false);
      setHasExistingToken(false);
      // Clear debounce timer
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    }
  }, [isOpen]);

  // Set existing values if editing
  useEffect(() => {
    if (existingConnection && isOpen) {
      // When editing, fetch the actual token and sites
      fetchExistingCredentials();

      if (existingConnection.siteId) {
        setSelectedSiteId(existingConnection.siteId);
      }
    }
  }, [existingConnection, isOpen]);

  // Fetch existing credentials and sites (for editing)
  const fetchExistingCredentials = async () => {
    if (!existingConnection || !workspaceId) return;

    setIsValidating(true);
    try {
      // First fetch the actual credentials
      const credResponse = await fetch('/api/connections/webflow/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
        }),
      });

      const credData = await credResponse.json();

      if (credData.success && credData.apiToken) {
        // Set the actual token
        setApiToken(credData.apiToken);
        setHasExistingToken(true);

        // Now fetch sites
        const sitesResponse = await fetch('/api/connections/webflow/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiToken: credData.apiToken,
          }),
        });

        const sitesData = await sitesResponse.json();

        if (sitesData.success && sitesData.sites) {
          setSites(sitesData.sites);
          setTokenValidated(true);

          // Set the current site if provided
          if (credData.siteId) {
            setSelectedSiteId(credData.siteId);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch credentials:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const handleValidateToken = async (
    token?: string,
    showErrorToast = false
  ) => {
    const tokenToValidate = token || apiToken.trim();

    if (!tokenToValidate) {
      if (showErrorToast) {
        toast.error('Please enter an API token');
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
      const response = await fetch('/api/connections/webflow/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiToken: tokenToValidate,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        const errorMessage = data.error || 'Failed to validate API token';
        if (showErrorToast) {
          toast.error(errorMessage);
        } else {
          setError(errorMessage);
        }
        setTokenValidated(false);
        setSites([]);
        return;
      }

      // Set sites from validation response
      setSites(data.sites || []);
      setTokenValidated(true);

      // If editing and we have a site ID, keep it selected
      if (existingConnection?.siteId) {
        setSelectedSiteId(existingConnection.siteId);
      } else if (data.sites && data.sites.length === 1) {
        // Auto-select if only one site
        setSelectedSiteId(data.sites[0].id);
      }
    } catch {
      const errorMessage = 'Failed to connect to Webflow. Please try again.';
      if (showErrorToast) {
        toast.error(errorMessage);
      } else {
        setError(errorMessage);
      }
      setTokenValidated(false);
      setSites([]);
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate token if not already validated
    if (!tokenValidated) {
      await handleValidateToken();
      return;
    }

    if (!selectedSiteId) {
      setError('Please select a site');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const selectedSite = sites.find(s => s.id === selectedSiteId);

      const response = await fetch('/api/connections/webflow/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          apiToken: apiToken.trim(),
          siteId: selectedSiteId,
          siteName:
            selectedSite?.displayName ||
            selectedSite?.shortName ||
            'Webflow Site',
          isUpdate: !!existingConnection, // Flag to indicate this is an update
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to create connection');
        return;
      }

      toast.success('Webflow connection established successfully');
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
                    src="/logos/cms/webflow.svg"
                    alt="Webflow"
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
                    ? 'Update Webflow Connection'
                    : 'Connect SEOmatic to Webflow'}
                </h2>
              </div>

              {/* Subtitle */}
              <div className="text-center">
                <p className="text-sm text-gray-500">
                  {existingConnection
                    ? 'Update your Webflow connection settings'
                    : "Let's establish a connection to Webflow"}
                </p>
              </div>
            </div>

            {/* Form section - white background */}
            <div className="px-8 pb-8 pt-4 bg-white">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* API Token Input */}
                <div>
                  <label
                    htmlFor="apiToken"
                    className="block text-sm font-bold text-zinc-900 leading-relaxed mb-2"
                  >
                    API Token
                  </label>
                  <div className="relative">
                    <input
                      id="apiToken"
                      type={showToken ? 'text' : 'password'}
                      value={apiToken}
                      onChange={e => {
                        const newToken = e.target.value;

                        setApiToken(newToken);

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

                        // Set new timer for auto-validation
                        if (newToken.trim().length > 0 && !hasExistingToken) {
                          debounceTimer.current = setTimeout(() => {
                            handleValidateToken(newToken, true);
                          }, 1500); // Wait 1.5 seconds after typing stops
                        } else if (!newToken.trim()) {
                          setSites([]);
                          setTokenValidated(false);
                        }
                      }}
                      placeholder="9c52d7b4570ed5c19a94415e918d39c7bd4bfb71f602f36e125"
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
                          <span>How to get your API token</span>
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
                                  <li>Go to your Webflow workspace settings</li>
                                  <li>Navigate to Apps & Integrations</li>
                                  <li>Click &quot;Generate API token&quot;</li>
                                  <li>
                                    Set the required permissions (see below)
                                  </li>
                                  <li>
                                    Name your token (e.g., &quot;SEOmatic&quot;)
                                  </li>
                                  <li>Copy and paste the token here</li>
                                </ol>
                              </div>
                              <div className="border-l-2 border-blue-400 pl-2">
                                <p className="text-blue-600 font-medium">
                                  Required Permissions:
                                </p>
                                <ul className="text-blue-600 mt-1 space-y-0.5 list-disc list-inside">
                                  <li>Authorized user (Read-only)</li>
                                  <li>CMS, Ecommerce, Site (Read and write)</li>
                                </ul>
                              </div>
                              <div className="border-l-2 border-amber-400 pl-2">
                                <p className="text-amber-600 font-medium">
                                  Requirements:
                                </p>
                                <ul className="text-amber-600 mt-1 space-y-0.5 list-disc list-inside">
                                  <li>Workspace admin access</li>
                                  <li>Paid Webflow plan</li>
                                </ul>
                              </div>
                              <div className="mt-2 pt-2 border-t border-gray-200">
                                <a
                                  href="https://docs.seomatic.ai/integrations/7Me35UUvTEqmQNRxyWy6Ke/connect-webflow/5UWtaZhoqtFZc4fc8TggVs"
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

                {/* Site Selection Dropdown */}
                {tokenValidated && sites.length > 0 && (
                  <div>
                    <label
                      htmlFor="site"
                      className="block text-sm font-bold text-zinc-900 leading-relaxed mb-2"
                    >
                      Select site
                    </label>
                    <div className="relative">
                      <select
                        id="site"
                        value={selectedSiteId}
                        onChange={e => {
                          setSelectedSiteId(e.target.value);
                          setError(null);
                        }}
                        className="w-full h-12 px-3 pr-10 border border-zinc-300 rounded-md text-sm font-medium focus:outline-none focus:border-zinc-400 appearance-none bg-white"
                        required
                        disabled={isConnecting}
                      >
                        <option value="">Choose a site...</option>
                        {sites.map(site => (
                          <option key={site.id} value={site.id}>
                            {site.displayName || site.shortName}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                )}

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
                      !apiToken ||
                      !tokenValidated ||
                      (tokenValidated && !selectedSiteId) ||
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
