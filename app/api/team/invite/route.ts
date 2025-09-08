import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { TeamService } from '@/lib/services/team-service';
import { z } from 'zod';
import { validateWorkEmail } from '@/lib/utils/email-validation';

const inviteSchema = z.object({
  teamMembers: z.array(
    z.object({
      email: z.string().email().toLowerCase().trim(),
      role: z.enum(['viewer', 'member', 'admin']),
    })
  ),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = inviteSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid data',
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { teamMembers } = validationResult.data;
    const userId = session.user.id;
    const invitationResults = [];

    // First, get all existing pending invitations for this user
    const existingInvitations = await TeamService.getPendingInvitations(userId);

    // Create a set of current emails for quick lookup
    const currentEmails = new Set(teamMembers.map(m => m.email.toLowerCase()));

    // Delete invitations that are no longer in the list
    const deletionResults = [];
    for (const existing of existingInvitations) {
      if (!currentEmails.has(existing.email.toLowerCase())) {
        try {
          await TeamService.deleteInvitation(existing.teamMemberId, userId);
          deletionResults.push({
            email: existing.email,
            status: 'deleted',
          });
        } catch (error) {
          console.error('Failed to delete invitation:', error);
        }
      }
    }

    // Process each team member invitation
    for (const member of teamMembers) {
      try {
        // Additional validation
        const normalizedEmail = member.email.toLowerCase().trim();

        // Skip if email is the same as the inviter
        if (normalizedEmail === session.user.email?.toLowerCase()) {
          invitationResults.push({
            email: member.email,
            status: 'failed',
            error: 'Cannot invite yourself',
          });
          continue;
        }

        // Check for disposable emails
        const emailValidation = validateWorkEmail(normalizedEmail);
        if (!emailValidation.isValid) {
          invitationResults.push({
            email: member.email,
            status: 'failed',
            error: emailValidation.error,
          });
          continue;
        }

        // Check if invitation already exists for this user
        const existingInvitation = await TeamService.checkExistingInvitation(
          normalizedEmail,
          userId
        );

        if (existingInvitation) {
          invitationResults.push({
            email: member.email,
            status: 'skipped',
            message: 'Invitation already sent',
          });
          continue;
        }

        // Send invitation
        await TeamService.inviteMember({
          email: normalizedEmail,
          role: member.role,
          invitedBy: userId,
        });

        invitationResults.push({
          email: member.email,
          status: 'sent',
        });
      } catch (error) {
        console.error('Failed to invite team member:', error);
        invitationResults.push({
          email: member.email,
          status: 'failed',
          error:
            error instanceof Error
              ? error.message
              : 'Failed to send invitation',
        });
      }
    }

    // Count results
    const successCount = invitationResults.filter(
      r => r.status === 'sent'
    ).length;
    const failCount = invitationResults.filter(
      r => r.status === 'failed'
    ).length;
    const deletedCount = deletionResults.length;

    return NextResponse.json({
      success: true,
      message: `${successCount} invitation${successCount !== 1 ? 's' : ''} sent successfully${failCount > 0 ? `, ${failCount} failed` : ''}${deletedCount > 0 ? `, ${deletedCount} removed` : ''}`,
      invitations: invitationResults,
      deletions: deletionResults,
    });
  } catch (error) {
    console.error('Error sending team invitations:', error);
    return NextResponse.json(
      { error: 'Failed to send invitations' },
      { status: 500 }
    );
  }
}
