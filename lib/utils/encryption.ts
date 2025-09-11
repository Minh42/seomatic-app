import crypto from 'crypto';

/**
 * Encryption utilities for secure credential storage
 * Uses AES-256-GCM for authenticated encryption
 */

const ALGORITHM = 'aes-256-gcm';
const SALT_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

/**
 * Get or generate encryption key from environment
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }

  // Ensure key is 32 bytes for AES-256
  const hash = crypto.createHash('sha256');
  hash.update(key);
  return hash.digest();
}

/**
 * Encrypt sensitive data
 */
export function encrypt(text: string): string {
  const key = getEncryptionKey();

  // Generate random IV for each encryption
  const iv = crypto.randomBytes(IV_LENGTH);

  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  // Encrypt the text
  let encrypted = cipher.update(text, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  // Get the authentication tag
  const authTag = cipher.getAuthTag();

  // Combine IV, auth tag, and encrypted data
  const combined = Buffer.concat([iv, authTag, encrypted]);

  // Return base64 encoded string
  return combined.toString('base64');
}

/**
 * Decrypt sensitive data
 */
export function decrypt(encryptedText: string): string {
  const key = getEncryptionKey();

  // Decode from base64
  const combined = Buffer.from(encryptedText, 'base64');

  // Extract components
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH + TAG_LENGTH);

  // Create decipher
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  // Decrypt
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString('utf8');
}

/**
 * Hash a value for comparison (one-way)
 */
export function hash(value: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const hash = crypto.pbkdf2Sync(value, salt, 100000, 64, 'sha512');
  return salt.toString('hex') + ':' + hash.toString('hex');
}

/**
 * Verify a value against a hash
 */
export function verifyHash(value: string, hashedValue: string): boolean {
  const [salt, originalHash] = hashedValue.split(':');
  const hash = crypto.pbkdf2Sync(
    value,
    Buffer.from(salt, 'hex'),
    100000,
    64,
    'sha512'
  );
  return hash.toString('hex') === originalHash;
}

/**
 * Generate a secure random token
 */
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Encrypt connection credentials
 */
export interface ConnectionCredentials {
  username?: string;
  password?: string;
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  [key: string]: string | undefined;
}

/**
 * Encrypt connection credentials as JSON
 */
export function encryptCredentials(credentials: ConnectionCredentials): string {
  const json = JSON.stringify(credentials);
  return encrypt(json);
}

/**
 * Decrypt connection credentials from JSON
 */
export function decryptCredentials(
  encryptedCredentials: string
): ConnectionCredentials {
  try {
    const json = decrypt(encryptedCredentials);
    return JSON.parse(json);
  } catch {
    throw new Error('Failed to decrypt credentials');
  }
}

/**
 * Mask sensitive data for logging
 */
export function maskSensitiveData(
  value: string,
  visibleChars: number = 4
): string {
  if (!value || value.length <= visibleChars) {
    return '****';
  }

  const visible = value.substring(0, visibleChars);
  const masked = '*'.repeat(Math.max(4, value.length - visibleChars));
  return visible + masked;
}

/**
 * Check if encryption is properly configured
 */
export function isEncryptionConfigured(): boolean {
  return !!process.env.ENCRYPTION_KEY;
}

/**
 * Generate a secure encryption key (for initial setup)
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('base64');
}
