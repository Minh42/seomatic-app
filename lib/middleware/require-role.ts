import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { UserService } from '@/lib/services/user-service';
import {
  getUserRole,
  hasRole,
  canPerformAction,
  type UserRole,
} from '@/lib/auth/permissions';

export interface RoleCheckOptions {
  requiredRole?: UserRole;
  requiredAction?: string;
  allowUnauthenticated?: boolean;
}

/**
 * Middleware to check if user has required role or permission
 *
 * Usage:
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const roleCheck = await requireRole(request, { requiredRole: 'admin' });
 *   if (roleCheck) return roleCheck;
 *
 *   // Your API logic here
 * }
 * ```
 */
export async function requireRole(
  request: NextRequest,
  options: RoleCheckOptions = {}
): Promise<NextResponse | null> {
  const {
    requiredRole,
    requiredAction,
    allowUnauthenticated = false,
  } = options;

  try {
    // Get session
    const session = await getServerSession(authOptions);

    // Check authentication
    if (!session?.user?.email) {
      if (allowUnauthenticated) {
        return null;
      }
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from database
    const user = await UserService.findByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get user's role
    const userRole = await getUserRole(user.id);

    // Check role requirement
    if (requiredRole && !hasRole(userRole, requiredRole)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Check action permission
    if (requiredAction && !canPerformAction(userRole, requiredAction)) {
      return NextResponse.json(
        { error: `You don't have permission to perform this action` },
        { status: 403 }
      );
    }

    // Store user and role in request for later use
    (request as any).user = user;
    (request as any).userRole = userRole;

    return null; // All checks passed
  } catch (error) {
    console.error('Role check error:', error);
    return NextResponse.json(
      { error: 'Failed to verify permissions' },
      { status: 500 }
    );
  }
}

/**
 * Get user and role from request (after requireRole has been called)
 */
export function getUserFromRequest(request: NextRequest): {
  user?: any;
  role?: UserRole;
} {
  return {
    user: (request as any).user,
    role: (request as any).userRole,
  };
}

/**
 * Check if request has a specific role (without blocking)
 * Useful for conditional logic
 */
export async function checkUserRole(
  request: NextRequest,
  requiredRole: UserRole
): Promise<boolean> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return false;

    const user = await UserService.findByEmail(session.user.email);
    if (!user) return false;

    const userRole = await getUserRole(user.id);
    return hasRole(userRole, requiredRole);
  } catch (error) {
    console.error('Error checking user role:', error);
    return false;
  }
}

/**
 * Check if request can perform a specific action (without blocking)
 */
export async function checkUserAction(
  request: NextRequest,
  action: string
): Promise<boolean> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return false;

    const user = await UserService.findByEmail(session.user.email);
    if (!user) return false;

    const userRole = await getUserRole(user.id);
    return canPerformAction(userRole, action);
  } catch (error) {
    console.error('Error checking user action:', error);
    return false;
  }
}
