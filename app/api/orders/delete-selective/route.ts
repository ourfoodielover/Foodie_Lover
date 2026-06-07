/**
 * POST /api/orders/delete-selective
 *
 * Permanently deletes a subset of orders (+ their items + events).
 * Requires admin PIN (verified server-side — never sent back to browser).
 *
 * Body modes:
 *   { pin, mode: 'id',    orderId: string }
 *   { pin, mode: 'date',  date: string }                          // YYYY-MM-DD  (IST)
 *   { pin, mode: 'range', dateFrom: string, dateTo: string,
 *                         timeFrom?: string, timeTo?: string }    // HH:MM (24h IST)
 *
 * IST = UTC+05:30  →  IST midnight = 18:30 UTC previous day
 */

import { NextResponse }   from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // +05:30

/** Convert an IST date+time string to a UTC ISO string. */
function istToUtc(dateStr: string, timeStr = '00:00'): string {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const [h, mi]    = timeStr.split(':').map(Number);
  const istMs      = Date.UTC(y, mo - 1, d, h, mi, 0, 0);
  return new Date(istMs - IST_OFFSET_MS).toISOString();
}

async function verifyAdminPin(pin: string): Promise<boolean> {
  try {
    const sb  = getServerClient();
    const rid = process.env.NEXT_PUBLIC_RESTAURANT_ID ?? 'rest_default';
    const { data } = await sb
      .from('restaurant_settings')
      .select('value')
      .eq('restaurant_id', rid)
      .eq('key', 'admin_pin')
      .maybeSingle();
    return !!data && data.value === pin;
  } catch {
    return false;
  }
}

interface Body {
  pin:       string;
  mode:      'id' | 'date' | 'range';
  orderId?:  string;
  date?:     string;
  dateFrom?: string;
  dateTo?:   string;
  timeFrom?: string;
  timeTo?:   string;
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as Body;
    const { pin, mode } = body;

    if (!pin) return NextResponse.json({ error: 'PIN required' }, { status: 400 });

    const valid = await verifyAdminPin(pin);
    if (!valid) return NextResponse.json({ error: 'Invalid PIN' }, { status: 403 });

    const sb = getServerClient();
    let orderIds: string[] = [];

    if (mode === 'id') {
      if (!body.orderId?.trim())
        return NextResponse.json({ error: 'orderId required' }, { status: 400 });
      orderIds = [body.orderId.trim()];

    } else if (mode === 'date') {
      if (!body.date)
        return NextResponse.json({ error: 'date required (YYYY-MM-DD)' }, { status: 400 });

      const from   = istToUtc(body.date, '00:00');
      const toDate = new Date(new Date(from).getTime() + 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await sb
        .from('orders')
        .select('id')
        .gte('created_at', from)
        .lt('created_at', toDate);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      orderIds = (data ?? []).map((r: { id: string }) => r.id);

    } else if (mode === 'range') {
      const { dateFrom, dateTo, timeFrom = '00:00', timeTo = '23:59' } = body;
      if (!dateFrom || !dateTo)
        return NextResponse.json({ error: 'dateFrom and dateTo required' }, { status: 400 });

      const from         = istToUtc(dateFrom, timeFrom);
      const [endH, endM] = timeTo.split(':').map(Number);
      const endTotalMin  = endH * 60 + endM + 1;
      const to           = endTotalMin >= 24 * 60
        ? istToUtc(
            new Date(new Date(dateTo + 'T00:00:00').getTime() + 24 * 60 * 60 * 1000)
              .toISOString().slice(0, 10),
            '00:00',
          )
        : istToUtc(dateTo, `${String(Math.floor(endTotalMin / 60)).padStart(2, '0')}:${String(endTotalMin % 60).padStart(2, '0')}`);

      const { data, error } = await sb
        .from('orders')
        .select('id')
        .gte('created_at', from)
        .lt('created_at', to);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      orderIds = (data ?? []).map((r: { id: string }) => r.id);

    } else {
      return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
    }

    if (orderIds.length === 0)
      return NextResponse.json({ ok: true, deleted: 0, message: 'No matching orders found.' });

    // Delete in dependency order
    const { error: evErr } = await sb.from('order_events').delete().in('order_id', orderIds);
    if (evErr) return NextResponse.json({ error: `Events: ${evErr.message}` }, { status: 500 });

    const { error: itErr } = await sb.from('order_items').delete().in('order_id', orderIds);
    if (itErr) return NextResponse.json({ error: `Items: ${itErr.message}` }, { status: 500 });

    const { error: ordErr } = await sb.from('orders').delete().in('id', orderIds);
    if (ordErr) return NextResponse.json({ error: `Orders: ${ordErr.message}` }, { status: 500 });

    return NextResponse.json({
      ok:      true,
      deleted: orderIds.length,
      message: `${orderIds.length} order${orderIds.length !== 1 ? 's' : ''} deleted successfully.`,
    });

  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

/**
 * GET /api/orders/delete-selective — preview count (no PIN needed)
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mode     = searchParams.get('mode');
    const date     = searchParams.get('date');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo   = searchParams.get('dateTo');
    const timeFrom = searchParams.get('timeFrom') ?? '00:00';
    const timeTo   = searchParams.get('timeTo')   ?? '23:59';

    const sb = getServerClient();
    let query = sb.from('orders').select('id', { count: 'exact', head: true });

    if (mode === 'date' && date) {
      const from   = istToUtc(date, '00:00');
      const toDate = new Date(new Date(from).getTime() + 24 * 60 * 60 * 1000).toISOString();
      query = query.gte('created_at', from).lt('created_at', toDate);

    } else if (mode === 'range' && dateFrom && dateTo) {
      const from         = istToUtc(dateFrom, timeFrom);
      const [endH, endM] = timeTo.split(':').map(Number);
      const endTotalMin  = endH * 60 + endM + 1;
      const to           = endTotalMin >= 24 * 60
        ? istToUtc(
            new Date(new Date(dateTo + 'T00:00:00').getTime() + 24 * 60 * 60 * 1000)
              .toISOString().slice(0, 10),
            '00:00',
          )
        : istToUtc(dateTo, `${String(Math.floor(endTotalMin / 60)).padStart(2, '0')}:${String(endTotalMin % 60).padStart(2, '0')}`);
      query = query.gte('created_at', from).lt('created_at', to);

    } else {
      return NextResponse.json({ count: null });
    }

    const { count, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ count: count ?? 0 });

  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
