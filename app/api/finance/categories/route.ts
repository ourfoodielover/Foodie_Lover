// GET  /api/finance/categories?restaurantId=&kind=   — list finance categories
// POST /api/finance/categories                        — create a category
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient, newId } from '@/lib/supabase-server';
import { requireAdminPin, errMsg, restaurantId } from '@/lib/finance-server';
import { requireRole } from '@/lib/session-server';

export const dynamic = 'force-dynamic';

function rowToCategory(r: Record<string, unknown>) {
  return {
    id:       r.id as string,
    name:     r.name as string,
    kind:     r.kind as string,
    color:    (r.color as string | null) ?? undefined,
    archived: !!r.archived,
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
    const rid  = restaurantId(null, url);
    const kind = url.searchParams.get('kind');

    let query = sb.from('finance_categories').select('*').eq('restaurant_id', rid).eq('archived', false);
    if (kind) query = query.eq('kind', kind);
    const { data, error } = await query.order('name');
    if (error) throw error;
    return NextResponse.json((data ?? []).map(r => rowToCategory(r as Record<string, unknown>)));
  } catch (err) {
    console.error('[GET /api/finance/categories]', err);
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
    const kind = String(body.kind ?? '');
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });
    if (!['income', 'expense'].includes(kind)) {
      return NextResponse.json({ error: 'kind must be income or expense' }, { status: 400 });
    }

    const id = newId('FCAT');
    const { error } = await sb.from('finance_categories').insert({
      id, restaurant_id: rid, name, kind, color: (body.color as string) ?? null,
    });
    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'A category with this name already exists' }, { status: 409 });
      }
      throw error;
    }
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/finance/categories]', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}
