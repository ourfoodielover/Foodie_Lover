import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const restaurantId = process.env.NEXT_PUBLIC_RESTAURANT_ID ?? 'rest_default';
  const sb = getServerClient();
  const { data } = await sb
    .from('spin_rewards')
    .select('id, label, reward_type, sort_order')  // DO NOT expose weights
    .eq('restaurant_id', restaurantId)
    .eq('active', true)
    .order('sort_order');
  return NextResponse.json(data ?? []);
}
