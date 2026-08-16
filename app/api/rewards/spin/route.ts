import { NextRequest, NextResponse } from 'next/server';
import { getServerClient, newId } from '@/lib/supabase-server';
import { sendRewardEmail } from '@/lib/email-server';

export const dynamic = 'force-dynamic';

function normalizeEmail(e: string) { return e.trim().toLowerCase(); }
function normalizePhone(p: string) { return p.trim().replace(/\D/g, ''); }

function pickRewardByWeight(rewards: Array<{ id: string; weight: number }>) {
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
  return 'FL-' + Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
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
    orderId?: string;
    tabId?: string;
    customerEmail: string;
    customerPhone?: string;
    restaurantId?: string;
  };
  const { orderId, tabId, customerEmail, customerPhone } = body;
  const restaurantId = body.restaurantId ?? process.env.NEXT_PUBLIC_RESTAURANT_ID ?? 'rest_default';

  if (!customerEmail) {
    return NextResponse.json({ error: 'customerEmail required' }, { status: 400 });
  }
  if (!orderId && !tabId) {
    return NextResponse.json({ error: 'orderId or tabId required' }, { status: 400 });
  }

  const sb = getServerClient();
  const normEmail = normalizeEmail(customerEmail);
  const normPhone = customerPhone ? normalizePhone(customerPhone) : '';

  // ── Fetch config ────────────────────────────────────────────────────────
  const { data: config } = await sb
    .from('spin_config')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .single();
  if (!config?.enabled) {
    return NextResponse.json({ error: 'Spin & Win not active' }, { status: 400 });
  }

  // ── Get qualifying entity (tab or order) ────────────────────────────────
  let qualifyingTotal = 0;

  if (tabId) {
    const { data: tab } = await sb
      .from('customer_tabs')
      .select('total, status, customer_email, phone')
      .eq('id', tabId)
      .single();
    if (!tab || tab.status !== 'closed') {
      return NextResponse.json({ error: 'Tab not completed' }, { status: 400 });
    }
    qualifyingTotal = Number(tab.total ?? 0);
  } else {
    const { data: order } = await sb
      .from('orders')
      .select('total, status, customer_email, phone, type')
      .eq('id', orderId!)
      .single();
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    if (!['completed', 'delivered'].includes(order.status as string)) {
      return NextResponse.json({ error: 'Order not completed' }, { status: 400 });
    }
    qualifyingTotal = Number(order.total ?? 0);
  }

  if (qualifyingTotal < Number(config.min_order_amount)) {
    return NextResponse.json({ error: `Minimum qualifying amount is ₹${config.min_order_amount}` }, { status: 400 });
  }

  // ── Check / return existing spin result (idempotent) ────────────────────
  const existingQuery = tabId
    ? sb.from('spin_results').select('*, reward_coupons(*), spin_rewards(label, reward_type, reward_value)').eq('tab_id', tabId).maybeSingle()
    : sb.from('spin_results').select('*, reward_coupons(*), spin_rewards(label, reward_type, reward_value)').eq('order_id', orderId!).maybeSingle();
  const { data: existingSpin } = await existingQuery;
  if (existingSpin) {
    return NextResponse.json({ alreadySpun: true, ...formatSpinResult(existingSpin as Record<string, unknown>) });
  }

  // ── Load active rewards ─────────────────────────────────────────────────
  const { data: rewards } = await sb
    .from('spin_rewards')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('active', true)
    .order('sort_order');
  if (!rewards?.length) {
    return NextResponse.json({ error: 'No rewards configured' }, { status: 400 });
  }

  // ── Server-side weighted selection ─────────────────────────────────────
  const chosen = pickRewardByWeight(rewards as SpinReward[]) as SpinReward;
  const isWinner = chosen.reward_type !== 'no_reward';

  // ── Insert spin result (UNIQUE constraints prevent duplicate spins) ────
  const spinId = newId('SR');
  const insertData: Record<string, unknown> = {
    id: spinId,
    reward_id: chosen.id,
    is_winner: isWinner,
    customer_email: normEmail,
    customer_phone: normPhone,
  };
  if (tabId) insertData.tab_id = tabId;
  else insertData.order_id = orderId;

  const { error: spinErr } = await sb.from('spin_results').insert(insertData);
  if (spinErr) {
    // UNIQUE violation = race condition, return existing
    const raceQuery = tabId
      ? sb.from('spin_results').select('*, reward_coupons(*), spin_rewards(label, reward_type, reward_value)').eq('tab_id', tabId).single()
      : sb.from('spin_results').select('*, reward_coupons(*), spin_rewards(label, reward_type, reward_value)').eq('order_id', orderId!).single();
    const { data: raceResult } = await raceQuery;
    return NextResponse.json({ alreadySpun: true, ...formatSpinResult(raceResult as Record<string, unknown>) });
  }

  // ── Issue coupon if winner ──────────────────────────────────────────────
  let couponData: { couponId: string; couponCode: string; expiresAt: string } | null = null;
  if (isWinner) {
    const couponId = newId('CPN');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + chosen.expires_days);
    const expiresAtStr = expiresAt.toISOString();

    let code = generateCouponCode();
    for (let i = 0; i < 10; i++) {
      const insertCoupon: Record<string, unknown> = {
        id: couponId,
        coupon_code: code,
        spin_id: spinId,
        reward_id: chosen.id,
        reward_type: chosen.reward_type,
        reward_value: chosen.reward_value,
        free_item_id: chosen.free_item_id ?? null,
        label: chosen.label,
        customer_email: normEmail,
        customer_phone: normPhone,
        issued_at: new Date().toISOString(),
        expires_at: expiresAtStr,
        min_next_order: chosen.min_next_order,
        status: 'active',
      };
      // Set source fields: tab-based coupons use source_tab_id, order-based use source_order_id
      if (tabId) {
        insertCoupon.source_tab_id = tabId;
      } else {
        insertCoupon.source_order_id = orderId;
      }

      const { error: cErr } = await sb.from('reward_coupons').insert(insertCoupon);
      if (!cErr) {
        couponData = { couponId, couponCode: code, expiresAt: expiresAtStr };
        break;
      }
      if (cErr.code !== '23505') break; // not a unique violation, stop retrying
      code = generateCouponCode();
    }

    // ── Send reward email (fire and forget, idempotent via dedup_key) ───
    if (couponData) {
      const emailRef = tabId ?? orderId!;
      const eventType = tabId ? `reward_tab_${tabId}` : `reward_order_${orderId}`;
      sendRewardEmail({
        emailRef,
        eventType,
        recipientEmail: normEmail,
        rewardLabel: chosen.label,
        rewardType: chosen.reward_type,
        couponCode: couponData.couponCode,
        expiresAt: couponData.expiresAt,
        minNextOrder: Number(chosen.min_next_order),
      }).catch(console.error);
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
