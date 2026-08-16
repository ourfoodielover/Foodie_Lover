import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
const RID = process.env.NEXT_PUBLIC_RESTAURANT_ID ?? 'rest_default';

export async function GET() {
  const sb = getServerClient();
  const { data } = await sb
    .from('restaurants')
    .select('kitchen_mode')
    .eq('id', RID)
    .single();
  return NextResponse.json(data ?? { kitchen_mode: 'ask' });
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
