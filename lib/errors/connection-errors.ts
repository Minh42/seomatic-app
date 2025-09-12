/**
 * CMS Connection Error Types
 */

export enum ConnectionErrorCode {
  // Domain validation errors
  INVALID_DOMAIN = 'INVALID_DOMAIN',
  DOMAIN_NOT_REACHABLE = 'DOMAIN_NOT_REACHABLE',

  // CMS detection errors
  CMS_NOT_DETECTED = 'CMS_NOT_DETECTED',
  CMS_VERSION_INCOMPATIBLE = 'CMS_VERSION_INCOMPATIBLE',
  API_DISABLED = 'API_DISABLED',

  // Authentication errors
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  AUTH_METHOD_DISABLED = 'AUTH_METHOD_DISABLED',
  TOKEN_REVOKED = 'TOKEN_REVOKED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',

  // Network errors
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  SSL_CERTIFICATE_ERROR = 'SSL_CERTIFICATE_ERROR',
  CONNECTION_REFUSED = 'CONNECTION_REFUSED',

  // API errors
  API_RATE_LIMITED = 'API_RATE_LIMITED',
  API_ENDPOINT_NOT_FOUND = 'API_ENDPOINT_NOT_FOUND',
  API_RESPONSE_INVALID = 'API_RESPONSE_INVALID',

  // General errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export type CMSType =
  | 'wordpress'
  | 'webflow'
  | 'shopify'
  | 'ghost'
  | 'seomatic';

/**
 * Base Connection Error class
 */
export class ConnectionError extends Error {
  public readonly code: ConnectionErrorCode;
  public readonly cms?: CMSType;
  public readonly statusCode?: number;
  public readonly details?: Record<string, unknown>;
  public readonly retryable: boolean;

  constructor(
    code: ConnectionErrorCode,
    message: string,
    options?: {
      cms?: CMSType;
      statusCode?: number;
      details?: Record<string, unknown>;
      retryable?: boolean;
      cause?: Error;
    }
  ) {
    super(message);
    this.name = 'ConnectionError';
    this.code = code;
    this.cms = options?.cms;
    this.statusCode = options?.statusCode;
    this.details = options?.details;
    this.retryable = options?.retryable ?? false;

    if (options?.cause) {
      this.cause = options.cause;
    }

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ConnectionError);
    }
  }
}

/**
 * Domain validation error
 */
export class DomainValidationError extends ConnectionError {
  constructor(domain: string, reason?: string) {
    super(
      ConnectionErrorCode.INVALID_DOMAIN,
      `Invalid domain: ${domain}. ${reason || 'Please enter a valid domain name.'}`,
      {
        details: { domain, reason },
        retryable: false,
      }
    );
    this.name = 'DomainValidationError';
  }
}

/**
 * CMS not detected error
 */
export class CMSNotDetectedError extends ConnectionError {
  constructor(domain: string, cms: CMSType) {
    const cmsName = cms.charAt(0).toUpperCase() + cms.slice(1);
    super(
      ConnectionErrorCode.CMS_NOT_DETECTED,
      `${cmsName} installation not detected at ${domain}. Please verify this is a ${cmsName} site with API access enabled.`,
      {
        cms,
        details: { domain },
        retryable: false,
      }
    );
    this.name = 'CMSNotDetectedError';
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends ConnectionError {
  constructor(
    message: string,
    cms?: CMSType,
    code: ConnectionErrorCode = ConnectionErrorCode.INVALID_CREDENTIALS
  ) {
    super(code, message, {
      cms,
      statusCode: 401,
      retryable: false,
    });
    this.name = 'AuthenticationError';
  }
}

/**
 * Network error
 */
export class NetworkError extends ConnectionError {
  constructor(
    message: string,
    code: ConnectionErrorCode = ConnectionErrorCode.NETWORK_TIMEOUT,
    cause?: Error
  ) {
    super(code, message, {
      retryable: true,
      cause,
    });
    this.name = 'NetworkError';
  }
}

/**
 * SSL certificate error
 */
export class SSLError extends ConnectionError {
  constructor(domain: string, cause?: Error) {
    super(
      ConnectionErrorCode.SSL_CERTIFICATE_ERROR,
      `SSL certificate error for ${domain}. The site may be using a self-signed or expired certificate.`,
      {
        details: { domain },
        retryable: false,
        cause,
      }
    );
    this.name = 'SSLError';
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends ConnectionError {
  constructor(cms?: CMSType, retryAfter?: number) {
    super(
      ConnectionErrorCode.API_RATE_LIMITED,
      `API rate limit exceeded. ${retryAfter ? `Please try again in ${retryAfter} seconds.` : 'Please try again later.'}`,
      {
        cms,
        statusCode: 429,
        details: { retryAfter },
        retryable: true,
      }
    );
    this.name = 'RateLimitError';
  }
}

/**
 * WordPress-specific errors
 */
export class WordPressError extends ConnectionError {
  constructor(
    code: ConnectionErrorCode,
    message: string,
    options?: Parameters<typeof ConnectionError.prototype.constructor>[2]
  ) {
    super(code, message, { ...options, cms: 'wordpress' });
    this.name = 'WordPressError';
  }
}

/**
 * Webflow-specific error
 */
export class WebflowError extends ConnectionError {
  constructor(
    code: ConnectionErrorCode,
    message: string,
    options?: Parameters<typeof ConnectionError.prototype.constructor>[2]
  ) {
    super(code, message, { ...options, cms: 'webflow' });
    this.name = 'WebflowError';
  }
}

/**
 * Shopify-specific error
 */
export class ShopifyError extends ConnectionError {
  constructor(
    code: ConnectionErrorCode,
    message: string,
    options?: Parameters<typeof ConnectionError.prototype.constructor>[2]
  ) {
    super(code, message, { ...options, cms: 'shopify' });
    this.name = 'ShopifyError';
  }
}

/**
 * Ghost-specific error
 */
export class GhostError extends ConnectionError {
  constructor(
    code: ConnectionErrorCode,
    message: string,
    options?: Parameters<typeof ConnectionError.prototype.constructor>[2]
  ) {
    super(code, message, { ...options, cms: 'ghost' });
    this.name = 'GhostError';
  }
}

export class ApplicationPasswordError extends WordPressError {
  constructor() {
    super(
      ConnectionErrorCode.AUTH_METHOD_DISABLED,
      'Application Passwords are not enabled on this WordPress site. Please enable them in your WordPress settings.',
      {
        statusCode: 403,
        retryable: false,
      }
    );
    this.name = 'ApplicationPasswordError';
  }
}

export class WordPressVersionError extends WordPressError {
  constructor(version: string, requiredVersion: string) {
    super(
      ConnectionErrorCode.CMS_VERSION_INCOMPATIBLE,
      `WordPress version ${version} is not compatible. Minimum required version is ${requiredVersion}.`,
      {
        details: { version, requiredVersion },
        retryable: false,
      }
    );
    this.name = 'WordPressVersionError';
  }
}

/**
 * Error handler utility
 */
export function handleConnectionError(
  error: unknown,
  cms?: CMSType
): ConnectionError {
  if (error instanceof ConnectionError) {
    return error;
  }

  // Handle fetch/network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return new NetworkError(
      'Failed to connect. Please check your internet connection.',
      ConnectionErrorCode.CONNECTION_REFUSED,
      error
    );
  }

  // Handle timeout errors
  if (error instanceof Error && error.name === 'AbortError') {
    return new NetworkError(
      'Connection timed out. The site took too long to respond.',
      ConnectionErrorCode.NETWORK_TIMEOUT,
      error
    );
  }

  // Handle generic errors
  if (error instanceof Error) {
    return new ConnectionError(
      ConnectionErrorCode.UNKNOWN_ERROR,
      error.message,
      {
        cms,
        cause: error,
        retryable: false,
      }
    );
  }

  return new ConnectionError(
    ConnectionErrorCode.UNKNOWN_ERROR,
    'An unexpected error occurred.',
    {
      cms,
      details: { error },
      retryable: false,
    }
  );
}

/**
 * User-friendly error messages
 */
export function getErrorMessage(error: ConnectionError): string {
  switch (error.code) {
    case ConnectionErrorCode.INVALID_DOMAIN:
      return 'Please enter a valid domain name (e.g., example.com)';

    case ConnectionErrorCode.DOMAIN_NOT_REACHABLE:
      return 'Unable to reach this domain. Please check the URL and try again.';

    case ConnectionErrorCode.CMS_NOT_DETECTED:
      return `This doesn't appear to be a ${error.cms || 'supported CMS'} site. Please verify the URL.`;

    case ConnectionErrorCode.CMS_VERSION_INCOMPATIBLE:
      return 'This CMS version is not supported. Please update to a newer version.';

    case ConnectionErrorCode.API_DISABLED:
      // Check if it's a security plugin blocking
      if (error.details?.securityPlugin) {
        return 'WordPress REST API appears to be blocked by a security plugin. You may need to whitelist the REST API or adjust your security settings.';
      }
      return 'The API is disabled on this site. Please enable it to continue.';

    case ConnectionErrorCode.INVALID_CREDENTIALS:
      return 'Invalid credentials. Please check and try again.';

    case ConnectionErrorCode.AUTH_METHOD_DISABLED:
      return 'The required authentication method is not enabled.';

    case ConnectionErrorCode.TOKEN_REVOKED:
      return 'Access token has been revoked. Please reconnect.';

    case ConnectionErrorCode.INSUFFICIENT_PERMISSIONS:
      return 'Insufficient permissions. Administrator access is required.';

    case ConnectionErrorCode.NETWORK_TIMEOUT:
      return 'Connection timed out. Please try again.';

    case ConnectionErrorCode.SSL_CERTIFICATE_ERROR:
      return 'SSL certificate error. The site may not be secure.';

    case ConnectionErrorCode.CONNECTION_REFUSED:
      // Check if it's a CDN-specific error with detailed instructions
      if (error.details?.cdn === 'cloudflare') {
        if (error.details?.endpoint === 'wp-json') {
          return "WordPress API is blocked by Cloudflare. You'll need to create a Page Rule to allow access to /wp-json/* endpoints.";
        }
        return "Site is protected by Cloudflare. You may need to adjust your security settings or whitelist SEOmatic's access.";
      }
      return 'Connection blocked by security settings. Check your firewall, security plugins, or CDN configuration.';

    case ConnectionErrorCode.API_RATE_LIMITED:
      return 'Too many requests. Please wait a moment and try again.';

    case ConnectionErrorCode.API_ENDPOINT_NOT_FOUND:
      return 'API endpoint not found. Please verify the site configuration.';

    case ConnectionErrorCode.API_RESPONSE_INVALID:
      return 'Invalid response from the site. Please try again.';

    default:
      return error.message || 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: ConnectionError): boolean {
  return (
    error.retryable ||
    [
      ConnectionErrorCode.NETWORK_TIMEOUT,
      ConnectionErrorCode.CONNECTION_REFUSED,
      ConnectionErrorCode.API_RATE_LIMITED,
    ].includes(error.code)
  );
}

/**
 * Parse API error response
 */
export function parseApiErrorResponse(
  response: Response,
  body?: unknown,
  cms?: CMSType
): ConnectionError {
  switch (response.status) {
    case 401:
      return new AuthenticationError(
        body?.message || 'Authentication failed.',
        cms
      );

    case 403:
      return new ConnectionError(
        ConnectionErrorCode.INSUFFICIENT_PERMISSIONS,
        body?.message || 'Access denied.',
        { cms, statusCode: 403 }
      );

    case 404:
      return new ConnectionError(
        ConnectionErrorCode.API_ENDPOINT_NOT_FOUND,
        'API endpoint not found.',
        { cms, statusCode: 404 }
      );

    case 429:
      const retryAfter = response.headers.get('Retry-After');
      return new RateLimitError(
        cms,
        retryAfter ? parseInt(retryAfter, 10) : undefined
      );

    case 500:
    case 502:
    case 503:
    case 504:
      return new ConnectionError(
        ConnectionErrorCode.CONNECTION_REFUSED,
        'The site is experiencing issues. Please try again later.',
        { cms, statusCode: response.status, retryable: true }
      );

    default:
      return new ConnectionError(
        ConnectionErrorCode.API_RESPONSE_INVALID,
        body?.message || `API error (${response.status})`,
        { cms, statusCode: response.status, details: body }
      );
  }
}
