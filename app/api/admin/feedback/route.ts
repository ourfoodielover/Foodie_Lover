import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { requireRole } from '@/lib/session-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = requireRole(req, ['admin']);
  if (!auth.ok) return auth.response;
  const sb = getServerClient();
  const { data } = await sb
    .from('order_feedback')
    .select('*, orders(order_number, type, customer_name, total, created_at)')
    .order('created_at', { ascending: false })
    .limit(100);
  return NextResponse.json(data ?? []);
}
