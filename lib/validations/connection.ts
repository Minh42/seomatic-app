import { z } from 'zod';

/**
 * Connection validation schemas
 */

// Domain validation
const domainRegex =
  /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;

export const domainSchema = z
  .string()
  .min(3, 'Domain must be at least 3 characters')
  .max(255, 'Domain must be less than 255 characters')
  .regex(domainRegex, 'Invalid domain format')
  .transform(val => val.toLowerCase().trim())
  .refine(val => !val.startsWith('http://') && !val.startsWith('https://'), {
    message: 'Domain should not include protocol (http:// or https://)',
  });

// WordPress connection schema
export const wordPressConnectionSchema = z.object({
  domain: domainSchema,
  username: z.string().min(1, 'Username is required'),
  applicationPassword: z.string().min(1, 'Application password is required'),
});

// Webflow connection schema (for future use)
export const webflowConnectionSchema = z.object({
  domain: domainSchema,
  apiToken: z.string().min(1, 'API token is required'),
  siteId: z.string().min(1, 'Site ID is required'),
});

// Shopify connection schema (for future use)
export const shopifyConnectionSchema = z.object({
  storeDomain: z
    .string()
    .min(1, 'Store domain is required')
    .regex(/^[a-zA-Z0-9-]+\.myshopify\.com$/, 'Invalid Shopify store domain'),
  accessToken: z.string().min(1, 'Access token is required'),
});

// Ghost connection schema (for future use)
export const ghostConnectionSchema = z.object({
  domain: domainSchema,
  adminApiKey: z.string().min(1, 'Admin API key is required'),
});

// Generic connection validation
export const connectionTypeSchema = z.enum([
  'wordpress',
  'webflow',
  'shopify',
  'ghost',
  'seomatic',
]);

export const connectionStatusSchema = z.enum([
  'pending',
  'active',
  'error',
  'disconnected',
]);

// Base connection schema
export const baseConnectionSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID'),
  connectionType: connectionTypeSchema,
  connectionUrl: z.string().min(1, 'Connection URL is required'),
  status: connectionStatusSchema.default('pending'),
});

// WordPress validation request
export const wordPressValidateSchema = z.object({
  domain: domainSchema,
});

// WordPress connect request
export const wordPressConnectSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID'),
  domain: domainSchema,
});

// WordPress callback request
export const wordPressCallbackSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID'),
  domain: domainSchema,
  siteUrl: z.string().url().optional(), // Full site URL from WordPress
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  success: z.boolean(),
  error: z.string().optional(),
});

// Update connection status
export const updateConnectionStatusSchema = z.object({
  connectionId: z.string().uuid('Invalid connection ID'),
  status: connectionStatusSchema,
  error: z.string().optional(),
});

// Connection response type
export const connectionResponseSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  connectionType: connectionTypeSchema,
  connectionUrl: z.string(),
  status: connectionStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  // CMS-specific fields
  cms: z
    .object({
      apiUsername: z.string().optional(),
      lastSyncAt: z.date().optional(),
      lastSyncError: z.string().optional(),
    })
    .optional(),
});

// Type exports
export type Domain = z.infer<typeof domainSchema>;
export type WordPressConnection = z.infer<typeof wordPressConnectionSchema>;
export type WebflowConnection = z.infer<typeof webflowConnectionSchema>;
export type ShopifyConnection = z.infer<typeof shopifyConnectionSchema>;
export type GhostConnection = z.infer<typeof ghostConnectionSchema>;
export type ConnectionType = z.infer<typeof connectionTypeSchema>;
export type ConnectionStatus = z.infer<typeof connectionStatusSchema>;
export type BaseConnection = z.infer<typeof baseConnectionSchema>;
export type WordPressValidateRequest = z.infer<typeof wordPressValidateSchema>;
export type WordPressConnectRequest = z.infer<typeof wordPressConnectSchema>;
export type WordPressCallbackRequest = z.infer<typeof wordPressCallbackSchema>;
export type UpdateConnectionStatus = z.infer<
  typeof updateConnectionStatusSchema
>;
export type ConnectionResponse = z.infer<typeof connectionResponseSchema>;
