// PATCH /api/shifts/[id] — close shift
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const sb   = getServerClient();
    const body = await req.json() as Record<string, unknown>;
    const { error } = await sb.from('shift_logs').update({
      shift_end:       new Date().toISOString(),
      orders_served:   Number(body.ordersServed)   || 0,
      revenue_handled: Number(body.revenueHandled) || 0,
    }).eq('id', id);
    if (error) {
      console.error('[PATCH /api/shifts/[id]] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[PATCH /api/shifts/[id]] unexpected error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
