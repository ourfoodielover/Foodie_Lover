// PATCH /api/tabs/[id] — update or close a tab
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient, newId, broadcast } from '@/lib/supabase-server';
import { enqueueReceiptEmail, sendReceiptEmail, sendTabReceiptEmail, triggerSpinInviteForTab } from '@/lib/email-server';
import { requireRole } from '@/lib/session-server';

export const dynamic = 'force-dynamic';
type Ctx = { params: Promise<{ id: string }> };

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err) return String((err as { message: unknown }).message);
  return String(err);
}

function rowToTab(row: Record<string, unknown>) {
  return {
    id:             row.id,
    tableId:        row.table_id ?? null,
    waiterName:     row.waiter_name ?? null,
    customerName:   (row.customer_name as string) || '',
    partySize:      Number(row.party_size) || 1,
    status:         row.status,
    total:          Number(row.total) || 0,
    discount:       Number(row.discount) || 0,
    discountReason: row.discount_reason ?? null,
    paymentMethod:  (row.payment_method as string) || 'cod',
    pin:            (row.pin as string) || null,
    email:          (row.customer_email as string | null) ?? null,
    createdAt:      row.created_at,
    closedAt:       row.closed_at ?? null,
    // Coupon fields (added in migration_012)
    couponId:       row.coupon_id       ?? null,
    couponCode:     row.coupon_code     ?? null,
    couponDiscount: Number(row.coupon_discount ?? 0),
  };
}

// GET /api/tabs/[id] — fetch a single tab by id.
//
// Remediation (master-prompt finding: "GET /api/tabs (restaurant-wide
// PII/PIN exposure with no scoping)", AUTH-4): the collection endpoint
// GET /api/tabs previously had zero auth and returned EVERY tab at the
// restaurant — every other table's customer name, phone, email, and
// session-join PIN — to anyone, including the customer's own unauthenticated
// table-portal browser (app/table/page.tsx used to fetch the whole list and
// filter to its own tabId client-side). That collection endpoint is now
// staff-only. This single-tab endpoint gives the customer portal (and any
// other caller who already knows a specific tab id) exactly the one row it
// actually needs — no staff session required, matching the customer-safe
// PATCH branch below, which already treats "knows this tab's id" as
// sufficient proof for the customer-only fields on this same tab.
export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const sb = getServerClient();
    const { data, error } = await sb.from('customer_tabs').select('*').eq('id', id).maybeSingle();
    if (error) {
      console.error('[GET /api/tabs/[id]] error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: 'Tab not found' }, { status: 404 });
    return NextResponse.json(rowToTab(data as Record<string, unknown>));
  } catch (err) {
    console.error('[GET /api/tabs/[id]] unexpected error:', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const sb   = getServerClient();
    const body = await req.json();

    // Detect close action: support both { close: true } and { action: 'close' }
    const isClose = body.close === true || body.action === 'close';

    if (isClose) {
      // Tab close is a staff-only (manager/admin) action — the only observed
      // callers are closeTab() in app/manager/page.tsx and forceCloseTab() in
      // app/admin/page.tsx. No customer or waiter caller exists.
      const closeAuth = requireRole(req, ['manager', 'admin']);
      if (!closeAuth.ok) return closeAuth.response;
      // ── Guard: block close if any orders have unresolved "not received" issues ──
      // body.force=true is an admin-only override to clear stale/ghost sessions.
      // Normal staff cannot bypass this — only the admin console sends force=true.
      const isForce = body.force === true;

      if (!isForce) {
        const { data: issueOrders } = await sb
          .from('orders')
          .select('id, status')
          .eq('tab_id', id)
          .eq('status', 're_serve_required');
        if (issueOrders && issueOrders.length > 0) {
          return NextResponse.json(
            {
              error: `Cannot close tab — ${issueOrders.length} order(s) have an unresolved "not received" issue. Staff must re-serve before billing.`,
              code:  'RE_SERVE_REQUIRED',
            },
            { status: 409 },
          );
        }
      }

      // Recalculate total from orders (sum of all non-cancelled order totals)
      const { data: tabOrders } = await sb
        .from('orders')
        .select('id, total, status')
        .eq('tab_id', id)
        .not('status', 'in', '("cancelled","void")');
      const rawTotal = (tabOrders ?? []).reduce((s, o) => s + Number(o.total), 0);

      const discount       = Number(body.discount) || 0;
      const paymentMethod  = body.paymentMethod || 'cod';
      const discountReason = body.discountReason ?? null;

      // ── Redeem any coupon that was reserved against this tab ───────────────
      //
      // Remediation (audit finding C4): this block previously queried
      // `.select('id, code, discount_value, reward_type')` and
      // `.eq('reserved_tab_id', id)` — none of `code`, `discount_value`, or
      // `reserved_tab_id` exist as columns on `reward_coupons` (the real
      // columns are `coupon_code`, `reward_value`/`reward_type`+`max_discount`,
      // and `reserved_order_id`). The query therefore threw on every single
      // dine-in tab close, was swallowed by the surrounding try/catch, and no
      // dine-in reward coupon was ever actually redeemed — its discount was
      // silently never subtracted from the bill, even though the Table
      // portal's UI showed the coupon as applied.
      //
      // Root cause: the dine-in reserve call (app/table/page.tsx) POSTs
      // { orderId: tabId } to /api/rewards/reserve-coupon, which writes that
      // value into `reserved_order_id` (there is no separate "reserved against
      // a tab" column in the schema — a tab-level reservation is represented
      // by putting the tab's id in the same order-id column). This lookup now
      // matches that: it queries `reserved_order_id = <tabId>` using the real
      // column names, and computes the discount with the exact same
      // percent/fixed/free_item formula GET /api/rewards/validate-coupon uses
      // (including the max_discount cap), rather than reading a nonexistent
      // pre-computed value.
      let couponDiscount = 0;
      let couponCode: string | null = null;
      let couponId: string | null = null;
      try {
        const { data: reservedCoupon } = await sb
          .from('reward_coupons')
          .select('id, coupon_code, reward_type, reward_value, max_discount')
          .eq('status', 'reserved')
          .eq('reserved_order_id', id)
          .maybeSingle();
        if (reservedCoupon) {
          couponId   = reservedCoupon.id as string;
          couponCode = reservedCoupon.coupon_code as string;

          const rewardType  = reservedCoupon.reward_type as string;
          const rewardValue = Number(reservedCoupon.reward_value) || 0;
          const maxDiscount = reservedCoupon.max_discount != null ? Number(reservedCoupon.max_discount) : null;

          if (rewardType === 'percent') {
            const raw = Math.round(rawTotal * rewardValue / 100);
            couponDiscount = maxDiscount != null ? Math.min(raw, maxDiscount) : raw;
          } else if (rewardType === 'fixed') {
            couponDiscount = Math.min(rewardValue, rawTotal);
          } else {
            couponDiscount = 0; // free_item and any other type: no bill-total discount here
          }

          // Best-effort attribution for the redeemed_order_id FK/audit trail —
          // a dine-in coupon is reserved against the whole tab, not one order,
          // so this is informational only (used by validate-coupon's "already
          // redeemed on Order #..." message), not load-bearing for redemption logic.
          const attributedOrderId = (tabOrders ?? [])[0]?.id as string | undefined;

          const { error: redeemErr } = await sb.from('reward_coupons').update({
            status:            'redeemed',
            redeemed_at:       new Date().toISOString(),
            discount_given:    couponDiscount,
            redeemed_order_id: attributedOrderId ?? null,
          }).eq('id', couponId).eq('status', 'reserved'); // guard against double-redemption races

          if (redeemErr) {
            console.error('[tabs/close] coupon redemption update failed:', redeemErr.message);
            // Do not deduct a discount we failed to actually record as redeemed.
            couponDiscount = 0;
            couponCode     = null;
            couponId       = null;
          }
        }
      } catch (couponErr) {
        console.error('[tabs/close] coupon redemption error (non-fatal — bill closes without the discount):', couponErr);
        couponDiscount = 0;
        couponCode     = null;
        couponId       = null;
      }

      const finalTotal = Math.max(0, rawTotal - discount - couponDiscount);

      // Close the tab
      const tabCloseUpdate: Record<string, unknown> = {
        status:          'closed',
        total:           rawTotal,
        discount:        discount,
        discount_reason: discountReason,
        payment_method:  paymentMethod,
        closed_at:       new Date().toISOString(),
      };
      if (couponId)       tabCloseUpdate.coupon_id       = couponId;
      if (couponCode)     tabCloseUpdate.coupon_code     = couponCode;
      if (couponDiscount) tabCloseUpdate.coupon_discount = couponDiscount;

      const { error: closeErr } = await sb.from('customer_tabs').update(tabCloseUpdate).eq('id', id);
      if (closeErr) {
        console.error('[PATCH /api/tabs/[id]] close tab error:', closeErr.message);
        return NextResponse.json({ error: closeErr.message }, { status: 500 });
      }

      // ── Capture orders that will be newly completed BEFORE the status update ──
      // We do this BEFORE the update so we know exactly which orders transition
      // from non-completed → completed. This prevents duplicate PaymentCompleted
      // events for orders that were already in 'completed' state beforehand.
      const { data: ordersToComplete } = await sb
        .from('orders')
        .select('id')
        .eq('tab_id', id)
        .not('status', 'in', '("cancelled","void","completed")');

      // Mark all non-cancelled/void tab orders as completed
      const { error: ordersErr } = await sb.from('orders')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('tab_id', id)
        .not('status', 'in', '("cancelled","void","completed")');
      if (ordersErr) {
        console.error('[PATCH /api/tabs/[id]] orders update error:', ordersErr.message);
        // Non-fatal: tab is already closed, continue with events + broadcast
      }

      // ── Write PaymentCompleted event only for newly-completed orders ────────
      // CRITICAL: the dine-in tracking page uses order_events to light up steps.
      // Without this event, the final "Completed" step stays grey even though
      // the payment was collected and the order is done.
      // Using ordersToComplete (captured pre-update) avoids duplicate events for
      // orders that were already completed before this tab close.
      if (ordersToComplete && ordersToComplete.length > 0) {
        await sb.from('order_events').insert(
          ordersToComplete.map(o => ({
            id:           newId('EV'),
            order_id:     o.id,
            event_type:   'PaymentCompleted',
            performed_by: body.paymentMethod
              ? `Counter · ${body.paymentMethod.toUpperCase()}`
              : 'Counter',
            note:         `Tab closed · ${paymentMethod.toUpperCase()}`,
          })),
        );
      }

      // ── Free the table only if no other open tabs remain ───────────────────
      // customer_tabs.table_id stores the tables.id string (e.g. "T01").
      // We look it up from body.tableId first; fall back to the stored field.
      // Only mark 'available' when the table truly has no more open sessions.
      const tableIdToFree: string | null =
        body.tableId ??
        (() => {
          // Synchronously unavailable — will be resolved asynchronously below
          return null;
        })();

      const resolvedTableId = tableIdToFree ?? await (async () => {
        const { data: tabRow } = await sb
          .from('customer_tabs')
          .select('table_id')
          .eq('id', id)
          .single();
        return (tabRow?.table_id as string | null) ?? null;
      })();

      if (resolvedTableId) {
        // Check if any other non-closed tabs still reference this table
        const { data: siblingsOpen } = await sb
          .from('customer_tabs')
          .select('id')
          .eq('table_id', resolvedTableId)
          .neq('id', id)               // exclude the tab we're closing right now
          .not('status', 'in', '("closed")');

        if (!siblingsOpen || siblingsOpen.length === 0) {
          // No other live sessions — mark the table available again
          await sb.from('tables').update({ status: 'available' }).eq('id', resolvedTableId);
        }
      }

      // Broadcast payment completed
      const rid = body.restaurantId ?? 'rest_default';
      await broadcast(rid, 'payment_completed', { tabId: id, total: finalTotal, paymentMethod });

      // ── Receipt emails ─────────────────────────────────────────────────────
      // PRIMARY path for dine-in (QR / waiter-created) tabs:
      //   sendTabReceiptEmail reads customer_tabs.customer_email directly so it
      //   works even when individual orders don't carry the email field.
      //   It builds ONE combined receipt covering every order round in the tab.
      //   No-op when the tab has no customer_email — logged but never throws.
      sendTabReceiptEmail(id).then(result => {
        if (result.sent) {
          console.info(`[tabs/close] tab receipt sent for ${id}: ${result.messageId}`);
        } else if (result.reason && result.reason !== 'No customer email') {
          // Real failure (not just "no email configured") — fall back to per-order
          console.warn(`[tabs/close] tab receipt failed for ${id}: ${result.reason}`);

          // FALLBACK: send individual order receipts for any orders that carried
          // a customer_email (e.g. orders created manually with an email override).
          if (tabOrders && tabOrders.length > 0) {
            void (async () => {
              try {
                const { data: completedOrders } = await sb
                  .from('orders')
                  .select('id, customer_email')
                  .eq('tab_id', id)
                  .eq('status', 'completed')
                  .not('customer_email', 'is', null);
                if (!completedOrders?.length) return;
                for (const o of completedOrders) {
                  if (!o.customer_email) continue;
                  const oid = o.id as string;
                  sendReceiptEmail(oid).then(r => {
                    if (!r.sent) return enqueueReceiptEmail(oid);
                    console.info(`[tabs/close] fallback receipt sent for ${oid}: ${r.messageId}`);
                  }).catch(err => console.error(`[tabs/close] fallback email error for ${oid}:`, err));
                }
              } catch (err) {
                console.error('[tabs/close] fallback orders fetch error:', err);
              }
            })();
          }
        }
      }).catch(err => console.error(`[tabs/close] tab receipt error for ${id}:`, err));

      // ── Spin & Win invite email — fire-and-forget at tab close ────────────
      // triggerSpinInviteForTab checks eligibility (config, amount, dine-in type),
      // generates spin_token if absent, and sends the invite only if the tab
      // has a customer_email. Silently skips if ineligible.
      triggerSpinInviteForTab(id).catch(err =>
        console.error(`[PATCH /api/tabs/[id]] spin invite error for ${id}:`, err),
      );

      // Return updated tab
      const { data: updated } = await sb.from('customer_tabs').select('*').eq('id', id).single();
      return NextResponse.json(updated ? rowToTab(updated) : { ok: true });

    } else {
      // Generic update — supports discount, waiterName, status changes, total
      //
      // Remediation (audit finding — critical): this branch had NO auth check
      // of any kind despite being able to set an arbitrary `discount` on any
      // tab. It's shared by two genuinely different callers on the SAME
      // field set, so it can't be gated as one block:
      //   - The customer's own table page (app/table/page.tsx) PATCHes
      //     { coupon_id, coupon_code, coupon_discount } to apply a validated
      //     coupon, and { status: 'awaiting_payment' } to request the bill.
      //     Both must stay public — no staff session exists at that point.
      //   - app/manager/page.tsx's applyTabDiscount()/updateTab() PATCHes
      //     discount/waiterName/paymentMethod/total/customerName/partySize,
      //     or any other status value — these are staff-only.
      // So: if the body contains ONLY the customer-safe keys, allow through;
      // if it contains any staff-only key, require a waiter/manager/admin
      // session.
      const CUSTOMER_SAFE_KEYS = new Set(['coupon_id', 'coupon_code', 'coupon_discount', 'restaurantId', 'close', 'action']);
      const bodyKeys = Object.keys(body as Record<string, unknown>);
      const isCustomerSafeStatusOnly =
        bodyKeys.every(k => CUSTOMER_SAFE_KEYS.has(k) || k === 'status') &&
        (body.status === undefined || body.status === 'awaiting_payment');
      if (!isCustomerSafeStatusOnly) {
        const genericAuth = requireRole(req, ['waiter', 'manager', 'admin']);
        if (!genericAuth.ok) return genericAuth.response;
      }

      const updates: Record<string, unknown> = {};
      if (body.total           !== undefined) updates.total           = body.total;
      if (body.waiterName      !== undefined) updates.waiter_name     = body.waiterName;
      if (body.status          !== undefined) updates.status          = body.status;
      if (body.discount        !== undefined) updates.discount        = body.discount;
      if (body.discountReason  !== undefined) updates.discount_reason = body.discountReason;
      if (body.paymentMethod   !== undefined) updates.payment_method  = body.paymentMethod;
      if (body.customerName    !== undefined) updates.customer_name   = body.customerName;
      if (body.partySize       !== undefined) updates.party_size      = body.partySize;

      if (Object.keys(updates).length > 0) {
        const { error } = await sb.from('customer_tabs').update(updates).eq('id', id);
        if (error) {
          console.error('[PATCH /api/tabs/[id]] update error:', error.message);
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
      }

      // Return updated tab
      const { data: updated } = await sb.from('customer_tabs').select('*').eq('id', id).single();
      return NextResponse.json(updated ? rowToTab(updated as Record<string, unknown>) : { ok: true });
    }
  } catch (err) {
    console.error('[PATCH /api/tabs/[id]] unexpected error:', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}
