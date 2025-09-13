import { redis } from '@/lib/redis';
import { revalidatePath } from 'next/cache';

export interface SubdomainData {
  emoji: string;
  createdAt: number;
}

export class SubdomainService {
  /**
   * Validate if the provided icon is a valid emoji
   */
  static isValidIcon(icon: string): boolean {
    // Check if it's a valid emoji (max 10 characters to allow for complex emojis)
    const emojiRegex = /^(\p{Emoji}|\p{Emoji_Component})+$/u;
    return icon.length <= 10 && emojiRegex.test(icon);
  }

  /**
   * Sanitize subdomain to ensure it only contains valid characters
   */
  static sanitizeSubdomain(subdomain: string): string {
    return subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '');
  }

  /**
   * Check if a subdomain is valid
   */
  static isValidSubdomain(subdomain: string): boolean {
    const sanitized = this.sanitizeSubdomain(subdomain);
    return sanitized === subdomain && subdomain.length > 0;
  }

  /**
   * Check if a subdomain already exists
   */
  static async exists(subdomain: string): Promise<boolean> {
    const data = await redis.get(`subdomain:${subdomain}`);
    return data !== null;
  }

  /**
   * Create a new subdomain
   */
  static async create(
    subdomain: string,
    icon: string
  ): Promise<{ success: boolean; error?: string }> {
    // Validate icon
    if (!this.isValidIcon(icon)) {
      return {
        success: false,
        error: 'Please enter a valid emoji (maximum 10 characters)',
      };
    }

    // Sanitize and validate subdomain
    const sanitizedSubdomain = this.sanitizeSubdomain(subdomain);
    if (sanitizedSubdomain !== subdomain) {
      return {
        success: false,
        error:
          'Subdomain can only have lowercase letters, numbers, and hyphens',
      };
    }

    // Check if subdomain already exists
    if (await this.exists(sanitizedSubdomain)) {
      return {
        success: false,
        error: 'This subdomain is already taken',
      };
    }

    // Create the subdomain
    await redis.set(`subdomain:${sanitizedSubdomain}`, {
      emoji: icon,
      createdAt: Date.now(),
    });

    return { success: true };
  }

  /**
   * Get subdomain data
   */
  static async get(subdomain: string): Promise<SubdomainData | null> {
    const data = await redis.get(`subdomain:${subdomain}`);
    return data as SubdomainData | null;
  }

  /**
   * Get all subdomains
   */
  static async getAll(): Promise<Array<{ name: string; data: SubdomainData }>> {
    const keys = await redis.keys('subdomain:*');
    const subdomains: Array<{ name: string; data: SubdomainData }> = [];

    for (const key of keys) {
      const name = key.replace('subdomain:', '');
      const data = await redis.get(key);
      if (data) {
        subdomains.push({ name, data: data as SubdomainData });
      }
    }

    return subdomains.sort((a, b) => b.data.createdAt - a.data.createdAt);
  }

  /**
   * Delete a subdomain
   */
  static async delete(subdomain: string): Promise<void> {
    await redis.del(`subdomain:${subdomain}`);
    revalidatePath('/admin');
  }
}
