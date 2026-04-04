// GET    /api/expenses?restaurantId=  — list expenses (optional ?since=&category=)
// POST   /api/expenses                — add expense
// DELETE /api/expenses?id=            — delete expense
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient, newId } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err)
    return String((err as { message: unknown }).message);
  return String(err);
}

function rowToExpense(r: Record<string, unknown>) {
  return {
    id:          r.id          as string,
    category:    r.category    as string,
    description: (r.description ?? '') as string,
    amount:      Number(r.amount),
    date:        r.date        as string,
    addedBy:     (r.created_by ?? '') as string,
    createdAt:   r.created_at  as string,
  };
}

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const sb       = getServerClient();
    const url      = new URL(req.url);
    const rid      = url.searchParams.get('restaurantId') ?? 'rest_default';
    const since    = url.searchParams.get('since');
    const category = url.searchParams.get('category');

    let query = sb
      .from('expenses')
      .select('id, category, description, amount, date, created_by, created_at')
      .eq('restaurant_id', rid)
      .order('created_at', { ascending: false })
      .limit(500);

    if (since)    query = query.gte('created_at', since);
    if (category) query = query.eq('category', category);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json((data ?? []).map(r => rowToExpense(r as Record<string, unknown>)));
  } catch (err) {
    console.error('[GET /api/expenses]', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}

// ── POST ──────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const sb   = getServerClient();
    const body = await req.json() as Record<string, unknown>;
    const rid  = (body.restaurantId as string | undefined) ?? 'rest_default';

    if (!body.category || !body.amount) {
      return NextResponse.json({ error: 'category and amount are required' }, { status: 400 });
    }
    const amount = Number(body.amount);
    if (!isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 });
    }

    const id = newId('EXP');
    const today = new Date().toISOString().slice(0, 10);

    const { error } = await sb.from('expenses').insert({
      id,
      restaurant_id: rid,
      category:      String(body.category),
      description:   body.description ? String(body.description) : null,
      amount:        Math.round(amount * 100) / 100,
      date:          (body.date as string | undefined) ?? today,
      created_by:    (body.addedBy as string | undefined) ?? null,
    });
    if (error) throw error;

    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/expenses]', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}

// ── DELETE ────────────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const sb  = getServerClient();
    const url = new URL(req.url);
    const id  = url.searchParams.get('id');
    const rid = url.searchParams.get('restaurantId') ?? 'rest_default';

    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const { error } = await sb.from('expenses').delete().eq('id', id).eq('restaurant_id', rid);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/expenses]', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}
