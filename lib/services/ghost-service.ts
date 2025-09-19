import { ConnectionService } from './connection-service';
import { ConnectionCredentials } from './connection-service';
import { AuthenticationError } from '@/lib/errors/connection-errors';

interface GhostValidationResult {
  isValid: boolean;
  error?: string;
  siteName?: string;
  siteUrl?: string;
}

interface GhostConnectionResult {
  success: boolean;
  siteName?: string;
  siteUrl?: string;
}

/**
 * Service for managing Ghost CMS connections
 */
export class GhostService {
  /**
   * Validate Ghost Admin API credentials
   */
  static async validateCredentials(
    domain: string,
    adminApiKey: string
  ): Promise<GhostValidationResult> {
    try {
      // Clean the domain - remove protocol and trailing slashes
      const cleanDomain = domain
        .replace(/^https?:\/\//, '')
        .replace(/\/$/, '')
        .trim();

      // Parse the Admin API key to extract the secret
      const [id, secret] = adminApiKey.split(':');
      if (!id || !secret) {
        return {
          isValid: false,
          error:
            'Invalid Admin API key format. It should be in the format id:secret',
        };
      }

      // Ghost Admin API endpoint for site info
      const apiUrl = `https://${cleanDomain}/ghost/api/admin/site/`;

      // Make a request to validate the credentials
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          Authorization: `Ghost ${adminApiKey}`,
          'Accept-Version': 'v5.0', // Use latest stable API version
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          return {
            isValid: false,
            error: 'Invalid Admin API key. Please check your credentials.',
          };
        } else if (response.status === 404) {
          return {
            isValid: false,
            error: 'Ghost Admin API not found. Please check your domain.',
          };
        } else {
          return {
            isValid: false,
            error: `Failed to connect to Ghost (${response.status}). Please check your domain and API key.`,
          };
        }
      }

      const data = await response.json();

      // Extract site information from the response
      const site = data.site || data;

      return {
        isValid: true,
        siteName: site.title || cleanDomain,
        siteUrl: site.url || `https://${cleanDomain}`,
      };
    } catch (error) {
      // Check for network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return {
          isValid: false,
          error: 'Failed to connect to Ghost. Please check your domain.',
        };
      }

      return {
        isValid: false,
        error: 'Failed to validate Ghost credentials. Please try again.',
      };
    }
  }

  /**
   * Create a Ghost connection
   */
  static async createConnection({
    workspaceId,
    domain,
    adminApiKey,
  }: {
    workspaceId: string;
    domain: string;
    adminApiKey: string;
  }): Promise<GhostConnectionResult> {
    // Validate the credentials first
    const validation = await this.validateCredentials(domain, adminApiKey);

    if (!validation.isValid) {
      throw new AuthenticationError(
        validation.error || 'Failed to validate Ghost credentials',
        'ghost'
      );
    }

    // Clean the domain
    const cleanDomain = domain
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '')
      .trim();

    // Store the connection with encrypted token
    const credentials: ConnectionCredentials = {
      apiKey: adminApiKey,
    };

    await ConnectionService.createOrReplace({
      workspaceId,
      connectionUrl: cleanDomain,
      connectionType: 'ghost',
      credentials,
      cmsSiteId: validation.siteName, // Store site name as site ID
      status: 'active', // Create with active status since Ghost pre-validated
    });

    return {
      success: true,
      siteName: validation.siteName,
      siteUrl: validation.siteUrl,
    };
  }

  /**
   * Test an existing Ghost connection
   */
  static async testConnection(
    domain: string,
    adminApiKey: string
  ): Promise<boolean> {
    const result = await this.validateCredentials(domain, adminApiKey);
    return result.isValid;
  }

  /**
   * Fetch site information
   */
  static async getSiteInfo(domain: string, adminApiKey: string) {
    try {
      const cleanDomain = domain
        .replace(/^https?:\/\//, '')
        .replace(/\/$/, '')
        .trim();

      const apiUrl = `https://${cleanDomain}/ghost/api/admin/site/`;

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          Authorization: `Ghost ${adminApiKey}`,
          'Accept-Version': 'v5.0',
        },
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.site || null;
    } catch {
      return null;
    }
  }
}
