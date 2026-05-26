// POST /api/auth/change-pin
// Server-side admin PIN change — verifies old PIN before updating.
// PINs are NEVER sent back to the browser; only success/failure returned.
// Body: { currentPin: string, newPin: string }
// Returns: { ok: true } on success, { ok: false, error: string } on failure
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { currentPin?: string; newPin?: string };
    const { currentPin, newPin } = body;

    if (!currentPin || typeof currentPin !== 'string' || !currentPin.trim()) {
      return NextResponse.json({ ok: false, error: 'Current PIN is required' }, { status: 400 });
    }
    if (!newPin || typeof newPin !== 'string' || newPin.trim().length < 4) {
      return NextResponse.json({ ok: false, error: 'New PIN must be at least 4 digits' }, { status: 400 });
    }

    const sb  = getServerClient();
    const rid = process.env.NEXT_PUBLIC_RESTAURANT_ID ?? 'rest_default';

    // Fetch stored admin PIN (server-side only)
    const { data } = await sb
      .from('restaurant_settings')
      .select('value')
      .eq('restaurant_id', rid)
      .eq('key', 'admin_pin')
      .maybeSingle();

    const storedPin = data?.value ?? null;

    if (!storedPin) {
      return NextResponse.json(
        { ok: false, error: 'Admin PIN not configured. Please contact your system administrator.' },
        { status: 401 },
      );
    }

    if (currentPin.trim() !== storedPin) {
      return NextResponse.json({ ok: false, error: 'Current PIN is incorrect' }, { status: 401 });
    }

    // Current PIN verified — update to new PIN
    const { error: updateErr } = await sb
      .from('restaurant_settings')
      .update({ value: newPin.trim(), updated_at: new Date().toISOString() })
      .eq('restaurant_id', rid)
      .eq('key', 'admin_pin');

    if (updateErr) throw updateErr;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[POST /api/auth/change-pin]', err);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}
