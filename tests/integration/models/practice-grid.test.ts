import { describe, it, expect } from 'vitest';
import { getTestPrisma } from '../../helpers/db';

async function createTestUser() {
  const prisma = getTestPrisma();
  return prisma.user.create({
    data: {
      email: `user-${Date.now()}@example.com`,
      passwordHash: 'hash',
      name: 'Test User',
      instruments: ['violin'],
    },
  });
}

describe('PracticeGrid model', () => {
  it('creates a practice grid with a user', async () => {
    const prisma = getTestPrisma();
    const user = await createTestUser();

    const grid = await prisma.practiceGrid.create({
      data: {
        userId: user.id,
        name: 'Morning Practice',
        notes: 'Focus on scales',
      },
    });

    expect(grid.name).toBe('Morning Practice');
    expect(grid.notes).toBe('Focus on scales');
    expect(grid.userId).toBe(user.id);
    expect(grid.fadeEnabled).toBe(true);
  });

  it('enforces foreign key constraint on userId', async () => {
    const prisma = getTestPrisma();
    const fakeId = '00000000-0000-0000-0000-000000000000';

    await expect(
      prisma.practiceGrid.create({
        data: {
          userId: fakeId,
          name: 'Orphan Grid',
        },
      }),
    ).rejects.toThrow();
  });

  it('allows null notes', async () => {
    const prisma = getTestPrisma();
    const user = await createTestUser();

    const grid = await prisma.practiceGrid.create({
      data: {
        userId: user.id,
        name: 'No Notes Grid',
      },
    });

    expect(grid.notes).toBeNull();
  });

  it('loads user relation via include', async () => {
    const prisma = getTestPrisma();
    const user = await createTestUser();

    await prisma.practiceGrid.create({
      data: {
        userId: user.id,
        name: 'Relation Test',
      },
    });

    const gridWithUser = await prisma.practiceGrid.findFirst({
      where: { userId: user.id },
      include: { user: true },
    });

    expect(gridWithUser).not.toBeNull();
    expect(gridWithUser!.user.email).toBe(user.email);
  });
});
