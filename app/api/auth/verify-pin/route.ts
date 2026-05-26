// POST /api/auth/verify-pin
// Server-side PIN verification — PINs are NEVER sent to the browser.
// Body: { role: 'admin' | 'kitchen' | 'manager', pin: string }
// Returns: { ok: true } on success, { ok: false, error: string } on failure
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

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

    if (pin.trim() !== storedPin) {
      return NextResponse.json({ ok: false, error: 'Incorrect PIN' }, { status: 401 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[POST /api/auth/verify-pin]', err);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}
