// GET    /api/staff/[id]  — fetch single staff member (never returns pin — C3 remediation)
// PATCH  /api/staff/[id]
// DELETE /api/staff/[id]
//
// Remediation (audit findings C1 + C3): this route used to return the
// plaintext `pin` column to any caller with no authentication at all — it was
// the actual mechanism the Waiter/Delivery login pages used to fetch a PIN to
// compare in the browser. Login no longer uses this route (see
// /api/auth/staff-login); this route now (a) never includes `pin` in any
// response, full stop, and (b) requires an authenticated Admin session, since
// staff-record management is an Admin Dashboard–only feature in the current UI
// (app/admin/page.tsx's listStaff/addStaff/patchStaff/removeStaff call sites).
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { requireRole } from '@/lib/session-server';
import { hashPin } from '@/lib/pin-hash';

export const dynamic = 'force-dynamic';
type Ctx = { params: Promise<{ id: string }> };

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err) return String((err as { message: unknown }).message);
  return String(err);
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const auth = requireRole(req, ['admin']);
  if (!auth.ok) return auth.response;
  try {
    const { id } = await ctx.params;
    const sb = getServerClient();
    const { data, error } = await sb
      .from('staff')
      .select('id, name, username, role, active')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(data);
  } catch (err) {
    console.error('[GET /api/staff/[id]] unexpected error:', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = requireRole(req, ['admin']);
  if (!auth.ok) return auth.response;
  try {
    const { id } = await ctx.params;
    const sb   = getServerClient();
    const body = await req.json() as Record<string, unknown>;
    const updates: Record<string, unknown> = {};
    if (body.pin    !== undefined) updates.pin    = hashPin(String(body.pin)); // C3: never store a new PIN in plaintext
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

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const auth = requireRole(req, ['admin']);
  if (!auth.ok) return auth.response;
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
