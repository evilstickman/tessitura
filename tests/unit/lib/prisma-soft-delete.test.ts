import { describe, it, expect } from 'vitest';
import { addSoftDeleteFilter } from '@/lib/prisma-soft-delete';

describe('addSoftDeleteFilter', () => {
  it('adds deletedAt: null when no args provided', () => {
    const result = addSoftDeleteFilter({});
    expect(result).toEqual({ where: { deletedAt: null } });
  });

  it('adds deletedAt: null when args has no where clause', () => {
    const result = addSoftDeleteFilter({ include: { user: true } });
    expect(result).toEqual({ include: { user: true }, where: { deletedAt: null } });
  });

  it('adds deletedAt: null to existing where clause', () => {
    const result = addSoftDeleteFilter({ where: { email: 'test@example.com' } });
    expect(result).toEqual({
      where: { email: 'test@example.com', deletedAt: null },
    });
  });

  it('does NOT overwrite if caller explicitly set deletedAt', () => {
    const explicitDate = new Date('2024-01-01');
    const result = addSoftDeleteFilter({
      where: { deletedAt: explicitDate },
    });
    expect(result).toEqual({
      where: { deletedAt: explicitDate },
    });
  });

  it('does NOT overwrite if caller set deletedAt to a Prisma filter object', () => {
    const result = addSoftDeleteFilter({
      where: { deletedAt: { not: null } },
    });
    expect(result).toEqual({
      where: { deletedAt: { not: null } },
    });
  });

  it('creates where object when args is undefined', () => {
    const result = addSoftDeleteFilter(undefined);
    expect(result).toEqual({ where: { deletedAt: null } });
  });

  it('preserves all other args properties', () => {
    const result = addSoftDeleteFilter({
      where: { name: 'test' },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    expect(result).toEqual({
      where: { name: 'test', deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
  });
});
