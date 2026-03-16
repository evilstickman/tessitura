import { describe, it, expect } from 'vitest';
import { formatGrid, formatGridDetail, formatGridList } from '@/views/grid';

const mockGrid = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  userId: 'user-id-should-be-stripped',
  name: 'Test Grid',
  notes: 'Some notes',
  fadeEnabled: true,
  createdAt: new Date('2026-03-15T10:00:00Z'),
  updatedAt: new Date('2026-03-15T12:00:00Z'),
  deletedAt: null,
};

const mockGridWithRows = {
  ...mockGrid,
  practiceRows: [
    {
      id: 'row-1',
      practiceGridId: 'grid-id',
      sortOrder: 0,
      pieceId: null,
      passageLabel: 'Letter A to B',
      startMeasure: 1,
      endMeasure: 8,
      targetTempo: 120,
      steps: 3,
      priority: 'HIGH' as const,
      createdAt: new Date('2026-03-15T10:00:00Z'),
      updatedAt: new Date('2026-03-15T10:00:00Z'),
      deletedAt: null,
      practiceCells: [
        {
          id: 'cell-1',
          practiceRowId: 'row-1',
          stepNumber: 0,
          targetTempoPercentage: 0.4,
          freshnessIntervalDays: 1,
          createdAt: new Date('2026-03-15T10:00:00Z'),
          updatedAt: new Date('2026-03-15T10:00:00Z'),
          deletedAt: null,
          completions: [
            {
              id: 'comp-1',
              practiceCellId: 'cell-1',
              completionDate: new Date('2026-03-15'),
              createdAt: new Date('2026-03-15T10:00:00Z'),
              deletedAt: null,
            },
          ],
        },
        {
          id: 'cell-2',
          practiceRowId: 'row-1',
          stepNumber: 1,
          targetTempoPercentage: 0.7333333,
          freshnessIntervalDays: 1,
          createdAt: new Date('2026-03-15T10:00:00Z'),
          updatedAt: new Date('2026-03-15T10:00:00Z'),
          deletedAt: null,
          completions: [],
        },
      ],
    },
  ],
};

describe('Grid view — formatGrid', () => {
  // Test 12
  it('includes public fields and omits userId and deletedAt', () => {
    const result = formatGrid(mockGrid);
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('name');
    expect(result).toHaveProperty('notes');
    expect(result).toHaveProperty('fadeEnabled');
    expect(result).toHaveProperty('createdAt');
    expect(result).toHaveProperty('updatedAt');
    expect(result).not.toHaveProperty('userId');
    expect(result).not.toHaveProperty('deletedAt');
  });
});

describe('Grid view — formatGridDetail', () => {
  // Test 13
  it('includes nested rows, cells, and completions with correct filtering', () => {
    const result = formatGridDetail(mockGridWithRows);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].cells).toHaveLength(2);
    expect(result.rows[0].cells[0].completions).toHaveLength(1);
    // Row should not expose practiceGridId or deletedAt
    expect(result.rows[0]).not.toHaveProperty('practiceGridId');
    expect(result.rows[0]).not.toHaveProperty('deletedAt');
    // Cell should not expose practiceRowId or deletedAt
    expect(result.rows[0].cells[0]).not.toHaveProperty('practiceRowId');
    expect(result.rows[0].cells[0]).not.toHaveProperty('deletedAt');
    // Completion should not expose practiceCellId or deletedAt
    expect(result.rows[0].cells[0].completions[0]).not.toHaveProperty('practiceCellId');
    expect(result.rows[0].cells[0].completions[0]).not.toHaveProperty('deletedAt');
  });

  // Test 14
  it('returns empty rows array when grid has no rows', () => {
    const emptyGrid = { ...mockGrid, practiceRows: [] };
    const result = formatGridDetail(emptyGrid);
    expect(result.rows).toEqual([]);
  });
});

describe('Grid view — timestamps', () => {
  // Test 15
  it('formats timestamps as ISO 8601 strings', () => {
    const result = formatGrid(mockGrid);
    expect(result.createdAt).toBe('2026-03-15T10:00:00.000Z');
    expect(result.updatedAt).toBe('2026-03-15T12:00:00.000Z');
  });
});

describe('Grid view — formatGridList', () => {
  // Test 16
  it('returns array of formatted grids', () => {
    const result = formatGridList([mockGrid, { ...mockGrid, id: 'other-id' }]);
    expect(result).toHaveLength(2);
    expect(result[0]).not.toHaveProperty('userId');
    expect(result[1]).not.toHaveProperty('userId');
  });
});

describe('Grid view — tempo rounding', () => {
  // Test 17
  it('rounds cell tempo values to integers', () => {
    const result = formatGridDetail(mockGridWithRows);
    // 0.7333333 * 120 = 88.0 (but could be 87.99999...)
    // The view should round to the nearest integer
    const cell = result.rows[0].cells[1];
    expect(Number.isInteger(cell.targetTempoBpm)).toBe(true);
    expect(cell.targetTempoBpm).toBe(88);
  });
});
