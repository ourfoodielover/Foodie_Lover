-- ============================================================
-- Migration 019 — Admin Finance & Cash Flow Management
-- Foodie Lover POS
--
-- Run in Supabase SQL editor:
--   https://supabase.com/dashboard/project/<project>/sql/new
--
-- SAFE TO RUN: 100% additive. No existing table is altered, renamed
-- or dropped. No existing column, constraint, or row is touched.
-- Every statement is idempotent (IF NOT EXISTS / DO $$ EXCEPTION
-- WHEN duplicate_* THEN NULL $$) so this migration can be re-run
-- safely if it partially fails.
--
-- WHY THIS EXISTS
-- -------------------------------------------------------------
-- Adds a self-contained "Cash Flow / Finance" ledger for the Admin
-- portal. Deliberately does NOT duplicate any existing source of
-- truth:
--   • "System Sales" (revenue from orders/customer_tabs) is NEVER
--     stored here — the Finance API computes it live from the
--     existing `orders` and `customer_tabs` tables on every request,
--     so it can never drift out of sync with order edits/deletions
--     and never double-counts revenue that already lives elsewhere.
--   • Manager-logged operating expenses continue to live in the
--     existing `expenses` table (unchanged) — Finance reads it live,
--     it does not copy or shadow it.
--   • `staff` (existing table) is reused for salary configuration —
--     no duplicate staff/employee table is created.
--
-- NEW TABLES (10):
--   finance_accounts        — admin-defined money "buckets"
--                              (Cash Drawer, Bank/UPI, etc.)
--   finance_categories       — income/expense categories for the
--                              manual ledger (separate from, and
--                              does not replace, EXPENSE_CATEGORIES
--                              used by the existing Manager Expenses
--                              feature)
--   finance_transactions      — manual income/expense/transfer/
--                              adjustment ledger entries. Vendor
--                              payments and salary payments also post
--                              one linked row here automatically so
--                              Admin never has to double-enter them.
--   finance_audit_log        — append-only audit trail for every
--                              create/edit/void across the tables
--                              below — satisfies "no silent rewrite
--                              of financial history".
--   vendors                  — supplier directory.
--   vendor_purchases         — goods/services received on credit
--                              (a payable). Receiving goods does NOT
--                              imply payment — see `status`.
--   vendor_payments          — one or more partial payments against
--                              a vendor_purchase.
--   staff_salary_config      — per-staff salary rate history
--                              (FK → existing `staff` table).
--   salary_payments          — individual salary disbursements.
--   daily_finance_closings   — a frozen daily snapshot for the
--                              closing workflow. Does not lock the
--                              underlying data — Admin can still
--                              edit historical entries; the Finance
--                              UI compares the live totals against
--                              the snapshot and flags
--                              "Modified after closing".
-- ============================================================

-- ─── 1. finance_accounts ──────────────────────────────────────────────────────
-- A "bucket" of money Admin tracks (cash drawer, bank account, UPI, etc.).
-- payment_method_keywords lets the system auto-attribute completed
-- order/tab revenue to an account by matching against the free-text
-- orders.payment_method / customer_tabs.payment_method values already
-- used across the app (e.g. 'cod','upi','card','gpay','phonepe','paytm',
-- or combined split strings like "Cash ₹500 + UPI ₹300").

CREATE TABLE IF NOT EXISTS finance_accounts (
  id                      TEXT          PRIMARY KEY,
  restaurant_id           TEXT          NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name                    TEXT          NOT NULL,
  type                    TEXT          NOT NULL DEFAULT 'cash'
                                        CHECK (type IN ('cash','bank','digital','other')),
  opening_balance         NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method_keywords TEXT[]        NOT NULL DEFAULT '{}',
  is_default              BOOLEAN       NOT NULL DEFAULT FALSE,
  is_active               BOOLEAN       NOT NULL DEFAULT TRUE,
  sort_order              INTEGER       NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finance_accounts_rest ON finance_accounts(restaurant_id, is_active);

ALTER TABLE finance_accounts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "all_access" ON finance_accounts FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Seed two starter accounts so the Finance UI is usable immediately.
-- Admin can rename/add/deactivate accounts freely — this is just a sane default.
INSERT INTO finance_accounts (id, restaurant_id, name, type, payment_method_keywords, is_default, sort_order)
VALUES
  ('FACC_cash_default', 'rest_default', 'Cash Drawer',  'cash',    ARRAY['cod','cash','admin_override'], TRUE,  1),
  ('FACC_bank_default', 'rest_default', 'Bank / UPI',   'digital', ARRAY['upi','card','gpay','phonepe','paytm'], FALSE, 2)
ON CONFLICT (id) DO NOTHING;

-- ─── 2. finance_categories ────────────────────────────────────────────────────
-- Income/expense categories for the manual Finance ledger. Distinct from
-- EXPENSE_CATEGORIES (lib/api.ts) which continues to power the existing,
-- unchanged Manager Expenses feature — the two lists are independent so
-- neither feature has to change to accommodate the other.

CREATE TABLE IF NOT EXISTS finance_categories (
  id            TEXT        PRIMARY KEY,
  restaurant_id TEXT        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,
  kind          TEXT        NOT NULL CHECK (kind IN ('income','expense')),
  color         TEXT,
  archived      BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (restaurant_id, name, kind)
);

ALTER TABLE finance_categories ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "all_access" ON finance_categories FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO finance_categories (id, restaurant_id, name, kind, color) VALUES
  ('FCAT_inc_other',    'rest_default', 'Other Income',      'income',  '#16a34a'),
  ('FCAT_inc_refund',   'rest_default', 'Refund Reversal',    'income',  '#0ea5e9'),
  ('FCAT_inc_deposit',  'rest_default', 'Owner Deposit',      'income',  '#2563eb'),
  ('FCAT_exp_ingred',   'rest_default', 'Ingredients',        'expense', '#f59e0b'),
  ('FCAT_exp_util',     'rest_default', 'Utilities',          'expense', '#3b82f6'),
  ('FCAT_exp_wages',    'rest_default', 'Staff Wages',        'expense', '#8b5cf6'),
  ('FCAT_exp_rent',     'rest_default', 'Rent',               'expense', '#ef4444'),
  ('FCAT_exp_equip',    'rest_default', 'Equipment',          'expense', '#10b981'),
  ('FCAT_exp_mktg',     'rest_default', 'Marketing',          'expense', '#ec4899'),
  ('FCAT_exp_maint',    'rest_default', 'Maintenance',        'expense', '#f97316'),
  ('FCAT_exp_pack',     'rest_default', 'Packaging',          'expense', '#0284c7'),
  ('FCAT_exp_vendor',   'rest_default', 'Vendor Payment',     'expense', '#6b21a8'),
  ('FCAT_exp_salary',   'rest_default', 'Staff Salary',       'expense', '#7c3aed'),
  ('FCAT_exp_bank',     'rest_default', 'Bank Charges',       'expense', '#64748b'),
  ('FCAT_exp_tax',      'rest_default', 'Taxes & Licenses',   'expense', '#334155'),
  ('FCAT_exp_other',    'rest_default', 'Other',              'expense', '#6b7280')
ON CONFLICT (restaurant_id, name, kind) DO NOTHING;

-- ─── 3. finance_transactions ──────────────────────────────────────────────────
-- The manual/adjustment ledger. Does NOT include system sales (computed live
-- from orders/customer_tabs) or Manager-logged operating expenses (read live
-- from the existing `expenses` table). vendor_payments and salary_payments
-- each post exactly one linked row here (source + source_id) so every cash
-- movement appears in one unified Transactions view without duplicate entry.
--
-- Editing/voiding: rows are never hard-deleted. "Deleting" a transaction sets
-- is_voided = TRUE (excluded from totals but kept for the audit trail).
-- Every create/update/void is additionally logged to finance_audit_log.

CREATE TABLE IF NOT EXISTS finance_transactions (
  id                      TEXT          PRIMARY KEY,
  restaurant_id           TEXT          NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  type                    TEXT          NOT NULL CHECK (type IN ('income','expense','transfer','adjustment')),
  account_id              TEXT          NOT NULL REFERENCES finance_accounts(id),
  transfer_to_account_id  TEXT          REFERENCES finance_accounts(id),
  category_id             TEXT          REFERENCES finance_categories(id),
  amount                  NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  description              TEXT,
  occurred_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  source                  TEXT          NOT NULL DEFAULT 'manual'
                                        CHECK (source IN ('manual','vendor_payment','salary_payment','reconciliation')),
  source_id               TEXT,
  created_by              TEXT,
  created_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  is_voided               BOOLEAN       NOT NULL DEFAULT FALSE,
  voided_at               TIMESTAMPTZ,
  voided_by               TEXT,
  voided_reason           TEXT
);

CREATE INDEX IF NOT EXISTS idx_finance_tx_rest_date ON finance_transactions(restaurant_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_finance_tx_account    ON finance_transactions(account_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_finance_tx_source      ON finance_transactions(source, source_id);
CREATE INDEX IF NOT EXISTS idx_finance_tx_active      ON finance_transactions(restaurant_id, occurred_at DESC) WHERE is_voided = FALSE;

ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "all_access" ON finance_transactions FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 4. finance_audit_log ─────────────────────────────────────────────────────
-- Append-only. Every create/update/void/close/reopen across the Finance
-- feature writes one row here with a before/after JSON snapshot.

CREATE TABLE IF NOT EXISTS finance_audit_log (
  id            TEXT        PRIMARY KEY,
  restaurant_id TEXT        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  entity_type   TEXT        NOT NULL,
  entity_id     TEXT        NOT NULL,
  action        TEXT        NOT NULL,
  changed_by    TEXT,
  changed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  before_data   JSONB,
  after_data    JSONB,
  note          TEXT
);

CREATE INDEX IF NOT EXISTS idx_finance_audit_entity ON finance_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_finance_audit_rest    ON finance_audit_log(restaurant_id, changed_at DESC);

ALTER TABLE finance_audit_log ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "all_access" ON finance_audit_log FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 5. vendors ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vendors (
  id            TEXT        PRIMARY KEY,
  restaurant_id TEXT        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,
  contact_name  TEXT,
  phone         TEXT,
  email         TEXT,
  notes         TEXT,
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendors_rest ON vendors(restaurant_id, is_active);

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "all_access" ON vendors FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 6. vendor_purchases ──────────────────────────────────────────────────────
-- A payable: goods/services received from a vendor. Receiving goods does NOT
-- mean they were paid for — status starts 'unpaid' and only moves to
-- 'partially_paid' / 'paid' as vendor_payments rows are recorded against it.

CREATE TABLE IF NOT EXISTS vendor_purchases (
  id            TEXT          PRIMARY KEY,
  restaurant_id TEXT          NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  vendor_id     TEXT          NOT NULL REFERENCES vendors(id),
  description   TEXT          NOT NULL,
  amount        NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  amount_paid   NUMERIC(12,2) NOT NULL DEFAULT 0,
  purchase_date TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  status        TEXT          NOT NULL DEFAULT 'unpaid'
                              CHECK (status IN ('unpaid','partially_paid','paid')),
  created_by    TEXT,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  is_voided     BOOLEAN       NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_vendor_purchases_vendor ON vendor_purchases(vendor_id, purchase_date DESC);
CREATE INDEX IF NOT EXISTS idx_vendor_purchases_rest   ON vendor_purchases(restaurant_id, status);

ALTER TABLE vendor_purchases ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "all_access" ON vendor_purchases FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 7. vendor_payments ───────────────────────────────────────────────────────
-- One or more partial payments against a vendor_purchase. Each insert here
-- also posts one linked finance_transactions row (source='vendor_payment')
-- and updates the parent vendor_purchases.amount_paid/status — done together
-- in the API route, inside a best-effort sequential write (Supabase JS has no
-- multi-statement transaction API; see route comments for the ordering used
-- to keep these consistent).

CREATE TABLE IF NOT EXISTS vendor_payments (
  id                 TEXT          PRIMARY KEY,
  restaurant_id      TEXT          NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  vendor_purchase_id TEXT          NOT NULL REFERENCES vendor_purchases(id),
  vendor_id          TEXT          NOT NULL REFERENCES vendors(id),
  account_id         TEXT          NOT NULL REFERENCES finance_accounts(id),
  amount             NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  paid_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  note               TEXT,
  created_by         TEXT,
  created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  is_voided          BOOLEAN       NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_vendor_payments_purchase ON vendor_payments(vendor_purchase_id);
CREATE INDEX IF NOT EXISTS idx_vendor_payments_vendor   ON vendor_payments(vendor_id, paid_at DESC);

ALTER TABLE vendor_payments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "all_access" ON vendor_payments FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 8. staff_salary_config ───────────────────────────────────────────────────
-- Reuses the EXISTING `staff` table (no duplicate employee table). Each rate
-- change inserts a NEW row and marks the previous one is_active=false, so
-- historical rates remain visible instead of being overwritten.

CREATE TABLE IF NOT EXISTS staff_salary_config (
  id             TEXT          PRIMARY KEY,
  restaurant_id  TEXT          NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  staff_id       TEXT          NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  salary_type    TEXT          NOT NULL DEFAULT 'monthly'
                               CHECK (salary_type IN ('monthly','daily','hourly')),
  amount         NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  effective_from TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  is_active      BOOLEAN       NOT NULL DEFAULT TRUE,
  created_by     TEXT,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_salary_config_staff ON staff_salary_config(staff_id, is_active);

ALTER TABLE staff_salary_config ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "all_access" ON staff_salary_config FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 9. salary_payments ───────────────────────────────────────────────────────
-- Each insert here also posts one linked finance_transactions row
-- (source='salary_payment') — Admin never has to separately create a matching
-- expense for the same salary payment.

CREATE TABLE IF NOT EXISTS salary_payments (
  id               TEXT          PRIMARY KEY,
  restaurant_id    TEXT          NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  staff_id         TEXT          NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  salary_config_id TEXT          REFERENCES staff_salary_config(id),
  account_id       TEXT          NOT NULL REFERENCES finance_accounts(id),
  period_label     TEXT          NOT NULL,
  amount           NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  paid_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  note             TEXT,
  created_by       TEXT,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  is_voided        BOOLEAN       NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_salary_payments_staff ON salary_payments(staff_id, paid_at DESC);

ALTER TABLE salary_payments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "all_access" ON salary_payments FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 10. daily_finance_closings ───────────────────────────────────────────────
-- A frozen snapshot for the End-of-Day closing workflow. Closing a day does
-- NOT lock any underlying row — Admin retains full edit access everywhere
-- (per requirement: never permanently lock the owner out of their own data).
-- Instead, the Finance UI recomputes live totals for `business_date` on every
-- view and diffs them against `snapshot`; a mismatch renders a
-- "⚠️ Modified after closing" indicator. Re-closing updates the snapshot and
-- is itself logged to finance_audit_log (action='close_day', repeat close).

CREATE TABLE IF NOT EXISTS daily_finance_closings (
  id            TEXT        PRIMARY KEY,
  restaurant_id TEXT        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  business_date DATE        NOT NULL,
  snapshot      JSONB       NOT NULL,
  is_closed     BOOLEAN     NOT NULL DEFAULT TRUE,
  closed_by     TEXT,
  closed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reopened_by   TEXT,
  reopened_at   TIMESTAMPTZ,
  notes         TEXT,
  UNIQUE (restaurant_id, business_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_closings_rest_date ON daily_finance_closings(restaurant_id, business_date DESC);

ALTER TABLE daily_finance_closings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "all_access" ON daily_finance_closings FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Realtime publication (matches the pattern used for every other table) ────

DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE finance_accounts;        EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE finance_categories;      EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE finance_transactions;    EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE finance_audit_log;       EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE vendors;                 EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE vendor_purchases;        EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE vendor_payments;         EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE staff_salary_config;     EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE salary_payments;         EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE daily_finance_closings;  EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;

-- ============================================================
-- Verification (run after applying):
-- ============================================================
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_name IN (
--   'finance_accounts','finance_categories','finance_transactions',
--   'finance_audit_log','vendors','vendor_purchases','vendor_payments',
--   'staff_salary_config','salary_payments','daily_finance_closings'
-- );
-- SELECT * FROM finance_accounts;
-- SELECT * FROM finance_categories ORDER BY kind, name;
-- ============================================================
-- END OF MIGRATION 019
-- ============================================================
