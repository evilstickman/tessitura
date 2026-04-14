import { describe, it, expect } from 'vitest';
import { validateSessionInput, type SessionInput } from '@/models/session';
import { ValidationError } from '@/lib/errors';

function baseInput(overrides: Partial<SessionInput> = {}): SessionInput {
  return {
    sessionDate: '2026-04-01',
    durationMinutes: 30,
    ...overrides,
  };
}

describe('validateSessionInput — sessionDate', () => {
  it('accepts a valid YYYY-MM-DD string', () => {
    const result = validateSessionInput(baseInput({ sessionDate: '2026-04-01' }));
    expect(result.sessionDate).toBe('2026-04-01');
  });

  it('rejects a non-string sessionDate', () => {
    expect(() => validateSessionInput(baseInput({ sessionDate: 42 as unknown as string }))).toThrow(
      ValidationError,
    );
  });

  it('rejects missing sessionDate', () => {
    expect(() =>
      validateSessionInput({ durationMinutes: 30 } as unknown as SessionInput),
    ).toThrow(ValidationError);
  });

  it('rejects malformed sessionDate (wrong separators)', () => {
    expect(() => validateSessionInput(baseInput({ sessionDate: '2026/04/01' }))).toThrow(
      ValidationError,
    );
  });

  it('rejects malformed sessionDate (month/day out of range)', () => {
    expect(() => validateSessionInput(baseInput({ sessionDate: '2026-13-01' }))).toThrow(
      ValidationError,
    );
    expect(() => validateSessionInput(baseInput({ sessionDate: '2026-04-32' }))).toThrow(
      ValidationError,
    );
  });

  it('rejects malformed sessionDate (short zero-padding)', () => {
    expect(() => validateSessionInput(baseInput({ sessionDate: '2026-4-1' }))).toThrow(
      ValidationError,
    );
  });

  it('rejects a Date object (this is a calendar date — strings only)', () => {
    expect(() =>
      validateSessionInput(baseInput({ sessionDate: new Date('2026-04-01') as unknown as string })),
    ).toThrow(ValidationError);
  });
});

describe('validateSessionInput — durationMinutes', () => {
  it('accepts the lower bound (1)', () => {
    const result = validateSessionInput(baseInput({ durationMinutes: 1 }));
    expect(result.durationMinutes).toBe(1);
  });

  it('accepts the upper bound (1440 = 24h)', () => {
    const result = validateSessionInput(baseInput({ durationMinutes: 1440 }));
    expect(result.durationMinutes).toBe(1440);
  });

  it('rejects 0', () => {
    expect(() => validateSessionInput(baseInput({ durationMinutes: 0 }))).toThrow(ValidationError);
  });

  it('rejects negative', () => {
    expect(() => validateSessionInput(baseInput({ durationMinutes: -1 }))).toThrow(
      ValidationError,
    );
  });

  it('rejects > 1440', () => {
    expect(() => validateSessionInput(baseInput({ durationMinutes: 1441 }))).toThrow(
      ValidationError,
    );
  });

  it('rejects non-integer', () => {
    expect(() => validateSessionInput(baseInput({ durationMinutes: 30.5 }))).toThrow(
      ValidationError,
    );
  });

  it('rejects non-number', () => {
    expect(() =>
      validateSessionInput(baseInput({ durationMinutes: '30' as unknown as number })),
    ).toThrow(ValidationError);
  });
});

describe('validateSessionInput — notes', () => {
  it('normalizes missing notes to null', () => {
    expect(validateSessionInput(baseInput()).notes).toBeNull();
  });

  it('normalizes empty string to null', () => {
    expect(validateSessionInput(baseInput({ notes: '' })).notes).toBeNull();
  });

  it('normalizes whitespace-only to null', () => {
    expect(validateSessionInput(baseInput({ notes: '   ' })).notes).toBeNull();
  });

  it('trims surrounding whitespace', () => {
    expect(validateSessionInput(baseInput({ notes: '  foo  ' })).notes).toBe('foo');
  });

  it('accepts the upper-bound length (2000)', () => {
    const result = validateSessionInput(baseInput({ notes: 'x'.repeat(2000) }));
    expect(result.notes).toHaveLength(2000);
  });

  it('rejects > 2000 chars', () => {
    expect(() => validateSessionInput(baseInput({ notes: 'x'.repeat(2001) }))).toThrow(
      ValidationError,
    );
  });

  it('rejects non-string notes', () => {
    expect(() =>
      validateSessionInput(baseInput({ notes: 123 as unknown as string })),
    ).toThrow(ValidationError);
  });
});

describe('validateSessionInput — practiceGridId', () => {
  it('defaults to null when absent', () => {
    expect(validateSessionInput(baseInput()).practiceGridId).toBeNull();
  });

  it('normalizes explicit null to null', () => {
    expect(validateSessionInput(baseInput({ practiceGridId: null })).practiceGridId).toBeNull();
  });

  it('accepts a valid UUID', () => {
    const uuid = '00000000-0000-0000-0000-000000000001';
    expect(validateSessionInput(baseInput({ practiceGridId: uuid })).practiceGridId).toBe(uuid);
  });

  it('rejects a malformed UUID', () => {
    expect(() => validateSessionInput(baseInput({ practiceGridId: 'not-a-uuid' }))).toThrow(
      ValidationError,
    );
  });

  it('rejects a non-string practiceGridId', () => {
    expect(() =>
      validateSessionInput(baseInput({ practiceGridId: 42 as unknown as string })),
    ).toThrow(ValidationError);
  });
});
