// GET /api/billing/order/[orderId] — server-authoritative Pickup/Delivery
// bill or receipt.
//
// Auth is two-stage because the caller doesn't get to declare the order's
// type — the DB row does: any authenticated staff member may ASK, but the
// role allowed to actually see the result depends on whether the order
// turns out to be pickup (waiter/manager/admin) or delivery
// (delivery/manager/admin), per the task spec's authorization table. This
// matches the existing codebase pattern (e.g. GET /api/orders/[id]) of
// deriving authorization from the row itself rather than trusting a client
// hint.
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { requireAnyStaff } from '@/lib/session-server';
import { computeOrderBill } from '@/lib/billing-server';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ orderId: string }> };

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const auth = requireAnyStaff(req);
  if (!auth.ok) return auth.response;
  try {
    const { orderId } = await ctx.params;
    const sb  = getServerClient();
    const url = new URL(req.url);
    const rid = url.searchParams.get('restaurantId') ?? auth.session.restaurantId ?? 'rest_default';

    const result = await computeOrderBill(sb, rid, orderId);
    if ('error' in result) {
      if (result.error === 'not_found') return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      return NextResponse.json({ error: `This order is type "${result.actualType}", not pickup/delivery.` }, { status: 400 });
    }

    const allowedRoles = result.kind === 'delivery'
      ? ['delivery', 'manager', 'admin']
      : ['waiter', 'manager', 'admin'];
    if (!allowedRoles.includes(auth.session.role)) {
      return NextResponse.json(
        { error: `This action requires one of: ${allowedRoles.join(', ')}.` },
        { status: 403 },
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('[GET /api/billing/order/[orderId]] unexpected error:', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}
