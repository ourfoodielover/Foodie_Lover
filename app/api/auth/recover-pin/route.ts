// POST /api/auth/recover-pin
// Server-side forgot-PIN recovery via security question.
// PINs and security answers are NEVER sent to the browser.
// Body: { answer: string, newPin: string }
// Returns: { ok: true } on success, { ok: false, error: string } on failure
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { answer?: string; newPin?: string };
    const { answer, newPin } = body;

    if (!answer || typeof answer !== 'string' || !answer.trim()) {
      return NextResponse.json({ ok: false, error: 'Answer is required' }, { status: 400 });
    }
    if (!newPin || typeof newPin !== 'string' || newPin.trim().length < 4) {
      return NextResponse.json({ ok: false, error: 'New PIN must be at least 4 digits' }, { status: 400 });
    }

    const sb  = getServerClient();
    const rid = process.env.NEXT_PUBLIC_RESTAURANT_ID ?? 'rest_default';

    // Fetch stored security answer (server-side only — never exposed to client)
    const { data } = await sb
      .from('restaurant_settings')
      .select('key, value')
      .eq('restaurant_id', rid)
      .in('key', ['security_answer'])
      .maybeSingle();

    const storedAnswer = data?.value ?? null;

    if (!storedAnswer) {
      return NextResponse.json(
        { ok: false, error: 'No security question set up. Contact your system administrator.' },
        { status: 401 },
      );
    }

    if (answer.toLowerCase().trim() !== storedAnswer.toLowerCase().trim()) {
      return NextResponse.json({ ok: false, error: 'Incorrect answer' }, { status: 401 });
    }

    // Answer is correct — update the admin PIN
    const { error: updateErr } = await sb
      .from('restaurant_settings')
      .update({ value: newPin.trim(), updated_at: new Date().toISOString() })
      .eq('restaurant_id', rid)
      .eq('key', 'admin_pin');

    if (updateErr) throw updateErr;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[POST /api/auth/recover-pin]', err);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}
