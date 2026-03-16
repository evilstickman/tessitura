import { describe, it, expect } from 'vitest';
import { generateCellPercentages, validateRowInput, validateRowUpdate } from '@/models/row';
import { ValidationError } from '@/lib/errors';

describe('Row Model — generateCellPercentages', () => {
  it('1 step returns [1.0]', () => {
    expect(generateCellPercentages(1)).toEqual([1.0]);
  });

  it('2 steps returns [0.4, 1.0]', () => {
    expect(generateCellPercentages(2)).toEqual([0.4, 1.0]);
  });

  it('3 steps returns [0.4, 0.7, 1.0]', () => {
    expect(generateCellPercentages(3)).toEqual([0.4, 0.7, 1.0]);
  });

  it('4 steps returns [0.4, 0.6, 0.8, 1.0]', () => {
    expect(generateCellPercentages(4)).toEqual([0.4, 0.6, 0.8, 1.0]);
  });

  it('5 steps returns [0.4, 0.55, 0.7, 0.85, 1.0]', () => {
    expect(generateCellPercentages(5)).toEqual([0.4, 0.55, 0.7, 0.85, 1.0]);
  });

  it('10 steps — first is 0.4, last is 1.0, monotonically increasing', () => {
    const result = generateCellPercentages(10);
    expect(result).toHaveLength(10);
    expect(result[0]).toBe(0.4);
    expect(result[9]).toBe(1.0);
    for (let i = 1; i < result.length; i++) {
      expect(result[i]).toBeGreaterThan(result[i - 1]);
    }
  });

  it('avoids floating-point noise (no values like 0.6000000000000001)', () => {
    const result = generateCellPercentages(4);
    // 0.4 + (0.6 * 1/3) would be 0.6000000000000001 without rounding
    expect(result[1]).toBe(0.6);
    expect(String(result[1])).toBe('0.6');
  });
});

describe('Row Model — validateRowInput', () => {
  const validInput = {
    startMeasure: 1,
    endMeasure: 32,
    targetTempo: 144,
    steps: 5,
  };

  it('returns normalized data for valid input', () => {
    const result = validateRowInput(validInput);
    expect(result.startMeasure).toBe(1);
    expect(result.endMeasure).toBe(32);
    expect(result.targetTempo).toBe(144);
    expect(result.steps).toBe(5);
    expect(result.passageLabel).toBeNull();
    expect(result.pieceId).toBeNull();
  });

  it('throws when startMeasure is missing', () => {
    expect(() => validateRowInput({ ...validInput, startMeasure: undefined as unknown as number }))
      .toThrow(ValidationError);
  });

  it('throws when startMeasure is zero', () => {
    expect(() => validateRowInput({ ...validInput, startMeasure: 0 })).toThrow(ValidationError);
  });

  it('throws when startMeasure is negative', () => {
    expect(() => validateRowInput({ ...validInput, startMeasure: -1 })).toThrow(ValidationError);
  });

  it('throws when endMeasure < startMeasure', () => {
    expect(() => validateRowInput({ ...validInput, startMeasure: 10, endMeasure: 5 }))
      .toThrow(ValidationError);
  });

  it('allows endMeasure === startMeasure', () => {
    const result = validateRowInput({ ...validInput, startMeasure: 5, endMeasure: 5 });
    expect(result.startMeasure).toBe(5);
  });

  it('throws when targetTempo is zero', () => {
    expect(() => validateRowInput({ ...validInput, targetTempo: 0 })).toThrow(ValidationError);
  });

  it('throws when targetTempo is negative', () => {
    expect(() => validateRowInput({ ...validInput, targetTempo: -120 })).toThrow(ValidationError);
  });

  it('throws when steps is zero', () => {
    expect(() => validateRowInput({ ...validInput, steps: 0 })).toThrow(ValidationError);
  });

  it('throws when steps is negative', () => {
    expect(() => validateRowInput({ ...validInput, steps: -1 })).toThrow(ValidationError);
  });

  it('accepts optional passageLabel', () => {
    const result = validateRowInput({ ...validInput, passageLabel: '  Letter C  ' });
    expect(result.passageLabel).toBe('Letter C');
  });

  it('throws when passageLabel exceeds 200 chars', () => {
    expect(() => validateRowInput({ ...validInput, passageLabel: 'a'.repeat(201) }))
      .toThrow(ValidationError);
  });

  it('normalizes whitespace-only passageLabel to null', () => {
    const result = validateRowInput({ ...validInput, passageLabel: '   ' });
    expect(result.passageLabel).toBeNull();
  });

  it('throws when startMeasure is not an integer', () => {
    expect(() => validateRowInput({ ...validInput, startMeasure: 1.5 })).toThrow(ValidationError);
  });

  it('throws when steps is not an integer', () => {
    expect(() => validateRowInput({ ...validInput, steps: 2.5 })).toThrow(ValidationError);
  });
});

describe('Row Model — validateRowUpdate', () => {
  it('returns only provided fields', () => {
    const result = validateRowUpdate({ targetTempo: 160 });
    expect(result).toEqual({ targetTempo: 160 });
  });

  it('returns empty object when no fields provided', () => {
    const result = validateRowUpdate({});
    expect(result).toEqual({});
  });

  it('validates targetTempo when provided', () => {
    expect(() => validateRowUpdate({ targetTempo: 0 })).toThrow(ValidationError);
  });

  it('validates steps when provided', () => {
    expect(() => validateRowUpdate({ steps: -1 })).toThrow(ValidationError);
  });

  it('allows pieceId as null', () => {
    const result = validateRowUpdate({ pieceId: null });
    expect(result).toEqual({ pieceId: null });
  });
});
