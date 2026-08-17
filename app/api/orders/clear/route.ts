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

    // Delete in dependency order:
    //   order_events → order_items
    //   → (nullify reward_coupons FK back-refs) → orders
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

    // ── Nullify reward_coupons → orders FK references ─────────────────────────
    // reward_coupons has three columns that reference orders(id):
    //   source_order_id, reserved_order_id, redeemed_order_id
    // All use default RESTRICT behaviour, so we must nullify them before
    // deleting the orders they point to.  (migration_016 adds ON DELETE SET NULL
    // to make this automatic at the DB level, but this code ensures it works
    // even before that migration has been applied.)
    const { error: rcErr } = await sb
      .from('reward_coupons')
      .update({ source_order_id: null, reserved_order_id: null, redeemed_order_id: null })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // matches all rows

    if (rcErr) {
      return NextResponse.json({ error: `Failed to clear coupon references: ${rcErr.message}` }, { status: 500 });
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
