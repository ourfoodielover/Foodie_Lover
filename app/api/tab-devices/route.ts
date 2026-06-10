// GET    /api/tab-devices?tabId=&deviceId=   — lookup registered devices
// POST   /api/tab-devices                    — register (upsert) a device to a tab
// DELETE /api/tab-devices?deviceId=&tabId=   — remove a device when session ends
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient, newId } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export async function GET(req: NextRequest) {
  try {
    const sb  = getServerClient();
    const url = new URL(req.url);
    const tabId    = url.searchParams.get('tabId');
    const deviceId = url.searchParams.get('deviceId');

    // Build query with explicit filter chaining — avoid re-assignment type issues
    let data: Record<string, unknown>[] = [];
    let fetchError: { message: string } | null = null;

    if (tabId && deviceId) {
      const res = await sb.from('tab_devices').select('*')
        .eq('tab_id', tabId).eq('device_id', deviceId).order('joined_at', { ascending: true });
      data = (res.data ?? []) as Record<string, unknown>[];
      fetchError = res.error;
    } else if (tabId) {
      const res = await sb.from('tab_devices').select('*')
        .eq('tab_id', tabId).order('joined_at', { ascending: true });
      data = (res.data ?? []) as Record<string, unknown>[];
      fetchError = res.error;
    } else if (deviceId) {
      const res = await sb.from('tab_devices').select('*')
        .eq('device_id', deviceId).order('joined_at', { ascending: true });
      data = (res.data ?? []) as Record<string, unknown>[];
      fetchError = res.error;
    } else {
      const res = await sb.from('tab_devices').select('*').order('joined_at', { ascending: true });
      data = (res.data ?? []) as Record<string, unknown>[];
      fetchError = res.error;
    }

    if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

    // Camel-case the snake_case rows for the client
    const rows = data.map((r) => ({
      id:           r.id,
      restaurantId: r.restaurant_id,
      tabId:        r.tab_id,
      deviceId:     r.device_id,
      customerName: r.customer_name,
      tableId:      r.table_id ?? null,
      joinedAt:     r.joined_at,
    }));
    return NextResponse.json(rows);
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const sb   = getServerClient();
    let body: Record<string, unknown>;
    try { body = await req.json() as Record<string, unknown>; }
    catch { return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 }); }

    if (!body.tabId || !body.deviceId) {
      return NextResponse.json({ error: 'tabId and deviceId are required' }, { status: 400 });
    }

    const rid = (body.restaurantId as string | undefined) ?? 'rest_default';

    // personal_pin: the individual customer's 4-digit PIN for per-person session recovery.
    // Falls back to '' if not supplied (backward compat with older sessions).
    const personalPin = typeof body.personalPin === 'string' ? body.personalPin.trim() : '';

    // Upsert: if this device is already registered to this tab, update customer_name / joined_at.
    // Only overwrite personal_pin if a non-empty value is supplied (avoid clearing it on re-register).
    const upsertRow: Record<string, unknown> = {
      id:            newId('DEV'),
      restaurant_id: rid,
      tab_id:        body.tabId,
      device_id:     body.deviceId,
      customer_name: body.customerName ?? '',
      table_id:      body.tableId ?? null,
      joined_at:     new Date().toISOString(),
    };
    if (personalPin) upsertRow.personal_pin = personalPin;

    const { error } = await sb.from('tab_devices').upsert(
      upsertRow,
      { onConflict: 'tab_id,device_id' },
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const sb  = getServerClient();
    const url = new URL(req.url);
    const deviceId = url.searchParams.get('deviceId');
    const tabId    = url.searchParams.get('tabId');

    if (!deviceId) return NextResponse.json({ error: 'deviceId is required' }, { status: 400 });

    let deleteError: { message: string } | null = null;
    if (tabId) {
      const res = await sb.from('tab_devices').delete()
        .eq('device_id', deviceId).eq('tab_id', tabId);
      deleteError = res.error;
    } else {
      const res = await sb.from('tab_devices').delete()
        .eq('device_id', deviceId);
      deleteError = res.error;
    }

    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}
