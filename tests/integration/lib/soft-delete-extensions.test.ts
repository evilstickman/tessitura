import { describe, it, expect, beforeEach } from 'vitest';
import { getTestPrisma } from '../../helpers/db';
import { prisma } from '@/lib/db';

const rawPrisma = getTestPrisma();

async function createTestUser() {
  return rawPrisma.user.create({
    data: {
      email: 'soft-delete-test@example.com',
      passwordHash: 'hash',
      name: 'Test User',
      instruments: [],
    },
  });
}

describe('Soft-delete Prisma extension', () => {
  let userId: string;

  beforeEach(async () => {
    const user = await createTestUser();
    userId = user.id;
  });

  it('count excludes soft-deleted records', async () => {
    await rawPrisma.practiceGrid.create({
      data: { userId, name: 'Active' },
    });
    await rawPrisma.practiceGrid.create({
      data: { userId, name: 'Deleted', deletedAt: new Date() },
    });

    const count = await prisma.practiceGrid.count({ where: { userId } });
    expect(count).toBe(1);
  });

  it('delete converts to soft-delete', async () => {
    const grid = await rawPrisma.practiceGrid.create({
      data: { userId, name: 'To Soft Delete' },
    });

    await prisma.practiceGrid.delete({ where: { id: grid.id } });

    // Raw client should see the record with deletedAt set
    const deleted = await rawPrisma.practiceGrid.findUnique({ where: { id: grid.id } });
    expect(deleted).not.toBeNull();
    expect(deleted!.deletedAt).not.toBeNull();
  });

  it('deleteMany converts to soft-delete', async () => {
    await rawPrisma.practiceGrid.create({
      data: { userId, name: 'Batch 1' },
    });
    await rawPrisma.practiceGrid.create({
      data: { userId, name: 'Batch 2' },
    });

    await prisma.practiceGrid.deleteMany({ where: { userId } });

    // Raw client should see records with deletedAt set
    const records = await rawPrisma.practiceGrid.findMany({ where: { userId } });
    expect(records).toHaveLength(2);
    expect(records.every((r) => r.deletedAt !== null)).toBe(true);
  });
});
