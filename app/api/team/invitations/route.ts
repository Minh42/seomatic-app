import { NextRequest, NextResponse } from 'next/server';
import { TeamService } from '@/lib/services/team-service';
import { z } from 'zod';
import {
  withRateLimit,
  addRateLimitHeaders,
} from '@/lib/middleware/rate-limit';
import { requireRole, getUserFromRequest } from '@/lib/middleware/require-role';

const inviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'member', 'viewer']),
});

/**
 * POST /api/team/invitations
 * Send a team invitation
 */
export async function POST(request: NextRequest) {
  // Check rate limit
  const rateLimitResponse = await withRateLimit(request, {
    type: 'teamInvite',
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    // Check if user has permission to invite team members
    const roleCheck = await requireRole(request, {
      requiredAction: 'team:invite',
    });
    if (roleCheck) return roleCheck;

    const { user } = getUserFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found in request' },
        { status: 500 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = inviteSchema.parse(body);

    // Send invitation
    const result = await TeamService.inviteMember({
      email: validatedData.email,
      role: validatedData.role,
      invitedBy: user.id,
    });

    const response = NextResponse.json(result);
    return addRateLimitHeaders(response, request);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      if (error.message.includes('already a team member')) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
    }

    console.error('Error sending invitation:', error);
    return NextResponse.json(
      { error: 'Failed to send invitation' },
      { status: 500 }
    );
  }
}
