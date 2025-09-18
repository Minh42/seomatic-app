import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { teamInvitations, teamMembers } from '@/lib/db/schema';
import { eq, and, gte } from 'drizzle-orm';
import { z } from 'zod';
import { validateWorkEmail } from '@/lib/utils/email-validation';

const checkEmailSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = checkEmailSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          available: false,
          error: 'Invalid email format',
        },
        { status: 400 }
      );
    }

    const { email } = validationResult.data;

    // Check if it's the current user's email
    if (email === session.user.email?.toLowerCase()) {
      return NextResponse.json({
        available: false,
        error: 'You cannot invite yourself',
      });
    }

    // Check for disposable emails
    const emailValidation = validateWorkEmail(email);
    if (!emailValidation.isValid) {
      return NextResponse.json({
        available: false,
        error: emailValidation.error,
      });
    }

    // Check if email exists in team invitations (pending invites)
    const [existingInvitation] = await db
      .select({
        id: teamInvitations.id,
        expiresAt: teamInvitations.expiresAt,
        teamMemberId: teamInvitations.teamMemberId,
      })
      .from(teamInvitations)
      .where(
        and(
          eq(teamInvitations.email, email),
          gte(teamInvitations.expiresAt, new Date()) // Only check non-expired invitations
        )
      )
      .limit(1);

    if (existingInvitation) {
      // Check the status of the associated team member
      const [teamMember] = await db
        .select({ status: teamMembers.status })
        .from(teamMembers)
        .where(eq(teamMembers.id, existingInvitation.teamMemberId))
        .limit(1);

      if (teamMember) {
        if (teamMember.status === 'pending') {
          return NextResponse.json({
            available: false,
            error: 'An invitation has already been sent to this email',
          });
        } else if (teamMember.status === 'active') {
          return NextResponse.json({
            available: false,
            error: 'This user is already a team member',
          });
        }
      }
    }

    return NextResponse.json({
      available: true,
      message: 'Email is available for invitation',
    });
  } catch (error) {
    console.error('Error checking team member email:', error);
    return NextResponse.json(
      { error: 'Failed to check email availability' },
      { status: 500 }
    );
  }
}
