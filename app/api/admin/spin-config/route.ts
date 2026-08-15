import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
const RID = process.env.NEXT_PUBLIC_RESTAURANT_ID ?? 'rest_default';

export async function GET() {
  const sb = getServerClient();
  const { data } = await sb.from('spin_config').select('*').eq('restaurant_id', RID).single();
  return NextResponse.json(data ?? { enabled: false, min_order_amount: 500, eligible_order_types: ['dine-in', 'pickup', 'delivery'], require_email: true, require_phone: true });
}

export async function POST(req: NextRequest) {
  const body = await req.json() as Record<string, unknown>;
  const sb = getServerClient();
  const { error } = await sb.from('spin_config').upsert({
    id: 'rest_default',
    restaurant_id: RID,
    ...body,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
