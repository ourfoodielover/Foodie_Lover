-- ============================================================
-- Migration 021 — Order Idempotency Key
-- Foodie Lover POS
--
-- Run in Supabase SQL editor:
--   https://supabase.com/dashboard/project/<project>/sql/new
--
-- SAFE TO RE-RUN: every statement uses IF NOT EXISTS.
--
-- WHAT THIS MIGRATION DOES
-- -------------------------------------------------------------
-- Remediates audit finding C5 (offline order idempotency). The Online
-- Ordering flow queues orders locally (lib/offline-queue.ts) and replays
-- them once connectivity returns. Without a server-recognized idempotency
-- key, a replay (or a duplicate submit from a flaky connection / double
-- tap) creates a second identical order and double-charges the kitchen
-- and the customer's card/cash total.
--
-- The client now generates a random idempotency key per checkout attempt
-- and sends it embedded in the order payload (app/online/page.tsx). The
-- key survives the offline-queue → replay round-trip unchanged because it
-- is part of the stored payload, not a side-channel header. The server
-- (app/api/orders/route.ts POST handler) looks up any existing order with
-- the same (restaurant_id, idempotency_key) BEFORE inserting a new one and
-- returns the existing order if found, so retries/replays are safe no-ops.
--
-- This migration only adds the column + a partial unique index enforcing
-- that guarantee at the database level as well (defense in depth — two
-- concurrent requests with the same key cannot both insert).
--
-- Deliberately NOT enforced as a plain (non-partial) UNIQUE constraint:
--   • idempotency_key is NULL for every order that doesn't go through the
--     Online Ordering offline-queue path (dine-in, waiter-assisted, any
--     legacy client). Postgres treats multiple NULLs as distinct under a
--     normal UNIQUE constraint so this would technically still work, but
--     a partial index (WHERE idempotency_key IS NOT NULL) is used to be
--     explicit that uniqueness is only meaningful/enforced for orders
--     that actually supplied a key, and to keep the index smaller.
-- ============================================================

-- 1. Add the column (nullable — existing rows and non-online-ordering
--    order sources are unaffected).
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- 2. Enforce uniqueness only where a key was actually supplied, scoped
--    implicitly per-database (idempotency_key values are generated with
--    enough randomness — phone + timestamp + random suffix — that cross-
--    restaurant collision is not a practical concern; if stricter scoping
--    is ever needed this can be swapped for a composite
--    (restaurant_id, idempotency_key) unique index without breaking
--    existing rows).
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency_key
  ON orders (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ============================================================
-- Verification (run after applying)
-- ============================================================
-- Confirm the column exists:
--   SELECT column_name, data_type, is_nullable
--   FROM information_schema.columns
--   WHERE table_name = 'orders' AND column_name = 'idempotency_key';
--
-- Confirm the partial unique index exists:
--   SELECT indexname, indexdef
--   FROM pg_indexes
--   WHERE tablename = 'orders' AND indexname = 'idx_orders_idempotency_key';
--
-- Confirm no existing duplicate keys would violate the new index
-- (should return zero rows; run this BEFORE creating the index above if
-- you want to pre-check on a copy of production data):
--   SELECT idempotency_key, COUNT(*)
--   FROM orders
--   WHERE idempotency_key IS NOT NULL
--   GROUP BY idempotency_key
--   HAVING COUNT(*) > 1;
-- ============================================================
-- END OF MIGRATION 021 --
