import { describe, it, expect, beforeEach } from 'vitest';
import { getTestPrisma } from '../../helpers/db';
import { prisma } from '@/lib/db';

const rawPrisma = getTestPrisma();

async function createTestUser() {
  return rawPrisma.user.create({
    data: {
      email: 'soft-delete-test@example.com',
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

  it('findMany excludes soft-deleted records', async () => {
    await rawPrisma.practiceGrid.create({ data: { userId, name: 'Active' } });
    await rawPrisma.practiceGrid.create({
      data: { userId, name: 'Deleted', deletedAt: new Date() },
    });

    const records = await prisma.practiceGrid.findMany({ where: { userId } });
    expect(records).toHaveLength(1);
    expect(records[0].name).toBe('Active');
  });

  it('findFirst excludes soft-deleted records', async () => {
    const deleted = await rawPrisma.practiceGrid.create({
      data: { userId, name: 'Deleted', deletedAt: new Date() },
    });

    const found = await prisma.practiceGrid.findFirst({ where: { id: deleted.id } });
    expect(found).toBeNull();
  });

  it('findUnique excludes soft-deleted records', async () => {
    const deleted = await rawPrisma.practiceGrid.create({
      data: { userId, name: 'Deleted', deletedAt: new Date() },
    });

    const found = await prisma.practiceGrid.findUnique({ where: { id: deleted.id } });
    expect(found).toBeNull();
  });

  it('findUniqueOrThrow excludes soft-deleted records', async () => {
    const deleted = await rawPrisma.practiceGrid.create({
      data: { userId, name: 'Deleted', deletedAt: new Date() },
    });

    await expect(
      prisma.practiceGrid.findUniqueOrThrow({ where: { id: deleted.id } })
    ).rejects.toThrow();
  });

  it('findFirstOrThrow excludes soft-deleted records', async () => {
    await rawPrisma.practiceGrid.create({
      data: { userId, name: 'Deleted', deletedAt: new Date() },
    });

    await expect(
      prisma.practiceGrid.findFirstOrThrow({ where: { userId } })
    ).rejects.toThrow();
  });

  it('findUniqueOrThrow still returns active records', async () => {
    const active = await rawPrisma.practiceGrid.create({
      data: { userId, name: 'Active' },
    });

    const found = await prisma.practiceGrid.findUniqueOrThrow({ where: { id: active.id } });
    expect(found.id).toBe(active.id);
    expect(found.deletedAt).toBeNull();
  });

  it('findFirstOrThrow still returns active records', async () => {
    await rawPrisma.practiceGrid.create({ data: { userId, name: 'Active' } });

    const found = await prisma.practiceGrid.findFirstOrThrow({ where: { userId } });
    expect(found.name).toBe('Active');
  });

  it('soft-delete filter is not applied to non-soft-delete models (Account)', async () => {
    // Account (Auth.js) has no deletedAt field — the extension must not add a filter
    // that would cause a Prisma error. We verify by counting accounts (the query must succeed).
    const count = await prisma.account.count();
    expect(typeof count).toBe('number');
  });
});
