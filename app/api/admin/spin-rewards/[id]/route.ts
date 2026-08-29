import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { requireRole } from '@/lib/session-server';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = requireRole(req, ['admin']);
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  const body = await req.json() as Record<string, unknown>;
  const sb = getServerClient();
  const { error } = await sb.from('spin_rewards').update(body).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/admin/spin-rewards/[id]
 *
 * Safe delete with automatic archive fallback:
 *  - If the reward has any spin_results or reward_coupons referencing it
 *    → set archived=true, active=false (soft archive to preserve coupon validity)
 *  - If no history exists → permanently DELETE the row
 *
 * Returns: { ok: true, action: 'archived' | 'deleted' }
 */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  const auth = requireRole(req, ['admin']);
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  const sb = getServerClient();

  // Check for any referenced history
  const [{ count: spinCount }, { count: couponCount }] = await Promise.all([
    sb.from('spin_results').select('id', { count: 'exact', head: true }).eq('reward_id', id),
    sb.from('reward_coupons').select('id', { count: 'exact', head: true }).eq('reward_id', id),
  ]);

  const hasHistory = (spinCount ?? 0) > 0 || (couponCount ?? 0) > 0;

  if (hasHistory) {
    // Archive: keep row but hide from all queries & spin pool
    const { error } = await sb
      .from('spin_rewards')
      .update({ active: false, archived: true })
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, action: 'archived' });
  }

  // No history → safe to hard delete
  const { error } = await sb.from('spin_rewards').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, action: 'deleted' });
}
