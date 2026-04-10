/**
 * Shared API response types and formatting helpers used by directors and
 * presentation components. Centralizes duplicated type definitions and
 * keeps the director/presentation boundary honest: both layers agree on
 * one shape for `FreshnessSummary`, one helper for row labels, etc.
 */

export interface FreshnessSummary {
  fresh: number;
  aging: number;
  stale: number;
  decayed: number;
  incomplete: number;
}

/**
 * Renders a row's display label from its piece + passage label fields.
 * - Both present → "Title — PassageLabel"
 * - Piece only → "Title"
 * - Passage label only → "PassageLabel"
 * - Neither → "Untitled"
 */
export function getRowLabel(
  piece: { title: string } | null,
  passageLabel: string | null,
): string {
  if (piece && passageLabel) return `${piece.title} — ${passageLabel}`;
  if (piece) return piece.title;
  if (passageLabel) return passageLabel;
  return 'Untitled';
}
