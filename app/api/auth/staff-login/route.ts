// POST /api/auth/staff-login
//
// Remediation of audit finding C3: Waiter and Delivery login previously
// fetched the FULL staff record — including the plaintext `pin` column —
// via GET /api/staff/[id], and compared the PIN in the browser. The real PIN
// was sent over the network on every login attempt, matched or not, and to
// anyone who called that unauthenticated GET directly for any staff id.
//
// This route replaces that flow: the server looks up the staff member by
// username + role, compares the PIN server-side, and returns only a
// yes/no plus the non-secret fields the UI needs (id, name, username, role).
// The PIN never leaves the database. On success it also issues the same
// signed session cookie /api/auth/verify-pin issues for the shared-PIN roles,
// scoped to this specific staffId.
//
// Body: { username: string, role: 'waiter' | 'delivery', pin: string }
// Returns: { ok: true, staff: {id,name,username,role} } | { ok: false, error }
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { issueSession } from '@/lib/session-server';
import { verifyPin, isHashedPin, hashPin } from '@/lib/pin-hash';

export const dynamic = 'force-dynamic';

const VALID_ROLES = ['waiter', 'delivery'] as const;
type Role = typeof VALID_ROLES[number];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { username?: string; role?: string; pin?: string; restaurantId?: string };
    const username = (body.username ?? '').trim();
    const pin      = (body.pin ?? '').trim();
    const role     = body.role;
    const rid      = body.restaurantId ?? process.env.NEXT_PUBLIC_RESTAURANT_ID ?? 'rest_default';

    if (!role || !VALID_ROLES.includes(role as Role)) {
      return NextResponse.json({ ok: false, error: 'Invalid role' }, { status: 400 });
    }
    if (!username) {
      return NextResponse.json({ ok: false, error: 'Username is required' }, { status: 400 });
    }
    if (!pin) {
      return NextResponse.json({ ok: false, error: 'PIN is required' }, { status: 400 });
    }

    const sb = getServerClient();
    // Case-insensitive username match, scoped to this role — mirrors the prior
    // client-side lookup's own matching semantics so login behavior is unchanged.
    const { data, error } = await sb
      .from('staff')
      .select('id, name, username, pin, role, active')
      .eq('restaurant_id', rid)
      .eq('role', role)
      .ilike('username', username)
      .maybeSingle();

    if (error) {
      console.error('[POST /api/auth/staff-login] Supabase error:', error.message);
      return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
    }

    // Deliberately identical error for "no such user" and "wrong PIN" — do not
    // let a caller enumerate valid usernames by comparing responses.
    const genericFail = () =>
      NextResponse.json({ ok: false, error: 'Invalid username or PIN' }, { status: 401 });

    if (!data || !data.active) return genericFail();
    if (!verifyPin(pin, String(data.pin))) return genericFail();

    // Remediation (C3): transparently upgrade a legacy plaintext PIN to a
    // salted hash now that we know it's correct.
    if (!isHashedPin(String(data.pin))) {
      await sb.from('staff').update({ pin: hashPin(pin) }).eq('id', data.id as string);
    }

    const res = NextResponse.json({
      ok: true,
      staff: { id: data.id, name: data.name, username: data.username, role: data.role },
    });
    issueSession(res, role as Role, rid, data.id as string);
    return res;
  } catch (err) {
    console.error('[POST /api/auth/staff-login] unexpected error:', err);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}
