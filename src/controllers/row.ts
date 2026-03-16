import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import { ValidationError } from '@/lib/errors';
import { UUID_REGEX, errorResponse } from '@/lib/api-helpers';
import {
  createRow as createRowModel,
  updateRow as updateRowModel,
  updateRowPriority as updateRowPriorityModel,
  deleteRow as deleteRowModel,
} from '@/models/row';
import { formatRow } from '@/views/row';

export async function createRow(gridId: string, request: NextRequest) {
  try {
    if (!UUID_REGEX.test(gridId)) {
      return errorResponse('Invalid grid ID format', 'VALIDATION_ERROR', 400);
    }

    const userId = await getCurrentUserId();
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== 'object') {
      return errorResponse('Request body is required', 'VALIDATION_ERROR', 400);
    }

    // Type checking on required numeric fields
    for (const field of ['startMeasure', 'endMeasure', 'targetTempo', 'steps'] as const) {
      if (typeof body[field] !== 'number') {
        return errorResponse(`${field} is required and must be a number`, 'VALIDATION_ERROR', 400);
      }
    }

    if (body.pieceId != null && typeof body.pieceId !== 'string') {
      return errorResponse('pieceId must be a string', 'VALIDATION_ERROR', 400);
    }

    if (body.passageLabel != null && typeof body.passageLabel !== 'string') {
      return errorResponse('passageLabel must be a string', 'VALIDATION_ERROR', 400);
    }

    const row = await createRowModel(gridId, userId, {
      startMeasure: body.startMeasure,
      endMeasure: body.endMeasure,
      targetTempo: body.targetTempo,
      steps: body.steps,
      pieceId: body.pieceId ?? null,
      passageLabel: body.passageLabel ?? null,
    });

    if (!row) {
      return errorResponse('Grid not found', 'NOT_FOUND', 404);
    }

    return NextResponse.json(formatRow(row), { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return errorResponse(error.message, 'VALIDATION_ERROR', 400);
    }
    return errorResponse('Internal server error', 'INTERNAL_ERROR', 500);
  }
}

export async function updateRow(gridId: string, rowId: string, request: NextRequest) {
  try {
    if (!UUID_REGEX.test(gridId) || !UUID_REGEX.test(rowId)) {
      return errorResponse('Invalid ID format', 'VALIDATION_ERROR', 400);
    }

    const userId = await getCurrentUserId();
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== 'object') {
      return errorResponse('Request body is required', 'VALIDATION_ERROR', 400);
    }

    // Type checking on optional numeric fields
    for (const field of ['startMeasure', 'endMeasure', 'targetTempo', 'steps'] as const) {
      if (field in body && typeof body[field] !== 'number') {
        return errorResponse(`${field} must be a number`, 'VALIDATION_ERROR', 400);
      }
    }

    if ('pieceId' in body && body.pieceId != null && typeof body.pieceId !== 'string') {
      return errorResponse('pieceId must be a string', 'VALIDATION_ERROR', 400);
    }

    if ('passageLabel' in body && body.passageLabel != null && typeof body.passageLabel !== 'string') {
      return errorResponse('passageLabel must be a string', 'VALIDATION_ERROR', 400);
    }

    const row = await updateRowModel(gridId, rowId, userId, body);

    if (!row) {
      return errorResponse('Row not found', 'NOT_FOUND', 404);
    }

    return NextResponse.json(formatRow(row));
  } catch (error) {
    if (error instanceof ValidationError) {
      return errorResponse(error.message, 'VALIDATION_ERROR', 400);
    }
    return errorResponse('Internal server error', 'INTERNAL_ERROR', 500);
  }
}

export async function updatePriority(gridId: string, rowId: string, request: NextRequest) {
  try {
    if (!UUID_REGEX.test(gridId) || !UUID_REGEX.test(rowId)) {
      return errorResponse('Invalid ID format', 'VALIDATION_ERROR', 400);
    }

    const userId = await getCurrentUserId();
    const body = await request.json().catch(() => null);

    if (!body || typeof body.priority !== 'string') {
      return errorResponse('Priority is required', 'VALIDATION_ERROR', 400);
    }

    const row = await updateRowPriorityModel(gridId, rowId, userId, body.priority);

    if (!row) {
      return errorResponse('Row not found', 'NOT_FOUND', 404);
    }

    return NextResponse.json(formatRow(row));
  } catch (error) {
    if (error instanceof ValidationError) {
      return errorResponse(error.message, 'VALIDATION_ERROR', 400);
    }
    return errorResponse('Internal server error', 'INTERNAL_ERROR', 500);
  }
}

export async function deleteRow(gridId: string, rowId: string) {
  try {
    if (!UUID_REGEX.test(gridId) || !UUID_REGEX.test(rowId)) {
      return errorResponse('Invalid ID format', 'VALIDATION_ERROR', 400);
    }

    const userId = await getCurrentUserId();
    const deleted = await deleteRowModel(gridId, rowId, userId);

    if (!deleted) {
      return errorResponse('Row not found', 'NOT_FOUND', 404);
    }

    return new NextResponse(null, { status: 204 });
  } catch {
    return errorResponse('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
