import { describe, it, expect } from 'vitest';
import { getTestPrisma } from '../../helpers/db';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../../src/generated/prisma/client';
import { addSoftDeleteFilter } from '@/lib/prisma-soft-delete';

/**
 * Creates an extended client with soft-delete behavior (mirrors src/lib/db.ts).
 */
function createSoftDeleteClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });
  const base = new PrismaClient({ adapter });

  const extended = base.$extends({
    query: {
      $allModels: {
        async findMany({ args, query }) {
          return query(addSoftDeleteFilter(args));
        },
        async findFirst({ args, query }) {
          return query(addSoftDeleteFilter(args));
        },
        async findUnique({ args, query }) {
          return query(addSoftDeleteFilter(args));
        },
        async count({ args, query }) {
          return query(addSoftDeleteFilter(args));
        },
        async delete({ args, model }) {
          const client = extended as unknown as Record<
            string,
            { update: (a: unknown) => Promise<unknown> }
          >;
          const modelKey = model.charAt(0).toLowerCase() + model.slice(1);
          return client[modelKey].update({
            where: args.where,
            data: { deletedAt: new Date() },
          });
        },
        async deleteMany({ args, model }) {
          const client = extended as unknown as Record<
            string,
            { updateMany: (a: unknown) => Promise<unknown> }
          >;
          const modelKey = model.charAt(0).toLowerCase() + model.slice(1);
          return client[modelKey].updateMany({
            where: args.where,
            data: { deletedAt: new Date() },
          });
        },
      },
    },
  });

  return extended;
}

let softDeleteClient: ReturnType<typeof createSoftDeleteClient>;

function getSoftDeleteClient() {
  if (!softDeleteClient) {
    softDeleteClient = createSoftDeleteClient();
  }
  return softDeleteClient;
}

async function createTestUser() {
  const prisma = getTestPrisma();
  return prisma.user.create({
    data: {
      email: `soft-${Date.now()}-${Math.random()}@example.com`,
      passwordHash: 'hash',
      displayName: 'Soft Delete Test',
      instruments: [],
    },
  });
}

describe('Soft delete behavior', () => {
  it('delete sets deletedAt instead of removing the record', async () => {
    const raw = getTestPrisma();
    const soft = getSoftDeleteClient();
    const user = await createTestUser();

    await soft.user.delete({ where: { id: user.id } });

    // Raw client should still find the record with deletedAt set
    const found = await raw.user.findUnique({ where: { id: user.id } });
    expect(found).not.toBeNull();
    expect(found!.deletedAt).not.toBeNull();
    expect(found!.deletedAt).toBeInstanceOf(Date);
  });

  it('findMany excludes soft-deleted records', async () => {
    const raw = getTestPrisma();
    const soft = getSoftDeleteClient();
    const user = await createTestUser();

    // Soft-delete
    await raw.user.update({
      where: { id: user.id },
      data: { deletedAt: new Date() },
    });

    const results = await soft.user.findMany({
      where: { email: user.email },
    });
    expect(results).toHaveLength(0);
  });

  it('findFirst excludes soft-deleted records', async () => {
    const raw = getTestPrisma();
    const soft = getSoftDeleteClient();
    const user = await createTestUser();

    await raw.user.update({
      where: { id: user.id },
      data: { deletedAt: new Date() },
    });

    const found = await soft.user.findFirst({
      where: { email: user.email },
    });
    expect(found).toBeNull();
  });

  it('count excludes soft-deleted records', async () => {
    const raw = getTestPrisma();
    const soft = getSoftDeleteClient();
    const user = await createTestUser();

    const countBefore = await soft.user.count({
      where: { email: user.email },
    });
    expect(countBefore).toBe(1);

    await raw.user.update({
      where: { id: user.id },
      data: { deletedAt: new Date() },
    });

    const countAfter = await soft.user.count({
      where: { email: user.email },
    });
    expect(countAfter).toBe(0);
  });

  it('allows explicit deletedAt query to find soft-deleted records', async () => {
    const raw = getTestPrisma();
    const soft = getSoftDeleteClient();
    const user = await createTestUser();

    await raw.user.update({
      where: { id: user.id },
      data: { deletedAt: new Date() },
    });

    const found = await soft.user.findMany({
      where: {
        email: user.email,
        deletedAt: { not: null },
      },
    });
    expect(found).toHaveLength(1);
    expect(found[0].id).toBe(user.id);
  });

  it('deleteMany soft-deletes multiple records', async () => {
    const raw = getTestPrisma();
    const soft = getSoftDeleteClient();

    const user1 = await createTestUser();
    const user2 = await raw.user.create({
      data: {
        email: `soft-many-${Date.now()}@example.com`,
        passwordHash: 'hash',
        displayName: 'Soft Delete Many',
        instruments: [],
      },
    });

    await soft.user.deleteMany({
      where: { id: { in: [user1.id, user2.id] } },
    });

    // Both should still exist but be soft-deleted
    const users = await raw.user.findMany({
      where: { id: { in: [user1.id, user2.id] } },
    });
    expect(users).toHaveLength(2);
    expect(users.every((u) => u.deletedAt !== null)).toBe(true);
  });
});
