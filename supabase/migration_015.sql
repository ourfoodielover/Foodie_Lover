-- migration_015: Spin & Win admin enhancements
-- Adds archived flag and updated_at to spin_rewards
-- Adds timezone to spin_config for IST-aware daily limit resets
-- Run in Supabase SQL editor BEFORE deploying code changes from this migration.

-- ── spin_rewards: soft-delete / archive support ──────────────────────────────
-- archived = TRUE means the reward is hidden from admin list and spin pool.
-- Used instead of hard-delete when the reward has coupon/spin history,
-- so issued coupons remain valid.
ALTER TABLE spin_rewards ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE;

-- Track when reward was last edited (useful for audit / display)
ALTER TABLE spin_rewards ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Index for fast "active non-archived" queries (spin pool + admin list)
CREATE INDEX IF NOT EXISTS idx_spin_rewards_active_archived
  ON spin_rewards(restaurant_id, active, archived);

-- ── spin_config: timezone for daily-limit reset ───────────────────────────────
-- Defaults to Asia/Kolkata (IST UTC+5:30).
-- The spin route reads this to compute the correct day-boundary for daily_win_limit.
ALTER TABLE spin_config ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata';
