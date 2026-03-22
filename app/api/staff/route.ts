// GET  /api/staff
// POST /api/staff
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient, newId } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err) return String((err as { message: unknown }).message);
  return String(err);
}

export async function GET(req: NextRequest) {
  try {
    const sb   = getServerClient();
    const url  = new URL(req.url);
    const rid  = url.searchParams.get('restaurantId') ?? 'rest_default';
    const role = url.searchParams.get('role');
    let query  = sb.from('staff').select('*').eq('restaurant_id', rid);
    if (role) query = query.eq('role', role);
    const { data, error } = await query.order('name');
    if (error) {
      console.error('[GET /api/staff] Supabase error:', error.message, '| code:', error.code);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json((data ?? []).map(r => ({
      id:       r.id,
      name:     r.name,
      username: r.username,
      role:     r.role,
      active:   r.active,
    })));
  } catch (err) {
    console.error('[GET /api/staff] unexpected error:', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // Guard: parse JSON body first with a clear 400 if body is malformed
  let body: Record<string, unknown>;
  try {
    body = await req.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 });
  }

  try {
    const sb  = getServerClient();
    const rid = (body.restaurantId as string | undefined) ?? 'rest_default';

    // Validate all required fields server-side (client may be bypassed)
    const name     = String(body.name     ?? '').trim();
    const username = String(body.username ?? '').trim();
    const pin      = String(body.pin      ?? '').trim();
    const role     = String(body.role     ?? '').trim();

    if (!name)     return NextResponse.json({ error: 'name is required'     }, { status: 400 });
    if (!username) return NextResponse.json({ error: 'username is required' }, { status: 400 });
    if (!pin)      return NextResponse.json({ error: 'pin is required'      }, { status: 400 });
    if (!role)     return NextResponse.json({ error: 'role is required'     }, { status: 400 });

    const VALID_ROLES = ['waiter', 'kitchen', 'delivery', 'manager', 'admin'];
    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json(
        { error: `role must be one of: ${VALID_ROLES.join(', ')}` },
        { status: 400 },
      );
    }

    // Ensure the restaurant row exists so the FK never fires (safe on repeat calls)
    await sb.from('restaurants')
      .upsert({ id: rid, name: 'Foodie Lover' }, { onConflict: 'id', ignoreDuplicates: true });

    // Check for duplicate username within this restaurant
    const { data: existing } = await sb.from('staff')
      .select('id').eq('restaurant_id', rid).eq('username', username).maybeSingle();
    if (existing) return NextResponse.json({ error: 'Username already exists' }, { status: 409 });

    const id = newId('STF');
    const { error } = await sb.from('staff').insert({
      id,
      restaurant_id: rid,
      name,
      username,
      pin,
      role,
      active: true,
    });
    if (error) {
      console.error('[POST /api/staff] Supabase error:', error.message);
      // Friendly message for FK violations (should be prevented by upsert above, but belt-and-suspenders)
      if (error.code === '23503') {
        return NextResponse.json({ error: 'Restaurant not found — run /api/init first' }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/staff] unexpected error:', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}
