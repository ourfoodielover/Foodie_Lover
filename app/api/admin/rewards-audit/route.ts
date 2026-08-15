import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sb = getServerClient();
  const { data } = await sb
    .from('reward_coupons')
    .select(`
      *,
      spin_results(spun_at, customer_email, customer_phone),
      source_order:orders!reward_coupons_source_order_id_fkey(order_number, type, total),
      redeemed_order:orders!reward_coupons_redeemed_order_id_fkey(order_number, type, total),
      spin_rewards(label, reward_type)
    `)
    .order('created_at', { ascending: false })
    .limit(200);
  return NextResponse.json(data ?? []);
}
