// PATCH /api/finance/transactions/[id]  — edit a manual transaction (audited)
// DELETE /api/finance/transactions/[id] — void a manual transaction (soft delete, audited)
//
// Only source='manual' rows can be edited/voided here. Rows auto-posted by a
// vendor payment or salary payment (source='vendor_payment'/'salary_payment')
// must be voided through their own record (/api/finance/vendor-payments/[id]
// or /api/finance/salary-payments/[id]) so the parent vendor_purchases /
// salary bookkeeping stays consistent with the linked ledger entry.
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { requireAdminPin, errMsg, restaurantId, logFinanceAudit } from '@/lib/finance-server';

export const dynamic = 'force-dynamic';
type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = await requireAdminPin(req);
  if (!auth.ok) return auth.response;
  try {
    const { id } = await ctx.params;
    const sb   = getServerClient();
    const body = await req.json() as Record<string, unknown>;
    const rid  = restaurantId(body);

    const { data: before } = await sb.from('finance_transactions').select('*').eq('id', id).maybeSingle();
    if (!before) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    if (before.source !== 'manual') {
      return NextResponse.json({
        error: `This entry was auto-created from a ${before.source === 'vendor_payment' ? 'vendor payment' : 'salary payment'}. Edit or void it from there instead.`,
      }, { status: 409 });
    }
    if (before.is_voided) {
      return NextResponse.json({ error: 'Cannot edit a voided transaction' }, { status: 409 });
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.amount !== undefined) {
      const amt = Number(body.amount);
      if (!isFinite(amt) || amt <= 0) return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 });
      updates.amount = Math.round(amt * 100) / 100;
    }
    if (body.description !== undefined)   updates.description = body.description;
    if (body.categoryId !== undefined)     updates.category_id = body.categoryId;
    if (body.accountId !== undefined)      updates.account_id = body.accountId;
    if (body.occurredAt !== undefined)     updates.occurred_at = body.occurredAt;

    const { error } = await sb.from('finance_transactions').update(updates).eq('id', id);
    if (error) throw error;

    await logFinanceAudit(sb, {
      restaurantId: rid, entityType: 'transaction', entityId: id, action: 'update',
      changedBy: (body.by as string) ?? 'Admin', before, after: updates,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[PATCH /api/finance/transactions/[id]]', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const auth = await requireAdminPin(req);
  if (!auth.ok) return auth.response;
  try {
    const { id } = await ctx.params;
    const sb  = getServerClient();
    const url = new URL(req.url);
    const rid = restaurantId(null, url);
    const reason = url.searchParams.get('reason') ?? undefined;
    const by     = url.searchParams.get('by') ?? 'Admin';

    const { data: before } = await sb.from('finance_transactions').select('*').eq('id', id).maybeSingle();
    if (!before) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    if (before.source !== 'manual') {
      return NextResponse.json({
        error: `This entry was auto-created from a ${before.source === 'vendor_payment' ? 'vendor payment' : 'salary payment'}. Void it from there instead.`,
      }, { status: 409 });
    }

    const { error } = await sb.from('finance_transactions').update({
      is_voided: true, voided_at: new Date().toISOString(), voided_by: by, voided_reason: reason ?? null,
      updated_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) throw error;

    await logFinanceAudit(sb, {
      restaurantId: rid, entityType: 'transaction', entityId: id, action: 'void',
      changedBy: by, before, note: reason,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/finance/transactions/[id]]', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}
