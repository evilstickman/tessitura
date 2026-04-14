import { describe, it, expect } from 'vitest';
import {
  validateGoalInput,
  validateGoalUpdate,
  type GoalInput,
  type GoalUpdateInput,
} from '@/models/goal';
import { ValidationError } from '@/lib/errors';

function baseInput(overrides: Partial<GoalInput> = {}): GoalInput {
  return {
    goalType: 'DAILY_MINUTES',
    targetValue: 30,
    ...overrides,
  };
}

describe('validateGoalInput — goalType', () => {
  it('accepts DAILY_MINUTES', () => {
    expect(validateGoalInput(baseInput({ goalType: 'DAILY_MINUTES' })).goalType).toBe(
      'DAILY_MINUTES',
    );
  });

  it('accepts WEEKLY_MINUTES', () => {
    expect(validateGoalInput(baseInput({ goalType: 'WEEKLY_MINUTES' })).goalType).toBe(
      'WEEKLY_MINUTES',
    );
  });

  it('accepts WEEKLY_SESSIONS', () => {
    expect(validateGoalInput(baseInput({ goalType: 'WEEKLY_SESSIONS' })).goalType).toBe(
      'WEEKLY_SESSIONS',
    );
  });

  it('accepts MONTHLY_GRIDS', () => {
    expect(validateGoalInput(baseInput({ goalType: 'MONTHLY_GRIDS' })).goalType).toBe(
      'MONTHLY_GRIDS',
    );
  });

  it('rejects unknown goalType', () => {
    expect(() => validateGoalInput(baseInput({ goalType: 'HOURLY' }))).toThrow(ValidationError);
  });

  it('rejects lowercase goalType', () => {
    expect(() => validateGoalInput(baseInput({ goalType: 'daily_minutes' }))).toThrow(
      ValidationError,
    );
  });

  it('rejects missing goalType', () => {
    expect(() => validateGoalInput({ targetValue: 30 } as unknown as GoalInput)).toThrow(
      ValidationError,
    );
  });

  it('rejects non-string goalType', () => {
    expect(() =>
      validateGoalInput(baseInput({ goalType: 123 as unknown as string })),
    ).toThrow(ValidationError);
  });
});

describe('validateGoalInput — targetValue', () => {
  it('accepts lower bound (1)', () => {
    expect(validateGoalInput(baseInput({ targetValue: 1 })).targetValue).toBe(1);
  });

  it('accepts upper bound (10000)', () => {
    expect(validateGoalInput(baseInput({ targetValue: 10000 })).targetValue).toBe(10000);
  });

  it('rejects 0', () => {
    expect(() => validateGoalInput(baseInput({ targetValue: 0 }))).toThrow(ValidationError);
  });

  it('rejects negative', () => {
    expect(() => validateGoalInput(baseInput({ targetValue: -1 }))).toThrow(ValidationError);
  });

  it('rejects > 10000', () => {
    expect(() => validateGoalInput(baseInput({ targetValue: 10001 }))).toThrow(ValidationError);
  });

  it('rejects non-integer', () => {
    expect(() => validateGoalInput(baseInput({ targetValue: 30.5 }))).toThrow(ValidationError);
  });

  it('rejects non-number', () => {
    expect(() =>
      validateGoalInput(baseInput({ targetValue: '30' as unknown as number })),
    ).toThrow(ValidationError);
  });
});

describe('validateGoalUpdate', () => {
  it('accepts targetValue-only update', () => {
    const result = validateGoalUpdate({ targetValue: 60 });
    expect(result.targetValue).toBe(60);
    expect(result.active).toBeUndefined();
  });

  it('accepts active-only update', () => {
    const result = validateGoalUpdate({ active: false });
    expect(result.active).toBe(false);
    expect(result.targetValue).toBeUndefined();
  });

  it('accepts both fields', () => {
    const result = validateGoalUpdate({ targetValue: 45, active: true });
    expect(result.targetValue).toBe(45);
    expect(result.active).toBe(true);
  });

  it('rejects goalType in body (immutable after create)', () => {
    expect(() =>
      validateGoalUpdate({ goalType: 'WEEKLY_MINUTES' } as unknown as GoalUpdateInput),
    ).toThrow(/goalType.*cannot be changed/i);
  });

  it('rejects invalid targetValue', () => {
    expect(() => validateGoalUpdate({ targetValue: 0 })).toThrow(ValidationError);
    expect(() => validateGoalUpdate({ targetValue: 10001 })).toThrow(ValidationError);
  });

  it('rejects non-boolean active', () => {
    expect(() =>
      validateGoalUpdate({ active: 'yes' as unknown as boolean }),
    ).toThrow(ValidationError);
  });

  it('accepts empty update object', () => {
    const result = validateGoalUpdate({});
    expect(result).toEqual({});
  });
});
