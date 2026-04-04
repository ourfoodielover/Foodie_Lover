// POST /api/tabs/:id/verify-pin   { pin: "1234" }
// Verifies the session PIN without exposing it — returns { valid: boolean }.
// Called by devices joining an existing table session.
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const sb = getServerClient();
    let body: { pin?: string };
    try { body = await req.json() as { pin?: string }; }
    catch { return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 }); }

    if (!body.pin) return NextResponse.json({ error: 'pin is required' }, { status: 400 });

    const { data, error } = await sb
      .from('customer_tabs')
      .select('pin')
      .eq('id', id)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data)  return NextResponse.json({ error: 'Tab not found' },  { status: 404 });

    const row       = data as Record<string, unknown>;
    const storedPin = row.pin as string | null;

    // If no PIN was set for this tab, allow any joiner (no PIN protection)
    if (!storedPin) return NextResponse.json({ valid: true });

    return NextResponse.json({ valid: storedPin === body.pin.trim() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
