-- ============================================================
-- Migration 003 — Email Queue (Reliable Receipt Delivery)
-- Run in: https://supabase.com/dashboard/project/unmvkybtmjdpdwpzeydk/sql/new
-- ============================================================
--
-- Creates the email_queue table for reliable, retry-capable email delivery.
-- Instead of sending emails directly (fire-and-forget), the system enqueues
-- them here, and a background worker processes the queue with exponential
-- backoff retries (1st retry: 1 min, 2nd retry: 5 min, max 3 attempts).
--
-- Status lifecycle:
--   pending → (worker sends)  → sent
--   pending → (send fails)    → failed (retry_count=1, next_retry_at = now+1min)
--   failed  → (worker retries) → sent
--   failed  → (3rd fail)      → failed permanently (retry_count=3, no more retries)
-- ============================================================

CREATE TABLE IF NOT EXISTS email_queue (
  id              TEXT        PRIMARY KEY,
  order_id        TEXT        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  email           TEXT        NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'sent', 'failed')),
  retry_count     INTEGER     NOT NULL DEFAULT 0,
  next_retry_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),   -- worker processes when this is <= NOW()
  last_attempt_at TIMESTAMPTZ,                          -- set every time we attempt a send
  message_id      TEXT,                                 -- Resend message ID on success
  error           TEXT,                                 -- last error message on failure
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

-- Worker query: fetch all rows ready to process
CREATE INDEX IF NOT EXISTS idx_email_queue_worker
  ON email_queue (status, retry_count, next_retry_at)
  WHERE status IN ('pending', 'failed') AND retry_count < 3;

-- Look up by order_id (idempotency check on enqueue)
CREATE INDEX IF NOT EXISTS idx_email_queue_order_id
  ON email_queue (order_id);

-- ── Verify ────────────────────────────────────────────────────────────────────
-- SELECT id, order_id, email, status, retry_count, next_retry_at, error
-- FROM email_queue
-- ORDER BY created_at DESC
-- LIMIT 20;
