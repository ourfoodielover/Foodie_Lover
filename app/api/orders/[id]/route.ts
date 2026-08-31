// GET   /api/orders/[id]  — single order
// PATCH /api/orders/[id]  — update order (status / discount / payment / items)
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient, newId, rowToOrder, broadcast } from '@/lib/supabase-server';
import { enqueueReceiptEmail, sendReceiptEmail, sendOrderReadyEmail, sendOrderConfirmationEmail, sendOutForDeliveryEmail, triggerSpinInviteForOrder } from '@/lib/email-server';
import { getSession, requireAnyStaff } from '@/lib/session-server';
import { resolveKitchenMode } from '@/lib/config-server';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

// ── GET ───────────────────────────────────────────────────────────────────────
//
// Remediation (audit finding C6): this route used to return the full order —
// customer name, phone, address, items — to anyone who supplied a valid order
// id, with no check of any kind. The public Track page's own tracking-token
// check happened only in the browser, after this data had already been sent.
// It now requires EITHER an authenticated staff/management session (any
// role — every portal's order-detail views, Kitchen/Waiter/Manager/Admin,
// legitimately need full access) OR a `?token=` query param matching the
// order's own tracking_token (the public, unauthenticated path used by
// /track). A request with neither is refused before any order data is read.
export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const sb = getServerClient();
    const { data, error } = await sb
      .from('orders')
      .select('*, order_items(*), order_events(*)')
      .eq('id', id)
      .single();
    if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const staffSession = getSession(req);
    if (!staffSession) {
      const providedToken = new URL(req.url).searchParams.get('token');
      const actualToken   = (data as Record<string, unknown>).tracking_token as string | null;
      if (!actualToken || !providedToken || providedToken !== actualToken) {
        return NextResponse.json(
          { error: 'Not authorized to view this order. A valid tracking token or staff login is required.' },
          { status: 403 },
        );
      }
    }

    return NextResponse.json(rowToOrder(data, data.order_items, data.order_events));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[GET /api/orders/[id]] unexpected error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ── Valid status transition map ───────────────────────────────────────────────
// Enforce a correct state machine server-side so no portal can put an order into
// an illegal state. Terminal states (completed / cancelled / void) cannot be left.
const VALID_TRANSITIONS: Record<string, string[]> = {
  // 'preparing' is reached via the waiter's "Confirm & Print" action
  // (body.action === 'confirm_and_print'), which also queues a KOT print job.
  // 'pending' is kept for backward compatibility with any orders already in
  // that state from before this workflow existed.
  awaiting_waiter:   ['pending', 'preparing', 'cancelled'],
  pending:           ['preparing', 'cancelled'],
  preparing:         ['prepared', 'served', 'cancelled'],
  prepared:          ['served', 'out_for_delivery', 'completed', 'cancelled'],
  // served → out_for_delivery: delivery portal picks up orders that are in 'served'
  // state (backward compat for re-serve flow and any dine-in→delivery handoff edge cases)
  served:            ['completed', 're_serve_required', 'cancelled', 'out_for_delivery'],
  re_serve_required: ['preparing', 'out_for_delivery', 'served', 're_serve_required'],
  out_for_delivery:  ['delivered', 're_serve_required'],
  delivered:         ['completed', 're_serve_required'],
  // Terminal states — no transitions allowed
  completed:         [],
  cancelled:         [],
  void:              [],
};

const KNOWN_STATUSES = new Set(Object.keys(VALID_TRANSITIONS));

// ── PATCH ─────────────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const sb   = getServerClient();
    const body = await req.json();

    // ── Auth ──────────────────────────────────────────────────────────────────
    // This single handler serves every portal (kitchen item-status, waiter
    // confirm/reject/reprint, manager discount/void/force, delivery
    // status/payment) AND one customer-facing action: the delivery-tracking
    // page's "I received it" confirmation (action: 'customer_confirm', body
    // contains nothing else). That one case has no staff session available
    // and must stay public; every other shape on this route is staff-only.
    // The key allowlist (not just checking body.action) prevents a caller
    // from smuggling a staff-only field like `discount` alongside
    // action:'customer_confirm' to dodge the auth check.
    const bodyKeys = Object.keys(body as Record<string, unknown>);
    const isCustomerConfirmOnly =
      body.action === 'customer_confirm' &&
      bodyKeys.every(k => k === 'action' || k === 'restaurantId');
    if (!isCustomerConfirmOnly) {
      const auth = requireAnyStaff(req);
      if (!auth.ok) return auth.response;
    }

    const rid  = body.restaurantId ?? 'rest_default';
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    // Hoisted so the "ready" and "receipt" email triggers below can read it.
    // Set to true inside the status block when the transition is a no-op (already in state).
    let isIdempotent = false;

    // ── Status change ────────────────────────────────────────────────────────
    if (body.status) {
      // Validate the requested status is a known value
      if (!KNOWN_STATUSES.has(body.status)) {
        return NextResponse.json(
          { error: `Invalid status: "${body.status}". Must be one of: ${[...KNOWN_STATUSES].join(', ')}` },
          { status: 400 },
        );
      }

      // Fetch current status for transition validation
      // Skip transition check for 'void' (manager override) and 're_serve_required' (can reset)
      // Also skip if body.force === true (manager emergency override)
      if (body.status !== 'void' && !body.force) {
        const { data: current } = await sb
          .from('orders')
          .select('status')
          .eq('id', id)
          .single();
        const currentStatus = (current as Record<string, unknown> | null)?.status as string | undefined;
        if (currentStatus) {
          if (currentStatus === body.status) {
            // Idempotent: already in the requested status — skip without error.
            // Handles duplicate PATCH calls from double-tap or realtime race conditions.
            isIdempotent = true;
          } else {
            const allowed = VALID_TRANSITIONS[currentStatus] ?? [];
            if (!allowed.includes(body.status)) {
              return NextResponse.json(
                { error: `Invalid status transition: "${currentStatus}" → "${body.status}". Allowed from "${currentStatus}": [${allowed.join(', ')}]` },
                { status: 409 },
              );
            }
          }
        }
      }

      if (!isIdempotent) {
        updates.status = body.status;
        if (body.paymentMethod)  updates.payment_method  = body.paymentMethod;
        if (body.deliveryPerson) updates.delivery_person = body.deliveryPerson;
        if (body.cancelReason)   updates.cancel_reason   = body.cancelReason;

        // Delivery tracking timestamps
        if (body.status === 'out_for_delivery') {
          updates.assigned_at     = new Date().toISOString();
          if (body.deliveryPerson) updates.delivery_person = body.deliveryPerson;
        }
        if (body.status === 'delivered') {
          updates.delivered_at = new Date().toISOString();
        }

        // ── Coupon: release reserved coupon if order is cancelled ──────────
        if (body.status === 'cancelled') {
          const { data: cancelledOrder } = await sb
            .from('orders')
            .select('coupon_id')
            .eq('id', id)
            .single();
          if (cancelledOrder?.coupon_id) {
            sb.from('reward_coupons').update({
              status: 'active',
              reserved_order_id: null,
              reserved_at: null,
            }).eq('id', cancelledOrder.coupon_id as string)
              .eq('reserved_order_id', id)
              .eq('status', 'reserved')
              .then(() => {});
          }
        }

        // Log every status transition as an event (full audit trail)
        await sb.from('order_events').insert({
          id:           newId('EV'),
          order_id:     id,
          event_type:   statusToEvent(body.status),
          performed_by: body.by ?? 'System',
          note:         body.note ?? undefined,
        });
      }
    }

    // ── Discount ─────────────────────────────────────────────────────────────
    // IMPORTANT: body.subtotal may not be present (applyDiscount() only sends discount + reason).
    // Always fetch the authoritative subtotal from the database to compute the correct new total.
    if (body.discount !== undefined) {
      const { data: currentOrder } = await sb
        .from('orders')
        .select('subtotal')
        .eq('id', id)
        .single();
      const authoritative = Number(currentOrder?.subtotal ?? 0);
      updates.discount        = Number(body.discount) || 0;
      updates.discount_reason = body.discountReason ?? '';
      updates.total           = body.newTotal != null
        ? Number(body.newTotal)
        : Math.max(0, authoritative - (Number(body.discount) || 0));
    }

    // ── Tip ───────────────────────────────────────────────────────────────────
    if (body.tip !== undefined) {
      updates.tip   = body.tip;
      updates.total = body.newTotal ?? updates.total;
    }

    // ── Payment method ────────────────────────────────────────────────────────
    if (body.paymentMethod && !body.status) {
      updates.payment_method = body.paymentMethod;
    }

    // ── Item status ───────────────────────────────────────────────────────────
    // Supports both itemId (direct) and itemIndex (position-based from kitchen)
    if (body.itemStatus && (body.itemId || body.itemIndex !== undefined)) {
      if (body.itemId) {
        // Direct ID update (fast path)
        const { error: itemErr } = await sb.from('order_items')
          .update({ item_status: body.itemStatus })
          .eq('id', body.itemId);
        if (itemErr) {
          console.error('[PATCH /api/orders/[id]] item status update (by id) error:', itemErr.message, '| itemId:', body.itemId);
        }
      } else {
        // Index-based update: fetch items sorted by created_at, pick by index
        const { data: items, error: fetchItemsErr } = await sb
          .from('order_items')
          .select('id')
          .eq('order_id', id)
          .order('created_at', { ascending: true });
        if (fetchItemsErr) {
          console.error('[PATCH /api/orders/[id]] item fetch error:', fetchItemsErr.message);
        } else if (items && items[body.itemIndex]) {
          const { error: itemErr } = await sb.from('order_items')
            .update({ item_status: body.itemStatus })
            .eq('id', items[body.itemIndex].id);
          if (itemErr) {
            console.error('[PATCH /api/orders/[id]] item status update (by index) error:', itemErr.message, '| index:', body.itemIndex);
          }
        } else {
          console.warn('[PATCH /api/orders/[id]] item index out of bounds:', body.itemIndex, '| total items:', items?.length ?? 0);
        }
      }
    }

    // ── Customer confirm ──────────────────────────────────────────────────────
    if (body.action === 'customer_confirm') {
      // Block confirmation if order has an unresolved issue
      const { data: openIssues } = await sb
        .from('order_issues')
        .select('id, status')
        .eq('order_id', id)
        .in('status', ['open', 'escalated'])
        .limit(1);
      if (openIssues && openIssues.length > 0) {
        return NextResponse.json(
          { error: 'Cannot confirm — order has an unresolved issue. Please wait for re-service.' },
          { status: 409 },
        );
      }
      updates.status = 'completed';
      await sb.from('order_events').insert({
        id: newId('EV'), order_id: id,
        event_type: 'CustomerConfirmed', performed_by: 'Customer',
      });
    }

    // ── Waiter: Confirm & Print ───────────────────────────────────────────────
    // Waiter reviews an awaiting_waiter / pending order and confirms it.
    // PRIMARY effect  : order moves to 'preparing' — this ALWAYS happens and
    //                   is what triggers the kitchen display (via Realtime
    //                   broadcast of 'order_confirmed') and the customer
    //                   tracking page ("Being Prepared").
    // SECONDARY effect: a KOT print job is queued for the companion print agent.
    //                   Wrapped in try/catch — print failure is non-fatal and
    //                   must NEVER block the order update or kitchen display.
    let confirmPrintJobId: string | undefined;
    if (body.action === 'confirm_and_print' || body.action === 'confirm_and_kitchen') {
      const { data: current, error: curErr } = await sb
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', id)
        .single();
      if (curErr || !current) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }
      const currentStatus = current.status as string;
      if (!['awaiting_waiter', 'pending'].includes(currentStatus)) {
        return NextResponse.json(
          { error: `Cannot confirm an order in status "${currentStatus}". Only "awaiting_waiter" or "pending" orders can be confirmed.` },
          { status: 409 },
        );
      }

      // ── Primary: set order to 'preparing' (always executes) ──────────────
      updates.status       = 'preparing';
      updates.confirmed_by = body.by ?? 'Waiter';
      updates.confirmed_at = new Date().toISOString();

      // Set kitchen routing on the order record
      if (body.action === 'confirm_and_print') {
        updates.kitchen_route = 'printer';
      } else if (body.action === 'confirm_and_kitchen') {
        updates.kitchen_route = 'kitchen_display';
      }

      await sb.from('order_events').insert([
        { id: newId('EV'), order_id: id, event_type: 'WaiterConfirmed', performed_by: body.by ?? 'Waiter', note: body.note ?? undefined },
        { id: newId('EV'), order_id: id, event_type: statusToEvent('preparing'), performed_by: body.by ?? 'Waiter' },
      ]);

      // ── Tertiary: send confirmation email for pickup/delivery (fire-and-forget) ─
      // Confirmation is sent HERE (after waiter confirms) not on order creation,
      // because orders start in 'awaiting_waiter' and may be rejected.
      if (['pickup', 'delivery', 'online'].includes(current.type as string)) {
        sendOrderConfirmationEmail(id).catch(err =>
          console.error(`[confirm_and_print] confirmation email error for ${id}:`, err),
        );
      }

      // ── Secondary: queue a KOT print job (only for confirm_and_print, non-fatal) ─
      // For confirm_and_kitchen, no print job is created — the kitchen display
      // receives the order via the 'order_confirmed' Realtime broadcast below.
      if (body.action === 'confirm_and_print') {
        try {
          // ── "ORDER MORE" ticket labeling (dine-in only, §A11) ────────────
          // This order is an additional round on the SAME table/customer
          // tab when its tab already has at least one OTHER order that has
          // moved past awaiting_waiter (i.e. a previous round was already
          // sent to the kitchen). Computed server-side from the DB — never
          // trusted from the client — so it can't be spoofed and applies
          // uniformly whether this round came from the waiter or customer
          // QR ordering.
          let isOrderMore = false;
          if (current.type === 'dine-in' && current.tab_id) {
            const { count } = await sb
              .from('orders')
              .select('id', { count: 'exact', head: true })
              .eq('tab_id', current.tab_id as string)
              .neq('id', id)
              .not('status', 'in', '("awaiting_waiter","cancelled","void")');
            isOrderMore = (count ?? 0) > 0;
          }

          confirmPrintJobId = newId('PJ');
          await sb.from('print_jobs').insert({
            id:            confirmPrintJobId,
            restaurant_id: rid,
            order_id:      id,
            job_type:      'kot',
            status:        'queued',
            payload:       buildKotPayload(current as Record<string, unknown>, current.order_items ?? [], {
              isOrderMore,
              existingTabId: isOrderMore ? (current.tab_id as string) : null,
            }),
            requested_by:  body.by ?? 'Waiter',
            is_reprint:    false,
          });
          await sb.from('order_events').insert({
            id: newId('EV'), order_id: id, event_type: 'PrintQueued',
            performed_by: body.by ?? 'Waiter', note: `KOT job ${confirmPrintJobId}`,
          });
        } catch (printErr) {
          // Log but do not rethrow — the order update below will still proceed.
          console.error(`[confirm_and_print] Print job creation failed for order ${id} (non-fatal):`, printErr);
          confirmPrintJobId = undefined;
        }
      }
    }

    // ── Waiter: Switch to Kitchen Display (fallback from failed printer) ──────
    // Used when printer routing fails and waiter wants to send to kitchen display instead.
    if (body.action === 'switch_to_kitchen') {
      const { data: current, error: curErr } = await sb
        .from('orders')
        .select('status, kitchen_route')
        .eq('id', id)
        .single();
      if (curErr || !current) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }
      if ((current as Record<string, unknown>).kitchen_route !== 'printer') {
        return NextResponse.json({ error: 'Order is not printer-routed — switch_to_kitchen not applicable' }, { status: 400 });
      }
      updates.kitchen_route = 'kitchen_display';
      await sb.from('order_events').insert({
        id: newId('EV'), order_id: id, event_type: 'SwitchedToKitchenDisplay',
        performed_by: body.by ?? 'Waiter', note: 'Switched from printer to kitchen display after print failure',
      });
    }

    // ── Waiter: Reject ────────────────────────────────────────────────────────
    // Rejects an order before it ever reaches the kitchen. Reuses the existing
    // cancel_reason column (same one the manager-cancel flow uses) so reporting
    // and the customer tracking page need no changes.
    if (body.action === 'reject') {
      const { data: current, error: curErr } = await sb
        .from('orders').select('status').eq('id', id).single();
      if (curErr || !current) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }
      const currentStatus = (current as Record<string, unknown>).status as string;
      if (!['awaiting_waiter', 'pending'].includes(currentStatus)) {
        return NextResponse.json(
          { error: `Cannot reject an order in status "${currentStatus}". Only "awaiting_waiter" or "pending" orders can be rejected.` },
          { status: 409 },
        );
      }
      updates.status       = 'cancelled';
      updates.cancel_reason = body.reason ?? 'Rejected by waiter';
      updates.rejected_by  = body.by ?? 'Waiter';
      updates.rejected_at  = new Date().toISOString();

      await sb.from('order_events').insert({
        id: newId('EV'), order_id: id, event_type: 'WaiterRejected',
        performed_by: body.by ?? 'Waiter', note: body.reason ?? undefined,
      });
    }

    // ── Waiter: Reprint ───────────────────────────────────────────────────────
    // Queues another print job for an already-confirmed order — e.g. the
    // kitchen printer jammed or ran out of paper. Does not change order status.
    let reprintJobId: string | undefined;
    if (body.action === 'reprint') {
      const { data: current, error: curErr } = await sb
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', id)
        .single();
      if (curErr || !current) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }
      const currentStatus = current.status as string;
      if (['cancelled', 'void'].includes(currentStatus)) {
        return NextResponse.json(
          { error: `Cannot reprint a "${currentStatus}" order.` },
          { status: 409 },
        );
      }
      const jobType = body.jobType === 'receipt' ? 'receipt' : 'kot';
      reprintJobId = newId('PJ');
      await sb.from('print_jobs').insert({
        id:            reprintJobId,
        restaurant_id: rid,
        order_id:      id,
        job_type:      jobType,
        status:        'queued',
        payload:       buildKotPayload(current as Record<string, unknown>, current.order_items ?? []),
        requested_by:  body.by ?? 'Waiter',
        is_reprint:    true,
      });
      await sb.from('order_events').insert({
        id: newId('EV'), order_id: id, event_type: 'Reprinted',
        performed_by: body.by ?? 'Waiter', note: `${jobType} reprint job ${reprintJobId}`,
      });
    }

    // ── Pickup "Order More" ───────────────────────────────────────────────────
    // Appends newly-ordered items to an ALREADY-confirmed Pickup order,
    // instead of creating a brand-new order/customer (task spec Part A6-A9).
    // Deliberately kept on the SAME order_id (no new "session"/child-order
    // abstraction — see migration_026's header comment) so Finance, Spin &
    // Win and receipts — all keyed per order_id for pickup — need zero
    // changes and can never double-count.
    //
    // Delivery is intentionally NOT included here yet (task spec §B4: don't
    // build an unrequested workflow) — only the printing groundwork (phone +
    // reusable KOT payload shape) is made delivery-ready.
    //
    // requireAnyStaff already ran at the top of this handler for any body
    // that isn't the public customer_confirm shape, so this action is
    // already staff-only; the atomic eligibility/ownership checks below
    // (order exists in THIS restaurant, is type=pickup, is still in an
    // active kitchen status) run again inside add_pickup_order_items() under
    // a row lock, so a stale client can't attach items to a finished order
    // even if two requests race (§A19).
    let orderMorePrintJobId: string | undefined;
    let orderMoreResult: { alreadyExists?: boolean; error?: string } | undefined;
    if (body.action === 'order_more') {
      const { data: current, error: curErr } = await sb
        .from('orders')
        .select('*')
        .eq('id', id)
        .single();
      if (curErr || !current) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }
      if (!Array.isArray(body.items) || body.items.length === 0) {
        return NextResponse.json({ error: 'items array is required and must not be empty' }, { status: 400 });
      }
      if (body.subtotal == null || isNaN(Number(body.subtotal)) || body.total == null || isNaN(Number(body.total))) {
        return NextResponse.json({ error: 'subtotal and total must be valid numbers' }, { status: 400 });
      }

      const newItems = (body.items as Record<string, unknown>[]).map(item => ({
        id:         newId('OI'),
        menuItemId: item.menuItemId ?? null,
        name:       item.name,
        qty:        item.qty,
        price:      item.price,
        subtotal:   item.subtotal,
      }));

      const { data: rpcData, error: rpcErr } = await sb.rpc('add_pickup_order_items', {
        p_event_id:        newId('EV'),
        p_order_id:        id,
        p_restaurant_id:   rid,
        p_items:           newItems,
        p_add_subtotal:    Number(body.subtotal),
        p_add_total:       Number(body.total),
        p_notes:           (body.notes as string) ?? null,
        p_performed_by:    (body.by as string) ?? 'Waiter',
        p_idempotency_key: (body.idempotencyKey as string) ?? null,
      });
      if (rpcErr) throw rpcErr;

      const result = rpcData as {
        ok: boolean; error?: string; alreadyExists?: boolean;
        orderId?: string; newItemIds?: string[]; newSubtotal?: number; newTotal?: number;
      };
      if (!result.ok) {
        const httpStatus =
          result.error === 'order_not_found' ? 404 :
          result.error === 'invalid_type'    ? 400 :
          result.error === 'not_eligible'    ? 409 : 500;
        const msg =
          result.error === 'invalid_type' ? 'Order More is only available for Pickup orders.' :
          result.error === 'not_eligible' ? 'This order can no longer accept additional items (already completed, cancelled, or not yet confirmed).' :
          result.error === 'order_not_found' ? 'Order not found' :
          'Could not add items to this order';
        return NextResponse.json({ error: msg }, { status: httpStatus });
      }
      orderMoreResult = result;

      // ── New items ONLY are queued to kitchen/printer (§A9/§B3) ──────────────
      // Follows the SAME routing this order was already confirmed with
      // (order.kitchen_route), not a fresh waiter choice — a single pickup
      // order shouldn't split between printer and kitchen display across
      // rounds. Falls back to the restaurant's configured default only for
      // the (very old-data) edge case where kitchen_route was never set.
      if (!result.alreadyExists) {
        const kitchenRoute = (current.kitchen_route as string) && current.kitchen_route !== 'not_set'
          ? (current.kitchen_route as string)
          : (await resolveKitchenMode(rid)).value;

        if (kitchenRoute === 'printer') {
          try {
            const { data: newItemRows } = await sb
              .from('order_items')
              .select('*')
              .in('id', result.newItemIds ?? []);
            orderMorePrintJobId = newId('PJ');
            await sb.from('print_jobs').insert({
              id:            orderMorePrintJobId,
              restaurant_id: rid,
              order_id:      id,
              job_type:      'kot',
              status:        'queued',
              // ONLY the newly-added items — never the items already sent
              // to the kitchen on the original ticket (§A9/§B3).
              payload:       buildKotPayload(current as Record<string, unknown>, newItemRows ?? [], {
                isOrderMore:   true,
                existingTabId: null,
              }),
              requested_by:  (body.by as string) ?? 'Waiter',
              is_reprint:    false,
            });
          } catch (printErr) {
            console.error(`[order_more] Print job creation failed for order ${id} (non-fatal):`, printErr);
            orderMorePrintJobId = undefined;
          }
        }
        // kitchen_route === 'kitchen_display': no print job — the updated
        // item list reaches Kitchen Display via the existing 5s poll +
        // the 'order_event_added' broadcast below, exactly like every
        // other order update on that screen.
      }
    }

    const { error: updErr } = await sb.from('orders').update(updates).eq('id', id);
    if (updErr) throw updErr;

    // Fetch updated order
    const { data: full } = await sb
      .from('orders')
      .select('*, order_items(*), order_events(*)')
      .eq('id', id)
      .single();

    if (!full) {
      console.error('[PATCH /api/orders/[id]] fetch-back returned null for id:', id);
      return NextResponse.json({ error: 'Order not found after update' }, { status: 404 });
    }
    const order = rowToOrder(full, full.order_items ?? [], full.order_events ?? []);

    // Broadcast fine-grained event so every portal can react precisely
    const event =
      body.status === 'prepared'                  ? 'order_ready'            :
      body.status === 'served'                    ? 'order_served'           :
      body.status === 're_serve_required'         ? 'order_issue_reported'   :
      body.status === 'out_for_delivery'          ? 'order_out_for_delivery' :
      body.status === 'delivered'                 ? 'order_delivered'        :
      body.status === 'completed'                 ? 'payment_completed'      :
      body.action  === 'customer_confirm'         ? 'payment_completed'      :
      body.action  === 'confirm_and_print'        ? 'order_confirmed'        :
      body.action  === 'confirm_and_kitchen'      ? 'order_confirmed'        :
      body.action  === 'switch_to_kitchen'        ? 'order_confirmed'        :
      body.action  === 'reject'                   ? 'order_rejected'         :
      body.action  === 'reprint'                  ? 'print_job_queued'       :
      body.action  === 'order_more'               ? 'order_event_added'      :
      'order_status_changed';
    await broadcast(rid, event, order);

    // ── Keep customer_tabs.total in sync ─────────────────────────────────────
    // When an order is cancelled/voided the tab total must decrease.
    // When a discount is applied the order total changes → tab total must update.
    if (order.tabId && (body.status || body.discount !== undefined)) {
      const { data: tabOrds } = await sb
        .from('orders')
        .select('total')
        .eq('tab_id', order.tabId)
        .not('status', 'in', '("cancelled","void")');
      const liveTotal = (tabOrds ?? []).reduce((s: number, o: Record<string, unknown>) => s + Number(o.total), 0);
      await sb.from('customer_tabs').update({ total: liveTotal }).eq('id', order.tabId);
    }

    // ── "Order ready" notification — fire-and-forget on prepared ────────────
    // Pickup:   customer picks up at counter  → email: "your order is ready"
    // Delivery: food about to be dispatched   → email: "your order is ready"
    // Dine-in:  waiter brings to the table    → NO email at this stage
    //           (table orders only get a receipt email on payment completion)
    const isPickupOrDelivery = order.type === 'pickup' || order.type === 'delivery';
    if (!isIdempotent && body.status === 'prepared' && order.customerEmail && isPickupOrDelivery) {
      sendOrderReadyEmail(id).catch(err =>
        console.error(`[PATCH /api/orders/[id]] ready email error for ${id}:`, err),
      );
    }

    // ── "Out for delivery" notification ─────────────────────────────────────
    if (!isIdempotent && body.status === 'out_for_delivery' && order.customerEmail) {
      sendOutForDeliveryEmail(id).catch(err =>
        console.error(`[PATCH /api/orders/[id]] out_for_delivery email error for ${id}:`, err),
      );
    }

    // ── Coupon redemption on payment completion ──────────────────────────────
    // Mark the reserved coupon as redeemed when the order is paid.
    const isNowComplete =
      body.status === 'completed' ||
      body.action === 'customer_confirm' ||
      body.status === 'delivered';

    if (isNowComplete) {
      const { data: paidOrder } = await sb
        .from('orders')
        .select('coupon_id, coupon_discount')
        .eq('id', id)
        .single();
      if (paidOrder?.coupon_id) {
        sb.from('reward_coupons').update({
          status: 'redeemed',
          redeemed_order_id: id,
          redeemed_at: new Date().toISOString(),
          discount_given: paidOrder.coupon_discount ?? 0,
        }).eq('id', paidOrder.coupon_id as string)
          .eq('status', 'reserved')
          .then(() => {});
      }
    }

    // ── Receipt email — immediate send with queue fallback ───────────────────
    // Send immediately so the customer gets the receipt right away.
    // If the Resend call fails transiently, fall back to enqueueReceiptEmail()
    // so an admin can flush the retry queue manually via /api/email/process-queue.
    // No cron dependency — the POS flow never blocks on email delivery.

    if (isNowComplete && order.customerEmail) {
      sendReceiptEmail(id).then(result => {
        if (!result.sent) {
          console.warn(`[PATCH /api/orders/[id]] immediate email failed for ${id}: ${result.reason} — queuing for retry`);
          return enqueueReceiptEmail(id);
        }
        console.info(`[PATCH /api/orders/[id]] receipt sent for ${id}: ${result.messageId}`);
      }).catch(err =>
        console.error(`[PATCH /api/orders/[id]] email error for ${id}:`, err),
      );
    }

    // ── Spin & Win invite email — fire-and-forget at completion ─────────────
    // triggerSpinInviteForOrder checks eligibility (config, amount, type),
    // generates spin_token if absent, and sends the invite only if the order
    // has an email. Silently skips if Spin & Win is disabled or ineligible.
    // One-per-order: the DB UNIQUE(order_id) on spin_results is the true guard.
    if (isNowComplete && !isIdempotent) {
      triggerSpinInviteForOrder(id).catch(err =>
        console.error(`[PATCH /api/orders/[id]] spin invite error for ${id}:`, err),
      );
    }

    return NextResponse.json({
      ...order,
      ...(confirmPrintJobId    ? { printJobId: confirmPrintJobId }    : {}),
      ...(reprintJobId         ? { printJobId: reprintJobId }         : {}),
      ...(orderMorePrintJobId  ? { printJobId: orderMorePrintJobId }  : {}),
      ...(orderMoreResult      ? { alreadyExists: !!orderMoreResult.alreadyExists } : {}),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[PATCH /api/orders/[id]] unexpected error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ── KOT payload builder ────────────────────────────────────────────────────────
// Builds the JSON snapshot stored in print_jobs.payload. The companion print
// agent reads this and renders an ESC/POS 80mm ticket — see
// print-agent/README.md for the full template. Keeping this as plain JSON
// (rather than pre-rendered ESC/POS bytes) means the ticket layout can be
// changed on the print-agent side without a DB migration or API change.
function buildKotPayload(
  order: Record<string, unknown>,
  items: Record<string, unknown>[],
  opts?: {
    // "ORDER MORE" ticket labeling (task spec §A11 / §B3) — set by the
    // caller when this ticket represents an ADDITIONAL round on a tab/order
    // that already has other confirmed items, so the print agent can print
    // a distinct header. Only ever computed server-side (never trusted from
    // a client body) — see call sites in PATCH below.
    isOrderMore?: boolean;
    existingTabId?: string | null;
  },
): Record<string, unknown> {
  return {
    orderId:        order.id,
    orderNumber:    order.order_number,
    type:           order.type,
    tableId:        order.table_id ?? null,
    customerName:   order.customer_name ?? null,
    // Phone is printed for Pickup and Delivery only — never Dine-In (task
    // spec §B7: no new customer-phone printing on dine-in kitchen tickets).
    // Source of truth is the same `orders.phone` column already used
    // everywhere else (no new phone field — §B5); coerced to a plain string
    // or null so the print agent can never render "undefined"/"null" (§B6).
    customerPhone: order.type !== 'dine-in'
      ? (typeof order.phone === 'string' && order.phone.trim() ? order.phone.trim() : null)
      : null,
    deliveryAddress: order.delivery_address ?? null,
    isOrderMore:    !!opts?.isOrderMore,
    existingTabId:  opts?.existingTabId ?? null,
    items: (items ?? [])
      .slice()
      .sort((a, b) => String(a.created_at ?? '').localeCompare(String(b.created_at ?? '')))
      .map(i => ({
        name: i.name,
        qty:  i.qty,
      })),
    // Order-level special instructions (e.g. "Less spicy, no onions") — see
    // migration_020_staff_ordering.sql. Previously always undefined here even
    // though the print agent already renders payload.notes when present.
    notes:     (order.notes as string | null) ?? undefined,
    createdAt: new Date().toISOString(),
  };
}

function statusToEvent(status: string): string {
  // Maps DB order status → order_events.event_type
  // IMPORTANT: keep in sync with STEPS_PICKUP / STEPS_DELIVERY / STEPS_DINE_IN
  // in app/track/page.tsx — the tracking page reads these exact event type strings.
  //
  // 'pending' = order in kitchen queue (not yet actively being prepared).
  //   Written as 'OrderQueued' — not shown as a tracking step, so tracker ignores it.
  //   This prevents "Being Prepared" from lighting up before cooking actually starts.
  // 'preparing' = kitchen actively cooking → fires 'Preparing' → lights up step 2.
  // 'prepared'  = done → fires 'Prepared'  → lights up step 3.
  // 'served'    = pickup counter / table    → fires 'Served'   → lights up step 4.
  // 'completed' = payment done             → fires 'PaymentCompleted' → lights up final step.
  const map: Record<string, string> = {
    awaiting_waiter:   'AwaitingWaiter',
    pending:           'OrderQueued',       // in kitchen queue — not a visible tracking step
    accepted:          'KitchenAccepted',   // legacy — not used in any active flow
    preparing:         'Preparing',
    prepared:          'Prepared',
    served:            'Served',
    re_serve_required: 'NotReceived',       // customer reported not received
    completed:         'PaymentCompleted',  // final step in pickup/dine-in tracking
    cancelled:         'OrderCancelled',
    picked_up:         'OrderPickedUp',
    out_for_delivery:  'OutForDelivery',
    delivered:         'Delivered',
  };
  return map[status] ?? status;
}
