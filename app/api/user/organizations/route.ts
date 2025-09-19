import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { OrganizationService } from '@/lib/services/organization-service';
import { UserService } from '@/lib/services/user-service';

/**
 * GET /api/user/organizations
 * Get all organizations the current user belongs to
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await UserService.findByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get all organizations for the user (owned or member)
    const organizations = await OrganizationService.getAllUserOrganizations(
      user.id
    );

    return NextResponse.json({ organizations });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch organizations' },
      { status: 500 }
    );
  }
}
