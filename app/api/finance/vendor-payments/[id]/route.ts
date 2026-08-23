// DELETE /api/finance/vendor-payments/[id]  — void a payment (reverses the
// parent purchase's amount_paid/status and voids the linked ledger entry
// together, so all three stay consistent).
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

    const { data: payment } = await sb.from('vendor_payments').select('*').eq('id', id).maybeSingle();
    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    if (payment.is_voided) return NextResponse.json({ error: 'Payment already voided' }, { status: 409 });

    const { data: purchase } = await sb.from('vendor_purchases').select('*').eq('id', payment.vendor_purchase_id).maybeSingle();

    const { error: voidErr } = await sb.from('vendor_payments').update({ is_voided: true }).eq('id', id);
    if (voidErr) throw voidErr;

    if (purchase) {
      const newAmountPaid = Math.max(0, Math.round((Number(purchase.amount_paid) - Number(payment.amount)) * 100) / 100);
      const newStatus = newAmountPaid <= 0.01 ? 'unpaid' : newAmountPaid >= Number(purchase.amount) - 0.01 ? 'paid' : 'partially_paid';
      await sb.from('vendor_purchases').update({
        amount_paid: newAmountPaid, status: newStatus, updated_at: new Date().toISOString(),
      }).eq('id', purchase.id);
    }

    await sb.from('finance_transactions').update({
      is_voided: true, voided_at: new Date().toISOString(), voided_by: by, voided_reason: reason ?? 'Vendor payment voided',
    }).eq('source', 'vendor_payment').eq('source_id', id);

    await logFinanceAudit(sb, {
      restaurantId: rid, entityType: 'vendor_payment', entityId: id, action: 'void',
      changedBy: by, before: payment, note: reason,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/finance/vendor-payments/[id]]', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}
