import { ConnectionService } from './connection-service';
import {
  ShopifyError,
  ConnectionErrorCode,
} from '@/lib/errors/connection-errors';
import type { ConnectionCredentials } from '@/lib/utils/encryption';

const SHOPIFY_API_VERSION = '2025-07';

export interface ShopifyValidationResult {
  isValid: boolean;
  error?: string;
  shopName?: string;
  primaryDomain?: string;
}

export interface ShopifyConnectionParams {
  workspaceId: string;
  storeDomain: string;
  accessToken: string;
}

export class ShopifyService {
  /**
   * Validate Shopify store domain and access token
   */
  static async validateStore(
    storeDomain: string,
    accessToken: string
  ): Promise<ShopifyValidationResult> {
    try {
      // Clean the domain (remove https://, trailing slashes)
      const cleanDomain = storeDomain
        .replace(/^https?:\/\//, '')
        .replace(/\/$/, '')
        .trim();

      // Ensure it's a myshopify.com domain or custom domain
      if (!cleanDomain.includes('.')) {
        return {
          isValid: false,
          error: 'Invalid store domain format',
        };
      }

      // Build the GraphQL endpoint
      const endpoint = `https://${cleanDomain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;

      // Test query to get shop information
      const query = `
        {
          shop {
            name
            primaryDomain {
              url
              host
            }
          }
        }
      `;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': accessToken,
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          return {
            isValid: false,
            error:
              'Invalid access token. Please check your token and try again.',
          };
        }
        if (response.status === 404) {
          return {
            isValid: false,
            error: 'Store not found. Please check your domain and try again.',
          };
        }
        return {
          isValid: false,
          error: 'Failed to connect to Shopify. Please check your credentials.',
        };
      }

      const data = await response.json();

      // Check for GraphQL errors
      if (data.errors && data.errors.length > 0) {
        return {
          isValid: false,
          error: data.errors[0].message || 'GraphQL query failed',
        };
      }

      // Check if we got shop data
      if (!data.data?.shop) {
        return {
          isValid: false,
          error: 'Unable to retrieve shop information',
        };
      }

      return {
        isValid: true,
        shopName: data.data.shop.name,
        primaryDomain: data.data.shop.primaryDomain?.host || cleanDomain,
      };
    } catch (error) {
      console.error('Shopify validation error:', error);
      return {
        isValid: false,
        error: 'Failed to connect to Shopify. Please try again.',
      };
    }
  }

  /**
   * Create or update a Shopify connection
   */
  static async createConnection({
    workspaceId,
    storeDomain,
    accessToken,
  }: ShopifyConnectionParams) {
    // Clean the domain
    const cleanDomain = storeDomain
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '')
      .trim();

    // Validate the credentials first
    const validation = await this.validateStore(cleanDomain, accessToken);

    if (!validation.isValid) {
      throw new ShopifyError(
        ConnectionErrorCode.INVALID_CREDENTIALS,
        validation.error || 'Invalid Shopify credentials',
        { statusCode: 400 }
      );
    }

    // Store the connection with encrypted token
    const credentials: ConnectionCredentials = {
      apiKey: accessToken,
    };

    await ConnectionService.createOrReplace({
      workspaceId,
      connectionUrl: cleanDomain,
      connectionType: 'shopify',
      credentials,
      cmsSiteId: validation.shopName, // Store shop name as site ID
      status: 'active', // Create with active status since Shopify pre-validated
    });

    return {
      success: true,
      shopName: validation.shopName,
      primaryDomain: validation.primaryDomain,
    };
  }

  /**
   * Test an existing Shopify connection
   */
  static async testConnection(
    storeDomain: string,
    accessToken: string
  ): Promise<boolean> {
    const result = await this.validateStore(storeDomain, accessToken);
    return result.isValid;
  }

  /**
   * Fetch shop information
   */
  static async getShopInfo(storeDomain: string, accessToken: string) {
    try {
      const cleanDomain = storeDomain
        .replace(/^https?:\/\//, '')
        .replace(/\/$/, '')
        .trim();

      const endpoint = `https://${cleanDomain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;

      const query = `
        {
          shop {
            name
            email
            primaryDomain {
              url
              host
            }
            plan {
              displayName
            }
          }
        }
      `;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': accessToken,
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.data?.shop || null;
    } catch {
      return null;
    }
  }
}
