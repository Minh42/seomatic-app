import { ConnectionService } from './connection-service';
import {
  WebflowError,
  NetworkError,
  ConnectionErrorCode,
} from '@/lib/errors/connection-errors';
import type { ConnectionCredentials } from '@/lib/utils/encryption';

const WEBFLOW_API_BASE = 'https://api.webflow.com/v2';
const REQUEST_TIMEOUT = 10000; // 10 seconds

export interface WebflowSite {
  id: string;
  workspaceId: string;
  displayName: string;
  shortName: string;
  lastPublished?: string;
  customDomains?: string[];
}

export interface WebflowValidationResult {
  isValid: boolean;
  sites?: WebflowSite[];
  error?: string;
}

export interface WebflowConnectionParams {
  workspaceId: string;
  apiToken: string;
  siteId: string;
  siteName: string;
}

export class WebflowService {
  /**
   * Validate Webflow API token and fetch sites
   */
  static async validateToken(
    apiToken: string
  ): Promise<WebflowValidationResult> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      try {
        const response = await fetch(`${WEBFLOW_API_BASE}/sites`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${apiToken}`,
            Accept: 'application/json',
          },
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (response.status === 401) {
          return {
            isValid: false,
            error:
              'Invalid API token. Please check your Webflow API token and try again.',
          };
        }

        if (response.status === 403) {
          return {
            isValid: false,
            error:
              'Access denied. Make sure your API token has the required permissions.',
          };
        }

        if (!response.ok) {
          const errorText = await response.text();
          return {
            isValid: false,
            error: `Webflow API error: ${response.status} - ${errorText}`,
          };
        }

        const data = await response.json();

        // Webflow API returns { sites: [...] }
        const sites = data.sites || data;

        if (!Array.isArray(sites)) {
          return {
            isValid: false,
            error: 'Unexpected response format from Webflow API',
          };
        }

        if (sites.length === 0) {
          return {
            isValid: false,
            error:
              'No sites found for this API token. Please make sure you have at least one site in your Webflow account.',
          };
        }

        // Map to our interface
        const mappedSites: WebflowSite[] = sites.map((site: WebflowSite) => ({
          id: site.id,
          workspaceId: site.workspaceId,
          displayName: site.displayName || site.name,
          shortName: site.shortName,
          lastPublished: site.lastPublished,
          customDomains: site.customDomains,
        }));

        return {
          isValid: true,
          sites: mappedSites,
        };
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
    } catch (error) {
      if (error instanceof NetworkError) {
        throw error;
      }

      throw new WebflowError(
        ConnectionErrorCode.UNKNOWN_ERROR,
        'Failed to validate Webflow API token',
        { cause: error as Error }
      );
    }
  }

  /**
   * Create or update Webflow connection
   */
  static async createConnection({
    workspaceId,
    apiToken,
    siteId,
    siteName,
  }: WebflowConnectionParams) {
    // Store connection with encrypted token
    const credentials: ConnectionCredentials = {
      apiKey: apiToken,
    };

    const connection = await ConnectionService.createOrReplace({
      workspaceId,
      connectionUrl: siteName, // Store site name as connection URL for display
      connectionType: 'webflow',
      credentials,
      cmsSiteId: siteId, // Store the selected Webflow site ID
      status: 'active',
    });

    return connection;
  }

  /**
   * Test Webflow connection
   */
  static async testConnection(
    apiToken: string,
    siteId: string
  ): Promise<boolean> {
    try {
      const response = await fetch(`${WEBFLOW_API_BASE}/sites/${siteId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          Accept: 'application/json',
        },
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get site details
   */
  static async getSiteDetails(apiToken: string, siteId: string) {
    try {
      const response = await fetch(`${WEBFLOW_API_BASE}/sites/${siteId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch {
      return null;
    }
  }
}
