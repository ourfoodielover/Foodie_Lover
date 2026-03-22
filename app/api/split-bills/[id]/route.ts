// PATCH /api/split-bills/[id]  — update entries (mark entry paid, etc.)
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
type Ctx = { params: Promise<{ id: string }> };

interface SplitEntry {
  label:          string;
  amount:         number;
  paid:           boolean;
  paidAt?:        string | null;
  paidBy?:        string | null;
  paymentMethod?: string | null;
}

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err)
    return String((err as { message: unknown }).message);
  return String(err);
}

// ── PATCH ─────────────────────────────────────────────────────────────────────
// Body: { entries: SplitEntry[] }   — replaces the full entries array
export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const sb     = getServerClient();
    const body   = await req.json() as Record<string, unknown>;

    if (!body.entries || !Array.isArray(body.entries)) {
      return NextResponse.json({ error: 'entries array is required' }, { status: 400 });
    }

    const entries = body.entries as SplitEntry[];
    const { data, error } = await sb
      .from('split_bills')
      .update({ entries, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, tab_id, mode, entries, created_at, updated_at')
      .single();
    if (error) throw error;

    const r = data as Record<string, unknown>;
    return NextResponse.json({
      id:        r.id,
      tabId:     r.tab_id,
      mode:      r.mode,
      entries:   r.entries,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    });
  } catch (err) {
    console.error('[PATCH /api/split-bills/[id]]', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}
