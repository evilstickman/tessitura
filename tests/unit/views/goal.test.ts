import { describe, it, expect } from 'vitest';
import { formatGoal, formatGoalList } from '@/views/goal';

const baseRecord = {
  id: '00000000-0000-0000-0000-000000000001',
  userId: '00000000-0000-0000-0000-000000000099',
  goalType: 'DAILY_MINUTES' as const,
  targetValue: 30,
  active: true,
  createdAt: new Date('2026-04-01T12:00:00.000Z'),
  updatedAt: new Date('2026-04-02T12:00:00.000Z'),
  deletedAt: null,
};

describe('formatGoal', () => {
  it('returns public fields and strips userId + deletedAt', () => {
    const result = formatGoal(baseRecord);
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('goalType');
    expect(result).toHaveProperty('targetValue');
    expect(result).toHaveProperty('active');
    expect(result).toHaveProperty('createdAt');
    expect(result).toHaveProperty('updatedAt');
    expect(result).not.toHaveProperty('userId');
    expect(result).not.toHaveProperty('deletedAt');
  });

  it('renders timestamps as ISO 8601', () => {
    const result = formatGoal(baseRecord);
    expect(result.createdAt).toBe('2026-04-01T12:00:00.000Z');
    expect(result.updatedAt).toBe('2026-04-02T12:00:00.000Z');
  });

  it('preserves active flag', () => {
    expect(formatGoal({ ...baseRecord, active: false }).active).toBe(false);
  });

  it('preserves goalType enum value', () => {
    const weekly = formatGoal({ ...baseRecord, goalType: 'WEEKLY_MINUTES' });
    expect(weekly.goalType).toBe('WEEKLY_MINUTES');
  });
});

describe('formatGoalList', () => {
  it('maps over an array', () => {
    const list = formatGoalList([
      baseRecord,
      { ...baseRecord, id: '00000000-0000-0000-0000-000000000002' },
    ]);
    expect(list).toHaveLength(2);
    expect(list[0]).not.toHaveProperty('userId');
  });

  it('handles empty input', () => {
    expect(formatGoalList([])).toEqual([]);
  });
});
