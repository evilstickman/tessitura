import type { PrismaClient } from '../../src/generated/prisma/client';

/**
 * Shared test fixture factories. Use with the raw test Prisma client from
 * `getTestPrisma()` — they bypass the soft-delete extension so tests can set
 * up and inspect data directly.
 */

/**
 * Upserts the dev-seed-user that `getCurrentUserId()` resolves to in dev mode.
 * Idempotent — safe to call in beforeEach.
 */
export async function createSeedUser(prisma: PrismaClient) {
  return prisma.user.upsert({
    where: { email: 'dev-placeholder@tessitura.local' },
    update: {},
    create: {
      email: 'dev-placeholder@tessitura.local',
      passwordHash: 'not-a-real-hash',
      name: 'Dev User',
      instruments: [],
    },
  });
}

/**
 * Creates a second user with a unique email for ownership/cross-user tests.
 * The email is time-salted so multiple calls in one test still work.
 */
export async function createOtherUser(prisma: PrismaClient) {
  return prisma.user.create({
    data: {
      email: `other-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`,
      passwordHash: 'hash',
      name: 'Other User',
      instruments: [],
    },
  });
}

/**
 * Creates a PracticeGrid with one PracticeRow and `steps` PracticeCells.
 * The target-tempo percentages follow the production formula:
 * `steps === 1 ? 1.0 : 0.4 + (0.6 * i) / (steps - 1)`.
 *
 * Returns { grid, row, cells } where cells are sorted by stepNumber asc.
 */
export async function createGridWithCells(
  prisma: PrismaClient,
  userId: string,
  steps = 5,
  gridName = 'Test Grid',
) {
  const grid = await prisma.practiceGrid.create({
    data: { userId, name: gridName, fadeEnabled: true },
  });
  const row = await prisma.practiceRow.create({
    data: {
      practiceGridId: grid.id,
      sortOrder: 0,
      startMeasure: 1,
      endMeasure: 4,
      targetTempo: 120,
      steps,
    },
  });
  const percentages = Array.from({ length: steps }, (_, i) =>
    steps === 1 ? 1.0 : 0.4 + (0.6 * i) / (steps - 1),
  );
  await prisma.practiceCell.createMany({
    data: percentages.map((p, i) => ({
      practiceRowId: row.id,
      stepNumber: i,
      targetTempoPercentage: p,
    })),
  });
  const cells = await prisma.practiceCell.findMany({
    where: { practiceRowId: row.id },
    orderBy: { stepNumber: 'asc' },
  });
  return { grid, row, cells };
}
