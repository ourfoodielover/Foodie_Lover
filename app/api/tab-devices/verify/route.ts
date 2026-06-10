/**
 * POST /api/tab-devices/verify
 *
 * Per-customer session recovery via individual personal PIN.
 * Used by the "It's my session" Mode B flow on the table QR page.
 *
 * Body: { tableId: string, customerName: string, pin: string }
 *
 * Lookup strategy:
 *   1. Find an open tab for the table.
 *   2. Find a tab_devices row for that tab where:
 *        LOWER(customer_name) = LOWER(customerName)  AND  personal_pin = pin
 *   3. If not found (legacy session without personal_pin): fall back to
 *      verifying against customer_tabs.pin (shared tab/host PIN).
 *
 * Returns: { ok: true, tabId, customerName, tabDevice } on success
 *          { ok: false, error: string }               on failure
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

    // ── Step 1: Find the open tab for this table ────────────────────────────
    const { data: tabs, error: tabErr } = await sb
      .from('customer_tabs')
      .select('id, status, customer_name, pin')
      .eq('restaurant_id', rid)
      .eq('table_id', tableId)
      .in('status', ['open', 'awaiting_payment']);

    if (tabErr) return NextResponse.json({ ok: false, error: tabErr.message }, { status: 500 });
    if (!tabs || tabs.length === 0) {
      return err('No active session found at this table', 404);
    }

    // Most recently opened tab first (handle edge case of multiple open tabs)
    const tab = tabs[0];

    // ── Step 2: Look up personal PIN in tab_devices ─────────────────────────
    const { data: devices, error: devErr } = await sb
      .from('tab_devices')
      .select('id, device_id, customer_name, personal_pin')
      .eq('tab_id', tab.id)
      .ilike('customer_name', customerName.trim())
      .eq('personal_pin', pin.trim());

    if (devErr) return NextResponse.json({ ok: false, error: devErr.message }, { status: 500 });

    if (devices && devices.length > 0) {
      // Personal PIN matched — return the session
      const device = devices[0] as { id: string; device_id: string; customer_name: string; personal_pin: string };
      return NextResponse.json({
        ok:           true,
        tabId:        tab.id,
        customerName: device.customer_name as string,
        tabDevice:    device,
      });
    }

    // ── Step 3: Backward-compat fallback — legacy session (no personal_pin) ─
    // Only allow this for the session creator (whose name is in customer_tabs.customer_name)
    // and whose PIN is the shared tab PIN.
    if (
      tab.pin &&
      tab.pin === pin.trim() &&
      (tab.customer_name ?? '').toLowerCase() === customerName.trim().toLowerCase()
    ) {
      return NextResponse.json({
        ok:           true,
        tabId:        tab.id,
        customerName: tab.customer_name as string,
        tabDevice:    null, // no device row to restore — caller must re-register
      });
    }

    // Nothing matched
    return NextResponse.json({ ok: false, error: 'Incorrect name or PIN' }, { status: 401 });

  } catch (e) {
    console.error('[POST /api/tab-devices/verify]', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 },
    );
  }
}
