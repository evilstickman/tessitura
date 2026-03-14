import { describe, it, expect } from 'vitest';
import { getTestPrisma } from '../../helpers/db';

describe('User model', () => {
  it('creates a user with all required fields', async () => {
    const prisma = getTestPrisma();
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        passwordHash: 'hashed_password_123',
        displayName: 'Test User',
        instruments: ['violin', 'piano'],
      },
    });

    expect(user.email).toBe('test@example.com');
    expect(user.passwordHash).toBe('hashed_password_123');
    expect(user.displayName).toBe('Test User');
    expect(user.instruments).toEqual(['violin', 'piano']);
  });

  it('generates a valid UUID for id', async () => {
    const prisma = getTestPrisma();
    const user = await prisma.user.create({
      data: {
        email: 'uuid@example.com',
        passwordHash: 'hash',
        displayName: 'UUID Test',
        instruments: [],
      },
    });

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(user.id).toMatch(uuidRegex);
  });

  it('enforces unique email constraint', async () => {
    const prisma = getTestPrisma();
    await prisma.user.create({
      data: {
        email: 'duplicate@example.com',
        passwordHash: 'hash',
        displayName: 'First',
        instruments: [],
      },
    });

    await expect(
      prisma.user.create({
        data: {
          email: 'duplicate@example.com',
          passwordHash: 'hash2',
          displayName: 'Second',
          instruments: [],
        },
      }),
    ).rejects.toThrow();
  });

  it('stores instruments as a string array', async () => {
    const prisma = getTestPrisma();
    const instruments = ['cello', 'viola', 'bass'];
    const user = await prisma.user.create({
      data: {
        email: 'instruments@example.com',
        passwordHash: 'hash',
        displayName: 'Multi',
        instruments,
      },
    });

    expect(user.instruments).toEqual(instruments);
    expect(Array.isArray(user.instruments)).toBe(true);
  });

  it('sets default values correctly', async () => {
    const prisma = getTestPrisma();
    const user = await prisma.user.create({
      data: {
        email: 'defaults@example.com',
        passwordHash: 'hash',
        displayName: 'Defaults',
        instruments: [],
      },
    });

    expect(user.emailVerified).toBe(false);
    expect(user.timezone).toBe('UTC');
    expect(user.defaultFadeEnabled).toBe(true);
    expect(user.freshnessResetStrategy).toBe('FULL');
    expect(user.deletedAt).toBeNull();
  });

  it('sets createdAt and updatedAt timestamps automatically', async () => {
    const prisma = getTestPrisma();
    const before = new Date();
    const user = await prisma.user.create({
      data: {
        email: 'timestamps@example.com',
        passwordHash: 'hash',
        displayName: 'Timestamps',
        instruments: [],
      },
    });
    const after = new Date();

    expect(user.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
    expect(user.createdAt.getTime()).toBeLessThanOrEqual(after.getTime() + 1000);
    expect(user.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
    expect(user.updatedAt.getTime()).toBeLessThanOrEqual(after.getTime() + 1000);
  });
});
