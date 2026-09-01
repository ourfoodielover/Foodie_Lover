# Bill / Customer Receipt Printing — Implementation Report

Scope: a second, financial/customer-facing printing workflow (CUSTOMER_BILL, CUSTOMER_RECEIPT) alongside the existing, unchanged KITCHEN_TICKET workflow. Web/backend only — the physical print-agent project is a separate, out-of-scope codebase; nothing under `print-agent/` was touched.

## 1. Existing kitchen print-job contract (unchanged)

`print_jobs` (migration_010): `id, restaurant_id, order_id (was NOT NULL), job_type ('kot'|'receipt'), status, printer_id, payload JSONB, attempts, error, requested_by, is_reprint, created_at, updated_at, printed_at`.

KOT payload (`buildKotPayload()` in `app/api/orders/[id]/route.ts`, untouched): `{ orderId, orderNumber, type, tableId, customerName, customerPhone, deliveryAddress, isOrderMore, existingTabId, items:[{name,qty}], notes, createdAt }`. Still produced exactly as before for every `confirm_and_print`, pickup/delivery `order_more`, and a `reprint` with `jobType:'kot'`. No field removed, renamed, or reshaped.

## 2. New bill/receipt print-job contract

No new `job_type` enum value was added — `job_type` stays `'kot'|'receipt'` (the CHECK constraint is untouched). `job_type:'receipt'` already existed structurally (reachable via the old `reprint` action's `jobType:'receipt'`) but never carried real financial content — it built the same KOT payload. That gap is now filled: a Bill/Receipt job is `job_type:'receipt'` with a payload whose `docType` field (`'CUSTOMER_BILL' | 'CUSTOMER_RECEIPT'`) is the finer discriminator, per your instruction to use a flexible existing field rather than invent a new enum.

Payload shape (`buildBillReceiptPayload()` in `lib/billing-server.ts`):
```
{
  docType: 'CUSTOMER_BILL' | 'CUSTOMER_RECEIPT',
  restaurantName, orderType: 'dine-in'|'pickup'|'delivery',
  tabId, orderId, orderIds: string[], orderNumber, tableLabel,
  customerName, customerPhone, deliveryAddress,
  items: [{name, qty, price, subtotal}],
  rounds: [{orderId, orderNumber, source, createdAt, items}] | undefined,  // dine-in only
  subtotal, discount, discountReason, couponCode, couponDiscount, total,
  paymentStatus: 'PENDING' | 'PAID',
  paymentMethod: string | null,   // only set when paymentStatus === 'PAID'
  amountDue, amountToCollect,     // amountToCollect only set for an unpaid delivery
  isReprint, requestedBy, generatedAt
}
```

`order_id` is now nullable and a new `tab_id` column was added (both order-scoped and tab-scoped print jobs live in the same table), with a CHECK requiring at least one of the two.

## 3. Example Dine-In Bill payload

```json
{
  "docType": "CUSTOMER_BILL",
  "restaurantName": "Foodie Lover",
  "orderType": "dine-in",
  "tabId": "TAB_1234",
  "orderId": null,
  "orderIds": ["ORD_1001", "ORD_1007"],
  "tableLabel": "Table 4",
  "customerName": "Priya",
  "customerPhone": null,
  "items": [{"name":"Paneer Tikka","qty":1,"price":220,"subtotal":220},
            {"name":"Butter Naan","qty":2,"price":40,"subtotal":80}],
  "rounds": [
    {"orderId":"ORD_1001","orderNumber":1001,"source":"table-qr","items":[{"name":"Paneer Tikka","qty":1,"price":220,"subtotal":220}]},
    {"orderId":"ORD_1007","orderNumber":1007,"source":"waiter","items":[{"name":"Butter Naan","qty":2,"price":40,"subtotal":80}]}
  ],
  "subtotal": 300, "discount": 0, "discountReason": null,
  "couponCode": "WELCOME10", "couponDiscount": 30, "total": 270,
  "paymentStatus": "PENDING", "paymentMethod": null,
  "amountDue": 270, "isReprint": false, "requestedBy": "Waiter Ravi"
}
```

## 4. Example Pickup Receipt payload

```json
{
  "docType": "CUSTOMER_RECEIPT",
  "orderType": "pickup",
  "orderId": "ORD_2050", "orderIds": ["ORD_2050"], "orderNumber": 2050,
  "customerName": "Manish", "customerPhone": "9876500000",
  "items": [{"name":"Veg Biryani","qty":1,"price":180,"subtotal":180},
            {"name":"Cold Coffee","qty":1,"price":90,"subtotal":90}],
  "subtotal": 270, "discount": 20, "discountReason": "Manager discount",
  "couponCode": null, "couponDiscount": 0, "total": 250,
  "paymentStatus": "PAID", "paymentMethod": "UPI",
  "amountDue": 0, "isReprint": false, "requestedBy": "Manager Asha"
}
```

## 5. Example Delivery Receipt payload (unpaid COD)

```json
{
  "docType": "CUSTOMER_BILL",
  "orderType": "delivery",
  "orderId": "ORD_3090", "orderIds": ["ORD_3090"], "orderNumber": 3090,
  "customerName": "Kabir", "customerPhone": "9998887777",
  "deliveryAddress": "12 MG Road, Flat 3B",
  "items": [{"name":"Chicken Curry","qty":1,"price":260,"subtotal":260}],
  "subtotal": 260, "discount": 0, "couponCode": null, "couponDiscount": 0, "total": 260,
  "paymentStatus": "PENDING", "paymentMethod": null,
  "amountDue": 260, "amountToCollect": 260,
  "isReprint": false, "requestedBy": "delivery staff"
}
```
(Once `doDeliveredWithPayment()` completes, the same order printed as `docType:'CUSTOMER_RECEIPT'` returns `paymentStatus:'PAID'`, `paymentMethod:'Cash'`, `amountDue:0`, no `amountToCollect`.)

## 6. Fields the separate print-agent project must support

To render these documents it needs to branch on `payload.docType`: `KITCHEN_TICKET` uses today's fields unchanged; `CUSTOMER_BILL`/`CUSTOMER_RECEIPT` need a new template reading `restaurantName, orderType, tableLabel, customerName, customerPhone, deliveryAddress, items[], rounds[] (dine-in, optional), subtotal, discount, discountReason, couponCode, couponDiscount, total, paymentStatus, paymentMethod, amountDue, amountToCollect, isReprint, requestedBy, generatedAt`. It must print "REPRINT" when `isReprint:true`, must never print "PAID" unless `paymentStatus==='PAID'`, and should print `amountToCollect` prominently when present (unpaid delivery/COD). The agent's poll query should also select the new `tab_id` column (harmless — `null` for every job type it already handles) since a Dine-In bill job has `order_id: null`.

## 7. Backward compatibility of existing kitchen print jobs

Fully preserved. `job_type` CHECK constraint unchanged. `buildKotPayload()` unchanged — same shape, same call sites, same fields. `order_id` becoming nullable does not affect any existing KOT job (they all still set `order_id`). The one real risk found and fixed: `PATCH /api/print-jobs/[id]` used to unconditionally insert an `order_events` row keyed on `job.order_id` — once a job can have `order_id: null` (a Dine-In bill job) that insert would violate `order_events.order_id`'s `NOT NULL` and 500 the whole status-report call even though the job's own status update had already succeeded. Fixed by guarding with `if (eventType && job.order_id)` — a Dine-In bill/receipt job simply has no per-order audit event (its audit trail lives in `order_events` rows on its `orderIds` instead, written by `POST /api/billing/print`, not the status-callback route). Any pending/`failed`/queued KOT job created before this deploy still has a non-null `order_id` and behaves identically after it.

## 8. Database migration required

`supabase/migration_027_customer_bill_receipt.sql` — **not yet applied to any live database**, per standing instruction. Apply manually via the Supabase SQL editor before deploying this code. It is idempotent/safe to re-run (`IF NOT EXISTS` / exception-guarded everywhere). It:
1. Drops `NOT NULL` on `print_jobs.order_id`.
2. Adds `print_jobs.tab_id` (nullable FK → `customer_tabs`, `ON DELETE CASCADE`) + index.
3. Adds a CHECK requiring `order_id IS NOT NULL OR tab_id IS NOT NULL`.
4. Adds `print_jobs.idempotency_key` + a partial unique index on `(restaurant_id, idempotency_key)`.

No other table changed. No receipt/snapshot table was created (see §11).

## 9. What the separate print-app project will need later

- Handle `payload.docType` (new field) with a fallback: if absent, treat as `KITCHEN_TICKET` (100% backward compatible with jobs queued before this deploy).
- Add a financial-document ESC/POS template (bill vs. receipt, PAID vs. PENDING banner, discount/coupon lines, AMOUNT TO COLLECT callout, REPRINT marker).
- Read the new `tab_id` field (nullable) alongside `order_id`.
- Nothing else changes — same polling endpoint, same auth header, same job lifecycle (`queued→printing→printed/failed`), same `PATCH /api/print-jobs/[id]` status callback shape.

## 10. Server-authoritative computation (`lib/billing-server.ts`)

`computeDineInBill(sb, restaurantId, tabId)` mirrors `app/manager/page.tsx`'s already-shipped formula exactly: `subtotal = Math.max(tab.total, Σ live order.total)`, `total = Math.max(0, subtotal - tab.discount - tab.coupon_discount)`. Scoped strictly by `tab_id` — a different customer's tab at the same table is never read. `computeOrderBill(sb, restaurantId, orderId, expectedType)` trusts `orders.total` directly (already net-of-discount at write time) and rejects a type mismatch (e.g. calling it against a dine-in order) instead of silently mis-rendering.

Neither function writes anything. `buildBillReceiptPayload()` hard-forces `paymentStatus:'PENDING'` for `docType:'CUSTOMER_BILL'` regardless of underlying state, and only allows `'PAID'` for `docType:'CUSTOMER_RECEIPT'` when `bill.isPaid` is actually true — a bill can never claim PAID, a receipt can never lie about it.

## 11. Deliberate scoping decisions (documented, not oversights)

- **No receipt/snapshot table.** A closed `customer_tabs` row and a `completed`/`delivered` order are never mutated again by any existing code path — re-deriving the bill from stored `orders`/`order_items`/`discount`/`coupon_discount` at print time is already equivalent to a frozen snapshot, with no duplicate store to drift out of sync.
- **No new job_type enum value.** `docType` inside the existing flexible `payload` JSONB carries the finer distinction.
- **Discount/coupon fields read directly off `customer_tabs`/`orders`**, never recomputed. For dine-in, `coupon_discount`/`coupon_code` are populated at "Request Bill" time (`app/table/page.tsx`'s `handleRequestBill()` PATCHes them onto the tab pre-close) and finalized at actual tab close — printing never redeems, computes, or touches `reward_coupons` itself.
- **Coupon/discount visibility parity with the existing UI**: the Bill/Receipt shows the same discount and coupon fields Manager's on-screen bill summary already shows to any staff role that can open it (waiter/manager/admin for dine-in and pickup, delivery/manager/admin for delivery) — no new per-field redaction was invented beyond the existing route-level role gates, since the existing Waiter Bill-Requested Banner already surfaces the discount-adjusted amount to waiters with no restriction.

## 12. Files changed / added

- `supabase/migration_027_customer_bill_receipt.sql` (new, not applied)
- `lib/billing-server.ts` (new) — `computeDineInBill`, `computeOrderBill`, `buildBillReceiptPayload`, `prettyPayment`
- `app/api/billing/tab/[tabId]/route.ts` (new) — GET Dine-In bill
- `app/api/billing/order/[orderId]/route.ts` (new) — GET Pickup/Delivery bill
- `app/api/billing/print/route.ts` (new) — POST, queues the real print_jobs row
- `app/api/print-jobs/[id]/route.ts` — bug fix (§7) + `tab_id` in select/broadcast
- `app/api/print-jobs/route.ts` — `tab_id` added to the print-agent's SELECT
- `lib/api.ts` — `getDineInBill`, `getOrderBill`, `printBill`, `BillData`/`BillLineItem`/`BillRound` types
- `components/BillModal.tsx` (new) — shared View/Print Bill/Receipt UI
- `app/waiter/page.tsx` — 🧾 Bill button on both Bill-Requested Banner sections
- `components/WaiterTakeOrder.tsx` — 🧾 Bill button per exact customer_tab card (Table → Active Customers)
- `app/manager/page.tsx` — View/Print Bill button on the dine-in tab panel and the pickup payment modal
- `app/delivery/page.tsx` — View/Print Receipt button for `out_for_delivery`/`delivered` orders

## 13. Dine-In bill request flow

Unchanged: `app/table/page.tsx`'s `handleRequestBill()` still sets `customer_tabs.status → 'awaiting_payment'`, which is what the Waiter's existing Bill-Requested Banner reacts to. This task adds the `[View Bill]`/`[Print Bill]` buttons the spec asked for onto that existing notification — no new notification mechanism, so no risk of duplicate notifications from realtime re-renders (the banner's list is still derived by filtering the polled/broadcast `tabs` state exactly as before).

## 14. Dine-In bill correctness

Every non-cancelled/void order sharing `tab_id` is summed — QR + every Order More round, regardless of who created it — matching Arc 2/3's Order More work exactly. A different customer's tab at the same physical table is never read (every query is `tab_id`-scoped, never `table_id`-scoped).

## 15. Waiter manual print (no customer request required)

`components/WaiterTakeOrder.tsx`'s Table → Active Customers screen now has a 🧾 Bill button per exact `customer_tab` card, independent of the tab's `status` — works on an `open` tab exactly as well as an `awaiting_payment` one.

## 16. "View Bill" / physical print use identical computation

Both `GET /api/billing/tab/[tabId]` (View) and `POST /api/billing/print` (Print) call the exact same `computeDineInBill()`/`computeOrderBill()` — there is no second, divergent calculation path.

## 17. Coupon security

`lib/billing-server.ts` is read-only — no `reward_coupons` write exists anywhere in this file or in `app/api/billing/*`. Printing/reprinting cannot redeem, consume, create, or modify a coupon; cannot change discount/total; cannot trigger Spin & Win; cannot touch Finance.

## 18. Pre-payment bill wording

`paymentStatus` is always `'PENDING'` for `docType:'CUSTOMER_BILL'` — enforced unconditionally in `buildBillReceiptPayload()`, not by convention. `BillModal.tsx` renders "PAYMENT STATUS: PENDING" / "TOTAL DUE" pre-payment, "✅ PAID · {method}" / "TOTAL PAID" post-payment.

## 19. Split payments on the receipt

No new data modeling — `payment_method` on both `customer_tabs` and `orders` already stores a composed human-readable string for split payments (e.g. `"Cash ₹500 + UPI ₹580"`), written by the existing tab-close and `doDeliveredWithPayment()` flows. `prettyPayment()` passes such strings through unchanged and only prettifies a single simple code via a label map.

## 20. Pickup — kitchen ticket vs. bill/receipt

Kitchen ticket printing (`buildKotPayload()`, phone included) is completely unchanged. The new View/Print Bill button in Manager's pickup payment modal is a separate action hitting `/api/billing/order/[orderId]` — Order More rounds already live on the same `order_id` (Arc 2), so `order_items` for that order already IS "every valid billable item for the complete pickup session" with no extra logic needed.

## 21. Delivery

Kitchen ticket printing unchanged. A new 🧾 View/Print Receipt button appears on `out_for_delivery` and `delivered` cards in `app/delivery/page.tsx`, reusing the existing delivery-portal role session (no new/insecure public endpoint) and the existing print-job pipeline (no assumption of a phone-local Bluetooth printer). COD/unpaid shows "AMOUNT TO COLLECT: ₹X" prominently; prepaid/delivered shows PAID with the real recorded method. Phone and delivery address are both included in the payload.

## 22. Phone number handling

Single source of truth: `orders.phone` / `customer_tabs.phone` (no duplicate field added). `safeStr()` in `lib/billing-server.ts` coerces to `null` for empty/`"undefined"`/`"null"`/object values — the payload's `customerPhone` can never render as those literal strings. `BillModal.tsx` only renders the phone line when it's a truthy string.

## 23. Reprint support

`printBill({ isReprint: true, ... })` — never creates a new order, never changes order/tab status, never collects payment, never touches Finance, never re-redeems a coupon, never re-triggers Spin & Win, never resends kitchen items (it only ever inserts a `job_type:'receipt'` row). It DOES create another physical `print_jobs` row on purpose, marked `is_reprint:true` and `payload.isReprint:true` (the print-agent template is expected to render "REPRINT" from this flag). `BillModal.tsx` surfaces this as a "🔁 Reprint Bill/Receipt" button after the first successful print.

## 24. Print snapshot consistency

A pre-payment Bill reflects current state on every fetch (re-summed live). A post-payment Receipt is effectively immutable because nothing in this codebase mutates a `closed` tab or a `completed`/`delivered` order's `orders`/`order_items` rows afterward — re-deriving from stored data at print/reprint time always returns the same figures, using the prices actually stored on `order_items` (never today's live menu prices).

## 25. Thermal formatting

Out of scope per your addendum — the print-agent (unseen, separate project) owns width/encoding/ESC-POS layout. The payload carries plain strings/numbers only, no pre-formatted text, so the agent can adapt to its actual configured printer width; `restaurantName`/`customerName`/`deliveryAddress`/item names are passed as-is (already length-safe strings from the DB) with no truncation assumptions baked in here.

## 26. print_jobs schema/payload extension

Backward compatible by construction — see §2 and §7.

## 27. Print failure isolation

`POST /api/billing/print` only ever inserts into `print_jobs` (+ non-fatal, try/catch-wrapped `order_events` audit rows). It never touches `orders`, `customer_tabs`, `reward_coupons`, or any Finance table — a failed physical print (agent-side, out of scope) cannot roll back or affect payment/order/Finance state, and "Retry Print" is already supported by the existing `failed`-status polling in `GET /api/print-jobs` (unchanged).

## 28. Idempotency

A normal Print tap sends a fresh `idempotencyKey`; a double-click/network-retry with the SAME key returns the already-created job (checked pre-insert, and again on a `23505` unique-violation race) instead of creating a duplicate `print_jobs` row. An intentional Reprint sends a new key (or omits it), so it's allowed to create another job on purpose — mirrors the `orders.idempotency_key`/`order_events.idempotency_key` pattern already used elsewhere in this codebase.

## 29. Authorization

- Dine-In bill (`GET /api/billing/tab/[tabId]`, and `POST /api/billing/print` with `kind:'dine-in'`): waiter/manager/admin.
- Pickup bill: waiter/manager/admin.
- Delivery bill/receipt: delivery/manager/admin.
- `GET /api/billing/order/[orderId]` derives the actual role gate from the order's real `type` in the DB (never a client-supplied hint) — a caller can't relabel a delivery order as "pickup" to dodge the delivery-only gate.
- No arbitrary bill/receipt lookup by ID without a valid staff session — every route calls `requireRole`/`requireAnyStaff` before touching the DB.

## Regression test matrix (61 items)

**A. Existing kitchen-print regression (must be unaffected)**
1. Waiter Confirm & Print on a fresh dine-in order → KOT prints, `order_id` set, `docType` absent (old shape) — print-agent (if it already ignores unknown fields) renders unchanged.
2. Same for Pickup, Delivery.
3. Waiter Reprint (`jobType:'kot'`) on an already-confirmed order → new `kot` job, same payload shape as before.
4. Pickup Order More → new-items-only KOT job still created exactly as before (Arc 2 unaffected).
5. Dine-in Order More (QR or waiter) → "ORDER MORE" ticket label still appears, unaffected.
6. `GET /api/print-jobs` still returns queued/failed KOT jobs (now also selecting `tab_id`, which is `null` for all of these — harmless).
7. `PATCH /api/print-jobs/[id]` status callback on a KOT job (`order_id` set) still writes its `order_events` row exactly as before.
8. A KOT job created BEFORE this deploy (old row, no `tab_id` column populated) still polls and status-updates correctly after deploy.
9. Print agent auth (`x-print-agent-key`) unchanged on both routes.
10. Kitchen Display flow (`kitchen_route:'kitchen_display'`) completely untouched — no print job at all, as before.

**B. Dine-In Bill**
11. Waiter taps 🧾 Bill on a `tabsReadyForCounter` banner row → modal loads, total matches what Manager's own panel shows for the same tab.
12. Same for a `tabsWithPendingFood` row (bill still viewable/printable before all food is served).
13. Print Bill → real `print_jobs` row created with `job_type:'receipt'`, `tab_id` set, `order_id` null, `payload.docType:'CUSTOMER_BILL'`, `paymentStatus:'PENDING'`.
14. Print Bill on a tab with 2 rounds (QR order + waiter Order More) → both rounds' items appear, `orderIds` has both ids.
15. Two different customers at the same table (Priya, Manish) → printing Priya's bill never includes Manish's items/total.
16. Tab with a manager-applied flat discount → `discount`/`discountReason` appear on the printed payload and modal, total matches Manager's `tabBillTotal`.
17. Tab with a "Request Bill"-reserved coupon (not yet closed) → `couponCode`/`couponDiscount` already visible on the Bill (matches Manager's live UI).
18. Print Receipt button is disabled while `tab.status !== 'closed'`.
19. Close the tab (payment collected) → Print Receipt becomes available, `paymentStatus:'PAID'`, `paymentMethod` matches what was collected (including a split-payment composed string).
20. Reprint Bill/Receipt → `is_reprint:true`, a second `print_jobs` row exists, original job untouched.
21. Double-tap Print Bill quickly → exactly one `print_jobs` row (idempotency key).
22. Print Bill 3 times on the same still-open tab → Finance/Coupon/Spin tables completely unaffected each time (no `reward_coupons` row status change, no Finance transaction created).
23. Waiter manual print via Table → Active Customers → 🧾 Bill on an `open` (not yet "Request Bill"-ed) tab succeeds.
24. Coupon fields never populate independently of what's already on `customer_tabs` — a Bill printed for a tab with zero discount shows zero.
25. Waiter role, Manager role, Admin role can all view/print a dine-in bill; Kitchen/Delivery roles are rejected (403) if they somehow call the API directly.

**C. Waiter-direct bill (manual, no customer Request Bill)**
26. A brand-new QR-opened tab with no waiter interaction yet → waiter can still open and print its Bill from Active Customers.
27. A same-named "Guest" tab pair at one table → printing one never touches the other (selection is always by `tab.id`, matching Arc 3's design).

**D. Pickup**
28. Manager's pickup payment modal → 🧾 View/Print Bill shows correct subtotal/discount/total matching the existing payment-flow numbers.
29. Pickup Order More → the financial Bill/Receipt includes ALL rounds' items (unlike the kitchen ticket, which only ever showed new items).
30. Print Bill before payment → `paymentStatus:'PENDING'`, Print Receipt disabled.
31. Complete payment (`doCompletePickup`) → Print Receipt available, `paymentStatus:'PAID'`, correct `paymentMethod`.
32. Kitchen ticket for a new Order More round still only contains the new items (unaffected by this task).
33. Applying a manager offer/discount in the pickup modal, then printing → discount appears correctly on the printed Bill.
34. Reprint Receipt after payment → second job, `order.status` unchanged, no duplicate Finance entry.

**E. Delivery**
35. `out_for_delivery` order, COD → 🧾 View/Print Receipt shows "AMOUNT TO COLLECT: ₹X", `paymentStatus:'PENDING'`, Print Receipt disabled (Print Bill still available).
36. After `doDeliveredWithPayment()` (single method) → Receipt available, correct method, `amountDue:0`.
37. After a split payment at delivery → composed payment string passes through correctly on the receipt.
38. Phone and delivery address both present on the delivery bill/receipt payload.
39. Delivery role can view/print; Waiter role alone (no manager/admin) is rejected (403).
40. Kitchen ticket for the same order (phone printing from Arc 2) is completely unaffected.
41. Re-delivery flow (`isReDeliver`) — Bill/Receipt still computes correctly against the current order state.

**F. Cross-cutting / failure & edge cases**
42. Missing phone on an order → `customerPhone: null` in the payload; UI never renders "undefined"/"null".
43. `PATCH /api/print-jobs/[id]` reporting `status:'printed'` for a tab-scoped job (`order_id: null`) → no crash, no `order_events` insert attempted (guarded), `broadcast` still fires with `tabId`.
44. `PATCH /api/print-jobs/[id]` reporting `status:'failed'` for an order-scoped job → unchanged behavior, `order_events` row still written.
45. Old (pre-deploy) pending KOT job with `order_id` set → the guard's `if (eventType && job.order_id)` still evaluates true, no behavior change.
46. `GET /api/billing/tab/[tabId]` on a non-existent tab id → 404, no crash.
47. `GET /api/billing/order/[orderId]` on a dine-in order id → 400 "not pickup/delivery", not a 500.
48. `POST /api/billing/print` with `docType:'CUSTOMER_RECEIPT'` on an unpaid order/tab → 409, no job created.
49. `POST /api/billing/print` with an invalid `kind` → 400.
50. `POST /api/billing/print` from an unauthenticated request → 401.
51. `POST /api/billing/print` from a Kitchen-role session → 403 for all three kinds.
52. Frontend sending a fabricated `total` in the request body is ignored — the server always recomputes from the DB (verified by inspecting the route: `body` is never read for money fields).
53. Migration re-run twice (`IF NOT EXISTS` / exception guards) → no error, no duplicate columns/constraints.
54. A print job's `payload.docType` missing entirely (hypothetical old row) → print-agent (unseen) is expected to fall back to KOT rendering; nothing in this repo assumes `docType` is always present on read paths outside `lib/billing-server.ts`'s own writer.
55. Reset Test Data → no new dependency on Bill/Receipt data; clearing orders/tabs doesn't error against the new `print_jobs.tab_id`/`idempotency_key` columns (`ON DELETE CASCADE` on `tab_id` matches the existing `order_id` cascade).
56. Realtime: `print_job_updated` broadcast payload now includes `tabId` — verify no existing listener breaks on an unexpected extra field (all realtime consumers destructure specific keys, none do exhaustive object-shape validation).
57. Full regression pass: plain Waiter New Order, Waiter Order More, Pickup Order More, Pickup/Delivery phone printing (Arc 2), Table→Active-Customer Order More (Arc 3), Customer QR ordering, Online ordering, Manager billing, Kitchen Display, Printer/KOT workflow, Finance, Discounts/coupons, Spin & Win, Receipts/email, Delivery, Reset Test Data.
58. `tsc --noEmit` clean.
59. `eslint` on every changed/new file — zero errors (pre-existing warnings unrelated, confirmed via `git stash`).
60. `rm -rf .next && npm run build` — compiles successfully, all three new `/api/billing/*` routes registered.
61. **Not performed**: no live Supabase database or physical printer/print-agent was exercised — this is build/type/lint verification and manual code tracing only, consistent with every prior arc's verification scope.

## What requires manual action

1. Apply `supabase/migration_027_customer_bill_receipt.sql` in the Supabase SQL editor (not auto-applied, per standing instruction).
2. Redeploy the 13 changed/new files listed in §12 (already synced to your local folder).
3. No `.env` changes needed — `PRINT_AGENT_KEY` and Supabase credentials are reused as-is.
4. When you're ready, hand §2–§6/§9 of this report to whoever maintains the separate print-agent project — that's the complete contract it needs to add `CUSTOMER_BILL`/`CUSTOMER_RECEIPT` rendering.
