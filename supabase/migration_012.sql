-- ── Foodie Lover Migration 012 ─────────────────────────────────────────────
-- Adds: kitchen_route to orders, tab-based spin, half-star rating support,
--       kitchen_mode to restaurants, email_log dedup_key, reward email dedup

-- ── Kitchen routing for orders ─────────────────────────────────────────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS kitchen_route TEXT DEFAULT 'not_set'
  CHECK (kitchen_route IN ('not_set', 'printer', 'kitchen_display'));

-- ── Half-star rating support (change INTEGER to NUMERIC) ───────────────────
-- Drop the old integer constraint, alter column type, add new decimal constraint
ALTER TABLE order_feedback DROP CONSTRAINT IF EXISTS order_feedback_rating_check;
ALTER TABLE order_feedback ALTER COLUMN rating TYPE NUMERIC(3,1) USING rating::NUMERIC(3,1);
ALTER TABLE order_feedback ADD CONSTRAINT order_feedback_rating_check
  CHECK (rating >= 0.5 AND rating <= 5.0 AND (rating * 2) = FLOOR(rating * 2));

-- ── Tab-level spin support ─────────────────────────────────────────────────
-- Allow order_id to be nullable for tab-based spins
ALTER TABLE spin_results ALTER COLUMN order_id DROP NOT NULL;
-- Add optional tab_id column for dine-in tab-based spins
ALTER TABLE spin_results ADD COLUMN IF NOT EXISTS tab_id TEXT REFERENCES customer_tabs(id) ON DELETE CASCADE;
-- Unique index: one spin per tab
CREATE UNIQUE INDEX IF NOT EXISTS idx_spin_results_tab ON spin_results(tab_id) WHERE tab_id IS NOT NULL;

-- ── Kitchen routing mode for restaurant config ─────────────────────────────
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS kitchen_mode TEXT DEFAULT 'ask'
  CHECK (kitchen_mode IN ('ask', 'printer', 'kitchen_display'));

-- ── Email dedup: add dedup_key for flexible deduplication ─────────────────
-- Allows tab-based reward emails (no order FK) to be deduplicated
ALTER TABLE email_log ADD COLUMN IF NOT EXISTS dedup_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_log_dedup ON email_log(dedup_key) WHERE dedup_key IS NOT NULL;
-- Make order_id nullable (for tab-based emails that have no order FK)
ALTER TABLE email_log ALTER COLUMN order_id DROP NOT NULL;

-- ── Add tab_id to reward_coupons for tab-based rewards ────────────────────
ALTER TABLE reward_coupons ADD COLUMN IF NOT EXISTS source_tab_id TEXT REFERENCES customer_tabs(id);
-- Allow source_order_id to be nullable (tab-based coupons have no single source order)
ALTER TABLE reward_coupons ALTER COLUMN source_order_id DROP NOT NULL;
