// GET /api/finance/system-sales?restaurantId=&from=&to=
//
// The single authoritative, LIVE-computed revenue source for Finance — see
// lib/finance-server.ts computeSystemSales() for the exact recognition rule.
// Nothing here is stored; every call recomputes directly from the existing
// `orders` and `customer_tabs` tables, so deleting/cancelling/editing an
// order is automatically reflected on the next read — Finance can never go
// out of sync with order data because it never has its own copy of it.
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { requireAdminPin, errMsg, restaurantId, computeSystemSales, sumSystemSales, parsePaymentSplits, matchAccountForKeyword, type FinanceAccountRow } from '@/lib/finance-server';
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

    const rows    = await computeSystemSales(sb, rid, from, to);
    const summary = sumSystemSales(rows);

    // ── By order type ──────────────────────────────────────────────────────
    const byType: Record<string, { count: number; net: number }> = {};
    for (const r of rows) {
      const k = r.orderType ?? 'unknown';
      if (!byType[k]) byType[k] = { count: 0, net: 0 };
      byType[k].count++; byType[k].net += r.net;
    }

    // ── By account (via payment-method keyword matching) ──────────────────
    const { data: accountRows } = await sb
      .from('finance_accounts')
      .select('id, name, type, payment_method_keywords, is_default, is_active')
      .eq('restaurant_id', rid)
      .eq('is_active', true);
    const accounts = (accountRows ?? []) as unknown as FinanceAccountRow[];
    const byAccount: Record<string, { accountId: string; name: string; net: number }> = {};
    for (const r of rows) {
      const splits = parsePaymentSplits(r.paymentMethod, r.net);
      for (const part of splits) {
        const acc = matchAccountForKeyword(part.keyword, accounts);
        const key = acc?.id ?? 'unmatched';
        if (!byAccount[key]) byAccount[key] = { accountId: key, name: acc?.name ?? 'Unmatched / Other', net: 0 };
        byAccount[key].net += part.amount;
      }
    }
    Object.values(byAccount).forEach(a => { a.net = Math.round(a.net * 100) / 100; });

    return NextResponse.json({
      summary,
      byType,
      byAccount: Object.values(byAccount),
      rows: rows.slice(0, 500), // drill-down list, capped
      truncated: rows.length > 500,
    });
  } catch (err) {
    console.error('[GET /api/finance/system-sales]', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}
