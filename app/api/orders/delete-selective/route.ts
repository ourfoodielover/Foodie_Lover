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

import { NextResponse } from 'next/server';
import { createClient }  from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // +05:30

/** Convert an IST date+time string to a UTC ISO string. */
function istToUtc(dateStr: string, timeStr = '00:00'): string {
  // dateStr: 'YYYY-MM-DD', timeStr: 'HH:MM'
  const [y, mo, d]  = dateStr.split('-').map(Number);
  const [h, mi]     = timeStr.split(':').map(Number);
  const istMs       = Date.UTC(y, mo - 1, d, h, mi, 0, 0);
  return new Date(istMs - IST_OFFSET_MS).toISOString();
}

interface Body {
  pin:      string;
  mode:     'id' | 'date' | 'range';
  orderId?: string;
  date?:    string;
  dateFrom?: string;
  dateTo?:   string;
  timeFrom?: string;
  timeTo?:   string;
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as Body;
    const { pin, mode } = body;

    // ── PIN check ────────────────────────────────────────────────────────────
    if (!pin) return NextResponse.json({ error: 'PIN required' }, { status: 400 });

    const { data: pinRow } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'admin_pin')
      .single();

    if (!pinRow || pinRow.value !== pin)
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 403 });

    // ── Build list of order IDs to delete ────────────────────────────────────
    let orderIds: string[] = [];

    if (mode === 'id') {
      if (!body.orderId?.trim())
        return NextResponse.json({ error: 'orderId required' }, { status: 400 });
      orderIds = [body.orderId.trim()];

    } else if (mode === 'date') {
      if (!body.date)
        return NextResponse.json({ error: 'date required (YYYY-MM-DD)' }, { status: 400 });

      const from = istToUtc(body.date, '00:00');
      const to   = istToUtc(body.date, '23:59:59'.slice(0, 5)); // end of IST day = next day 00:00 IST - 1s
      // easier: shift by 24h
      const toDate = new Date(new Date(from).getTime() + 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
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

      const from = istToUtc(dateFrom, timeFrom);
      // For the end bound: add 1 minute to timeTo so "23:59" is inclusive
      const [endH, endM] = timeTo.split(':').map(Number);
      const endTotalMin  = endH * 60 + endM + 1;
      const endTime      = `${String(Math.floor(endTotalMin / 60) % 24).padStart(2, '0')}:${String(endTotalMin % 60).padStart(2, '0')}`;
      const endDate      = endTotalMin >= 24 * 60 ? dateTo : dateTo; // same date if < midnight
      const to           = endTotalMin >= 24 * 60
        ? istToUtc(
            // next day
            new Date(new Date(dateTo + 'T00:00:00').getTime() + 24 * 60 * 60 * 1000)
              .toISOString().slice(0, 10),
            '00:00',
          )
        : istToUtc(endDate, endTime);

      const { data, error } = await supabase
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

    // ── Delete in dependency order ────────────────────────────────────────────
    const { error: evErr } = await supabase
      .from('order_events')
      .delete()
      .in('order_id', orderIds);
    if (evErr) return NextResponse.json({ error: `Events: ${evErr.message}` }, { status: 500 });

    const { error: itErr } = await supabase
      .from('order_items')
      .delete()
      .in('order_id', orderIds);
    if (itErr) return NextResponse.json({ error: `Items: ${itErr.message}` }, { status: 500 });

    const { error: ordErr } = await supabase
      .from('orders')
      .delete()
      .in('id', orderIds);
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
 * GET /api/orders/delete-selective?mode=date&date=YYYY-MM-DD
 *     &mode=range&dateFrom=...&dateTo=...&timeFrom=...&timeTo=...
 *
 * Returns a count of orders that *would* be deleted — preview before confirm.
 * PIN is NOT required for a count preview.
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

    let query = supabase.from('orders').select('id', { count: 'exact', head: true });

    if (mode === 'date' && date) {
      const from   = istToUtc(date, '00:00');
      const toDate = new Date(new Date(from).getTime() + 24 * 60 * 60 * 1000).toISOString();
      query = query.gte('created_at', from).lt('created_at', toDate);

    } else if (mode === 'range' && dateFrom && dateTo) {
      const from             = istToUtc(dateFrom, timeFrom);
      const [endH, endM]     = timeTo.split(':').map(Number);
      const endTotalMin      = endH * 60 + endM + 1;
      const endTimeStr       = `${String(Math.floor(endTotalMin / 60) % 24).padStart(2, '0')}:${String(endTotalMin % 60).padStart(2, '0')}`;
      const to               = endTotalMin >= 24 * 60
        ? istToUtc(
            new Date(new Date(dateTo + 'T00:00:00').getTime() + 24 * 60 * 60 * 1000)
              .toISOString().slice(0, 10),
            '00:00',
          )
        : istToUtc(dateTo, endTimeStr);
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
