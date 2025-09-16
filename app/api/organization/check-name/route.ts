import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { organizations } from '@/lib/db/schema';
import { eq, and, ne } from 'drizzle-orm';
import { organizationNameSchema } from '@/lib/validations/onboarding';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, currentOrganizationId } = body;

    // Validate the organization name format
    try {
      organizationNameSchema.parse(name);
    } catch {
      return NextResponse.json(
        {
          available: false,
          error: 'Invalid organization name format',
        },
        { status: 400 }
      );
    }

    // Check if organization name already exists
    // If currentOrganizationId is provided, exclude it from the check (for editing existing organization)
    const conditions = [eq(organizations.name, name)];

    if (currentOrganizationId) {
      conditions.push(ne(organizations.id, currentOrganizationId));
    }

    const existingOrganization = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(and(...conditions))
      .limit(1);

    const isAvailable = existingOrganization.length === 0;

    return NextResponse.json({
      available: isAvailable,
      message: isAvailable
        ? 'This organization name is available'
        : 'This organization name is already taken. Please choose a different name.',
    });
  } catch (error) {
    console.error('Error checking organization name:', error);
    return NextResponse.json(
      { error: 'Failed to check organization name availability' },
      { status: 500 }
    );
  }
}
