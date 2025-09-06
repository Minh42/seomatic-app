import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { OnboardingService } from '@/lib/services/onboarding-service';
import { z } from 'zod';

// Schema for progress update - flexible to handle various step data
const progressSchema = z.object({
  step: z.number().min(1).max(4),
  data: z.any().optional(), // Data is optional for step-only updates
});

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
    const validationResult = progressSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid data',
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { step, data } = validationResult.data;
    const userId = session.user.id;

    // Save progress using the service
    const result = await OnboardingService.saveProgress({
      userId,
      step,
      data,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error saving onboarding progress:', error);

    // Handle service-level errors
    if (error instanceof Error) {
      if (error.message === 'User not found') {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message === 'Onboarding already completed') {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json(
      { error: 'Failed to save progress' },
      { status: 500 }
    );
  }
}
