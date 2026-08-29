// GET  /api/settings?restaurantId=   — fetch all settings (or ?key=xxx for single)
// PATCH /api/settings                 — upsert one or many key/value pairs
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { requireRole } from '@/lib/session-server';

export const dynamic = 'force-dynamic';

// Keys that must NEVER be sent to the browser — PIN values and security answers
// are verified server-side only via /api/auth/verify-pin and /api/auth/recover-pin.
const SECRET_KEYS = new Set([
  'admin_pin', 'kitchen_pin', 'manager_pin', 'security_answer',
]);

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

    // Block direct fetches of secret keys
    if (key && SECRET_KEYS.has(key)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

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
    // Return all settings as { key: value } map, excluding secret keys
    const map: Record<string, string> = {};
    (data ?? []).forEach(r => {
      if (!SECRET_KEYS.has(r.key)) map[r.key] = r.value;
    });
    return NextResponse.json(map);
  } catch (err) {
    console.error('[GET /api/settings]', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}

// ── PATCH ─────────────────────────────────────────────────────────────────────
// Body: { restaurantId?, updates: { [key]: value } }
//
// Remediation (audit finding — critical): this handler used to have NO auth
// check at all and applied `updates` verbatim, so any unauthenticated caller
// could PATCH admin_pin/kitchen_pin/manager_pin/security_answer directly and
// take over the whole PIN system, bypassing /api/auth/change-pin's
// current-PIN verification entirely. Fixed by (a) requiring an admin
// session, and (b) hard-rejecting any SECRET_KEYS key from `updates` — PIN
// changes must always go through /api/auth/change-pin, never this
// general-purpose settings endpoint.
export async function PATCH(req: NextRequest) {
  const auth = requireRole(req, ['admin']);
  if (!auth.ok) return auth.response;
  try {
    const sb   = getServerClient();
    const body = await req.json() as Record<string, unknown>;
    const rid  = (body.restaurantId as string | undefined) ?? 'rest_default';
    const updates = body.updates as Record<string, string> | undefined;

    if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'updates object is required' }, { status: 400 });
    }
    const blockedKeys = Object.keys(updates).filter(k => SECRET_KEYS.has(k));
    if (blockedKeys.length > 0) {
      return NextResponse.json(
        { error: `PIN/security fields cannot be changed here — use /api/auth/change-pin. Blocked keys: ${blockedKeys.join(', ')}` },
        { status: 403 },
      );
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
