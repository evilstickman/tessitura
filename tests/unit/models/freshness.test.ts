import { describe, it, expect } from 'vitest';
import {
  calculateFreshnessState,
  calculateNewInterval,
  type FreshnessState,
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
