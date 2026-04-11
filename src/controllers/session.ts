import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import { AuthenticationError, ValidationError } from '@/lib/errors';
import { UUID_REGEX, errorResponse } from '@/lib/api-helpers';
import {
  createSession as createSessionModel,
  listSessions as listSessionsModel,
  getSessionById,
  deleteSession as deleteSessionModel,
} from '@/models/session';
import { formatSession, formatSessionList } from '@/views/session';

export async function createSession(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== 'object') {
      return errorResponse('Request body is required', 'VALIDATION_ERROR', 400);
    }

    // Per-field type checks — model throws ValidationError on value-level rules,
    // but we reject obvious type mismatches early for clearer messages.
    if (typeof body.sessionDate !== 'string') {
      return errorResponse('sessionDate must be a YYYY-MM-DD string', 'VALIDATION_ERROR', 400);
    }
    if (typeof body.durationMinutes !== 'number') {
      return errorResponse('durationMinutes must be a number', 'VALIDATION_ERROR', 400);
    }
    if (body.notes != null && typeof body.notes !== 'string') {
      return errorResponse('notes must be a string', 'VALIDATION_ERROR', 400);
    }
    if (body.practiceGridId != null && typeof body.practiceGridId !== 'string') {
      return errorResponse('practiceGridId must be a string', 'VALIDATION_ERROR', 400);
    }

    const session = await createSessionModel(userId, {
      sessionDate: body.sessionDate,
      durationMinutes: body.durationMinutes,
      notes: body.notes ?? null,
      practiceGridId: body.practiceGridId ?? null,
    });

    return NextResponse.json(formatSession(session), { status: 201 });
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

export async function listSessions(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    const from = request.nextUrl.searchParams.get('from');
    const to = request.nextUrl.searchParams.get('to');

    const sessions = await listSessionsModel(userId, from, to);
    return NextResponse.json(formatSessionList(sessions));
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

export async function getSession(sessionId: string) {
  try {
    if (!UUID_REGEX.test(sessionId)) {
      return errorResponse('Invalid session ID format', 'VALIDATION_ERROR', 400);
    }

    const userId = await getCurrentUserId();
    const session = await getSessionById(sessionId, userId);

    if (!session) {
      return errorResponse('Session not found', 'NOT_FOUND', 404);
    }

    return NextResponse.json(formatSession(session));
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return errorResponse(error.message, 'AUTHENTICATION_ERROR', 401);
    }
    return errorResponse('Internal server error', 'INTERNAL_ERROR', 500);
  }
}

export async function deleteSession(sessionId: string) {
  try {
    if (!UUID_REGEX.test(sessionId)) {
      return errorResponse('Invalid session ID format', 'VALIDATION_ERROR', 400);
    }

    const userId = await getCurrentUserId();
    const deleted = await deleteSessionModel(sessionId, userId);

    if (!deleted) {
      return errorResponse('Session not found', 'NOT_FOUND', 404);
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return errorResponse(error.message, 'AUTHENTICATION_ERROR', 401);
    }
    return errorResponse('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
