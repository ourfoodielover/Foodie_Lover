-- ============================================================
-- Migration 024 — Test Data Reset (pre-production "start clean" tool)
-- Foodie Lover POS
--
-- Run in Supabase SQL editor:
--   https://supabase.com/dashboard/project/<project>/sql/new
--
-- SAFE TO RE-RUN: every statement uses IF NOT EXISTS / CREATE OR REPLACE.
-- APPLYING THIS MIGRATION ITSELF DELETES NOTHING — it only creates the
-- audit table and two functions (one read-only, one destructive) the app can
-- call. The actual reset only runs when an Admin explicitly triggers it from
-- Admin → Danger Zone → Reset Test Data (session + Finance PIN + typed
-- "RESET TEST DATA" confirmation, all enforced in
-- app/api/admin/reset-test-data/route.ts BEFORE execute_test_data_reset is
-- ever called).
--
-- ── What this migration does ──────────────────────────────────────────────
-- Adds:
--   1. test_data_resets — a permanent log of every reset event. Itself NEVER
--      cleared by any reset, including future ones.
--   2. preview_test_data_reset(p_restaurant_id) — READ-ONLY. Counts every
--      row that a reset would remove and sums the key Finance/Manager
--      amounts, without deleting anything. Used both for the pre-reset
--      preview shown to the admin AND, called again after a reset, as the
--      post-reset verification summary — the same function both times means
--      "what will be removed" and "confirm it's gone" are guaranteed to
--      agree on what they're counting.
--   3. execute_test_data_reset(...) — the actual destructive operation.
--      Calls preview_test_data_reset() first (for the audit-record snapshot),
--      then deletes every table holding TEST TRANSACTIONAL/OPERATIONAL data
--      for one restaurant, in FK-safe order, inside a single Postgres
--      transaction — if anything in the middle raises, the whole reset rolls
--      back automatically and nothing is half-deleted.
--
-- ── Explicitly PRESERVED (never touched by either function) ──────────────
-- restaurants, staff, tables (rows — only `status` is reset to 'available',
-- the row itself stays), menu_items, restaurant_settings (PINs/security Q&A),
-- finance_accounts (only opening_balance/config — never balances-in-use,
-- since balances are computed live, not stored), finance_categories, vendors,
-- staff_salary_config, spin_config, spin_rewards. The legacy, already-unused
-- `settings` table (superseded by restaurant_settings — see the codebase
-- reference doc's dead-code section) is also left untouched; it is out of
-- scope, not "test data".
--
-- ── Cleared (test transactional/operational data) ─────────────────────────
-- reward_coupons, spin_results, email_log, email_queue, order_feedback,
-- order_issues, print_jobs, order_items, order_events, waiter_calls,
-- tab_devices, split_bills, orders, customer_tabs, shift_logs, expenses
-- (Manager Expenses), vendor_payments, vendor_purchases, finance_transactions,
-- salary_payments, daily_finance_closings, finance_audit_log.
--
-- ── Scoping note ───────────────────────────────────────────────────────────
-- Every table above except reward_coupons and spin_results has its own
-- restaurant_id column and is counted/deleted with
-- `WHERE restaurant_id = p_restaurant_id` directly. reward_coupons and
-- spin_results have no restaurant_id column at all (verified directly
-- against migration_011.sql/012.sql) — they are scoped instead via their
-- order_id/tab_id back-references into orders/customer_tabs, which ARE
-- restaurant-scoped, rather than deleted unconditionally (the existing
-- app/api/orders/clear route does delete these two unconditionally, which is
-- harmless only because this app is single-tenant in practice — these
-- functions are deliberately more precise since they are a fresh
-- implementation).
-- ============================================================

-- ── 1. test_data_resets — permanent audit record, never cleared ───────────

CREATE TABLE IF NOT EXISTS test_data_resets (
  id                TEXT        PRIMARY KEY,
  restaurant_id     TEXT        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  performed_by_role TEXT        NOT NULL,
  staff_id          TEXT,                    -- NULL for shared-PIN admin login (no per-account identity — see H4 in the codebase reference doc)
  performed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  counts            JSONB       NOT NULL,     -- rows removed per table (snapshot taken before deletion)
  amounts           JSONB       NOT NULL,     -- raw Finance/Manager amounts removed (snapshot taken before deletion)
  note              TEXT
);

CREATE INDEX IF NOT EXISTS idx_test_data_resets_rest ON test_data_resets(restaurant_id, performed_at DESC);

ALTER TABLE test_data_resets ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "all_access" ON test_data_resets FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 2. preview_test_data_reset — read-only snapshot ────────────────────────
-- Used for BOTH the pre-reset admin preview and the post-reset verification
-- (called again after execute_test_data_reset commits — every count/amount
-- below should read 0 the second time).

CREATE OR REPLACE FUNCTION public.preview_test_data_reset(p_restaurant_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c_orders            INTEGER;
  c_customer_tabs     INTEGER;
  c_order_items       INTEGER;
  c_order_events      INTEGER;
  c_order_issues      INTEGER;
  c_order_feedback    INTEGER;
  c_print_jobs        INTEGER;
  c_email_queue       INTEGER;
  c_email_log         INTEGER;
  c_waiter_calls      INTEGER;
  c_tab_devices       INTEGER;
  c_split_bills       INTEGER;
  c_spin_results      INTEGER;
  c_reward_coupons    INTEGER;
  c_shift_logs        INTEGER;
  c_expenses          INTEGER;
  c_finance_tx        INTEGER;
  c_finance_audit     INTEGER;
  c_vendor_payments   INTEGER;
  c_vendor_purchases  INTEGER;
  c_salary_payments   INTEGER;
  c_daily_closings    INTEGER;
  c_occupied_tables   INTEGER;

  a_system_sales_gross   NUMERIC(14,2);
  a_system_sales_disc    NUMERIC(14,2);
  a_system_sales_net     NUMERIC(14,2);
  a_manager_expenses     NUMERIC(14,2);
  a_finance_income       NUMERIC(14,2);
  a_finance_expense      NUMERIC(14,2);
  a_vendor_paid          NUMERIC(14,2);
  a_salary_paid          NUMERIC(14,2);

  v_counts  JSONB;
  v_amounts JSONB;
BEGIN
  SELECT COUNT(*) INTO c_orders        FROM orders        WHERE restaurant_id = p_restaurant_id;
  SELECT COUNT(*) INTO c_customer_tabs FROM customer_tabs WHERE restaurant_id = p_restaurant_id;

  SELECT COUNT(*) INTO c_order_items
    FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE restaurant_id = p_restaurant_id);
  SELECT COUNT(*) INTO c_order_events
    FROM order_events WHERE order_id IN (SELECT id FROM orders WHERE restaurant_id = p_restaurant_id);
  SELECT COUNT(*) INTO c_order_feedback
    FROM order_feedback WHERE order_id IN (SELECT id FROM orders WHERE restaurant_id = p_restaurant_id);
  SELECT COUNT(*) INTO c_email_queue
    FROM email_queue WHERE order_id IN (SELECT id FROM orders WHERE restaurant_id = p_restaurant_id);
  SELECT COUNT(*) INTO c_email_log
    FROM email_log WHERE order_id IN (SELECT id FROM orders WHERE restaurant_id = p_restaurant_id);
  SELECT COUNT(*) INTO c_spin_results
    FROM spin_results
    WHERE order_id IN (SELECT id FROM orders WHERE restaurant_id = p_restaurant_id)
       OR tab_id   IN (SELECT id FROM customer_tabs WHERE restaurant_id = p_restaurant_id);
  SELECT COUNT(*) INTO c_reward_coupons
    FROM reward_coupons
    WHERE spin_id IN (
            SELECT id FROM spin_results
            WHERE order_id IN (SELECT id FROM orders WHERE restaurant_id = p_restaurant_id)
               OR tab_id   IN (SELECT id FROM customer_tabs WHERE restaurant_id = p_restaurant_id)
          )
       OR source_order_id IN (SELECT id FROM orders WHERE restaurant_id = p_restaurant_id)
       OR source_tab_id   IN (SELECT id FROM customer_tabs WHERE restaurant_id = p_restaurant_id);

  SELECT COUNT(*) INTO c_order_issues     FROM order_issues     WHERE restaurant_id = p_restaurant_id;
  SELECT COUNT(*) INTO c_print_jobs       FROM print_jobs       WHERE restaurant_id = p_restaurant_id;
  SELECT COUNT(*) INTO c_waiter_calls     FROM waiter_calls     WHERE restaurant_id = p_restaurant_id;
  SELECT COUNT(*) INTO c_tab_devices      FROM tab_devices      WHERE restaurant_id = p_restaurant_id;
  SELECT COUNT(*) INTO c_split_bills      FROM split_bills      WHERE restaurant_id = p_restaurant_id;
  SELECT COUNT(*) INTO c_shift_logs       FROM shift_logs       WHERE restaurant_id = p_restaurant_id;
  SELECT COUNT(*) INTO c_expenses         FROM expenses         WHERE restaurant_id = p_restaurant_id;
  SELECT COUNT(*) INTO c_finance_tx       FROM finance_transactions   WHERE restaurant_id = p_restaurant_id;
  SELECT COUNT(*) INTO c_finance_audit    FROM finance_audit_log      WHERE restaurant_id = p_restaurant_id;
  SELECT COUNT(*) INTO c_vendor_payments  FROM vendor_payments        WHERE restaurant_id = p_restaurant_id;
  SELECT COUNT(*) INTO c_vendor_purchases FROM vendor_purchases       WHERE restaurant_id = p_restaurant_id;
  SELECT COUNT(*) INTO c_salary_payments  FROM salary_payments        WHERE restaurant_id = p_restaurant_id;
  SELECT COUNT(*) INTO c_daily_closings   FROM daily_finance_closings WHERE restaurant_id = p_restaurant_id;
  SELECT COUNT(*) INTO c_occupied_tables  FROM tables WHERE restaurant_id = p_restaurant_id AND status <> 'available';

  -- System Sales — same recognition rule as computeSystemSales() in
  -- lib/finance-server.ts (closed tabs net of discount+coupon_discount, plus
  -- completed non-tab orders), computed here in raw SQL. The admin-facing
  -- preview/verification UI additionally calls the TS function directly so
  -- the displayed figure is guaranteed to match Finance/Manager/Admin
  -- pixel-for-pixel; this SQL figure is used for the audit-record snapshot.
  SELECT COALESCE(SUM(total), 0), COALESCE(SUM(discount + coupon_discount), 0)
    INTO a_system_sales_gross, a_system_sales_disc
    FROM customer_tabs WHERE restaurant_id = p_restaurant_id AND status = 'closed';
  a_system_sales_gross := a_system_sales_gross + COALESCE((
    SELECT SUM(COALESCE(subtotal, total)) FROM orders
    WHERE restaurant_id = p_restaurant_id AND status = 'completed' AND tab_id IS NULL
  ), 0);
  a_system_sales_disc := a_system_sales_disc + COALESCE((
    SELECT SUM(discount) FROM orders
    WHERE restaurant_id = p_restaurant_id AND status = 'completed' AND tab_id IS NULL
  ), 0);
  a_system_sales_net := GREATEST(0, a_system_sales_gross - a_system_sales_disc);

  SELECT COALESCE(SUM(amount), 0) INTO a_manager_expenses FROM expenses WHERE restaurant_id = p_restaurant_id;

  SELECT COALESCE(SUM(amount) FILTER (WHERE type = 'income'),  0),
         COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0)
    INTO a_finance_income, a_finance_expense
    FROM finance_transactions WHERE restaurant_id = p_restaurant_id AND is_voided = FALSE;

  SELECT COALESCE(SUM(amount), 0) INTO a_vendor_paid FROM vendor_payments WHERE restaurant_id = p_restaurant_id AND is_voided = FALSE;
  SELECT COALESCE(SUM(amount), 0) INTO a_salary_paid FROM salary_payments WHERE restaurant_id = p_restaurant_id AND is_voided = FALSE;

  v_counts := jsonb_build_object(
    'orders', c_orders, 'customerTabs', c_customer_tabs, 'orderItems', c_order_items,
    'orderEvents', c_order_events, 'orderIssues', c_order_issues, 'orderFeedback', c_order_feedback,
    'printJobs', c_print_jobs, 'emailQueue', c_email_queue, 'emailLog', c_email_log,
    'waiterCalls', c_waiter_calls, 'tabDevices', c_tab_devices, 'splitBills', c_split_bills,
    'spinResults', c_spin_results, 'rewardCoupons', c_reward_coupons,
    'shiftLogs', c_shift_logs, 'managerExpenses', c_expenses,
    'financeTransactions', c_finance_tx, 'financeAuditLog', c_finance_audit,
    'vendorPayments', c_vendor_payments, 'vendorPurchases', c_vendor_purchases,
    'salaryPayments', c_salary_payments, 'dailyClosings', c_daily_closings,
    'occupiedTables', c_occupied_tables
  );
  v_amounts := jsonb_build_object(
    'systemSalesGross', a_system_sales_gross, 'systemSalesDiscount', a_system_sales_disc,
    'systemSalesNet', a_system_sales_net, 'managerExpenses', a_manager_expenses,
    'financeIncome', a_finance_income, 'financeExpense', a_finance_expense,
    'vendorPaid', a_vendor_paid, 'salaryPaid', a_salary_paid,
    'netCashFlow', a_system_sales_net + a_finance_income - a_manager_expenses - a_finance_expense
  );

  RETURN jsonb_build_object('counts', v_counts, 'amounts', v_amounts);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.preview_test_data_reset FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.preview_test_data_reset TO service_role;

-- ── 3. execute_test_data_reset ─────────────────────────────────────────────
-- Single-transaction, FK-safe deletion of every test-transactional table for
-- one restaurant. p_performed_by_role/p_staff_id/p_note are for the audit
-- record only — this function does NOT itself check any authorization; the
-- calling route is fully responsible for verifying an admin session, the
-- Finance PIN, and the typed confirmation phrase BEFORE calling this. EXECUTE
-- is revoked from PUBLIC below so the anon/authenticated Supabase roles can
-- never invoke this directly even with the anon key — only the server-role
-- backend client (which the browser never has) can call it.

CREATE OR REPLACE FUNCTION public.execute_test_data_reset(
  p_restaurant_id     TEXT,
  p_performed_by_role TEXT,
  p_staff_id          TEXT,
  p_note              TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reset_id  TEXT := 'TDR_' || extract(epoch from clock_timestamp())::bigint || '_' || substr(md5(random()::text), 1, 8);
  v_snapshot  JSONB;
BEGIN
  -- Snapshot BEFORE any DELETE runs — same function used for the pre-reset
  -- preview, so the counts/amounts this reset reports removing are exactly
  -- what the admin was shown before they confirmed.
  v_snapshot := public.preview_test_data_reset(p_restaurant_id);

  -- ── Delete children before parents, in FK-safe order ─────────────────────

  DELETE FROM reward_coupons
    WHERE spin_id IN (
            SELECT id FROM spin_results
            WHERE order_id IN (SELECT id FROM orders WHERE restaurant_id = p_restaurant_id)
               OR tab_id   IN (SELECT id FROM customer_tabs WHERE restaurant_id = p_restaurant_id)
          )
       OR source_order_id IN (SELECT id FROM orders WHERE restaurant_id = p_restaurant_id)
       OR source_tab_id   IN (SELECT id FROM customer_tabs WHERE restaurant_id = p_restaurant_id);

  DELETE FROM spin_results
    WHERE order_id IN (SELECT id FROM orders WHERE restaurant_id = p_restaurant_id)
       OR tab_id   IN (SELECT id FROM customer_tabs WHERE restaurant_id = p_restaurant_id);

  DELETE FROM email_log      WHERE order_id IN (SELECT id FROM orders WHERE restaurant_id = p_restaurant_id);
  DELETE FROM email_queue    WHERE order_id IN (SELECT id FROM orders WHERE restaurant_id = p_restaurant_id);
  DELETE FROM order_feedback WHERE order_id IN (SELECT id FROM orders WHERE restaurant_id = p_restaurant_id);
  DELETE FROM order_issues   WHERE restaurant_id = p_restaurant_id;
  DELETE FROM print_jobs     WHERE restaurant_id = p_restaurant_id;
  DELETE FROM order_items    WHERE order_id IN (SELECT id FROM orders WHERE restaurant_id = p_restaurant_id);
  DELETE FROM order_events   WHERE order_id IN (SELECT id FROM orders WHERE restaurant_id = p_restaurant_id);
  DELETE FROM waiter_calls   WHERE restaurant_id = p_restaurant_id;
  DELETE FROM tab_devices    WHERE restaurant_id = p_restaurant_id;
  DELETE FROM split_bills    WHERE restaurant_id = p_restaurant_id;

  -- Orders before customer_tabs: orders.tab_id → customer_tabs(id) has no
  -- ON DELETE clause (defaults to RESTRICT), so a tab with orders still
  -- attached cannot be deleted first.
  DELETE FROM orders        WHERE restaurant_id = p_restaurant_id;
  DELETE FROM customer_tabs WHERE restaurant_id = p_restaurant_id;

  DELETE FROM shift_logs WHERE restaurant_id = p_restaurant_id;
  DELETE FROM expenses   WHERE restaurant_id = p_restaurant_id;

  -- vendor_payments before vendor_purchases: vendor_payments.vendor_purchase_id
  -- → vendor_purchases(id) has no ON DELETE clause (RESTRICT).
  DELETE FROM vendor_payments  WHERE restaurant_id = p_restaurant_id;
  DELETE FROM vendor_purchases WHERE restaurant_id = p_restaurant_id;

  DELETE FROM finance_transactions   WHERE restaurant_id = p_restaurant_id;
  DELETE FROM salary_payments        WHERE restaurant_id = p_restaurant_id;
  DELETE FROM daily_finance_closings WHERE restaurant_id = p_restaurant_id;

  -- finance_audit_log LAST among Finance tables — its row count was already
  -- captured in v_snapshot above, before this delete.
  DELETE FROM finance_audit_log WHERE restaurant_id = p_restaurant_id;

  -- Tables are CONFIGURATION (preserved as rows) — only their transient
  -- occupancy state is reset, not the rows themselves.
  UPDATE tables SET status = 'available', updated_at = NOW() WHERE restaurant_id = p_restaurant_id;

  -- ── Insert the durable audit record LAST, after everything above ─────────
  -- (a distinct table from finance_audit_log specifically so a *future*
  -- reset's finance_audit_log wipe can never remove the record that *this*
  -- reset happened).
  INSERT INTO test_data_resets (id, restaurant_id, performed_by_role, staff_id, counts, amounts, note)
  VALUES (
    v_reset_id, p_restaurant_id, p_performed_by_role, p_staff_id,
    v_snapshot->'counts', v_snapshot->'amounts', p_note
  );

  RETURN jsonb_build_object(
    'ok', true, 'resetId', v_reset_id,
    'counts', v_snapshot->'counts', 'amounts', v_snapshot->'amounts'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.execute_test_data_reset FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.execute_test_data_reset TO service_role;

-- ============================================================
-- Verification (run after applying — creates nothing destructive itself):
-- ============================================================
-- SELECT proname FROM pg_proc WHERE proname IN ('preview_test_data_reset','execute_test_data_reset');
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'test_data_resets';
-- SELECT preview_test_data_reset('rest_default');   -- read-only, safe to run any time
-- SELECT has_function_privilege('anon', 'public.execute_test_data_reset(text,text,text,text)', 'EXECUTE');       -- expect: false
-- SELECT has_function_privilege('service_role', 'public.execute_test_data_reset(text,text,text,text)', 'EXECUTE'); -- expect: true
