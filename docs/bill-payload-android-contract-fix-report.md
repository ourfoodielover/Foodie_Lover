# Bill/Receipt Payload — Android Financial Contract Fix

Scope: fix the WEB → `print_jobs.payload` contract for `CUSTOMER_BILL`/`CUSTOMER_RECEIPT` so it matches the Android print-agent's actual financial formatter contract, based on the real failed job (`PJ_1788335816977_88r2yg`). KOT printing is untouched.

## 1. Web financial payload builder file

`lib/billing-server.ts` — specifically `buildBillReceiptPayload()`. This is the only place that assembles a `CUSTOMER_BILL`/`CUSTOMER_RECEIPT` `print_jobs.payload`. Nothing else builds that payload, so this was the only file that needed to change.

## 2. Root cause confirmed

Confirmed from the Android rejection message and the actual failed job's payload contents you supplied: `buildBillReceiptPayload()` was passing the internal `BillLineItem` shape (`{name, qty, price, subtotal}` — used elsewhere for the View-Bill API/UI) straight into `print_jobs.payload.items`, unchanged. Android's financial formatter (`TicketBuilder.buildBill()`/`buildReceipt()`) requires `{name, quantity, unitPrice, lineTotal}` and rejects an item missing `unitPrice`/`lineTotal` — exactly the error you quoted ("missing unitPrice/lineTotal on item 1"). Separately, the payload's document-type discriminator was only `docType`, not the `documentType` name Android's documentation/model expects.

**Caveat on scope of "confirmed":** I do not have access to the Android project (`network/models.kt`, `DocumentType.kt`, `TicketBuilder.kt`) in this workspace — it was already established as a separate, out-of-scope repository in the prior task. Root cause and the corrected field names are confirmed against (a) the exact Android failure message you quoted, and (b) the exact example JSON you provided in your message (§4 of your request), which I've treated as the authoritative source for canonical field names since it's presumably drawn from your read of the actual Android model. I have not independently diffed against Android source and say so explicitly per your instruction not to claim more than was verified.

## 3. Old → new field mapping

| Scope | Old (web) | New canonical (Android) | Kept as extra/legacy? |
|---|---|---|---|
| Document type | `docType` | `documentType` | Yes — `docType` kept alongside, same value, for transition compat |
| Item | `qty` | `quantity` | No — removed from the payload entirely |
| Item | `price` | `unitPrice` | No — removed |
| Item | `subtotal` | `lineTotal` | No — removed |
| Item | *(none)* | `variant` (optional) | Not populated — variant is already embedded in `name` throughout this codebase (e.g. `"Chicken Fry Piece Biryani (Half)"`), matching the existing `OrderItem.variant` comment convention. Nothing fabricated. |
| Document | `discount` + `couponDiscount` (two separate fields) | `discountAmount` (single combined field, `= subtotal − total`, never a raw sum, so it always reconciles against the printed total even at the zero-clamp edge case) | `discount`, `couponDiscount`, `discountReason`, `couponCode` all kept alongside as extra context |
| Document | `subtotal`, `total`, `paymentStatus`, `paymentMethod`, `amountToCollect`, `customerName`, `customerPhone`, `deliveryAddress`, `orderNumber`, `orderType`, `generatedAt`, `isReprint`, `restaurantName`, `orderId` | **unchanged** — these already match your §4 example JSON exactly | — |
| Document | `amountDue`, `tabId`, `orderIds`, `tableLabel`, `rounds` | **unchanged, kept** | Not in your delivery example (which has no tab/rounds concept) but needed for dine-in; kept as additional fields — flagged as unconfirmed against Android in §12 below |

## 4. Final `documentType` behavior

- `documentType` is now the field Android should read to distinguish Bill vs Receipt, exactly as you specified — it is set directly from the `docType` parameter `buildBillReceiptPayload()` already took (`'CUSTOMER_BILL' | 'CUSTOMER_RECEIPT'`), so Print Bill → `documentType:'CUSTOMER_BILL'`, Print Receipt → `documentType:'CUSTOMER_RECEIPT'`, with zero dependency on `job_type` (which stays `'receipt'` for both, per your §5 — the DB CHECK constraint is untouched).
- `docType` is still present, same value, purely as a compatibility alias — safe to delete once you've confirmed Android only reads `documentType`.
- The existing rule that a Bill can never say PAID (payload `paymentStatus` is forced to `'PENDING'` unless `documentType === 'CUSTOMER_RECEIPT'` AND the underlying order/tab is actually paid) is unchanged from the previous implementation.

## 5. Final financial item JSON

```json
{
  "name": "Chicken Fry Piece Biryani (Half)",
  "quantity": 1,
  "unitPrice": 150,
  "lineTotal": 150
}
```
No `qty`/`price`/`subtotal` keys remain on a financial-document item — verified programmatically (see §9).

## 6. Discount field contract

`discountAmount` is now present and authoritative, computed as `Math.max(0, subtotal - total)` (not a raw `discount + couponDiscount` sum) so it's always internally consistent with the printed subtotal/total lines. The pre-existing `discount`, `couponDiscount`, `discountReason`, and `couponCode` fields are kept in the payload unchanged — they were not implicated in the actual failure and your example JSON's `"couponCode": null` shows Android does expect that field name as-is. If Android's model turns out to reject unknown/extra keys (most JSON deserializers, including kotlinx.serialization's default and Gson, do not — but I can't confirm this repo's specific Android decoder), these four extra fields would need to be dropped in a follow-up; I did not remove them because removing working, already-correctly-named fields on a guess would be an unforced change beyond what the failure evidence required.

## 7. Full final CUSTOMER_BILL example JSON (Order #74 scenario, exactly as you specified)

```json
{
  "documentType": "CUSTOMER_BILL",
  "docType": "CUSTOMER_BILL",
  "restaurantName": "Foodie Lover",
  "orderType": "delivery",
  "tabId": null,
  "orderId": "ORD_74",
  "orderIds": ["ORD_74"],
  "orderNumber": 74,
  "tableLabel": null,
  "customerName": "Sathish",
  "customerPhone": "6299118754",
  "deliveryAddress": "Dingra Appartment",
  "items": [
    { "name": "Chicken Fry Piece Biryani (Half)", "quantity": 1, "unitPrice": 150, "lineTotal": 150 }
  ],
  "subtotal": 150,
  "discountAmount": 0,
  "discount": 0,
  "discountReason": null,
  "couponCode": null,
  "couponDiscount": 0,
  "total": 150,
  "paymentStatus": "PENDING",
  "paymentMethod": null,
  "amountDue": 150,
  "amountToCollect": 150,
  "isReprint": false,
  "requestedBy": "delivery staff",
  "generatedAt": "2026-09-02T18:49:35.119Z"
}
```
This is the literal output of `buildBillReceiptPayload()` run against a `BillData` matching the failed job's scenario (see `scripts/verify-bill-payload.ts`) — not hand-typed.

## 8. Full final CUSTOMER_RECEIPT example JSON (same order, now paid)

```json
{
  "documentType": "CUSTOMER_RECEIPT",
  "docType": "CUSTOMER_RECEIPT",
  "restaurantName": "Foodie Lover",
  "orderType": "delivery",
  "tabId": null,
  "orderId": "ORD_74",
  "orderIds": ["ORD_74"],
  "orderNumber": 74,
  "tableLabel": null,
  "customerName": "Sathish",
  "customerPhone": "6299118754",
  "deliveryAddress": "Dingra Appartment",
  "items": [
    { "name": "Chicken Fry Piece Biryani (Half)", "quantity": 1, "unitPrice": 150, "lineTotal": 150 }
  ],
  "subtotal": 150,
  "discountAmount": 0,
  "discount": 0,
  "discountReason": null,
  "couponCode": null,
  "couponDiscount": 0,
  "total": 150,
  "paymentStatus": "PAID",
  "paymentMethod": "Cash",
  "amountDue": 0,
  "isReprint": false,
  "requestedBy": "delivery staff",
  "generatedAt": "2026-09-02T18:49:54.822Z"
}
```
Note `amountToCollect` is correctly absent once paid (it's only ever set for an unpaid delivery document).

## 9. Confirmation existing KOT payload was NOT changed

`buildKotPayload()` in `app/api/orders/[id]/route.ts` was not opened or edited this turn — `git status`/`git diff` confirm the only change in this task is `lib/billing-server.ts`. KOT items remain `{name, qty}` exactly as before; `confirm_and_print`, Order More KOT, `printer_id`, `job_type='kot'`, and the whole print_jobs lifecycle are untouched. `buildBillReceiptPayload()` (the only function edited) is never called from any KOT code path — it's only reachable from `POST /api/billing/print`.

## 10. Type/build/test results

- `npx tsc --noEmit` — clean.
- `npx eslint lib/billing-server.ts` — clean, 0 warnings/errors.
- `rm -rf .next && npm run build` — compiled successfully, all routes (including the three `/api/billing/*` routes) registered exactly as before.
- **New**: `scripts/verify-bill-payload.ts` — a standalone, DB-free contract check (`npx tsx scripts/verify-bill-payload.ts`) that constructs `BillData` for the exact failed scenario (Order #74 delivery) plus five more cases (paid receipt, reprint, dine-in with 2 rounds + coupon, pickup multi-item + manager discount) and asserts: `documentType` present and correct; `items[].quantity`/`unitPrice`/`lineTotal` present; `items[].qty`/`price`/`subtotal` absent; `subtotal`/`total`/`discountAmount` present and arithmetically consistent; `paymentStatus`/`amountToCollect`/`paymentMethod` correct per paid/unpaid state; dine-in `rounds[].items` also use the canonical shape (not just the flat `items` array) — **all checks passed**. This file has no runtime dependents; it's a one-off verification script, safe to delete or keep as a regression check.
- **Not performed, per your explicit instruction**: no physical print, no Android APK test, no retry of the old failed job `PJ_1788335816977_88r2yg`. That job still sits at `status='failed', attempts=5` with its original malformed payload — untouched.

## 11. Database migration needed

None. This is a pure application-code change to how one function builds a JSON blob that was already being written into the existing `print_jobs.payload` JSONB column. No schema change.

## 12. Whether existing Android code needs another change

Yes, almost certainly, on two points I could not resolve from the web side alone (no Android source access):
1. **Unknown-field tolerance** — confirm Android's JSON decoder for the financial document model ignores unrecognized keys (`docType`, `discount`, `couponDiscount`, `discountReason`, `couponCode`, `amountDue`, `tabId`, `orderIds`, `rounds`, `tableLabel` are all present as extras beyond your §4 example). If it uses a strict/exhaustive decoder that rejects unknown keys, these will need to be trimmed in a follow-up web change.
2. **Dine-in fields** — your example and the failed job were both delivery-only. `tableLabel` and `rounds` (with per-round canonical items, now fixed the same way as the flat list) exist in the payload for dine-in bills but were never exercised against a real Android failure the way the item contract was — recommend a live dine-in Print Bill test before assuming that shape is also correct.

Everything else (item contract, `documentType`, `discountAmount`) is directly traceable to the failure you reported and your literal example JSON, so no further web-side guessing was done beyond that evidence.
