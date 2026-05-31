// ─── Foodie Lover — Display formatting utilities ────────────────────────────
// Shared across client and server (no imports required).

/**
 * formatTableName — converts any raw table identifier into a human-readable
 * "Table N" string.
 *
 * Supported input formats:
 *   tbl_1  / tbl_01  / tbl_15    → "Table 1"  / "Table 1"  / "Table 15"
 *   T1     / T01     / T4        → "Table 1"  / "Table 1"  / "Table 4"
 *   table_1 / table-1            → "Table 1"
 *   "1"    / "12"                → "Table 1"  / "Table 12"
 *   "Table 4" (already formatted) → "Table 4"  (passthrough)
 *
 * Returns empty string for null / undefined / empty input.
 */
export function formatTableName(tableId: string | null | undefined): string {
  if (!tableId) return '';
  const id = String(tableId).trim();
  if (!id) return '';

  // Already formatted — "Table 4", "Table 12", etc.
  if (/^[Tt]able\s+\d+$/.test(id)) {
    const n = id.replace(/^[Tt]able\s+/, '');
    return `Table ${parseInt(n, 10)}`;
  }

  // tbl_1, tbl_01, tbl_001, tbl-1, tbl-01
  const tblMatch = id.match(/^tbl[_-]?0*(\d+)$/i);
  if (tblMatch) return `Table ${parseInt(tblMatch[1], 10)}`;

  // T1, T01, T004 (capital T followed by digits)
  const tMatch = id.match(/^T0*(\d+)$/);
  if (tMatch) return `Table ${parseInt(tMatch[1], 10)}`;

  // table_1, table-1, table1
  const tableWordMatch = id.match(/^[Tt]able[_-]?0*(\d+)$/);
  if (tableWordMatch) return `Table ${parseInt(tableWordMatch[1], 10)}`;

  // Pure integer string "1", "12"
  if (/^\d+$/.test(id)) return `Table ${parseInt(id, 10)}`;

  // Fallback: clean underscores, capitalize — e.g. "outdoor_1" → "Outdoor 1"
  return id.replace(/_/g, ' ').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * formatTableNameForSpeech — returns a string safe for Web Speech API.
 *
 * "tbl_1" → "Table 1"   (no underscores, no raw IDs)
 * null     → "counter"  (fallback for no table context)
 */
export function formatTableNameForSpeech(tableId: string | null | undefined, fallback = 'the counter'): string {
  if (!tableId) return fallback;
  const formatted = formatTableName(tableId);
  // If we still have underscores (edge case), replace them with spaces
  return formatted.replace(/_/g, ' ');
}
