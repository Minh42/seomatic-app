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

    // Process all team member invitations in parallel for better performance
    const invitationPromises = teamMembers.map(async member => {
      try {
        // Additional validation
        const normalizedEmail = member.email.toLowerCase().trim();

        // Skip if email is the same as the inviter
        if (normalizedEmail === session.user.email?.toLowerCase()) {
          return {
            email: member.email,
            status: 'failed',
            error: 'Cannot invite yourself',
          };
        }

        // Check for disposable emails
        const emailValidation = validateWorkEmail(normalizedEmail);
        if (!emailValidation.isValid) {
          return {
            email: member.email,
            status: 'failed',
            error: emailValidation.error,
          };
        }

        // Check if invitation already exists for this user
        const existingInvitation = await TeamService.checkExistingInvitation(
          normalizedEmail,
          userId
        );

        if (existingInvitation) {
          return {
            email: member.email,
            status: 'skipped',
            message: 'Invitation already sent',
          };
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
          return {
            email: member.email,
            status: 'skipped',
            message: 'Invitation already sent',
          };
        } else {
          return {
            email: member.email,
            status: 'sent',
          };
        }
      } catch (error) {
        return {
          email: member.email,
          status: 'failed',
          error:
            error instanceof Error
              ? error.message
              : 'Failed to send invitation',
        };
      }
    });

    // Wait for all invitations to complete in parallel
    const invitationResults = await Promise.all(invitationPromises);

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
