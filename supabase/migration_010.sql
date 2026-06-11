-- ============================================================
-- Migration 010 — Waiter Confirmation + Printing Workflow
-- Foodie Lover POS
--
-- Run in Supabase SQL editor:
--   https://supabase.com/dashboard/project/<project>/sql/new
--
-- SAFE TO RE-RUN: All statements use IF NOT EXISTS / IF EXISTS guards.
--
-- WHAT THIS MIGRATION DOES
-- -------------------------------------------------------------
-- 1. Adds waiter-confirmation tracking columns to `orders`
--    (confirmed_by, confirmed_at, rejected_by, rejected_at).
--    `cancel_reason` (already exists) is reused for rejection reasons.
--
-- 2. Creates `print_jobs` — the queue consumed by the companion
--    print agent. Each row represents one ticket (KOT or receipt)
--    that needs to be printed on a physical printer.
--
-- 3. Does NOT modify `orders.status` CHECK constraints (there are
--    none — status is a free TEXT column), so the new statuses
--    used by the app ('awaiting_waiter' for ALL order types,
--    unchanged 'preparing'/'prepared'/etc.) require no DB change.
--
-- 4. Does NOT touch order_events, email_queue, order_issues, or any
--    reporting/analytics views — existing audit trail and reports
--    continue to work unchanged. New event types
--    (WaiterConfirmed / WaiterRejected / PrintQueued / Printed /
--    PrintFailed / Reprinted) are simply new rows in the existing
--    order_events table.
-- ============================================================

-- ── 1. orders: waiter confirmation / rejection tracking ─────────────────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS confirmed_by TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rejected_by  TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rejected_at  TIMESTAMPTZ;

-- ── 2. print_jobs: queue for the companion print agent ──────────────────────
CREATE TABLE IF NOT EXISTS print_jobs (
  id              TEXT        PRIMARY KEY,
  restaurant_id   TEXT        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  order_id        TEXT        NOT NULL REFERENCES orders(id)      ON DELETE CASCADE,
  job_type        TEXT        NOT NULL DEFAULT 'kot'
                              CHECK (job_type IN ('kot', 'receipt')),
  status          TEXT        NOT NULL DEFAULT 'queued'
                              CHECK (status IN ('queued', 'printing', 'printed', 'failed', 'cancelled')),
  printer_id      TEXT        DEFAULT 'default',     -- lets multi-station kitchens route tickets
  payload         JSONB       NOT NULL,              -- snapshot of order/items used to render the ticket
  attempts        INTEGER     NOT NULL DEFAULT 0,
  error           TEXT,
  requested_by    TEXT,                              -- waiter name who triggered confirm/reprint
  is_reprint      BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  printed_at      TIMESTAMPTZ
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
-- Print agent polls: "give me queued jobs for restaurant X, oldest first"
CREATE INDEX IF NOT EXISTS idx_print_jobs_queue
  ON print_jobs(restaurant_id, status, created_at)
  WHERE status IN ('queued', 'failed');

CREATE INDEX IF NOT EXISTS idx_print_jobs_order ON print_jobs(order_id);

-- ── RLS (matches pattern used by email_queue / order_issues in migration_008) ─
ALTER TABLE print_jobs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "all_access" ON print_jobs FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- Verification (run these SELECTs after applying):
-- ============================================================
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'orders' AND column_name IN
--   ('confirmed_by','confirmed_at','rejected_by','rejected_at');
--
-- SELECT * FROM print_jobs LIMIT 5;
-- ============================================================
-- END OF MIGRATION 010
-- ============================================================
