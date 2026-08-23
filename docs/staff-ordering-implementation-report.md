# Staff-Assisted Ordering / Waiter Take Order — Implementation Report

Foodie Lover POS · Migration 020 · 2026-08-23

---

## 1. Summary of additions

Waiters and counter staff can now place an order on a customer's behalf — for a dine-in table (existing guest or a brand-new guest) or for walk-in pickup — from a new "➕ TAKE ORDER" screen inside the existing Waiter Portal. It is not a new app, not a new login, and not a second ordering system: it reuses the same menu, the same cart logic as the customer-facing table page, the same `customer_tabs`/`orders` pipeline, and the same kitchen-routing/confirmation mechanism the waiter dashboard already uses every day. Submitting an order from this screen also performs the exact same "confirm & route to kitchen" step a waiter normally does for a QR order, so kitchen/printer routing happens immediately without a second person needing to re-confirm it.

One dormant bug was fixed as a side effect of this work: the "Special Instructions" box on the customer QR ordering page (`app/table/page.tsx`) has always existed in the UI but was never actually sent to the server or printed on the KOT. It now is (see §9 in spirit, and the full explanation in §12 below).

## 2. Database migration / schema changes

New file: `supabase/migration_020_staff_ordering.sql`. It is purely additive and idempotent (`ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS` — safe to run multiple times).

- `orders.notes TEXT` — order-level special instructions, nullable, no default. Fixes the dormant special-instructions bug for **all** order types (QR, waiter, counter, online), not just the new feature.
- `orders.created_by_staff_id TEXT` — the authenticated staff account (`accountId`) that submitted the order. `NULL` for every customer-originated order (QR scan, online).
- `orders.created_by_staff_name TEXT` — denormalised display name of the same, so the admin UI never needs an extra join.
- `CREATE INDEX idx_orders_source ON orders(restaurant_id, source)` — cheap index supporting the new Admin "Order Source Breakdown" card.

Nothing else changed in the schema. `migration_019_finance.sql` was **not** touched. `orders.source` (already `TEXT NOT NULL DEFAULT 'in-store'`, no CHECK constraint) and `customer_tabs.waiter_id` / `waiter_name` (already present, already accepted by `POST /api/tabs`) needed no migration at all — see §9 and §10.

**To apply:** open the Supabase SQL editor for the project and run the full contents of `supabase/migration_020_staff_ordering.sql`. It is safe to re-run if you're ever unsure whether it already applied.

## 3. Existing files modified

- `app/api/orders/route.ts` — the append-to-existing-order branch (used when a waiter adds items to a QR customer's still-unconfirmed order) now also carries `notes` through and merges them; the main insert now writes `notes`, `created_by_staff_id`, `created_by_staff_name`.
- `app/api/orders/[id]/route.ts` — `buildKotPayload()` now passes the order's real `notes` instead of always `undefined`, so the print agent (unchanged) renders them on the ticket.
- `lib/supabase-server.ts` — `rowToOrder()` now maps the three new columns onto the `Order` object.
- `lib/api.ts` — `Order` type and `createOrder()` gained the three optional fields; `createTab()` gained optional `waiterId?`/`waiterName?`; new helper `getKitchenRoutingMode()` added.
- `app/table/page.tsx` — the existing "Special Instructions" textarea now actually sends its value (`notes`) when placing an order. This is the dormant-bug fix; nothing else about the QR ordering flow changed.
- `app/kitchen/page.tsx` — Kitchen Display order cards now show a small 📝 note callout when `order.notes` is present.
- `app/admin/page.tsx` — one new read-only card, "📊 Order Source Breakdown", added to the existing Sales Report tab. Computed entirely client-side from data already loaded there; no new API calls.
- `app/waiter/page.tsx` — four small, additive changes: (a) lazy-imports the new `WaiterTakeOrder` component, (b) one new `takeOrderOpen` boolean state, (c) a large, high-contrast "➕ TAKE ORDER" button placed immediately under the header (impossible to miss), (d) a conditional full-screen overlay that renders `WaiterTakeOrder` when open and calls the dashboard's existing `refresh()` when it closes.

No other files were touched. Nothing was removed or renamed.

## 4. New files created

- `supabase/migration_020_staff_ordering.sql` — schema migration (§2).
- `components/WaiterTakeOrder.tsx` — the entire staff Take Order experience (§7–§9 describe its behavior).
- `docs/staff-ordering-implementation-report.md` — this report.

## 5. How staff-assisted customer tabs work

Tapping "➕ Take Order" → "Dine-In" shows the live table grid (available = green, occupied = orange, both selectable — an occupied table doesn't block a second, independent party). Selecting a table loads that table's currently **open** tabs (`GET /api/tabs?status=open`, filtered client-side by table). If one or more exist, the staff member sees them as cards ("Existing Customer" + their running bill) plus a "＋ New Guest" option; picking an existing tab attaches the new items to that customer's tab exactly as if they had ordered more through the QR page. Picking "New Guest" (or the table having zero open tabs) opens a short optional form (name/party size/phone/email — all optional, defaulting to "Guest N") and calls the same `createTab()` used everywhere else, now also passing `waiterId`/`waiterName`. Because `customer_tabs` already supports multiple simultaneous open tabs per table (confirmed via its non-unique `idx_tabs_table` index), two unrelated parties at one table have always been, and remain, two completely separate tabs/bills — this feature never merges them.

## 6. How existing QR customers receive waiter-added items

When a waiter selects a table that already has an open tab and that tab already has an order sitting in `awaiting_waiter` (i.e. the customer placed a QR order that hasn't been confirmed to the kitchen yet), the existing `POST /api/orders` append branch is reused unchanged: the new items are merged into that same order (subtotal/total recalculated, notes merged), rather than creating a second order. This is the same code path that already handles a customer adding more items to their own unconfirmed order from the table page — the waiter's items go through the identical logic.

## 7. How direct waiter routing/confirmation works

After the order is created, `WaiterTakeOrder` immediately performs the same confirmation action a waiter would normally trigger from the dashboard: `confirmAndPrintOrder()` or `confirmAndKitchenOrder()`, using the logged-in staff member's own name. Which one fires depends on the restaurant's configured kitchen routing mode (`GET /api/admin/restaurant-config` → `kitchen_mode`):

- **printer** mode → confirm & print automatically, no extra tap.
- **kitchen_display** mode → confirm & send to Kitchen Display automatically, no extra tap.
- **ask** mode → the cart screen shows the same two buttons the waiter dashboard shows ("🖨️ Confirm & Print KOT" / "🖥️ Confirm & Send to Kitchen"), and the staff member's tap both submits the order and routes it in one action.

No new confirmation logic was written anywhere — this calls the exact same PATCH actions (`confirm_and_print` / `confirm_and_kitchen`) that already exist and are already used by the dashboard, so there is no way for a staff-submitted order to end up in a different state than a normally-confirmed one, and no separate "self-confirmation" step is ever required.

## 8. How pickup/counter ordering works

"➕ Take Order" → "Pickup" skips the table grid entirely and goes straight to an optional guest-details form (name/phone/email, all optional — defaults to "Walk-in Guest"), then the same menu/cart screen. No table, no tab is created — the order is created directly with `type: 'pickup'`, exactly like a customer-placed pickup order, and then routed to the kitchen the same way as §7. It shows up on the existing Pickup-ready banner and counter-collection flow already used for customer-placed pickup orders — nothing there needed to change.

## 9. How order source is stored

`orders.source` (an existing column, not new) gets `'waiter'` for anything placed against a table/tab from this screen, and `'counter'` for anything placed via the Pickup flow — added alongside the pre-existing values `'table-qr'`, `'online'`, and the default `'in-store'`. Per the explicit instruction to reuse an existing field rather than inventing a new one, no new "customer_qr"-style column was created. `source` is pure metadata: it does not affect price, tax, discount eligibility, or which Finance calculation an order feeds into — see §13.

## 10. How waiter identity is recorded

Two independent places, matching how the rest of the app already tracks staff attribution:

- On the **tab**: `customer_tabs.waiter_id` / `waiter_name` (pre-existing columns) are now populated by `createTab()` when a staff member opens a new tab from Take Order.
- On the **order**: the two new columns `orders.created_by_staff_id` / `created_by_staff_name` record exactly which staff member submitted that specific order, using the same `session.accountId` / `session.name` the waiter portal's own auth session already carries. This is separate from "who confirmed the order to the kitchen" (recorded via the existing order-events timeline, unchanged) — both are visible on the order if you need to audit who did what.

## 11. Printer / Kitchen Display integration

Zero changes to the print agent (`print-agent/index.js`) or to any printer/Kitchen-Display code path. Staff-submitted orders travel through `buildKotPayload()` / the print-jobs queue / the Kitchen Display's realtime subscription exactly like any other confirmed order — the only difference is *who* triggered the confirmation (§7). The print agent already rendered `payload.notes` when present; it simply never received a value before, which is what the `orders.notes` column fixes for every order type, not just staff-assisted ones.

## 12. Manager billing

No changes to `app/manager/**` or to the tab-closing/payment flow at all. A staff-assisted dine-in order lives on the same `customer_tabs` row as any QR order at that table, so the Manager portal continues to see one running bill per tab and closes it exactly the same way it always has (single payment or split payment — both unaffected, since neither depends on `orders.source`). A staff-assisted pickup/counter order is a normal `type: 'pickup'` order and completes payment through the same existing pickup-completion path used today. No second payment/billing system was built, per the explicit instruction not to.

## 13. Finance integration verification

`lib/finance-server.ts` and every route under `app/api/finance/**` were checked directly: **none of them reference `orders.source` anywhere.** Finance's Sales figures are derived from order `status`/`total` (served/completed orders, same as before), so a `'waiter'`- or `'counter'`-sourced order is counted exactly once, at exactly the same point in the pipeline, as any other order — no manual Finance income entry is created for it, and there is no way for it to be double-counted or missed. The only Finance-adjacent change in this whole feature is the new read-only "Order Source Breakdown" card in the Admin Sales Report tab, which is purely a display of counts/percentages computed from data already being fetched — it does not write anything and it does not touch the Admin-PIN-gated Finance section at all.

## 14. Cancellation / deletion → Finance effect

Both `app/api/orders/clear/route.ts` and `app/api/orders/delete-selective/route.ts` were checked directly: neither reads or branches on `orders.source`. Cancelling or deleting a staff-assisted order goes through the identical status-transition / delete logic as any other order, so it affects Finance's Sales calculation exactly the same way a cancelled/deleted QR or online order always has — no special-casing exists for staff-assisted orders, and none was added.

## 15. Regression tests performed

A live dev server could not be started in this environment to click through scenarios end-to-end, so verification here is static: full-project TypeScript compilation, a whole-project esbuild syntax sweep of every `.ts`/`.tsx` file, and direct code-path tracing for each scenario below.

| # | Scenario | Result |
|---|---|---|
| 1 | Existing QR ordering flow untouched | `app/table/page.tsx`'s order-placement call changed by exactly one added field (`notes`); every other call and code path is byte-identical to before. |
| 2 | Staff-only dine-in customer (new guest, no QR) | New guest form → `createTab()` → menu/cart → `createOrder(type:'dine-in', source:'waiter')` → auto-confirm. Traced end-to-end. |
| 3 | Existing QR customer + waiter adds items | Reuses the pre-existing append-to-`awaiting_waiter`-order branch in `POST /api/orders` — same code as customer self-adding items. |
| 4 | Multiple independent customers, same table | Relies on `customer_tabs`' existing non-unique per-table index; each tab remains its own bill; confirmed no code path merges tabs. |
| 5 | Reorder (customer already served, wants more) | Handled the same as scenario 3 if the tab is still open; if no `awaiting_waiter` order exists, a fresh order is created on the same tab — identical to how the table page already behaves for a second round. |
| 6 | Counter/pickup ordering | Traced in §8 — separate `type:'pickup'`/`source:'counter'` path, no table/tab involved. |
| 7 | Menu items with variants | `WaiterTakeOrder`'s cart logic (variant picker modal, variant name embedded in item name, price from selected variant) mirrors `app/table/page.tsx`'s existing implementation. |
| 8 | Special instructions reach the kitchen | Traced the full chain: UI textarea → `notes` in `createOrder()` → `orders.notes` column → `buildKotPayload()` → print agent's existing `payload.notes` rendering. |
| 9 | Printer routing mode | `handleSend()` calls `confirmAndPrintOrder()` automatically when `kitchen_mode === 'printer'`. |
| 10 | Kitchen Display routing mode | `handleSend()` calls `confirmAndKitchenOrder()` automatically when `kitchen_mode === 'kitchen_display'`. |
| 11 | Ask mode | Cart screen renders both routing buttons, same as the dashboard's own order-detail modal in ask mode. |
| 12 | Cancellation effect on Finance | Traced in §14 — no source-based branching anywhere in the cancel/delete/finance code. |
| 13 | Deletion effect on Finance | Same as above. |
| 14 | Discounts | Discount application (`applyDiscount()`/tab-level discount) is entirely tab-based and untouched — staff-assisted orders sit on a normal tab, so discounts apply identically. |
| 15 | Split payment | Split-bill routes (`app/api/split-bills/**`) operate on `tab_id`/`order` records with no `source` dependency — unaffected. |
| 16 | Double-tap / accidental duplicate submit | `handleSend()` guards on a `sendingRef` ref (not just React state, which can lag a fast double-tap) and only clears the cart after `createOrder()` succeeds; a failure leaves the cart intact so nothing is silently lost or duplicated. |
| 17 | Error handling if order creation fails | Cart is preserved, an inline error banner is shown, the staff member can retry — order is never silently dropped. |
| 18 | Error handling if only the auto-confirm step fails | Order already exists exactly once (creation succeeded); a degraded-but-honest message tells the staff member it's saved but waiting in the queue for manual confirmation — never re-submits, never duplicates. |

**Not yet exercised against a live server:** actual browser/click-through testing, and a real Supabase instance running the new migration. These require the user's own local `npm run dev` + applied migration, per §17.

## 16. Production build result

**`npx tsc -p tsconfig.json --noEmit` completed successfully against the full real project** (via the connected device, not this sandbox) and reported **zero errors in any new or modified file**. The 75 errors it did report are all pre-existing, all confined to auto-generated `.next/types/**/page.ts` route-type stub files (a stale-Next.js-type-artifact issue — `PrefetchForTypeCheckInternal` missing export — dated August 20th, three days before this feature's work began, and unrelated to any file this feature touched). A full esbuild syntax sweep of every `.ts`/`.tsx` file in `app/`, `lib/`, and `components/` also passed with zero errors.

**`npm run build` (production webpack build) and `npm run lint` could not be completed in this environment.** As with the earlier Finance feature, this sandbox reaches your project files through a cross-machine bridge whose per-command execution window (45 seconds) is shorter than these commands take to finish — the build was confirmed to be genuinely compiling (it reached webpack's "Creating an optimized production build…" stage before being cut off), not stuck or erroring. I am not claiming a successful production build, because it did not complete here.

**What you need to run locally**, from the project root (`C:\Users\racha\claude_work\foodie-lover-next`):

```
npm run build
npm run lint
```

If `npm run build` fails with `EPERM: operation not permitted, unlink '...\.next\BUILD_ID'`, that's a leftover stale `.next` folder from an earlier interrupted build attempt in this session — delete (or rename) the `.next` folder first, then run `npm run build` again. You may also see a folder named `_next_stale_backup_<timestamp>` in the project root — that's a `.next` folder I renamed out of the way during this session's build attempt (I'm not permitted to delete files on your machine); it's safe to delete once you've confirmed your own build works.

## 17. Assumptions, risks, follow-up

- **Assumption:** "counter" staff and "waiter" staff share the same login/session type (`AuthSession` from `getSession('waiter')`) — the spec didn't describe a separate counter-staff role, and the existing app has none, so pickup/counter orders are placed from the same Waiter Portal login. If counter staff should eventually get their own restricted login, that's a larger change outside this feature's scope.
- **Assumption:** "Guest N" auto-naming (where N = current open-tab count at that table + 1) is an acceptable default display name when staff don't type one in — easy to change if you'd prefer a different convention.
- **Risk:** this environment could not run the app against a live Supabase instance, so behavior has been verified by tracing code paths and reusing already-proven existing functions, not by clicking through the UI. Please do a quick manual pass through the scenarios in §15 after applying the migration.
- **Risk:** `npm run build` / `npm run lint` are unverified end-to-end in this session (§16) — please run them locally before deploying, per your own build-validation requirement.
- **Follow-up idea (not implemented, out of scope per your "do not build a second system" instruction):** a small "🖨️/🖥️ + 📝" indicator badge on the waiter dashboard's order cards showing which orders were staff-submitted vs. customer-submitted, similar to the new Admin breakdown card but at the individual-order level. Only worth adding if you find yourself wanting that distinction while triaging orders day-to-day.

---

### Files touched this feature

**New:** `supabase/migration_020_staff_ordering.sql`, `components/WaiterTakeOrder.tsx`, `docs/staff-ordering-implementation-report.md`

**Modified:** `app/waiter/page.tsx`, `app/api/orders/route.ts`, `app/api/orders/[id]/route.ts`, `lib/supabase-server.ts`, `lib/api.ts`, `app/table/page.tsx`, `app/kitchen/page.tsx`, `app/admin/page.tsx`
