-- ============================================================
-- Migration 009 — waiter_calls: add acknowledgment columns
-- Foodie Lover POS
--
-- Run in Supabase SQL editor:
--   https://supabase.com/dashboard/project/<project>/sql/new
--
-- SAFE TO RE-RUN: All statements use ADD COLUMN IF NOT EXISTS.
--
-- WHY THIS EXISTS:
--   migration_008.sql contains a comprehensive audit of many tables.
--   This migration is a targeted subset that adds ONLY the three
--   acknowledgment columns to waiter_calls so the waiter portal
--   works correctly without requiring the full migration_008 run.
--
-- If you have already run migration_008.sql, this is a no-op.
-- ============================================================

-- Add acknowledgment tracking columns to waiter_calls
ALTER TABLE waiter_calls
  ADD COLUMN IF NOT EXISTS acknowledged    BOOLEAN     NOT NULL DEFAULT FALSE;

ALTER TABLE waiter_calls
  ADD COLUMN IF NOT EXISTS acknowledged_by TEXT;

ALTER TABLE waiter_calls
  ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ;

-- Back-fill: treat all existing calls as unacknowledged (already the DEFAULT,
-- but explicit for clarity in case any rows have NULL from an earlier partial run).
UPDATE waiter_calls
SET acknowledged = FALSE
WHERE acknowledged IS NULL;

-- Index for fast pending-call lookup used by the waiter portal
CREATE INDEX IF NOT EXISTS idx_waiter_calls_pending
  ON waiter_calls(restaurant_id, called_at DESC)
  WHERE acknowledged = FALSE;

-- ============================================================
-- Verification (run these SELECTs after applying):
-- ============================================================
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name   = 'waiter_calls'
-- ORDER BY ordinal_position;
-- ============================================================
-- END OF MIGRATION 009
-- ============================================================
