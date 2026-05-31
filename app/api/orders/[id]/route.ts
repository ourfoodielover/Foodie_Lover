// GET   /api/orders/[id]  — single order
// PATCH /api/orders/[id]  — update order (status / discount / payment / items)
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient, newId, rowToOrder, broadcast } from '@/lib/supabase-server';
import { enqueueReceiptEmail, sendReceiptEmail, sendOrderReadyEmail } from '@/lib/email-server';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const sb = getServerClient();
    const { data, error } = await sb
      .from('orders')
      .select('*, order_items(*), order_events(*)')
      .eq('id', id)
      .single();
    if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
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
  awaiting_waiter:   ['pending', 'cancelled'],
  pending:           ['preparing', 'cancelled'],
  preparing:         ['prepared', 'cancelled'],
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
      body.status === 'prepared'            ? 'order_ready'            :
      body.status === 'served'              ? 'order_served'           :
      body.status === 're_serve_required'   ? 'order_issue_reported'   :
      body.status === 'out_for_delivery'    ? 'order_out_for_delivery' :
      body.status === 'delivered'           ? 'order_delivered'        :
      body.status === 'completed'           ? 'payment_completed'      :
      body.action  === 'customer_confirm'   ? 'payment_completed'      :
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

    // ── Receipt email — immediate send with queue fallback ───────────────────
    // Send immediately so the customer gets the receipt right away.
    // If the Resend call fails transiently, fall back to enqueueReceiptEmail()
    // so an admin can flush the retry queue manually via /api/email/process-queue.
    // No cron dependency — the POS flow never blocks on email delivery.
    const isNowComplete =
      body.status === 'completed' ||
      body.action === 'customer_confirm' ||
      body.status === 'delivered'; // delivery orders: send receipt on delivery, not just on completed

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

    return NextResponse.json(order);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[PATCH /api/orders/[id]] unexpected error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
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
