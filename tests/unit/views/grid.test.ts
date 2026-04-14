import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatGrid, formatGridDetail, formatGridList, formatGridSummaryList } from '@/views/grid';

const mockGrid = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  userId: 'user-id-should-be-stripped',
  name: 'Test Grid',
  notes: 'Some notes',
  fadeEnabled: true,
  gridType: 'REPERTOIRE',
  archived: false,
  sourceTemplateId: null,
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
      piece: null,
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

  it('includes gridType, archived, sourceTemplateId (M2.1)', () => {
    const result = formatGrid(mockGrid);
    expect(result.gridType).toBe('REPERTOIRE');
    expect(result.archived).toBe(false);
    expect(result.sourceTemplateId).toBeNull();
  });
});

describe('Grid view — formatGridDetail', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-16T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Test 13
  it('includes nested rows, cells, and completions with correct filtering', () => {
    const result = formatGridDetail(mockGridWithRows, new Date());
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
    const result = formatGridDetail(emptyGrid, new Date());
    expect(result.rows).toEqual([]);
  });

  it('returns grid-level completionPercentage and freshnessSummary', () => {
    const result = formatGridDetail(mockGridWithRows, new Date());
    expect(result).toHaveProperty('completionPercentage');
    expect(result).toHaveProperty('freshnessSummary');
    expect(typeof result.completionPercentage).toBe('number');
    expect(result.freshnessSummary).toHaveProperty('fresh');
    expect(result.freshnessSummary).toHaveProperty('aging');
    expect(result.freshnessSummary).toHaveProperty('stale');
    expect(result.freshnessSummary).toHaveProperty('decayed');
    expect(result.freshnessSummary).toHaveProperty('incomplete');
  });

  it('aggregates freshness across all rows for grid-level stats', () => {
    // mockGridWithRows has 2 cells: one with completion (aging at 1 day since), one incomplete
    // With fade enabled: cell-1 (completed, shielded by nothing higher completed → not shielded, aging)
    // cell-2 (incomplete)
    const result = formatGridDetail(mockGridWithRows, new Date());
    // cell-1: completed 2026-03-15, interval 1, now 2026-03-16 → 1 day since → aging (> 0.5*1, <= 1)
    // Not shielded: higher cell (cell-2) has no completions, skip it. cell-1 is highest completed → not shielded
    // effective: aging
    // cell-2: incomplete → incomplete
    // completionPercentage with fade: aging counts → 1/2 = 50%
    expect(result.completionPercentage).toBe(50);
    expect(result.freshnessSummary.aging).toBe(1);
    expect(result.freshnessSummary.incomplete).toBe(1);
  });

  it('returns completionPercentage 0 for grid with empty rows', () => {
    const emptyGrid = { ...mockGrid, practiceRows: [] };
    const result = formatGridDetail(emptyGrid, new Date());
    expect(result.completionPercentage).toBe(0);
    expect(result.freshnessSummary).toEqual({
      fresh: 0,
      aging: 0,
      stale: 0,
      decayed: 0,
      incomplete: 0,
    });
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

describe('Grid view — formatGridSummaryList', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-16T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns grid-level fields with completionPercentage and freshnessSummary', () => {
    const result = formatGridSummaryList([mockGridWithRows], new Date());
    expect(result).toHaveLength(1);
    const grid = result[0];
    expect(grid).toHaveProperty('id');
    expect(grid).toHaveProperty('name');
    expect(grid).toHaveProperty('notes');
    expect(grid).toHaveProperty('fadeEnabled');
    expect(grid).toHaveProperty('createdAt');
    expect(grid).toHaveProperty('updatedAt');
    expect(grid).toHaveProperty('completionPercentage');
    expect(grid).toHaveProperty('freshnessSummary');
    expect(grid).not.toHaveProperty('userId');
    expect(grid).not.toHaveProperty('deletedAt');
  });

  it('strips cell data from rows, keeping only summary fields', () => {
    const result = formatGridSummaryList([mockGridWithRows], new Date());
    const row = result[0].rows[0];
    expect(row).toHaveProperty('id');
    expect(row).toHaveProperty('piece');
    expect(row).toHaveProperty('passageLabel');
    expect(row).toHaveProperty('startMeasure');
    expect(row).toHaveProperty('endMeasure');
    expect(row).toHaveProperty('priority');
    expect(row).toHaveProperty('completionPercentage');
    expect(row).toHaveProperty('freshnessSummary');
    // Stripped fields:
    expect(row).not.toHaveProperty('cells');
    expect(row).not.toHaveProperty('sortOrder');
    expect(row).not.toHaveProperty('targetTempo');
    expect(row).not.toHaveProperty('steps');
    expect(row).not.toHaveProperty('createdAt');
    expect(row).not.toHaveProperty('updatedAt');
  });

  it('computes correct completionPercentage for grid and rows', () => {
    const result = formatGridSummaryList([mockGridWithRows], new Date());
    // mockGridWithRows: 2 cells, 1 completed (aging), 1 incomplete
    // With fade ON: aging counts → 1/2 = 50%
    expect(result[0].completionPercentage).toBe(50);
    expect(result[0].rows[0].completionPercentage).toBe(50);
  });

  it('handles empty grid list', () => {
    const result = formatGridSummaryList([], new Date());
    expect(result).toEqual([]);
  });

  it('handles grid with no rows', () => {
    const emptyGrid = { ...mockGrid, practiceRows: [] };
    const result = formatGridSummaryList([emptyGrid], new Date());
    expect(result[0].completionPercentage).toBe(0);
    expect(result[0].rows).toEqual([]);
  });

  it('handles multiple grids', () => {
    const grid2 = { ...mockGridWithRows, id: 'other-id', name: 'Second Grid' };
    const result = formatGridSummaryList([mockGridWithRows, grid2], new Date());
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Test Grid');
    expect(result[1].name).toBe('Second Grid');
  });
});

describe('Grid view — tempo rounding', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-16T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Test 17
  it('rounds cell tempo values to integers', () => {
    const result = formatGridDetail(mockGridWithRows, new Date());
    // 0.7333333 * 120 = 88.0 (but could be 87.99999...)
    // The view should round to the nearest integer
    const cell = result.rows[0].cells[1];
    expect(Number.isInteger(cell.targetTempoBpm)).toBe(true);
    expect(cell.targetTempoBpm).toBe(88);
  });
});
