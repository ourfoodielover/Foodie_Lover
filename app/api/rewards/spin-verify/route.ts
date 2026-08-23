/**
 * GET /api/rewards/spin-verify
 *
 * Validates a spin_token for an order or tab and returns the current spin state.
 * Used by the /spin page on load to determine what to show the customer.
 *
 * Query params (exactly one of orderId / tabId required):
 *   ?orderId=XXX&token=YYY
 *   ?tabId=XXX&token=YYY
 *
 * Returns:
 *   { valid: false, reason }                — token mismatch / not found
 *   { valid: true, eligible: false, reason } — ineligible (not completed, below amount, etc.)
 *   { valid: true, eligible: true, alreadySpun: true, spinResult, customerName, orderType }
 *   { valid: true, eligible: true, alreadySpun: false, customerName, orderType }
 *
 * Security notes:
 *   - Token is validated against spin_token column in DB (server-side only).
 *   - When token is present and valid, email/phone requirements are waived
 *     (the token itself is the authentication).
 *   - This endpoint NEVER performs a spin — it is read-only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { parseNumber } from '@/lib/config-server';

export const dynamic = 'force-dynamic';

function formatSpinResult(spin: Record<string, unknown>) {
  const reward   = spin.spin_rewards as Record<string, unknown> | null;
  const couponRaw = spin.reward_coupons;
  const coupon   = Array.isArray(couponRaw)
    ? (couponRaw[0] as Record<string, unknown> | undefined)
    : (couponRaw as Record<string, unknown> | null);
  return {
    spinId:       spin.id,
    isWinner:     spin.is_winner,
    rewardLabel:  reward?.label,
    rewardType:   reward?.reward_type,
    rewardValue:  reward?.reward_value,
    couponCode:   coupon?.coupon_code,
    couponId:     coupon?.id,
    expiresAt:    coupon?.expires_at,
    minNextOrder: coupon?.min_next_order,
    maxDiscount:  coupon?.max_discount,
  };
}

export async function GET(req: NextRequest) {
  const params    = req.nextUrl.searchParams;
  const orderId   = params.get('orderId');
  const tabId     = params.get('tabId');
  const token     = params.get('token');
  const restaurantId = params.get('restaurantId') ?? process.env.NEXT_PUBLIC_RESTAURANT_ID ?? 'rest_default';

  if (!token) {
    return NextResponse.json({ valid: false, reason: 'Missing token' });
  }
  if (!orderId && !tabId) {
    return NextResponse.json({ valid: false, reason: 'Missing orderId or tabId' });
  }

  const sb = getServerClient();

  // ── Load spin config ────────────────────────────────────────────────────────
  const { data: config } = await sb
    .from('spin_config')
    .select('enabled, min_order_amount, eligible_order_types, require_email, require_phone')
    .eq('restaurant_id', restaurantId)
    .single();

  if (!config?.enabled) {
    return NextResponse.json({ valid: true, eligible: false, reason: 'Spin & Win is not currently active' });
  }

  // Numeric guard: an invalid/corrupted min_order_amount must never silently
  // resolve to NaN (which would make every `total < NaN` comparison false and
  // let every order qualify) — fall back to 0 (no minimum) and log a warning.
  const minOrderAmount = parseNumber(String(config.min_order_amount ?? ''), 'spin_config.min_order_amount') ?? 0;

  // ── ORDER path ──────────────────────────────────────────────────────────────
  if (orderId) {
    const { data: order } = await sb
      .from('orders')
      .select('id, customer_name, type, status, total, spin_token, customer_email, phone')
      .eq('id', orderId)
      .single();

    // Token validation — constant-time compare is preferred but string equality
    // is acceptable here since spin_token is a 48-char cryptographic random value.
    if (!order || !order.spin_token || order.spin_token !== token) {
      return NextResponse.json({ valid: false, reason: 'Invalid or expired spin link' });
    }

    // Must be completed/delivered
    if (!['completed', 'delivered'].includes(order.status as string)) {
      return NextResponse.json({ valid: true, eligible: false, reason: 'Order not yet completed' });
    }

    // Amount check
    const total = Number(order.total) || 0;
    if (total < minOrderAmount) {
      return NextResponse.json({
        valid: true, eligible: false,
        reason: `Order total ₹${total.toFixed(0)} is below the minimum of ₹${minOrderAmount}`,
      });
    }

    // Order type check
    const eligibleTypes = (config.eligible_order_types as string[]) ?? [];
    const effectiveType = (order.type as string) === 'online' ? 'delivery' : (order.type as string);
    if (!eligibleTypes.includes(effectiveType) && !eligibleTypes.includes(order.type as string)) {
      return NextResponse.json({ valid: true, eligible: false, reason: 'This order type is not eligible for Spin & Win' });
    }

    // Contact requirement checks — mirror the eligibility route rules
    if (config.require_email && !order.customer_email) {
      return NextResponse.json({ valid: true, eligible: false, reason: 'Email address required for Spin & Win' });
    }
    if (config.require_phone && !order.phone) {
      return NextResponse.json({ valid: true, eligible: false, reason: 'Phone number required for Spin & Win' });
    }

    // Check for existing spin result
    const { data: existingSpin } = await sb
      .from('spin_results')
      .select('*, reward_coupons(coupon_code, expires_at, min_next_order, max_discount), spin_rewards(label, reward_type, reward_value)')
      .eq('order_id', orderId)
      .maybeSingle();

    if (existingSpin) {
      return NextResponse.json({
        valid:       true,
        eligible:    false,
        alreadySpun: true,
        spinResult:  formatSpinResult(existingSpin as Record<string, unknown>),
        customerName: (order.customer_name as string) || null,
        orderType:    order.type,
      });
    }

    return NextResponse.json({
      valid:        true,
      eligible:     true,
      alreadySpun:  false,
      customerName: (order.customer_name as string) || null,
      orderType:    order.type,
    });
  }

  // ── TAB path ────────────────────────────────────────────────────────────────
  if (tabId) {
    const { data: tab } = await sb
      .from('customer_tabs')
      .select('id, customer_name, status, total, spin_token, customer_email, phone')
      .eq('id', tabId)
      .single();

    if (!tab || !tab.spin_token || tab.spin_token !== token) {
      return NextResponse.json({ valid: false, reason: 'Invalid or expired spin link' });
    }

    // Must be closed
    if (tab.status !== 'closed') {
      return NextResponse.json({ valid: true, eligible: false, reason: 'Tab not yet closed' });
    }

    // Amount check
    const total = Number(tab.total) || 0;
    if (total < minOrderAmount) {
      return NextResponse.json({
        valid: true, eligible: false,
        reason: `Tab total ₹${total.toFixed(0)} is below the minimum of ₹${minOrderAmount}`,
      });
    }

    // Type check (dine-in)
    const eligibleTypes = (config.eligible_order_types as string[]) ?? [];
    if (!eligibleTypes.includes('dine-in')) {
      return NextResponse.json({ valid: true, eligible: false, reason: 'Dine-in is not eligible for Spin & Win' });
    }

    // Contact requirement checks — mirror the eligibility route rules (including tab→orders phone fallback)
    if (config.require_email && !tab.customer_email) {
      return NextResponse.json({ valid: true, eligible: false, reason: 'Email address required for Spin & Win' });
    }
    if (config.require_phone) {
      let resolvedPhone = (tab.phone as string | null) ?? null;
      if (!resolvedPhone) {
        const { data: orderWithPhone } = await sb
          .from('orders')
          .select('phone')
          .eq('tab_id', tabId)
          .not('phone', 'is', null)
          .limit(1)
          .maybeSingle();
        resolvedPhone = (orderWithPhone?.phone as string | null) ?? null;
      }
      if (!resolvedPhone) {
        return NextResponse.json({ valid: true, eligible: false, reason: 'Phone number required for Spin & Win' });
      }
    }

    // Check for existing spin result
    const { data: existingSpin } = await sb
      .from('spin_results')
      .select('*, reward_coupons(coupon_code, expires_at, min_next_order, max_discount), spin_rewards(label, reward_type, reward_value)')
      .eq('tab_id', tabId)
      .maybeSingle();

    if (existingSpin) {
      return NextResponse.json({
        valid:       true,
        eligible:    false,
        alreadySpun: true,
        spinResult:  formatSpinResult(existingSpin as Record<string, unknown>),
        customerName: (tab.customer_name as string) || null,
        orderType:    'dine-in',
      });
    }

    return NextResponse.json({
      valid:        true,
      eligible:     true,
      alreadySpun:  false,
      customerName: (tab.customer_name as string) || null,
      orderType:    'dine-in',
    });
  }

  return NextResponse.json({ valid: false, reason: 'Internal error' }, { status: 500 });
}
