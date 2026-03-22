// GET  /api/tables
// POST /api/tables
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient, newId } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err) return String((err as { message: unknown }).message);
  return String(err);
}

export async function GET(req: NextRequest) {
  try {
    const sb  = getServerClient();
    const rid = new URL(req.url).searchParams.get('restaurantId') ?? 'rest_default';
    const { data, error } = await sb
      .from('tables')
      .select('*')
      .eq('restaurant_id', rid)
      .order('name');
    if (error) {
      console.error('[GET /api/tables] Supabase error:', error.message, '| code:', error.code);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json((data ?? []).map(r => ({
      id:       r.id,
      name:     r.name,
      capacity: r.capacity,
      status:   r.status,
    })));
  } catch (err) {
    console.error('[GET /api/tables] unexpected error:', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const sb   = getServerClient();
    const body = await req.json() as Record<string, unknown>;
    if (!body.name) {
      return NextResponse.json({ error: 'Table name is required' }, { status: 400 });
    }
    const id = newId('TBL');
    const { error } = await sb.from('tables').insert({
      id,
      restaurant_id: body.restaurantId ?? 'rest_default',
      name:          body.name,
      capacity:      Number(body.capacity) || 4,
      status:        'available',
    });
    if (error) {
      console.error('[POST /api/tables] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/tables] unexpected error:', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}
