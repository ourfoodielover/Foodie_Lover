# Foodie Lover — Admin Finance & Cash Flow Management
## Post-Implementation Report

Prepared: 2026-08-23

---

## 1. Summary of what was added

A new **Finance / Cash Flow Management** section was added inside the existing Admin Dashboard, reachable only from Admin (`💰 Finance` nav button, protected by a second admin-PIN re-entry). It gives the owner:

- **Overview** — live, drill-downable totals for a selected period (Today / This Week / This Month / Custom): system-generated sales (never a single editable number — broken down by dine-in vs pickup/delivery, gross/discount/net, and by payment account), existing Manager-logged operating expenses (read-only mirror), manual ledger income/expense/transfer entries, vendor payments, salary payments, and a computed net cash flow.
- **Daily Closing** — an optional, non-blocking end-of-day snapshot (expected vs counted cash per account, variance, notes) that can be reopened and re-closed at any time; never locks Admin out of editing.
- **Transactions** — the manual ledger (income / expense / transfer / adjustment), with edit and void (never hard-delete).
- **Expenses** — a read-only view of the *existing* Manager Expenses feature (`app/manager/expenses`), so Admin has visibility without a second, competing edit path.
- **Vendors** — vendor directory, purchases (goods received ≠ paid), and one-or-more payments against each purchase until fully paid.
- **Salaries** — per-staff salary configuration and payments that simultaneously satisfy the payable and post one ledger transaction, with no separate "create an expense too" step.
- **Accounts** — cash/bank/digital account definitions with opening balances, used to attribute every rupee to a real place the money sits.
- **Reports** — CSV export of system sales and the manual ledger for a period.
- **Audit Trail** — a full, append-only log of every create/edit/void/close/reopen across all of the above, with before/after snapshots.

Every one of the 19 existing workflows named in the brief (online ordering, table QR ordering, waiter, kitchen display, printer/KOT, delivery, manager portal, manager expenses, admin functionality, menu management, staff management, order lifecycle, payments, split payments, discounts/offers, coupons, spin & win, ratings, emails, realtime, order tracking, existing reports, existing admin order-deletion tools) was **left untouched** — see §3.

---

## 2. Database tables / migrations

One new, additive migration: **`supabase/migration_019_finance.sql`**. It creates 10 new tables, each idempotent (`DO $$ ... EXCEPTION WHEN duplicate_object THEN NULL; END $$;` guards, `CREATE TABLE IF NOT EXISTS`), with RLS enabled and an `all_access` policy matching the existing pattern used by every other table in the schema, indexes on the natural lookup columns, and realtime publication registration:

| Table | Purpose |
|---|---|
| `finance_accounts` | Where money physically sits (cash drawer, bank, UPI/digital, etc.) — seeded with 2 defaults |
| `finance_categories` | Income/expense categories for the manual ledger — seeded with 16 defaults |
| `finance_transactions` | The manual ledger (income/expense/transfer/adjustment) — soft-deletable (`is_voided`), never hard-deleted |
| `finance_audit_log` | Append-only before/after log for every Finance mutation, across every entity type |
| `vendors` | Supplier directory |
| `vendor_purchases` | Goods/services received from a vendor — receiving ≠ paying |
| `vendor_payments` | One or more payments against a purchase; each auto-posts one linked `finance_transactions` row |
| `staff_salary_config` | Per-staff salary basis (monthly/daily/hourly + rate) |
| `salary_payments` | Salary/advance/bonus payments to staff; each auto-posts one linked `finance_transactions` row |
| `daily_finance_closings` | Optional daily cash-count snapshot, reopenable |

**No existing table was altered.** System Sales (the authoritative revenue figure) is deliberately **not** a table — see §5.

**Action required from you:** open the Supabase SQL editor for the project and run `supabase/migration_019_finance.sql` once (same process as every prior `migration_0xx.sql` in this repo). It is safe to run more than once — every `CREATE`/`ALTER` is idempotent.

---

## 3. Existing files modified

Only **two** existing files were touched, both additively:

- **`lib/api.ts`** — one new section appended after the existing `escalateIssue` function: a `financeFetch<T>()` client helper, `verifyFinancePin()`, 13 new TypeScript interfaces, and ~29 new exported functions for every Finance entity. **Not one existing line was changed, moved, or removed.**
- **`app/admin/page.tsx`** — exactly 4 small, isolated insertions:
  1. `const AdminFinance = lazy(() => import('@/components/AdminFinance'));` (mirrors the existing `AnalyticsCharts` lazy-load pattern)
  2. `'finance'` added to the `Section` type union
  3. One new `<NavBtn id="finance" label="💰 Finance" />` between Sales Report and Menu Management
  4. One new conditionally-rendered `<Suspense>` block that mounts `<AdminFinance>` when `section === 'finance'`

  While verifying this file I found and fixed **one pre-existing, unrelated bug**: the `tabB` style-helper arrow function (`const tabB = (active) => ({...}` at what is now line 57) was missing its closing parenthesis before the semicolon — a syntax error that would have broken compilation of the whole file regardless of the Finance work. It is now `({ ... })`.

No other existing file was opened for writing. `app/manager/expenses/page.tsx`, `app/api/expenses/route.ts`, `app/api/orders/clear/route.ts`, `app/api/orders/delete-selective/route.ts`, `lib/supabase-server.ts`, and every portal page (online, table, waiter, kitchen, delivery, manager) are byte-for-byte unchanged.

---

## 4. New files created

- `supabase/migration_019_finance.sql`
- `lib/finance-server.ts` — new server-only helper module (PIN verification, audit logging, split-payment parsing, account keyword matching, live System Sales computation, Finance summary computation). Does not modify `lib/supabase-server.ts`; only imports `getServerClient`/`newId` from it.
- `components/AdminFinance.tsx` — the entire Finance UI (self-contained, lazy-loaded)
- 19 API route files under `app/api/finance/`: `accounts/`, `accounts/[id]/`, `categories/`, `transactions/`, `transactions/[id]/`, `system-sales/`, `summary/`, `vendors/`, `vendors/[id]/`, `vendor-purchases/`, `vendor-purchases/[id]/`, `vendor-payments/`, `vendor-payments/[id]/`, `salary-config/`, `salary-payments/`, `salary-payments/[id]/`, `closings/`, `closings/reopen/`, `audit-log/`

---

## 5. System-sales sync mechanism

"System Sales" is **never stored** — it is computed live, on every request, directly from the authoritative order data:

- **Dine-in** revenue is sourced from `customer_tabs` (specifically `payment_method` set at tab-close), counted once when the tab closes. This was a deliberate finding from inspection: an individual dine-in order's `payment_method` column is *never* populated at close time (`app/api/tabs/[id]/route.ts` only sets `{status:'completed', updated_at}` on the bulk order update) — the tab row is the true source for dine-in payment attribution.
- **Pickup/delivery** revenue is sourced from `orders` directly (orders with no `tab_id`), counted once at order completion.
- Split-payment strings (`"Cash ₹500 + UPI ₹300"`, the exact format already used across the Manager portal) are parsed by `parsePaymentSplits()` in `lib/finance-server.ts` to attribute each portion to the correct Finance account.

Because this is a live query rather than a stored/duplicated figure, it can never drift out of sync with the orders/tabs tables, and every figure is one click away from the underlying rows (`system-sales` endpoint returns the row-level detail, not just a total).

---

## 6. Order deletion / cancellation → Finance sync

No new code was needed for this, by construction. The existing hard-delete tools (`app/api/orders/clear/route.ts`, `app/api/orders/delete-selective/route.ts`) were **not modified**. Since System Sales is always computed live from whatever rows currently exist in `orders`/`customer_tabs`, deleting an order simply removes it from the next System Sales query automatically — there is no separate Finance record that could go stale. Order cancellation (`status = 'cancelled'`/`'void'`) is likewise excluded from System Sales by the same live query filtering on completed/paid states.

---

## 7. Manager-expenses integration

The existing `expenses` table, `app/api/expenses/route.ts`, and `app/manager/expenses/page.tsx` are **completely untouched**. The Finance "Expenses" tab calls the existing `listExpenses()`/`computeExpenseStats()` client functions to display those same rows **read-only** inside Admin, for visibility. There is intentionally no create/edit/delete path for these rows inside Finance — the Manager portal remains the single owner of that data, so the two UIs can never race or double-record the same expense.

---

## 8. Vendor payable / payment accounting

`vendor_purchases` records that goods/services were *received* — this never implies payment. Each purchase carries `amount`, `amount_paid` (derived from its payments), and status (`unpaid` / `partially_paid` / `paid`), staying open until the full amount is paid off. `vendor_payments` records one or more payments against a purchase over time; each payment insert automatically posts exactly one linked `finance_transactions` expense row (`source: 'vendor_payment'`, `source_id` pointing at the payment), so the vendor ledger and the cash ledger can never drift apart. Voiding a payment reverses both sides together. Direct edit of the auto-generated `finance_transactions` row is blocked in `transactions/[id]/route.ts` — it redirects to the vendor-payment void endpoint instead, so the two records stay mirrored.

---

## 9. Salary accounting

`staff_salary_config` stores each staff member's pay basis and rate. Recording a `salary_payments` row (salary / advance / bonus) is a **single action** — it simultaneously satisfies that payment and auto-posts one linked `finance_transactions` expense row (`source: 'salary_payment'`), exactly like vendor payments. Admin never needs to separately create a matching manual expense.

---

## 10. Account balance calculation

Each `finance_accounts` row has an `opening_balance`. Its running balance = opening balance + (its share of live System Sales, attributed via `parsePaymentSplits()`/`matchAccountForKeyword()`) + manual income − manual expense ± transfers − vendor payments made from it − salary payments made from it, all computed live over the selected period rather than stored as a mutable running total — so there is no single number that can be silently overwritten.

---

## 11. Daily closing / post-closing behavior

`daily_finance_closings` is an optional, advisory end-of-day snapshot (expected cash per account vs counted cash, with variance and notes). Closing a day does **not** lock any editing anywhere in Finance — it is a record, not a constraint. `closings/reopen` simply flips `is_closed` back and logs who/when/why in the audit trail. This satisfies "do NOT permanently lock Admin out of editing historical data" while still giving a clear closed/open badge per day.

---

## 12. Assumptions made

- Every new Finance API route requires the **admin PIN** on every call (GET included), verified server-side against `restaurant_settings.admin_pin` via a fresh, standalone `requireAdminPin()` in `lib/finance-server.ts` — this is stricter than most existing routes (which mostly have no server-side auth at all) and does not touch or weaken any existing route.
- No new Realtime broadcast events were added for Finance, to minimize surface area — the Finance UI refetches after its own mutations instead. Existing realtime events are unaffected.
- "System Sales" excludes cancelled/void orders and any order still in progress; only completed dine-in tabs and completed pickup/delivery orders count as revenue.
- Manual ledger voiding (soft-delete) was chosen over hard-delete specifically to satisfy the "no silent rewrite of history" requirement, while PATCH remains available on any manual transaction so Admin is never locked out.
- Default seed data (2 accounts, 16 categories) is a reasonable starting point but may need renaming/reordering for this specific restaurant — fully editable from the Accounts/Categories UI after migration.

---

## 13. Tests / build checks performed — and what could not be completed here

**Completed:**
- Every new and modified file (`lib/finance-server.ts`, all 19 `app/api/finance/**/route.ts` files, `components/AdminFinance.tsx`, the modified `lib/api.ts`, the modified `app/admin/page.tsx`) was parsed with `esbuild` (TSX/TS syntax check) — **all pass with zero errors.**
- A full open-brace/close-brace balance check was run across `AdminFinance.tsx` (1,661 lines) — balanced.
- Every prop and type used between `components/AdminFinance.tsx` and `lib/api.ts` (`FinanceTransaction`, `FinanceAccount`, `FinanceCategory`, `FinanceAuditEntry`, `createFinanceTransaction`, `updateFinanceTransaction`, `getFinanceAuditLog`, etc.) was manually cross-checked against the actual exported signatures.
- Confirmed `AuthSession.name` (used in the new `app/admin/page.tsx` edit) genuinely exists on the existing `AuthSession` type in `lib/auth.ts`.
- Found and fixed one pre-existing, unrelated syntax bug in `app/admin/page.tsx` (see §3).
- Confirmed via `git status` that only the intended 7 file paths changed and `package.json`/`package-lock.json` are untouched.

**Could not be completed in this environment:** a full `next build --webpack` / `tsc --noEmit` run. The bridge to your machine runs commands inside an isolated Linux VM whose access to your project folder measured at **~4.8 MB/s** (vs. 1.5 GB/s for the VM's own local disk) — roughly 300x slower — because it's a cross-VM mounted folder. A production build touching the ~thousands of files in `node_modules` plus writing hundreds of MB of webpack cache could not complete inside the tool's 45-second execution window, and background processes do not survive between commands in that environment, so the build genuinely could not be driven to completion from here. (Along the way this Linux VM also lacked a `linux-x64-gnu` SWC binary — your `node_modules` was installed on Windows — which I installed only so I could probe the VM at all; it's inert extra weight in `node_modules` and does not affect your real Windows build.)

**Please run these two commands yourself** (from a normal terminal on your machine, not through this bridge — it will be dramatically faster there since it's local disk and the correct native binaries):

```
npm run build
```

If that reports any TypeScript errors, they are almost certainly narrow (e.g. a typo in a prop name) given the extensive manual cross-checking already done — please paste me the exact error output and I'll fix it immediately.

---

## 14. Remaining risks / follow-up

1. **Run the migration.** `supabase/migration_019_finance.sql` must be applied in the Supabase SQL editor before any Finance API route will work (they all query tables that don't exist until then).
2. **Run `npm run build` on your machine** (§13) and send me any errors — I could not complete this validation here due to the bridge's I/O speed, so this is the one genuinely unverified step.
3. **Seed data review** — the 2 default accounts and 16 default categories are a starting point; rename/reorder/add to them from the Finance → Accounts/Categories UI to match how this restaurant actually operates.
4. **Split-payment attribution** relies on parsing the existing `"Cash ₹500 + UPI ₹300"` string format. If that format ever changes elsewhere in the app, `parsePaymentSplits()` in `lib/finance-server.ts` should be updated to match.
5. **No new Realtime events** were added for Finance (§12) — if simultaneous multi-admin editing becomes common, live push updates could be added later without touching any existing event.
6. **PIN-based auth** for Finance matches the existing app-wide model (no JWT/sessions) — this is consistent with how the rest of the app works, but is worth knowing if a stronger auth model is ever adopted app-wide in the future, at which point Finance's `requireAdminPin()` would be the one helper to update.
