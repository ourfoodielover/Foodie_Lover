import { NextRequest, NextResponse } from 'next/server';
import { getServerClient, newId } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

function normalizeEmail(e: string) { return e.trim().toLowerCase(); }
function normalizePhone(p: string) { return p.trim().replace(/\s+/g, ''); }

function pickRewardByWeight(rewards: { id: string; weight: number }[]) {
  const totalWeight = rewards.reduce((s, r) => s + r.weight, 0);
  let rand = Math.random() * totalWeight;
  for (const r of rewards) {
    rand -= r.weight;
    if (rand <= 0) return r;
  }
  return rewards[rewards.length - 1];
}

function generateCouponCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return 'RWD-' + Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

type SpinReward = {
  id: string;
  label: string;
  reward_type: string;
  reward_value: number;
  free_item_id: string | null;
  weight: number;
  min_next_order: number;
  expires_days: number;
};

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    orderId: string;
    customerEmail: string;
    customerPhone?: string;
    restaurantId?: string;
  };
  const { orderId, customerEmail, customerPhone } = body;
  const restaurantId = body.restaurantId ?? process.env.NEXT_PUBLIC_RESTAURANT_ID ?? 'rest_default';

  if (!orderId || !customerEmail) {
    return NextResponse.json({ error: 'orderId and customerEmail required' }, { status: 400 });
  }

  const sb = getServerClient();
  const normEmail = normalizeEmail(customerEmail);
  const normPhone = customerPhone ? normalizePhone(customerPhone) : '';

  // Fetch order
  const { data: order } = await sb
    .from('orders')
    .select('id, type, status, total, customer_email, phone')
    .eq('id', orderId)
    .single();
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  // Verify email matches
  if (order.customer_email && normalizeEmail(order.customer_email as string) !== normEmail) {
    return NextResponse.json({ error: 'Email does not match order' }, { status: 403 });
  }

  // Fetch config
  const { data: config } = await sb
    .from('spin_config')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .single();
  if (!config?.enabled) return NextResponse.json({ error: 'Spin & Win not active' }, { status: 400 });

  // Check completed state
  if (!['completed', 'delivered'].includes(order.status as string)) {
    return NextResponse.json({ error: 'Order not completed' }, { status: 400 });
  }

  // Check if already spun — return existing result idempotently
  const { data: existingSpin } = await sb
    .from('spin_results')
    .select('*, reward_coupons(*), spin_rewards(label, reward_type, reward_value)')
    .eq('order_id', orderId)
    .maybeSingle();
  if (existingSpin) {
    return NextResponse.json({ alreadySpun: true, ...formatSpinResult(existingSpin as Record<string, unknown>) });
  }

  // Load active rewards
  const { data: rewards } = await sb
    .from('spin_rewards')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('active', true)
    .order('sort_order');
  if (!rewards?.length) return NextResponse.json({ error: 'No rewards configured' }, { status: 400 });

  // Server-side weighted selection
  const chosen = pickRewardByWeight(rewards as SpinReward[]) as SpinReward;
  const isWinner = chosen.reward_type !== 'no_reward';

  // Insert spin result (UNIQUE on order_id prevents duplicate spins)
  const spinId = newId('SR');
  const { error: spinErr } = await sb.from('spin_results').insert({
    id: spinId,
    order_id: orderId,
    reward_id: chosen.id,
    is_winner: isWinner,
    customer_email: normEmail,
    customer_phone: normPhone,
  });
  if (spinErr) {
    // UNIQUE violation = already spun (race condition handled)
    const { data: existingAfterRace } = await sb
      .from('spin_results')
      .select('*, reward_coupons(*), spin_rewards(label, reward_type, reward_value)')
      .eq('order_id', orderId)
      .single();
    return NextResponse.json({ alreadySpun: true, ...formatSpinResult(existingAfterRace as Record<string, unknown>) });
  }

  // Issue coupon if winner
  let couponData: { couponId: string; couponCode: string; expiresAt: string } | null = null;
  if (isWinner) {
    const couponId = newId('CPN');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + chosen.expires_days);
    let code = generateCouponCode();
    // Retry if code collision (extremely unlikely)
    for (let i = 0; i < 5; i++) {
      const { error: cErr } = await sb.from('reward_coupons').insert({
        id: couponId,
        coupon_code: code,
        spin_id: spinId,
        source_order_id: orderId,
        reward_id: chosen.id,
        reward_type: chosen.reward_type,
        reward_value: chosen.reward_value,
        free_item_id: chosen.free_item_id,
        label: chosen.label,
        customer_email: normEmail,
        customer_phone: normPhone,
        issued_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        min_next_order: chosen.min_next_order,
        status: 'active',
      });
      if (!cErr) { couponData = { couponId, couponCode: code, expiresAt: expiresAt.toISOString() }; break; }
      code = generateCouponCode(); // retry with new code
    }
  }

  return NextResponse.json({
    spinId,
    rewardId: chosen.id,
    rewardLabel: chosen.label,
    rewardType: chosen.reward_type,
    rewardValue: chosen.reward_value,
    isWinner,
    ...couponData,
  });
}

function formatSpinResult(spin: Record<string, unknown> | null) {
  if (!spin) return {};
  const reward = spin.spin_rewards as Record<string, unknown> | null;
  const couponRaw = spin.reward_coupons;
  const coupon = Array.isArray(couponRaw) ? (couponRaw[0] as Record<string, unknown> | undefined) : couponRaw as Record<string, unknown> | null;
  return {
    spinId: spin.id,
    rewardLabel: reward?.label,
    rewardType: reward?.reward_type,
    rewardValue: reward?.reward_value,
    isWinner: spin.is_winner,
    couponCode: coupon?.coupon_code,
    couponId: coupon?.id,
    expiresAt: coupon?.expires_at,
  };
}
