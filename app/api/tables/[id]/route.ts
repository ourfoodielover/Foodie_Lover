// PATCH  /api/tables/[id]  — update table name / capacity / status
// DELETE /api/tables/[id]  — delete table (blocked if active sessions exist)
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const sb = getServerClient();

    // Safety: refuse if any open session exists for this table
    const { data: activeTab } = await sb
      .from('customer_tabs')
      .select('id')
      .eq('table_id', id)
      .in('status', ['open', 'awaiting_payment'])
      .maybeSingle();

    if (activeTab) {
      return NextResponse.json(
        { error: 'Cannot delete a table that has an active session. Close the tab first.' },
        { status: 409 },
      );
    }

    const { error } = await sb.from('tables').delete().eq('id', id);
    if (error) {
      console.error('[DELETE /api/tables/[id]] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[DELETE /api/tables/[id]] unexpected error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const sb   = getServerClient();
    const body = await req.json() as Record<string, unknown>;
    const updates: Record<string, unknown> = {};
    if (body.status   !== undefined) updates.status   = body.status;
    if (body.name     !== undefined) updates.name     = body.name;
    if (body.capacity !== undefined) updates.capacity = body.capacity;
    const { error } = await sb.from('tables').update(updates).eq('id', id);
    if (error) {
      console.error('[PATCH /api/tables/[id]] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[PATCH /api/tables/[id]] unexpected error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
