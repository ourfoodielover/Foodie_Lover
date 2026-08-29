// GET /api/manager/today-revenue?from=<ISO>&to=<ISO>
//
// Remediation (master-prompt finding #8: "Fix Manager Expenses Today / Net
// Profit"). app/manager/expenses/page.tsx previously computed "Today
// Revenue" itself, client-side, by fetching raw orders and summing every
// non-cancelled/void order's `total` — regardless of whether it was actually
// paid yet (in-progress orders like 'preparing'/'served' were counted), and
// with no dine-in tab-close netting, so a dine-in round was liable to be
// counted at the individual-order level even though the app's one
// authoritative revenue engine (computeSystemSales in lib/finance-server.ts,
// also used by /api/finance/summary and /api/finance/system-sales)
// deliberately counts dine-in revenue ONCE, at tab-close time
// (customer_tabs.total − discount − coupon_discount), and only recognizes
// pickup/delivery orders once status = 'completed'. The old client-side sum
// could disagree with Finance's own numbers for the exact same day.
//
// This route is a manager-accessible (not admin-PIN-gated) wrapper around
// that same authoritative computeSystemSales()/sumSystemSales() engine, so
// Manager Expenses' Net Profit figure is always consistent with Finance's —
// without granting Managers access to the rest of the Finance feature
// (ledger transactions, vendor/salary payments, etc.), which stays admin-PIN
// gated by design (see the "Admin authorization" comment in
// lib/finance-server.ts).
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { requireRole } from '@/lib/session-server';
import { computeSystemSales, sumSystemSales, restaurantId, errMsg } from '@/lib/finance-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = requireRole(req, ['manager', 'admin']);
  if (!auth.ok) return auth.response;
  try {
    const from = req.nextUrl.searchParams.get('from');
    if (!from) {
      return NextResponse.json({ error: 'from is required (ISO timestamp)' }, { status: 400 });
    }
    const to = req.nextUrl.searchParams.get('to') ?? new Date().toISOString();

    const sb  = getServerClient();
    const rid = restaurantId(null, req.nextUrl);
    const rows   = await computeSystemSales(sb, rid, from, to);
    const totals = sumSystemSales(rows);

    return NextResponse.json({
      from,
      to,
      revenue:    totals.net,
      gross:      totals.gross,
      discount:   totals.discount,
      orderCount: totals.count,
    });
  } catch (err) {
    console.error('[GET /api/manager/today-revenue]', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}
