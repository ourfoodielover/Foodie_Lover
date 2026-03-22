// GET  /api/settings?restaurantId=   — fetch all settings (or ?key=xxx for single)
// PATCH /api/settings                 — upsert one or many key/value pairs
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err)
    return String((err as { message: unknown }).message);
  return String(err);
}

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const sb  = getServerClient();
    const url = new URL(req.url);
    const rid = url.searchParams.get('restaurantId') ?? 'rest_default';
    const key = url.searchParams.get('key');

    let query = sb.from('restaurant_settings')
      .select('key, value')
      .eq('restaurant_id', rid);
    if (key) query = query.eq('key', key);

    const { data, error } = await query;
    if (error) throw error;

    if (key) {
      // Return single value for ?key= queries
      const row = (data ?? [])[0];
      return NextResponse.json({ value: row?.value ?? null });
    }
    // Return all settings as { key: value } map
    const map: Record<string, string> = {};
    (data ?? []).forEach(r => { map[r.key] = r.value; });
    return NextResponse.json(map);
  } catch (err) {
    console.error('[GET /api/settings]', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}

// ── PATCH ─────────────────────────────────────────────────────────────────────
// Body: { restaurantId?, updates: { [key]: value } }
export async function PATCH(req: NextRequest) {
  try {
    const sb   = getServerClient();
    const body = await req.json() as Record<string, unknown>;
    const rid  = (body.restaurantId as string | undefined) ?? 'rest_default';
    const updates = body.updates as Record<string, string> | undefined;

    if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'updates object is required' }, { status: 400 });
    }

    // Upsert each key individually
    for (const [key, value] of Object.entries(updates)) {
      const { error } = await sb
        .from('restaurant_settings')
        .upsert(
          { restaurant_id: rid, key, value: String(value), updated_at: new Date().toISOString() },
          { onConflict: 'restaurant_id,key' },
        );
      if (error) throw error;
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[PATCH /api/settings]', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}
