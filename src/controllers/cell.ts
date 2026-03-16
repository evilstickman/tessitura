import { NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import { AuthenticationError, ValidationError, ConflictError } from '@/lib/errors';
import { UUID_REGEX, errorResponse } from '@/lib/api-helpers';
import {
  completeCell as completeCellModel,
  undoCompletion as undoCompletionModel,
  resetCell as resetCellModel,
} from '@/models/cell';
import { formatCellResponse } from '@/views/row';

export async function completeCell(gridId: string, rowId: string, cellId: string) {
  try {
    if (!UUID_REGEX.test(gridId) || !UUID_REGEX.test(rowId) || !UUID_REGEX.test(cellId)) {
      return errorResponse('Invalid ID format', 'VALIDATION_ERROR', 400);
    }
    const userId = await getCurrentUserId();
    const cell = await completeCellModel(gridId, rowId, cellId, userId);
    if (!cell) {
      return errorResponse('Cell not found', 'NOT_FOUND', 404);
    }
    return NextResponse.json(formatCellResponse(cell), { status: 201 });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return errorResponse(error.message, 'AUTHENTICATION_ERROR', 401);
    }
    if (error instanceof ConflictError) {
      return errorResponse(error.message, 'CONFLICT', 409);
    }
    if (error instanceof ValidationError) {
      return errorResponse(error.message, 'VALIDATION_ERROR', 400);
    }
    // P2002 unique constraint violation = concurrent race
    if (error instanceof Error && 'code' in error && (error as { code: string }).code === 'P2002') {
      return errorResponse('Cell already completed today', 'CONFLICT', 409);
    }
    return errorResponse('Internal server error', 'INTERNAL_ERROR', 500);
  }
}

export async function undoCompletion(gridId: string, rowId: string, cellId: string) {
  try {
    if (!UUID_REGEX.test(gridId) || !UUID_REGEX.test(rowId) || !UUID_REGEX.test(cellId)) {
      return errorResponse('Invalid ID format', 'VALIDATION_ERROR', 400);
    }
    const userId = await getCurrentUserId();
    const cell = await undoCompletionModel(gridId, rowId, cellId, userId);
    if (!cell) {
      return errorResponse('Cell not found', 'NOT_FOUND', 404);
    }
    return NextResponse.json(formatCellResponse(cell));
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return errorResponse(error.message, 'AUTHENTICATION_ERROR', 401);
    }
    if (error instanceof ConflictError) {
      return errorResponse(error.message, 'CONFLICT', 409);
    }
    return errorResponse('Internal server error', 'INTERNAL_ERROR', 500);
  }
}

export async function resetCell(gridId: string, rowId: string, cellId: string) {
  try {
    if (!UUID_REGEX.test(gridId) || !UUID_REGEX.test(rowId) || !UUID_REGEX.test(cellId)) {
      return errorResponse('Invalid ID format', 'VALIDATION_ERROR', 400);
    }
    const userId = await getCurrentUserId();
    const cell = await resetCellModel(gridId, rowId, cellId, userId);
    if (!cell) {
      return errorResponse('Cell not found', 'NOT_FOUND', 404);
    }
    return NextResponse.json(formatCellResponse(cell));
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return errorResponse(error.message, 'AUTHENTICATION_ERROR', 401);
    }
    if (error instanceof ConflictError) {
      return errorResponse(error.message, 'CONFLICT', 409);
    }
    return errorResponse('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
