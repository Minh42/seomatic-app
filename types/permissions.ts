/**
 * Client-side permission types
 * These are duplicated from server-side to avoid importing server code in client components
 */

export type UserRole = 'owner' | 'admin' | 'member' | 'viewer' | null;
