// GET /api/billing/tab/[tabId] — server-authoritative Dine-In bill.
//
// Used by:
//   - Waiter's "Smart Bill-Requested Banner" [View Bill] button
//   - Waiter → Take Order → Table → Active Customers → [View/Print Bill]
//   - Manager's tab detail panel [View Bill] / [Print Bill] / [Print Receipt]
//
// Read-only. Never redeems a coupon, never changes payment/order/Finance
// state — see lib/billing-server.ts's header comment. This route and
// POST /api/billing/print both call computeDineInBill(); the physical print
// payload is built from the SAME computation this GET returns, so a preview
// can never disagree with what actually prints (task spec requirement).
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { requireRole } from '@/lib/session-server';
import { computeDineInBill } from '@/lib/billing-server';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ tabId: string }> };

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

export async function GET(req: NextRequest, ctx: Ctx) {
  // Dine-in bill: waiter/manager/admin (spec §"authorization" — waiter/
  // manager for dine-in bill). Admin included for parity with every other
  // staff-scoped route in this codebase.
  const auth = requireRole(req, ['waiter', 'manager', 'admin']);
  if (!auth.ok) return auth.response;
  try {
    const { tabId } = await ctx.params;
    const sb  = getServerClient();
    const url = new URL(req.url);
    const rid = url.searchParams.get('restaurantId') ?? auth.session.restaurantId ?? 'rest_default';

    const bill = await computeDineInBill(sb, rid, tabId);
    if (!bill) return NextResponse.json({ error: 'Tab not found' }, { status: 404 });

    return NextResponse.json(bill);
  } catch (err) {
    console.error('[GET /api/billing/tab/[tabId]] unexpected error:', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}
