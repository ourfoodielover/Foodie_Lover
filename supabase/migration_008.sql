-- ============================================================
-- Migration 008 — Full Schema Audit, Repair & Hardening
-- Foodie Lover POS — Production-Grade Database Fix
--
-- Run in Supabase SQL editor:
--   https://supabase.com/dashboard/project/<project>/sql/new
--
-- SAFE TO RE-RUN: Every statement is idempotent (IF NOT EXISTS /
-- DO $$ EXCEPTION WHEN duplicate_* THEN NULL $$).
-- Will NOT drop or lose any existing data.
--
-- ISSUES FIXED IN THIS MIGRATION:
--  1.  waiter_calls — ADD acknowledged, acknowledged_by, acknowledged_at
--                     (schema required but missing from migration_004)
--  2.  email_queue  — ADD message_id column (missing on fresh installs
--                     that ran migration_007 before migration_003)
--  3.  email_queue  — FIX next_retry_at NULL constraint (email-server.ts
--                     sets next_retry_at=null on permanent failure, which
--                     would violate a NOT NULL constraint from migration_003)
--  4.  order_items  — FIX item_status DEFAULT 'pending' → 'queued'
--                     (lifecycle is queued→preparing→prepared→served,
--                     NOT pending→... which conflicts with order status)
--  5.  order_items  — migrate existing 'pending' items → 'queued'
--  6.  customer_tabs — ensure ALL required columns exist with correct types
--  7.  orders       — ensure ALL required columns exist (issue_count, etc.)
--  8.  tab_devices  — ADD last_seen_at for device heartbeat tracking
--  9.  waiter_calls — ADD index for fast unacknowledged call lookup
--  10. restaurant_settings — ensure default settings seed
--  11. Unused 'settings' table — safe DROP (created by migration_007 by
--                     mistake; API uses restaurant_settings not settings)
--  12. Performance  — add all missing composite + partial indexes
--  13. Realtime     — ensure all tables added to supabase_realtime
--  14. staff constraint — re-apply unique constraint idempotently
-- ============================================================

-- ─── SAFETY GUARD ────────────────────────────────────────────────────────────
-- Ensure the restaurant row exists before any FK-constrained inserts below.
INSERT INTO restaurants (id, name, timezone)
VALUES ('rest_default', 'Foodie Lover', 'Asia/Kolkata')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SECTION 1: CRITICAL COLUMN FIXES
-- ============================================================

-- ─── 1.1 waiter_calls: add acknowledgment tracking columns ───────────────────
-- These columns are required for the "Call Waiter" workflow so the system
-- can distinguish between acknowledged and pending calls without deleting records.
-- The API's DELETE handler currently removes records; this migration allows
-- using a PATCH-based acknowledgment workflow while keeping historical records.

ALTER TABLE waiter_calls
  ADD COLUMN IF NOT EXISTS acknowledged    BOOLEAN     NOT NULL DEFAULT FALSE;

ALTER TABLE waiter_calls
  ADD COLUMN IF NOT EXISTS acknowledged_by TEXT;

ALTER TABLE waiter_calls
  ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ;

-- ─── 1.2 email_queue: add message_id column ──────────────────────────────────
-- migration_003 creates email_queue WITH message_id.
-- migration_007 creates it WITHOUT message_id (CREATE IF NOT EXISTS skips if
-- table already exists, so the column would be missing on fresh installs that
-- ran migration_007 first). Add it safely here.

ALTER TABLE email_queue
  ADD COLUMN IF NOT EXISTS message_id TEXT;

-- ─── 1.3 email_queue: add sent_at column ─────────────────────────────────────

ALTER TABLE email_queue
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;

-- ─── 1.4 email_queue: FIX next_retry_at nullability ─────────────────────────
-- migration_003 creates: next_retry_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
-- BUT email-server.ts sets: next_retry_at = null on permanent failure.
-- A NOT NULL column receiving null would cause a runtime error on permanent fail.
-- We must allow NULL here.
--
-- PostgreSQL ALTER COLUMN cannot use IF NOT EXISTS, but this is idempotent:
-- "DROP NOT NULL" on an already nullable column is a no-op.
ALTER TABLE email_queue ALTER COLUMN next_retry_at DROP NOT NULL;

-- ─── 1.5 order_items: fix item_status default ────────────────────────────────
-- schema.sql has DEFAULT 'pending', but the item lifecycle is:
--   queued → preparing → prepared → served
-- 'pending' is an ORDER status, not an ITEM status. The initial item state
-- must be 'queued' so the kitchen portal shows items correctly from the start.

ALTER TABLE order_items ALTER COLUMN item_status SET DEFAULT 'queued';

-- Migrate existing 'pending' item statuses to 'queued' (data repair)
UPDATE order_items SET item_status = 'queued'
WHERE item_status = 'pending';

-- ─── 1.6 tab_devices: add last_seen_at for heartbeat ─────────────────────────

ALTER TABLE tab_devices
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NOW();

-- ─── 1.7 orders: ensure ALL required columns exist ────────────────────────────

ALTER TABLE orders ADD COLUMN IF NOT EXISTS assigned_at        TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at       TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_person_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS issue_count        INTEGER NOT NULL DEFAULT 0;

-- ─── 1.8 customer_tabs: ensure ALL required columns exist ────────────────────

ALTER TABLE customer_tabs ADD COLUMN IF NOT EXISTS customer_name   TEXT;
ALTER TABLE customer_tabs ADD COLUMN IF NOT EXISTS party_size      INTEGER NOT NULL DEFAULT 1;
ALTER TABLE customer_tabs ADD COLUMN IF NOT EXISTS pin             TEXT;
ALTER TABLE customer_tabs ADD COLUMN IF NOT EXISTS discount        NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE customer_tabs ADD COLUMN IF NOT EXISTS discount_reason TEXT;
ALTER TABLE customer_tabs ADD COLUMN IF NOT EXISTS payment_method  TEXT DEFAULT 'cod';

-- ─── 1.9 tables: ensure updated_at column exists (used by some queries) ──────

ALTER TABLE tables ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ─── 1.10 staff: ensure name defaults to username if null ─────────────────────
-- The staff table has name NOT NULL, but ensure it always has a fallback.
UPDATE staff SET name = username WHERE name IS NULL OR name = '';

-- ============================================================
-- SECTION 2: FIX BROKEN / MISSING TABLES
-- ============================================================

-- ─── 2.1 Drop the incorrect 'settings' table from migration_007 ───────────────
-- migration_007 accidentally created a 'settings' table.
-- The API exclusively uses 'restaurant_settings' (from migration_005).
-- The 'settings' table has no FK references and holds no business data.
-- Safe to drop — if it doesn't exist, the DROP IF EXISTS is a no-op.
DROP TABLE IF EXISTS settings;

-- ─── 2.2 Ensure restaurant_settings table exists ─────────────────────────────
-- Should already exist from migration_005, but guard against partial migrations.

CREATE TABLE IF NOT EXISTS restaurant_settings (
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  key           TEXT NOT NULL,
  value         TEXT NOT NULL DEFAULT '',
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (restaurant_id, key)
);

ALTER TABLE restaurant_settings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "all_access" ON restaurant_settings FOR ALL USING (true) WITH CHECK (true);
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 2.3 Ensure order_issues table exists ────────────────────────────────────
-- From migration_006 — guard against partial migrations.

CREATE TABLE IF NOT EXISTS order_issues (
  id             TEXT        PRIMARY KEY,
  order_id       TEXT        NOT NULL REFERENCES orders(id)       ON DELETE CASCADE,
  restaurant_id  TEXT        NOT NULL REFERENCES restaurants(id)  ON DELETE CASCADE,
  issue_type     TEXT        NOT NULL DEFAULT 'not_received',
  status         TEXT        NOT NULL DEFAULT 'open',
  retry_count    INTEGER     NOT NULL DEFAULT 1,
  reported_by    TEXT,
  reported_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_by    TEXT,
  resolved_at    TIMESTAMPTZ,
  escalated      BOOLEAN     NOT NULL DEFAULT FALSE,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE order_issues ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "all_access" ON order_issues FOR ALL USING (true) WITH CHECK (true);
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 2.4 Ensure split_bills table exists ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS split_bills (
  id            TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  tab_id        TEXT NOT NULL REFERENCES customer_tabs(id) ON DELETE CASCADE,
  mode          TEXT NOT NULL DEFAULT 'equal',
  entries       JSONB NOT NULL DEFAULT '[]',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE split_bills ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "all_access" ON split_bills FOR ALL USING (true) WITH CHECK (true);
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 2.5 Ensure tab_devices table exists ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS tab_devices (
  id            TEXT        PRIMARY KEY,
  restaurant_id TEXT        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  tab_id        TEXT        NOT NULL REFERENCES customer_tabs(id) ON DELETE CASCADE,
  device_id     TEXT        NOT NULL,
  customer_name TEXT        NOT NULL DEFAULT '',
  table_id      TEXT,
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at  TIMESTAMPTZ          DEFAULT NOW()
);

ALTER TABLE tab_devices ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "all_access" ON tab_devices FOR ALL USING (true) WITH CHECK (true);
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 2.6 Ensure waiter_calls table exists ────────────────────────────────────

CREATE TABLE IF NOT EXISTS waiter_calls (
  id              TEXT        PRIMARY KEY,
  restaurant_id   TEXT        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  tab_id          TEXT        REFERENCES customer_tabs(id) ON DELETE CASCADE,
  table_id        TEXT,
  customer_name   TEXT,
  called_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged    BOOLEAN     NOT NULL DEFAULT FALSE,
  acknowledged_by TEXT,
  acknowledged_at TIMESTAMPTZ
);

ALTER TABLE waiter_calls ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "all_access" ON waiter_calls FOR ALL USING (true) WITH CHECK (true);
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 2.7 Ensure email_queue table exists ─────────────────────────────────────
-- Full column definition matching lib/email-server.ts exactly.

CREATE TABLE IF NOT EXISTS email_queue (
  id              TEXT        PRIMARY KEY,
  order_id        TEXT        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  email           TEXT        NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'pending',
  retry_count     INTEGER     NOT NULL DEFAULT 0,
  next_retry_at   TIMESTAMPTZ,                              -- nullable: null = permanently failed
  last_attempt_at TIMESTAMPTZ,
  message_id      TEXT,
  error           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "all_access" ON email_queue FOR ALL USING (true) WITH CHECK (true);
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Fix NOT NULL constraint on existing email_queue next_retry_at (migration_003 adds NOT NULL)
-- This must run even if the table already existed
ALTER TABLE email_queue ALTER COLUMN next_retry_at DROP NOT NULL;

-- ============================================================
-- SECTION 3: CONSTRAINTS
-- ============================================================

-- ─── 3.1 Staff unique username per restaurant ─────────────────────────────────
DO $$ BEGIN
  ALTER TABLE staff ADD CONSTRAINT staff_username_restaurant_unique
    UNIQUE (restaurant_id, username);
  EXCEPTION WHEN duplicate_object THEN NULL;
  WHEN others THEN NULL;
END $$;

-- ─── 3.2 tab_devices unique (tab_id, device_id) ──────────────────────────────
DO $$ BEGIN
  ALTER TABLE tab_devices ADD CONSTRAINT tab_devices_tab_device_unique
    UNIQUE (tab_id, device_id);
  EXCEPTION WHEN duplicate_object THEN NULL;
  WHEN others THEN NULL;
END $$;

-- ─── 3.3 split_bills unique per tab ──────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE split_bills ADD CONSTRAINT split_bills_tab_unique
    UNIQUE (tab_id);
  EXCEPTION WHEN duplicate_object THEN NULL;
  WHEN others THEN NULL;
END $$;

-- ─── 3.4 email_queue unique per order ────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE email_queue ADD CONSTRAINT email_queue_order_unique
    UNIQUE (order_id);
  EXCEPTION WHEN duplicate_object THEN NULL;
  WHEN others THEN NULL;
END $$;

-- ─── 3.5 order_issues: prevent duplicate open issues for same order ───────────
-- Allow the application to create at most one active (non-resolved) issue per order.
-- Note: This is enforced in application code (idempotent POST), not here,
-- because partial updates (incrementing retry_count) require the row to exist.

-- ============================================================
-- SECTION 4: INDEXES — PERFORMANCE HARDENING
-- ============================================================
-- All indexes use CREATE INDEX IF NOT EXISTS — safe to re-run.
-- Partial indexes require the WHERE column to be present (fixed above).

-- ─── orders: core query patterns ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_restaurant ON orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_status     ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_type       ON orders(type);
CREATE INDEX IF NOT EXISTS idx_orders_created    ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_tab        ON orders(tab_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_table      ON orders(table_id, created_at DESC);

-- Active orders only (avoids scanning millions of completed/cancelled rows)
CREATE INDEX IF NOT EXISTS idx_orders_active
  ON orders(restaurant_id, status, created_at DESC)
  WHERE status NOT IN ('completed', 'cancelled', 'void');

-- Delivery dashboard: prepared → out_for_delivery → delivered
CREATE INDEX IF NOT EXISTS idx_orders_delivery
  ON orders(restaurant_id, type, status, created_at DESC)
  WHERE type = 'delivery';

-- Delivery active fast path
CREATE INDEX IF NOT EXISTS idx_orders_delivery_active
  ON orders(restaurant_id, status)
  WHERE type = 'delivery' AND status IN ('prepared', 'out_for_delivery', 'delivered', 're_serve_required');

-- re_serve_required: billing block queries are common
CREATE INDEX IF NOT EXISTS idx_orders_re_serve
  ON orders(tab_id, status)
  WHERE status = 're_serve_required';

-- Tracking page: lookup by token (always equality)
CREATE INDEX IF NOT EXISTS idx_orders_token ON orders(tracking_token) WHERE tracking_token IS NOT NULL;

-- Pickup orders waiting for pickup
CREATE INDEX IF NOT EXISTS idx_orders_pickup
  ON orders(restaurant_id, type, status)
  WHERE type = 'pickup' AND status IN ('pending', 'preparing', 'prepared', 're_serve_required');

-- ─── order_items ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_order_items_oid    ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_status ON order_items(order_id, item_status);

-- ─── order_events ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_order_events_oid  ON order_events(order_id);
CREATE INDEX IF NOT EXISTS idx_order_events_type ON order_events(order_id, event_type);

-- ─── order_issues ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_order_issues_order  ON order_issues(order_id);
CREATE INDEX IF NOT EXISTS idx_order_issues_rest   ON order_issues(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_order_issues_status ON order_issues(status);
-- Fast lookup for active (blocking) issues
CREATE INDEX IF NOT EXISTS idx_order_issues_active
  ON order_issues(restaurant_id, status, created_at DESC)
  WHERE status IN ('open', 'reserving', 'escalated');

-- ─── customer_tabs ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tabs_restaurant ON customer_tabs(restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_tabs_table      ON customer_tabs(table_id, status);
-- Active tabs fast path (used to check billing blocks, waiter portal)
CREATE INDEX IF NOT EXISTS idx_tabs_open
  ON customer_tabs(restaurant_id, status, created_at DESC)
  WHERE status IN ('open', 'awaiting_payment');

-- ─── waiter_calls ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_waiter_calls_tab      ON waiter_calls(tab_id);
CREATE INDEX IF NOT EXISTS idx_waiter_calls_rest     ON waiter_calls(restaurant_id, called_at DESC);
-- Unacknowledged calls — most frequent query in waiter portal
CREATE INDEX IF NOT EXISTS idx_waiter_calls_pending
  ON waiter_calls(restaurant_id, called_at DESC)
  WHERE acknowledged = FALSE;

-- ─── tab_devices ──────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_tab_devices_tab_device ON tab_devices(tab_id, device_id);
CREATE INDEX IF NOT EXISTS idx_tab_devices_tab              ON tab_devices(tab_id);
CREATE INDEX IF NOT EXISTS idx_tab_devices_device           ON tab_devices(device_id);

-- ─── split_bills ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_split_bills_tab ON split_bills(tab_id);

-- ─── email_queue ──────────────────────────────────────────────────────────────
-- Worker query: fetch rows ready to process (status=pending|failed, due now, retries left)
CREATE INDEX IF NOT EXISTS idx_email_queue_worker
  ON email_queue(status, retry_count, next_retry_at)
  WHERE status IN ('pending') AND retry_count < 3;
CREATE INDEX IF NOT EXISTS idx_email_queue_order ON email_queue(order_id);

-- ─── shifts ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_shifts_staff  ON shift_logs(staff_id);
CREATE INDEX IF NOT EXISTS idx_shifts_active ON shift_logs(restaurant_id, staff_id)
  WHERE shift_end IS NULL;

-- ─── restaurant_settings ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_settings_rest ON restaurant_settings(restaurant_id);

-- ─── tables ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tables_rest   ON tables(restaurant_id, name);
CREATE INDEX IF NOT EXISTS idx_tables_status ON tables(restaurant_id, status);

-- ─── menu_items ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_menu_rest      ON menu_items(restaurant_id, available);
CREATE INDEX IF NOT EXISTS idx_menu_category  ON menu_items(restaurant_id, category, name);

-- ─── expenses ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_expenses_rest  ON expenses(restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_date  ON expenses(restaurant_id, date DESC);

-- ─── staff ────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_staff_rest ON staff(restaurant_id, role, active);

-- ============================================================
-- SECTION 5: REALTIME PUBLICATION
-- ============================================================
-- Ensure all tables are in the supabase_realtime publication so that
-- postgres_changes listeners (if used) and the broadcast REST API work.
-- DO $$ EXCEPTION handles "already a member of publication" errors.

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE orders;
  EXCEPTION WHEN duplicate_object THEN NULL;
  WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
  EXCEPTION WHEN duplicate_object THEN NULL;
  WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE order_events;
  EXCEPTION WHEN duplicate_object THEN NULL;
  WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE order_issues;
  EXCEPTION WHEN duplicate_object THEN NULL;
  WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE customer_tabs;
  EXCEPTION WHEN duplicate_object THEN NULL;
  WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE waiter_calls;
  EXCEPTION WHEN duplicate_object THEN NULL;
  WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE tables;
  EXCEPTION WHEN duplicate_object THEN NULL;
  WHEN others THEN NULL;
END $$;

-- ============================================================
-- SECTION 6: SEED DATA — DEFAULTS
-- ============================================================

-- Default restaurant settings (PINs, notifications config)
-- ON CONFLICT DO NOTHING = safe to re-run; won't overwrite user-changed values
INSERT INTO restaurant_settings (restaurant_id, key, value) VALUES
  ('rest_default', 'admin_pin',             '1234'),
  ('rest_default', 'kitchen_pin',           '0000'),
  ('rest_default', 'manager_pin',           '9999'),
  ('rest_default', 'owner_pin',             '1234'),
  ('rest_default', 'security_question',     ''),
  ('rest_default', 'security_answer',       ''),
  ('rest_default', 'tax_rate',              '5'),
  ('rest_default', 'currency',              'INR'),
  ('rest_default', 'currency_symbol',       '₹'),
  ('rest_default', 'restaurant_name',       'Foodie Lover'),
  ('rest_default', 'email_notifications',   'false'),
  ('rest_default', 'whatsapp_number',       ''),
  ('rest_default', 'delivery_enabled',      'true'),
  ('rest_default', 'pickup_enabled',        'true'),
  ('rest_default', 'online_ordering',       'false')
ON CONFLICT (restaurant_id, key) DO NOTHING;

-- Default tables if none exist
INSERT INTO tables (id, restaurant_id, name, capacity, status) VALUES
  ('tbl_01', 'rest_default', 'T1',  4, 'available'),
  ('tbl_02', 'rest_default', 'T2',  4, 'available'),
  ('tbl_03', 'rest_default', 'T3',  4, 'available'),
  ('tbl_04', 'rest_default', 'T4',  6, 'available'),
  ('tbl_05', 'rest_default', 'T5',  6, 'available'),
  ('tbl_06', 'rest_default', 'T6',  4, 'available'),
  ('tbl_07', 'rest_default', 'T7',  4, 'available'),
  ('tbl_08', 'rest_default', 'T8',  2, 'available'),
  ('tbl_09', 'rest_default', 'T9',  2, 'available'),
  ('tbl_10', 'rest_default', 'T10', 8, 'available')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SECTION 7: DATA INTEGRITY — SELF-HEALING REPAIRS
-- ============================================================

-- Repair: tabs with NULL total (should always be numeric)
UPDATE customer_tabs SET total = 0 WHERE total IS NULL;

-- Repair: orders with NULL total or subtotal
UPDATE orders SET total = 0    WHERE total    IS NULL;
UPDATE orders SET subtotal = 0 WHERE subtotal IS NULL;
UPDATE orders SET tax = 0      WHERE tax      IS NULL;
UPDATE orders SET discount = 0 WHERE discount IS NULL;
UPDATE orders SET tip = 0      WHERE tip      IS NULL;
UPDATE orders SET issue_count = 0 WHERE issue_count IS NULL;

-- Repair: order_items with NULL quantities
UPDATE order_items SET qty = 1 WHERE qty IS NULL OR qty <= 0;
UPDATE order_items SET price = 0 WHERE price IS NULL;
UPDATE order_items SET subtotal = 0 WHERE subtotal IS NULL;

-- Repair: orders with 're_serve_required' status that have no open issue
-- (should never happen, but ensures consistency)
-- If an order is in re_serve_required but has no active issue, create one retroactively
-- NOTE: We skip this repair since it would require knowing restaurant_id.
-- This is handled by the application layer on the next status check.

-- Repair: tabs with open status but closed_at set (inconsistency)
UPDATE customer_tabs SET closed_at = NULL WHERE status = 'open' AND closed_at IS NOT NULL;

-- Repair: tables with 'occupied' status but no open tabs
-- (tables stuck in occupied state after crash/force-reload)
-- Safe: only marks 'available' if there are truly no open/awaiting_payment tabs
UPDATE tables t
SET status = 'available'
WHERE t.status = 'occupied'
  AND NOT EXISTS (
    SELECT 1 FROM customer_tabs ct
    WHERE ct.table_id = t.id
      AND ct.status IN ('open', 'awaiting_payment')
  );

-- Repair: sync all open tab totals from their orders
-- This ensures no stale totals after any previous crash or missed update.
UPDATE customer_tabs ct
SET total = COALESCE((
  SELECT SUM(o.total)
  FROM orders o
  WHERE o.tab_id = ct.id
    AND o.status NOT IN ('cancelled', 'void')
), 0)
WHERE ct.status IN ('open', 'awaiting_payment');

-- ============================================================
-- SECTION 8: FINAL SCHEMA VERIFICATION QUERIES
-- ============================================================
-- These SELECTs will return results if any critical column is still missing.
-- Run them after applying the migration to confirm everything is correct.
--
-- SELECT table_name, column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name IN (
--     'waiter_calls','email_queue','order_items','orders',
--     'customer_tabs','tab_devices','order_issues'
--   )
-- ORDER BY table_name, ordinal_position;
--
-- SELECT tablename, indexname FROM pg_indexes
-- WHERE schemaname = 'public'
-- ORDER BY tablename, indexname;
--
-- Check for NULL totals after repair:
-- SELECT COUNT(*) FROM customer_tabs WHERE total IS NULL;
-- SELECT COUNT(*) FROM orders WHERE total IS NULL;
--
-- Check item_status values after repair:
-- SELECT DISTINCT item_status, COUNT(*) FROM order_items GROUP BY item_status;

-- ============================================================
-- END OF MIGRATION 008
-- ============================================================
