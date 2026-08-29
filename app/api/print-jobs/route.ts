// GET /api/print-jobs — polled by the companion print agent.
// Returns queued (and previously-failed, for retry) print jobs, oldest first.
//
// Auth: requires header `x-print-agent-key` matching env PRINT_AGENT_KEY.
// This is a simple shared-secret check appropriate for a LAN-only agent —
// it is NOT a substitute for restricting network access to this endpoint.
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

function checkAuth(req: NextRequest): boolean {
  const expected = process.env.PRINT_AGENT_KEY;
  // Remediation: this used to fall OPEN ("allow") whenever PRINT_AGENT_KEY
  // was unset — exactly the state a fresh deploy is in until someone
  // remembers to set it. This endpoint returns print-job payloads (customer
  // name, table, items) with no other auth layer, so failing open handed
  // that out to anyone. It now fails CLOSED: with no key configured, every
  // request is rejected until PRINT_AGENT_KEY is set.
  if (!expected) {
    console.warn('[GET /api/print-jobs] PRINT_AGENT_KEY is not set — denying all requests (fail closed)');
    return false;
  }
  return req.headers.get('x-print-agent-key') === expected;
}

export async function GET(req: NextRequest) {
  try {
    if (!checkAuth(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const sb  = getServerClient();
    const url = new URL(req.url);
    const rid       = url.searchParams.get('restaurantId') ?? 'rest_default';
    const printerId = url.searchParams.get('printerId'); // optional: filter by station
    const limit     = Math.min(parseInt(url.searchParams.get('limit') ?? '20'), 100);

    let query = sb
      .from('print_jobs')
      .select('id, order_id, job_type, status, printer_id, payload, attempts, is_reprint, created_at')
      .eq('restaurant_id', rid)
      .in('status', ['queued', 'failed'])
      .order('created_at', { ascending: true })
      .limit(limit);

    if (printerId) query = query.eq('printer_id', printerId);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data ?? []);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[GET /api/print-jobs] unexpected error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
