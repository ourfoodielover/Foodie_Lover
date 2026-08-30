-- ============================================================
-- Migration 025 — Employee / Payroll Master (decoupled from Staff login)
-- Foodie Lover POS
--
-- Run in Supabase SQL editor:
--   https://supabase.com/dashboard/project/<project>/sql/new
--
-- SAFE TO RE-RUN: every statement uses IF NOT EXISTS / IF EXISTS /
-- CREATE OR REPLACE / a duplicate_object-tolerant DO block. No existing
-- column, row, or constraint is dropped or destructively altered.
--
-- ── Problem this migration solves ─────────────────────────────────────────
-- Finance → Salaries currently reuses the existing `staff` table (login
-- accounts: waiter/kitchen/delivery/manager/admin, each with a username +
-- PIN) as the payroll identity. That conflates two different concepts:
--   1. Who is allowed to log into the app (an application account).
--   2. Who gets paid a salary (a payroll/HR record).
-- A Head Chef, Cleaner, Security guard, etc. needs #2 without needing #1 —
-- today the only way to track their salary is to create a fake
-- Waiter/Delivery login for them, which the restaurant does not want.
--
-- ── What this migration does ──────────────────────────────────────────────
--   1. Creates `employees` — a payroll/HR master table, independent of
--      `staff`. `employees.role` is free text (any designation, including
--      custom ones) — NOT constrained to staff.role's CHECK
--      ('waiter','kitchen','delivery','manager','admin'), because payroll
--      designations (Head Chef, Cashier, Security, ...) must never be forced
--      to match application login roles.
--   2. Adds an OPTIONAL `linked_staff_id` FK so an employee can (but does not
--      have to) be tied to an existing application `staff` login account —
--      e.g. a Waiter who is both an app user AND draws a salary. Deleting
--      the linked staff account does NOT delete the employee/payroll record
--      (ON DELETE SET NULL — payroll history must survive login-account
--      changes); deleting/deactivating an employee does NOT touch the
--      `staff` row at all (this migration never writes to `staff`).
--   3. Backfills one `employees` row for EVERY existing `staff` row (so
--      every current Waiter/Delivery/etc. account keeps a payroll identity
--      with zero manual re-entry) and links it via `linked_staff_id`.
--      Idempotent — matched by `linked_staff_id`, so re-running this
--      migration does not create duplicates.
--   4. Adds a nullable `employee_id` column (FK → employees) to the EXISTING
--      `staff_salary_config` and `salary_payments` tables, and backfills it
--      on every existing row from the employee created in step 3 — so every
--      pre-existing salary rate and payment becomes reachable by
--      `employee_id` without moving, duplicating, or losing a single row.
--      The existing `staff_id` column on both tables is kept exactly as-is
--      (now nullable, so a non-staff employee's rows can have staff_id NULL)
--      — nothing reads it differently than before.
--   5. Adds `create_employee_salary_payment()`, a new SECURITY DEFINER
--      function modeled directly on the existing, already-relied-upon
--      `create_salary_payment()` (migration_023_finance_atomicity.sql) —
--      same one-linked-finance_transactions-row guarantee, same idempotency
--      pattern — but keyed by `employee_id` (with `staff_id` populated only
--      when the employee happens to be linked). The ORIGINAL
--      `create_salary_payment()` function is left completely untouched; this
--      migration does not edit or replace it, so no existing call path
--      changes behavior. `void_salary_payment()` (also untouched) already
--      works for either kind of payment, since it operates purely on
--      `salary_payments.id`.
--
-- ── Explicitly NOT touched by this migration ──────────────────────────────
-- `staff` table rows/columns, `staff` login/PIN flow, RLS posture (new table
-- follows the SAME tightened default-deny posture migration_022 already put
-- every other table into — RLS enabled, no permissive policy, service_role
-- only), Reset Test Data (migration_024) — `employees` and
-- `staff_salary_config` are configuration/master data and are already
-- preserved by that migration simply because it never references them; see
-- the report delivered alongside this migration for the full explanation of
-- why no change to migration_024 was needed.
-- ============================================================

-- ── 1. employees — payroll/HR master, independent of `staff` logins ───────

CREATE TABLE IF NOT EXISTS employees (
  id              TEXT          PRIMARY KEY,
  restaurant_id   TEXT          NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name            TEXT          NOT NULL,
  role            TEXT          NOT NULL,   -- free-text designation (Head Chef, Cashier, Security, custom, ...) — NOT the staff.role login-role enum
  phone           TEXT,
  email           TEXT,
  joining_date    DATE,
  employment_type TEXT          NOT NULL DEFAULT 'full_time'
                                CHECK (employment_type IN ('full_time','part_time','contract','temporary')),
  linked_staff_id TEXT          REFERENCES staff(id) ON DELETE SET NULL,
  is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
  notes           TEXT,
  created_by      TEXT,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employees_rest ON employees(restaurant_id, is_active);

-- One employee record per linked staff account — prevents the same login
-- from silently gaining two divergent payroll identities.
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_unique_linked_staff
  ON employees(linked_staff_id) WHERE linked_staff_id IS NOT NULL;

-- RLS: enabled, NO policy — same default-deny posture migration_022 already
-- applied to every other table (service_role bypasses RLS entirely; no
-- currently-working code path uses the anon key against tables directly).
-- Deliberately NOT using the older "all_access" permissive-policy pattern
-- from migration_019 — this table is created after migration_022 tightened
-- the posture, so it should start in the CURRENT secure state, not the
-- superseded one.
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- ── 2. Backfill: one employees row per existing staff row ─────────────────
-- Deterministic id (EMP_STF_<staff id>) + a NOT-EXISTS guard on
-- linked_staff_id makes this safe to re-run: a second run finds every staff
-- row already has a linked employee and inserts nothing new.
INSERT INTO employees (
  id, restaurant_id, name, role, employment_type, linked_staff_id, is_active, created_at, updated_at
)
SELECT
  'EMP_STF_' || s.id, s.restaurant_id, s.name, s.role, 'full_time', s.id, s.active, s.created_at, s.created_at
FROM staff s
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE e.linked_staff_id = s.id)
ON CONFLICT (id) DO NOTHING;

-- ── 3. staff_salary_config — add employee_id, keep staff_id (now nullable) ─

ALTER TABLE staff_salary_config ADD COLUMN IF NOT EXISTS employee_id TEXT REFERENCES employees(id);
ALTER TABLE staff_salary_config ALTER COLUMN staff_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_salary_config_employee ON staff_salary_config(employee_id, is_active);

DO $$ BEGIN
  ALTER TABLE staff_salary_config
    ADD CONSTRAINT chk_salary_config_has_owner CHECK (staff_id IS NOT NULL OR employee_id IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Backfill: every existing config row's staff_id already has a matching
-- employee from step 2 — link it. Guarded by `employee_id IS NULL` so a
-- second run is a no-op.
UPDATE staff_salary_config sc
SET employee_id = e.id
FROM employees e
WHERE e.linked_staff_id = sc.staff_id AND sc.employee_id IS NULL;

-- ── 4. salary_payments — add employee_id, keep staff_id (now nullable) ────

ALTER TABLE salary_payments ADD COLUMN IF NOT EXISTS employee_id TEXT REFERENCES employees(id);
ALTER TABLE salary_payments ALTER COLUMN staff_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_salary_payments_employee ON salary_payments(employee_id, paid_at DESC);

DO $$ BEGIN
  ALTER TABLE salary_payments
    ADD CONSTRAINT chk_salary_payments_has_owner CHECK (staff_id IS NOT NULL OR employee_id IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

UPDATE salary_payments sp
SET employee_id = e.id
FROM employees e
WHERE e.linked_staff_id = sp.staff_id AND sp.employee_id IS NULL;

-- ── 5. create_employee_salary_payment ──────────────────────────────────────
-- New function, modeled on the EXISTING create_salary_payment()
-- (migration_023_finance_atomicity.sql), which is left completely untouched
-- by this migration. Same one-transaction, one-linked-finance_transactions-
-- row, idempotency-key-aware guarantee — keyed by employee_id instead of
-- staff_id. p_staff_id is nullable: populated only when the paying employee
-- happens to be linked to a staff login, purely so any future reporting
-- that still looks at salary_payments.staff_id keeps working for those rows.

CREATE OR REPLACE FUNCTION public.create_employee_salary_payment(
  p_payment_id       TEXT,
  p_restaurant_id    TEXT,
  p_employee_id      TEXT,
  p_staff_id         TEXT,
  p_salary_config_id TEXT,
  p_account_id       TEXT,
  p_period_label     TEXT,
  p_amount           NUMERIC,
  p_paid_at          TIMESTAMPTZ,
  p_note             TEXT,
  p_created_by       TEXT,
  p_category_id      TEXT,
  p_description      TEXT,
  p_idempotency_key  TEXT
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

  IF NOT EXISTS (
    SELECT 1 FROM employees WHERE id = p_employee_id AND restaurant_id = p_restaurant_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'employee_not_found');
  END IF;

  INSERT INTO salary_payments (
    id, restaurant_id, staff_id, employee_id, salary_config_id, account_id, period_label,
    amount, paid_at, note, created_by, idempotency_key
  ) VALUES (
    p_payment_id, p_restaurant_id, p_staff_id, p_employee_id, p_salary_config_id, p_account_id, p_period_label,
    p_amount, p_paid_at, p_note, p_created_by, p_idempotency_key
  );

  -- Exactly ONE linked ledger row per payment — identical shape/source to
  -- the existing create_salary_payment(), so computeFinanceSummary's
  -- salaryPaid KPI (lib/finance-server.ts, filters finance_transactions by
  -- source='salary_payment') picks this up automatically with no changes.
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

REVOKE EXECUTE ON FUNCTION public.create_employee_salary_payment FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.create_employee_salary_payment TO service_role;

-- ── Realtime publication (matches the pattern used for every other table) ──

DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE employees; EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;

-- ============================================================
-- Verification (run after applying):
-- ============================================================
-- 1. Table + columns exist:
--   SELECT column_name, data_type, is_nullable FROM information_schema.columns
--   WHERE table_name = 'employees' ORDER BY ordinal_position;
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name IN ('staff_salary_config','salary_payments') AND column_name = 'employee_id';
--
-- 2. Every existing staff member got a linked employee row (should return 0):
--   SELECT s.id, s.name FROM staff s
--   WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE e.linked_staff_id = s.id);
--
-- 3. Every existing salary_config/salary_payments row got backfilled (should return 0 each):
--   SELECT COUNT(*) FROM staff_salary_config WHERE staff_id IS NOT NULL AND employee_id IS NULL;
--   SELECT COUNT(*) FROM salary_payments      WHERE staff_id IS NOT NULL AND employee_id IS NULL;
--
-- 4. No duplicate employees were created by a second run of this migration
--    (row count should match your actual staff-derived + manually-added count):
--   SELECT COUNT(*) FROM employees WHERE id LIKE 'EMP_STF_%';
--
-- 5. New function exists and is locked down the same way the others are:
--   SELECT proname FROM pg_proc WHERE proname = 'create_employee_salary_payment';
--   SELECT has_function_privilege('anon', 'public.create_employee_salary_payment(text,text,text,text,text,text,text,numeric,timestamptz,text,text,text,text,text)', 'EXECUTE'); -- expect: false
-- ============================================================
-- END OF MIGRATION 025
-- ============================================================
