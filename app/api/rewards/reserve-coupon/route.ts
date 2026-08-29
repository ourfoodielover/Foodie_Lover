// POST /api/rewards/reserve-coupon — lock a coupon to an order/tab while
// checkout is in progress (released again on failed re-validation, or
// consumed permanently at redemption — see PATCH /api/tabs/[id] `close` and
// the order-completion path).
//
// Remediation (master-prompt finding #5 / AUTH-4): this route previously
// took only { couponId, orderId } with NO ownership check at all — anyone
// who knew or guessed any coupon's internal id (customer_tabs/orders use
// the same non-cryptographic newId() generator, so ids are not a strong
// secret) could reserve ANY customer's active coupon against an order of
// their own choosing, locking the real owner out of their own reward
// (GET /api/rewards/validate-coupon already refuses a coupon "reserved" by
// a different active order). Now requires the same ownership proof
// validate-coupon already established for this exact reward system — the
// coupon's code together with the email + phone it was issued to — before
// reserving it, matching the customer-ownership-token pattern used
// elsewhere (never a staff session; this route has no staff caller).
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

function normalizeEmail(e: string) { return e.trim().toLowerCase(); }
function normalizePhone(p: string) { return p.trim().replace(/\s+/g, ''); }

export async function POST(req: NextRequest) {
  const body = await req.json() as { couponId: string; orderId: string; email: string; phone: string };
  const { couponId, orderId, email, phone } = body;
  if (!couponId || !orderId) return NextResponse.json({ error: 'couponId and orderId required' }, { status: 400 });
  if (!email || !phone) return NextResponse.json({ error: 'email and phone are required to prove ownership of this coupon' }, { status: 400 });

  const sb = getServerClient();

  const { data: coupon, error: fetchErr } = await sb
    .from('reward_coupons')
    .select('id, customer_email, customer_phone')
    .eq('id', couponId)
    .maybeSingle();
  if (fetchErr || !coupon) {
    return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
  }
  const emailMatches = normalizeEmail((coupon.customer_email as string) ?? '') === normalizeEmail(email);
  const phoneMatches = normalizePhone((coupon.customer_phone as string) ?? '') === normalizePhone(phone);
  if (!emailMatches || !phoneMatches) {
    return NextResponse.json({ error: 'Email/phone does not match this coupon' }, { status: 403 });
  }

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
