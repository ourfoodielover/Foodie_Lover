// GET  /api/finance/salary-config?restaurantId=&staffId=   — current + historical salary rates
// POST /api/finance/salary-config                           — set a new rate (keeps history)
//
// Reuses the EXISTING `staff` table (staffId FK) — no duplicate employee
// record is created. Setting a new rate does not overwrite the old one: the
// previous active row for that staff member is marked is_active=false and a
// new row is inserted, so past rates remain visible.
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient, newId } from '@/lib/supabase-server';
import { requireAdminPin, errMsg, restaurantId, logFinanceAudit } from '@/lib/finance-server';
import { requireRole } from '@/lib/session-server';

export const dynamic = 'force-dynamic';

function rowToConfig(r: Record<string, unknown>) {
  return {
    id:            r.id as string,
    staffId:       r.staff_id as string,
    salaryType:    r.salary_type as string,
    amount:        Number(r.amount) || 0,
    effectiveFrom: r.effective_from as string,
    isActive:      !!r.is_active,
    createdAt:     r.created_at as string,
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
    const staffId = url.searchParams.get('staffId');

    let query = sb.from('staff_salary_config').select('*').eq('restaurant_id', rid);
    if (staffId) query = query.eq('staff_id', staffId);
    const { data, error } = await query.order('effective_from', { ascending: false });
    if (error) throw error;
    return NextResponse.json((data ?? []).map(r => rowToConfig(r as Record<string, unknown>)));
  } catch (err) {
    console.error('[GET /api/finance/salary-config]', err);
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

    const staffId = String(body.staffId ?? '');
    if (!staffId) return NextResponse.json({ error: 'staffId is required' }, { status: 400 });
    const salaryType = String(body.salaryType ?? 'monthly');
    if (!['monthly', 'daily', 'hourly'].includes(salaryType)) {
      return NextResponse.json({ error: 'salaryType must be monthly, daily or hourly' }, { status: 400 });
    }
    const amount = Number(body.amount);
    if (!isFinite(amount) || amount < 0) {
      return NextResponse.json({ error: 'amount must be a non-negative number' }, { status: 400 });
    }

    // Deactivate the previous active config for this staff member (history preserved, not overwritten).
    await sb.from('staff_salary_config').update({ is_active: false }).eq('staff_id', staffId).eq('is_active', true);

    const id = newId('SALC');
    const { error } = await sb.from('staff_salary_config').insert({
      id, restaurant_id: rid, staff_id: staffId, salary_type: salaryType,
      amount: Math.round(amount * 100) / 100,
      effective_from: (body.effectiveFrom as string) ?? new Date().toISOString(),
      created_by: (body.by as string) ?? 'Admin',
    });
    if (error) throw error;

    await logFinanceAudit(sb, {
      restaurantId: rid, entityType: 'salary_config', entityId: id, action: 'create',
      changedBy: (body.by as string) ?? 'Admin', after: { staffId, salaryType, amount },
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/finance/salary-config]', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}
