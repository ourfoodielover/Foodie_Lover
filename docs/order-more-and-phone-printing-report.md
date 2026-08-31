# Waiter Order More + Customer Phone Printing — Implementation Report

Scope: Part A (Waiter New Order vs Order More, Dine-In + Pickup) and Part B (customer phone on Pickup/Delivery tickets, including Pickup Order More). Built against the actual current schema, APIs, and print pipeline — no unrelated redesign.

## 1. Root cause of "Waiter always creates a new order"

There were two different problems hiding behind one symptom:

- **Dine-In was already mostly correct at the data layer.** `POST /api/orders` already groups every order under the same `customer_tabs.id` via `tabId`, and `WaiterTakeOrder.tsx` already reused an existing open tab (`selectExistingTab`) instead of creating a new one. What was missing was (a) no backend guard stopped an order from attaching to a tab that was no longer `open` (billing in progress, or already closed), (b) no staff-session check on who was allowed to submit a staff-attributed order, (c) no idempotency key was sent, so a double-tap could create two rounds, and (d) the printed ticket never said "ORDER MORE" so a second round looked identical to a first order.
- **Pickup had no reuse mechanism at all.** `choosePickup()` always jumped straight to a blank guest form and always called `createOrder()` with no relationship to any prior pickup order — this is the actual root cause of Pickup always behaving like a brand-new customer. There was no "Active Pickup Orders" list and no way to attach new items to an order already in the kitchen.

## 2. Files changed

- `app/api/orders/route.ts` — staff-session + tab-status guards on `POST`.
- `app/api/orders/[id]/route.ts` — new `order_more` PATCH action (Pickup), `buildKotPayload()` extended with phone + Order More labeling, dine-in "is this an additional round" detection.
- `lib/api.ts` — `orderMoreOnPickup()`, `genIdempotencyKey()` client functions.
- `components/WaiterTakeOrder.tsx` — Dine-In: existing-orders count + "Order More" labeling, idempotency key on send. Pickup: new "Active Pickup Orders" screen, Order More flow reusing the same menu/cart UI.
- `print-agent/index.js` — `buildKot()`/`buildReceipt()` print phone (Pickup/Delivery only) and an "ORDER MORE" ticket header.
- `supabase/migration_026_order_more.sql` — new, additive migration (see §3/§4).

## 3. Database changes

Deliberately minimal. Most of the requirement needs **no schema change**:

- Dine-In Order More reuses the existing `orders.tab_id` grouping — a second confirmed round on the same tab already gets its own `orders` row with the same `tab_id` (pre-existing behavior in `POST /api/orders`).
- Pickup Order More stays on the **same `orders.id`** rather than inventing a parent/session abstraction. `order_items.item_status` already tracks each item's own kitchen progress per item, so newly-added items naturally show as "pending" next to already-"ready"/"served" items on the same order — no new "round" column needed. Which items are new for the printer ticket is known directly from the just-inserted item ids at write time.
- Keeping Pickup Order More on the same `order_id` means Finance (`lib/finance-server.ts`, which sums completed pickup/delivery orders per individual `order_id`), Spin & Win (`spin_results.order_id` `UNIQUE`), and receipts (`email_queue`/`email_log` `UNIQUE(order_id, ...)`) all keep working completely unmodified.

What **is** added, and why:

1. `order_events.idempotency_key` (nullable) + a partial unique index on `(order_id, idempotency_key)`. `order_events` had no idempotency support at all; Pickup Order More is a new class of write with the same double-click/retry risk `orders.idempotency_key` already protects order creation against, and reusing `order_events` doubles as the audit trail the spec asks to reuse (§A17).
2. `add_pickup_order_items()` — one `SECURITY DEFINER` Postgres function (modeled on the existing `create_vendor_payment()`/`create_salary_payment()` pattern) that does validate-eligibility → insert items → recompute totals → write the audit/idempotency event as a single locked transaction (`FOR UPDATE` on the `orders` row), so concurrent Order More submissions for the same order can't race.

## 4. Migration filename — **apply this**

**`supabase/migration_026_order_more.sql`** — safe to re-run (all `IF NOT EXISTS`/`CREATE OR REPLACE`), purely additive, no data touched. This is the only migration needed for Arc 2. (Arc 1's `migration_025_employee_payroll.sql` from the Employee/Payroll work is still pending application separately, if not already applied.)

I did **not** run this against your live Supabase project — please apply it via the SQL editor.

## 5. Dine-In New Order behavior

Unchanged: table has no eligible `open` tab → waiter goes straight to the New Guest form → `createTab()` → first order. (This already worked correctly.)

## 6. Dine-In Order More behavior

Table has an `open` tab → `tableGuests` screen now shows each active customer with **Party of N · Existing Orders: N · Current Bill: ₹X · "Order More →"**. Tapping it (`selectExistingTab`) reuses the **same `tab_id`** — no new tab, no reset of table/session state. The new order is created via the same `POST /api/orders` call every order uses; because the tab already has a previously-confirmed order, this lands as a genuinely new `orders` row under the same `tab_id` (pre-existing merge-vs-create logic, unchanged). Old `order_items` are never duplicated, re-sent to kitchen, or reprinted — only the new round's items go into the new order row.

## 7. Multiple active-tab handling

`WaiterTakeOrder.tsx` already listed every `open` tab at a table as separate cards (Table 5 / Priya, Table 5 / Manish) — this was not assumed away. Order More display now adds the order count/bill per card; selecting one attaches **only** to that customer's tab, matching the task's example format.

## 8. Pickup New Order behavior

`[+ New Pickup Order]` at the top of the new "Active Pickup Orders" screen goes through the unchanged guest-form → `createOrder()` path (brand-new order, no relation to any other pickup order).

## 9. Pickup Order More behavior

The same screen lists every Pickup order currently in `pending`/`preparing`/`prepared` as **"#1025 — Priya — ₹850 [Order More →]"** (order id, customer, phone if present, current amount, status). Tapping it skips the guest form (nothing new to ask) and opens the same menu/cart UI. Sending calls the new `PATCH /api/orders/[id]` `action: 'order_more'`, which appends only the newly-chosen items to that **same order** via `add_pickup_order_items()` — no new order, no new customer record.

## 10. Order More eligibility rules

- **Dine-In**: tab must exist, belong to the same restaurant, and have `status = 'open'`. `awaiting_payment` (bill requested) or `closed` tabs are never offered in the UI (`getTabs('open')` already filters to exactly `status='open'`) and are rejected server-side with *"Billing/payment is already in progress for this customer."* if attempted anyway.
- **Pickup**: order must be `type = 'pickup'` and `status` in `pending`/`preparing`/`prepared` — i.e. already confirmed by a waiter, not yet completed/cancelled/void. No parallel status system was invented; these are the exact existing statuses.

## 11. How duplicate tabs/orders are prevented

- Dine-In never creates a second tab for the same customer — `selectExistingTab` only ever sets `ctx.tabId` to the existing tab's id.
- Pickup Order More never creates a second order row — it's a `PATCH` against the existing order's id, not a `POST`.
- The new tab-status guard (§16) additionally stops *any* caller (waiter or customer QR) from attaching an order to a tab that isn't `open`.

## 12. Idempotency / concurrency protection

- **Dine-In**: `WaiterTakeOrder.tsx` now generates a per-submission `idempotencyKey` and sends it on every `createOrder()` call (client-side `genIdempotencyKey()`); the server-side check in `POST /api/orders` already existed (migration_021) and simply wasn't being used by the waiter UI before — a double-click or retry now returns the original order instead of creating a duplicate.
- **Pickup Order More**: `add_pickup_order_items()` takes an idempotency key and enforces it via the new partial unique index under a row lock — a duplicate submission (same key) returns `{alreadyExists:true}` without inserting again, and the UI surfaces "Already sent (duplicate tap ignored)".
- **Concurrency**: the RPC's `FOR UPDATE` lock on the `orders` row serializes two simultaneous Order More submissions (two devices, or a legitimate retry racing the original) so totals can't be corrupted by an interleaved read-modify-write. Eligibility (`type`, `status`) is re-checked *inside* the locked transaction, not just by the calling route, so a tab/order that was closed/completed a moment earlier is caught even under a race.
- The Dine-In tab-status guard in `POST /api/orders` is a plain check-then-act (not a full transaction) — this matches this codebase's existing convention elsewhere (most write paths here use unique-constraint backstops rather than `SERIALIZABLE` transactions), but it is a real, meaningful improvement over the previous *zero* check. A residual, very narrow race (tab closes in the exact instant between the check and the insert) is not fully eliminated for the dine-in path the way it is for the new Pickup RPC — flagging this honestly rather than overclaiming full atomicity there.

## 13. How Kitchen receives only new items

Kitchen Display filters to orders with `status` in `pending`/`preparing`/`prepared` and reads each order's live `order_items` with their own `item_status`. Newly-added items land with `item_status='pending'` alongside already-`ready`/`served` items on the same order card — kitchen staff see exactly what's new by item status, without any change to already-progressed items.

## 14. How Printer receives only new items

The `order_more` action builds a **separate** print job whose payload items are built **only** from the just-inserted item rows (fetched by the ids the RPC returns), never the order's full item list. The original ticket's print job is untouched.

## 15. Combined Manager billing

No change was needed. Manager's pickup completion (`doCompletePickup`) already reads `order.total` directly, and `order.total` is updated in place by `add_pickup_order_items()` — so Manager sees the correct combined amount automatically. Dine-in Manager billing already aggregates all non-cancelled/void orders per tab (`Math.max(tab.total, sum of orders)`), unaffected by this change.

## 16. How Finance avoids duplicate revenue

Both designs deliberately avoid touching Finance at all:
- Dine-in Finance recognizes revenue once, from `customer_tabs.status='closed'`, never from individual orders — unaffected by how many rounds are on the tab.
- Pickup Finance recognizes revenue once per `orders.id` where `status='completed'` — because Order More stays on the same `order_id`, the final completed total is the combined amount, counted exactly once. There is no second `order_id` that could be separately completed and double-counted.

## 17. Discount/coupon behavior

Unchanged. Dine-in discounts/coupons are tab-level, computed once at tab close against the sum of all non-cancelled/void orders on the tab — already multi-order-safe. Pickup discounts are order-level and apply to the one order's final total, computed once at payment time in Manager — Order More just changes what that total is before the discount is applied, exactly like any other item addition would.

## 18. Spin & Win behavior

Unchanged and safe by construction: dine-in eligibility is gated by `UNIQUE(tab_id)` in `spin_results` and requires `tab.status='closed'`; pickup eligibility is gated by `UNIQUE(order_id)` and requires the order to reach `completed`. Because Order More never creates a second tab or a second order row, there is no second `tab_id`/`order_id` that could independently earn a second spin.

## 19. Receipt behavior

Unchanged. Dine-in still sends one combined receipt at tab close. Pickup still sends one receipt when the (single) order transitions to `completed`, and by then its total already reflects every Order More round.

## 20. Where Pickup/Delivery phone originates

The existing `orders.phone` column — no new field was added (`lib/api.ts`'s `Order.phone`, already populated from the guest form / customer QR / online order).

## 21. How phone reaches print payload/agent

`buildKotPayload()` in `app/api/orders/[id]/route.ts` now sets `customerPhone` from `order.phone`, but **only** when `order.type !== 'dine-in'`. `print-agent/index.js`'s `buildKot()`/`buildReceipt()` read `payload.customerPhone` through a new `safePhone()` helper and print a `Phone:` line only when it's a real, non-empty string.

## 22. Final Pickup ticket behavior

```
KITCHEN ORDER TICKET
#1025
============================
Type:  PICKUP
Guest: Priya
Phone: 9876543210
Time:  ...
============================
2 x Chicken Biryani
============================
```

## 23. Final Pickup Order More ticket behavior

```
ORDER MORE
#1025
============================
Type:  PICKUP — ORDER MORE
Guest: Priya
Phone: 9876543210
Time:  ...
============================
2 x Coke
1 x Chicken 65
============================
```
Only the newly-added items appear — the original items are never reprinted.

## 24. Final Delivery ticket behavior

```
KITCHEN ORDER TICKET
#1030
============================
Type:  DELIVERY
Guest: Manish
Phone: 9876543210
Addr:  <delivery address>
Time:  ...
============================
...items...
```
No Order More workflow was built for Delivery (not requested — §B4), but the phone-printing plumbing (`buildKotPayload` → payload → print agent) is shared, so extending Order More to Delivery later needs no printing changes.

## 25. Missing-phone behavior

`buildKotPayload()` coerces `order.phone` to a trimmed string or `null`; `safePhone()` in the print agent treats anything that isn't a non-empty string as "no phone" and simply omits the `Phone:` line — never prints `undefined`/`null`/`[object Object]`. No phone requirement anywhere blocks order creation, confirmation, kitchen routing, print-job creation, printing, or payment — this was never made a hard requirement in any validation path.

## 26. Security protections

- The `order_more` action runs through the same `requireAnyStaff` gate every other staff PATCH action on this route already uses (Waiter/Manager/Admin/Kitchen/Delivery role, valid session cookie).
- `POST /api/orders` now requires a valid staff session whenever the body claims `createdByStaffId` — previously **anyone** could POST a staff-attributed order with no authentication at all; this was a pre-existing gap, now closed for the Order More path (and for regular staff order creation). The session's own `staffId` is used server-side, not the client-supplied value, so a waiter cannot submit under another staff member's name.
- Both dine-in tab attachment and Pickup Order More revalidate target eligibility **server-side** (tab must be `open`; pickup order must still be `pending`/`preparing`/`prepared`) rather than trusting the client — a waiter cannot attach an order to a closed/arbitrary tab or a finished pickup order by tampering with the request body.
- Pre-existing, unchanged: item prices/subtotals are trusted from the client on every order-creation and Order More path in this codebase (no server-side menu-price re-validation exists anywhere today) — Order More was kept consistent with this existing trust model rather than selectively hardening just one path.
- Phone numbers are never added to server logs/error messages — only into the print payload, which was the whole point.

## 27. Realtime behavior

Dine-In Order More goes through the existing `POST /api/orders`, which already calls `broadcast(rid, 'order_created', order)` — realtime already works for free. Pickup Order More broadcasts `order_event_added` (already an allow-listed event name every portal's realtime client subscribes to) with the updated order — Kitchen/Waiter/Manager pick it up via their existing subscription plus their existing 5-second poll fallback. No new realtime channel or subscription was created.

## 28. Lint / typecheck / build results

- `npx tsc --noEmit` — clean, no errors.
- `npx eslint` on every new/changed TypeScript file — clean (verified the only warnings that appear anywhere in these files — two pre-existing `WaiterTakeOrder.tsx` unused-var warnings and the pre-existing `require()`-style warnings/errors in `print-agent/index.js`, a plain Node/CommonJS script outside the Next.js TS lint scope — are identical before and after this change, confirmed via `git stash`).
- `rm -rf .next && npm run build` — compiled successfully; all routes registered, including `/api/orders` and `/api/orders/[id]`.
- No automated test suite exists in this repo to run beyond the above.
- **Not performed** (and not claimed): no physical printer or live Supabase database was exercised — this was build/type/lint verification and manual code tracing only, as instructed.

## 29. What needs manual deploy/apply

1. Apply `supabase/migration_026_order_more.sql` in the Supabase SQL editor (and `migration_025_employee_payroll.sql` from the earlier Employee/Payroll work, if not already applied).
2. Redeploy the app with the changed files above.
3. No print-agent redeploy steps beyond restarting the Node process running `print-agent/index.js`, since it's a long-running poller (pick up the new file, restart it).
4. No `.env`/config changes required.

## 30. Exact live tests to run after deploying

**Dine-In**
1. Seat a table, place an order, confirm it, then use "Order More" for the same customer — verify one tab, two orders, one combined Manager bill, one ticket labeled "ORDER MORE" showing only the new items.
2. Two different customers at the same table (two open tabs) — verify Order More on one never touches the other's bill.
3. Ask for the bill (tab → `awaiting_payment`) then try Order More for that customer — verify it's not offered in the UI, and a direct API call is rejected with 409.
4. Double-tap "Send" on an Order More submission — verify exactly one additional order is created.

**Pickup**
5. Confirm a pickup order (printer or kitchen display, whichever your restaurant is configured for), then open Waiter → Pickup → find it in "Active Pickup Orders" → Order More — verify the ticket shows only the new items, the order's total is the combined amount, and Manager's pickup-complete flow charges the combined total.
6. Double-tap "Send Order More" — verify only one set of items is added (check `order_items` count and the printed ticket count).
7. Try Order More on a pickup order after marking it `completed` — verify it's rejected (409) and not offered in the "Active Pickup Orders" list.
8. Complete the pickup order and verify exactly one receipt email and (if eligible) exactly one Spin & Win invite is sent, and Finance's System Sales figure reflects the combined total exactly once.

**Printing**
9. Print a normal Pickup ticket and a normal Delivery ticket — verify `Phone:` appears near the guest/address lines, and Dine-In tickets still show no phone line at all.
10. Create a pickup/delivery order with no phone entered — verify the ticket prints fine with no `Phone:` line (never "undefined"/"null").

**Reliability / regression pass**
11. Run through the existing, already-working flows unaffected by this change — Customer QR ordering and its own Order More (if used), Online ordering, plain Waiter New Order (dine-in and pickup), Kitchen Display, Manager billing/split-bills, Discounts/offers/coupons, Spin & Win, Receipts/email, Delivery, Reset Test Data, and normal realtime updates — to confirm none of them regressed.
