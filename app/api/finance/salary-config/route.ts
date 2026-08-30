// GET  /api/finance/salary-config?restaurantId=&employeeId=  — current + historical salary rates
// POST /api/finance/salary-config                             — set a new rate (keeps history)
//
// Keyed by `employeeId` (supabase/migration_025_employee_payroll.sql) so any
// employee — staff-linked or not — can have a salary rate. `staff_id` is
// still stored on each row for backward compatibility/reporting when the
// employee happens to be linked to a staff login, but is no longer the
// primary key callers filter by. Setting a new rate does not overwrite the
// old one: the previous active row for that employee is marked
// is_active=false and a new row is inserted, so past rates remain visible
// (e.g. Jan–Jun ₹20,000/month, July onward ₹25,000/month — both stay in
// history, and past salary_payments keep referencing the config row that
// was active when they were paid via salary_config_id).
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient, newId } from '@/lib/supabase-server';
import { requireAdminPin, errMsg, restaurantId, logFinanceAudit } from '@/lib/finance-server';
import { requireRole } from '@/lib/session-server';

export const dynamic = 'force-dynamic';

function rowToConfig(r: Record<string, unknown>) {
  return {
    id:            r.id as string,
    employeeId:    r.employee_id as string | null,
    staffId:       (r.staff_id as string | null) ?? undefined,
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
    const employeeId = url.searchParams.get('employeeId');

    let query = sb.from('staff_salary_config').select('*').eq('restaurant_id', rid);
    if (employeeId) query = query.eq('employee_id', employeeId);
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

    const employeeId = String(body.employeeId ?? '');
    if (!employeeId) return NextResponse.json({ error: 'employeeId is required' }, { status: 400 });
    const salaryType = String(body.salaryType ?? 'monthly');
    if (!['monthly', 'daily', 'hourly'].includes(salaryType)) {
      return NextResponse.json({ error: 'salaryType must be monthly, daily or hourly' }, { status: 400 });
    }
    const amount = Number(body.amount);
    if (!isFinite(amount) || amount < 0) {
      return NextResponse.json({ error: 'amount must be a non-negative number' }, { status: 400 });
    }

    const { data: employee } = await sb.from('employees').select('id, linked_staff_id')
      .eq('id', employeeId).eq('restaurant_id', rid).maybeSingle();
    if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    // Deactivate the previous active config for this employee (history preserved, not overwritten).
    await sb.from('staff_salary_config').update({ is_active: false }).eq('employee_id', employeeId).eq('is_active', true);

    const id = newId('SALC');
    const { error } = await sb.from('staff_salary_config').insert({
      id, restaurant_id: rid, employee_id: employeeId, staff_id: employee.linked_staff_id ?? null,
      salary_type: salaryType,
      amount: Math.round(amount * 100) / 100,
      effective_from: (body.effectiveFrom as string) ?? new Date().toISOString(),
      created_by: (body.by as string) ?? 'Admin',
    });
    if (error) throw error;

    await logFinanceAudit(sb, {
      restaurantId: rid, entityType: 'salary_config', entityId: id, action: 'create',
      changedBy: (body.by as string) ?? 'Admin', after: { employeeId, salaryType, amount },
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/finance/salary-config]', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}
