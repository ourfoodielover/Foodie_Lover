// GET  /api/split-bills?tabId=       — fetch split bill for a tab
// POST /api/split-bills               — create a new split bill
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient, newId } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export interface SplitEntry {
  label:         string;
  amount:        number;
  paid:          boolean;
  paidAt?:       string | null;
  paidBy?:       string | null;
  paymentMethod?: string | null;
}

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err)
    return String((err as { message: unknown }).message);
  return String(err);
}

function rowToSplit(r: Record<string, unknown>) {
  return {
    id:         r.id         as string,
    tabId:      r.tab_id     as string,
    mode:       (r.mode ?? 'equal') as string,
    entries:    (r.entries ?? []) as SplitEntry[],
    createdAt:  r.created_at as string,
    updatedAt:  r.updated_at as string,
  };
}

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const sb    = getServerClient();
    const url   = new URL(req.url);
    const tabId = url.searchParams.get('tabId');

    if (!tabId) return NextResponse.json({ error: 'tabId is required' }, { status: 400 });

    const { data, error } = await sb
      .from('split_bills')
      .select('*')
      .eq('tab_id', tabId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;

    return NextResponse.json(data ? rowToSplit(data as Record<string, unknown>) : null);
  } catch (err) {
    console.error('[GET /api/split-bills]', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}

// ── POST ──────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const sb   = getServerClient();
    const body = await req.json() as Record<string, unknown>;
    const rid  = (body.restaurantId as string | undefined) ?? 'rest_default';

    if (!body.tabId || !body.entries) {
      return NextResponse.json({ error: 'tabId and entries are required' }, { status: 400 });
    }

    const id = newId('SPL');
    const { error } = await sb.from('split_bills').insert({
      id,
      restaurant_id: rid,
      tab_id:        body.tabId,
      mode:          (body.mode as string | undefined) ?? 'equal',
      entries:       body.entries,
    });
    if (error) throw error;

    // Return the newly created split bill
    const { data: created } = await sb.from('split_bills').select('*').eq('id', id).single();
    return NextResponse.json(rowToSplit(created as Record<string, unknown>), { status: 201 });
  } catch (err) {
    console.error('[POST /api/split-bills]', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}
