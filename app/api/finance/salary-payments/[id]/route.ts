// DELETE /api/finance/salary-payments/[id]  — void a salary payment (also
// voids the linked ledger entry so the two stay consistent).
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { requireAdminPin, errMsg, restaurantId, logFinanceAudit } from '@/lib/finance-server';

export const dynamic = 'force-dynamic';
type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const auth = await requireAdminPin(req);
  if (!auth.ok) return auth.response;
  try {
    const { id } = await ctx.params;
    const sb  = getServerClient();
    const url = new URL(req.url);
    const rid = restaurantId(null, url);
    const by     = url.searchParams.get('by') ?? 'Admin';
    const reason = url.searchParams.get('reason') ?? undefined;

    const { data: payment } = await sb.from('salary_payments').select('*').eq('id', id).maybeSingle();
    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    if (payment.is_voided) return NextResponse.json({ error: 'Payment already voided' }, { status: 409 });

    await sb.from('salary_payments').update({ is_voided: true }).eq('id', id);
    await sb.from('finance_transactions').update({
      is_voided: true, voided_at: new Date().toISOString(), voided_by: by, voided_reason: reason ?? 'Salary payment voided',
    }).eq('source', 'salary_payment').eq('source_id', id);

    await logFinanceAudit(sb, {
      restaurantId: rid, entityType: 'salary_payment', entityId: id, action: 'void',
      changedBy: by, before: payment, note: reason,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/finance/salary-payments/[id]]', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}
