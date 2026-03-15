import { prisma } from '@/lib/db';

export interface GridInput {
  name: string;
  notes?: string | null;
}

export interface ValidatedGridInput {
  name: string;
  notes: string | null;
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
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
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  });
}

/**
 * Gets a single grid with full nested data. Returns null if not found or not owned.
 */
export async function getGridById(gridId: string, userId: string) {
  const grid = await prisma.practiceGrid.findUnique({
    where: { id: gridId },
    include: {
      practiceRows: {
        orderBy: { sortOrder: 'asc' },
        include: {
          practiceCells: {
            orderBy: { stepNumber: 'asc' },
            include: {
              completions: {
                orderBy: { completionDate: 'asc' },
              },
            },
          },
        },
      },
    },
  });

  // Ownership check — return null (controller maps to 404)
  if (!grid || grid.userId !== userId) {
    return null;
  }

  return grid;
}

/**
 * Soft-deletes a grid and all children in a single transaction.
 * Returns true if deleted, false if not found/not owned.
 */
export async function deleteGrid(gridId: string, userId: string): Promise<boolean> {
  const grid = await prisma.practiceGrid.findUnique({
    where: { id: gridId },
  });

  if (!grid || grid.userId !== userId) {
    return false;
  }

  const now = new Date();

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

    await tx.practiceGrid.update({
      where: { id: gridId },
      data: { deletedAt: now },
    });
  });

  return true;
}
