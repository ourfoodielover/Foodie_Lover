import { NextRequest, NextResponse } from 'next/server';
import { getServerClient, newId } from '@/lib/supabase-server';
import { requireRole } from '@/lib/session-server';

export const dynamic = 'force-dynamic';
const RID = process.env.NEXT_PUBLIC_RESTAURANT_ID ?? 'rest_default';

/** Returns the ISO string of today's midnight in IST (UTC+5:30). */
function todayStartIST(): string {
  const now = new Date();
  const istOffsetMs = 330 * 60 * 1000; // 5h 30m in ms
  const istNow = new Date(now.getTime() + istOffsetMs);
  // Midnight in IST expressed as UTC epoch
  const istMidnightUTC = Date.UTC(
    istNow.getUTCFullYear(),
    istNow.getUTCMonth(),
    istNow.getUTCDate(),
  );
  return new Date(istMidnightUTC - istOffsetMs).toISOString();
}

export async function GET(req: NextRequest) {
  const auth = requireRole(req, ['admin']);
  if (!auth.ok) return auth.response;
  const sb = getServerClient();
  const exportCsv = req.nextUrl.searchParams.get('export') === 'csv';

  // Fetch all non-archived rewards for this restaurant
  const { data: rewards, error } = await sb
    .from('spin_rewards')
    .select('*')
    .eq('restaurant_id', RID)
    .neq('archived', true)   // safe before & after migration_015 (NULL != true)
    .order('sort_order');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!rewards) return NextResponse.json([]);

  // Attach today's IST coupon issue count per reward (daily_usage)
  const dayStart = todayStartIST();
  type RewardRec = typeof rewards[number] & { daily_usage: number };
  const withUsage: RewardRec[] = await Promise.all(
    (rewards as Array<typeof rewards[number]>).map(async r => {
      if ((r as Record<string, unknown>).reward_type === 'no_reward') {
        return { ...r, daily_usage: 0 } as RewardRec;
      }
      const { count } = await sb
        .from('reward_coupons')
        .select('id', { count: 'exact', head: true })
        .eq('reward_id', (r as Record<string, unknown>).id as string)
        .gte('issued_at', dayStart);
      return { ...r, daily_usage: count ?? 0 } as RewardRec;
    }),
  );

  // ── CSV export ───────────────────────────────────────────────────────────────
  if (exportCsv) {
    const header = 'id,label,type,value,weight,max_discount,daily_win_limit,min_next_order,expires_days,active';
    const csvRows = withUsage.map(r => [
      r.id,
      `"${String(r.label).replace(/"/g, '""')}"`,
      r.reward_type,
      r.reward_value,
      r.weight,
      r.max_discount ?? '',
      r.daily_win_limit ?? 0,   // 0 in CSV = unlimited (NULL in DB)
      r.min_next_order,
      r.expires_days,
      r.active ? 'true' : 'false',
    ].join(','));
    const csv = [header, ...csvRows].join('\n');
    const date = new Date().toISOString().slice(0, 10);
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="spin-rewards-${date}.csv"`,
      },
    });
  }

  return NextResponse.json(withUsage);
}

export async function POST(req: NextRequest) {
  const auth = requireRole(req, ['admin']);
  if (!auth.ok) return auth.response;
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
    id:                       newId('RWD'),
    restaurant_id:            RID,
    label:                    body.label,
    reward_type:              body.reward_type,
    reward_value:             body.reward_value ?? 0,
    free_item_id:             body.free_item_id ?? null,
    weight:                   body.weight ?? 1,
    min_next_order:           body.min_next_order ?? 0,
    expires_days:             body.expires_days ?? 30,
    active:                   body.active ?? true,
    sort_order:               body.sort_order ?? 0,
    archived:                 false,
    // v014
    max_discount:             body.max_discount ?? null,
    daily_win_limit:          body.daily_win_limit ?? null,
    monthly_win_limit:        body.monthly_win_limit ?? null,
    bogo_eligible_items:      body.bogo_eligible_items ?? [],
    bogo_eligible_categories: body.bogo_eligible_categories ?? [],
    max_free_item_value:      body.max_free_item_value ?? null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
