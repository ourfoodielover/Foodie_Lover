// GET /api/finance/audit-log?restaurantId=&entityType=&entityId=&limit=
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { requireAdminPin, errMsg, restaurantId } from '@/lib/finance-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireAdminPin(req);
  if (!auth.ok) return auth.response;
  try {
    const sb  = getServerClient();
    const url = new URL(req.url);
    const rid = restaurantId(null, url);
    const entityType = url.searchParams.get('entityType');
    const entityId   = url.searchParams.get('entityId');
    const limit      = Math.min(parseInt(url.searchParams.get('limit') ?? '200'), 1000);

    let query = sb.from('finance_audit_log').select('*').eq('restaurant_id', rid)
      .order('changed_at', { ascending: false }).limit(limit);
    if (entityType) query = query.eq('entity_type', entityType);
    if (entityId)   query = query.eq('entity_id', entityId);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json((data ?? []).map(r => ({
      id:         r.id,
      entityType: r.entity_type,
      entityId:   r.entity_id,
      action:     r.action,
      changedBy:  r.changed_by,
      changedAt:  r.changed_at,
      before:     r.before_data,
      after:      r.after_data,
      note:       r.note,
    })));
  } catch (err) {
    console.error('[GET /api/finance/audit-log]', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}
