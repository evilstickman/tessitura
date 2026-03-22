import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';
import { addSoftDeleteFilter } from './prisma-soft-delete';

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createExtendedClient> | undefined;
};

function createExtendedClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const base = new PrismaClient({ adapter });

  // Models that have a deletedAt field and use soft-delete.
  // Account and VerificationToken (Auth.js tables) do NOT have deletedAt.
  const SOFT_DELETE_MODELS = new Set([
    'User', 'PracticeGrid', 'PracticeRow', 'PracticeCell',
    'PracticeCellCompletion', 'Piece',
  ]);

  return base.$extends({
    query: {
      $allModels: {
        async findMany({ args, query, model }) {
          return query(SOFT_DELETE_MODELS.has(model) ? addSoftDeleteFilter(args) : args);
        },
        async findFirst({ args, query, model }) {
          return query(SOFT_DELETE_MODELS.has(model) ? addSoftDeleteFilter(args) : args);
        },
        async findUnique({ args, query, model }) {
          return query(SOFT_DELETE_MODELS.has(model) ? addSoftDeleteFilter(args) : args);
        },
        async count({ args, query, model }) {
          return query(SOFT_DELETE_MODELS.has(model) ? addSoftDeleteFilter(args) : args);
        },
        async delete({ args, model, query }) {
          if (!SOFT_DELETE_MODELS.has(model)) return query(args);
          // Convert delete to soft-delete (update setting deletedAt)
          const client = prisma as unknown as Record<
            string,
            { update: (a: unknown) => Promise<unknown> }
          >;
          const modelKey = model.charAt(0).toLowerCase() + model.slice(1);
          return client[modelKey].update({
            where: args.where,
            data: { deletedAt: new Date() },
          });
        },
        async deleteMany({ args, model, query }) {
          if (!SOFT_DELETE_MODELS.has(model)) return query(args);
          // Convert deleteMany to soft-delete (updateMany setting deletedAt)
          const client = prisma as unknown as Record<
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
}

export const prisma =
  globalForPrisma.prisma ?? createExtendedClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
