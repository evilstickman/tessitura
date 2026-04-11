import { describe, it, expect } from 'vitest';
import { formatSession, formatSessionList } from '@/views/session';

const baseRecord = {
  id: '00000000-0000-0000-0000-000000000001',
  userId: '00000000-0000-0000-0000-000000000099',
  practiceGridId: '00000000-0000-0000-0000-000000000010',
  sessionDate: new Date('2026-04-01T00:00:00.000Z'),
  durationMinutes: 30,
  notes: 'Practiced scales',
  source: 'MANUAL' as const,
  createdAt: new Date('2026-04-01T18:30:00.000Z'),
  deletedAt: null,
};

describe('formatSession', () => {
  it('returns public fields only — strips userId and deletedAt', () => {
    const result = formatSession(baseRecord);
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('practiceGridId');
    expect(result).toHaveProperty('sessionDate');
    expect(result).toHaveProperty('durationMinutes');
    expect(result).toHaveProperty('notes');
    expect(result).toHaveProperty('source');
    expect(result).toHaveProperty('createdAt');
    expect(result).not.toHaveProperty('userId');
    expect(result).not.toHaveProperty('deletedAt');
  });

  it('renders sessionDate as a YYYY-MM-DD string (no time component)', () => {
    const result = formatSession(baseRecord);
    expect(result.sessionDate).toBe('2026-04-01');
    expect(result.sessionDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('renders createdAt as ISO 8601', () => {
    const result = formatSession(baseRecord);
    expect(result.createdAt).toBe('2026-04-01T18:30:00.000Z');
  });

  it('preserves null practiceGridId', () => {
    const result = formatSession({ ...baseRecord, practiceGridId: null });
    expect(result.practiceGridId).toBeNull();
  });

  it('preserves null notes', () => {
    const result = formatSession({ ...baseRecord, notes: null });
    expect(result.notes).toBeNull();
  });

  it('preserves source field', () => {
    const inferred = formatSession({ ...baseRecord, source: 'INFERRED' });
    expect(inferred.source).toBe('INFERRED');
  });
});

describe('formatSessionList', () => {
  it('maps over an array of records', () => {
    const list = formatSessionList([
      baseRecord,
      { ...baseRecord, id: '00000000-0000-0000-0000-000000000002' },
    ]);
    expect(list).toHaveLength(2);
    expect(list[0].id).toBe('00000000-0000-0000-0000-000000000001');
    expect(list[1].id).toBe('00000000-0000-0000-0000-000000000002');
    expect(list[0]).not.toHaveProperty('userId');
  });

  it('returns an empty array for empty input', () => {
    expect(formatSessionList([])).toEqual([]);
  });
});
