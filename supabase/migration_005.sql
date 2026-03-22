-- ============================================================
-- Migration 005 — Restaurant settings + Split bills
-- Run in Supabase SQL editor:
--   https://supabase.com/dashboard/project/<project>/sql/new
-- ============================================================

-- ─── restaurant_settings ─────────────────────────────────────────────────────
-- Stores per-restaurant key-value configuration: PINs, security Q&A, etc.
-- Replaces localStorage for kitchen_pin, manager_pin, admin_pin, security setup.

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

-- Seed default PINs (admin=1234, kitchen=0000, manager=9999)
INSERT INTO restaurant_settings (restaurant_id, key, value) VALUES
  ('rest_default', 'admin_pin',    '1234'),
  ('rest_default', 'kitchen_pin',  '0000'),
  ('rest_default', 'manager_pin',  '9999'),
  ('rest_default', 'security_question', ''),
  ('rest_default', 'security_answer',   '')
ON CONFLICT (restaurant_id, key) DO NOTHING;

-- ─── split_bills ─────────────────────────────────────────────────────────────
-- Stores split-billing sessions for manager tab checkout.
-- Replaces localStorage createSplitBill / markSplitEntryPaid.

CREATE TABLE IF NOT EXISTS split_bills (
  id            TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  tab_id        TEXT NOT NULL REFERENCES customer_tabs(id) ON DELETE CASCADE,
  mode          TEXT NOT NULL DEFAULT 'equal',   -- 'equal' | 'custom'
  entries       JSONB NOT NULL DEFAULT '[]',      -- [{label,amount,paid,paidAt,paidBy,paymentMethod}]
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_split_bills_tab ON split_bills(tab_id);

ALTER TABLE split_bills ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "all_access" ON split_bills FOR ALL USING (true) WITH CHECK (true);
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── expenses: add missing columns if not already present ─────────────────────
-- The schema.sql has: id, restaurant_id, category, description, amount, date, created_by, created_at
-- No changes needed — expenses table is already complete.

-- ─── staff: ensure unique username per restaurant ─────────────────────────────
DO $$ BEGIN
  ALTER TABLE staff ADD CONSTRAINT staff_username_restaurant_unique UNIQUE (restaurant_id, username);
  EXCEPTION WHEN duplicate_table THEN NULL;
  WHEN others THEN NULL;
END $$;
