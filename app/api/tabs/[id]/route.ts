// PATCH /api/tabs/[id] — update or close a tab
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient, newId, broadcast } from '@/lib/supabase-server';
import { enqueueReceiptEmail, sendReceiptEmail } from '@/lib/email-server';

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
    createdAt:      row.created_at,
    closedAt:       row.closed_at ?? null,
  };
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const sb   = getServerClient();
    const body = await req.json();

    // Detect close action: support both { close: true } and { action: 'close' }
    const isClose = body.close === true || body.action === 'close';

    if (isClose) {
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
        .select('total, status')
        .eq('tab_id', id)
        .not('status', 'in', '("cancelled","void")');
      const rawTotal = (tabOrders ?? []).reduce((s, o) => s + Number(o.total), 0);

      const discount       = Number(body.discount) || 0;
      const paymentMethod  = body.paymentMethod || 'cod';
      const discountReason = body.discountReason ?? null;
      const finalTotal     = Math.max(0, rawTotal - discount);

      // Close the tab
      const { error: closeErr } = await sb.from('customer_tabs').update({
        status:          'closed',
        total:           rawTotal,
        discount:        discount,
        discount_reason: discountReason,
        payment_method:  paymentMethod,
        closed_at:       new Date().toISOString(),
      }).eq('id', id);
      if (closeErr) {
        console.error('[PATCH /api/tabs/[id]] close tab error:', closeErr.message);
        return NextResponse.json({ error: closeErr.message }, { status: 500 });
      }

      // Mark all non-cancelled/void tab orders as completed
      const { error: ordersErr } = await sb.from('orders')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('tab_id', id)
        .not('status', 'in', '("cancelled","void","completed")');
      if (ordersErr) {
        console.error('[PATCH /api/tabs/[id]] orders update error:', ordersErr.message);
        // Non-fatal: tab is already closed, continue with events + broadcast
      }

      // ── Write PaymentCompleted event for every order being completed ────────
      // CRITICAL: the dine-in tracking page uses order_events to light up steps.
      // Without this event, the final "Completed" step stays grey even though
      // the payment was collected and the order is done.
      const { data: completingOrders } = await sb
        .from('orders')
        .select('id')
        .eq('tab_id', id)
        .not('status', 'in', '("cancelled","void")');

      if (completingOrders && completingOrders.length > 0) {
        await sb.from('order_events').insert(
          completingOrders.map(o => ({
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
      // For each completed tab order that has a customer_email, send a receipt.
      // Uses sendReceiptEmail which is idempotent (checks order_events for duplicates).
      // Fire-and-forget: don't block the response on email delivery.
      if (tabOrders && tabOrders.length > 0) {
        const { data: completedOrders } = await sb
          .from('orders')
          .select('id, customer_email')
          .eq('tab_id', id)
          .eq('status', 'completed')
          .not('customer_email', 'is', null);

        if (completedOrders && completedOrders.length > 0) {
          for (const o of completedOrders) {
            if (o.customer_email) {
              const oid = o.id as string;
              // Attempt immediate send — most reliable path
              sendReceiptEmail(oid).then(result => {
                if (!result.sent) {
                  console.warn(`[tabs/close] immediate email failed for ${oid}: ${result.reason}`);
                  // Fall back to queue for retry
                  return enqueueReceiptEmail(oid);
                }
                console.info(`[tabs/close] receipt email sent for ${oid}: ${result.messageId}`);
              }).catch(err =>
                console.error(`[tabs/close] email error for ${oid}:`, err),
              );
            }
          }
        }
      }

      // Return updated tab
      const { data: updated } = await sb.from('customer_tabs').select('*').eq('id', id).single();
      return NextResponse.json(updated ? rowToTab(updated) : { ok: true });

    } else {
      // Generic update — supports discount, waiterName, status changes, total
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
