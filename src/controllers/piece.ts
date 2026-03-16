import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import { AuthenticationError, ValidationError } from '@/lib/errors';
import { UUID_REGEX, errorResponse } from '@/lib/api-helpers';
import {
  createPiece as createPieceModel,
  listPieces as listPiecesModel,
  getPieceById,
  updatePiece as updatePieceModel,
  deletePiece as deletePieceModel,
} from '@/models/piece';
import { formatPiece, formatPieceList } from '@/views/piece';

export async function createPiece(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    const body = await request.json().catch(() => null);

    if (!body || typeof body.title !== 'string') {
      return errorResponse('Piece title is required', 'VALIDATION_ERROR', 400);
    }

    for (const field of ['composer', 'part', 'studyReference'] as const) {
      if (body[field] != null && typeof body[field] !== 'string') {
        return errorResponse(`${field} must be a string`, 'VALIDATION_ERROR', 400);
      }
    }

    const piece = await createPieceModel(userId, {
      title: body.title,
      composer: body.composer ?? null,
      part: body.part ?? null,
      studyReference: body.studyReference ?? null,
    });

    return NextResponse.json(formatPiece(piece), { status: 201 });
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

export async function listPieces() {
  try {
    const userId = await getCurrentUserId();
    const pieces = await listPiecesModel(userId);
    return NextResponse.json(formatPieceList(pieces));
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return errorResponse(error.message, 'AUTHENTICATION_ERROR', 401);
    }
    return errorResponse('Internal server error', 'INTERNAL_ERROR', 500);
  }
}

export async function getPiece(pieceId: string) {
  try {
    if (!UUID_REGEX.test(pieceId)) {
      return errorResponse('Invalid piece ID format', 'VALIDATION_ERROR', 400);
    }

    const userId = await getCurrentUserId();
    const piece = await getPieceById(pieceId, userId);

    if (!piece) {
      return errorResponse('Piece not found', 'NOT_FOUND', 404);
    }

    return NextResponse.json(formatPiece(piece));
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return errorResponse(error.message, 'AUTHENTICATION_ERROR', 401);
    }
    return errorResponse('Internal server error', 'INTERNAL_ERROR', 500);
  }
}

export async function updatePiece(pieceId: string, request: NextRequest) {
  try {
    if (!UUID_REGEX.test(pieceId)) {
      return errorResponse('Invalid piece ID format', 'VALIDATION_ERROR', 400);
    }

    const userId = await getCurrentUserId();
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== 'object') {
      return errorResponse('Request body is required', 'VALIDATION_ERROR', 400);
    }

    if ('title' in body && typeof body.title !== 'string') {
      return errorResponse('Title must be a string', 'VALIDATION_ERROR', 400);
    }

    for (const field of ['composer', 'part', 'studyReference'] as const) {
      if (field in body && body[field] != null && typeof body[field] !== 'string') {
        return errorResponse(`${field} must be a string`, 'VALIDATION_ERROR', 400);
      }
    }

    const piece = await updatePieceModel(pieceId, userId, body);

    if (!piece) {
      return errorResponse('Piece not found', 'NOT_FOUND', 404);
    }

    return NextResponse.json(formatPiece(piece));
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

export async function deletePiece(pieceId: string) {
  try {
    if (!UUID_REGEX.test(pieceId)) {
      return errorResponse('Invalid piece ID format', 'VALIDATION_ERROR', 400);
    }

    const userId = await getCurrentUserId();
    const deleted = await deletePieceModel(pieceId, userId);

    if (!deleted) {
      return errorResponse('Piece not found', 'NOT_FOUND', 404);
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return errorResponse(error.message, 'AUTHENTICATION_ERROR', 401);
    }
    return errorResponse('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
