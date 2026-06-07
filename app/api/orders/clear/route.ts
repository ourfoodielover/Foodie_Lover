import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

async function verifyAdminPin(pin: string): Promise<boolean> {
  try {
    const sb  = getServerClient();
    const rid = process.env.NEXT_PUBLIC_RESTAURANT_ID ?? 'rest_default';
    const { data } = await sb
      .from('restaurant_settings')
      .select('value')
      .eq('restaurant_id', rid)
      .eq('key', 'admin_pin')
      .maybeSingle();
    return !!data && data.value === pin;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const { pin } = await req.json() as { pin?: string };

    if (!pin) {
      return NextResponse.json({ error: 'PIN required' }, { status: 400 });
    }

    const valid = await verifyAdminPin(pin);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 403 });
    }

    const sb = getServerClient();

    // Delete in dependency order: order_events → order_items → orders
    const { error: evErr } = await sb
      .from('order_events')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (evErr) {
      return NextResponse.json({ error: `Failed to clear order events: ${evErr.message}` }, { status: 500 });
    }

    const { error: itErr } = await sb
      .from('order_items')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (itErr) {
      return NextResponse.json({ error: `Failed to clear order items: ${itErr.message}` }, { status: 500 });
    }

    const { error: ordErr } = await sb
      .from('orders')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (ordErr) {
      return NextResponse.json({ error: `Failed to clear orders: ${ordErr.message}` }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: 'All orders cleared successfully.' });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
