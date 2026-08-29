// ─── Foodie Lover — Finance Server Helpers ─────────────────────────────────────
// Server-only utilities shared by every app/api/finance/** route.
// This file is a pure ADDITION — it does not modify lib/supabase-server.ts or
// any other existing file. It re-uses getServerClient()/newId()/now() from
// lib/supabase-server.ts (the existing, unchanged server helper module).
import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getServerClient, newId } from '@/lib/supabase-server';
import { verifyPin, isHashedPin, hashPin } from '@/lib/pin-hash';

// ─── Admin authorization ────────────────────────────────────────────────────────
// Finance is owner-level, sensitive functionality. The rest of this codebase's
// existing API routes largely have no server-side authorization (verified
// during inspection — see the Finance implementation report). The one
// established pattern that DOES enforce real server-side auth today is the
// order-deletion routes (app/api/orders/clear, app/api/orders/delete-selective),
// which verify a submitted PIN against restaurant_settings.admin_pin. Every
// Finance route (including GETs, since Finance must not be readable by simply
// hiding a nav link) follows that same established pattern here, applied
// consistently across all new endpoints.
//
// The PIN is accepted via the `x-admin-pin` request header (GETs) or a `pin`
// field in the JSON body (mutations) — callers may send either.

export async function verifyAdminPin(pin: string | null | undefined): Promise<boolean> {
  if (!pin) return false;
  try {
    const sb  = getServerClient();
    const rid = process.env.NEXT_PUBLIC_RESTAURANT_ID ?? 'rest_default';
    const { data } = await sb
      .from('restaurant_settings')
      .select('value')
      .eq('restaurant_id', rid)
      .eq('key', 'admin_pin')
      .maybeSingle();
    if (!data) return false;
    // C3: admin_pin may be a legacy plaintext value or a salted hash —
    // verifyPin() handles both. On a successful legacy-plaintext match,
    // transparently upgrade the stored value to a hash (same lazy-migration
    // behavior as /api/auth/verify-pin).
    const ok = verifyPin(pin, data.value);
    if (ok && !isHashedPin(data.value)) {
      await sb.from('restaurant_settings')
        .update({ value: hashPin(pin), updated_at: new Date().toISOString() })
        .eq('restaurant_id', rid)
        .eq('key', 'admin_pin');
    }
    return ok;
  } catch {
    return false;
  }
}

/**
 * requireAdminPin — call at the top of every Finance route handler.
 * Returns { ok: true, pin } on success, or { ok: false, response } with a
 * ready-to-return 401/403 NextResponse on failure.
 *
 * Remediation (master-prompt finding #11 — "Improve Admin/Finance/
 * destructive-operation privilege separation"): this PIN check used to be
 * the ONLY server-side gate on every Finance route. The PIN itself is a
 * single restaurant-wide shared secret with no session behind it — anyone
 * who obtained the value (leak, guess, shoulder-surf) could call any
 * Finance API directly (e.g. via curl with `x-admin-pin`) with no need to
 * ever have actually authenticated. Every Finance route handler now also
 * calls `requireRole(req, ['admin'])` from lib/session-server.ts BEFORE
 * this check, so a caller must additionally hold a real, HMAC-signed
 * session cookie for the 'admin' role — i.e. must have actually completed
 * /admin/login (which calls /api/auth/verify-pin, and that route already
 * issues this same session cookie on a correct PIN — see its C1 comment).
 * This is defense-in-depth, not a replacement: the Finance admin PIN is
 * kept as a second factor specific to Finance, layered on top of the
 * general staff-session system the rest of the app now uses.
 */
export async function requireAdminPin(
  req: Request,
): Promise<{ ok: true; pin: string } | { ok: false; response: NextResponse }> {
  let pin = req.headers.get('x-admin-pin');
  if (!pin && req.method !== 'GET') {
    try {
      const clone = req.clone();
      const body  = await clone.json().catch(() => null) as Record<string, unknown> | null;
      if (body && typeof body.pin === 'string') pin = body.pin;
    } catch { /* ignore — pin stays null */ }
  }
  if (!pin) {
    return { ok: false, response: NextResponse.json({ error: 'Admin PIN required' }, { status: 401 }) };
  }
  const valid = await verifyAdminPin(pin);
  if (!valid) {
    return { ok: false, response: NextResponse.json({ error: 'Invalid admin PIN' }, { status: 403 }) };
  }
  return { ok: true, pin };
}

export function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err) {
    return String((err as { message: unknown }).message);
  }
  return String(err);
}

export function restaurantId(body?: Record<string, unknown> | null, url?: URL): string {
  return (
    (body?.restaurantId as string | undefined) ??
    url?.searchParams.get('restaurantId') ??
    process.env.NEXT_PUBLIC_RESTAURANT_ID ??
    'rest_default'
  );
}

// ─── Audit log ───────────────────────────────────────────────────────────────

export async function logFinanceAudit(
  sb: SupabaseClient,
  params: {
    restaurantId: string;
    entityType:   string;
    entityId:     string;
    action:       string;
    changedBy?:   string | null;
    before?:      unknown;
    after?:       unknown;
    note?:        string;
  },
): Promise<void> {
  try {
    await sb.from('finance_audit_log').insert({
      id:            newId('FAUD'),
      restaurant_id: params.restaurantId,
      entity_type:   params.entityType,
      entity_id:     params.entityId,
      action:        params.action,
      changed_by:    params.changedBy ?? null,
      before_data:   params.before ?? null,
      after_data:    params.after ?? null,
      note:          params.note ?? null,
    });
  } catch (err) {
    // Audit logging must never block the primary operation.
    console.error('[logFinanceAudit] failed to write audit row:', err);
  }
}

// ─── Payment-method → account matching ────────────────────────────────────────
// orders.payment_method / customer_tabs.payment_method are free-text values
// set elsewhere in the app: single methods ('cod','upi','card','gpay',
// 'phonepe','paytm','admin_override') or a combined split-payment string in
// the exact format built by app/manager/page.tsx's split-payment UI:
//   "Cash ₹500 + UPI ₹300"
// parsePaymentSplits decomposes either shape into one or more
// { keyword, amount } parts that sum to `totalAmount` (falling back to a
// single part covering the whole amount when the string doesn't match the
// "Name ₹Amount" pattern at all, e.g. null / 'cod' / 'admin_override').

export interface PaymentSplitPart {
  keyword: string;   // lowercased raw label, e.g. 'cash', 'upi', 'cod'
  amount:  number;
}

export function parsePaymentSplits(paymentMethodRaw: string | null | undefined, totalAmount: number): PaymentSplitPart[] {
  const raw = (paymentMethodRaw ?? '').trim();
  if (!raw) return [{ keyword: 'unspecified', amount: totalAmount }];

  // Match every "Label ₹Amount" segment (label = one or more non-₹ words).
  const re = /([A-Za-z][A-Za-z\s]*?)\s*₹\s*([\d.]+)/g;
  const parts: PaymentSplitPart[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    const amt = parseFloat(m[2]);
    if (isFinite(amt) && amt > 0) {
      parts.push({ keyword: m[1].trim().toLowerCase(), amount: Math.round(amt * 100) / 100 });
    }
  }
  if (parts.length > 0) return parts;

  // No "Name ₹Amount" segments found — treat the whole string as one method
  // covering the full amount (e.g. 'cod', 'upi', 'card', 'admin_override').
  return [{ keyword: raw.toLowerCase(), amount: totalAmount }];
}

export interface FinanceAccountRow {
  id:                      string;
  name:                    string;
  type:                    string;
  payment_method_keywords: string[];
  is_default:              boolean;
  is_active:               boolean;
}

/** Finds the account whose keyword list matches (substring, case-insensitive),
 *  else the account flagged is_default, else the first active account, else null. */
export function matchAccountForKeyword(keyword: string, accounts: FinanceAccountRow[]): FinanceAccountRow | null {
  const k = keyword.toLowerCase();
  const direct = accounts.find(a =>
    a.is_active && (a.payment_method_keywords || []).some(kw => k.includes(kw.toLowerCase()) || kw.toLowerCase().includes(k)),
  );
  if (direct) return direct;
  const def = accounts.find(a => a.is_active && a.is_default);
  if (def) return def;
  return accounts.find(a => a.is_active) ?? null;
}

// ─── System Sales — computed LIVE from orders + customer_tabs ─────────────────
// This is the single authoritative revenue source for Finance. It is never
// stored, so it can never drift out of sync with order edits/cancellations/
// deletions, and it never double-counts revenue that already lives in
// `orders` / `customer_tabs`.
//
// Recognition rule (cash-basis, matching "cash flow management"):
//   • Dine-in: one row per CLOSED customer_tabs (status='closed', closed_at in
//     range). Net amount = total − discount − coupon_discount (mirrors the
//     exact math app/api/tabs/[id]/route.ts uses when it closes a tab).
//     Payment method = customer_tabs.payment_method (tab close does not copy
//     this down onto the individual dine-in orders — verified in
//     app/api/tabs/[id]/route.ts).
//   • Pickup / Delivery / any non-tab order: one row per `orders` record with
//     status='completed' AND tab_id IS NULL, dated by updated_at (the moment
//     the final PATCH to 'completed' was written). Net amount = orders.total
//     (order-level discount is already netted into total by
//     app/api/orders/[id]/route.ts's discount handler).
//
// Orders that belong to a tab are intentionally excluded here (they are
// counted once, at tab-close time) to avoid double counting a dine-in round
// both as an individual order AND as part of its tab.

export interface SystemSaleRow {
  sourceType:    'dine-in-tab' | 'order';
  sourceId:      string;
  occurredAt:    string;
  gross:         number;   // before discount
  discount:      number;
  net:           number;   // amount actually collected
  paymentMethod: string | null;
  orderType?:    string;
  customerName?: string;
}

export async function computeSystemSales(
  sb: SupabaseClient,
  restaurantId_: string,
  fromISO: string,
  toISO: string,
): Promise<SystemSaleRow[]> {
  const rows: SystemSaleRow[] = [];

  const { data: tabs, error: tabErr } = await sb
    .from('customer_tabs')
    .select('id, total, discount, coupon_discount, payment_method, closed_at, customer_name')
    .eq('restaurant_id', restaurantId_)
    .eq('status', 'closed')
    .gte('closed_at', fromISO)
    .lt('closed_at', toISO);
  if (tabErr) throw tabErr;
  for (const t of (tabs ?? [])) {
    const gross    = Number(t.total) || 0;
    const discount = (Number(t.discount) || 0) + (Number(t.coupon_discount) || 0);
    rows.push({
      sourceType:    'dine-in-tab',
      sourceId:      t.id as string,
      occurredAt:    t.closed_at as string,
      gross,
      discount,
      net:           Math.max(0, gross - discount),
      paymentMethod: (t.payment_method as string | null) ?? null,
      orderType:     'dine-in',
      customerName:  (t.customer_name as string | null) ?? undefined,
    });
  }

  const { data: orders, error: ordErr } = await sb
    .from('orders')
    .select('id, type, subtotal, discount, total, payment_method, updated_at, customer_name')
    .eq('restaurant_id', restaurantId_)
    .eq('status', 'completed')
    .is('tab_id', null)
    .gte('updated_at', fromISO)
    .lt('updated_at', toISO);
  if (ordErr) throw ordErr;
  for (const o of (orders ?? [])) {
    const gross    = Number(o.subtotal ?? o.total) || 0;
    const discount = Number(o.discount) || 0;
    rows.push({
      sourceType:    'order',
      sourceId:      o.id as string,
      occurredAt:    o.updated_at as string,
      gross,
      discount,
      net:           Number(o.total) || 0,
      paymentMethod: (o.payment_method as string | null) ?? null,
      orderType:     o.type as string,
      customerName:  (o.customer_name as string | null) ?? undefined,
    });
  }

  rows.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
  return rows;
}

export function sumSystemSales(rows: SystemSaleRow[]) {
  return {
    count:    rows.length,
    gross:    Math.round(rows.reduce((s, r) => s + r.gross, 0) * 100) / 100,
    discount: Math.round(rows.reduce((s, r) => s + r.discount, 0) * 100) / 100,
    net:      Math.round(rows.reduce((s, r) => s + r.net, 0) * 100) / 100,
  };
}

// ─── Combined daily / period summary ──────────────────────────────────────────
// Used by both /api/finance/summary (live "Overview" tab) and
// /api/finance/closings (the frozen End-of-Day snapshot) so the two never
// drift apart in how a total is computed. Reads, but never writes to, the
// existing `expenses` table (Manager-logged operating expenses) — Finance
// shows that data live, it is not copied.
export interface FinanceSummary {
  from: string;
  to:   string;
  systemSales: { count: number; gross: number; discount: number; net: number };
  managerExpenses: { count: number; total: number; byCategory: { category: string; total: number }[] };
  ledger: {
    income:     number;
    expense:    number;
    vendorPaid: number;
    salaryPaid: number;
  };
  netCashFlow: number; // systemSales.net + ledger.income − managerExpenses.total − ledger.expense
}

export async function computeFinanceSummary(
  sb: SupabaseClient,
  restaurantId_: string,
  fromISO: string,
  toISO: string,
): Promise<FinanceSummary> {
  const salesRows = await computeSystemSales(sb, restaurantId_, fromISO, toISO);
  const systemSales = sumSystemSales(salesRows);

  const { data: expenseRows, error: expErr } = await sb
    .from('expenses')
    .select('category, amount, created_at')
    .eq('restaurant_id', restaurantId_)
    .gte('created_at', fromISO)
    .lt('created_at', toISO);
  if (expErr) throw expErr;
  const catMap = new Map<string, number>();
  let managerExpenseTotal = 0;
  for (const e of (expenseRows ?? [])) {
    const amt = Number(e.amount) || 0;
    managerExpenseTotal += amt;
    catMap.set(e.category as string, (catMap.get(e.category as string) ?? 0) + amt);
  }

  const { data: txRows, error: txErr } = await sb
    .from('finance_transactions')
    .select('type, amount, source')
    .eq('restaurant_id', restaurantId_)
    .eq('is_voided', false)
    .gte('occurred_at', fromISO)
    .lt('occurred_at', toISO);
  if (txErr) throw txErr;
  let income = 0, expense = 0, vendorPaid = 0, salaryPaid = 0;
  for (const t of (txRows ?? [])) {
    const amt = Number(t.amount) || 0;
    if (t.type === 'income') income += amt;
    if (t.type === 'expense') {
      expense += amt;
      if (t.source === 'vendor_payment') vendorPaid += amt;
      if (t.source === 'salary_payment') salaryPaid += amt;
    }
  }

  const round = (n: number) => Math.round(n * 100) / 100;
  return {
    from: fromISO, to: toISO,
    systemSales,
    managerExpenses: {
      count: (expenseRows ?? []).length,
      total: round(managerExpenseTotal),
      byCategory: Array.from(catMap.entries()).map(([category, total]) => ({ category, total: round(total) })),
    },
    ledger: { income: round(income), expense: round(expense), vendorPaid: round(vendorPaid), salaryPaid: round(salaryPaid) },
    netCashFlow: round(systemSales.net + income - managerExpenseTotal - expense),
  };
}

// ─── Closed-tab revenue reversal on order purge ────────────────────────────────
// By design, dine-in revenue is recognized once, at tab-close, from
// customer_tabs.total — deleting the underlying `orders` rows afterward does
// NOT touch that number (see computeSystemSales' header comment). That is
// correct default behavior (deleting paperwork shouldn't silently rewrite
// already-recognized revenue) but the admin explicitly asked for the
// stronger behavior while this deployment is still being seeded with
// dummy/test data: admin-initiated order deletion (app/api/orders/clear,
// app/api/orders/delete-selective — both already admin-PIN + admin-session
// gated) should also reverse the corresponding closed-tab revenue, so
// purging test orders actually purges their Finance trace too.
//
// recomputeClosedTabTotal() is the one place that reversal happens: it
// re-derives a CLOSED tab's `total` from whatever orders still remain
// attached to it, using the exact same rule PATCH /api/tabs/[id]'s close
// handler used to compute it originally (sum of non-cancelled/void order
// totals). If every order for that tab was deleted, the recomputed total is
// 0 — Finance will then show ₹0 net for that tab (floored, never negative).
//
// Auditability + consistency (follow-up remediation, same admin decision):
//   1. SKIPPED when a split_bills record exists for the tab. A split bill's
//      `entries` are a customer-facing breakdown that summed to the tab's
//      total at the time it was created — silently shrinking `total`
//      afterward would leave that breakdown contradicting the new total
//      (e.g. paid split amounts adding up to more than the tab now shows).
//      Rather than guess how to reconcile that, this leaves the tab
//      untouched and reports it back to the caller so an admin can review
//      it manually.
//   2. `discount` + `coupon_discount` are capped so they can never exceed
//      the recomputed `total` — leaving a tab where the discount is bigger
//      than the bill it was discounted from is its own kind of
//      contradictory state, independent of what Finance nets it to.
//   3. Every actual adjustment writes a finance_audit_log row (via
//      logFinanceAudit) — entity 'customer_tab', action
//      'revenue_reversed_on_order_deletion' — recording old/new total and
//      old/new discount so the reversal has the same audit trail any other
//      Finance-affecting action gets.
export async function recomputeClosedTabTotal(
  sb: SupabaseClient,
  tabId: string,
  changedBy: string,
): Promise<
  | { tabId: string; oldTotal: number; newTotal: number; discountCapped: boolean }
  | { tabId: string; skipped: true; reason: string }
  | null
> {
  const { data: tab } = await sb.from('customer_tabs')
    .select('id, restaurant_id, total, discount, coupon_discount, status')
    .eq('id', tabId).maybeSingle();
  if (!tab || tab.status !== 'closed') return null;

  const { data: remainingOrders } = await sb
    .from('orders')
    .select('total, status')
    .eq('tab_id', tabId)
    .not('status', 'in', '("cancelled","void")');
  const newTotal = Math.round(
    (remainingOrders ?? []).reduce((s, o) => s + (Number(o.total) || 0), 0) * 100,
  ) / 100;
  const oldTotal = Number(tab.total) || 0;
  const oldDiscount = Number(tab.discount) || 0;
  const oldCouponDiscount = Number(tab.coupon_discount) || 0;
  if (
    Math.round(newTotal * 100) === Math.round(oldTotal * 100) &&
    oldDiscount + oldCouponDiscount <= newTotal + 0.01
  ) {
    return null; // nothing would actually change
  }

  const { data: existingSplit } = await sb
    .from('split_bills')
    .select('id')
    .eq('tab_id', tabId)
    .maybeSingle();
  if (existingSplit) {
    return {
      tabId,
      skipped: true,
      reason: 'A split bill exists for this table — its breakdown would no longer match a recomputed total. Skipped; review and adjust manually in Manager if needed.',
    };
  }

  // Cap discount+coupon so neither can exceed the new (possibly smaller) total —
  // proportionally, so a mix of manual discount + coupon shrinks together
  // rather than one silently zeroing out the other.
  let newDiscount = oldDiscount;
  let newCouponDiscount = oldCouponDiscount;
  const discountCapped = oldDiscount + oldCouponDiscount > newTotal + 0.01;
  if (discountCapped) {
    const combined = oldDiscount + oldCouponDiscount;
    const scale = combined > 0 ? newTotal / combined : 0;
    newDiscount = Math.round(oldDiscount * scale * 100) / 100;
    newCouponDiscount = Math.round(oldCouponDiscount * scale * 100) / 100;
  }

  const { error } = await sb.from('customer_tabs')
    .update({
      total: newTotal, discount: newDiscount, coupon_discount: newCouponDiscount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', tabId);
  if (error) throw error;

  await logFinanceAudit(sb, {
    restaurantId: tab.restaurant_id as string,
    entityType:   'customer_tab',
    entityId:     tabId,
    action:       'revenue_reversed_on_order_deletion',
    changedBy,
    before: { total: oldTotal, discount: oldDiscount, couponDiscount: oldCouponDiscount },
    after:  { total: newTotal, discount: newDiscount, couponDiscount: newCouponDiscount },
    note:   'Closed tab revenue recomputed after admin order deletion (see app/api/orders/clear and /delete-selective).',
  });

  return { tabId, oldTotal, newTotal, discountCapped };
}
