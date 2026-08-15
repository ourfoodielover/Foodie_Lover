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

  // Status check — allow reserved by THIS order (idempotent re-validation)
  if (coupon.status === 'redeemed') {
    return NextResponse.json({
      valid: false,
      reason: `This coupon was already redeemed`,
      alreadyRedeemed: true,
      redeemedOrderId: coupon.redeemed_order_id,
      redeemedAt: coupon.redeemed_at,
    });
  }
  if (coupon.status === 'reserved' && coupon.reserved_order_id !== orderId) {
    return NextResponse.json({ valid: false, reason: 'This coupon is currently being used in another order' });
  }
  if (coupon.status === 'expired' || coupon.status === 'cancelled') {
    return NextResponse.json({ valid: false, reason: `Coupon is ${coupon.status as string}` });
  }
  if (!['active', 'reserved'].includes(coupon.status as string)) {
    return NextResponse.json({ valid: false, reason: 'Coupon is not valid' });
  }

  // Expiry
  if (new Date(coupon.expires_at as string) < new Date()) {
    return NextResponse.json({ valid: false, reason: 'Coupon has expired' });
  }

  // Min order
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
