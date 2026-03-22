-- ============================================================
-- Migration 006 — Order Issues ("Not Received" workflow)
-- Run in Supabase SQL editor:
--   https://supabase.com/dashboard/project/<project>/sql/new
-- ============================================================

-- ─── order_issues ────────────────────────────────────────────────────────────
-- Tracks every "not received" report from customers.
-- Referenced by all portals: waiter, delivery, manager, admin.
--
-- Lifecycle:
--   open → reserving (waiter/delivery starts re-service)
--        → resolved  (customer confirmed after re-service)
--        → escalated (retry_count >= MAX_RETRIES → manager notified)

CREATE TABLE IF NOT EXISTS order_issues (
  id             TEXT        PRIMARY KEY,
  order_id       TEXT        NOT NULL REFERENCES orders(id)      ON DELETE CASCADE,
  restaurant_id  TEXT        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  issue_type     TEXT        NOT NULL DEFAULT 'not_received',   -- 'not_received' | 'wrong_item' | 'quality'
  status         TEXT        NOT NULL DEFAULT 'open',           -- 'open' | 'reserving' | 'resolved' | 'escalated'
  retry_count    INTEGER     NOT NULL DEFAULT 1,                -- increments on each "not received" report
  reported_by    TEXT,                                          -- customer name
  reported_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_by    TEXT,
  resolved_at    TIMESTAMPTZ,
  escalated      BOOLEAN     NOT NULL DEFAULT FALSE,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_issues_order   ON order_issues(order_id);
CREATE INDEX IF NOT EXISTS idx_order_issues_rest    ON order_issues(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_order_issues_status  ON order_issues(status);
CREATE INDEX IF NOT EXISTS idx_order_issues_open    ON order_issues(restaurant_id, status) WHERE status IN ('open','reserving','escalated');

ALTER TABLE order_issues ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "all_access" ON order_issues FOR ALL USING (true) WITH CHECK (true);
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── orders: add issue_count column ──────────────────────────────────────────
-- Denormalised counter so portals can show "⚠️ 2 issues" without joining.
-- The API keeps this in sync with order_issues.retry_count.

DO $$ BEGIN
  ALTER TABLE orders ADD COLUMN issue_count INTEGER NOT NULL DEFAULT 0;
  EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ─── Note on order.status = 're_serve_required' ──────────────────────────────
-- The orders.status column has no CHECK constraint, so 're_serve_required'
-- is a valid status value without any ALTER TABLE.
-- New status lifecycle for dine-in / pickup:
--   awaiting_waiter → pending → preparing → prepared → served
--   → re_serve_required   (customer clicked "Not received")
--   → served              (waiter/staff re-served)
--   → completed           (customer confirmed received)
-- For delivery:
--   out_for_delivery → delivered
--   → re_serve_required   (customer clicked "Not received" on tracker)
--   → out_for_delivery    (delivery person re-dispatched)
--   → delivered
--   → completed           (customer confirmed)
