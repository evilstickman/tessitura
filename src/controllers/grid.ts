import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import {
  createGrid as createGridModel,
  listGrids as listGridsModel,
  listGridsWithDetail,
  getGridById,
  deleteGrid as deleteGridModel,
  updateGrid as updateGridModel,
  updateGridFade,
  type ArchivedFilter,
  type GridUpdateInput,
} from '@/models/grid';
import { AuthenticationError, ValidationError } from '@/lib/errors';
import { UUID_REGEX, errorResponse } from '@/lib/api-helpers';
import { formatGrid, formatGridDetail, formatGridList, formatGridSummaryList } from '@/views/grid';

/**
 * Parses the `archived` query param into the ArchivedFilter union type.
 * Accepts 'true' | 'false' | 'all'; anything else (or missing) → 'false'
 * (the default: active grids only).
 */
function parseArchivedFilter(value: string | null): ArchivedFilter {
  if (value === 'true' || value === 'all') return value;
  return 'false';
}

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

export async function listGrids(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    const detail = request.nextUrl.searchParams.get('detail') === 'true';
    const archived = parseArchivedFilter(request.nextUrl.searchParams.get('archived'));

    if (detail) {
      const now = new Date();
      const grids = await listGridsWithDetail(userId, archived);
      return NextResponse.json(formatGridSummaryList(grids, now));
    }

    const grids = await listGridsModel(userId, archived);
    return NextResponse.json(formatGridList(grids));
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return errorResponse(error.message, 'AUTHENTICATION_ERROR', 401);
    }
    return errorResponse('Internal server error', 'INTERNAL_ERROR', 500);
  }
}

export async function updateGrid(gridId: string, request: NextRequest) {
  try {
    if (!UUID_REGEX.test(gridId)) {
      return errorResponse('Invalid grid ID format', 'VALIDATION_ERROR', 400);
    }

    const now = new Date();
    const userId = await getCurrentUserId();
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== 'object') {
      return errorResponse('Request body is required', 'VALIDATION_ERROR', 400);
    }

    // sourceTemplateId is immutable — reject at the HTTP boundary with an
    // explicit message so the user isn't confused by silently ignored fields.
    if ('sourceTemplateId' in body) {
      return errorResponse(
        'sourceTemplateId is immutable and cannot be changed after creation',
        'VALIDATION_ERROR',
        400,
      );
    }

    // Per-field type checks — the model throws ValidationError for value-level
    // rules (empty name, invalid enum), but Prisma is the backstop for type errors.
    if ('name' in body && typeof body.name !== 'string') {
      return errorResponse('name must be a string', 'VALIDATION_ERROR', 400);
    }
    if ('notes' in body && body.notes !== null && typeof body.notes !== 'string') {
      return errorResponse('notes must be a string or null', 'VALIDATION_ERROR', 400);
    }
    if ('gridType' in body && typeof body.gridType !== 'string') {
      return errorResponse('gridType must be a string', 'VALIDATION_ERROR', 400);
    }
    if ('archived' in body && typeof body.archived !== 'boolean') {
      return errorResponse('archived must be a boolean', 'VALIDATION_ERROR', 400);
    }
    if ('fadeEnabled' in body && typeof body.fadeEnabled !== 'boolean') {
      return errorResponse('fadeEnabled must be a boolean', 'VALIDATION_ERROR', 400);
    }

    const input: GridUpdateInput = {};
    if ('name' in body) input.name = body.name;
    if ('notes' in body) input.notes = body.notes;
    if ('gridType' in body) input.gridType = body.gridType;
    if ('archived' in body) input.archived = body.archived;
    if ('fadeEnabled' in body) input.fadeEnabled = body.fadeEnabled;

    const grid = await updateGridModel(gridId, userId, input);
    if (!grid) {
      return errorResponse('Grid not found', 'NOT_FOUND', 404);
    }

    return NextResponse.json(formatGridDetail(grid, now));
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

export async function getGrid(gridId: string) {
  try {
    if (!UUID_REGEX.test(gridId)) {
      return errorResponse('Invalid grid ID format', 'VALIDATION_ERROR', 400);
    }

    const now = new Date();
    const userId = await getCurrentUserId();
    const grid = await getGridById(gridId, userId);

    if (!grid) {
      return errorResponse('Grid not found', 'NOT_FOUND', 404);
    }

    return NextResponse.json(formatGridDetail(grid, now));
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

    const now = new Date();
    const userId = await getCurrentUserId();
    const deleted = await deleteGridModel(gridId, userId, now);

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
    const now = new Date();
    const userId = await getCurrentUserId();
    const body = await request.json().catch(() => null);
    if (!body || typeof body.fadeEnabled !== 'boolean') {
      return errorResponse('fadeEnabled (boolean) is required', 'VALIDATION_ERROR', 400);
    }
    const grid = await updateGridFade(gridId, userId, body.fadeEnabled);
    if (!grid) {
      return errorResponse('Grid not found', 'NOT_FOUND', 404);
    }
    return NextResponse.json(formatGridDetail(grid, now));
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
