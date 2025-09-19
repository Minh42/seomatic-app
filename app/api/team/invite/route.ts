import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { TeamService } from '@/lib/services/team-service';
import { OrganizationService } from '@/lib/services/organization-service';
import { z } from 'zod';
import { validateWorkEmail } from '@/lib/utils/email-validation';
import { requireRole } from '@/lib/middleware/require-role';

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
    // Check if user has permission to invite team members
    const roleCheck = await requireRole(request, {
      requiredAction: 'team:invite',
    });
    if (roleCheck) return roleCheck;

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

    // Get user's organization
    let organizationId: string;
    const organization = await OrganizationService.getUserOrganization(userId);

    if (!organization) {
      // Create organization for user if they don't have one
      const newOrg = await OrganizationService.create({
        name: 'My Organization',
        ownerId: userId,
      });
      organizationId = newOrg.id;
    } else {
      organizationId = organization.id;
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
        const result = await TeamService.inviteMember({
          email: normalizedEmail,
          role: member.role,
          invitedBy: userId,
          organizationId,
        });

        // Check if invitation was already sent
        if (result.status === 'already_invited') {
          invitationResults.push({
            email: member.email,
            status: 'skipped',
            message: 'Invitation already sent',
          });
        } else {
          invitationResults.push({
            email: member.email,
            status: 'sent',
          });
        }
      } catch (error) {
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
    const skippedCount = invitationResults.filter(
      r => r.status === 'skipped'
    ).length;

    // Build a user-friendly message
    let message = '';
    if (successCount > 0) {
      message = `${successCount} invitation${successCount !== 1 ? 's' : ''} sent`;
    }
    if (skippedCount > 0 && successCount === 0) {
      message = 'All team members already invited';
    }
    if (failCount > 0) {
      message += message ? `, ${failCount} failed` : `${failCount} failed`;
    }

    return NextResponse.json({
      success: true,
      message: message || 'Team members processed',
      invitations: invitationResults,
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to send invitations' },
      { status: 500 }
    );
  }
}
