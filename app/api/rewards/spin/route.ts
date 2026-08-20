import { NextRequest, NextResponse } from 'next/server';
import { getServerClient, newId } from '@/lib/supabase-server';
import { sendRewardEmail } from '@/lib/email-server';

export const dynamic = 'force-dynamic';

function normalizeEmail(e: string) { return e.trim().toLowerCase(); }
function normalizePhone(p: string) { return p.trim().replace(/\D/g, ''); }

type SpinReward = {
  id: string;
  label: string;
  reward_type: string;
  reward_value: number;
  min_next_order: number;
  max_discount: number | null;
};

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    orderId?:       string;
    tabId?:         string;
    customerEmail?: string;
    customerPhone?: string;
    restaurantId?:  string;
    // Token-based auth (from /spin page via email link) — mutually exclusive with customerEmail.
    // When spinToken is provided, email/phone are fetched server-side from the order/tab.
    spinToken?:     string;
  };
  const { orderId, tabId, customerEmail, customerPhone, spinToken } = body;
  const restaurantId = body.restaurantId ?? process.env.NEXT_PUBLIC_RESTAURANT_ID ?? 'rest_default';

  if (!orderId && !tabId) {
    return NextResponse.json({ error: 'orderId or tabId required' }, { status: 400 });
  }

  const sb = getServerClient();
  let normEmail: string;
  let normPhone: string;

  if (spinToken) {
    // ── Token-based auth path (from /spin page via email link) ──────────────
    // Validate token against spin_token stored on the order/tab.
    // Fetch email/phone server-side — customer does not need to supply them.
    if (orderId) {
      const { data: entity } = await sb
        .from('orders')
        .select('spin_token, customer_email, phone')
        .eq('id', orderId)
        .single();
      if (!entity || entity.spin_token !== spinToken) {
        return NextResponse.json({ error: 'Invalid or expired spin token' }, { status: 403 });
      }
      normEmail = normalizeEmail((entity.customer_email as string) || '');
      normPhone = normalizePhone((entity.phone as string) || '');
    } else {
      const { data: entity } = await sb
        .from('customer_tabs')
        .select('spin_token, customer_email, phone')
        .eq('id', tabId!)
        .single();
      if (!entity || entity.spin_token !== spinToken) {
        return NextResponse.json({ error: 'Invalid or expired spin token' }, { status: 403 });
      }
      normEmail = normalizeEmail((entity.customer_email as string) || '');
      normPhone = normalizePhone((entity.phone as string) || '');
      // Tab phone fallback: if tab has no phone, check if any order in the tab does
      if (!normPhone) {
        const { data: orderWithPhone } = await sb
          .from('orders')
          .select('phone')
          .eq('tab_id', tabId!)
          .not('phone', 'is', null)
          .limit(1)
          .maybeSingle();
        if (orderWithPhone?.phone) {
          normPhone = normalizePhone(orderWithPhone.phone as string);
        }
      }
    }
  } else {
    // ── Legacy email-based auth path (from /track page) ─────────────────────
    // Kept for backward compatibility — the track page passes customerEmail in body.
    if (!customerEmail) {
      return NextResponse.json({ error: 'customerEmail required' }, { status: 400 });
    }
    normEmail = normalizeEmail(customerEmail);
    normPhone = customerPhone ? normalizePhone(customerPhone) : '';
  }

  // ── Fetch config ────────────────────────────────────────────────────────
  const { data: config } = await sb
    .from('spin_config')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .single();
  if (!config?.enabled) {
    return NextResponse.json({ error: 'Spin & Win not active' }, { status: 400 });
  }

  // ── Contact requirements (token-based path) — mirror GET /api/rewards/eligibility ──
  // Legacy email-based path: normEmail is already validated (customerEmail required in body).
  // Token-based path: we fetched email/phone from the entity — now enforce config flags.
  if (spinToken) {
    if (config.require_email && !normEmail) {
      return NextResponse.json({ error: 'Email address required for Spin & Win' }, { status: 403 });
    }
    if (config.require_phone && !normPhone) {
      return NextResponse.json({ error: 'Phone number required for Spin & Win' }, { status: 403 });
    }
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

  // ── Check / return existing spin result (idempotent fast path) ───────────
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
    .neq('archived', true)
    .order('sort_order');
  if (!rewards?.length) {
    return NextResponse.json({ error: 'No rewards configured' }, { status: 400 });
  }

  const spinId = newId('SR');
  const tz = (config.timezone as string) || 'Asia/Kolkata';

  // ── Atomically allocate reward via DB function ───────────────────────────
  // perform_spin() acquires FOR UPDATE locks on all spin_rewards rows, checks
  // daily/monthly limits inside the lock, picks a reward by weighted probability,
  // and inserts spin_results + reward_coupons in a single transaction.
  //
  // This means: if daily_win_limit = 1 for a reward and two requests arrive
  // simultaneously, only ONE will succeed at the lock stage; the second sees
  // the updated coupon count inside the same lock scope and cannot exceed the limit.
  const { data: allocation, error: rpcErr } = await sb.rpc('perform_spin', {
    p_spin_id:       spinId,
    p_order_id:      orderId ?? null,
    p_tab_id:        tabId   ?? null,
    p_restaurant_id: restaurantId,
    p_email:         normEmail,
    p_phone:         normPhone,
    p_timezone:      tz,
    p_reward_ids:    (rewards as Array<{ id: string }>).map(r => r.id),
  });

  if (rpcErr) {
    console.error('[POST /api/rewards/spin] RPC error:', rpcErr);
    return NextResponse.json({ error: 'Spin allocation failed. Please try again.' }, { status: 500 });
  }

  const result = allocation as Record<string, unknown>;

  // ── Handle race condition or idempotency return from RPC ─────────────────
  if (result.already_spun) {
    const raceQuery = tabId
      ? sb.from('spin_results').select('*, reward_coupons(*), spin_rewards(label, reward_type, reward_value)').eq('tab_id', tabId).single()
      : sb.from('spin_results').select('*, reward_coupons(*), spin_rewards(label, reward_type, reward_value)').eq('order_id', orderId!).single();
    const { data: raceResult } = await raceQuery;
    return NextResponse.json({ alreadySpun: true, ...formatSpinResult(raceResult as Record<string, unknown>) });
  }

  const isWinner   = result.is_winner  as boolean;
  const couponId   = result.coupon_id   as string | null;
  const couponCode = result.coupon_code as string | null;
  const expiresAt  = result.expires_at  as string | null;

  // ── Send reward email (fire-and-forget, idempotent via dedup_key) ────────
  if (isWinner && couponCode && expiresAt) {
    const chosenReward = (rewards as SpinReward[]).find(r => r.id === (result.reward_id as string));
    const emailRef  = tabId ?? orderId!;
    const eventType = tabId ? `reward_tab_${tabId}` : `reward_order_${orderId}`;
    sendRewardEmail({
      emailRef,
      eventType,
      recipientEmail:  normEmail,
      rewardLabel:     result.reward_label as string,
      rewardType:      result.reward_type  as string,
      couponCode,
      expiresAt,
      minNextOrder:    Number(chosenReward?.min_next_order ?? 0),
      maxDiscount:     chosenReward?.max_discount ?? undefined,
    }).catch(console.error);
  }

  return NextResponse.json({
    spinId:      result.spin_id,
    rewardId:    result.reward_id,
    rewardLabel: result.reward_label,
    rewardType:  result.reward_type,
    rewardValue: result.reward_value,
    isWinner,
    couponId:    isWinner ? (couponId   ?? undefined) : undefined,
    couponCode:  isWinner ? (couponCode ?? undefined) : undefined,
    expiresAt:   isWinner ? (expiresAt  ?? undefined) : undefined,
  });
}

function formatSpinResult(spin: Record<string, unknown> | null) {
  if (!spin) return {};
  const reward = spin.spin_rewards as Record<string, unknown> | null;
  const couponRaw = spin.reward_coupons;
  const coupon = Array.isArray(couponRaw) ? (couponRaw[0] as Record<string, unknown> | undefined) : couponRaw as Record<string, unknown> | null;
  return {
    spinId:      spin.id,
    rewardLabel: reward?.label,
    rewardType:  reward?.reward_type,
    rewardValue: reward?.reward_value,
    isWinner:    spin.is_winner,
    couponCode:  coupon?.coupon_code,
    couponId:    coupon?.id,
    expiresAt:   coupon?.expires_at,
  };
}
