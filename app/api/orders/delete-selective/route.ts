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

    // ── Full FK dependency map ────────────────────────────────────────────────
    // spin_results.order_id          → orders(id)  ON DELETE CASCADE
    // reward_coupons.spin_id         → spin_results(id)  RESTRICT  ← blocks cascade
    // reward_coupons.source_order_id → orders(id)  RESTRICT
    // reward_coupons.reserved_order_id → orders(id)  RESTRICT
    // reward_coupons.redeemed_order_id → orders(id)  RESTRICT
    //
    // Deletion sequence:
    //   1. Find spin_result IDs for these orders
    //   2. Delete reward_coupons that came from those spins
    //   3. Nullify remaining reward_coupon back-refs (coupons from OTHER orders
    //      that were reserved/redeemed on these orders)
    //   4. Delete order_events, order_items, spin_results (parallel)
    //   5. Delete orders

    // Step 1 — find spin_result IDs for affected orders
    const { data: srRows, error: srLookupErr } = await sb
      .from('spin_results')
      .select('id')
      .in('order_id', orderIds);
    if (srLookupErr) return NextResponse.json({ error: `Spin lookup: ${srLookupErr.message}` }, { status: 500 });
    const spinResultIds = (srRows ?? []).map((r: { id: string }) => r.id);

    // Step 2 — delete coupons whose spin came from these orders (unblocks spin_results cascade)
    if (spinResultIds.length > 0) {
      const { error: rcSpinErr } = await sb
        .from('reward_coupons')
        .delete()
        .in('spin_id', spinResultIds);
      if (rcSpinErr) return NextResponse.json({ error: `Coupons(spin): ${rcSpinErr.message}` }, { status: 500 });
    }

    // Step 3 — nullify remaining back-refs: coupons from other orders that were
    // reserved or redeemed on one of the orders we're deleting
    const [rcSrc, rcRes, rcRed] = await Promise.all([
      sb.from('reward_coupons').update({ source_order_id:   null }).in('source_order_id',   orderIds),
      sb.from('reward_coupons').update({ reserved_order_id: null }).in('reserved_order_id', orderIds),
      sb.from('reward_coupons').update({ redeemed_order_id: null }).in('redeemed_order_id', orderIds),
    ]);
    const rcErr = rcSrc.error ?? rcRes.error ?? rcRed.error;
    if (rcErr) return NextResponse.json({ error: `Coupons(refs): ${rcErr.message}` }, { status: 500 });

    // Step 4 — clear child rows in parallel (spin_results explicit in case of no_reward spins)
    const [evRes, itRes, srRes] = await Promise.all([
      sb.from('order_events').delete().in('order_id', orderIds),
      sb.from('order_items').delete().in('order_id', orderIds),
      sb.from('spin_results').delete().in('order_id', orderIds),
    ]);
    const childErr = evRes.error ?? itRes.error ?? srRes.error;
    if (childErr) return NextResponse.json({ error: `Children: ${childErr.message}` }, { status: 500 });

    // Step 5 — delete orders (all FK blockers are now cleared)
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
