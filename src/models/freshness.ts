/**
 * Pure freshness calculation functions.
 * No database access — every function accepts a `now` parameter for testability.
 *
 * Design doc: docs/plans/2026-03-16-m1.5-cell-completion-freshness-design.md
 */

export type FreshnessState = 'incomplete' | 'fresh' | 'aging' | 'stale' | 'decayed';

const MS_PER_DAY = 86_400_000;
const MAX_INTERVAL = 30;

export function calculateFreshnessState(
  lastCompletionDate: Date | null,
  intervalDays: number,
  now: Date,
): FreshnessState {
  if (lastCompletionDate === null) return 'incomplete';

  const daysSince = Math.floor((now.getTime() - lastCompletionDate.getTime()) / MS_PER_DAY);

  if (daysSince <= intervalDays * 0.5) return 'fresh';
  if (daysSince <= intervalDays) return 'aging';
  if (daysSince <= intervalDays * 2) return 'stale';
  return 'decayed';
}

export function calculateNewInterval(
  currentInterval: number,
  rawState: FreshnessState,
): number {
  switch (rawState) {
    case 'incomplete':
      return 1;
    case 'fresh':
    case 'aging':
      return Math.min(currentInterval * 2, MAX_INTERVAL);
    case 'stale':
    case 'decayed':
      return 1;
  }
}

// ─── Task 3: Shielding + Effective State ────────────────────────────────────

export interface CellWithState {
  rawState: FreshnessState;
  hasCompletions: boolean;
}

export function isShielded(
  cellIndex: number,
  cells: CellWithState[],
  fadeEnabled: boolean,
): boolean {
  if (!fadeEnabled) return false;

  const cell = cells[cellIndex];
  if (!cell.hasCompletions) return false;

  // Find next higher completed cell (skip incomplete cells)
  for (let i = cellIndex + 1; i < cells.length; i++) {
    if (cells[i].hasCompletions) {
      return cells[i].rawState !== 'decayed';
    }
  }

  // No higher completed cell — this is the highest, fades first
  return false;
}

export function effectiveFreshnessState(
  rawState: FreshnessState,
  isShieldedFlag: boolean,
  fadeEnabled: boolean,
): FreshnessState {
  if (rawState === 'incomplete') return 'incomplete';
  if (!fadeEnabled) return 'fresh';
  if (isShieldedFlag) return 'fresh';
  return rawState;
}
