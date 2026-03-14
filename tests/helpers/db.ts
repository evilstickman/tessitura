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
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    });
    testPrisma = new PrismaClient({ adapter });
  }
  return testPrisma;
}

/**
 * Deletes all data from all tables in reverse FK order (real deletes).
 */
export async function cleanDatabase(): Promise<void> {
  const prisma = getTestPrisma();
  // Delete in reverse FK order to avoid constraint violations
  await prisma.practiceCellCompletion.deleteMany();
  await prisma.practiceCell.deleteMany();
  await prisma.practiceRow.deleteMany();
  await prisma.practiceGrid.deleteMany();
  await prisma.user.deleteMany();
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
