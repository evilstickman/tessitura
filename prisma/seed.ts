import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  const seedUser = await prisma.user.upsert({
    where: { email: 'dev-placeholder@tessitura.local' },
    update: {},
    create: {
      email: 'dev-placeholder@tessitura.local',
      passwordHash: 'not-a-real-hash',
      displayName: 'Dev User',
      instruments: [],
    },
  });

  console.log(`Seed user: ${seedUser.id} (${seedUser.email})`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
