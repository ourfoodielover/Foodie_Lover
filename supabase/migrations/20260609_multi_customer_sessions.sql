-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Multi-customer table session support
--
-- Adds personal_pin to tab_devices so every individual customer at a table
-- can set their own 4-digit PIN for independent session recovery.
-- (Previously only the session creator could recover via the shared tab PIN.)
--
-- This is a non-breaking additive change:
--   • Existing tab_devices rows get personal_pin = '' (empty string).
--   • The verify-personal-pin endpoint falls back to verifyTabPin for legacy
--     sessions where personal_pin is still empty.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE tab_devices
  ADD COLUMN IF NOT EXISTS personal_pin TEXT NOT NULL DEFAULT '';

-- Index for fast per-customer session recovery lookup
CREATE INDEX IF NOT EXISTS idx_tab_devices_personal_pin
  ON tab_devices (table_id, personal_pin)
  WHERE personal_pin <> '';

COMMENT ON COLUMN tab_devices.personal_pin IS
  'Customer-chosen 4-digit PIN for individual session recovery. '
  'Distinct from customer_tabs.pin (the shared tab/host PIN). '
  'Empty string = not set (legacy row — fall back to tab PIN for recovery).';
