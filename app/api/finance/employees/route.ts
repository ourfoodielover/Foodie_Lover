// GET  /api/finance/employees?restaurantId=&includeInactive=1  — payroll/HR master list
// POST /api/finance/employees                                   — add a new employee
//
// `employees` is a payroll/HR identity, independent of `staff` (application
// login accounts) — see supabase/migration_025_employee_payroll.sql. An
// employee MAY optionally be linked to an existing staff login via
// linkedStaffId, but does not require one — a Head Chef/Cleaner/Security
// guard with no app account is fully valid.
//
// Security (master-prompt requirement #12): employee/payroll data is
// sensitive, so this route uses the SAME double gate every other
// app/api/finance/** route uses — an authenticated Admin session
// (requireRole) AND the Finance/Admin PIN (requireAdminPin) — not the
// lighter session-only check app/api/staff/route.ts uses for plain login
// accounts. There is no public/unauthenticated employee endpoint.
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient, newId } from '@/lib/supabase-server';
import { requireAdminPin, errMsg, restaurantId, logFinanceAudit } from '@/lib/finance-server';
import { requireRole } from '@/lib/session-server';

export const dynamic = 'force-dynamic';

const EMPLOYMENT_TYPES = ['full_time', 'part_time', 'contract', 'temporary'] as const;

function rowToEmployee(r: Record<string, unknown>, hasHistory: boolean, linkedStaffName: string | null) {
  return {
    id:              r.id as string,
    name:            r.name as string,
    role:            r.role as string,
    phone:           (r.phone as string | null) ?? undefined,
    email:           (r.email as string | null) ?? undefined,
    joiningDate:     (r.joining_date as string | null) ?? undefined,
    employmentType:  r.employment_type as string,
    linkedStaffId:   (r.linked_staff_id as string | null) ?? undefined,
    linkedStaffName: linkedStaffName ?? undefined,
    isActive:        !!r.is_active,
    notes:           (r.notes as string | null) ?? undefined,
    createdAt:       r.created_at as string,
    updatedAt:       r.updated_at as string,
    hasHistory,
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
    const includeInactive = url.searchParams.get('includeInactive') === '1';

    let query = sb.from('employees').select('*').eq('restaurant_id', rid);
    if (!includeInactive) query = query.eq('is_active', true);
    const { data, error } = await query.order('name');
    if (error) throw error;
    const employees = (data ?? []) as Record<string, unknown>[];

    // hasHistory: any salary rate configured OR any payment ever recorded —
    // both are treated as "history" that blocks destructive deletion
    // (deactivation remains available regardless). Two aggregate queries
    // instead of N+1 per-employee lookups.
    const [{ data: configRows }, { data: paymentRows }, { data: staffRows }] = await Promise.all([
      sb.from('staff_salary_config').select('employee_id').eq('restaurant_id', rid).not('employee_id', 'is', null),
      sb.from('salary_payments').select('employee_id').eq('restaurant_id', rid).not('employee_id', 'is', null),
      sb.from('staff').select('id, name').eq('restaurant_id', rid),
    ]);
    const historyIds = new Set<string>([
      ...((configRows ?? []).map(r => r.employee_id as string)),
      ...((paymentRows ?? []).map(r => r.employee_id as string)),
    ]);
    const staffNameById = new Map<string, string>((staffRows ?? []).map(r => [r.id as string, r.name as string]));

    return NextResponse.json(employees.map(r => rowToEmployee(
      r, historyIds.has(r.id as string), staffNameById.get(r.linked_staff_id as string) ?? null,
    )));
  } catch (err) {
    console.error('[GET /api/finance/employees]', err);
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

    const name = String(body.name ?? '').trim();
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });
    const role = String(body.role ?? '').trim();
    if (!role) return NextResponse.json({ error: 'role / designation is required' }, { status: 400 });
    if (role.length > 60) return NextResponse.json({ error: 'role must be 60 characters or fewer' }, { status: 400 });

    const employmentType = String(body.employmentType ?? 'full_time');
    if (!EMPLOYMENT_TYPES.includes(employmentType as typeof EMPLOYMENT_TYPES[number])) {
      return NextResponse.json({ error: `employmentType must be one of: ${EMPLOYMENT_TYPES.join(', ')}` }, { status: 400 });
    }

    const linkedStaffId = body.linkedStaffId ? String(body.linkedStaffId) : null;
    if (linkedStaffId) {
      const { data: staffRow } = await sb.from('staff').select('id').eq('id', linkedStaffId).eq('restaurant_id', rid).maybeSingle();
      if (!staffRow) return NextResponse.json({ error: 'Linked staff account not found' }, { status: 400 });
      const { data: already } = await sb.from('employees').select('id, name').eq('linked_staff_id', linkedStaffId).maybeSingle();
      if (already) return NextResponse.json({ error: `That staff account is already linked to employee "${already.name}"` }, { status: 409 });
    }

    const id = newId('EMP');
    const by = (body.by as string) ?? 'Admin';
    const { error } = await sb.from('employees').insert({
      id,
      restaurant_id:   rid,
      name,
      role,
      phone:           (body.phone as string | undefined)?.trim() || null,
      email:           (body.email as string | undefined)?.trim() || null,
      joining_date:    (body.joiningDate as string | undefined) || null,
      employment_type: employmentType,
      linked_staff_id: linkedStaffId,
      is_active:       true,
      notes:           (body.notes as string | undefined)?.trim() || null,
      created_by:      by,
    });
    if (error) throw error;

    await logFinanceAudit(sb, {
      restaurantId: rid, entityType: 'employee', entityId: id, action: 'create',
      changedBy: by, after: { name, role, employmentType, linkedStaffId },
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/finance/employees]', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}
