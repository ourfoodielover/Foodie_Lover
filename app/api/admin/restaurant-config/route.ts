import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { resolveRestaurantName, resolveKitchenMode } from '@/lib/config-server';
import { requireRole } from '@/lib/session-server';

export const dynamic = 'force-dynamic';
const RID = process.env.NEXT_PUBLIC_RESTAURANT_ID ?? 'rest_default';

// Also used by non-admin, non-authenticated surfaces (waiter/kitchen dashboards
// poll this for kitchen_mode; the /spin customer page reads restaurant_name)
// as the app's one resolved-config-for-the-browser endpoint — see
// docs/configuration-report.md. Both fields are non-secret by design.
//
// kitchen_mode resolution now goes through the shared resolveKitchenMode()
// (lib/config-server.ts) instead of a second hand-rolled query — this used to
// be two independent implementations that happened to agree (audit finding M1).
export async function GET() {
  const [kitchenResolved, nameResolved] = await Promise.all([
    resolveKitchenMode(RID),
    resolveRestaurantName(RID),
  ]);
  return NextResponse.json({
    kitchen_mode:    kitchenResolved.value,
    restaurant_name: nameResolved.value,
  });
}

export async function POST(req: NextRequest) {
  // Only the kitchen-mode WRITE is staff-gated — GET above stays public
  // (see comment above GET: /spin and unauthenticated waiter polling depend on it).
  const auth = requireRole(req, ['admin', 'manager']);
  if (!auth.ok) return auth.response;
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
