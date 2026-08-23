// GET  /api/finance/salary-payments?restaurantId=&staffId=
// POST /api/finance/salary-payments  — record a salary disbursement
//
// Each payment posts exactly one linked finance_transactions row
// (source='salary_payment') automatically — Admin does not separately create
// a matching expense for the same salary payment.
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient, newId } from '@/lib/supabase-server';
import { requireAdminPin, errMsg, restaurantId, logFinanceAudit } from '@/lib/finance-server';

export const dynamic = 'force-dynamic';

function rowToPayment(r: Record<string, unknown>) {
  return {
    id:             r.id as string,
    staffId:        r.staff_id as string,
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
  const auth = await requireAdminPin(req);
  if (!auth.ok) return auth.response;
  try {
    const sb  = getServerClient();
    const url = new URL(req.url);
    const rid = restaurantId(null, url);
    const staffId = url.searchParams.get('staffId');

    let query = sb.from('salary_payments').select('*').eq('restaurant_id', rid).eq('is_voided', false);
    if (staffId) query = query.eq('staff_id', staffId);
    const { data, error } = await query.order('paid_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json((data ?? []).map(r => rowToPayment(r as Record<string, unknown>)));
  } catch (err) {
    console.error('[GET /api/finance/salary-payments]', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminPin(req);
  if (!auth.ok) return auth.response;
  try {
    const sb   = getServerClient();
    const body = await req.json() as Record<string, unknown>;
    const rid  = restaurantId(body);

    const staffId = String(body.staffId ?? '');
    if (!staffId) return NextResponse.json({ error: 'staffId is required' }, { status: 400 });
    const accountId = String(body.accountId ?? '');
    if (!accountId) return NextResponse.json({ error: 'accountId is required' }, { status: 400 });
    const periodLabel = String(body.periodLabel ?? '').trim();
    if (!periodLabel) return NextResponse.json({ error: 'periodLabel is required (e.g. "August 2026")' }, { status: 400 });
    const amount = Number(body.amount);
    if (!isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 });
    }

    const { data: staff } = await sb.from('staff').select('name').eq('id', staffId).maybeSingle();
    const roundedAmt = Math.round(amount * 100) / 100;
    const paidAt = (body.paidAt as string) ?? new Date().toISOString();
    const createdBy = (body.by as string) ?? 'Admin';

    const id = newId('SALP');
    const { error: payErr } = await sb.from('salary_payments').insert({
      id, restaurant_id: rid, staff_id: staffId,
      salary_config_id: (body.salaryConfigId as string) ?? null,
      account_id: accountId, period_label: periodLabel, amount: roundedAmt,
      paid_at: paidAt, note: (body.note as string) ?? null, created_by: createdBy,
    });
    if (payErr) throw payErr;

    const { data: salaryCat } = await sb.from('finance_categories')
      .select('id').eq('restaurant_id', rid).eq('kind', 'expense').eq('name', 'Staff Salary').maybeSingle();

    const { error: txErr } = await sb.from('finance_transactions').insert({
      id: newId('FTXN'), restaurant_id: rid, type: 'expense', account_id: accountId,
      category_id: salaryCat?.id ?? null,
      amount: roundedAmt,
      description: `Salary — ${(staff?.name as string) ?? staffId} (${periodLabel})`,
      occurred_at: paidAt, source: 'salary_payment', source_id: id, created_by: createdBy,
    });
    if (txErr) throw txErr;

    await logFinanceAudit(sb, {
      restaurantId: rid, entityType: 'salary_payment', entityId: id, action: 'create',
      changedBy: createdBy, after: { staffId, periodLabel, amount: roundedAmt },
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/finance/salary-payments]', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}
