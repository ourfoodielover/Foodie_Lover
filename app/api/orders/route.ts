// GET  /api/orders   — list orders
// POST /api/orders   — create order
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient, newId, nextOrderNum, rowToOrder, broadcast } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const sb  = getServerClient();
    const url = new URL(req.url);
    const rid    = url.searchParams.get('restaurantId') ?? 'rest_default';
    const status = url.searchParams.get('status');
    const type   = url.searchParams.get('type');
    // tabId filter: customer QR page fetches only its own tab's orders
    const tabId  = url.searchParams.get('tabId');

    // ── Pagination: max 200 rows, default 150 ─────────────────────────────────
    // Without a LIMIT this becomes a full table scan in production.
    // Portals (waiter, kitchen, delivery) pass limit=100 for active orders only.
    // Manager analytics use a higher limit or the /api/analytics route instead.
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '150'), 200);

    // ── "active" flag: exclude terminal statuses ───────────────────────────────
    // Portals that only care about in-flight orders pass active=1 to avoid
    // loading thousands of historical completed / cancelled records.
    const activeOnly = url.searchParams.get('active') === '1';

    // ── Date range filter for time-bounded queries ─────────────────────────────
    // Pass since=<ISO_date> to limit results to orders newer than that timestamp.
    const since = url.searchParams.get('since');

    let query = sb
      .from('orders')
      // Select named columns (not *) + joined tables — avoids surprise large fields
      .select(
        'id, order_number, restaurant_id, type, table_id, tab_id, ' +
        'customer_name, customer_email, phone, status, subtotal, tax, tip, ' +
        'total, discount, discount_reason, payment_method, tracking_token, ' +
        'delivery_address, delivery_person, assigned_at, delivered_at, ' +
        'cancel_reason, source, issue_count, created_at, updated_at, ' +
        'order_items(id, name, qty, price, subtotal, item_status, menu_item_id), ' +
        'order_events(id, event_type, performed_by, note, created_at)',
      )
      .eq('restaurant_id', rid)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status)     query = query.eq('status',  status);
    if (type)       query = query.eq('type',    type);
    if (tabId)      query = query.eq('tab_id',  tabId);
    if (activeOnly) query = query.not('status', 'in', '("completed","cancelled","void")');
    if (since)      query = query.gte('created_at', since);

    const { data, error } = await query;
    if (error) throw error;

    const orders = (data ?? []).map(r => {
      // Named-column SELECT strings cause Supabase TS to infer GenericStringError
      // instead of a typed row. Cast through unknown to bypass the inference gap.
      const row = r as unknown as Record<string, unknown>;
      return rowToOrder(
        row,
        (row.order_items as Record<string, unknown>[]) ?? [],
        (row.order_events as Record<string, unknown>[]) ?? [],
      );
    });
    return NextResponse.json(orders);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[GET /api/orders] unexpected error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ── POST ──────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const sb   = getServerClient();
    const body = await req.json();
    const rid   = body.restaurantId ?? 'rest_default';

    // ── Input validation ──────────────────────────────────────────────────────
    const VALID_TYPES = ['dine-in', 'pickup', 'delivery'];
    if (!body.type || !VALID_TYPES.includes(body.type)) {
      return NextResponse.json(
        { error: `Invalid or missing order type. Must be one of: ${VALID_TYPES.join(', ')}` },
        { status: 400 },
      );
    }
    if (!body.customerName || String(body.customerName).trim() === '') {
      return NextResponse.json({ error: 'customerName is required' }, { status: 400 });
    }
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: 'items array is required and must not be empty' }, { status: 400 });
    }
    if (body.subtotal == null || isNaN(Number(body.subtotal))) {
      return NextResponse.json({ error: 'subtotal must be a valid number' }, { status: 400 });
    }
    if (body.total == null || isNaN(Number(body.total))) {
      return NextResponse.json({ error: 'total must be a valid number' }, { status: 400 });
    }
    if (body.type === 'delivery' && !body.deliveryAddress) {
      return NextResponse.json({ error: 'deliveryAddress is required for delivery orders' }, { status: 400 });
    }
    const id    = newId('ORD');
    const num   = await nextOrderNum(sb, rid);
    const status = body.type === 'dine-in' ? 'awaiting_waiter' : 'pending';
    const trackingToken = body.trackingToken
      ?? (body.source === 'online' ? newId('TRK') : null);

    // ── Resolve table_id safely ─────────────────────────────────────────────
    // The orders table has table_id REFERENCES tables(id). If body.tableId is a
    // legacy URL param like "T04" instead of the real DB id "tbl_04", the insert
    // would violate the FK constraint.
    // Strategy: if tabId is provided, derive table_id from the tab (already FK-safe).
    // Otherwise normalize and look up by id or name, same as POST /api/tabs does.
    let resolvedTableId: string | null = null;
    if (body.tabId) {
      const { data: tabRow } = await sb
        .from('customer_tabs').select('table_id').eq('id', body.tabId).maybeSingle();
      if (tabRow) resolvedTableId = (tabRow as Record<string, unknown>).table_id as string | null ?? null;
    }
    if (!resolvedTableId && body.tableId) {
      const raw = String(body.tableId);
      const norm = raw.replace(/^([A-Za-z]+)0+(\d)/, '$1$2');
      const orParts = Array.from(new Set([`id.eq.${raw}`, `name.eq.${raw}`, `name.eq.${norm}`])).join(',');
      const { data: tblRow } = await sb.from('tables').select('id').eq('restaurant_id', rid).or(orParts).maybeSingle();
      if (tblRow) resolvedTableId = (tblRow as Record<string, unknown>).id as string;
    }

    const { error: orderErr } = await sb.from('orders').insert({
      id,
      restaurant_id:    rid,
      order_number:     num,
      type:             body.type,
      table_id:         resolvedTableId,
      tab_id:           body.tabId        ?? null,
      customer_name:    body.customerName ?? null,
      customer_email:   body.customerEmail ?? null,
      phone:            body.phone        ?? null,
      status,
      subtotal:         body.subtotal,
      tax:              body.tax  ?? 0,
      tip:              body.tip  ?? 0,
      total:            body.total,
      payment_method:   body.paymentMethod ?? null,
      tracking_token:   trackingToken,
      delivery_address: body.deliveryAddress ?? null,
      source:           body.source ?? 'in-store',
      updated_at:       new Date().toISOString(),
    });
    if (orderErr) throw orderErr;

    if (body.items?.length > 0) {
      const { error: itemErr } = await sb.from('order_items').insert(
        body.items.map((item: Record<string, unknown>) => ({
          id:           newId('OI'),
          order_id:     id,
          menu_item_id: item.menuItemId ?? null,
          name:         item.name,
          qty:          item.qty,
          price:        item.price,
          subtotal:     item.subtotal,
        })),
      );
      if (itemErr) throw itemErr;
    }

    // ── Keep customer_tabs.total in sync ─────────────────────────────────────
    // Tab total is updated on EVERY order event so the customer page always
    // shows the live bill (not 0) during an open session.
    if (body.tabId) {
      const { data: tabOrders } = await sb
        .from('orders')
        .select('total')
        .eq('tab_id', String(body.tabId))
        .not('status', 'in', '("cancelled","void")');
      const liveTotal = (tabOrders ?? []).reduce((s: number, o: Record<string, unknown>) => s + Number(o.total), 0);
      await sb.from('customer_tabs').update({ total: liveTotal }).eq('id', String(body.tabId));
    }

    await sb.from('order_events').insert({
      id:           newId('EV'),
      order_id:     id,
      event_type:   'OrderPlaced',
      performed_by: body.customerName ?? 'Customer',
      note: body.type === 'delivery' ? `Delivery to: ${body.deliveryAddress}` :
            body.type === 'pickup'   ? 'Pickup' : undefined,
    });

    const { data: full, error: fetchErr } = await sb
      .from('orders')
      .select('*, order_items(*), order_events(*)')
      .eq('id', id)
      .single();

    if (fetchErr || !full) {
      console.error('[POST /api/orders] fetch-back failed:', fetchErr?.message);
      // Order was created — return minimal safe response
      return NextResponse.json({ id, orderNum: num, status, type: body.type }, { status: 201 });
    }

    const order = rowToOrder(full, full.order_items ?? [], full.order_events ?? []);
    await broadcast(rid, 'order_created', order);
    return NextResponse.json(order, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[POST /api/orders] unexpected error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
