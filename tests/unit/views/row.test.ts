import { describe, it, expect } from 'vitest';
import { formatRow } from '@/views/row';

const basePiece = {
  id: 'piece-uuid',
  userId: 'user-uuid',
  title: 'Firebird Suite',
  composer: 'Stravinsky',
  part: '1st Trumpet',
  studyReference: null,
  createdAt: new Date('2026-03-15T10:00:00Z'),
  updatedAt: new Date('2026-03-15T11:00:00Z'),
  deletedAt: null,
};

const baseCell = {
  id: 'cell-uuid',
  practiceRowId: 'row-uuid',
  stepNumber: 0,
  targetTempoPercentage: 0.4,
  freshnessIntervalDays: 1,
  createdAt: new Date('2026-03-15T10:00:00Z'),
  updatedAt: new Date('2026-03-15T11:00:00Z'),
  deletedAt: null,
  completions: [],
};

const baseRow = {
  id: 'row-uuid',
  practiceGridId: 'grid-uuid',
  sortOrder: 0,
  pieceId: 'piece-uuid',
  piece: basePiece,
  passageLabel: 'Infernal Dance',
  startMeasure: 1,
  endMeasure: 16,
  targetTempo: 168,
  steps: 3,
  priority: 'HIGH' as const,
  createdAt: new Date('2026-03-15T10:00:00Z'),
  updatedAt: new Date('2026-03-15T11:00:00Z'),
  deletedAt: null,
  practiceCells: [baseCell],
};

describe('Row View — formatRow', () => {
  it('strips internal fields', () => {
    const result = formatRow(baseRow);
    expect(result).not.toHaveProperty('practiceGridId');
    expect(result).not.toHaveProperty('pieceId');
    expect(result).not.toHaveProperty('deletedAt');
    expect(result).not.toHaveProperty('practiceCells');
  });

  it('formats timestamps as ISO 8601', () => {
    const result = formatRow(baseRow);
    expect(result.createdAt).toBe('2026-03-15T10:00:00.000Z');
    expect(result.updatedAt).toBe('2026-03-15T11:00:00.000Z');
  });

  it('includes nested piece without userId or deletedAt', () => {
    const result = formatRow(baseRow);
    expect(result.piece).toBeDefined();
    expect(result.piece!.title).toBe('Firebird Suite');
    expect(result.piece).not.toHaveProperty('userId');
    expect(result.piece).not.toHaveProperty('deletedAt');
    expect(result.piece).not.toHaveProperty('createdAt');
  });

  it('returns null piece when row has no piece', () => {
    const row = { ...baseRow, piece: null, pieceId: null };
    const result = formatRow(row);
    expect(result.piece).toBeNull();
  });

  it('calculates targetTempoBpm on cells', () => {
    const result = formatRow(baseRow);
    // 0.4 * 168 = 67.2 → rounds to 67
    expect(result.cells[0].targetTempoBpm).toBe(67);
  });

  it('strips internal fields from cells', () => {
    const result = formatRow(baseRow);
    expect(result.cells[0]).not.toHaveProperty('practiceRowId');
    expect(result.cells[0]).not.toHaveProperty('deletedAt');
  });
});
