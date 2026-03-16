import { prisma } from '@/lib/db';
import { ConflictError } from '@/lib/errors';
import { calculateFreshnessState, calculateNewInterval } from '@/models/freshness';

type TransactionClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/**
 * Validates ownership chain (grid → row → cell) INSIDE a transaction.
 * Returns the cell with non-deleted completions ordered by completionDate asc,
 * or null if any part of the chain is not found / not owned.
 *
 * Soft-delete visibility: grid, row, cell all filtered by deletedAt IS NULL.
 */
async function findOwnedCell(
  tx: TransactionClient,
  gridId: string,
  rowId: string,
  cellId: string,
  userId: string,
) {
  const grid = await tx.practiceGrid.findFirst({
    where: { id: gridId, userId, deletedAt: null },
  });
  if (!grid) return null;

  const row = await tx.practiceRow.findFirst({
    where: { id: rowId, practiceGridId: gridId, deletedAt: null },
  });
  if (!row) return null;

  return tx.practiceCell.findFirst({
    where: { id: cellId, practiceRowId: rowId, deletedAt: null },
    include: {
      completions: {
        where: { deletedAt: null },
        orderBy: { completionDate: 'asc' },
      },
    },
  });
}

/**
 * Include clause for returning a cell with siblings for shielding computation.
 * Completions ordered by completionDate asc — last element is most recent (intentional).
 */
const CELL_RETURN_INCLUDE = {
  completions: {
    where: { deletedAt: null },
    orderBy: { completionDate: 'asc' as const },
  },
  practiceRow: {
    select: {
      targetTempo: true,
      practiceGrid: { select: { fadeEnabled: true } },
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
 * Returns midnight UTC today as a Date.
 * Used for completionDate which is @db.Date in Prisma schema.
 */
function todayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Records a completion for today on the given cell.
 *
 * Business rules:
 * - If a non-deleted completion exists for today → ConflictError
 * - If a soft-deleted completion exists for today → un-soft-delete it (undo-then-redo)
 * - Otherwise → create a new completion
 * - Updates freshnessIntervalDays based on current state
 *
 * Returns cell with CELL_RETURN_INCLUDE for formatCellResponse, or null if not found.
 */
export async function completeCell(gridId: string, rowId: string, cellId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const cell = await findOwnedCell(tx, gridId, rowId, cellId, userId);
    if (!cell) return null;

    const today = todayUTC();
    const now = new Date();

    // Check for existing completion today (including soft-deleted).
    // Explicit `deletedAt` key bypasses the soft-delete extension filter;
    // `undefined` value tells Prisma "no filter on this field".
    const existing = await tx.practiceCellCompletion.findFirst({
      where: {
        practiceCellId: cellId,
        completionDate: today,
        deletedAt: undefined,
      },
    });

    if (existing && existing.deletedAt === null) {
      throw new ConflictError('Cell already completed today');
    }

    if (existing && existing.deletedAt !== null) {
      // Un-soft-delete (undo-then-redo case)
      await tx.practiceCellCompletion.update({
        where: { id: existing.id },
        data: { deletedAt: null },
      });
    } else {
      await tx.practiceCellCompletion.create({
        data: { practiceCellId: cellId, completionDate: today },
      });
    }

    // Calculate new interval: first completion → 'incomplete' state, otherwise use raw state
    const rawState = calculateFreshnessState(today, cell.freshnessIntervalDays, now);
    const stateForInterval = cell.completions.length === 0 ? 'incomplete' : rawState;
    const newInterval = calculateNewInterval(cell.freshnessIntervalDays, stateForInterval);

    await tx.practiceCell.update({
      where: { id: cellId },
      data: { freshnessIntervalDays: newInterval },
    });

    return tx.practiceCell.findUniqueOrThrow({
      where: { id: cellId },
      include: CELL_RETURN_INCLUDE,
    });
  });
}

/**
 * Soft-deletes the most recent completion for the given cell.
 *
 * Business rules:
 * - If no non-deleted completions exist → ConflictError
 * - Soft-deletes the last completion (most recent by completionDate asc order)
 * - Re-counts remaining completions INSIDE the transaction
 * - If 0 remain → resets interval to 1
 *
 * Returns cell with CELL_RETURN_INCLUDE for formatCellResponse, or null if not found.
 */
export async function undoCompletion(gridId: string, rowId: string, cellId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const cell = await findOwnedCell(tx, gridId, rowId, cellId, userId);
    if (!cell) return null;

    if (cell.completions.length === 0) {
      throw new ConflictError('No completions to undo');
    }

    // Last element is most recent (ordered by completionDate asc)
    const mostRecent = cell.completions[cell.completions.length - 1];
    await tx.practiceCellCompletion.update({
      where: { id: mostRecent.id },
      data: { deletedAt: new Date() },
    });

    // Re-count INSIDE tx (not from pre-fetch) to ensure ACID correctness
    const remainingCount = await tx.practiceCellCompletion.count({
      where: { practiceCellId: cellId, deletedAt: null },
    });

    if (remainingCount === 0) {
      await tx.practiceCell.update({
        where: { id: cellId },
        data: { freshnessIntervalDays: 1 },
      });
    }

    return tx.practiceCell.findUniqueOrThrow({
      where: { id: cellId },
      include: CELL_RETURN_INCLUDE,
    });
  });
}

/**
 * Resets the freshness interval of the given cell to 1 day.
 * Does NOT delete any completion records.
 *
 * Business rules:
 * - If no completions exist → ConflictError (nothing to reset)
 * - Sets freshnessIntervalDays to 1
 *
 * Returns cell with CELL_RETURN_INCLUDE for formatCellResponse, or null if not found.
 */
export async function resetCell(gridId: string, rowId: string, cellId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const cell = await findOwnedCell(tx, gridId, rowId, cellId, userId);
    if (!cell) return null;

    if (cell.completions.length === 0) {
      throw new ConflictError('No completions to reset');
    }

    await tx.practiceCell.update({
      where: { id: cellId },
      data: { freshnessIntervalDays: 1 },
    });

    return tx.practiceCell.findUniqueOrThrow({
      where: { id: cellId },
      include: CELL_RETURN_INCLUDE,
    });
  });
}
