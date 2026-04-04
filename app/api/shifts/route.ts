// GET  /api/shifts
// POST /api/shifts — open shift
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
    const url = new URL(req.url);
    const rid     = url.searchParams.get('restaurantId') ?? 'rest_default';
    const staffId = url.searchParams.get('staffId');
    const openOnly = url.searchParams.get('open') === '1';

    let query = sb.from('shift_logs').select('*').eq('restaurant_id', rid);
    if (staffId) query = query.eq('staff_id', staffId);
    if (openOnly) query = query.is('shift_end', null);

    const { data, error } = await query.order('shift_start', { ascending: false });
    if (error) {
      console.error('[GET /api/shifts] Supabase error:', error.message, '| code:', error.code);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error('[GET /api/shifts] unexpected error:', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const sb   = getServerClient();
    const body = await req.json() as Record<string, unknown>;
    const rid  = (body.restaurantId as string | undefined) ?? 'rest_default';

    if (!body.staffId) {
      return NextResponse.json({ error: 'staffId is required' }, { status: 400 });
    }

    // Close any open shift for this staff member first
    await sb.from('shift_logs')
      .update({ shift_end: new Date().toISOString() })
      .eq('staff_id', body.staffId)
      .is('shift_end', null);

    const id = newId('SHF');
    const { error } = await sb.from('shift_logs').insert({
      id,
      restaurant_id: rid,
      staff_id:      body.staffId,
      staff_name:    body.staffName ?? null,
      shift_start:   new Date().toISOString(),
    });
    if (error) {
      console.error('[POST /api/shifts] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ id, staffId: body.staffId }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/shifts] unexpected error:', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}
