import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json() as Record<string, unknown>;
  const sb = getServerClient();
  const { error } = await sb.from('spin_rewards').update(body).eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const sb = getServerClient();
  await sb.from('spin_rewards').update({ active: false }).eq('id', params.id);
  return NextResponse.json({ ok: true });
}
