import { NextRequest, NextResponse } from 'next/server';
import { TeamService } from '@/lib/services/team-service';
import { z } from 'zod';
import { requireRole, getUserFromRequest } from '@/lib/middleware/require-role';

const updateRoleSchema = z.object({
  role: z.enum(['admin', 'member', 'viewer']),
});

/**
 * PATCH /api/team/members/[id]
 * Update team member role
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check if user has permission to update team member roles
    const roleCheck = await requireRole(request, {
      requiredAction: 'team:update_role',
    });
    if (roleCheck) return roleCheck;

    // Get user info from request
    const { user, role: userRole } = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found in request' },
        { status: 500 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateRoleSchema.parse(body);

    // Update member role with security checks
    const result = await TeamService.updateMemberRole({
      teamMemberId: (await params).id,
      role: validatedData.role,
      updatedBy: user.id,
      updaterRole: userRole,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === 'Team member not found') {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: 'Failed to update team member' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/team/members/[id]
 * Remove a team member
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check if user has permission to remove team members
    const roleCheck = await requireRole(request, {
      requiredAction: 'team:remove',
    });
    if (roleCheck) return roleCheck;

    // Get user info from request
    const { user } = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found in request' },
        { status: 500 }
      );
    }

    // Remove team member with security checks
    const result = await TeamService.removeMember((await params).id, user.id);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'Team member not found') {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: 'Failed to remove team member' },
      { status: 500 }
    );
  }
}
