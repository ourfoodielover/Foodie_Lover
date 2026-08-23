import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { parseNumber } from '@/lib/config-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orderId      = searchParams.get('orderId');
  const tabId        = searchParams.get('tabId');
  const restaurantId = searchParams.get('restaurantId') ?? process.env.NEXT_PUBLIC_RESTAURANT_ID ?? 'rest_default';

  if (!orderId && !tabId) {
    return NextResponse.json({ eligible: false, reason: 'orderId or tabId required' });
  }

  const sb = getServerClient();

  // ── Fetch spin config ───────────────────────────────────────────────────
  const { data: config } = await sb
    .from('spin_config')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .single();
  if (!config?.enabled) {
    return NextResponse.json({ eligible: false, reason: 'Spin & Win is not currently active' });
  }

  // Numeric guard: an invalid/corrupted min_order_amount must never silently
  // resolve to NaN (which would make every `total < NaN` comparison false and
  // let every order qualify) — fall back to 0 (no minimum) and log a warning.
  const minOrderAmount = parseNumber(String(config.min_order_amount ?? ''), 'spin_config.min_order_amount') ?? 0;

  // ── TAB-BASED SPIN (dine-in) ────────────────────────────────────────────
  if (tabId) {
    // Check if already spun for this tab
    const { data: existingSpin } = await sb
      .from('spin_results')
      .select('*, reward_coupons(*), spin_rewards(label, reward_type, reward_value)')
      .eq('tab_id', tabId)
      .maybeSingle();
    if (existingSpin) {
      return NextResponse.json({ eligible: false, alreadySpun: true, existingResult: existingSpin });
    }

    // Fetch tab
    const { data: tab } = await sb
      .from('customer_tabs')
      .select('id, status, total, customer_email, phone, restaurant_id')
      .eq('id', tabId)
      .single();
    if (!tab) return NextResponse.json({ eligible: false, reason: 'Tab not found' });

    // Tab must be closed (payment completed)
    if (tab.status !== 'closed') {
      return NextResponse.json({ eligible: false, reason: 'Order not yet paid' });
    }

    // Check dine-in is eligible order type
    const eligibleTypes = config.eligible_order_types as string[];
    if (!eligibleTypes.includes('dine-in')) {
      return NextResponse.json({ eligible: false, reason: 'Dine-in orders are not eligible for Spin & Win' });
    }

    // Check amount
    if (Number(tab.total ?? 0) < minOrderAmount) {
      return NextResponse.json({ eligible: false, reason: `Minimum qualifying amount is ₹${minOrderAmount}` });
    }

    // Check email
    if (config.require_email && !tab.customer_email) {
      return NextResponse.json({ eligible: false, reason: 'Email required for Spin & Win' });
    }

    // Check phone — first try tab.phone, then fall back to any order in the tab
    let resolvedPhone = tab.phone as string | null;
    if (config.require_phone && !resolvedPhone) {
      const { data: orderWithPhone } = await sb
        .from('orders')
        .select('phone')
        .eq('tab_id', tabId)
        .not('phone', 'is', null)
        .limit(1)
        .maybeSingle();
      resolvedPhone = orderWithPhone?.phone ?? null;
    }
    if (config.require_phone && !resolvedPhone) {
      return NextResponse.json({ eligible: false, reason: 'Phone number required for Spin & Win' });
    }

    return NextResponse.json({ eligible: true, alreadySpun: false, qualifyingAmount: tab.total, tabEmail: tab.customer_email, tabPhone: resolvedPhone });
  }

  // ── ORDER-BASED SPIN (pickup / delivery) ────────────────────────────────
  // Check if already spun for this order
  const { data: existingSpin } = await sb
    .from('spin_results')
    .select('*, reward_coupons(*), spin_rewards(label, reward_type, reward_value)')
    .eq('order_id', orderId!)
    .maybeSingle();
  if (existingSpin) {
    return NextResponse.json({ eligible: false, alreadySpun: true, existingResult: existingSpin });
  }

  // Fetch order
  const { data: order } = await sb
    .from('orders')
    .select('id, type, status, total, customer_email, phone, coupon_id')
    .eq('id', orderId!)
    .single();
  if (!order) return NextResponse.json({ eligible: false, reason: 'Order not found' });

  // Check order type eligibility
  const eligibleTypes = config.eligible_order_types as string[];
  const orderType = (order.type as string) === 'online' ? 'delivery' : (order.type as string);
  if (!eligibleTypes.includes(orderType) && !eligibleTypes.includes(order.type as string)) {
    return NextResponse.json({ eligible: false, reason: 'This order type is not eligible for Spin & Win' });
  }

  // Check completed state (pickup/delivery only — dine-in uses tab-based flow)
  const completedStates = ['completed', 'delivered'];
  if (!completedStates.includes(order.status as string)) {
    return NextResponse.json({ eligible: false, reason: 'Order not yet completed' });
  }

  // Check amount
  if (Number(order.total ?? 0) < minOrderAmount) {
    return NextResponse.json({ eligible: false, reason: `Minimum qualifying amount is ₹${minOrderAmount}` });
  }

  if (config.require_email && !order.customer_email) {
    return NextResponse.json({ eligible: false, reason: 'Email required for Spin & Win' });
  }
  if (config.require_phone && !order.phone) {
    return NextResponse.json({ eligible: false, reason: 'Phone number required for Spin & Win' });
  }

  return NextResponse.json({ eligible: true, alreadySpun: false, qualifyingAmount: order.total });
}
