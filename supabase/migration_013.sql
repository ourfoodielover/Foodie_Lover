-- ── Foodie Lover Migration 013 ─────────────────────────────────────────────
-- Adds phone to customer_tabs so dine-in Spin & Win eligibility works.
-- Also updates submitFeedback to accept tabId for tab-level feedback.

-- ── Phone on customer_tabs ─────────────────────────────────────────────────
ALTER TABLE customer_tabs ADD COLUMN IF NOT EXISTS phone TEXT;
