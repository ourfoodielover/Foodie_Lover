// DELETE /api/finance/vendor-payments/[id]  — void a payment (reverses the
// parent purchase's amount_paid/status and voids the linked ledger entry
// together, so all three stay consistent).
//
// Remediation (master-prompt finding #12): delegates the void sequence to
// the atomic void_vendor_payment() Postgres function (migration_023_finance_
// atomicity.sql) instead of three sequential, non-transactional writes.
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { requireAdminPin, errMsg, restaurantId, logFinanceAudit } from '@/lib/finance-server';
import { requireRole } from '@/lib/session-server';

export const dynamic = 'force-dynamic';
type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const roleAuth = requireRole(req, ['admin']);
  if (!roleAuth.ok) return roleAuth.response;
  const auth = await requireAdminPin(req);
  if (!auth.ok) return auth.response;
  try {
    const { id } = await ctx.params;
    const sb  = getServerClient();
    const url = new URL(req.url);
    const rid = restaurantId(null, url);
    const by     = url.searchParams.get('by') ?? 'Admin';
    const reason = url.searchParams.get('reason') ?? undefined;

    const { data: rpcData, error: rpcErr } = await sb.rpc('void_vendor_payment', {
      p_payment_id: id,
      p_by: by,
      p_reason: reason ?? null,
    });
    if (rpcErr) throw rpcErr;

    const result = rpcData as { ok: boolean; error?: string; voidedPaymentBefore?: Record<string, unknown> };
    if (!result.ok) {
      if (result.error === 'not_found') return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
      if (result.error === 'already_voided') return NextResponse.json({ error: 'Payment already voided' }, { status: 409 });
      throw new Error(`void_vendor_payment RPC failed: ${result.error ?? 'unknown'}`);
    }

    await logFinanceAudit(sb, {
      restaurantId: rid, entityType: 'vendor_payment', entityId: id, action: 'void',
      changedBy: by, before: result.voidedPaymentBefore, note: reason,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/finance/vendor-payments/[id]]', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}
