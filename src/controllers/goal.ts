import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import { AuthenticationError, ConflictError, ValidationError } from '@/lib/errors';
import { UUID_REGEX, errorResponse } from '@/lib/api-helpers';
import {
  createGoal as createGoalModel,
  listGoals as listGoalsModel,
  getGoalById,
  updateGoal as updateGoalModel,
  deleteGoal as deleteGoalModel,
} from '@/models/goal';
import { formatGoal, formatGoalList } from '@/views/goal';

export async function createGoal(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== 'object') {
      return errorResponse('Request body is required', 'VALIDATION_ERROR', 400);
    }
    if (typeof body.goalType !== 'string') {
      return errorResponse('goalType must be a string', 'VALIDATION_ERROR', 400);
    }
    if (typeof body.targetValue !== 'number') {
      return errorResponse('targetValue must be a number', 'VALIDATION_ERROR', 400);
    }

    const goal = await createGoalModel(userId, {
      goalType: body.goalType,
      targetValue: body.targetValue,
    });

    return NextResponse.json(formatGoal(goal), { status: 201 });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return errorResponse(error.message, 'AUTHENTICATION_ERROR', 401);
    }
    if (error instanceof ValidationError) {
      return errorResponse(error.message, 'VALIDATION_ERROR', 400);
    }
    if (error instanceof ConflictError) {
      return errorResponse(error.message, 'CONFLICT', 409);
    }
    return errorResponse('Internal server error', 'INTERNAL_ERROR', 500);
  }
}

export async function listGoals(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    const all = request.nextUrl.searchParams.get('all') === 'true';
    const goals = await listGoalsModel(userId, all);
    return NextResponse.json(formatGoalList(goals));
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return errorResponse(error.message, 'AUTHENTICATION_ERROR', 401);
    }
    return errorResponse('Internal server error', 'INTERNAL_ERROR', 500);
  }
}

export async function getGoal(goalId: string) {
  try {
    if (!UUID_REGEX.test(goalId)) {
      return errorResponse('Invalid goal ID format', 'VALIDATION_ERROR', 400);
    }
    const userId = await getCurrentUserId();
    const goal = await getGoalById(goalId, userId);
    if (!goal) {
      return errorResponse('Goal not found', 'NOT_FOUND', 404);
    }
    return NextResponse.json(formatGoal(goal));
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return errorResponse(error.message, 'AUTHENTICATION_ERROR', 401);
    }
    return errorResponse('Internal server error', 'INTERNAL_ERROR', 500);
  }
}

export async function updateGoal(goalId: string, request: NextRequest) {
  try {
    if (!UUID_REGEX.test(goalId)) {
      return errorResponse('Invalid goal ID format', 'VALIDATION_ERROR', 400);
    }
    const userId = await getCurrentUserId();
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return errorResponse('Request body is required', 'VALIDATION_ERROR', 400);
    }

    // Per-field type checks mirror the model's rules — clearer error messages
    // than letting Prisma complain.
    if ('targetValue' in body && typeof body.targetValue !== 'number') {
      return errorResponse('targetValue must be a number', 'VALIDATION_ERROR', 400);
    }
    if ('active' in body && typeof body.active !== 'boolean') {
      return errorResponse('active must be a boolean', 'VALIDATION_ERROR', 400);
    }

    const goal = await updateGoalModel(goalId, userId, body);
    if (!goal) {
      return errorResponse('Goal not found', 'NOT_FOUND', 404);
    }
    return NextResponse.json(formatGoal(goal));
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return errorResponse(error.message, 'AUTHENTICATION_ERROR', 401);
    }
    if (error instanceof ValidationError) {
      return errorResponse(error.message, 'VALIDATION_ERROR', 400);
    }
    return errorResponse('Internal server error', 'INTERNAL_ERROR', 500);
  }
}

export async function deleteGoal(goalId: string) {
  try {
    if (!UUID_REGEX.test(goalId)) {
      return errorResponse('Invalid goal ID format', 'VALIDATION_ERROR', 400);
    }
    const userId = await getCurrentUserId();
    const deleted = await deleteGoalModel(goalId, userId);
    if (!deleted) {
      return errorResponse('Goal not found', 'NOT_FOUND', 404);
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return errorResponse(error.message, 'AUTHENTICATION_ERROR', 401);
    }
    return errorResponse('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
