// GET /api/track?id=...&token=...
// Verify tracking token and return order (used by track page)
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient, rowToOrder } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const sb      = getServerClient();
    const url     = new URL(req.url);
    const orderId = url.searchParams.get('id');
    const token   = url.searchParams.get('token');

    if (!orderId || !token) return NextResponse.json({ order: null });

    const { data } = await sb
      .from('orders')
      .select('*, order_items(*), order_events(*)')
      .eq('id', orderId)
      .eq('tracking_token', token)
      .maybeSingle();

    if (!data) return NextResponse.json({ order: null });

    return NextResponse.json({ order: rowToOrder(data, data.order_items, data.order_events) });
  } catch (err) {
    console.error('[GET /api/track]', err);
    return NextResponse.json({ order: null });
  }
}
