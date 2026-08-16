-- migration_014: Spin & Win enhancements
-- Adds max_discount, daily_win_limit, monthly_win_limit, BOGO columns to spin_rewards
-- Adds max_discount snapshot + BOGO snapshot columns to reward_coupons
-- Adds performance index for daily-limit counting

-- ── spin_rewards: new columns ──────────────────────────────────────────────────

-- Cap on percentage discount in rupees (NULL = uncapped).
-- Only meaningful for reward_type = 'percent'.
-- Example: 15% off but max ₹100 → max_discount = 100
ALTER TABLE spin_rewards ADD COLUMN IF NOT EXISTS max_discount NUMERIC(10,2);

-- Max times this specific reward can be issued restaurant-wide per calendar day
-- (NULL = unlimited). Prevents over-giving high-value rewards on busy days.
ALTER TABLE spin_rewards ADD COLUMN IF NOT EXISTS daily_win_limit INTEGER;

-- Monthly limit (schema-ready, not enforced in code yet — NULL = unlimited).
ALTER TABLE spin_rewards ADD COLUMN IF NOT EXISTS monthly_win_limit INTEGER;

-- BOGO: menu item IDs eligible for the free-item grant.
-- Empty array = any item qualifies. Applies when reward_type = 'free_item' or BOGO.
ALTER TABLE spin_rewards ADD COLUMN IF NOT EXISTS bogo_eligible_items TEXT[] NOT NULL DEFAULT '{}';

-- BOGO: category names eligible (alternative to item-level control).
ALTER TABLE spin_rewards ADD COLUMN IF NOT EXISTS bogo_eligible_categories TEXT[] NOT NULL DEFAULT '{}';

-- BOGO / free_item: maximum rupee value of the free item given (NULL = uncapped).
ALTER TABLE spin_rewards ADD COLUMN IF NOT EXISTS max_free_item_value NUMERIC(10,2);

-- ── reward_coupons: snapshot columns ──────────────────────────────────────────
-- These columns snapshot the reward configuration at the time the coupon was issued.
-- This ensures coupon terms are locked-in even if the admin later changes the reward.

-- Snapshot of max_discount at issue time (for percent rewards).
ALTER TABLE reward_coupons ADD COLUMN IF NOT EXISTS max_discount NUMERIC(10,2);

-- BOGO configuration snapshots
ALTER TABLE reward_coupons ADD COLUMN IF NOT EXISTS bogo_eligible_items TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE reward_coupons ADD COLUMN IF NOT EXISTS bogo_eligible_categories TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE reward_coupons ADD COLUMN IF NOT EXISTS max_free_item_value NUMERIC(10,2);

-- ── Performance index for daily-limit queries ──────────────────────────────────
-- Allows fast COUNT of today's coupons per reward without scanning all reward_coupons.
CREATE INDEX IF NOT EXISTS idx_reward_coupons_reward_issued
  ON reward_coupons(reward_id, issued_at);
