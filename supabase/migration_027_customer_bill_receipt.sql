-- ============================================================
-- Migration 027 — Customer Bill / Receipt printing
-- Foodie Lover POS
--
-- Run in Supabase SQL editor:
--   https://supabase.com/dashboard/project/<project>/sql/new
--
-- SAFE TO RE-RUN: every statement uses IF NOT EXISTS / conditional guards.
--
-- ── Why this migration is needed ──────────────────────────────────────────
-- The existing `print_jobs` table (migration_010.sql) was built for exactly
-- one document shape: a kitchen ticket tied to ONE order
-- (`order_id TEXT NOT NULL REFERENCES orders(id)`). A Dine-In CUSTOMER BILL
-- is not tied to one order — it is the sum of every valid order on a
-- customer_tab (QR-placed, waiter-placed, Order More rounds — all of them).
-- There is no single `orders.id` a dine-in bill's print_jobs row could
-- reference, so `order_id` must become optional and a new `tab_id` column
-- is added for that case. Pickup and Delivery bills/receipts stay
-- order-scoped (a Pickup/Delivery "session" is already one order — see the
-- Order More work, which deliberately keeps all rounds on the same
-- order_id) and continue to use `order_id` exactly as kitchen tickets do.
--
-- What this migration does NOT do, and why:
--   - Does NOT add new `job_type` values. 'kot' vs 'receipt' already
--     distinguishes "operational kitchen document" from "financial
--     customer-facing document" at the coarse level the DB needs to care
--     about. The finer distinction the task asks for — KITCHEN_TICKET vs
--     CUSTOMER_BILL (unpaid) vs CUSTOMER_RECEIPT (paid) — is carried in the
--     existing flexible `payload` JSONB as a new `docType` field (see
--     lib/billing-server.ts), which needs no schema change at all and
--     can't break anything reading `job_type`.
--   - Does NOT create a receipt/snapshot table. A CLOSED customer_tab and a
--     COMPLETED/DELIVERED order are never mutated again by any existing
--     code path in this app — their stored orders/order_items/discount/
--     coupon_discount/payment_method values are already a permanent,
--     immutable record. Re-deriving the bill from them at print time
--     (rather than freezing a separate copy) is therefore already exactly
--     as "immutable" as a snapshot table would be, with no duplicate data
--     store to keep in sync.
--
-- ── What IS added ──────────────────────────────────────────────────────────
--   1. print_jobs.order_id becomes nullable (a tab-level bill has no single
--      order to reference).
--   2. print_jobs.tab_id (nullable FK to customer_tabs) — set for a
--      Dine-In bill/receipt job, NULL for every kitchen ticket and every
--      Pickup/Delivery bill/receipt job (unchanged from today).
--   3. A CHECK constraint requiring at least one of order_id/tab_id to be
--      set — every print job must still be traceable to something.
--   4. print_jobs.idempotency_key + a partial unique index on
--      (restaurant_id, idempotency_key) — same pattern as orders
--      (migration_021), vendor_payments/salary_payments (migration_023),
--      and order_events (migration_026). A double-click or network retry
--      of one "Print Bill" action must create exactly one print job; an
--      intentional "Reprint" sends a fresh key so it's allowed to create
--      another.
-- ============================================================

-- ── 1. order_id becomes optional ────────────────────────────────────────────
ALTER TABLE print_jobs ALTER COLUMN order_id DROP NOT NULL;

-- ── 2. tab_id — the Dine-In bill/receipt target ─────────────────────────────
ALTER TABLE print_jobs ADD COLUMN IF NOT EXISTS tab_id TEXT REFERENCES customer_tabs(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_print_jobs_tab ON print_jobs(tab_id);

-- ── 3. Require order_id OR tab_id ───────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE print_jobs ADD CONSTRAINT print_jobs_order_or_tab_chk
    CHECK (order_id IS NOT NULL OR tab_id IS NOT NULL);
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 4. Idempotency ───────────────────────────────────────────────────────────
ALTER TABLE print_jobs ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_print_jobs_restaurant_idem
  ON print_jobs (restaurant_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
