import { prisma } from '@/lib/db';
import { ValidationError } from '@/lib/errors';

export interface PieceInput {
  title: string;
  composer?: string | null;
  part?: string | null;
  studyReference?: string | null;
}

export interface ValidatedPieceInput {
  title: string;
  composer: string | null;
  part: string | null;
  studyReference: string | null;
}

export interface PieceUpdateInput {
  title?: string;
  composer?: string | null;
  part?: string | null;
  studyReference?: string | null;
}

function normalizeOptionalString(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function validateOptionalStringLength(value: string | null, fieldName: string, max: number): void {
  if (value != null && value.length > max) {
    throw new ValidationError(`${fieldName} must be ${max} characters or less`);
  }
}

export function validatePieceInput(input: PieceInput): ValidatedPieceInput {
  const title = (input.title ?? '').trim();

  if (title.length === 0) {
    throw new ValidationError('Piece title is required');
  }
  if (title.length > 200) {
    throw new ValidationError('Piece title must be 200 characters or less');
  }

  const composer = normalizeOptionalString(input.composer);
  const part = normalizeOptionalString(input.part);
  const studyReference = normalizeOptionalString(input.studyReference);

  validateOptionalStringLength(composer, 'Composer', 200);
  validateOptionalStringLength(part, 'Part', 200);
  validateOptionalStringLength(studyReference, 'Study reference', 200);

  return { title, composer, part, studyReference };
}

export function validatePieceUpdate(input: PieceUpdateInput): Partial<ValidatedPieceInput> {
  const result: Partial<ValidatedPieceInput> = {};

  if ('title' in input) {
    const title = (input.title ?? '').trim();
    if (title.length === 0) {
      throw new ValidationError('Piece title is required');
    }
    if (title.length > 200) {
      throw new ValidationError('Piece title must be 200 characters or less');
    }
    result.title = title;
  }

  if ('composer' in input) {
    const composer = normalizeOptionalString(input.composer);
    validateOptionalStringLength(composer, 'Composer', 200);
    result.composer = composer;
  }

  if ('part' in input) {
    const part = normalizeOptionalString(input.part);
    validateOptionalStringLength(part, 'Part', 200);
    result.part = part;
  }

  if ('studyReference' in input) {
    const studyReference = normalizeOptionalString(input.studyReference);
    validateOptionalStringLength(studyReference, 'Study reference', 200);
    result.studyReference = studyReference;
  }

  return result;
}

/**
 * Finds a piece by ID, scoped to the given user and excluding soft-deleted records.
 * Returns null if not found, not owned, or soft-deleted.
 *
 * Query-driven: ownership and soft-delete are in the WHERE clause, not post-query checks.
 */
async function findOwnedPiece(pieceId: string, userId: string) {
  return prisma.piece.findFirst({
    where: { id: pieceId, userId, deletedAt: null },
  });
}

export async function createPiece(userId: string, input: PieceInput) {
  const validated = validatePieceInput(input);
  return prisma.piece.create({
    data: {
      userId,
      title: validated.title,
      composer: validated.composer,
      part: validated.part,
      studyReference: validated.studyReference,
    },
  });
}

export async function listPieces(userId: string) {
  return prisma.piece.findMany({
    where: { userId, deletedAt: null },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function getPieceById(pieceId: string, userId: string) {
  return findOwnedPiece(pieceId, userId);
}

export async function updatePiece(pieceId: string, userId: string, input: PieceUpdateInput) {
  const piece = await findOwnedPiece(pieceId, userId);
  if (!piece) return null;

  const validated = validatePieceUpdate(input);
  if (Object.keys(validated).length === 0) return piece;

  return prisma.piece.update({
    where: { id: pieceId },
    data: validated,
  });
}

export async function deletePiece(pieceId: string, userId: string): Promise<boolean> {
  const piece = await findOwnedPiece(pieceId, userId);
  if (!piece) return false;

  await prisma.piece.update({
    where: { id: pieceId },
    data: { deletedAt: new Date() },
  });
  return true;
}
