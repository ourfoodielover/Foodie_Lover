// GET /api/finance/summary?restaurantId=&from=&to=
// Combined live totals for the Finance Overview tab — see
// lib/finance-server.ts computeFinanceSummary() for exactly how each figure
// is derived (never a single opaque "total_sales" number; every figure here
// is one drill-down request away from its source rows).
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { requireAdminPin, errMsg, restaurantId, computeFinanceSummary } from '@/lib/finance-server';
import { requireRole } from '@/lib/session-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const roleAuth = requireRole(req, ['admin']);
  if (!roleAuth.ok) return roleAuth.response;
  const auth = await requireAdminPin(req);
  if (!auth.ok) return auth.response;
  try {
    const sb  = getServerClient();
    const url = new URL(req.url);
    const rid = restaurantId(null, url);
    const from = url.searchParams.get('from');
    const to   = url.searchParams.get('to');
    if (!from || !to) {
      return NextResponse.json({ error: 'from and to (ISO timestamps) are required' }, { status: 400 });
    }
    const summary = await computeFinanceSummary(sb, rid, from, to);
    return NextResponse.json(summary);
  } catch (err) {
    console.error('[GET /api/finance/summary]', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}
