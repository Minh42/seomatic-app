import { NextRequest, NextResponse } from 'next/server';
import { TeamService } from '@/lib/services/team-service';
import { z } from 'zod';

const validateSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validationResult = validateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }

    const { token } = validationResult.data;

    // Validate the invitation using TeamService
    const result = await TeamService.validateInvitation(token);

    if (!result.valid) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json({
      invitation: {
        email: result.invitation!.email,
        role: result.invitation!.role,
        organizationName: result.invitation!.organization.name,
        inviterName: result.invitation!.inviter.name,
        expiresAt: result.invitation!.expiresAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Invitation validation error:', error);
    return NextResponse.json(
      { error: 'Failed to validate invitation' },
      { status: 500 }
    );
  }
}
