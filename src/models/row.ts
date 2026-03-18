import { prisma } from '@/lib/db';
import { ValidationError } from '@/lib/errors';

export interface RowInput {
  startMeasure: number;
  endMeasure: number;
  targetTempo: number;
  steps: number;
  pieceId?: string | null;
  passageLabel?: string | null;
}

export interface ValidatedRowInput {
  startMeasure: number;
  endMeasure: number;
  targetTempo: number;
  steps: number;
  pieceId: string | null;
  passageLabel: string | null;
}

export type RowUpdateInput = Partial<RowInput>;

/**
 * Generates tempo percentages for each cell step.
 * Formula: 0.4 + (0.6 * stepNumber / (totalSteps - 1))
 * Special case: 1 step → [1.0]
 */
export function generateCellPercentages(steps: number): number[] {
  if (steps === 1) return [1.0];

  return Array.from({ length: steps }, (_, i) => {
    const raw = 0.4 + (0.6 * i) / (steps - 1);
    return Math.round(raw * 1e10) / 1e10;
  });
}

function validatePositiveInteger(value: unknown, fieldName: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new ValidationError(`${fieldName} must be a positive integer`);
  }
  return value;
}

export function validateRowInput(input: RowInput): ValidatedRowInput {
  const startMeasure = validatePositiveInteger(input.startMeasure, 'Start measure');
  const endMeasure = validatePositiveInteger(input.endMeasure, 'End measure');
  const targetTempo = validatePositiveInteger(input.targetTempo, 'Target tempo');
  const steps = validatePositiveInteger(input.steps, 'Steps');

  if (endMeasure < startMeasure) {
    throw new ValidationError('End measure must be greater than or equal to start measure');
  }

  let passageLabel: string | null = null;
  if (input.passageLabel != null) {
    const trimmed = input.passageLabel.trim();
    passageLabel = trimmed === '' ? null : trimmed;
    if (passageLabel && passageLabel.length > 200) {
      throw new ValidationError('Passage label must be 200 characters or less');
    }
  }

  const pieceId = input.pieceId ?? null;

  return { startMeasure, endMeasure, targetTempo, steps, pieceId, passageLabel };
}

export function validateRowUpdate(input: RowUpdateInput): Partial<ValidatedRowInput> {
  const result: Partial<ValidatedRowInput> = {};

  if ('startMeasure' in input) {
    result.startMeasure = validatePositiveInteger(input.startMeasure, 'Start measure');
  }
  if ('endMeasure' in input) {
    result.endMeasure = validatePositiveInteger(input.endMeasure, 'End measure');
  }
  if ('targetTempo' in input) {
    result.targetTempo = validatePositiveInteger(input.targetTempo, 'Target tempo');
  }
  if ('steps' in input) {
    result.steps = validatePositiveInteger(input.steps, 'Steps');
  }
  if ('passageLabel' in input) {
    if (input.passageLabel == null) {
      result.passageLabel = null;
    } else {
      const trimmed = input.passageLabel.trim();
      result.passageLabel = trimmed === '' ? null : trimmed;
      if (result.passageLabel && result.passageLabel.length > 200) {
        throw new ValidationError('Passage label must be 200 characters or less');
      }
    }
  }
  if ('pieceId' in input) {
    result.pieceId = input.pieceId ?? null;
  }

  // Cross-field validation if both are present
  if (result.startMeasure != null && result.endMeasure != null) {
    if (result.endMeasure < result.startMeasure) {
      throw new ValidationError('End measure must be greater than or equal to start measure');
    }
  }

  return result;
}

/**
 * Finds a grid by ID, scoped to the given user and excluding soft-deleted records.
 * Query-driven: ownership and soft-delete are in the WHERE clause, not post-query checks.
 */
async function findOwnedGrid(gridId: string, userId: string) {
  return prisma.practiceGrid.findFirst({
    where: { id: gridId, userId, deletedAt: null },
  });
}

/**
 * Finds a row by ID, verifying it belongs to the specified grid and the grid
 * is owned by the user. Both ownership and soft-delete checks are query-driven.
 */
async function findOwnedRow(gridId: string, rowId: string, userId: string) {
  const grid = await findOwnedGrid(gridId, userId);
  if (!grid) return null;

  const row = await prisma.practiceRow.findFirst({
    where: { id: rowId, practiceGridId: gridId, deletedAt: null },
  });
  if (!row) return null;

  return { row, fadeEnabled: grid.fadeEnabled };
}

/**
 * Validates that a pieceId references an existing, non-deleted piece owned by the user.
 * Query-driven: all checks in the WHERE clause.
 */
async function validatePieceOwnership(pieceId: string, userId: string): Promise<void> {
  const piece = await prisma.piece.findFirst({
    where: { id: pieceId, userId, deletedAt: null },
  });
  if (!piece) {
    throw new ValidationError('Piece not found or not owned by user');
  }
}

export async function createRow(gridId: string, userId: string, input: RowInput) {
  const grid = await findOwnedGrid(gridId, userId);
  if (!grid) return null;

  const validated = validateRowInput(input);

  if (validated.pieceId) {
    await validatePieceOwnership(validated.pieceId, userId);
  }

  const percentages = generateCellPercentages(validated.steps);

  const row = await prisma.$transaction(async (tx) => {
    // Atomic sortOrder assignment
    const maxResult = await tx.$queryRawUnsafe<[{ max: number | null }]>(
      `SELECT MAX(sort_order) as max FROM practice_rows WHERE practice_grid_id = $1 AND deleted_at IS NULL`,
      gridId,
    );
    const sortOrder = (maxResult[0]?.max ?? -1) + 1;

    const row = await tx.practiceRow.create({
      data: {
        practiceGridId: gridId,
        sortOrder,
        startMeasure: validated.startMeasure,
        endMeasure: validated.endMeasure,
        targetTempo: validated.targetTempo,
        steps: validated.steps,
        pieceId: validated.pieceId,
        passageLabel: validated.passageLabel,
      },
    });

    // Generate cells
    await tx.practiceCell.createMany({
      data: percentages.map((percentage, index) => ({
        practiceRowId: row.id,
        stepNumber: index,
        targetTempoPercentage: percentage,
      })),
    });

    // Touch parent grid updatedAt
    await tx.practiceGrid.update({
      where: { id: gridId },
      data: { updatedAt: new Date() },
    });

    // Return row with cells and piece for response formatting
    return tx.practiceRow.findUniqueOrThrow({
      where: { id: row.id },
      include: {
        piece: true,
        practiceCells: {
          where: { deletedAt: null },
          orderBy: { stepNumber: 'asc' },
          include: {
            completions: {
              where: { deletedAt: null },
              orderBy: { completionDate: 'asc' },
            },
          },
        },
      },
    });
  });

  return { row, fadeEnabled: grid.fadeEnabled };
}

export async function updateRow(gridId: string, rowId: string, userId: string, input: RowUpdateInput) {
  const found = await findOwnedRow(gridId, rowId, userId);
  if (!found) return null;

  const { row: existingRow, fadeEnabled } = found;
  const validated = validateRowUpdate(input);

  // Cross-field validation with existing values
  const effectiveStart = validated.startMeasure ?? existingRow.startMeasure;
  const effectiveEnd = validated.endMeasure ?? existingRow.endMeasure;
  if (effectiveEnd < effectiveStart) {
    throw new ValidationError('End measure must be greater than or equal to start measure');
  }

  if (validated.pieceId !== undefined && validated.pieceId !== null) {
    await validatePieceOwnership(validated.pieceId, userId);
  }

  const stepsChanged = validated.steps != null && validated.steps !== existingRow.steps;

  const row = await prisma.$transaction(async (tx) => {
    // Update row fields
    const rowData: Record<string, unknown> = {};
    if (validated.startMeasure !== undefined) rowData.startMeasure = validated.startMeasure;
    if (validated.endMeasure !== undefined) rowData.endMeasure = validated.endMeasure;
    if (validated.targetTempo !== undefined) rowData.targetTempo = validated.targetTempo;
    if (validated.steps !== undefined) rowData.steps = validated.steps;
    if (validated.pieceId !== undefined) rowData.pieceId = validated.pieceId;
    if (validated.passageLabel !== undefined) rowData.passageLabel = validated.passageLabel;

    if (Object.keys(rowData).length > 0) {
      await tx.practiceRow.update({ where: { id: rowId }, data: rowData });
    }

    // If steps changed, soft-delete old cells + completions, generate new cells
    if (stepsChanged) {
      const now = new Date();

      // Soft-delete completions on this row's cells
      await tx.practiceCellCompletion.updateMany({
        where: {
          practiceCell: { practiceRowId: rowId },
          deletedAt: null,
        },
        data: { deletedAt: now },
      });

      // Soft-delete cells
      await tx.practiceCell.updateMany({
        where: { practiceRowId: rowId, deletedAt: null },
        data: { deletedAt: now },
      });

      // Generate new cells
      const percentages = generateCellPercentages(validated.steps!);
      await tx.practiceCell.createMany({
        data: percentages.map((percentage, index) => ({
          practiceRowId: rowId,
          stepNumber: index,
          targetTempoPercentage: percentage,
        })),
      });
    }

    // Touch parent grid updatedAt
    await tx.practiceGrid.update({
      where: { id: gridId },
      data: { updatedAt: new Date() },
    });

    // Return updated row with nested data
    return tx.practiceRow.findUniqueOrThrow({
      where: { id: rowId },
      include: {
        piece: true,
        practiceCells: {
          where: { deletedAt: null },
          orderBy: { stepNumber: 'asc' },
          include: {
            completions: {
              where: { deletedAt: null },
              orderBy: { completionDate: 'asc' },
            },
          },
        },
      },
    });
  });

  return { row, fadeEnabled };
}

export async function updateRowPriority(
  gridId: string,
  rowId: string,
  userId: string,
  priority: string,
) {
  const validPriorities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  if (!validPriorities.includes(priority)) {
    throw new ValidationError(`Priority must be one of: ${validPriorities.join(', ')}`);
  }

  const found = await findOwnedRow(gridId, rowId, userId);
  if (!found) return null;

  const { fadeEnabled } = found;

  const row = await prisma.$transaction(async (tx) => {
    await tx.practiceRow.update({
      where: { id: rowId },
      data: { priority: priority as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' },
    });

    // Touch parent grid updatedAt
    await tx.practiceGrid.update({
      where: { id: gridId },
      data: { updatedAt: new Date() },
    });

    return tx.practiceRow.findUniqueOrThrow({
      where: { id: rowId },
      include: {
        piece: true,
        practiceCells: {
          where: { deletedAt: null },
          orderBy: { stepNumber: 'asc' },
          include: {
            completions: {
              where: { deletedAt: null },
              orderBy: { completionDate: 'asc' },
            },
          },
        },
      },
    });
  });

  return { row, fadeEnabled };
}

export async function deleteRow(gridId: string, rowId: string, userId: string): Promise<boolean> {
  const found = await findOwnedRow(gridId, rowId, userId);
  if (!found) return false;

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    // Cascade: completions → cells → row
    await tx.practiceCellCompletion.updateMany({
      where: {
        practiceCell: { practiceRowId: rowId },
        deletedAt: null,
      },
      data: { deletedAt: now },
    });

    await tx.practiceCell.updateMany({
      where: { practiceRowId: rowId, deletedAt: null },
      data: { deletedAt: now },
    });

    await tx.practiceRow.updateMany({
      where: { id: rowId, deletedAt: null },
      data: { deletedAt: now },
    });

    // Touch parent grid updatedAt
    await tx.practiceGrid.update({
      where: { id: gridId },
      data: { updatedAt: new Date() },
    });
  });

  return true;
}
