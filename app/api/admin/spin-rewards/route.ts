import { NextRequest, NextResponse } from 'next/server';
import { getServerClient, newId } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
const RID = process.env.NEXT_PUBLIC_RESTAURANT_ID ?? 'rest_default';

export async function GET() {
  const sb = getServerClient();
  const { data } = await sb.from('spin_rewards').select('*').eq('restaurant_id', RID).order('sort_order');
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    label: string;
    reward_type: string;
    reward_value?: number;
    free_item_id?: string;
    weight?: number;
    min_next_order?: number;
    expires_days?: number;
    active?: boolean;
    sort_order?: number;
    // v014 additions
    max_discount?: number | null;
    daily_win_limit?: number | null;
    monthly_win_limit?: number | null;
    bogo_eligible_items?: string[];
    bogo_eligible_categories?: string[];
    max_free_item_value?: number | null;
  };
  const sb = getServerClient();
  const { error } = await sb.from('spin_rewards').insert({
    id:                      newId('RWD'),
    restaurant_id:           RID,
    label:                   body.label,
    reward_type:             body.reward_type,
    reward_value:            body.reward_value ?? 0,
    free_item_id:            body.free_item_id ?? null,
    weight:                  body.weight ?? 1,
    min_next_order:          body.min_next_order ?? 0,
    expires_days:            body.expires_days ?? 30,
    active:                  body.active ?? true,
    sort_order:              body.sort_order ?? 0,
    // v014
    max_discount:            body.max_discount ?? null,
    daily_win_limit:         body.daily_win_limit ?? null,
    monthly_win_limit:       body.monthly_win_limit ?? null,
    bogo_eligible_items:     body.bogo_eligible_items ?? [],
    bogo_eligible_categories: body.bogo_eligible_categories ?? [],
    max_free_item_value:     body.max_free_item_value ?? null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
