-- ── Foodie Lover Migration 011 ─────────────────────────────────────────────
-- Adds: email_log (dedup), spin_config, spin_rewards, spin_results,
--       reward_coupons, order_feedback (ensure exists), coupon columns on orders/tabs
-- All statements are idempotent (IF NOT EXISTS / ON CONFLICT DO NOTHING).

-- ── Email deduplication log ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_log (
  id           TEXT PRIMARY KEY,
  order_id     TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  event_type   TEXT NOT NULL,
  sent_to      TEXT NOT NULL,
  sent_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(order_id, event_type)
);

ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "all_access" ON email_log FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_email_log_order ON email_log(order_id);

-- ── order_feedback (ensure exists) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_feedback (
  id         TEXT PRIMARY KEY,
  order_id   TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(order_id)
);

ALTER TABLE order_feedback ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "all_access" ON order_feedback FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Spin & Win configuration ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS spin_config (
  id                    TEXT PRIMARY KEY,
  restaurant_id         TEXT NOT NULL REFERENCES restaurants(id),
  enabled               BOOLEAN NOT NULL DEFAULT FALSE,
  min_order_amount      NUMERIC(10,2) NOT NULL DEFAULT 500,
  eligible_order_types  TEXT[] NOT NULL DEFAULT ARRAY['dine-in','pickup','delivery'],
  require_email         BOOLEAN NOT NULL DEFAULT TRUE,
  require_phone         BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE spin_config ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "all_access" ON spin_config FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO spin_config (id, restaurant_id, enabled, min_order_amount)
VALUES ('rest_default', 'rest_default', false, 500)
ON CONFLICT (id) DO NOTHING;

-- ── Spin rewards (admin-configured options) ────────────────────────────────
CREATE TABLE IF NOT EXISTS spin_rewards (
  id             TEXT PRIMARY KEY,
  restaurant_id  TEXT NOT NULL REFERENCES restaurants(id),
  label          TEXT NOT NULL,
  reward_type    TEXT NOT NULL CHECK (reward_type IN ('percent','fixed','free_item','no_reward')),
  reward_value   NUMERIC(10,2) NOT NULL DEFAULT 0,
  free_item_id   TEXT,
  weight         INTEGER NOT NULL DEFAULT 1,
  min_next_order NUMERIC(10,2) NOT NULL DEFAULT 0,
  expires_days   INTEGER NOT NULL DEFAULT 30,
  active         BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE spin_rewards ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "all_access" ON spin_rewards FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Spin results (one per qualifying order) ────────────────────────────────
CREATE TABLE IF NOT EXISTS spin_results (
  id             TEXT PRIMARY KEY,
  order_id       TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  reward_id      TEXT REFERENCES spin_rewards(id),
  is_winner      BOOLEAN NOT NULL DEFAULT FALSE,
  spun_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  customer_email TEXT,
  customer_phone TEXT,
  UNIQUE(order_id)
);

ALTER TABLE spin_results ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "all_access" ON spin_results FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_spin_results_order ON spin_results(order_id);

-- ── Reward coupons ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reward_coupons (
  id                TEXT PRIMARY KEY,
  coupon_code       TEXT NOT NULL UNIQUE,
  spin_id           TEXT NOT NULL REFERENCES spin_results(id),
  source_order_id   TEXT NOT NULL REFERENCES orders(id),
  reward_id         TEXT NOT NULL REFERENCES spin_rewards(id),
  reward_type       TEXT NOT NULL,
  reward_value      NUMERIC(10,2) NOT NULL DEFAULT 0,
  free_item_id      TEXT,
  free_item_name    TEXT,
  label             TEXT NOT NULL,
  customer_email    TEXT NOT NULL,
  customer_phone    TEXT NOT NULL,
  issued_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at        TIMESTAMPTZ NOT NULL,
  min_next_order    NUMERIC(10,2) NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','reserved','redeemed','expired','cancelled')),
  reserved_order_id TEXT REFERENCES orders(id),
  reserved_at       TIMESTAMPTZ,
  redeemed_order_id TEXT REFERENCES orders(id),
  redeemed_at       TIMESTAMPTZ,
  discount_given    NUMERIC(10,2),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE reward_coupons ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "all_access" ON reward_coupons FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_reward_coupons_code   ON reward_coupons(coupon_code);
CREATE INDEX IF NOT EXISTS idx_reward_coupons_email  ON reward_coupons(customer_email);
CREATE INDEX IF NOT EXISTS idx_reward_coupons_status ON reward_coupons(status);

-- ── Add coupon columns to orders ───────────────────────────────────────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_id       TEXT REFERENCES reward_coupons(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code     TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_discount NUMERIC(10,2) DEFAULT 0;

-- ── Add coupon columns to customer_tabs (dine-in) ─────────────────────────
ALTER TABLE customer_tabs ADD COLUMN IF NOT EXISTS coupon_id       TEXT REFERENCES reward_coupons(id);
ALTER TABLE customer_tabs ADD COLUMN IF NOT EXISTS coupon_code     TEXT;
ALTER TABLE customer_tabs ADD COLUMN IF NOT EXISTS coupon_discount NUMERIC(10,2) DEFAULT 0;
