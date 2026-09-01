// ─── Foodie Lover — Server-Authoritative Bill / Receipt Computation ───────────
//
// This module is the ONLY place that computes what a customer owes or paid
// for printing purposes. It is read-only: every function here does SELECTs
// only (plus, in buildXPrintJobRow, returns a row to be inserted into
// print_jobs — the insert itself happens in the calling API route so this
// file has zero side effects and can never redeem a coupon, touch Finance,
// or change payment/order state, no matter how it's called).
//
// Three document kinds share one payload shape (see BillPayload):
//   KITCHEN_TICKET   — unchanged, built by buildKotPayload() in
//                       app/api/orders/[id]/route.ts. Not touched here.
//   CUSTOMER_BILL    — amount currently owed. May be printed BEFORE payment.
//                       paymentStatus is always 'PENDING' — never 'PAID'.
//   CUSTOMER_RECEIPT — final payment receipt. paymentStatus is 'PAID' only
//                       when the underlying order/tab state actually says so.
//
// Dine-In bills are tab-scoped (every non-cancelled/void order sharing a
// tab_id — QR + every Order More round, whoever created them). Pickup/
// Delivery bills are order-scoped (Order More on pickup already appends to
// the SAME order_id, so "all order_items on this order" already IS "every
// round" — see migration_026's header comment).
//
// Formulas below deliberately MIRROR the already-shipped, already-correct
// client formulas so a printed bill's total can never disagree with what
// Manager/Waiter already show on screen:
//   Dine-In : app/manager/page.tsx  tabComputedSubtotal / tabBillTotal  (~L523-530)
//   Pickup  : orders.total is already net-of-discount at write time
//             (app/api/orders/[id]/route.ts discount PATCH branch)
//   Delivery: same as Pickup — orders.total is net-of-discount.
import type { SupabaseClient } from '@supabase/supabase-js';
import { formatTableName } from '@/lib/format';
import { resolveRestaurantName } from '@/lib/config-server';

// ── Human-readable payment method labels (server-side mirror of the
//    PAY_LABELS map already used in app/manager/page.tsx — kept in sync
//    manually since that one is client-only and this one runs server-side).
const PAY_LABELS: Record<string, string> = {
  cod: 'Cash', gpay: 'Google Pay', phonepe: 'PhonePe',
  paytm: 'Paytm', card: 'Card', upi: 'UPI',
};

/**
 * prettyPayment — turns a raw payment_method value into display text.
 * Handles the already-composed split-payment strings ("Cash ₹500 + UPI
 * ₹580") used by both dine-in tab close and delivery's
 * doDeliveredWithPayment() as-is (they're already human-readable — see
 * migration_027's header comment / Arc 4 design notes), and prettifies a
 * single simple code via PAY_LABELS. Never throws on an unrecognised value —
 * falls back to the raw string, uppercased, so an unfamiliar code degrades
 * gracefully instead of crashing print formatting.
 */
export function prettyPayment(raw: string | null | undefined): string {
  if (!raw) return '—';
  const trimmed = raw.trim();
  if (!trimmed) return '—';
  // Already a composed multi-method string (contains '+' or '₹') — pass through.
  if (trimmed.includes('+') || trimmed.includes('₹')) return trimmed;
  const key = trimmed.toLowerCase();
  return PAY_LABELS[key] ?? trimmed.toUpperCase();
}

/** Coerces a value to a safe display string — never "undefined"/"null"/"[object Object]". */
function safeStr(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'object') return null;
  const s = String(v).trim();
  if (!s || s === 'undefined' || s === 'null') return null;
  return s;
}

export interface BillLineItem {
  name:     string;
  qty:      number;
  price:    number;
  subtotal: number;
}

/** One order/round contributing to a Dine-In bill. */
export interface BillRound {
  orderId:     string;
  orderNumber: number | null;
  source:      string | null;   // 'table-qr' | 'waiter' | etc — informational only
  createdAt:   string | null;
  items:       BillLineItem[];
}

// Shared shape both /api/billing/tab/[tabId] and /api/billing/order/[orderId]
// return, and what buildBillReceiptPayload() turns into a print_jobs.payload.
export interface BillData {
  kind:            'dine-in' | 'pickup' | 'delivery';
  restaurantName:  string;
  // Identity
  tabId?:          string;
  orderId?:        string;
  orderIds:        string[];        // every order_id contributing (1 for pickup/delivery, N for dine-in)
  orderNumber?:    number | null;   // pickup/delivery only
  tableLabel?:      string | null;   // dine-in only — "Table 4"
  customerName:    string;
  phone:           string | null;
  deliveryAddress?: string | null;
  // Line items — either flat (pickup/delivery) or grouped by round (dine-in)
  items:           BillLineItem[];
  rounds?:         BillRound[];     // dine-in only
  // Money — server-authoritative, matches the existing live UI formulas exactly
  subtotal:        number;
  discount:        number;
  discountReason:  string | null;
  couponCode:      string | null;
  couponDiscount:  number;
  total:           number;
  // Payment state
  isPaid:          boolean;
  paymentMethod:   string | null;   // only meaningful when isPaid
  amountDue:       number;          // 0 when isPaid, else `total`
  generatedAt:     string;
}

/**
 * computeDineInBill — sums every non-cancelled/void order on ONE customer_tab
 * (never table-wide — a different customer's tab at the same table is never
 * touched, even implicitly, since every query below is scoped by tab_id).
 */
export async function computeDineInBill(
  sb:           SupabaseClient,
  restaurantId: string,
  tabId:        string,
): Promise<BillData | null> {
  const { data: tabRow, error: tabErr } = await sb
    .from('customer_tabs')
    .select('*')
    .eq('id', tabId)
    .eq('restaurant_id', restaurantId)
    .maybeSingle();
  if (tabErr) throw tabErr;
  if (!tabRow) return null;

  const { data: orderRows, error: ordErr } = await sb
    .from('orders')
    .select('*, order_items(*)')
    .eq('tab_id', tabId)
    .not('status', 'in', '("cancelled","void")')
    .order('created_at', { ascending: true });
  if (ordErr) throw ordErr;

  const orders = orderRows ?? [];
  const rounds: BillRound[] = orders.map(o => ({
    orderId:     o.id as string,
    orderNumber: (o.order_number as number) ?? null,
    source:      (o.source as string) ?? null,
    createdAt:   (o.created_at as string) ?? null,
    items: ((o.order_items ?? []) as Record<string, unknown>[])
      .slice()
      .sort((a, b) => String(a.created_at ?? '').localeCompare(String(b.created_at ?? '')))
      .map(i => ({
        name:     i.name as string,
        qty:      Number(i.qty) || 0,
        price:    Number(i.price) || 0,
        subtotal: Number(i.subtotal) || 0,
      })),
  }));
  const items = rounds.flatMap(r => r.items);

  // ── Mirrors app/manager/page.tsx's tabComputedSubtotal exactly ──────────
  // Math.max guards the (unlikely, server-side) case where the live order
  // sum and the persisted tab.total have drifted — tab.total is kept in
  // sync on every order status/discount change (see PATCH /api/orders/[id]),
  // so in practice these agree; this is defense-in-depth, not a primary path.
  const memSubtotal = orders.reduce((s, o) => s + (Number(o.total) || 0), 0);
  const subtotal = Math.max(Number(tabRow.total) || 0, memSubtotal);

  const discount       = Number(tabRow.discount) || 0;
  const discountReason = safeStr(tabRow.discount_reason);
  const couponDiscount = Number(tabRow.coupon_discount) || 0;
  const couponCode     = safeStr(tabRow.coupon_code);
  const total = Math.max(0, subtotal - discount - couponDiscount);

  const isPaid = tabRow.status === 'closed';
  const restaurantName = (await resolveRestaurantName(restaurantId)).value;

  return {
    kind:           'dine-in',
    restaurantName,
    tabId,
    orderIds:       orders.map(o => o.id as string),
    tableLabel:     formatTableName(tabRow.table_id as string | null),
    customerName:   safeStr(tabRow.customer_name) ?? 'Guest',
    phone:          safeStr(tabRow.phone),
    items,
    rounds,
    subtotal,
    discount,
    discountReason,
    couponCode,
    couponDiscount,
    total,
    isPaid,
    paymentMethod:  isPaid ? prettyPayment(tabRow.payment_method as string) : null,
    amountDue:      isPaid ? 0 : total,
    generatedAt:    new Date().toISOString(),
  };
}

/**
 * computeOrderBill — Pickup/Delivery bill/receipt for ONE order. Order More
 * rounds on pickup already live on the same order_id (see
 * app/api/orders/[id]/route.ts's order_more action), so selecting all
 * order_items on this order already IS "every valid billable item for the
 * complete session" — no separate rounds concept needed here.
 *
 * `expectedType`, when given, rejects a type mismatch (e.g. calling the
 * pickup bill route against a dine-in order id) rather than silently
 * printing the wrong document shape.
 */
export async function computeOrderBill(
  sb:           SupabaseClient,
  restaurantId: string,
  orderId:      string,
  expectedType?: 'pickup' | 'delivery',
): Promise<BillData | { error: 'not_found' } | { error: 'wrong_type'; actualType: string }> {
  const { data: order, error } = await sb
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', orderId)
    .eq('restaurant_id', restaurantId)
    .maybeSingle();
  if (error) throw error;
  if (!order) return { error: 'not_found' };
  if (expectedType && order.type !== expectedType) {
    return { error: 'wrong_type', actualType: order.type as string };
  }

  const kind = (order.type as string) === 'delivery' ? 'delivery' : 'pickup';
  const items: BillLineItem[] = ((order.order_items ?? []) as Record<string, unknown>[])
    .slice()
    .sort((a, b) => String(a.created_at ?? '').localeCompare(String(b.created_at ?? '')))
    .map(i => ({
      name:     i.name as string,
      qty:      Number(i.qty) || 0,
      price:    Number(i.price) || 0,
      subtotal: Number(i.subtotal) || 0,
    }));

  // orders.total is ALREADY net-of-discount (set at creation and recomputed
  // in the discount PATCH branch as Math.max(0, subtotal - discount)) — see
  // migration_027 design notes. Trusted directly; never recomputed here.
  const subtotal        = Number(order.subtotal) || 0;
  const discount         = Number(order.discount) || 0;
  const discountReason   = safeStr(order.discount_reason);
  const couponDiscount   = Number(order.coupon_discount) || 0;
  const couponCode       = safeStr(order.coupon_code);
  const total            = Number(order.total) || 0;

  const isPaid = kind === 'pickup'
    ? order.status === 'completed'
    : ['delivered', 'completed'].includes(order.status as string);

  const restaurantName = (await resolveRestaurantName(restaurantId)).value;

  return {
    kind,
    restaurantName,
    orderId,
    orderIds:        [orderId],
    orderNumber:     (order.order_number as number) ?? null,
    customerName:    safeStr(order.customer_name) ?? 'Guest',
    phone:           safeStr(order.phone),
    deliveryAddress: kind === 'delivery' ? safeStr(order.delivery_address) : undefined,
    items,
    subtotal,
    discount,
    discountReason,
    couponCode,
    couponDiscount,
    total,
    isPaid,
    // COD/unpaid: never claim a payment method that hasn't actually been
    // collected yet. Prepaid/paid: pass through the real recorded method.
    paymentMethod:   isPaid ? prettyPayment(order.payment_method as string) : null,
    amountDue:       isPaid ? 0 : total,
    generatedAt:     new Date().toISOString(),
  };
}

/**
 * buildBillReceiptPayload — the JSON stored in print_jobs.payload for a
 * CUSTOMER_BILL or CUSTOMER_RECEIPT job. Same flexible-JSON approach as the
 * existing buildKotPayload() (app/api/orders/[id]/route.ts) — the print
 * agent (a separate, out-of-scope project) reads this to render a thermal
 * ticket. `docType` is the new discriminator this task adds; job_type in
 * the DB row stays 'receipt' for both CUSTOMER_BILL and CUSTOMER_RECEIPT
 * (job_type only needs the coarse "kitchen vs financial document"
 * distinction — see migration_027's header comment).
 *
 * `docType: 'CUSTOMER_BILL'` ALWAYS forces paymentStatus to 'PENDING' and
 * amountDue to `total`, regardless of what computeXBill() found — a Bill
 * (as opposed to a Receipt) must never claim PAID even if, by the time it's
 * printed, the underlying order/tab happens to already be paid (e.g. a
 * stale "View Bill" click right after Manager finished collecting payment
 * in another tab). Only 'CUSTOMER_RECEIPT' is allowed to say PAID, and only
 * when `bill.isPaid` is actually true.
 */
export function buildBillReceiptPayload(
  docType:      'CUSTOMER_BILL' | 'CUSTOMER_RECEIPT',
  bill:         BillData,
  opts: {
    isReprint:    boolean;
    requestedBy:  string;
  },
): Record<string, unknown> {
  const paymentStatus = docType === 'CUSTOMER_RECEIPT' && bill.isPaid ? 'PAID' : 'PENDING';
  const amountDue      = paymentStatus === 'PAID' ? 0 : bill.total;
  // COD-style "collect on delivery" callout — only meaningful for an unpaid
  // delivery receipt; never shown once paymentStatus is PAID.
  const amountToCollect = bill.kind === 'delivery' && paymentStatus === 'PENDING' ? bill.total : undefined;

  return {
    docType,
    restaurantName: bill.restaurantName,
    orderType:      bill.kind,               // 'dine-in' | 'pickup' | 'delivery'
    tabId:          bill.tabId ?? null,
    orderId:        bill.orderId ?? null,
    orderIds:       bill.orderIds,
    orderNumber:    bill.orderNumber ?? null,
    tableLabel:     bill.tableLabel ?? null,
    customerName:   bill.customerName,
    // Phone printed on Pickup/Delivery bills+receipts (task spec §B7) and,
    // for Dine-In, only if the tab actually captured one — never fabricated.
    customerPhone:  bill.phone,
    deliveryAddress: bill.deliveryAddress ?? null,
    items:          bill.items,
    rounds:         bill.rounds ?? undefined, // dine-in only — lets the print agent label "Round 1 / Round 2"
    subtotal:       bill.subtotal,
    discount:        bill.discount,
    discountReason:  bill.discountReason,
    couponCode:      bill.couponCode,
    couponDiscount:  bill.couponDiscount,
    total:           bill.total,
    paymentStatus,                            // 'PENDING' | 'PAID' — never fabricated
    paymentMethod:   paymentStatus === 'PAID' ? bill.paymentMethod : null,
    amountDue,
    amountToCollect,
    isReprint:       opts.isReprint,
    requestedBy:     opts.requestedBy,
    generatedAt:     bill.generatedAt,
  };
}
