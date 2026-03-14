import { describe, it, expect } from 'vitest';
import { addSoftDeleteFilter } from '@/lib/prisma-soft-delete';

describe('addSoftDeleteFilter', () => {
  it('adds deletedAt: null when no where clause exists', () => {
    const args = {};
    const result = addSoftDeleteFilter(args);
    expect(result.where).toEqual({ deletedAt: null });
  });

  it('adds deletedAt: null to existing where clause', () => {
    const args = { where: { email: 'test@example.com' } };
    const result = addSoftDeleteFilter(args);
    expect(result.where).toEqual({
      email: 'test@example.com',
      deletedAt: null,
    });
  });

  it('does not overwrite explicit deletedAt filter', () => {
    const deletedAt = new Date('2024-01-01');
    const args = { where: { deletedAt } };
    const result = addSoftDeleteFilter(args);
    expect(result.where).toEqual({ deletedAt });
  });

  it('does not overwrite deletedAt: { not: null }', () => {
    const args = { where: { deletedAt: { not: null } } };
    const result = addSoftDeleteFilter(args);
    expect(result.where).toEqual({ deletedAt: { not: null } });
  });

  it('preserves other args besides where', () => {
    const args = { where: { id: '123' }, include: { user: true } };
    const result = addSoftDeleteFilter(args);
    expect(result).toEqual({
      where: { id: '123', deletedAt: null },
      include: { user: true },
    });
  });

  it('handles where clause with deletedAt explicitly set to null', () => {
    const args = { where: { deletedAt: null } };
    const result = addSoftDeleteFilter(args);
    expect(result.where).toEqual({ deletedAt: null });
  });
});
