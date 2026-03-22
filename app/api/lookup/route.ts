// GET /api/lookup?name=...&phone=...&restaurantId=...
// Find most recent non-dine-in order matching name + last 10 phone digits
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient, rowToOrder } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const sb   = getServerClient();
    const url  = new URL(req.url);
    const rid  = url.searchParams.get('restaurantId') ?? 'rest_default';
    const name = (url.searchParams.get('name') ?? '').trim().toLowerCase();
    const ph   = (url.searchParams.get('phone') ?? '').replace(/\D/g, '').slice(-10);

    if (!name || !ph) return NextResponse.json({ order: null });

    // Fetch non-dine-in orders with tracking tokens for this restaurant
    const { data: rows } = await sb
      .from('orders')
      .select('*, order_items(*), order_events(*)')
      .eq('restaurant_id', rid)
      .neq('type', 'dine-in')
      .not('tracking_token', 'is', null)
      .order('created_at', { ascending: false })
      .limit(100);

    if (!rows?.length) return NextResponse.json({ order: null });

    // Match by name (case-insensitive) and last 10 phone digits
    const match = rows.find(r => {
      const nameMatch  = (r.customer_name ?? '').toLowerCase() === name;
      const storedPh   = (r.phone ?? '').replace(/\D/g, '').slice(-10);
      return nameMatch && storedPh && storedPh === ph;
    });

    if (!match) return NextResponse.json({ order: null });

    return NextResponse.json({ order: rowToOrder(match, match.order_items, match.order_events) });
  } catch (err) {
    console.error('[GET /api/lookup]', err);
    return NextResponse.json({ order: null });
  }
}
