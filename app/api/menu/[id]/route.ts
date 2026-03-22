// PATCH  /api/menu/[id]
// DELETE /api/menu/[id]
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const sb   = getServerClient();
    const body = await req.json();
    const updates: Record<string, unknown> = {};
    if (body.name      !== undefined) updates.name        = body.name;
    if (body.category  !== undefined) updates.category    = body.category;
    if (body.price     !== undefined) updates.price       = body.price;
    if (body.desc      !== undefined) updates.description = body.desc;
    if (body.badge     !== undefined) updates.badge       = body.badge;
    if (body.img       !== undefined) updates.img_url     = body.img;
    if (body.available !== undefined) updates.available   = body.available;
    const { error } = await sb.from('menu_items').update(updates).eq('id', id);
    if (error) {
      console.error('[PATCH /api/menu/[id]] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[PATCH /api/menu/[id]] unexpected error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const sb = getServerClient();
    const { error } = await sb.from('menu_items').delete().eq('id', id);
    if (error) {
      console.error('[DELETE /api/menu/[id]] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[DELETE /api/menu/[id]] unexpected error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
