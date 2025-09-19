import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { OrganizationService } from '@/lib/services/organization-service';
import { WorkspaceService } from '@/lib/services/workspace-service';
import { OnboardingService } from '@/lib/services/onboarding-service';
import { organizationNameSchema } from '@/lib/validations/onboarding';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const userId = session.user.id;

    // Validate organization name
    try {
      organizationNameSchema.parse(body.organizationName);
    } catch {
      return NextResponse.json(
        {
          error: 'Invalid organization name format',
          field: 'organizationName',
        },
        { status: 400 }
      );
    }

    // Check if user already has an organization
    let organization = await OrganizationService.getUserOrganization(userId);
    let workspace;

    if (!organization) {
      try {
        // Create new organization
        organization = await OrganizationService.create({
          name: body.organizationName,
          ownerId: userId,
        });

        // Create default workspace
        workspace = await WorkspaceService.create({
          name: 'Default Workspace',
          ownerId: userId,
          organizationId: organization.id,
          createdById: userId,
        });
      } catch (error) {
        if (error instanceof Error) {
          if (
            error.message.includes('duplicate') ||
            error.message.includes('already exists')
          ) {
            return NextResponse.json(
              {
                error:
                  'An organization with this name already exists. Please choose a different name.',
                code: 'DUPLICATE_ORGANIZATION',
                field: 'organizationName',
              },
              { status: 409 }
            );
          }
        }

        return NextResponse.json(
          {
            error: 'Failed to create organization. Please try again.',
            code: 'ORGANIZATION_ERROR',
            field: 'organizationName',
          },
          { status: 500 }
        );
      }
    } else {
      // Organization already exists, get the primary workspace
      workspace = await WorkspaceService.getPrimaryWorkspace(userId);
    }

    // Save Step 2 progress (professional info only, not organization name)
    await OnboardingService.saveProgress({
      userId,
      step: 2,
      data: {
        professionalRole: body.professionalRole,
        otherProfessionalRole: body.otherProfessionalRole,
        companySize: body.companySize,
        industry: body.industry,
        otherIndustry: body.otherIndustry,
      },
    });

    return NextResponse.json(
      {
        success: true,
        organizationId: organization.id,
        organizationName: organization.name,
        workspaceId: workspace?.id,
        message: 'Organization created successfully',
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { error: 'Failed to process step 2' },
      { status: 500 }
    );
  }
}
