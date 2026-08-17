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

    // ── Full FK dependency map (all constraints that block order deletion) ────
    //
    //  spin_results.order_id        → orders(id)  ON DELETE CASCADE
    //  reward_coupons.spin_id       → spin_results(id)  RESTRICT  ← blocks cascade
    //  reward_coupons.source_order_id   → orders(id)  RESTRICT
    //  reward_coupons.reserved_order_id → orders(id)  RESTRICT
    //  reward_coupons.redeemed_order_id → orders(id)  RESTRICT
    //
    // Correct deletion order:
    //   order_events → order_items → reward_coupons → spin_results → orders
    //
    // Deleting reward_coupons first unblocks both paths:
    //   • The direct RESTRICT back-refs (source/reserved/redeemed_order_id)
    //   • The cascade path: orders → spin_results (blocked by spin_id RESTRICT)
    //
    // (migration_016 adds ON DELETE CASCADE on spin_id and ON DELETE SET NULL on
    // the order back-refs so the DB handles this automatically going forward.)

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

    // Delete reward_coupons before spin_results and orders to satisfy all FK constraints
    const { error: rcErr } = await sb
      .from('reward_coupons')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (rcErr) {
      return NextResponse.json({ error: `Failed to clear reward coupons: ${rcErr.message}` }, { status: 500 });
    }

    // Delete spin_results explicitly (covers no_reward spins that have no coupon)
    const { error: srErr } = await sb
      .from('spin_results')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (srErr) {
      return NextResponse.json({ error: `Failed to clear spin results: ${srErr.message}` }, { status: 500 });
    }

    // Orders can now be deleted — all FK back-refs are gone
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
