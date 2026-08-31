# Waiter Order More for QR Customer Sessions — Implementation Report

Scope: let a waiter discover an ACTIVE customer session at a table — regardless of whether the customer or the waiter started it — select the exact one, and add items to it. Builds directly on the already-implemented Waiter New Order / Order More work; nothing there was rebuilt or redesigned.

## 1. Root cause / previous limitation

There wasn't actually a channel-based restriction — `customer_tabs` has no "source" or "channel" column at all, and the previous Order More screen already queried `getTabs('open')` with no filter on who opened the tab, then matched on `tableId` client-side. So a QR-opened tab was already visible and already selectable by `customer_tab.id`. The real limitations were:

1. **Performance/architecture, not correctness**: the table-scoped list was built by fetching *every open tab in the restaurant* and filtering in the browser, then firing one extra request per visible tab to compute its order count (an N+1 pattern) — exactly the anti-pattern the new spec calls out (§27).
2. **No same-name disambiguation**: cards showed name + bill + order count but no session-start time, so two same-named active customers (§4/§25 of this spec) had no safe way to be told apart.
3. **No explicit "no active customers" state**: a table with zero active tabs silently skipped to the guest form instead of showing the explicit `Table 5 / No active customers. / [Start New Order]` state requested in §10.

Everything else the spec worried about — QR sessions being invisible to the waiter, multiple customers collapsing together, order source getting rewritten, Order More being keyed by name instead of tab id — was already correct by construction from the previous Order More implementation, and is preserved unchanged (see §5-§13 below for how each is actually satisfied by the existing design).

## 2. Files changed

- `app/api/tabs/route.ts` — `GET` now accepts a `tableId` filter (server-scoped query instead of restaurant-wide + client filter) and, only for a `tableId`-scoped request, returns each tab's live `orderCount` in one extra grouped query.
- `lib/api.ts` — `getTabs()` takes an optional third `tableId` argument; `CustomerTab` gains an optional `orderCount` field (populated only by a `tableId`-scoped call).
- `components/WaiterTakeOrder.tsx` — `selectTable()` uses the new table-scoped, count-included query instead of N+1 fetching; the Active Customers screen adds a "Started {time}" line per session, an explicit empty state, and renamed copy ("Active Customers", "Start New Customer / New Order").

## 3. Database changes

**None.** `tables` → `customer_tabs` (via `table_id`) → `orders` (via `tab_id`) already fully supports this — a tab's origin (QR vs waiter) was never recorded as a separate concept and doesn't need to be; `orders.source` already distinguishes how each *order* (not tab) was created, which is the correct existing granularity. No `customer_session_v2`/`waiter_tabs`/`qr_tabs` or any other duplicate concept was created.

## 4. Migration filename

None — no schema change in this arc.

## 5. How Waiter discovers QR-created active customer tabs

`GET /api/tabs?tableId=<id>&status=open` — a plain `customer_tabs` query filtered by `table_id` and `status='open'`, with no filter of any kind on how the tab was opened. A QR-opened tab and a waiter-opened tab are indistinguishable rows in this table, and both come back identically.

## 6. How Table → Customer selection works

`Waiter → Take Order → Dine-In → [Table 5]` calls `selectTable()`, which calls the query above and renders one card per returned tab under **"Table 5 — Active Customers"**. Tapping a card (`selectExistingTab(tab)`) sets the order context's `tabId` to that exact tab's `id` — never derived from the table id or the customer's name.

## 7. How multiple customers at one table remain separate

Each tab is its own row with its own `id`, `total`, and `orderCount`; the UI renders one card per row. Selecting Priya's card sets `ctx.tabId = <Priya's tab id>` only — Manish's tab is never read or written. `POST /api/orders` (unchanged this arc) only ever touches the single `tab_id` it's given.

## 8. How same-name customers are distinguished

Every card now shows **"Started {h:mm AM/PM} · Party of N · Orders: N"** under the name, computed from `customer_tabs.created_at` — two tabs both named "Priya" (or both unnamed "Guest") render as visually distinct cards by start time, with no PII beyond a clock time. Nothing about *selection* depends on the name at all (see §9) — the time line is purely to help the human waiter pick the right card; the actual request always carries the tab's unique id regardless of what the two cards happen to display.

## 9. How selected customer_tab_id is validated

Unchanged from the existing Order More implementation, which already does this correctly: `POST /api/orders` derives the order's `table_id` **from the tab row itself** (`SELECT table_id FROM customer_tabs WHERE id = tabId`), never from a client-supplied `tableId` — so a tampered request claiming `tableId=Table5` with a `tabId` that actually belongs to Table 2 still gets Table 2's real table id, not Table 5's. The same route also requires the tab to belong to the same `restaurant_id` and have `status='open'` before accepting the order (409 with *"Billing/payment is already in progress for this customer"* otherwise) — re-checked on every request, not cached from an earlier screen.

## 10. How waiter-created Order More attaches to a QR-created tab

No special-casing exists or was needed — `selectExistingTab()` sets `ctx.tabId` to the QR-opened tab's id exactly the same way it would for a waiter-opened tab, and `handleSend()` calls the same `createOrder({..., tabId: ctx.tabId})` used everywhere else. Server-side, `POST /api/orders` already creates a new `orders` row (or merges into a still-unconfirmed one) under that `tab_id` regardless of what created the tab.

## 11. How order source remains Waiter-Assisted

Untouched — the QR order's own `orders.source='table-qr'` row is never read or written by this flow. The new order the waiter creates gets `source: 'waiter'` (already the existing value `handleSend()` sends for any dine-in order), so the two orders under the same tab remain independently attributable in `orders.source` with no new field or system.

## 12. How QR can still Order More afterward

Untouched and unaffected — the customer's own QR "Order More" (in `app/table/page.tsx`, via `GET /api/tabs/[id]` + `POST /api/orders` with its own known `tabId`) doesn't call any of the code changed in this arc at all. Both channels write to the same `tab_id` through the same `POST /api/orders` merge-or-create logic, so QR → Waiter → QR → Waiter all correctly accumulate on one tab.

## 13. How only new items reach Kitchen/Printer

Unchanged from the existing Order More work: the KOT print job for a new confirmed round is built from that new order's own `order_items` only — the original QR order's items live on a different `orders.id` and are never touched, resent, or reprinted. The "ORDER MORE" ticket label (added previously) is computed by checking whether the tab already has any other confirmed order — true here regardless of whether that earlier order came from QR or a waiter.

## 14. How Manager gets one combined customer bill

Unchanged: Manager already sums every non-cancelled/void order sharing a `tab_id` (`Math.max(tab.total, Σ orders.total)`) with no source filter — QR order + waiter Order More both count toward the same customer's total automatically, while a different tab at the same table (Manish) is a completely separate sum.

## 15. How Finance avoids duplicate revenue

Unchanged: dine-in revenue is recognized exactly once, from `customer_tabs.status='closed'`, never from individual orders — irrelevant how many orders (or which channel) contributed to that tab's final total.

## 16. Discount/coupon behavior

Unchanged: dine-in discounts/coupons are tab-level, applied once at tab close against the sum of all live orders on the tab — already channel-agnostic and multi-order-safe.

## 17. Spin & Win behavior

Unchanged: eligibility is gated by `UNIQUE(tab_id)` and `tab.status='closed'` — one tab still means at most one spin, regardless of how many orders (QR or waiter) fed into it.

## 18. Realtime behavior

No new subscriptions were added. The Active Customers screen is populated by a fresh server query at the moment the waiter taps the table (not a cached/stale list), so a QR session Priya opened moments earlier is already visible without any push mechanism being involved. Order creation still broadcasts `order_created` exactly as before; Manager/Kitchen/Admin pick it up through their existing subscriptions and 5-second poll fallback — nothing here duplicates or replaces that.

## 19. Idempotency/concurrency protection

Unchanged and already channel-agnostic: `WaiterTakeOrder.tsx` sends a per-submission idempotency key on every order-creation call, and `POST /api/orders`'s existing idempotency-key lookup + the tab-status guard (re-checked fresh on every request) together mean a double-click produces one order and a tab closed by the Manager mid-submission is rejected with a clear 409 rather than silently creating a fallback tab.

## 20. Security protections

- `GET /api/tabs` (including the new `tableId` filter) still requires an authenticated staff session — unchanged.
- The `tableId` query param only ever narrows the result set (`.eq('table_id', tableId)`); it does not affect which tab gets written to.
- `POST /api/orders`'s existing guards do the actual write-time enforcement: valid staff session (when `createdByStaffId` is present), tab exists in the same restaurant, tab is `open`, table linkage is derived from the tab row rather than trusted from the client — a waiter cannot attach an order to an arbitrary or closed tab by editing the request body.
- Item prices/subtotals follow this codebase's existing, unchanged trust model (client-computed from the fetched menu) — consistent with every other order-creation path, not newly loosened or tightened here.

## 21. Lint/typecheck/build/test results

- `npx tsc --noEmit` — clean.
- `npx eslint` on all three changed files — clean (zero warnings/errors in `app/api/tabs/route.ts` and `lib/api.ts`; the two warnings that appear in `components/WaiterTakeOrder.tsx` are pre-existing unused-variable warnings unrelated to this change, previously confirmed via `git stash`).
- `rm -rf .next && npm run build` — compiled successfully, all routes registered including `/api/tabs`.
- No automated test suite exists in this repo beyond the above.
- **Not performed**: no live Supabase database or physical device was exercised — this is build/type/lint verification and manual code tracing only.

## 22. Anything requiring manual deployment/migration

Just redeploy the three changed files — no migration to apply, no `.env` changes, nothing else pending.

## 23. Exact live tests to perform

1. Have a customer scan Table 5's QR and place an order. Confirm their tab shows `status='open'` in Supabase.
2. In Waiter → Take Order → Dine-In → Table 5, confirm that customer appears under "Active Customers" with the correct bill and order count.
3. Tap their card → Order More → add items → Send. Confirm: no new tab was created (`customer_tabs` row count for that table unchanged), the new order shares the same `tab_id`, and only the new items appear on the kitchen ticket/display.
4. Have a second customer scan the same table's QR under a different name. Confirm both now appear as separate cards, and Order More on one never changes the other's total (check both in Manager).
5. Manually rename one tab's `customer_name` (or seat two guests both left at the default "Guest" name) to match another active tab at the same table — confirm both appear as distinct cards distinguished by their "Started" time, and confirm in the database that selecting each attaches to the correct distinct `tab_id`.
6. With Priya and Manish both active, tap "+ Start New Customer / New Order" and seat a third guest — confirm a brand-new tab is created and the first two are untouched.
7. Select a table with zero active tabs — confirm the explicit "No active customers" message and "Start New Order" button appear (rather than silently jumping to the guest form).
8. Close a tab from Manager, then confirm it no longer appears in Waiter's Active Customers list for that table, and that a direct attempt to Order More against its id (e.g. via a replayed request) is rejected with a 409.
9. Double-click "Send Order More" — confirm exactly one additional order/kitchen ticket is created.
10. Full regression pass: plain Waiter New Order, existing Waiter-created Order More, Pickup Order More, Pickup/Delivery phone printing, Customer QR ordering, Kitchen Display, Printer, Manager billing, Finance, discounts/coupons, Spin & Win, receipts, Reset Test Data.
