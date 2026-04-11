import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';

let testPrisma: PrismaClient | undefined;

/**
 * Returns true if the test Prisma client has been initialized.
 */
export function hasTestPrisma(): boolean {
  return testPrisma !== undefined;
}

/**
 * Returns a raw PrismaClient (no soft-delete extension) for test use.
 */
export function getTestPrisma(): PrismaClient {
  if (!testPrisma) {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
    testPrisma = new PrismaClient({ adapter });
  }
  return testPrisma;
}

/**
 * Deletes all data from all tables using TRUNCATE CASCADE for reliability.
 *
 * NOTE: All soft-delete-able and user-owned tables must be listed here.
 * When adding a new model, add its table name to this list — otherwise tests
 * that run later in the same file will see leftover data from earlier tests.
 */
export async function cleanDatabase(): Promise<void> {
  const prisma = getTestPrisma();
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE
       practice_cell_completions,
       practice_cells,
       practice_rows,
       pieces,
       practice_sessions,
       practice_goals,
       practice_grids,
       library_templates,
       users
     CASCADE`,
  );
}

/**
 * Disconnects the test database client.
 */
export async function disconnectTestDb(): Promise<void> {
  if (testPrisma) {
    await testPrisma.$disconnect();
    testPrisma = undefined;
  }
}
