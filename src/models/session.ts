import { prisma } from '@/lib/db';
import { ValidationError } from '@/lib/errors';
import { UUID_REGEX } from '@/lib/api-helpers';
import { findOwnedGrid } from '@/models/grid';

/**
 * Input shape for a manual PracticeSession create.
 *
 * `sessionDate` is always a YYYY-MM-DD **string** — this is a calendar date,
 * not a moment in time, and no timezone conversion is done anywhere in the
 * stack. Same convention as `PracticeCellCompletion.completionDate`.
 */
export interface SessionInput {
  sessionDate: string;
  durationMinutes: number;
  notes?: string | null;
  practiceGridId?: string | null;
}

export interface ValidatedSessionInput {
  sessionDate: string;
  durationMinutes: number;
  notes: string | null;
  practiceGridId: string | null;
}

/**
 * Strict YYYY-MM-DD pattern. Rejects `2026-4-1` (short zero-padding),
 * `2026/04/01` (wrong separators), and any other non-canonical form.
 */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validates a YYYY-MM-DD string. In addition to the regex, we re-parse the
 * components to catch logically invalid dates like `2026-13-01` or `2026-04-32`
 * — the regex alone would pass those.
 */
function validateDateOnlyString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || !DATE_RE.test(value)) {
    throw new ValidationError(`${fieldName} must be a YYYY-MM-DD string`);
  }
  const [yearStr, monthStr, dayStr] = value.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (month < 1 || month > 12) {
    throw new ValidationError(`${fieldName} month must be between 01 and 12`);
  }
  // Use Date to validate day-in-month (handles leap years, 30-day months, etc.)
  // Note: Date constructor uses 0-indexed months; we pass (year, month-1, day) and
  // verify the round-trip produces the same components.
  const d = new Date(Date.UTC(year, month - 1, day));
  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() !== month - 1 ||
    d.getUTCDate() !== day
  ) {
    throw new ValidationError(`${fieldName} is not a valid calendar date`);
  }
  return value;
}

/**
 * Validates and normalizes a SessionInput. Pure function — no DB access.
 *
 * Rules:
 * - sessionDate: YYYY-MM-DD string, valid calendar date
 * - durationMinutes: integer, 1 ≤ d ≤ 1440 (24h)
 * - notes: optional; whitespace trimmed; empty → null; ≤ 2000 chars
 * - practiceGridId: optional; if present must be a valid UUID (ownership
 *   verified separately in createSession, not here)
 */
export function validateSessionInput(input: SessionInput): ValidatedSessionInput {
  const sessionDate = validateDateOnlyString(input?.sessionDate, 'sessionDate');

  const durationMinutes = input?.durationMinutes;
  if (
    typeof durationMinutes !== 'number' ||
    !Number.isInteger(durationMinutes) ||
    durationMinutes < 1 ||
    durationMinutes > 1440
  ) {
    throw new ValidationError('durationMinutes must be an integer between 1 and 1440');
  }

  let notes: string | null = null;
  if (input.notes != null) {
    if (typeof input.notes !== 'string') {
      throw new ValidationError('notes must be a string');
    }
    const trimmed = input.notes.trim();
    notes = trimmed === '' ? null : trimmed;
    if (notes && notes.length > 2000) {
      throw new ValidationError('notes must be 2000 characters or less');
    }
  }

  let practiceGridId: string | null = null;
  if (input.practiceGridId != null) {
    if (typeof input.practiceGridId !== 'string' || !UUID_REGEX.test(input.practiceGridId)) {
      throw new ValidationError('practiceGridId must be a valid UUID');
    }
    practiceGridId = input.practiceGridId;
  }

  return { sessionDate, durationMinutes, notes, practiceGridId };
}

/**
 * Scopes a findFirst to the given session + user. Used by getSession and
 * deleteSession to enforce query-driven ownership (not a post-query check).
 */
async function findOwnedSession(sessionId: string, userId: string) {
  return prisma.practiceSession.findFirst({
    where: { id: sessionId, userId, deletedAt: null },
  });
}

/**
 * Creates a PracticeSession. Throws ValidationError on invalid input or if
 * a practiceGridId is provided but the grid is not owned by the user
 * (grids for other users leak nothing — ownership is checked via query).
 * Always sets source = MANUAL (INFERRED is reserved for M2.3 inference).
 */
export async function createSession(userId: string, input: SessionInput) {
  const validated = validateSessionInput(input);

  if (validated.practiceGridId) {
    const owned = await findOwnedGrid(validated.practiceGridId, userId);
    if (!owned) {
      throw new ValidationError('practiceGridId references a grid that does not exist or is not owned by this user');
    }
  }

  return prisma.practiceSession.create({
    data: {
      userId,
      practiceGridId: validated.practiceGridId,
      sessionDate: new Date(`${validated.sessionDate}T00:00:00.000Z`),
      durationMinutes: validated.durationMinutes,
      notes: validated.notes,
      source: 'MANUAL',
    },
  });
}

/**
 * Lists sessions for a user, sorted by sessionDate desc then createdAt desc
 * so same-day sessions appear newest-first.
 *
 * Optional `from`/`to` range filter — both are YYYY-MM-DD strings, both are
 * inclusive. Validates the date format; throws ValidationError on malformed
 * input so the controller can return 400.
 */
export async function listSessions(userId: string, from?: string | null, to?: string | null) {
  const where: {
    userId: string;
    deletedAt: null;
    sessionDate?: { gte?: Date; lte?: Date };
  } = { userId, deletedAt: null };

  if (from != null || to != null) {
    where.sessionDate = {};
    if (from != null) {
      const validated = validateDateOnlyString(from, 'from');
      where.sessionDate.gte = new Date(`${validated}T00:00:00.000Z`);
    }
    if (to != null) {
      const validated = validateDateOnlyString(to, 'to');
      where.sessionDate.lte = new Date(`${validated}T00:00:00.000Z`);
    }
  }

  return prisma.practiceSession.findMany({
    where,
    orderBy: [{ sessionDate: 'desc' }, { createdAt: 'desc' }],
  });
}

/**
 * Gets a session by ID scoped to the user. Returns null if not found or
 * not owned.
 */
export async function getSessionById(sessionId: string, userId: string) {
  return findOwnedSession(sessionId, userId);
}

/**
 * Soft-deletes a session. Returns true if a row was deleted, false if not
 * found / not owned. Routes through the soft-delete extension, which
 * intercepts `delete` on allowlisted models and converts to deletedAt update.
 */
export async function deleteSession(sessionId: string, userId: string): Promise<boolean> {
  const session = await findOwnedSession(sessionId, userId);
  if (!session) return false;

  await prisma.practiceSession.delete({ where: { id: sessionId } });
  return true;
}
