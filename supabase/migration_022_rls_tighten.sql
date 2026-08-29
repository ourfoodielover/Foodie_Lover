-- ============================================================
-- Migration 022 — Tighten Row Level Security (remediate audit finding C2)
-- Foodie Lover POS
--
-- Run in Supabase SQL editor:
--   https://supabase.com/dashboard/project/<project>/sql/new
--
-- SAFE TO RE-RUN: every DROP POLICY uses IF EXISTS.
--
-- ── What this migration does ──────────────────────────────────────────────────
-- Every table in this database currently has a single RLS policy named
-- "all_access" defined as `FOR ALL USING (true) WITH CHECK (true)` — i.e.
-- fully permissive to any Postgres role RLS applies to, including the
-- `anon` role (the public/browser API key).
--
-- This migration DROPS that permissive policy on every table, leaving RLS
-- ENABLED with NO policies. In Postgres, RLS-enabled + zero policies means
-- default-deny for every role RLS applies to.
--
-- ── Why this is safe (verified from the current codebase, not assumed) ───────
--  1. Every server-side Supabase client in this app uses
--     `getServerClient()` (lib/supabase-server.ts), which is constructed
--     with SUPABASE_SERVICE_ROLE_KEY. Supabase's service_role Postgres role
--     has the BYPASSRLS attribute — RLS policies (or their absence) never
--     apply to it. Every API route, all mutations, all reads used by the
--     app's actual server logic are completely unaffected by this
--     migration.
--  2. `lib/supabase.ts` (the ONLY place the anon key is constructed
--     client-side) is used exclusively to open Supabase Realtime broadcast
--     channels (`lib/realtime-client.ts`). Broadcast channels are a pub/sub
--     mechanism, not a Postgres table read/write — they are never subject
--     to table-level RLS policies. Verified via repo-wide search: no
--     component calls `.from(...)` on the anon-key client anywhere.
--  3. Therefore no currently-working code path depends on the anon role
--     being able to read or write these tables directly. The permissive
--     policy was pure unnecessary exposure: today, anyone with the public
--     anon key (visible in any browser's network tab / bundled JS) could
--     issue direct REST calls to Supabase's auto-generated
--     `/rest/v1/<table>` endpoints and read or write every row in every
--     table — including `staff` (PINs), `reward_coupons`, `customer_tabs`
--     (PII, session PINs), and `restaurant_settings` (admin/kitchen/manager
--     PINs before finding C3's protections) — completely bypassing every
--     one of this codebase's own API-route auth checks.
--
-- ── Rollback ───────────────────────────────────────────────────────────────────
-- If something unexpected breaks, the previous behavior can be restored per
-- table with:
--   CREATE POLICY "all_access" ON <table> FOR ALL USING (true) WITH CHECK (true);
-- (This migration does not delete the ENABLE ROW LEVEL SECURITY state, only
-- the policy — no data is touched, no table structure changes.)
-- ============================================================

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'customer_tabs', 'daily_finance_closings', 'email_log', 'email_queue',
    'expenses', 'finance_accounts', 'finance_audit_log', 'finance_categories',
    'finance_transactions', 'menu_items', 'order_events', 'order_feedback',
    'order_issues', 'order_items', 'orders', 'print_jobs',
    'restaurant_settings', 'restaurants', 'reward_coupons', 'salary_payments',
    'settings', 'shift_logs', 'spin_config', 'spin_results', 'spin_rewards',
    'split_bills', 'staff', 'staff_salary_config', 'tab_devices', 'tables',
    'vendor_payments', 'vendor_purchases', 'vendors', 'waiter_calls'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "all_access" ON %I;', t);
  END LOOP;
END $$;

-- ============================================================
-- Verification (run after applying)
-- ============================================================
-- 1. Confirm no "all_access" policy remains anywhere (should return 0 rows):
--   SELECT schemaname, tablename, policyname
--   FROM pg_policies
--   WHERE policyname = 'all_access';
--
-- 2. Confirm RLS is still ENABLED on every table (should return 34 rows, all
--    with rowsecurity = true) — RLS being on with zero policies is what
--    gives the default-deny behavior for anon/authenticated:
--   SELECT relname, relrowsecurity
--   FROM pg_class
--   WHERE relname IN (
--     'customer_tabs','daily_finance_closings','email_log','email_queue',
--     'expenses','finance_accounts','finance_audit_log','finance_categories',
--     'finance_transactions','menu_items','order_events','order_feedback',
--     'order_issues','order_items','orders','print_jobs',
--     'restaurant_settings','restaurants','reward_coupons','salary_payments',
--     'settings','shift_logs','spin_config','spin_results','spin_rewards',
--     'split_bills','staff','staff_salary_config','tab_devices','tables',
--     'vendor_payments','vendor_purchases','vendors','waiter_calls'
--   )
--   ORDER BY relname;
--
-- 3. Confirm the app still works end-to-end after applying (do this in a
--    real browser session, not SQL): place a test dine-in order via QR,
--    confirm it in the waiter portal, confirm the kitchen/print flow,
--    confirm Finance loads, confirm Spin & Win still spins. All of these go
--    through server API routes using the service_role key and must behave
--    identically to before this migration — if anything breaks, it means a
--    client-side code path was directly hitting Supabase with the anon key
--    (contrary to what the codebase search above found), and the fix is to
--    move that path through a server API route rather than reverting RLS.
-- ============================================================
-- END OF MIGRATION 022 --
