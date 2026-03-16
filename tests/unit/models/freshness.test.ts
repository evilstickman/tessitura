import { describe, it, expect } from 'vitest';
import {
  calculateFreshnessState,
  calculateNewInterval,
  isShielded,
  effectiveFreshnessState,
  type FreshnessState,
  type CellWithState,
} from '@/models/freshness';

// ─── calculateFreshnessState ─────────────────────────────────────────────────

describe('calculateFreshnessState', () => {
  const now = new Date('2026-03-16T12:00:00Z');

  it('returns incomplete when lastCompletionDate is null', () => {
    expect(calculateFreshnessState(null, 1, now)).toBe('incomplete');
  });

  it('returns fresh when daysSince = 0 (completed today)', () => {
    const today = new Date('2026-03-16T00:00:00Z');
    expect(calculateFreshnessState(today, 4, now)).toBe('fresh');
  });

  it('returns fresh at exactly 50% of interval', () => {
    const twoAgo = new Date('2026-03-14T00:00:00Z');
    expect(calculateFreshnessState(twoAgo, 4, now)).toBe('fresh');
  });

  it('returns aging just past 50% of interval', () => {
    const threeAgo = new Date('2026-03-13T00:00:00Z');
    expect(calculateFreshnessState(threeAgo, 4, now)).toBe('aging');
  });

  it('returns aging at exactly 100% of interval', () => {
    const fourAgo = new Date('2026-03-12T00:00:00Z');
    expect(calculateFreshnessState(fourAgo, 4, now)).toBe('aging');
  });

  it('returns stale just past 100% of interval', () => {
    const fiveAgo = new Date('2026-03-11T00:00:00Z');
    expect(calculateFreshnessState(fiveAgo, 4, now)).toBe('stale');
  });

  it('returns stale at exactly 200% of interval', () => {
    const eightAgo = new Date('2026-03-08T00:00:00Z');
    expect(calculateFreshnessState(eightAgo, 4, now)).toBe('stale');
  });

  it('returns decayed past 200% of interval', () => {
    const nineAgo = new Date('2026-03-07T00:00:00Z');
    expect(calculateFreshnessState(nineAgo, 4, now)).toBe('decayed');
  });

  it('handles interval=1 boundaries correctly', () => {
    const today = new Date('2026-03-16T00:00:00Z');
    const yesterday = new Date('2026-03-15T00:00:00Z');
    const twoDaysAgo = new Date('2026-03-14T00:00:00Z');
    const threeDaysAgo = new Date('2026-03-13T00:00:00Z');

    expect(calculateFreshnessState(today, 1, now)).toBe('fresh');
    expect(calculateFreshnessState(yesterday, 1, now)).toBe('aging');
    expect(calculateFreshnessState(twoDaysAgo, 1, now)).toBe('stale');
    expect(calculateFreshnessState(threeDaysAgo, 1, now)).toBe('decayed');
  });

  it('uses floor for daysSince (partial days dont count)', () => {
    const midnightToday = new Date('2026-03-16T00:00:00Z');
    expect(calculateFreshnessState(midnightToday, 1, now)).toBe('fresh');
  });
});

// ─── calculateNewInterval ────────────────────────────────────────────────────

describe('calculateNewInterval', () => {
  it('returns 1 for incomplete (first completion)', () => {
    expect(calculateNewInterval(1, 'incomplete')).toBe(1);
  });

  it('returns 1 for incomplete even when currentInterval > 1 (post-reset scenario)', () => {
    expect(calculateNewInterval(8, 'incomplete')).toBe(1);
  });

  it('doubles interval when fresh', () => {
    expect(calculateNewInterval(1, 'fresh')).toBe(2);
    expect(calculateNewInterval(2, 'fresh')).toBe(4);
    expect(calculateNewInterval(4, 'fresh')).toBe(8);
  });

  it('doubles interval when aging', () => {
    expect(calculateNewInterval(4, 'aging')).toBe(8);
    expect(calculateNewInterval(8, 'aging')).toBe(16);
  });

  it('caps interval at 30', () => {
    expect(calculateNewInterval(16, 'fresh')).toBe(30);
    expect(calculateNewInterval(30, 'fresh')).toBe(30);
    expect(calculateNewInterval(20, 'aging')).toBe(30);
  });

  it('resets to 1 when stale', () => {
    expect(calculateNewInterval(8, 'stale')).toBe(1);
    expect(calculateNewInterval(30, 'stale')).toBe(1);
  });

  it('resets to 1 when decayed', () => {
    expect(calculateNewInterval(4, 'decayed')).toBe(1);
    expect(calculateNewInterval(30, 'decayed')).toBe(1);
  });

  it('full progression: 1->2->4->8->16->30->30', () => {
    let interval = 1;
    const expected = [2, 4, 8, 16, 30, 30];
    for (const exp of expected) {
      interval = calculateNewInterval(interval, 'fresh');
      expect(interval).toBe(exp);
    }
  });
});

// ─── isShielded ──────────────────────────────────────────────────────────────

function makeCell(rawState: FreshnessState, hasCompletions: boolean): CellWithState {
  return { rawState, hasCompletions };
}

describe('isShielded', () => {
  it('returns false when fade is disabled', () => {
    const cells = [
      makeCell('fresh', true),
      makeCell('fresh', true),
    ];
    expect(isShielded(0, cells, false)).toBe(false);
  });

  it('returns false for the highest completed cell (no higher neighbor)', () => {
    const cells = [
      makeCell('fresh', true),
      makeCell('aging', true),
    ];
    expect(isShielded(1, cells, true)).toBe(false);
  });

  it('returns true when next higher completed cell is not decayed', () => {
    const cells = [
      makeCell('fresh', true),
      makeCell('stale', true),
    ];
    expect(isShielded(0, cells, true)).toBe(true);
  });

  it('returns false when next higher completed cell is decayed', () => {
    const cells = [
      makeCell('aging', true),
      makeCell('decayed', true),
    ];
    expect(isShielded(0, cells, true)).toBe(false);
  });

  it('skips incomplete cells when finding higher neighbor', () => {
    const cells = [
      makeCell('fresh', true),
      makeCell('incomplete', false),
      makeCell('stale', true),
    ];
    expect(isShielded(0, cells, true)).toBe(true);
  });

  it('returns false for incomplete cell (never shielded)', () => {
    const cells = [
      makeCell('incomplete', false),
      makeCell('fresh', true),
    ];
    expect(isShielded(0, cells, true)).toBe(false);
  });

  it('handles chain of 3 completed cells', () => {
    const cells = [
      makeCell('fresh', true),
      makeCell('aging', true),
      makeCell('stale', true),
    ];
    expect(isShielded(0, cells, true)).toBe(true);
    expect(isShielded(1, cells, true)).toBe(true);
    expect(isShielded(2, cells, true)).toBe(false);
  });

  it('chain breaks when a cell decays', () => {
    const cells = [
      makeCell('fresh', true),
      makeCell('stale', true),
      makeCell('decayed', true),
    ];
    expect(isShielded(0, cells, true)).toBe(true);
    expect(isShielded(1, cells, true)).toBe(false);
    expect(isShielded(2, cells, true)).toBe(false);
  });

  it('single cell row — never shielded', () => {
    const cells = [makeCell('fresh', true)];
    expect(isShielded(0, cells, true)).toBe(false);
  });

  it('gap scenario: completed 0, incomplete 1+2, completed 3', () => {
    const cells = [
      makeCell('aging', true),
      makeCell('incomplete', false),
      makeCell('incomplete', false),
      makeCell('stale', true),
    ];
    expect(isShielded(0, cells, true)).toBe(true);
    expect(isShielded(3, cells, true)).toBe(false);
  });
});

// ─── effectiveFreshnessState ─────────────────────────────────────────────────

describe('effectiveFreshnessState', () => {
  it('returns incomplete regardless of fade/shielding', () => {
    expect(effectiveFreshnessState('incomplete', false, true)).toBe('incomplete');
    expect(effectiveFreshnessState('incomplete', true, true)).toBe('incomplete');
    expect(effectiveFreshnessState('incomplete', false, false)).toBe('incomplete');
  });

  it('returns fresh when fade is disabled (permanent green)', () => {
    expect(effectiveFreshnessState('aging', false, false)).toBe('fresh');
    expect(effectiveFreshnessState('stale', false, false)).toBe('fresh');
    expect(effectiveFreshnessState('decayed', false, false)).toBe('fresh');
    expect(effectiveFreshnessState('fresh', false, false)).toBe('fresh');
  });

  it('returns fresh when shielded', () => {
    expect(effectiveFreshnessState('stale', true, true)).toBe('fresh');
    expect(effectiveFreshnessState('aging', true, true)).toBe('fresh');
    expect(effectiveFreshnessState('decayed', true, true)).toBe('fresh');
  });

  it('returns raw state when fade enabled and not shielded', () => {
    expect(effectiveFreshnessState('fresh', false, true)).toBe('fresh');
    expect(effectiveFreshnessState('aging', false, true)).toBe('aging');
    expect(effectiveFreshnessState('stale', false, true)).toBe('stale');
    expect(effectiveFreshnessState('decayed', false, true)).toBe('decayed');
  });
});
