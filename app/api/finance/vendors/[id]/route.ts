// PATCH /api/finance/vendors/[id]  — update a vendor (incl. archive)
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

    const { data: before } = await sb.from('vendors').select('*').eq('id', id).maybeSingle();
    if (!before) return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });

    const updates: Record<string, unknown> = {};
    if (body.name !== undefined)        updates.name = String(body.name).trim();
    if (body.contactName !== undefined) updates.contact_name = body.contactName;
    if (body.phone !== undefined)       updates.phone = body.phone;
    if (body.email !== undefined)       updates.email = body.email;
    if (body.notes !== undefined)       updates.notes = body.notes;
    if (body.isActive !== undefined)    updates.is_active = !!body.isActive;

    const { error } = await sb.from('vendors').update(updates).eq('id', id);
    if (error) throw error;

    await logFinanceAudit(sb, {
      restaurantId: rid, entityType: 'vendor', entityId: id,
      action: body.isActive === false ? 'archive' : 'update',
      changedBy: (body.by as string) ?? 'Admin', before, after: updates,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[PATCH /api/finance/vendors/[id]]', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}
