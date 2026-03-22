import { describe, it, expect } from 'vitest';
import { getTestPrisma } from '../../helpers/db';

async function createFullChain() {
  const prisma = getTestPrisma();

  const user = await prisma.user.create({
    data: {
      email: `chain-${Date.now()}@example.com`,
      passwordHash: 'hash',
      name: 'Chain User',
      instruments: ['piano'],
    },
  });

  const grid = await prisma.practiceGrid.create({
    data: {
      userId: user.id,
      name: 'Full Chain Grid',
    },
  });

  const row = await prisma.practiceRow.create({
    data: {
      practiceGridId: grid.id,
      sortOrder: 1,
      startMeasure: 1,
      endMeasure: 16,
      targetTempo: 72,
      steps: 5,
    },
  });

  return { user, grid, row };
}

describe('Full chain: Row -> Cell -> Completion', () => {
  it('creates a practice row with correct defaults', async () => {
    const { row } = await createFullChain();

    expect(row.pieceId).toBeNull();
    expect(row.priority).toBe('MEDIUM');
    expect(row.targetTempo).toBe(72);
    expect(row.steps).toBe(5);
  });

  it('creates practice cells with tempo percentages', async () => {
    const prisma = getTestPrisma();
    const { row } = await createFullChain();

    const cell = await prisma.practiceCell.create({
      data: {
        practiceRowId: row.id,
        stepNumber: 1,
        targetTempoPercentage: 0.6,
        freshnessIntervalDays: 3,
      },
    });

    expect(cell.targetTempoPercentage).toBe(0.6);
    expect(cell.freshnessIntervalDays).toBe(3);
    expect(cell.stepNumber).toBe(1);
  });

  it('creates practice cells with default freshnessIntervalDays', async () => {
    const prisma = getTestPrisma();
    const { row } = await createFullChain();

    const cell = await prisma.practiceCell.create({
      data: {
        practiceRowId: row.id,
        stepNumber: 1,
        targetTempoPercentage: 0.8,
      },
    });

    expect(cell.freshnessIntervalDays).toBe(1);
  });

  it('creates completions with date and enforces unique constraint', async () => {
    const prisma = getTestPrisma();
    const { row } = await createFullChain();

    const cell = await prisma.practiceCell.create({
      data: {
        practiceRowId: row.id,
        stepNumber: 1,
        targetTempoPercentage: 0.75,
      },
    });

    const completion = await prisma.practiceCellCompletion.create({
      data: {
        practiceCellId: cell.id,
        completionDate: new Date('2025-01-15'),
      },
    });

    expect(completion.practiceCellId).toBe(cell.id);
    expect(completion.completionDate).toBeInstanceOf(Date);

    // Same cell + same date should fail (unique constraint)
    await expect(
      prisma.practiceCellCompletion.create({
        data: {
          practiceCellId: cell.id,
          completionDate: new Date('2025-01-15'),
        },
      }),
    ).rejects.toThrow();
  });

  it('allows same cell with different dates', async () => {
    const prisma = getTestPrisma();
    const { row } = await createFullChain();

    const cell = await prisma.practiceCell.create({
      data: {
        practiceRowId: row.id,
        stepNumber: 1,
        targetTempoPercentage: 1.0,
      },
    });

    await prisma.practiceCellCompletion.create({
      data: {
        practiceCellId: cell.id,
        completionDate: new Date('2025-01-15'),
      },
    });

    const second = await prisma.practiceCellCompletion.create({
      data: {
        practiceCellId: cell.id,
        completionDate: new Date('2025-01-16'),
      },
    });

    expect(second).toBeDefined();
  });

  it('loads full nested includes from grid down', async () => {
    const prisma = getTestPrisma();
    const { grid, row } = await createFullChain();

    const cell = await prisma.practiceCell.create({
      data: {
        practiceRowId: row.id,
        stepNumber: 1,
        targetTempoPercentage: 0.5,
      },
    });

    await prisma.practiceCellCompletion.create({
      data: {
        practiceCellId: cell.id,
        completionDate: new Date('2025-02-01'),
      },
    });

    const fullGrid = await prisma.practiceGrid.findUnique({
      where: { id: grid.id },
      include: {
        practiceRows: {
          include: {
            practiceCells: {
              include: {
                completions: true,
              },
            },
          },
        },
      },
    });

    expect(fullGrid).not.toBeNull();
    expect(fullGrid!.practiceRows).toHaveLength(1);
    expect(fullGrid!.practiceRows[0].practiceCells).toHaveLength(1);
    expect(fullGrid!.practiceRows[0].practiceCells[0].completions).toHaveLength(1);
  });
});
