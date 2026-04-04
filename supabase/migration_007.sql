-- ============================================================
-- Migration 007 — System Hardening & Performance
-- Run in Supabase SQL editor:
--   https://supabase.com/dashboard/project/<project>/sql/new
-- ============================================================

-- ─── customer_tabs: add missing columns ──────────────────────────────────────
-- These columns are used by the API but may not exist in older schema deployments.

DO $$ BEGIN
  ALTER TABLE customer_tabs ADD COLUMN customer_name TEXT;
  EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE customer_tabs ADD COLUMN party_size INTEGER NOT NULL DEFAULT 1;
  EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE customer_tabs ADD COLUMN pin TEXT;
  EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE customer_tabs ADD COLUMN discount NUMERIC(10,2) NOT NULL DEFAULT 0;
  EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE customer_tabs ADD COLUMN discount_reason TEXT;
  EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE customer_tabs ADD COLUMN payment_method TEXT DEFAULT 'cod';
  EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ─── orders: add missing columns ─────────────────────────────────────────────

DO $$ BEGIN
  ALTER TABLE orders ADD COLUMN assigned_at TIMESTAMPTZ;
  EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE orders ADD COLUMN delivered_at TIMESTAMPTZ;
  EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE orders ADD COLUMN issue_count INTEGER NOT NULL DEFAULT 0;
  EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ─── order_items: add item_status if missing ─────────────────────────────────

DO $$ BEGIN
  ALTER TABLE order_items ADD COLUMN item_status TEXT NOT NULL DEFAULT 'queued';
  EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ─── staff: unique constraint on (restaurant_id, username) ────────────────────
-- Prevents duplicate usernames within the same restaurant.
-- If the constraint already exists, skip it.

DO $$ BEGIN
  ALTER TABLE staff ADD CONSTRAINT staff_restaurant_username_unique UNIQUE (restaurant_id, username);
  EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- ─── tab_devices table ────────────────────────────────────────────────────────
-- Tracks which device (browser) is connected to which tab. Used for multi-device
-- table sessions (e.g. a customer re-joins their table's order session).

CREATE TABLE IF NOT EXISTS tab_devices (
  id            TEXT        PRIMARY KEY,
  tab_id        TEXT        NOT NULL REFERENCES customer_tabs(id) ON DELETE CASCADE,
  restaurant_id TEXT        NOT NULL,
  device_id     TEXT        NOT NULL,
  customer_name TEXT,
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tab_devices_unique ON tab_devices(tab_id, device_id);
CREATE INDEX IF NOT EXISTS idx_tab_devices_device ON tab_devices(device_id);

ALTER TABLE tab_devices ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "all_access" ON tab_devices FOR ALL USING (true) WITH CHECK (true);
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── waiter_calls table ───────────────────────────────────────────────────────
-- Replaces the localStorage-based waiter call system.

CREATE TABLE IF NOT EXISTS waiter_calls (
  id              TEXT        PRIMARY KEY,
  tab_id          TEXT        NOT NULL REFERENCES customer_tabs(id) ON DELETE CASCADE,
  restaurant_id   TEXT        NOT NULL,
  table_id        TEXT,
  customer_name   TEXT,
  called_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged    BOOLEAN     NOT NULL DEFAULT FALSE,
  acknowledged_by TEXT,
  acknowledged_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_waiter_calls_tab      ON waiter_calls(tab_id);
CREATE INDEX IF NOT EXISTS idx_waiter_calls_rest     ON waiter_calls(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_waiter_calls_unacked  ON waiter_calls(restaurant_id, acknowledged) WHERE acknowledged = FALSE;

ALTER TABLE waiter_calls ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "all_access" ON waiter_calls FOR ALL USING (true) WITH CHECK (true);
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── split_bills table ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS split_bills (
  id             TEXT        PRIMARY KEY,
  tab_id         TEXT        NOT NULL REFERENCES customer_tabs(id) ON DELETE CASCADE,
  restaurant_id  TEXT        NOT NULL,
  entries        JSONB       NOT NULL DEFAULT '[]',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_split_bills_tab ON split_bills(tab_id);

ALTER TABLE split_bills ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "all_access" ON split_bills FOR ALL USING (true) WITH CHECK (true);
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── settings table ───────────────────────────────────────────────────────────
-- Key-value store for restaurant settings (PINs, notifications, etc.)

CREATE TABLE IF NOT EXISTS settings (
  key           TEXT        NOT NULL,
  restaurant_id TEXT        NOT NULL,
  value         TEXT,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (key, restaurant_id)
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "all_access" ON settings FOR ALL USING (true) WITH CHECK (true);
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── email_queue table ────────────────────────────────────────────────────────
-- Reliable email delivery queue with retry support.

-- Column names match lib/email-server.ts exactly for correct ORM binding
CREATE TABLE IF NOT EXISTS email_queue (
  id              TEXT        PRIMARY KEY,
  order_id        TEXT        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  email           TEXT,                                   -- recipient address
  status          TEXT        NOT NULL DEFAULT 'pending', -- 'pending' | 'sent' | 'failed'
  retry_count     INTEGER     NOT NULL DEFAULT 0,
  error           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at         TIMESTAMPTZ,
  last_attempt_at TIMESTAMPTZ,
  next_retry_at   TIMESTAMPTZ                             -- null after permanent failure
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_queue_order ON email_queue(order_id);
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status) WHERE status = 'pending';

ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "all_access" ON email_queue FOR ALL USING (true) WITH CHECK (true);
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Additional performance indexes ──────────────────────────────────────────

-- Fast active order lookup (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_orders_active ON orders(restaurant_id, status, created_at DESC)
  WHERE status NOT IN ('completed', 'cancelled', 'void');

-- Tab lookup by status
CREATE INDEX IF NOT EXISTS idx_tabs_status ON customer_tabs(restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_tabs_table  ON customer_tabs(table_id, status) WHERE status != 'closed';

-- Order lookup by tab (customer page)
CREATE INDEX IF NOT EXISTS idx_orders_tab ON orders(tab_id, created_at DESC);

-- Delivery queue fast path
CREATE INDEX IF NOT EXISTS idx_orders_delivery ON orders(restaurant_id, type, status)
  WHERE type = 'delivery' AND status IN ('prepared', 'out_for_delivery', 're_serve_required');

-- ─── Note on order.status values ─────────────────────────────────────────────
-- The orders.status column has NO CHECK constraint so application-level statuses
-- like 're_serve_required' work without any ALTER TABLE.
-- Managed statuses: awaiting_waiter | pending | preparing | prepared | served
--   re_serve_required | out_for_delivery | delivered | completed | cancelled | void

-- ─── Ensure restaurant record exists ─────────────────────────────────────────
-- The API defaults restaurantId to 'rest_default'. Insert it if missing.

INSERT INTO restaurants (id, name) VALUES ('rest_default', 'Foodie Lover')
ON CONFLICT (id) DO NOTHING;
