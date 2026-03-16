import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import {
  createGrid as createGridModel,
  listGrids as listGridsModel,
  getGridById,
  deleteGrid as deleteGridModel,
  updateGridFade,
} from '@/models/grid';
import { AuthenticationError, ValidationError } from '@/lib/errors';
import { UUID_REGEX, errorResponse } from '@/lib/api-helpers';
import { formatGrid, formatGridDetail, formatGridList } from '@/views/grid';

export async function createGrid(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    const body = await request.json().catch(() => null);

    if (!body || typeof body.name !== 'string') {
      return errorResponse('Grid name is required', 'VALIDATION_ERROR', 400);
    }

    if (body.notes != null && typeof body.notes !== 'string') {
      return errorResponse('Notes must be a string', 'VALIDATION_ERROR', 400);
    }

    const grid = await createGridModel(userId, {
      name: body.name,
      notes: body.notes ?? null,
    });

    return NextResponse.json(formatGrid(grid), { status: 201 });
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

export async function listGrids() {
  try {
    const userId = await getCurrentUserId();
    const grids = await listGridsModel(userId);
    return NextResponse.json(formatGridList(grids));
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return errorResponse(error.message, 'AUTHENTICATION_ERROR', 401);
    }
    return errorResponse('Internal server error', 'INTERNAL_ERROR', 500);
  }
}

export async function getGrid(gridId: string) {
  try {
    if (!UUID_REGEX.test(gridId)) {
      return errorResponse('Invalid grid ID format', 'VALIDATION_ERROR', 400);
    }

    const userId = await getCurrentUserId();
    const grid = await getGridById(gridId, userId);

    if (!grid) {
      return errorResponse('Grid not found', 'NOT_FOUND', 404);
    }

    return NextResponse.json(formatGridDetail(grid));
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return errorResponse(error.message, 'AUTHENTICATION_ERROR', 401);
    }
    return errorResponse('Internal server error', 'INTERNAL_ERROR', 500);
  }
}

export async function deleteGrid(gridId: string) {
  try {
    if (!UUID_REGEX.test(gridId)) {
      return errorResponse('Invalid grid ID format', 'VALIDATION_ERROR', 400);
    }

    const userId = await getCurrentUserId();
    const deleted = await deleteGridModel(gridId, userId);

    if (!deleted) {
      return errorResponse('Grid not found', 'NOT_FOUND', 404);
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return errorResponse(error.message, 'AUTHENTICATION_ERROR', 401);
    }
    return errorResponse('Internal server error', 'INTERNAL_ERROR', 500);
  }
}

export async function updateFade(gridId: string, request: NextRequest) {
  try {
    if (!UUID_REGEX.test(gridId)) {
      return errorResponse('Invalid grid ID format', 'VALIDATION_ERROR', 400);
    }
    const userId = await getCurrentUserId();
    const body = await request.json().catch(() => null);
    if (!body || typeof body.fadeEnabled !== 'boolean') {
      return errorResponse('fadeEnabled (boolean) is required', 'VALIDATION_ERROR', 400);
    }
    const grid = await updateGridFade(gridId, userId, body.fadeEnabled);
    if (!grid) {
      return errorResponse('Grid not found', 'NOT_FOUND', 404);
    }
    return NextResponse.json(formatGridDetail(grid));
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return errorResponse(error.message, 'AUTHENTICATION_ERROR', 401);
    }
    return errorResponse('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
