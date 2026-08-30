// GET  /api/finance/salary-payments?restaurantId=&employeeId=
// POST /api/finance/salary-payments  — record a salary disbursement
//
// Keyed by `employeeId` (supabase/migration_025_employee_payroll.sql) —
// works identically for a staff-linked employee (e.g. Waiter) and a
// payroll-only employee with no login account (e.g. Head Chef).
//
// Each payment posts exactly one linked finance_transactions row
// (source='salary_payment') automatically — Admin does not separately create
// a matching expense for the same salary payment (prevents double-counting;
// see create_employee_salary_payment()'s comment for how this is enforced).
//
// POST delegates the insert-payment + insert-ledger-row sequence to the
// atomic create_employee_salary_payment() Postgres function
// (migration_025_employee_payroll.sql — modeled on the existing, untouched
// create_salary_payment() from migration_023_finance_atomicity.sql), which
// accepts an optional idempotency key so a retried request after a network
// timeout returns the original result instead of creating a duplicate
// payment.
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient, newId } from '@/lib/supabase-server';
import { requireAdminPin, errMsg, restaurantId, logFinanceAudit } from '@/lib/finance-server';
import { requireRole } from '@/lib/session-server';

export const dynamic = 'force-dynamic';

function rowToPayment(r: Record<string, unknown>) {
  return {
    id:             r.id as string,
    employeeId:     r.employee_id as string | null,
    staffId:        (r.staff_id as string | null) ?? undefined,
    salaryConfigId: (r.salary_config_id as string | null) ?? undefined,
    accountId:      r.account_id as string,
    periodLabel:    r.period_label as string,
    amount:         Number(r.amount) || 0,
    paidAt:         r.paid_at as string,
    note:           (r.note as string | null) ?? undefined,
    isVoided:       !!r.is_voided,
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

    let query = sb.from('salary_payments').select('*').eq('restaurant_id', rid).eq('is_voided', false);
    if (employeeId) query = query.eq('employee_id', employeeId);
    const { data, error } = await query.order('paid_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json((data ?? []).map(r => rowToPayment(r as Record<string, unknown>)));
  } catch (err) {
    console.error('[GET /api/finance/salary-payments]', err);
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
    const accountId = String(body.accountId ?? '');
    if (!accountId) return NextResponse.json({ error: 'accountId is required' }, { status: 400 });
    const periodLabel = String(body.periodLabel ?? '').trim();
    if (!periodLabel) return NextResponse.json({ error: 'periodLabel is required (e.g. "August 2026")' }, { status: 400 });
    const amount = Number(body.amount);
    if (!isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 });
    }

    const { data: employee } = await sb.from('employees').select('id, name, linked_staff_id')
      .eq('id', employeeId).eq('restaurant_id', rid).maybeSingle();
    if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    const roundedAmt = Math.round(amount * 100) / 100;
    const paidAt = (body.paidAt as string) ?? new Date().toISOString();
    const createdBy = (body.by as string) ?? 'Admin';
    const idempotencyKey = (body.idempotencyKey as string) || null;

    const id = newId('SALP');
    const { data: salaryCat } = await sb.from('finance_categories')
      .select('id').eq('restaurant_id', rid).eq('kind', 'expense').eq('name', 'Staff Salary').maybeSingle();
    const description = `Salary — ${employee.name} (${periodLabel})`;

    const { data: rpcData, error: rpcErr } = await sb.rpc('create_employee_salary_payment', {
      p_payment_id: id,
      p_restaurant_id: rid,
      p_employee_id: employeeId,
      p_staff_id: employee.linked_staff_id ?? null,
      p_salary_config_id: (body.salaryConfigId as string) ?? null,
      p_account_id: accountId,
      p_period_label: periodLabel,
      p_amount: roundedAmt,
      p_paid_at: paidAt,
      p_note: (body.note as string) ?? null,
      p_created_by: createdBy,
      p_category_id: salaryCat?.id ?? null,
      p_description: description,
      p_idempotency_key: idempotencyKey,
    });
    if (rpcErr) throw rpcErr;

    const result = rpcData as { ok: boolean; error?: string; id?: string; already_exists?: boolean };
    if (!result.ok) {
      throw new Error(`create_employee_salary_payment RPC failed: ${result.error ?? 'unknown'}`);
    }

    const resultId = result.id ?? id;
    if (!result.already_exists) {
      await logFinanceAudit(sb, {
        restaurantId: rid, entityType: 'salary_payment', entityId: resultId, action: 'create',
        changedBy: createdBy, after: { employeeId, periodLabel, amount: roundedAmt },
      });
    }

    return NextResponse.json({ id: resultId }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/finance/salary-payments]', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}
