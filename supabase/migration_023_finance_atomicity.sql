-- ============================================================
-- Migration 023 — Atomic + Idempotent Vendor/Salary Finance Writes
-- Foodie Lover POS
--
-- Run in Supabase SQL editor:
--   https://supabase.com/dashboard/project/<project>/sql/new
--
-- SAFE TO RE-RUN: every statement uses IF NOT EXISTS / CREATE OR REPLACE.
--
-- ── What this migration does (remediates master-prompt finding #12) ──────────
-- Recording or voiding a vendor payment or a salary payment previously did
-- 2-3 separate sequential Supabase writes from application code (insert the
-- payment row → update the parent vendor_purchases balance → insert a
-- finance_transactions ledger row; or the mirrored update sequence to void).
-- The Supabase REST client has no multi-table transaction API, so if a later
-- write in that sequence failed, earlier writes stayed committed — e.g. a
-- payment recorded with no ledger entry, or a purchase marked 'paid' with no
-- matching expense in the ledger. Two concurrent payments against the same
-- purchase could also both read a stale `amount_paid` and together overpay
-- past the amount actually owed. Neither `vendor_payments` nor
-- `salary_payments` had an idempotency key, so a client retry after a
-- network timeout (the request may have already succeeded server-side) had
-- no way to detect and skip a duplicate — unlike `orders`, which already has
-- exactly this protection (see migration_021_idempotency.sql).
--
-- This migration:
--   1. Adds a nullable `idempotency_key` column + partial unique index to
--      both tables (same pattern as orders).
--   2. Adds four `SECURITY DEFINER` Postgres functions — one transaction
--      each — that do the full read-validate-write sequence atomically,
--      with a row lock (`FOR UPDATE`) on the parent purchase/payment row so
--      concurrent requests serialize instead of racing on a stale balance.
--      Modeled on the existing perform_spin() pattern (migration_018.sql).
--   3. Expected-outcome cases (not found / already voided / amount exceeds
--      balance / duplicate idempotency key) are returned as a JSONB
--      `{ok:false, error:'...'}` result rather than a raised exception, so
--      the calling route can preserve its existing HTTP status codes
--      (404/409/400) without parsing error-message text. A truly unexpected
--      DB error still raises normally, which rolls back the whole
--      transaction automatically — no write in the sequence can be left
--      half-applied.
--
-- Deliberately NOT changed: which fields the route computes before calling
-- these functions (category lookup, vendor/staff name for the description
-- string) — that presentation logic stays in TypeScript exactly as before;
-- these functions only make the multi-table WRITE atomic, they don't change
-- what gets written.
-- ============================================================

-- ── 1. Idempotency columns ─────────────────────────────────────────────────────

ALTER TABLE vendor_payments  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
ALTER TABLE salary_payments  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_vendor_payments_idempotency_key
  ON vendor_payments (restaurant_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_salary_payments_idempotency_key
  ON salary_payments (restaurant_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ── 2. create_vendor_payment ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.create_vendor_payment(
  p_payment_id        TEXT,
  p_restaurant_id     TEXT,
  p_vendor_purchase_id TEXT,
  p_vendor_id         TEXT,
  p_account_id        TEXT,
  p_amount            NUMERIC,
  p_paid_at           TIMESTAMPTZ,
  p_note              TEXT,
  p_created_by        TEXT,
  p_category_id       TEXT,
  p_description       TEXT,
  p_idempotency_key   TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_id     TEXT;
  v_purchase        vendor_purchases%ROWTYPE;
  v_due_before      NUMERIC;
  v_new_amount_paid NUMERIC;
  v_new_status      TEXT;
BEGIN
  -- Idempotency fast-path: a retried request with the same key returns the
  -- original result instead of creating a second payment.
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_existing_id FROM vendor_payments
      WHERE restaurant_id = p_restaurant_id AND idempotency_key = p_idempotency_key;
    IF v_existing_id IS NOT NULL THEN
      SELECT amount_paid, status INTO v_new_amount_paid, v_new_status
        FROM vendor_purchases WHERE id = p_vendor_purchase_id;
      RETURN jsonb_build_object(
        'ok', true, 'already_exists', true, 'id', v_existing_id,
        'purchaseStatus', v_new_status, 'amountPaid', v_new_amount_paid
      );
    END IF;
  END IF;

  -- Lock the parent purchase row so a concurrent payment against the same
  -- purchase can't read the same stale amount_paid and together overpay.
  SELECT * INTO v_purchase FROM vendor_purchases WHERE id = p_vendor_purchase_id FOR UPDATE;
  IF NOT FOUND OR v_purchase.is_voided THEN
    RETURN jsonb_build_object('ok', false, 'error', 'purchase_not_found');
  END IF;

  v_due_before := v_purchase.amount - v_purchase.amount_paid;
  IF p_amount > v_due_before + 0.01 THEN
    RETURN jsonb_build_object(
      'ok', false, 'error', 'exceeds_balance',
      'dueBefore', v_due_before
    );
  END IF;

  INSERT INTO vendor_payments (
    id, restaurant_id, vendor_purchase_id, vendor_id, account_id, amount,
    paid_at, note, created_by, idempotency_key
  ) VALUES (
    p_payment_id, p_restaurant_id, p_vendor_purchase_id, p_vendor_id, p_account_id, p_amount,
    p_paid_at, p_note, p_created_by, p_idempotency_key
  );

  v_new_amount_paid := round((v_purchase.amount_paid + p_amount)::numeric, 2);
  v_new_status := CASE
    WHEN v_new_amount_paid >= v_purchase.amount - 0.01 THEN 'paid'
    ELSE 'partially_paid'
  END;

  UPDATE vendor_purchases
    SET amount_paid = v_new_amount_paid, status = v_new_status, updated_at = now()
    WHERE id = p_vendor_purchase_id;

  INSERT INTO finance_transactions (
    id, restaurant_id, type, account_id, category_id, amount, description,
    occurred_at, source, source_id, created_by
  ) VALUES (
    'FTXN_' || p_payment_id, p_restaurant_id, 'expense', p_account_id, p_category_id, p_amount,
    p_description, p_paid_at, 'vendor_payment', p_payment_id, p_created_by
  );

  RETURN jsonb_build_object(
    'ok', true, 'id', p_payment_id,
    'purchaseStatus', v_new_status, 'amountPaid', v_new_amount_paid
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_vendor_payment TO service_role;

-- ── 3. void_vendor_payment ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.void_vendor_payment(
  p_payment_id TEXT,
  p_by         TEXT,
  p_reason     TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment         vendor_payments%ROWTYPE;
  v_purchase        vendor_purchases%ROWTYPE;
  v_new_amount_paid NUMERIC;
  v_new_status      TEXT;
BEGIN
  SELECT * INTO v_payment FROM vendor_payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;
  IF v_payment.is_voided THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_voided');
  END IF;

  UPDATE vendor_payments SET is_voided = true WHERE id = p_payment_id;

  SELECT * INTO v_purchase FROM vendor_purchases WHERE id = v_payment.vendor_purchase_id FOR UPDATE;
  IF FOUND THEN
    v_new_amount_paid := GREATEST(0, round((v_purchase.amount_paid - v_payment.amount)::numeric, 2));
    v_new_status := CASE
      WHEN v_new_amount_paid <= 0.01 THEN 'unpaid'
      WHEN v_new_amount_paid >= v_purchase.amount - 0.01 THEN 'paid'
      ELSE 'partially_paid'
    END;
    UPDATE vendor_purchases
      SET amount_paid = v_new_amount_paid, status = v_new_status, updated_at = now()
      WHERE id = v_purchase.id;
  END IF;

  UPDATE finance_transactions
    SET is_voided = true, voided_at = now(), voided_by = p_by,
        voided_reason = COALESCE(p_reason, 'Vendor payment voided')
    WHERE source = 'vendor_payment' AND source_id = p_payment_id;

  RETURN jsonb_build_object('ok', true, 'voidedPaymentBefore', to_jsonb(v_payment));
END;
$$;

GRANT EXECUTE ON FUNCTION public.void_vendor_payment TO service_role;

-- ── 4. create_salary_payment ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.create_salary_payment(
  p_payment_id      TEXT,
  p_restaurant_id   TEXT,
  p_staff_id        TEXT,
  p_salary_config_id TEXT,
  p_account_id      TEXT,
  p_period_label    TEXT,
  p_amount          NUMERIC,
  p_paid_at         TIMESTAMPTZ,
  p_note            TEXT,
  p_created_by      TEXT,
  p_category_id     TEXT,
  p_description     TEXT,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_id TEXT;
BEGIN
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_existing_id FROM salary_payments
      WHERE restaurant_id = p_restaurant_id AND idempotency_key = p_idempotency_key;
    IF v_existing_id IS NOT NULL THEN
      RETURN jsonb_build_object('ok', true, 'already_exists', true, 'id', v_existing_id);
    END IF;
  END IF;

  INSERT INTO salary_payments (
    id, restaurant_id, staff_id, salary_config_id, account_id, period_label,
    amount, paid_at, note, created_by, idempotency_key
  ) VALUES (
    p_payment_id, p_restaurant_id, p_staff_id, p_salary_config_id, p_account_id, p_period_label,
    p_amount, p_paid_at, p_note, p_created_by, p_idempotency_key
  );

  INSERT INTO finance_transactions (
    id, restaurant_id, type, account_id, category_id, amount, description,
    occurred_at, source, source_id, created_by
  ) VALUES (
    'FTXN_' || p_payment_id, p_restaurant_id, 'expense', p_account_id, p_category_id, p_amount,
    p_description, p_paid_at, 'salary_payment', p_payment_id, p_created_by
  );

  RETURN jsonb_build_object('ok', true, 'id', p_payment_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_salary_payment TO service_role;

-- ── 5. void_salary_payment ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.void_salary_payment(
  p_payment_id TEXT,
  p_by         TEXT,
  p_reason     TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment salary_payments%ROWTYPE;
BEGIN
  SELECT * INTO v_payment FROM salary_payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;
  IF v_payment.is_voided THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_voided');
  END IF;

  UPDATE salary_payments SET is_voided = true WHERE id = p_payment_id;

  UPDATE finance_transactions
    SET is_voided = true, voided_at = now(), voided_by = p_by,
        voided_reason = COALESCE(p_reason, 'Salary payment voided')
    WHERE source = 'salary_payment' AND source_id = p_payment_id;

  RETURN jsonb_build_object('ok', true, 'voidedPaymentBefore', to_jsonb(v_payment));
END;
$$;

GRANT EXECUTE ON FUNCTION public.void_salary_payment TO service_role;

-- ============================================================
-- Verification (run after applying)
-- ============================================================
-- Confirm the columns exist:
--   SELECT table_name, column_name FROM information_schema.columns
--   WHERE table_name IN ('vendor_payments','salary_payments')
--     AND column_name = 'idempotency_key';
--
-- Confirm all four functions exist:
--   SELECT proname FROM pg_proc
--   WHERE proname IN ('create_vendor_payment','void_vendor_payment',
--                      'create_salary_payment','void_salary_payment');
--
-- Functional check (read-only — SELECT only, do not run the INSERT/UPDATE
-- example below against production without a disposable test row):
--   -- Example only, do not execute against real data:
--   -- SELECT create_vendor_payment('VPAY_test', 'rest_default', '<real purchase id>',
--   --   '<real vendor id>', '<real account id>', 1.00, now(), 'test', 'test',
--   --   NULL, 'test payment', 'test-idem-key-001');
--   -- then SELECT void_vendor_payment('VPAY_test', 'test', 'cleanup');
-- ============================================================
-- END OF MIGRATION 023 --
