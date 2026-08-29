// GET  /api/finance/accounts?restaurantId=      — list finance accounts
// POST /api/finance/accounts                    — create a finance account
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient, newId } from '@/lib/supabase-server';
import { requireAdminPin, errMsg, restaurantId, logFinanceAudit } from '@/lib/finance-server';
import { requireRole } from '@/lib/session-server';

export const dynamic = 'force-dynamic';

function rowToAccount(r: Record<string, unknown>) {
  return {
    id:                    r.id as string,
    name:                  r.name as string,
    type:                  r.type as string,
    openingBalance:        Number(r.opening_balance) || 0,
    paymentMethodKeywords: (r.payment_method_keywords as string[]) ?? [],
    isDefault:             !!r.is_default,
    isActive:              !!r.is_active,
    sortOrder:             Number(r.sort_order) || 0,
    createdAt:             r.created_at as string,
    updatedAt:             r.updated_at as string,
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

    let query = sb.from('finance_accounts').select('*').eq('restaurant_id', rid);
    if (!includeInactive) query = query.eq('is_active', true);
    const { data, error } = await query.order('sort_order').order('created_at');
    if (error) throw error;
    return NextResponse.json((data ?? []).map(r => rowToAccount(r as Record<string, unknown>)));
  } catch (err) {
    console.error('[GET /api/finance/accounts]', err);
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
    const type = String(body.type ?? 'cash');
    if (!['cash', 'bank', 'digital', 'other'].includes(type)) {
      return NextResponse.json({ error: 'invalid type' }, { status: 400 });
    }

    const id = newId('FACC');
    const { error } = await sb.from('finance_accounts').insert({
      id,
      restaurant_id:           rid,
      name,
      type,
      opening_balance:         Number(body.openingBalance) || 0,
      payment_method_keywords: Array.isArray(body.paymentMethodKeywords) ? body.paymentMethodKeywords : [],
      is_default:              !!body.isDefault,
      sort_order:              Number(body.sortOrder) || 0,
    });
    if (error) throw error;

    await logFinanceAudit(sb, {
      restaurantId: rid, entityType: 'account', entityId: id, action: 'create',
      changedBy: (body.by as string) ?? 'Admin', after: { name, type },
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/finance/accounts]', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}
