// PATCH  /api/finance/accounts/[id]  — update a finance account (incl. archive)
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { requireAdminPin, errMsg, restaurantId, logFinanceAudit } from '@/lib/finance-server';
import { requireRole } from '@/lib/session-server';

export const dynamic = 'force-dynamic';
type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const roleAuth = requireRole(req, ['admin']);
  if (!roleAuth.ok) return roleAuth.response;
  const auth = await requireAdminPin(req);
  if (!auth.ok) return auth.response;
  try {
    const { id } = await ctx.params;
    const sb   = getServerClient();
    const body = await req.json() as Record<string, unknown>;
    const rid  = restaurantId(body);

    const { data: before } = await sb.from('finance_accounts').select('*').eq('id', id).maybeSingle();
    if (!before) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.name !== undefined)                   updates.name = String(body.name).trim();
    if (body.type !== undefined)                    updates.type = String(body.type);
    if (body.openingBalance !== undefined)          updates.opening_balance = Number(body.openingBalance) || 0;
    if (body.paymentMethodKeywords !== undefined)   updates.payment_method_keywords = body.paymentMethodKeywords;
    if (body.isDefault !== undefined)                updates.is_default = !!body.isDefault;
    if (body.isActive !== undefined)                 updates.is_active = !!body.isActive;
    if (body.sortOrder !== undefined)                updates.sort_order = Number(body.sortOrder) || 0;

    const { error } = await sb.from('finance_accounts').update(updates).eq('id', id);
    if (error) throw error;

    await logFinanceAudit(sb, {
      restaurantId: rid, entityType: 'account', entityId: id,
      action: body.isActive === false ? 'archive' : 'update',
      changedBy: (body.by as string) ?? 'Admin', before, after: updates,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[PATCH /api/finance/accounts/[id]]', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}
