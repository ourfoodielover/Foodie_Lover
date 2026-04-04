// GET  /api/waiter-calls?tabId=          — get last call time for cooldown calculation
// GET  /api/waiter-calls?restaurantId=   — get all recent UNACKNOWLEDGED calls (last 2 hrs)
// POST /api/waiter-calls                 — record a new waiter call + broadcast to waiter portal
// PATCH /api/waiter-calls?id=            — acknowledge a call (sets acknowledged=true, preserves record)
// DELETE /api/waiter-calls?id=           — hard-delete a call (legacy / admin use)
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient, newId, broadcast } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export async function GET(req: NextRequest) {
  try {
    const sb    = getServerClient();
    const url   = new URL(req.url);
    const tabId = url.searchParams.get('tabId');
    const rid   = url.searchParams.get('restaurantId') ?? 'rest_default';

    if (tabId) {
      // By tab: return the last call timestamp for cooldown calculation (any call, including acknowledged)
      const { data, error } = await sb
        .from('waiter_calls')
        .select('called_at')
        .eq('tab_id', tabId)
        .order('called_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      const row = data as Record<string, unknown> | null;
      return NextResponse.json(row ? { calledAt: row.called_at } : null);
    } else {
      // By restaurant: return only UNACKNOWLEDGED calls from the last 2 hours.
      // The waiter portal shows these as pending alerts; acknowledged calls are dismissed.
      const since = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

      // Try with acknowledged filter first (requires migration_008/009 to have been run).
      // If the column doesn't exist yet (error code 42703), fall back to returning all
      // recent calls so the waiter page loads even before the migration is applied.
      let data: Record<string, unknown>[] | null = null;
      let error: { message: string; code?: string } | null = null;

      ({ data, error } = await sb
        .from('waiter_calls')
        .select('id, tab_id, table_id, customer_name, called_at')
        .eq('restaurant_id', rid)
        .eq('acknowledged', false)
        .gte('called_at', since)
        .order('called_at', { ascending: false })
        .limit(50) as { data: Record<string, unknown>[] | null; error: { message: string; code?: string } | null });

      // 42703 = undefined_column — migration not yet run; fall back gracefully
      if (error && error.code === '42703') {
        console.warn('[GET /api/waiter-calls] acknowledged column missing — run migration_008/009; returning all recent calls as fallback');
        ({ data, error } = await sb
          .from('waiter_calls')
          .select('id, tab_id, table_id, customer_name, called_at')
          .eq('restaurant_id', rid)
          .gte('called_at', since)
          .order('called_at', { ascending: false })
          .limit(50) as { data: Record<string, unknown>[] | null; error: { message: string; code?: string } | null });
      }

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(
        (data ?? []).map((r: Record<string, unknown>) => ({
          id:           r.id,
          tabId:        r.tab_id,
          tableId:      r.table_id  ?? null,
          customerName: r.customer_name ?? null,
          at:           r.called_at,
        })),
      );
    }
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

    if (!body.tabId) return NextResponse.json({ error: 'tabId is required' }, { status: 400 });

    const rid = (body.restaurantId as string | undefined) ?? 'rest_default';
    const calledAt = new Date().toISOString();

    const { error } = await sb.from('waiter_calls').insert({
      id:            newId('WC'),
      restaurant_id: rid,
      tab_id:        body.tabId,
      table_id:      body.tableId      ?? null,
      customer_name: body.customerName ?? null,
      called_at:     calledAt,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Broadcast to waiter portal so the alert appears instantly
    await broadcast(rid, 'waiter_called', {
      tabId:        body.tabId,
      tableId:      body.tableId      ?? null,
      customerName: body.customerName ?? null,
      at:           calledAt,
    });

    return NextResponse.json({ ok: true, calledAt }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}

// ── PATCH ─────────────────────────────────────────────────────────────────────
// Acknowledges a waiter call — sets acknowledged=true, records who and when.
// Preferred over DELETE because it preserves the audit trail in waiter_calls.
export async function PATCH(req: NextRequest) {
  try {
    const sb  = getServerClient();
    const url = new URL(req.url);
    const id  = url.searchParams.get('id');
    const rid = url.searchParams.get('restaurantId') ?? 'rest_default';

    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    let body: Record<string, unknown> = {};
    try { body = await req.json() as Record<string, unknown>; } catch { /* body is optional */ }

    const { error } = await sb
      .from('waiter_calls')
      .update({
        acknowledged:    true,
        acknowledged_by: (body.acknowledgedBy as string | undefined) ?? null,
        acknowledged_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('restaurant_id', rid);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Broadcast so other waiter devices dismiss the same alert immediately
    await broadcast(rid, 'waiter_call_acknowledged', { callId: id });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}

// ── DELETE ────────────────────────────────────────────────────────────────────
// Hard-deletes a waiter call record. Kept for backward-compatibility but PATCH
// is preferred because it preserves audit history.
export async function DELETE(req: NextRequest) {
  try {
    const sb  = getServerClient();
    const url = new URL(req.url);
    const id  = url.searchParams.get('id');
    const rid = url.searchParams.get('restaurantId') ?? 'rest_default';

    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const { error } = await sb
      .from('waiter_calls')
      .delete()
      .eq('id', id)
      .eq('restaurant_id', rid);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}
