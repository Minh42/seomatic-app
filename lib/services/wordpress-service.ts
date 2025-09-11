import { ConnectionService } from './connection-service';
import {
  WordPressError,
  NetworkError,
  ConnectionErrorCode,
  parseApiErrorResponse,
} from '@/lib/errors/connection-errors';
import type { ConnectionCredentials } from '@/lib/utils/encryption';
import { protocol, rootDomain } from '@/lib/utils';

const REQUEST_TIMEOUT = 10000; // 10 seconds

export interface WordPressValidationResult {
  isValid: boolean;
  isWordPress: boolean;
  version?: string;
  restApiUrl?: string;
  applicationPasswordsEnabled?: boolean;
  authorizationEndpoint?: string;
  error?: string;
}

export interface WordPressAuthParams {
  workspaceId: string;
  domain: string;
  username: string;
  applicationPassword: string;
}

export class WordPressService {
  /**
   * Validate WordPress domain
   */
  static async validateDomain(
    domain: string
  ): Promise<WordPressValidationResult> {
    // Clean domain
    const cleanDomain = domain.toLowerCase().trim();

    // Build URL with https
    const baseUrl = `https://${cleanDomain}`;

    try {
      // First, check if the domain is reachable
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      try {
        const response = await fetch(baseUrl, {
          method: 'HEAD',
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!response.ok && response.status !== 405) {
          throw new NetworkError(
            `Domain returned status ${response.status}`,
            ConnectionErrorCode.DOMAIN_NOT_REACHABLE
          );
        }
      } catch (error) {
        clearTimeout(timeout);
        if (error instanceof Error && error.name === 'AbortError') {
          throw new NetworkError(
            'Connection timed out',
            ConnectionErrorCode.NETWORK_TIMEOUT
          );
        }
        throw error;
      }

      // Check for WordPress REST API
      const restApiUrl = `${baseUrl}/wp-json/wp/v2`;
      const apiResponse = await fetch(`${restApiUrl}/posts?per_page=1`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      // If we get a 401, it means the API exists but requires auth (which is fine)
      // If we get a 200, the API is public (also fine)
      // If we get a 404, the API doesn't exist
      if (apiResponse.status === 404) {
        // Try alternative REST API URL (some sites use different structures)
        const altApiUrl = `${baseUrl}/index.php/wp-json/wp/v2`;
        const altResponse = await fetch(`${altApiUrl}/posts?per_page=1`, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
        });

        if (altResponse.status === 404) {
          return {
            isValid: false,
            isWordPress: false,
            error: 'WordPress REST API not found',
          };
        }
      }

      // Get WordPress version and capabilities
      const siteInfoResponse = await fetch(`${baseUrl}/wp-json`, {
        headers: {
          Accept: 'application/json',
        },
      });

      if (siteInfoResponse.ok) {
        try {
          const siteInfo = await siteInfoResponse.json();

          // Check if it's actually WordPress
          if (!siteInfo.name || !siteInfo.namespaces?.includes('wp/v2')) {
            return {
              isValid: false,
              isWordPress: false,
              error: 'Not a WordPress site',
            };
          }

          // Extract authorization endpoint from WordPress API response
          let authorizationEndpoint: string | undefined;
          if (
            siteInfo.authentication?.['application-passwords']?.endpoints
              ?.authorization
          ) {
            // The endpoint comes escaped from WordPress, need to unescape it
            authorizationEndpoint = siteInfo.authentication[
              'application-passwords'
            ].endpoints.authorization.replace(/\\\//g, '/');
          }

          // Check for application passwords support
          const authResponse = await fetch(
            `${baseUrl}/wp-json/wp/v2/users/me`,
            {
              headers: {
                Accept: 'application/json',
              },
            }
          );

          // Check authentication methods from headers
          const authMethods =
            authResponse.headers.get('X-WP-Nonce') ||
            authResponse.headers.get('WWW-Authenticate') ||
            '';
          const applicationPasswordsEnabled =
            authMethods.includes('Application') ||
            authResponse.status === 401 ||
            !!authorizationEndpoint;

          return {
            isValid: true,
            isWordPress: true,
            restApiUrl,
            applicationPasswordsEnabled,
            authorizationEndpoint,
          };
        } catch {
          // JSON parse error - not WordPress
          return {
            isValid: false,
            isWordPress: false,
            error: 'Invalid WordPress response',
          };
        }
      }

      return {
        isValid: false,
        isWordPress: false,
        error: 'Unable to detect WordPress',
      };
    } catch (error) {
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new NetworkError(
          'Failed to connect to domain',
          ConnectionErrorCode.CONNECTION_REFUSED,
          error
        );
      }

      throw new WordPressError(
        ConnectionErrorCode.UNKNOWN_ERROR,
        'Failed to validate WordPress domain',
        { cause: error }
      );
    }
  }

  /**
   * Generate WordPress Application Password authorization URL
   */
  static async generateAuthUrl(
    domain: string,
    authorizationEndpoint?: string,
    appName: string = 'seomatic'
  ): Promise<string> {
    const cleanDomain = domain.toLowerCase().trim();
    const baseUrl = `https://${cleanDomain}`;

    // Parse the authorization endpoint
    let authUrl: URL;
    if (authorizationEndpoint) {
      // If the endpoint is a full URL, use it directly
      if (
        authorizationEndpoint.startsWith('http://') ||
        authorizationEndpoint.startsWith('https://')
      ) {
        authUrl = new URL(authorizationEndpoint);
      } else if (authorizationEndpoint.startsWith('/')) {
        // If it's a path, append to base URL
        authUrl = new URL(`${baseUrl}${authorizationEndpoint}`);
      } else {
        // Otherwise append with a slash
        authUrl = new URL(`${baseUrl}/${authorizationEndpoint}`);
      }
    } else {
      // Fall back to default path
      authUrl = new URL(`${baseUrl}/wp-admin/authorize-application.php`);
    }

    // Add parameters for the authorization
    authUrl.searchParams.set('app_name', appName);

    // Set the success URL with domain_name parameter
    const successUrl = getCallbackUrl(domain);
    authUrl.searchParams.set('success_url', successUrl);

    // Build the login URL with redirect_to parameter
    // This ensures users are redirected to authorization after login
    const loginUrl = new URL(`${baseUrl}/wp-login.php`);
    loginUrl.searchParams.set('redirect_to', authUrl.toString());
    loginUrl.searchParams.set('reauth', '1'); // Force re-authentication for security

    const finalUrl = loginUrl.toString();
    console.log('Generated WordPress auth URL with login redirect:', finalUrl);
    console.log('Authorization URL:', authUrl.toString());

    return finalUrl;
  }

  /**
   * Store WordPress connection with credentials
   */
  static async createConnection({
    workspaceId,
    domain,
    username,
    applicationPassword,
  }: WordPressAuthParams) {
    const cleanDomain = domain.toLowerCase().trim();

    // Validate credentials by making a test request
    const isValid = await this.validateCredentials(
      cleanDomain,
      username,
      applicationPassword
    );

    if (!isValid) {
      throw new WordPressError(
        ConnectionErrorCode.INVALID_CREDENTIALS,
        'Invalid WordPress credentials'
      );
    }

    // Store connection with active status since we already validated
    const credentials: ConnectionCredentials = {
      username,
      password: applicationPassword,
    };

    // Use createOrReplace to handle existing connections
    const connection = await ConnectionService.createOrReplace({
      workspaceId,
      connectionUrl: cleanDomain,
      connectionType: 'wordpress',
      credentials,
      apiUsername: username,
      status: 'active', // Create with active status since credentials are validated
    });

    return connection;
  }

  /**
   * Validate WordPress credentials
   */
  static async validateCredentials(
    domain: string,
    username: string,
    password: string
  ): Promise<boolean> {
    const baseUrl = `https://${domain}`;
    const credentials = Buffer.from(`${username}:${password}`).toString(
      'base64'
    );

    try {
      // Test credentials by fetching user info
      const response = await fetch(`${baseUrl}/wp-json/wp/v2/users/me`, {
        headers: {
          Authorization: `Basic ${credentials}`,
          Accept: 'application/json',
        },
      });

      if (response.ok) {
        // If authentication succeeds, the user has valid credentials
        // WordPress already restricts Application Password creation to users with proper permissions
        return true;
      }

      if (response.status === 401) {
        return false;
      }

      // Parse other errors
      const body = await response.json().catch(() => null);
      throw parseApiErrorResponse(response, body, 'wordpress');
    } catch (error) {
      throw new WordPressError(
        ConnectionErrorCode.UNKNOWN_ERROR,
        'Failed to validate credentials',
        { cause: error as Error }
      );
    }
  }

  /**
   * Fetch WordPress site information
   */
  static async getSiteInfo(
    domain: string,
    credentials?: ConnectionCredentials
  ) {
    const baseUrl = `https://${domain}`;

    const headers: HeadersInit = {
      Accept: 'application/json',
    };

    if (credentials?.username && credentials?.password) {
      const auth = Buffer.from(
        `${credentials.username}:${credentials.password}`
      ).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    }

    try {
      const response = await fetch(`${baseUrl}/wp-json/wp/v2/settings`, {
        headers,
      });

      if (response.ok) {
        return await response.json();
      }

      // Try public site info
      const publicResponse = await fetch(`${baseUrl}/wp-json`, {
        headers: { Accept: 'application/json' },
      });

      if (publicResponse.ok) {
        return await publicResponse.json();
      }

      return null;
    } catch {
      return null;
    }
  }
}

/**
 * Helper functions
 */

function getCallbackUrl(domain: string): string {
  // For local development, we need to use a secure tunnel or override
  // WordPress requires HTTPS for the success_url in production
  const isLocalhost =
    rootDomain.includes('localhost') || rootDomain.includes('127.0.0.1');

  // In development, you should use ngrok or another tunnel service
  // Or temporarily use a production URL for testing
  let baseUrl: string;
  if (isLocalhost && process.env.WORDPRESS_CALLBACK_URL) {
    // Allow override for local development
    baseUrl = process.env.WORDPRESS_CALLBACK_URL;
  } else if (isLocalhost) {
    // Force HTTPS even for localhost (you'll need a tunnel like ngrok)
    console.warn(
      'WordPress requires HTTPS for callbacks. Consider using ngrok or setting WORDPRESS_CALLBACK_URL env variable.'
    );
    baseUrl = `https://${rootDomain}`;
  } else {
    baseUrl = `${protocol}://${rootDomain}`;
  }

  const callback = new URL(`${baseUrl}/dashboard/connections`);
  callback.searchParams.set('domain_name', domain);
  return callback.toString();
}
