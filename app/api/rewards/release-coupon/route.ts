import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { requireRole } from '@/lib/session-server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const auth = requireRole(req, ['manager', 'admin']);
  if (!auth.ok) return auth.response;
  const body = await req.json() as { couponId: string; orderId: string };
  const { couponId, orderId } = body;
  if (!couponId || !orderId) return NextResponse.json({ error: 'couponId and orderId required' }, { status: 400 });

  const sb = getServerClient();
  await sb
    .from('reward_coupons')
    .update({ status: 'active', reserved_order_id: null, reserved_at: null })
    .eq('id', couponId)
    .eq('reserved_order_id', orderId)
    .eq('status', 'reserved');

  return NextResponse.json({ ok: true });
}
