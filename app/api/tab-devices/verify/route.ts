/**
 * POST /api/tab-devices/verify
 *
 * Per-customer session recovery via Name + PIN.
 *
 * ARCHITECTURE: every customer who orders at a table gets their OWN
 * independent `customer_tabs` row (table_id is shared, everything else
 * — pin, customer_name, total, discount, orders — is per-customer).
 * So recovering a session is simply: find an open/awaiting_payment tab
 * at this table whose customer_name + pin match what the customer enters.
 *
 * Body: { tableId: string, customerName: string, pin: string }
 *
 * Returns: { ok: true, tabId, customerName } on success
 *          { ok: false, error: string }      on failure
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient }           from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

function err(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      tableId?:      string;
      customerName?: string;
      pin?:          string;
    };

    const { tableId, customerName, pin } = body;
    if (!tableId)      return err('tableId is required');
    if (!customerName) return err('customerName is required');
    if (!pin)          return err('pin is required');
    if (!/^\d{4}$/.test(pin.trim())) return err('PIN must be 4 digits');

    const sb  = getServerClient();
    const rid = process.env.NEXT_PUBLIC_RESTAURANT_ID ?? 'rest_default';

    // ── Find an open/awaiting-payment tab at this table whose own
    //    customer_name + pin match what was entered. Each tab belongs
    //    to exactly one customer, so this is always a 1:1 match. ──────
    const { data: tabs, error: tabErr } = await sb
      .from('customer_tabs')
      .select('id, status, customer_name, pin, table_id')
      .eq('restaurant_id', rid)
      .eq('table_id', tableId)
      .in('status', ['open', 'awaiting_payment']);

    if (tabErr) return NextResponse.json({ ok: false, error: tabErr.message }, { status: 500 });
    if (!tabs || tabs.length === 0) {
      return err('No active session found at this table', 404);
    }

    const nameNorm = customerName.trim().toLowerCase();
    const pinNorm  = pin.trim();
    const match = tabs.find(t =>
      (t.customer_name ?? '').trim().toLowerCase() === nameNorm &&
      (t.pin ?? '') === pinNorm,
    );

    if (!match) {
      return err('Incorrect name or PIN', 401);
    }

    return NextResponse.json({
      ok:           true,
      tabId:        match.id,
      customerName: match.customer_name as string,
    });

  } catch (e) {
    console.error('[POST /api/tab-devices/verify]', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 },
    );
  }
}
