import { prisma } from '@/lib/db';
import { ValidationError } from '@/lib/errors';

export interface GridInput {
  name: string;
  notes?: string | null;
}

export interface ValidatedGridInput {
  name: string;
  notes: string | null;
}

/**
 * Fields accepted by `updateGrid`. `sourceTemplateId` is deliberately absent —
 * it is set once during clone and is immutable afterward. The controller
 * rejects it at the HTTP boundary; the model's type guarantees it can't leak
 * through via Object.assign-style spreading.
 */
export interface GridUpdateInput {
  name?: string;
  notes?: string | null;
  gridType?: string;
  archived?: boolean;
  fadeEnabled?: boolean;
}

/**
 * Possible values for the `archived` list-filter:
 * - 'false' (default): only non-archived grids
 * - 'true': only archived grids
 * - 'all': both
 */
export type ArchivedFilter = 'true' | 'false' | 'all';

function archivedWhere(filter: ArchivedFilter): { archived?: boolean } {
  if (filter === 'all') return {};
  return { archived: filter === 'true' };
}

/**
 * Validates and normalizes grid input.
 * Pure function — no database access.
 */
export function validateGridInput(input: GridInput): ValidatedGridInput {
  const name = (input.name ?? '').trim();

  if (name.length === 0) {
    throw new ValidationError('Grid name is required');
  }

  if (name.length > 200) {
    throw new ValidationError('Grid name must be 200 characters or less');
  }

  const trimmedNotes = input.notes != null ? input.notes.trim() : null;
  // Whitespace-only notes normalize to null (not empty string)
  const notes = trimmedNotes === '' ? null : trimmedNotes;

  if (notes && notes.length > 2000) {
    throw new ValidationError('Grid notes must be 2000 characters or less');
  }

  return { name, notes };
}

/**
 * Creates a new practice grid.
 */
export async function createGrid(userId: string, input: GridInput) {
  const validated = validateGridInput(input);

  return prisma.practiceGrid.create({
    data: {
      userId,
      name: validated.name,
      notes: validated.notes,
      fadeEnabled: true,
    },
  });
}

/**
 * Lists all grids for a user, sorted by updatedAt descending.
 * The `archived` filter defaults to 'false' (active grids only) to match
 * the API spec — archived grids are hidden from list views by default and
 * only surface with ?archived=true or ?archived=all.
 */
export async function listGrids(userId: string, archived: ArchivedFilter = 'false') {
  return prisma.practiceGrid.findMany({
    where: { userId, deletedAt: null, ...archivedWhere(archived) },
    orderBy: { updatedAt: 'desc' },
  });
}

/**
 * Finds a grid by ID, scoped to the given user and excluding soft-deleted records.
 * Query-driven: ownership and soft-delete are in the WHERE clause, not post-query checks.
 *
 * Exported so sibling models (e.g., `src/models/row.ts`) can reuse the exact same
 * ownership check without duplicating the query.
 */
export async function findOwnedGrid(gridId: string, userId: string) {
  return prisma.practiceGrid.findFirst({
    where: { id: gridId, userId, deletedAt: null },
  });
}

/**
 * Include clause for a grid with full nested data (rows → piece + cells → completions).
 * Used by getGridById and listGridsWithDetail — kept as a single constant to avoid drift.
 */
const GRID_DETAIL_INCLUDE = {
  practiceRows: {
    where: { deletedAt: null },
    orderBy: { sortOrder: 'asc' as const },
    include: {
      piece: true,
      practiceCells: {
        where: { deletedAt: null },
        orderBy: { stepNumber: 'asc' as const },
        include: {
          completions: {
            where: { deletedAt: null },
            orderBy: { completionDate: 'asc' as const },
          },
        },
      },
    },
  },
};

/**
 * Gets a single grid with full nested data. Returns null if not found or not owned.
 *
 * Soft-delete visibility rules for nested data:
 * - Rows: hidden when soft-deleted (filtered out)
 * - Cells: hidden when soft-deleted (filtered out)
 * - Completions: hidden when soft-deleted (filtered out)
 * - Piece: ALWAYS shown, even if the piece itself is soft-deleted.
 *   Rationale: A row's piece reference is historical context — if a user deletes
 *   a piece from their library, existing rows should still show what they were
 *   practicing. The piece data is read-only in this context.
 *
 * Single query — ownership, soft-delete, and include clause all in one findFirst,
 * eliminating the between-query window where a concurrent soft-delete could slip in.
 */
export async function getGridById(gridId: string, userId: string) {
  return prisma.practiceGrid.findFirst({
    where: { id: gridId, userId, deletedAt: null },
    include: GRID_DETAIL_INCLUDE,
  });
}

/**
 * Updates one or more fields on a grid. Returns the full grid detail (via
 * getGridById), or null if not found/not owned. Throws ValidationError if
 * any input field is invalid.
 *
 * `sourceTemplateId` cannot be changed — it is set once during clone and
 * must not leak through update paths. The controller layer also rejects it
 * at the HTTP boundary so the user gets a clear 400 with an explicit
 * message rather than a silently ignored field.
 *
 * `name` re-uses validateGridInput so the same trim / length / empty-string
 * rules apply to updates as to creates.
 *
 * `notes` is independently updatable: null or empty string normalizes to
 * null; whitespace is trimmed; max 2000 chars enforced.
 */
export async function updateGrid(gridId: string, userId: string, input: GridUpdateInput) {
  const grid = await findOwnedGrid(gridId, userId);
  if (!grid) return null;

  const data: Record<string, unknown> = {};

  if (input.name !== undefined) {
    // validateGridInput requires name; pass through current notes if no notes update
    const currentNotes = input.notes !== undefined ? input.notes : grid.notes;
    const validated = validateGridInput({ name: input.name, notes: currentNotes });
    data.name = validated.name;
    if (input.notes !== undefined) data.notes = validated.notes;
  } else if (input.notes !== undefined) {
    const trimmed = input.notes?.trim() ?? null;
    const normalized = trimmed === '' ? null : trimmed;
    if (normalized && normalized.length > 2000) {
      throw new ValidationError('Grid notes must be 2000 characters or less');
    }
    data.notes = normalized;
  }

  if (input.gridType !== undefined) {
    if (input.gridType !== 'REPERTOIRE' && input.gridType !== 'TECHNIQUE') {
      throw new ValidationError('gridType must be REPERTOIRE or TECHNIQUE');
    }
    data.gridType = input.gridType;
  }

  if (input.archived !== undefined) data.archived = input.archived;
  if (input.fadeEnabled !== undefined) data.fadeEnabled = input.fadeEnabled;

  if (Object.keys(data).length === 0) return getGridById(gridId, userId);

  await prisma.practiceGrid.update({ where: { id: gridId }, data });
  return getGridById(gridId, userId);
}

/**
 * Thin wrapper retained for the legacy /api/grids/{id}/fade endpoint.
 * All grid updates funnel through `updateGrid` — there is a single code
 * path for all grid field mutations.
 */
export async function updateGridFade(gridId: string, userId: string, fadeEnabled: boolean) {
  return updateGrid(gridId, userId, { fadeEnabled });
}

/**
 * Soft-deletes a grid and all children in a single transaction.
 * Returns true if deleted, false if not found/not owned.
 *
 * `now` is threaded from the caller so the deletion cascade shares a single timestamp
 * with the caller's clock (never samples `new Date()` internally).
 */
export async function deleteGrid(gridId: string, userId: string, now: Date): Promise<boolean> {
  const grid = await findOwnedGrid(gridId, userId);
  if (!grid) return false;

  await prisma.$transaction(async (tx) => {
    // Cascade: completions → cells → rows → grid
    await tx.practiceCellCompletion.updateMany({
      where: {
        practiceCell: {
          practiceRow: {
            practiceGridId: gridId,
          },
        },
        deletedAt: null,
      },
      data: { deletedAt: now },
    });

    await tx.practiceCell.updateMany({
      where: {
        practiceRow: {
          practiceGridId: gridId,
        },
        deletedAt: null,
      },
      data: { deletedAt: now },
    });

    await tx.practiceRow.updateMany({
      where: { practiceGridId: gridId, deletedAt: null },
      data: { deletedAt: now },
    });

    await tx.practiceGrid.updateMany({
      where: { id: gridId, deletedAt: null },
      data: { deletedAt: now },
    });
  });

  return true;
}

/**
 * Lists all grids for a user with full nested data (rows, cells, completions).
 * Same includes as getGridById but for all grids at once in a single query.
 * Same archived filter semantics as listGrids.
 *
 * Soft-delete visibility rules:
 * - Grids: hidden when soft-deleted (filtered out)
 * - Rows: hidden when soft-deleted (filtered out)
 * - Cells: hidden when soft-deleted (filtered out)
 * - Completions: hidden when soft-deleted (filtered out)
 * - Piece: ALWAYS shown, even if the piece itself is soft-deleted.
 */
export async function listGridsWithDetail(userId: string, archived: ArchivedFilter = 'false') {
  return prisma.practiceGrid.findMany({
    where: { userId, deletedAt: null, ...archivedWhere(archived) },
    orderBy: { updatedAt: 'desc' },
    include: GRID_DETAIL_INCLUDE,
  });
}
