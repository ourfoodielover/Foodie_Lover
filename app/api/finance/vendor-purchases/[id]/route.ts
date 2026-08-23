// PATCH /api/finance/vendor-purchases/[id]  — edit description/amount, or void
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

    const { data: before } = await sb.from('vendor_purchases').select('*').eq('id', id).maybeSingle();
    if (!before) return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });

    if (body.action === 'void') {
      if (Number(before.amount_paid) > 0) {
        return NextResponse.json(
          { error: 'Cannot void a purchase that already has payments recorded. Void the payments first.' },
          { status: 409 },
        );
      }
      const { error } = await sb.from('vendor_purchases').update({ is_voided: true, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      await logFinanceAudit(sb, {
        restaurantId: rid, entityType: 'vendor_purchase', entityId: id, action: 'void',
        changedBy: (body.by as string) ?? 'Admin', before, note: (body.reason as string) ?? undefined,
      });
      return NextResponse.json({ ok: true });
    }

    // Editing amount is only safe before any payment has been recorded —
    // afterwards amount_paid/status bookkeeping would silently go stale.
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.description !== undefined) updates.description = body.description;
    if (body.amount !== undefined) {
      if (Number(before.amount_paid) > 0) {
        return NextResponse.json(
          { error: 'Cannot change the amount after payments have been recorded against this purchase.' },
          { status: 409 },
        );
      }
      const amt = Number(body.amount);
      if (!isFinite(amt) || amt <= 0) return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 });
      updates.amount = Math.round(amt * 100) / 100;
    }

    const { error } = await sb.from('vendor_purchases').update(updates).eq('id', id);
    if (error) throw error;

    await logFinanceAudit(sb, {
      restaurantId: rid, entityType: 'vendor_purchase', entityId: id, action: 'update',
      changedBy: (body.by as string) ?? 'Admin', before, after: updates,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[PATCH /api/finance/vendor-purchases/[id]]', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}
