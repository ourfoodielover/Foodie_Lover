import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { requireRole } from '@/lib/session-server';
import { verifyAdminPin, recomputeClosedTabTotal } from '@/lib/finance-server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const auth = requireRole(req, ['admin']);
  if (!auth.ok) return auth.response;
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

    // ── Reverse recognized revenue on every closed tab ──────────────────────
    // Every order is now gone, so every closed tab's remaining-order sum is
    // necessarily 0 — see recomputeClosedTabTotal() in lib/finance-server.ts
    // for why this happens at all (admin decision: purging test orders
    // should also purge their Finance trace, not leave ghost revenue behind)
    // and for why this goes through the same per-tab, auditable helper
    // (finance_audit_log entry per tab; tabs with an existing split bill are
    // skipped rather than silently made inconsistent) instead of a single
    // bulk UPDATE.
    const { data: closedTabIds } = await sb
      .from('customer_tabs')
      .select('id')
      .eq('status', 'closed');

    const revenueAdjustments: { tabId: string; oldTotal: number; newTotal: number; discountCapped: boolean }[] = [];
    const skippedTabs: { tabId: string; reason: string }[] = [];
    for (const row of (closedTabIds ?? [])) {
      const adj = await recomputeClosedTabTotal(sb, row.id as string, 'Admin (clear all orders)');
      if (adj && 'skipped' in adj) skippedTabs.push(adj);
      else if (adj) revenueAdjustments.push(adj);
    }

    const revenueNote = revenueAdjustments.length > 0
      ? ` Finance revenue reversed on ${revenueAdjustments.length} closed table${revenueAdjustments.length !== 1 ? 's' : ''} (₹${revenueAdjustments.reduce((s, a) => s + a.oldTotal, 0).toFixed(2)} → ₹${revenueAdjustments.reduce((s, a) => s + a.newTotal, 0).toFixed(2)}).`
      : '';
    const skippedNote = skippedTabs.length > 0
      ? ` ⚠️ ${skippedTabs.length} closed table${skippedTabs.length !== 1 ? 's' : ''} skipped (split bill exists) — review manually.`
      : '';

    return NextResponse.json({
      ok: true,
      closedTabsReversed: revenueAdjustments.length,
      skippedTabs,
      message: `All orders cleared successfully.${revenueNote}${skippedNote}`,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
