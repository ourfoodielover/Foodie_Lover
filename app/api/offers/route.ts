// GET    /api/offers                  — return all offer rules
// POST   /api/offers  { rule }        — add a new rule
// PATCH  /api/offers  { id, updates } — update a rule by id
// DELETE /api/offers  { id }          — remove a rule by id
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export interface OfferRule {
  id: string;
  name: string;
  type: 'percent' | 'flat';
  value: number;
  minOrder: number;
  maxDiscount: number;
  applyTo: 'all' | 'dine-in' | 'pickup' | 'delivery';
  active: boolean;
}

const SETTING_KEY = 'discount_offers';
const rid = () => process.env.NEXT_PUBLIC_RESTAURANT_ID ?? 'rest_default';

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err)
    return String((err as { message: unknown }).message);
  return String(err);
}

async function getRules(sb: ReturnType<typeof getServerClient>): Promise<OfferRule[]> {
  const { data, error } = await sb
    .from('restaurant_settings')
    .select('value')
    .eq('restaurant_id', rid())
    .eq('key', SETTING_KEY)
    .maybeSingle();
  if (error) throw error;
  if (!data?.value) return [];
  try {
    return JSON.parse(data.value) as OfferRule[];
  } catch {
    return [];
  }
}

async function saveRules(sb: ReturnType<typeof getServerClient>, rules: OfferRule[]): Promise<void> {
  const { error } = await sb
    .from('restaurant_settings')
    .upsert(
      { restaurant_id: rid(), key: SETTING_KEY, value: JSON.stringify(rules), updated_at: new Date().toISOString() },
      { onConflict: 'restaurant_id,key' },
    );
  if (error) throw error;
}

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET() {
  try {
    const sb = getServerClient();
    const rules = await getRules(sb);
    return NextResponse.json(rules);
  } catch (err) {
    console.error('[GET /api/offers]', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}

// ── POST ──────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const sb   = getServerClient();
    const body = await req.json() as { rule?: OfferRule };
    if (!body.rule) return NextResponse.json({ error: 'rule is required' }, { status: 400 });
    const rules = await getRules(sb);
    rules.push(body.rule);
    await saveRules(sb, rules);
    return NextResponse.json(rules);
  } catch (err) {
    console.error('[POST /api/offers]', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}

// ── PATCH ─────────────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  try {
    const sb   = getServerClient();
    const body = await req.json() as { id?: string; updates?: Partial<OfferRule> };
    if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    const rules = await getRules(sb);
    const idx   = rules.findIndex(r => r.id === body.id);
    if (idx === -1) return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    rules[idx] = { ...rules[idx], ...body.updates };
    await saveRules(sb, rules);
    return NextResponse.json(rules);
  } catch (err) {
    console.error('[PATCH /api/offers]', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}

// ── DELETE ────────────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const sb   = getServerClient();
    const body = await req.json() as { id?: string };
    if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    const rules    = await getRules(sb);
    const filtered = rules.filter(r => r.id !== body.id);
    await saveRules(sb, filtered);
    return NextResponse.json(filtered);
  } catch (err) {
    console.error('[DELETE /api/offers]', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}
