import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';
import { addSoftDeleteFilter } from './prisma-soft-delete';

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createExtendedClient> | undefined;
};

function createExtendedClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const base = new PrismaClient({ adapter });

  return base.$extends({
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
        async deleteMany({ args, model }) {
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
