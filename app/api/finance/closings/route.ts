// GET  /api/finance/closings?restaurantId=&date=YYYY-MM-DD   — single day's closing (or null)
// GET  /api/finance/closings?restaurantId=&limit=30           — recent closings list
// POST /api/finance/closings                                   — close (or re-close) a business day
//
// Closing a day freezes a snapshot for reference — it does NOT lock any
// underlying row. Admin can still edit historical entries afterwards; the
// Finance UI recomputes live totals and compares them against `snapshot` to
// show a "Modified after closing" indicator. Re-closing overwrites the
// snapshot and is itself audited (every close/re-close is one
// finance_audit_log row).
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient, newId } from '@/lib/supabase-server';
import { requireAdminPin, errMsg, restaurantId, computeFinanceSummary, logFinanceAudit } from '@/lib/finance-server';
import { requireRole } from '@/lib/session-server';

export const dynamic = 'force-dynamic';

function istDayRange(dateStr: string): { from: string; to: string } {
  const from = new Date(`${dateStr}T00:00:00+05:30`).toISOString();
  const to   = new Date(new Date(from).getTime() + 24 * 60 * 60 * 1000).toISOString();
  return { from, to };
}

function rowToClosing(r: Record<string, unknown>) {
  return {
    id:           r.id as string,
    businessDate: r.business_date as string,
    snapshot:     r.snapshot,
    isClosed:     !!r.is_closed,
    closedBy:     (r.closed_by as string | null) ?? undefined,
    closedAt:     r.closed_at as string,
    reopenedBy:   (r.reopened_by as string | null) ?? undefined,
    reopenedAt:   (r.reopened_at as string | null) ?? undefined,
    notes:        (r.notes as string | null) ?? undefined,
  };
}

export async function GET(req: NextRequest) {
  const roleAuth = requireRole(req, ['admin']);
  if (!roleAuth.ok) return roleAuth.response;
  const auth = await requireAdminPin(req);
  if (!auth.ok) return auth.response;
  try {
    const sb  = getServerClient();
    const url = new URL(req.url);
    const rid = restaurantId(null, url);
    const date = url.searchParams.get('date');

    if (date) {
      const { data, error } = await sb.from('daily_finance_closings')
        .select('*').eq('restaurant_id', rid).eq('business_date', date).maybeSingle();
      if (error) throw error;
      if (!data) return NextResponse.json(null);

      // Live recompute for the same day so the caller can diff against the frozen snapshot.
      const { from, to } = istDayRange(date);
      const live = await computeFinanceSummary(sb, rid, from, to);
      return NextResponse.json({ ...rowToClosing(data as Record<string, unknown>), live });
    }

    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '30'), 200);
    const { data, error } = await sb.from('daily_finance_closings')
      .select('*').eq('restaurant_id', rid).order('business_date', { ascending: false }).limit(limit);
    if (error) throw error;
    return NextResponse.json((data ?? []).map(r => rowToClosing(r as Record<string, unknown>)));
  } catch (err) {
    console.error('[GET /api/finance/closings]', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const roleAuth = requireRole(req, ['admin']);
  if (!roleAuth.ok) return roleAuth.response;
  const auth = await requireAdminPin(req);
  if (!auth.ok) return auth.response;
  try {
    const sb   = getServerClient();
    const body = await req.json() as Record<string, unknown>;
    const rid  = restaurantId(body);

    const date = String(body.date ?? '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 });
    }
    const { from, to } = istDayRange(date);
    const summary = await computeFinanceSummary(sb, rid, from, to);
    const closedBy = (body.by as string) ?? 'Admin';

    const { data: existing } = await sb.from('daily_finance_closings')
      .select('id').eq('restaurant_id', rid).eq('business_date', date).maybeSingle();

    if (existing) {
      const { error } = await sb.from('daily_finance_closings').update({
        snapshot: summary, closed_by: closedBy, closed_at: new Date().toISOString(),
        is_closed: true, notes: (body.notes as string) ?? null,
      }).eq('id', existing.id);
      if (error) throw error;
      await logFinanceAudit(sb, {
        restaurantId: rid, entityType: 'daily_closing', entityId: existing.id as string, action: 're_close',
        changedBy: closedBy, after: summary, note: 'Re-closed after data changed post-closing',
      });
      return NextResponse.json({ id: existing.id, reClosed: true });
    }

    const id = newId('FCLOSE');
    const { error } = await sb.from('daily_finance_closings').insert({
      id, restaurant_id: rid, business_date: date, snapshot: summary,
      is_closed: true, closed_by: closedBy, notes: (body.notes as string) ?? null,
    });
    if (error) throw error;

    await logFinanceAudit(sb, {
      restaurantId: rid, entityType: 'daily_closing', entityId: id, action: 'close_day',
      changedBy: closedBy, after: summary,
    });

    return NextResponse.json({ id, reClosed: false }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/finance/closings]', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}
