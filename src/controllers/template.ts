import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import { AuthenticationError, ValidationError } from '@/lib/errors';
import { UUID_REGEX, errorResponse } from '@/lib/api-helpers';
import {
  listTemplates as listTemplatesModel,
  getTemplateById,
  cloneTemplate as cloneTemplateModel,
} from '@/models/template';
import { getGridById } from '@/models/grid';
import { formatTemplateDetail, formatTemplateList } from '@/views/template';
import { formatGridDetail } from '@/views/grid';

export async function listTemplates(request: NextRequest) {
  try {
    // Auth required for all template endpoints in M2.1, per spec — simplifies
    // the threat model and is consistent with the rest of the API. Once the
    // public catalog is built (V4+), list/detail can drop auth.
    await getCurrentUserId();
    const instrument = request.nextUrl.searchParams.get('instrument');
    const templates = await listTemplatesModel(instrument);
    return NextResponse.json(formatTemplateList(templates));
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return errorResponse(error.message, 'AUTHENTICATION_ERROR', 401);
    }
    return errorResponse('Internal server error', 'INTERNAL_ERROR', 500);
  }
}

export async function getTemplate(templateId: string) {
  try {
    if (!UUID_REGEX.test(templateId)) {
      return errorResponse('Invalid template ID format', 'VALIDATION_ERROR', 400);
    }
    await getCurrentUserId();
    const template = await getTemplateById(templateId);
    if (!template) {
      return errorResponse('Template not found', 'NOT_FOUND', 404);
    }
    return NextResponse.json(formatTemplateDetail(template));
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return errorResponse(error.message, 'AUTHENTICATION_ERROR', 401);
    }
    return errorResponse('Internal server error', 'INTERNAL_ERROR', 500);
  }
}

export async function cloneTemplate(templateId: string) {
  try {
    if (!UUID_REGEX.test(templateId)) {
      return errorResponse('Invalid template ID format', 'VALIDATION_ERROR', 400);
    }

    const now = new Date();
    const userId = await getCurrentUserId();
    const result = await cloneTemplateModel(templateId, userId);

    if (result === 'not-found') {
      return errorResponse('Template not found', 'NOT_FOUND', 404);
    }

    // Fetch the newly created grid with full detail so the client can
    // immediately render it. Owned lookup is guaranteed to succeed here
    // because we just created it under this user in the same request.
    const grid = await getGridById(result, userId);
    /* v8 ignore next 3 -- grid was just created in this request; cannot be null */
    if (!grid) {
      return errorResponse('Internal server error', 'INTERNAL_ERROR', 500);
    }

    return NextResponse.json(formatGridDetail(grid, now), { status: 201 });
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
