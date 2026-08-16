import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

function normalizeEmail(e: string) { return e.trim().toLowerCase(); }
function normalizePhone(p: string) { return p.trim().replace(/\s+/g, ''); }

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    couponCode: string;
    email: string;
    phone: string;
    orderId?: string;
    orderSubtotal?: number;
    orderType?: string;
  };
  const { couponCode, email, phone, orderId, orderSubtotal } = body;

  if (!couponCode || !email || !phone) {
    return NextResponse.json({ valid: false, reason: 'Coupon code, email, and phone are required' });
  }

  const sb = getServerClient();
  const normEmail = normalizeEmail(email);
  const normPhone = normalizePhone(phone);

  const { data: coupon } = await sb
    .from('reward_coupons')
    .select('*')
    .eq('coupon_code', couponCode.trim().toUpperCase())
    .maybeSingle();

  if (!coupon) return NextResponse.json({ valid: false, reason: 'Coupon not found' });

  // Email & phone match
  if (normalizeEmail(coupon.customer_email as string) !== normEmail) {
    return NextResponse.json({ valid: false, reason: 'Email does not match this coupon' });
  }
  if (normalizePhone(coupon.customer_phone as string) !== normPhone) {
    return NextResponse.json({ valid: false, reason: 'Phone number does not match this coupon' });
  }

  // ── Status check ─────────────────────────────────────────────────────────────
  if (coupon.status === 'redeemed') {
    // Show which order it was redeemed on for clarity
    let redeemedMsg = 'This coupon was already redeemed';
    if (coupon.redeemed_order_id) {
      // Try to get the order number for a better message
      const { data: redeemedOrder } = await sb
        .from('orders')
        .select('order_number')
        .eq('id', coupon.redeemed_order_id as string)
        .maybeSingle();
      const orderNum = (redeemedOrder as Record<string, unknown> | null)?.order_number;
      if (orderNum) {
        redeemedMsg = `This coupon was already redeemed on Order #${orderNum}`;
      }
    }
    return NextResponse.json({
      valid: false,
      reason: redeemedMsg,
      alreadyRedeemed: true,
      redeemedOrderId: coupon.redeemed_order_id,
      redeemedAt: coupon.redeemed_at,
    });
  }

  if (coupon.status === 'reserved') {
    if (coupon.reserved_order_id === orderId) {
      // Same order — idempotent re-validation, treat as valid (fall through)
    } else {
      // Check if the reserving order is still genuinely active
      if (coupon.reserved_order_id) {
        const { data: reservingOrder } = await sb
          .from('orders')
          .select('status')
          .eq('id', coupon.reserved_order_id as string)
          .maybeSingle();
        const activeStatuses = ['awaiting_waiter', 'pending', 'preparing', 'prepared', 'served', 'awaiting_payment'];
        const reservingStatus = (reservingOrder as Record<string, unknown> | null)?.status as string | undefined;
        if (!reservingOrder || !reservingStatus || !activeStatuses.includes(reservingStatus)) {
          // The other order is no longer active — release the reservation
          await sb.from('reward_coupons')
            .update({ status: 'active', reserved_order_id: null, reserved_at: null })
            .eq('id', coupon.id as string)
            .eq('status', 'reserved');
          // Continue validation as active (fall through to discount calculation)
        } else {
          return NextResponse.json({ valid: false, reason: 'This coupon is currently applied to another active order' });
        }
      }
    }
  }

  if (coupon.status === 'expired') {
    const expiryFormatted = new Date(coupon.expires_at as string).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
    return NextResponse.json({ valid: false, reason: `This coupon expired on ${expiryFormatted}` });
  }

  if (coupon.status === 'cancelled') {
    return NextResponse.json({ valid: false, reason: 'This coupon is no longer valid' });
  }

  if (!['active', 'reserved'].includes(coupon.status as string)) {
    return NextResponse.json({ valid: false, reason: 'Coupon is not valid' });
  }

  // Expiry check
  if (new Date(coupon.expires_at as string) < new Date()) {
    return NextResponse.json({ valid: false, reason: 'Coupon has expired' });
  }

  // Min order check
  const subtotal = Number(orderSubtotal ?? 0);
  if (subtotal < Number(coupon.min_next_order)) {
    return NextResponse.json({ valid: false, reason: `Minimum order amount for this coupon is ₹${coupon.min_next_order as number}` });
  }

  // Calculate discount SERVER-SIDE
  let discountAmount = 0;
  if (coupon.reward_type === 'percent') {
    discountAmount = Math.round(subtotal * Number(coupon.reward_value) / 100);
  } else if (coupon.reward_type === 'fixed') {
    discountAmount = Math.min(Number(coupon.reward_value), subtotal);
  } else if (coupon.reward_type === 'free_item') {
    discountAmount = 0; // item added separately
  }

  const finalTotal = Math.max(0, subtotal - discountAmount);

  return NextResponse.json({
    valid: true,
    couponId: coupon.id,
    couponCode: coupon.coupon_code,
    label: coupon.label,
    rewardType: coupon.reward_type,
    rewardValue: coupon.reward_value,
    discountAmount,
    finalTotal,
    freeItemId: coupon.free_item_id,
    freeItemName: coupon.free_item_name,
    expiresAt: coupon.expires_at,
  });
}
