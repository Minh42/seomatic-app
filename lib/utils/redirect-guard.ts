import { headers } from 'next/headers';

/**
 * Utility to prevent redirect loops by tracking redirect attempts
 */
export class RedirectGuard {
  private static readonly REDIRECT_HEADER = 'x-redirect-count';
  private static readonly MAX_REDIRECTS = 3;
  private static readonly REDIRECT_PATH_HEADER = 'x-redirect-path';

  /**
   * Check if we're in a potential redirect loop
   */
  static async isRedirectLoop(targetPath: string): Promise<boolean> {
    try {
      const headersList = await headers();

      // Check redirect count
      const redirectCount = parseInt(
        headersList.get(this.REDIRECT_HEADER) || '0',
        10
      );
      if (redirectCount >= this.MAX_REDIRECTS) {
        return true;
      }

      // Check if we're redirecting to the same path we came from
      const lastPath = headersList.get(this.REDIRECT_PATH_HEADER);
      const currentPath = headersList.get('x-pathname') || '';

      if (lastPath === targetPath && currentPath === targetPath) {
        return true;
      }

      return false;
    } catch {
      // On error, allow the redirect to prevent blocking users
      return false;
    }
  }

  /**
   * Get headers to track redirect attempts
   */
  static async getRedirectHeaders(targetPath: string): Promise<Headers> {
    const headersList = await headers();
    const currentCount = parseInt(
      headersList.get(this.REDIRECT_HEADER) || '0',
      10
    );

    const newHeaders = new Headers();
    newHeaders.set(this.REDIRECT_HEADER, (currentCount + 1).toString());
    newHeaders.set(this.REDIRECT_PATH_HEADER, targetPath);

    return newHeaders;
  }
}

/**
 * Check if the current path matches the target path
 * This helps prevent redirecting to the same page
 */
export async function isCurrentPath(targetPath: string): Promise<boolean> {
  try {
    const headersList = await headers();
    const pathname = headersList.get('x-pathname') || '';
    return pathname === targetPath;
  } catch {
    return false;
  }
}
