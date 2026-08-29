// POST /api/finance/closings/reopen — mark a closed day as reopened (advisory
// only — never blocks edits either way; this just clears the "closed" badge
// and records who/when reopened it for the audit trail).
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { requireAdminPin, errMsg, restaurantId, logFinanceAudit } from '@/lib/finance-server';
import { requireRole } from '@/lib/session-server';

export const dynamic = 'force-dynamic';

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

    const { data: existing } = await sb.from('daily_finance_closings')
      .select('id').eq('restaurant_id', rid).eq('business_date', date).maybeSingle();
    if (!existing) return NextResponse.json({ error: 'No closing found for this date' }, { status: 404 });

    const by = (body.by as string) ?? 'Admin';
    const { error } = await sb.from('daily_finance_closings').update({
      is_closed: false, reopened_by: by, reopened_at: new Date().toISOString(),
    }).eq('id', existing.id);
    if (error) throw error;

    await logFinanceAudit(sb, {
      restaurantId: rid, entityType: 'daily_closing', entityId: existing.id as string, action: 'reopen',
      changedBy: by, note: (body.reason as string) ?? undefined,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[POST /api/finance/closings/reopen]', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}
