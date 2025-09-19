import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { teamMembers, organizations, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { EmailService } from '@/lib/services/email-service';

/**
 * POST /api/user/organizations/[organizationId]/leave
 * Leave an organization (only for non-owners)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { organizationId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { organizationId } = params;

    // Check if user is the owner
    const [org] = await db
      .select()
      .from(organizations)
      .where(
        and(
          eq(organizations.id, organizationId),
          eq(organizations.ownerId, session.user.id)
        )
      )
      .limit(1);

    if (org) {
      return NextResponse.json(
        { error: 'Organization owners cannot leave their own organization' },
        { status: 400 }
      );
    }

    // Check if user is a member
    const [membership] = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.organizationId, organizationId),
          eq(teamMembers.memberUserId, session.user.id),
          eq(teamMembers.status, 'active')
        )
      )
      .limit(1);

    if (!membership) {
      return NextResponse.json(
        { error: 'You are not a member of this organization' },
        { status: 404 }
      );
    }

    // Get organization details including owner for notification
    const [organization] = await db
      .select({
        name: organizations.name,
        ownerId: organizations.ownerId,
      })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    // Remove the user from the organization
    await db
      .delete(teamMembers)
      .where(
        and(
          eq(teamMembers.organizationId, organizationId),
          eq(teamMembers.memberUserId, session.user.id)
        )
      );

    // Send notification to organization owner (fire and forget)
    if (organization?.ownerId) {
      const [owner] = await db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, organization.ownerId))
        .limit(1);

      if (owner?.email && session.user.email) {
        EmailService.notifyMemberLeft(
          owner.email,
          session.user.email,
          organization.name || undefined
        ).catch(error => {
          console.error('Failed to send member left notification:', error);
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully left the organization',
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to leave organization' },
      { status: 500 }
    );
  }
}
