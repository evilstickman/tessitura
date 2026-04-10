import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  // Seed user is a Google-OAuth user in production (passwordHash is nullable).
  const seedUser = await prisma.user.upsert({
    where: { email: 'dev-placeholder@tessitura.local' },
    update: {},
    create: {
      email: 'dev-placeholder@tessitura.local',
      name: 'Dev User',
      instruments: [],
    },
  });

  console.log(`Seed user: ${seedUser.id} (${seedUser.email})`);

  // ─── Dev/E2E fixture data (not production seed) ───────────────────────
  // This data supports manual testing and Playwright e2e tests.
  // It may be updated or replaced as UI milestones evolve.

  const grid = await prisma.practiceGrid.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      userId: seedUser.id,
      name: 'Audition Prep — Week 1',
      notes: 'Focus on Firebird excerpts and Clarke fundamentals',
      fadeEnabled: true,
    },
  });

  const piece = await prisma.piece.upsert({
    where: { id: '00000000-0000-0000-0000-000000000010' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000010',
      userId: seedUser.id,
      title: 'Clarke #3 in Eb',
      composer: 'Herbert L. Clarke',
    },
  });

  const row = await prisma.practiceRow.upsert({
    where: { id: '00000000-0000-0000-0000-000000000100' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000100',
      practiceGridId: grid.id,
      pieceId: piece.id,
      sortOrder: 0,
      startMeasure: 1,
      endMeasure: 16,
      targetTempo: 120,
      steps: 5,
      priority: 'HIGH',
    },
  });

  const percentages = [0.4, 0.55, 0.7, 0.85, 1.0];
  for (let i = 0; i < percentages.length; i++) {
    await prisma.practiceCell.upsert({
      where: { id: `00000000-0000-0000-0000-00000000100${i}` },
      update: {},
      create: {
        id: `00000000-0000-0000-0000-00000000100${i}`,
        practiceRowId: row.id,
        stepNumber: i,
        targetTempoPercentage: percentages[i],
      },
    });
  }

  console.log(`Seed grid: ${grid.id} (${grid.name})`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
