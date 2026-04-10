import { describe, it, expect } from 'vitest';
import { dateOnlyUTC } from '@/models/cell';
import { calculateFreshnessState } from '@/lib/freshness';

describe('Clock consistency — dateOnlyUTC', () => {
  it('truncates time portion, preserving UTC date', () => {
    const now = new Date('2026-03-18T23:59:59.999Z');
    const result = dateOnlyUTC(now);
    expect(result.toISOString()).toBe('2026-03-18T00:00:00.000Z');
  });

  it('derives from the passed-in now, not the system clock', () => {
    // Pass a date far in the future — if it called new Date() internally,
    // the result would be "today" instead.
    const future = new Date('2030-12-25T15:30:00Z');
    const result = dateOnlyUTC(future);
    expect(result.toISOString()).toBe('2030-12-25T00:00:00.000Z');
  });

  it('handles midnight exactly', () => {
    const midnight = new Date('2026-06-01T00:00:00.000Z');
    const result = dateOnlyUTC(midnight);
    expect(result.toISOString()).toBe('2026-06-01T00:00:00.000Z');
  });
});

describe('Clock consistency — single now through complete flow', () => {
  it('completionDate and freshnessState agree on the same now value', () => {
    // Scenario: completion was recorded at 2026-03-17T00:00:00Z with interval=2.
    // If now = 2026-03-18T23:59:59Z (late on the 18th):
    //   dateOnlyUTC(now) = 2026-03-18 (the completion date that would be stored)
    //   calculateFreshnessState(completionDate=2026-03-17, interval=2, now) should be "fresh"
    //   because daysSince = floor((18T23:59:59 - 17T00:00:00) / 86400000) = 1, and 1 <= 2*0.5 = 1 → fresh
    //
    // But if a DIFFERENT clock sampled a few seconds later (2026-03-19T00:00:01Z):
    //   dateOnlyUTC(differentNow) = 2026-03-19 (different completion date!)
    //   calculateFreshnessState(completionDate=2026-03-17, interval=2, differentNow) would be "aging"
    //   because daysSince = 2, and 2 > 1 but <= 2 → aging
    //
    // This proves that using the same now for both operations prevents boundary inconsistency.

    const now = new Date('2026-03-18T23:59:59.000Z');
    const priorCompletion = new Date('2026-03-17T00:00:00.000Z');
    const interval = 2;

    const todayDate = dateOnlyUTC(now);
    const state = calculateFreshnessState(priorCompletion, interval, now);

    // Both derived from the same now
    expect(todayDate.toISOString()).toBe('2026-03-18T00:00:00.000Z');
    expect(state).toBe('fresh');

    // With a different now (just past midnight), the result would change
    const differentNow = new Date('2026-03-19T00:00:01.000Z');
    const differentDate = dateOnlyUTC(differentNow);
    const differentState = calculateFreshnessState(priorCompletion, interval, differentNow);

    expect(differentDate.toISOString()).toBe('2026-03-19T00:00:00.000Z');
    expect(differentState).toBe('aging');

    // This is exactly the inconsistency that threading a single `now` prevents:
    // without it, todayDate could come from one clock and state from another.
  });
});
