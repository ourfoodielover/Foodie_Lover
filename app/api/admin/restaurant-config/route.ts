import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { resolveRestaurantName } from '@/lib/config-server';

export const dynamic = 'force-dynamic';
const RID = process.env.NEXT_PUBLIC_RESTAURANT_ID ?? 'rest_default';

// Also used by non-admin, non-authenticated surfaces (waiter/kitchen dashboards
// poll this for kitchen_mode; the /spin customer page reads restaurant_name)
// as the app's one resolved-config-for-the-browser endpoint — see
// docs/configuration-report.md. Both fields are non-secret by design.
export async function GET() {
  const sb = getServerClient();
  const [{ data }, nameResolved] = await Promise.all([
    sb.from('restaurants').select('kitchen_mode').eq('id', RID).single(),
    resolveRestaurantName(RID),
  ]);
  return NextResponse.json({
    kitchen_mode:    data?.kitchen_mode ?? 'ask',
    restaurant_name: nameResolved.value,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { kitchen_mode?: string };
  const validModes = ['ask', 'printer', 'kitchen_display'];
  if (body.kitchen_mode && !validModes.includes(body.kitchen_mode)) {
    return NextResponse.json({ error: 'Invalid kitchen_mode' }, { status: 400 });
  }
  const sb = getServerClient();
  const { error } = await sb
    .from('restaurants')
    .update({ kitchen_mode: body.kitchen_mode })
    .eq('id', RID);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
