import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';

let testPrisma: InstanceType<typeof PrismaClient> | null = null;

/**
 * Returns a raw PrismaClient (NO soft-delete extension) connected to tessitura_test.
 */
export function getTestPrisma(): InstanceType<typeof PrismaClient> {
  if (!testPrisma) {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    });
    testPrisma = new PrismaClient({ adapter });
  }
  return testPrisma;
}

/**
 * Deletes all records in reverse FK order using REAL deletes (not soft delete).
 * Order: completions → cells → rows → grids → users
 */
export async function cleanDatabase(): Promise<void> {
  const prisma = getTestPrisma();
  await prisma.practiceCellCompletion.deleteMany();
  await prisma.practiceCell.deleteMany();
  await prisma.practiceRow.deleteMany();
  await prisma.practiceGrid.deleteMany();
  await prisma.user.deleteMany();
}

/**
 * Disconnects and nulls the test client.
 */
export async function disconnectTestDb(): Promise<void> {
  if (testPrisma) {
    await testPrisma.$disconnect();
    testPrisma = null;
  }
}
