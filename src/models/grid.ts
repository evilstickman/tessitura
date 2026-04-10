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
 */
export async function listGrids(userId: string) {
  return prisma.practiceGrid.findMany({
    where: { userId, deletedAt: null },
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
 * Updates the fadeEnabled flag on a grid.
 * Returns the full grid detail (via getGridById), or null if not found/not owned.
 */
export async function updateGridFade(gridId: string, userId: string, fadeEnabled: boolean) {
  const grid = await findOwnedGrid(gridId, userId);
  if (!grid) return null;

  await prisma.practiceGrid.update({
    where: { id: gridId },
    data: { fadeEnabled },
  });

  return getGridById(gridId, userId);
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
 *
 * Soft-delete visibility rules:
 * - Grids: hidden when soft-deleted (filtered out)
 * - Rows: hidden when soft-deleted (filtered out)
 * - Cells: hidden when soft-deleted (filtered out)
 * - Completions: hidden when soft-deleted (filtered out)
 * - Piece: ALWAYS shown, even if the piece itself is soft-deleted.
 */
export async function listGridsWithDetail(userId: string) {
  return prisma.practiceGrid.findMany({
    where: { userId, deletedAt: null },
    orderBy: { updatedAt: 'desc' },
    include: GRID_DETAIL_INCLUDE,
  });
}
