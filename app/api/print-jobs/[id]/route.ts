// PATCH /api/print-jobs/[id] — print agent reports job result.
//
// Body: { status: 'printing' | 'printed' | 'failed', error?: string }
//
// Auth: requires header `x-print-agent-key` matching env PRINT_AGENT_KEY
// (same shared secret as GET /api/print-jobs).
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient, newId, broadcast } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

function checkAuth(req: NextRequest): boolean {
  const expected = process.env.PRINT_AGENT_KEY;
  if (!expected) {
    console.warn('[PATCH /api/print-jobs/[id]] PRINT_AGENT_KEY is not set — endpoint is unauthenticated');
    return true;
  }
  return req.headers.get('x-print-agent-key') === expected;
}

const VALID_STATUSES = ['printing', 'printed', 'failed', 'cancelled'];

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    if (!checkAuth(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await ctx.params;
    const sb   = getServerClient();
    const body = await req.json();

    if (!body.status || !VALID_STATUSES.includes(body.status)) {
      return NextResponse.json(
        { error: `status must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 },
      );
    }

    const { data: job, error: fetchErr } = await sb
      .from('print_jobs')
      .select('id, restaurant_id, order_id, job_type, attempts, is_reprint')
      .eq('id', id)
      .single();
    if (fetchErr || !job) {
      return NextResponse.json({ error: 'Print job not found' }, { status: 404 });
    }

    const updates: Record<string, unknown> = {
      status:     body.status,
      updated_at: new Date().toISOString(),
    };
    if (body.status === 'printing') {
      updates.attempts = (job.attempts ?? 0) + 1;
    }
    if (body.status === 'printed') {
      updates.printed_at = new Date().toISOString();
      updates.error      = null;
    }
    if (body.status === 'failed') {
      updates.error = body.error ?? 'Unknown print error';
    }

    const { error: updErr } = await sb.from('print_jobs').update(updates).eq('id', id);
    if (updErr) throw updErr;

    // Audit trail on the order itself
    const eventType =
      body.status === 'printed' ? 'Printed' :
      body.status === 'failed'  ? 'PrintFailed' :
      undefined;
    if (eventType) {
      await sb.from('order_events').insert({
        id:           newId('EV'),
        order_id:     job.order_id,
        event_type:   eventType,
        performed_by: 'PrintAgent',
        note:         body.status === 'failed'
          ? `${job.job_type} job ${id} failed: ${body.error ?? 'unknown error'}`
          : `${job.job_type} job ${id} printed`,
      });
    }

    await broadcast(job.restaurant_id as string, 'print_job_updated', {
      printJobId: id, orderId: job.order_id, status: body.status,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[PATCH /api/print-jobs/[id]] unexpected error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
