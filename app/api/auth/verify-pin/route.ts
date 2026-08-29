// POST /api/auth/verify-pin
// Server-side PIN verification — PINs are NEVER sent to the browser.
// Body: { role: 'admin' | 'kitchen' | 'manager', pin: string }
// Returns: { ok: true } on success, { ok: false, error: string } on failure
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { issueSession } from '@/lib/session-server';
import { verifyPin, isHashedPin, hashPin } from '@/lib/pin-hash';

export const dynamic = 'force-dynamic';

const VALID_ROLES = ['admin', 'kitchen', 'manager'] as const;
type Role = typeof VALID_ROLES[number];

const PIN_SETTING_KEY: Record<Role, string> = {
  admin:   'admin_pin',
  kitchen: 'kitchen_pin',
  manager: 'manager_pin',
};

// Reads PIN from Supabase — never exposed to the browser response.
async function getStoredPin(role: Role): Promise<string | null> {
  try {
    const sb  = getServerClient();
    const rid = process.env.NEXT_PUBLIC_RESTAURANT_ID ?? 'rest_default';
    const key = PIN_SETTING_KEY[role];

    const { data } = await sb
      .from('restaurant_settings')
      .select('value')
      .eq('restaurant_id', rid)
      .eq('key', key)
      .maybeSingle();

    return data?.value ?? null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { role?: string; pin?: string };
    const { role, pin } = body;

    // Validate inputs
    if (!role || !VALID_ROLES.includes(role as Role)) {
      return NextResponse.json({ ok: false, error: 'Invalid role' }, { status: 400 });
    }
    if (!pin || typeof pin !== 'string' || pin.trim() === '') {
      return NextResponse.json({ ok: false, error: 'PIN is required' }, { status: 400 });
    }

    const storedPin = await getStoredPin(role as Role);

    if (!storedPin) {
      // PIN not configured in database — deny access
      return NextResponse.json(
        { ok: false, error: 'PIN not configured. Ask your admin to set it up.' },
        { status: 401 },
      );
    }

    if (!verifyPin(pin.trim(), storedPin)) {
      return NextResponse.json({ ok: false, error: 'Incorrect PIN' }, { status: 401 });
    }

    // Remediation (C3): transparently upgrade a legacy plaintext PIN to a
    // salted hash now that we know it's correct. No-op once already hashed.
    if (!isHashedPin(storedPin)) {
      const sb  = getServerClient();
      const rid = process.env.NEXT_PUBLIC_RESTAURANT_ID ?? 'rest_default';
      await sb.from('restaurant_settings')
        .update({ value: hashPin(pin.trim()), updated_at: new Date().toISOString() })
        .eq('restaurant_id', rid)
        .eq('key', PIN_SETTING_KEY[role as Role]);
    }

    // Remediation (C1): a correct PIN now also issues a real, server-verifiable
    // session cookie — previously the client fabricated its own localStorage
    // session with nothing behind it that the server could later check.
    const rid = process.env.NEXT_PUBLIC_RESTAURANT_ID ?? 'rest_default';
    const res = NextResponse.json({ ok: true });
    issueSession(res, role as Role, rid);
    return res;
  } catch (err) {
    console.error('[POST /api/auth/verify-pin]', err);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}
