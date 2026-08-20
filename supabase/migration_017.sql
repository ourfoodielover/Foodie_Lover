-- ─── migration_017: Add spin_token + spin_invite_sent_at for Spin & Win email flow ──
--
-- WHY:
--   The Spin & Win email flow requires a secure, order-specific token so that:
--   1. Email links open directly to /spin?orderId=XXX&token=YYY (or tabId variant)
--      without requiring the customer to enter their email/phone again.
--   2. Tokens are generated server-side at order/tab completion and never change —
--      resending the email reuses the same token, which means the same spin
--      entitlement. There is no way to "reset" a spin by resending the email.
--   3. spin_invite_sent_at tracks whether the invite has been sent at all,
--      so the manager UI can show "Send Spin Email" vs "Resend Spin Email".
--
-- COLUMNS ADDED:
--   orders.spin_token            TEXT       — cryptographically random 48-char hex token
--   orders.spin_invite_sent_at   TIMESTAMPTZ — when the last spin invite email was sent
--   customer_tabs.spin_token            TEXT
--   customer_tabs.spin_invite_sent_at   TIMESTAMPTZ
--
-- SAFE TO RUN: ADD COLUMN IF NOT EXISTS is idempotent.
-- ─────────────────────────────────────────────────────────────────────────────────

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS spin_token          TEXT,
  ADD COLUMN IF NOT EXISTS spin_invite_sent_at TIMESTAMPTZ;

ALTER TABLE customer_tabs
  ADD COLUMN IF NOT EXISTS spin_token          TEXT,
  ADD COLUMN IF NOT EXISTS spin_invite_sent_at TIMESTAMPTZ;
