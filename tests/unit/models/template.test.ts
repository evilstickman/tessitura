import { describe, it, expect } from 'vitest';
import { validateGridData, type TemplateGridData } from '@/models/template';
import { ValidationError } from '@/lib/errors';

function baseGridData(overrides: Partial<TemplateGridData> = {}): TemplateGridData {
  return {
    rows: [
      { passageLabel: 'Study #1', startMeasure: 1, endMeasure: 16, targetTempo: 120, steps: 5 },
    ],
    ...overrides,
  };
}

describe('validateGridData — structure', () => {
  it('accepts a valid blob with one row', () => {
    const result = validateGridData(baseGridData());
    expect(result.rows).toHaveLength(1);
  });

  it('accepts multiple rows', () => {
    const result = validateGridData({
      rows: [
        { startMeasure: 1, endMeasure: 4, targetTempo: 100, steps: 3 },
        { startMeasure: 5, endMeasure: 8, targetTempo: 120, steps: 4 },
      ],
    });
    expect(result.rows).toHaveLength(2);
  });

  it('rejects null', () => {
    expect(() => validateGridData(null)).toThrow(ValidationError);
  });

  it('rejects a plain string', () => {
    expect(() => validateGridData('{"rows":[]}' as unknown)).toThrow(ValidationError);
  });

  it('rejects missing rows field', () => {
    expect(() => validateGridData({} as unknown)).toThrow(ValidationError);
  });

  it('rejects rows as non-array', () => {
    expect(() => validateGridData({ rows: 'not-an-array' } as unknown)).toThrow(ValidationError);
  });

  it('rejects empty rows array', () => {
    expect(() => validateGridData({ rows: [] })).toThrow(ValidationError);
  });
});

describe('validateGridData — row-level bounds', () => {
  it('rejects startMeasure < 1', () => {
    expect(() =>
      validateGridData({
        rows: [{ startMeasure: 0, endMeasure: 4, targetTempo: 100, steps: 3 }],
      }),
    ).toThrow(ValidationError);
  });

  it('rejects startMeasure > 99999', () => {
    expect(() =>
      validateGridData({
        rows: [{ startMeasure: 100000, endMeasure: 100001, targetTempo: 100, steps: 3 }],
      }),
    ).toThrow(ValidationError);
  });

  it('rejects endMeasure < startMeasure', () => {
    expect(() =>
      validateGridData({
        rows: [{ startMeasure: 10, endMeasure: 5, targetTempo: 100, steps: 3 }],
      }),
    ).toThrow(ValidationError);
  });

  it('rejects targetTempo > 999', () => {
    expect(() =>
      validateGridData({
        rows: [{ startMeasure: 1, endMeasure: 4, targetTempo: 1000, steps: 3 }],
      }),
    ).toThrow(ValidationError);
  });

  it('rejects steps > 50', () => {
    expect(() =>
      validateGridData({
        rows: [{ startMeasure: 1, endMeasure: 4, targetTempo: 100, steps: 51 }],
      }),
    ).toThrow(ValidationError);
  });

  it('rejects steps < 1', () => {
    expect(() =>
      validateGridData({
        rows: [{ startMeasure: 1, endMeasure: 4, targetTempo: 100, steps: 0 }],
      }),
    ).toThrow(ValidationError);
  });
});

describe('validateGridData — passageLabel', () => {
  it('accepts a row without passageLabel', () => {
    const result = validateGridData({
      rows: [{ startMeasure: 1, endMeasure: 4, targetTempo: 100, steps: 3 }],
    });
    expect(result.rows[0].passageLabel).toBeNull();
  });

  it('accepts a row with passageLabel', () => {
    const result = validateGridData({
      rows: [
        {
          passageLabel: 'Letter A',
          startMeasure: 1,
          endMeasure: 4,
          targetTempo: 100,
          steps: 3,
        },
      ],
    });
    expect(result.rows[0].passageLabel).toBe('Letter A');
  });

  it('rejects passageLabel > 200 chars', () => {
    expect(() =>
      validateGridData({
        rows: [
          {
            passageLabel: 'x'.repeat(201),
            startMeasure: 1,
            endMeasure: 4,
            targetTempo: 100,
            steps: 3,
          },
        ],
      }),
    ).toThrow(ValidationError);
  });
});
