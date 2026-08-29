// GET  /api/finance/vendors?restaurantId=          — list vendors
// POST /api/finance/vendors                         — create a vendor
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient, newId } from '@/lib/supabase-server';
import { requireAdminPin, errMsg, restaurantId, logFinanceAudit } from '@/lib/finance-server';
import { requireRole } from '@/lib/session-server';

export const dynamic = 'force-dynamic';

function rowToVendor(r: Record<string, unknown>) {
  return {
    id:          r.id as string,
    name:        r.name as string,
    contactName: (r.contact_name as string | null) ?? undefined,
    phone:       (r.phone as string | null) ?? undefined,
    email:       (r.email as string | null) ?? undefined,
    notes:       (r.notes as string | null) ?? undefined,
    isActive:    !!r.is_active,
    createdAt:   r.created_at as string,
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

    let query = sb.from('vendors').select('*').eq('restaurant_id', rid);
    if (!includeInactive) query = query.eq('is_active', true);
    const { data, error } = await query.order('name');
    if (error) throw error;
    return NextResponse.json((data ?? []).map(r => rowToVendor(r as Record<string, unknown>)));
  } catch (err) {
    console.error('[GET /api/finance/vendors]', err);
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

    const id = newId('VEND');
    const { error } = await sb.from('vendors').insert({
      id, restaurant_id: rid, name,
      contact_name: (body.contactName as string) || null,
      phone:        (body.phone as string) || null,
      email:        (body.email as string) || null,
      notes:        (body.notes as string) || null,
    });
    if (error) throw error;

    await logFinanceAudit(sb, {
      restaurantId: rid, entityType: 'vendor', entityId: id, action: 'create',
      changedBy: (body.by as string) ?? 'Admin', after: { name },
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/finance/vendors]', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}
