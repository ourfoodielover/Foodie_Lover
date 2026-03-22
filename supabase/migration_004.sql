-- ============================================================
-- Migration 004 — Device Tracking, Waiter Calls, Table PIN
-- Run in: https://supabase.com/dashboard/project/unmvkybtmjdpdwpzeydk/sql/new
-- ============================================================
--
-- Replaces localStorage-based business data with Supabase tables:
--
--   tab_devices   — which device_id is connected to which tab
--                   (replaces fl_device_records in localStorage)
--
--   waiter_calls  — records when customers call for waiter assistance
--                   (replaces fl_waiter_calls in localStorage)
--
--   customer_tabs.pin — 4-digit PIN set by the table session creator
--                       so joiners can authenticate without localStorage
--
-- ============================================================

-- ─── tab_devices ──────────────────────────────────────────────────────────────
-- Tracks which devices are connected to which customer tab.
-- One row per (tab_id, device_id) pair; unique constraint prevents duplicates.

CREATE TABLE IF NOT EXISTS tab_devices (
  id            TEXT        PRIMARY KEY,
  restaurant_id TEXT        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  tab_id        TEXT        NOT NULL REFERENCES customer_tabs(id) ON DELETE CASCADE,
  device_id     TEXT        NOT NULL,
  customer_name TEXT        NOT NULL DEFAULT '',
  table_id      TEXT,                                      -- denormalised for quick lookup
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enforce uniqueness: a device can only be registered to a tab once.
CREATE UNIQUE INDEX IF NOT EXISTS idx_tab_devices_tab_device
  ON tab_devices(tab_id, device_id);

CREATE INDEX IF NOT EXISTS idx_tab_devices_tab_id
  ON tab_devices(tab_id);

CREATE INDEX IF NOT EXISTS idx_tab_devices_device_id
  ON tab_devices(device_id);

-- ─── waiter_calls ─────────────────────────────────────────────────────────────
-- Records each time a customer requests waiter assistance from the table QR page.

CREATE TABLE IF NOT EXISTS waiter_calls (
  id            TEXT        PRIMARY KEY,
  restaurant_id TEXT        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  tab_id        TEXT        REFERENCES customer_tabs(id) ON DELETE CASCADE,
  table_id      TEXT,
  customer_name TEXT,
  called_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_waiter_calls_tab_id
  ON waiter_calls(tab_id);

CREATE INDEX IF NOT EXISTS idx_waiter_calls_restaurant
  ON waiter_calls(restaurant_id, called_at DESC);

-- ─── customer_tabs: add PIN column ────────────────────────────────────────────
-- Stores the 4-digit PIN set by the session creator so any device at the table
-- can verify it via the server instead of relying on localStorage.

ALTER TABLE customer_tabs
  ADD COLUMN IF NOT EXISTS pin TEXT;

-- ─── RLS policies ─────────────────────────────────────────────────────────────

ALTER TABLE tab_devices  ENABLE ROW LEVEL SECURITY;
ALTER TABLE waiter_calls ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "all_access" ON tab_devices  FOR ALL USING (true) WITH CHECK (true);
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "all_access" ON waiter_calls FOR ALL USING (true) WITH CHECK (true);
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Verify ───────────────────────────────────────────────────────────────────
-- Run these SELECTs after applying to confirm the migration succeeded:
--
-- SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public'
--   AND table_name IN ('tab_devices', 'waiter_calls');
--
-- SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'customer_tabs' AND column_name = 'pin';
