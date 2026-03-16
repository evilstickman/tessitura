import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
  // Pin "now" so freshness calculations are deterministic
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-16T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('strips internal fields', () => {
    const result = formatRow(baseRow, true);
    expect(result).not.toHaveProperty('practiceGridId');
    expect(result).not.toHaveProperty('pieceId');
    expect(result).not.toHaveProperty('deletedAt');
    expect(result).not.toHaveProperty('practiceCells');
  });

  it('formats timestamps as ISO 8601', () => {
    const result = formatRow(baseRow, true);
    expect(result.createdAt).toBe('2026-03-15T10:00:00.000Z');
    expect(result.updatedAt).toBe('2026-03-15T11:00:00.000Z');
  });

  it('includes nested piece without userId or deletedAt', () => {
    const result = formatRow(baseRow, true);
    expect(result.piece).toBeDefined();
    expect(result.piece!.title).toBe('Firebird Suite');
    expect(result.piece).not.toHaveProperty('userId');
    expect(result.piece).not.toHaveProperty('deletedAt');
    expect(result.piece).not.toHaveProperty('createdAt');
  });

  it('returns null piece when row has no piece', () => {
    const row = { ...baseRow, piece: null, pieceId: null };
    const result = formatRow(row, true);
    expect(result.piece).toBeNull();
  });

  it('calculates targetTempoBpm on cells', () => {
    const result = formatRow(baseRow, true);
    // 0.4 * 168 = 67.2 → rounds to 67
    expect(result.cells[0].targetTempoBpm).toBe(67);
  });

  it('strips internal fields from cells', () => {
    const result = formatRow(baseRow, true);
    expect(result.cells[0]).not.toHaveProperty('practiceRowId');
    expect(result.cells[0]).not.toHaveProperty('deletedAt');
  });

  it('returns freshnessState "incomplete" and lastCompletionDate null for cell with no completions', () => {
    const result = formatRow(baseRow, true);
    expect(result.cells[0].freshnessState).toBe('incomplete');
    expect(result.cells[0].lastCompletionDate).toBeNull();
    expect(result.cells[0].isShielded).toBe(false);
  });

  it('returns correct lastCompletionDate as YYYY-MM-DD string', () => {
    const cellWithCompletion = {
      ...baseCell,
      completions: [
        {
          id: 'comp-1',
          practiceCellId: 'cell-uuid',
          completionDate: new Date('2026-03-15T00:00:00Z'),
          createdAt: new Date('2026-03-15T10:00:00Z'),
          deletedAt: null,
        },
      ],
    };
    const row = { ...baseRow, practiceCells: [cellWithCompletion] };
    const result = formatRow(row, true);
    expect(result.cells[0].lastCompletionDate).toBe('2026-03-15');
  });

  it('returns freshnessState "fresh" for a recently completed cell', () => {
    // Completed today, interval 1 day, now is 2026-03-16 → 1 day since = aging (> 0.5 * 1)
    // Need completion within 0.5 * interval → same day
    const cellWithCompletion = {
      ...baseCell,
      completions: [
        {
          id: 'comp-1',
          practiceCellId: 'cell-uuid',
          completionDate: new Date('2026-03-16T00:00:00Z'),
          createdAt: new Date('2026-03-16T00:00:00Z'),
          deletedAt: null,
        },
      ],
    };
    const row = { ...baseRow, practiceCells: [cellWithCompletion] };
    const result = formatRow(row, true);
    expect(result.cells[0].freshnessState).toBe('fresh');
  });

  it('returns completionPercentage and freshnessSummary', () => {
    const result = formatRow(baseRow, true);
    expect(result).toHaveProperty('completionPercentage');
    expect(result).toHaveProperty('freshnessSummary');
    expect(typeof result.completionPercentage).toBe('number');
    expect(result.freshnessSummary).toHaveProperty('fresh');
    expect(result.freshnessSummary).toHaveProperty('aging');
    expect(result.freshnessSummary).toHaveProperty('stale');
    expect(result.freshnessSummary).toHaveProperty('decayed');
    expect(result.freshnessSummary).toHaveProperty('incomplete');
  });

  it('computes completionPercentage 0 when all cells are incomplete', () => {
    const result = formatRow(baseRow, true);
    expect(result.completionPercentage).toBe(0);
    expect(result.freshnessSummary.incomplete).toBe(1);
  });

  it('sorts cells by targetTempoPercentage for shielding', () => {
    const cells = [
      { ...baseCell, id: 'cell-high', stepNumber: 2, targetTempoPercentage: 1.0, completions: [] },
      { ...baseCell, id: 'cell-low', stepNumber: 0, targetTempoPercentage: 0.4, completions: [] },
      { ...baseCell, id: 'cell-mid', stepNumber: 1, targetTempoPercentage: 0.7, completions: [] },
    ];
    const row = { ...baseRow, practiceCells: cells };
    const result = formatRow(row, true);
    // Cells should be sorted by targetTempoPercentage ascending in output
    expect(result.cells[0].targetTempoPercentage).toBe(0.4);
    expect(result.cells[1].targetTempoPercentage).toBe(0.7);
    expect(result.cells[2].targetTempoPercentage).toBe(1.0);
  });

  it('shields lower cells when fade is enabled and higher cell is not decayed', () => {
    // Two cells, both completed recently. Lower cell should be shielded.
    const now = new Date('2026-03-16T00:00:00Z');
    const cells = [
      {
        ...baseCell,
        id: 'cell-low',
        stepNumber: 0,
        targetTempoPercentage: 0.4,
        completions: [{
          id: 'comp-1',
          practiceCellId: 'cell-low',
          completionDate: new Date('2026-03-14T00:00:00Z'), // 2 days ago, stale for interval=1
          createdAt: now,
          deletedAt: null,
        }],
      },
      {
        ...baseCell,
        id: 'cell-high',
        stepNumber: 1,
        targetTempoPercentage: 1.0,
        completions: [{
          id: 'comp-2',
          practiceCellId: 'cell-high',
          completionDate: new Date('2026-03-14T00:00:00Z'), // 2 days ago, stale for interval=1
          createdAt: now,
          deletedAt: null,
        }],
      },
    ];
    const row = { ...baseRow, practiceCells: cells };

    // With fade enabled: lower cell is shielded by higher (stale, not decayed)
    const resultFade = formatRow(row, true);
    expect(resultFade.cells[0].isShielded).toBe(true);
    expect(resultFade.cells[0].freshnessState).toBe('fresh'); // shielded → fresh
    expect(resultFade.cells[1].isShielded).toBe(false);

    // With fade disabled: no shielding
    const resultNoFade = formatRow(row, false);
    expect(resultNoFade.cells[0].isShielded).toBe(false);
    expect(resultNoFade.cells[0].freshnessState).toBe('fresh'); // fade off → all completed = fresh
  });
});
