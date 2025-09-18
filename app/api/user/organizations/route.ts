import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { OrganizationService } from '@/lib/services/organization-service';

/**
 * GET /api/user/organizations
 * Get all organizations the current user belongs to
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all organizations for the user
    const organizations = await OrganizationService.getAllUserOrganizations(
      session.user.id
    );

    return NextResponse.json({
      organizations,
      count: organizations.length,
    });
  } catch (error) {
    console.error('Error fetching user organizations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organizations' },
      { status: 500 }
    );
  }
}
