import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get('orderId');
  const restaurantId = searchParams.get('restaurantId') ?? process.env.NEXT_PUBLIC_RESTAURANT_ID ?? 'rest_default';

  if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 });

  const sb = getServerClient();

  // Fetch order
  const { data: order, error: orderErr } = await sb
    .from('orders')
    .select('id, type, status, total, customer_email, phone, coupon_id')
    .eq('id', orderId)
    .single();
  if (orderErr || !order) return NextResponse.json({ eligible: false, reason: 'Order not found' });

  // Fetch spin config
  const { data: config } = await sb
    .from('spin_config')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .single();
  if (!config?.enabled) return NextResponse.json({ eligible: false, reason: 'Spin & Win is not active' });

  // Check if already spun
  const { data: existingSpin } = await sb
    .from('spin_results')
    .select('*, reward_coupons(*), spin_rewards(label, reward_type)')
    .eq('order_id', orderId)
    .maybeSingle();
  if (existingSpin) {
    return NextResponse.json({ eligible: false, alreadySpun: true, existingResult: existingSpin });
  }

  // Check order type eligibility
  const eligibleTypes = config.eligible_order_types as string[];
  const orderType = (order.type as string) === 'online' ? 'delivery' : (order.type as string);
  if (!eligibleTypes.includes(orderType) && !eligibleTypes.includes(order.type as string)) {
    return NextResponse.json({ eligible: false, reason: 'Order type not eligible' });
  }

  // Check completed state
  const completedStates = ['completed', 'delivered'];
  if (!completedStates.includes(order.status as string)) {
    return NextResponse.json({ eligible: false, reason: 'Order not yet completed' });
  }

  // Check amount
  if (Number(order.total ?? 0) < Number(config.min_order_amount)) {
    return NextResponse.json({ eligible: false, reason: `Minimum order amount is ₹${config.min_order_amount}` });
  }

  // Check email
  if (config.require_email && !order.customer_email) {
    return NextResponse.json({ eligible: false, reason: 'Email required for Spin & Win' });
  }

  // Check phone
  if (config.require_phone && !order.phone) {
    return NextResponse.json({ eligible: false, reason: 'Phone required for Spin & Win' });
  }

  return NextResponse.json({ eligible: true, alreadySpun: false });
}
