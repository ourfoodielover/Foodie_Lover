// GET    /api/staff/[id]  — fetch single staff member (includes PIN for login verification)
// PATCH  /api/staff/[id]
// DELETE /api/staff/[id]
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
type Ctx = { params: Promise<{ id: string }> };

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err) return String((err as { message: unknown }).message);
  return String(err);
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const sb = getServerClient();
    const { data, error } = await sb
      .from('staff')
      .select('id, name, username, pin, role, active')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const r = data as Record<string, unknown>;
    return NextResponse.json({ id: r.id, name: r.name, username: r.username, pin: r.pin, role: r.role, active: r.active });
  } catch (err) {
    console.error('[GET /api/staff/[id]] unexpected error:', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const sb   = getServerClient();
    const body = await req.json() as Record<string, unknown>;
    const updates: Record<string, unknown> = {};
    if (body.pin    !== undefined) updates.pin    = body.pin;
    if (body.active !== undefined) updates.active = body.active;
    if (body.name   !== undefined) updates.name   = body.name;
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }
    const { error } = await sb.from('staff').update(updates).eq('id', id);
    if (error) {
      console.error('[PATCH /api/staff/[id]] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[PATCH /api/staff/[id]] unexpected error:', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const sb = getServerClient();
    const { error } = await sb.from('staff').delete().eq('id', id);
    if (error) {
      console.error('[DELETE /api/staff/[id]] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/staff/[id]] unexpected error:', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}
