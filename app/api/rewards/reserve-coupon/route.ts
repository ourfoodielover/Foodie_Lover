import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json() as { couponId: string; orderId: string };
  const { couponId, orderId } = body;
  if (!couponId || !orderId) return NextResponse.json({ error: 'couponId and orderId required' }, { status: 400 });

  const sb = getServerClient();
  const { data, error } = await sb
    .from('reward_coupons')
    .update({ status: 'reserved', reserved_order_id: orderId, reserved_at: new Date().toISOString() })
    .eq('id', couponId)
    .in('status', ['active', 'reserved'])  // allow re-reserve same order
    .select('id')
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: 'Coupon could not be reserved — may already be in use' }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
