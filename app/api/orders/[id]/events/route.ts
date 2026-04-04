// GET  /api/orders/[id]/events  — fetch all events for an order (timeline)
// POST /api/orders/[id]/events  — append a new event (e.g. CustomerConfirmed, FoodDisputed)
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient, newId, broadcast } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
type Ctx = { params: Promise<{ id: string }> };

// ── GET ────────────────────────────────────────────────────────────────────────
export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const sb = getServerClient();
    const { data, error } = await sb
      .from('order_events')
      .select('*')
      .eq('order_id', id)
      .order('created_at', { ascending: true });
    if (error) {
      console.error('[GET /api/orders/[id]/events] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data ?? []);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[GET /api/orders/[id]/events] unexpected error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ── POST ───────────────────────────────────────────────────────────────────────
// Body: { eventType: string, performedBy?: string, note?: string, restaurantId?: string }
// Returns: the inserted order_event row (camelCase)
export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { id: orderId } = await ctx.params;
    const sb = getServerClient();

    let body: Record<string, unknown>;
    try {
      body = await req.json() as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 });
    }

    const eventType   = String(body.eventType   ?? '').trim();
    const performedBy = String(body.performedBy ?? '').trim() || null;
    const note        = body.note != null ? String(body.note).trim() || null : null;
    const rid         = String(body.restaurantId ?? 'rest_default');

    if (!eventType) {
      return NextResponse.json({ error: 'eventType is required' }, { status: 400 });
    }

    // Verify the order exists and belongs to this restaurant
    const { data: order, error: orderErr } = await sb
      .from('orders')
      .select('id, restaurant_id, status')
      .eq('id', orderId)
      .maybeSingle();

    if (orderErr) {
      console.error('[POST /api/orders/[id]/events] order lookup error:', orderErr.message);
      return NextResponse.json({ error: orderErr.message }, { status: 500 });
    }
    if (!order) {
      return NextResponse.json({ error: `Order ${orderId} not found` }, { status: 404 });
    }

    // Insert the event
    const eventId = newId('EV');
    const { data: inserted, error: insertErr } = await sb
      .from('order_events')
      .insert({
        id:           eventId,
        order_id:     orderId,
        event_type:   eventType,
        performed_by: performedBy,
        note,
      })
      .select()
      .single();

    if (insertErr) {
      console.error('[POST /api/orders/[id]/events] insert error:', insertErr.message);
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    // Broadcast so the tracking page and kitchen portal update in real-time
    const restaurantId = (order as Record<string, unknown>).restaurant_id as string ?? rid;
    await broadcast(restaurantId, 'order_event_added', {
      orderId,
      eventType,
      performedBy,
      note,
    });

    const row = inserted as Record<string, unknown>;
    return NextResponse.json(
      {
        id:          row.id,
        orderId:     row.order_id,
        eventType:   row.event_type,
        performedBy: row.performed_by ?? null,
        note:        row.note        ?? null,
        createdAt:   row.created_at,
      },
      { status: 201 },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[POST /api/orders/[id]/events] unexpected error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
