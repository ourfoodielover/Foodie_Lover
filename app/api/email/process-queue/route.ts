// GET /api/email/process-queue — manual flush for the email retry queue
//
// ── Architecture ──────────────────────────────────────────────────────────────
//
//   This endpoint is NOT called by any cron job. The cron has been removed
//   from vercel.json entirely so the app deploys cleanly on Vercel Hobby plan.
//
//   Receipt emails are sent IMMEDIATELY at the point of order/tab completion:
//     • PATCH /api/orders/[id]  (status → completed / customer_confirm)
//     • PATCH /api/tabs/[id]    (close: true)
//   If the immediate Resend call fails, the order is placed in email_queue for
//   retry. This endpoint lets an admin manually flush that queue on demand.
//
// ── How to trigger ────────────────────────────────────────────────────────────
//   From the terminal / Postman / admin console:
//     curl -H "Authorization: Bearer $CRON_SECRET" \
//          https://your-domain.vercel.app/api/email/process-queue
//
// ── Security ──────────────────────────────────────────────────────────────────
//   Requires Authorization: Bearer <CRON_SECRET> header.
//   Unauthenticated requests are rejected with 401.
//   Localhost is always allowed (dev / staging).
//
// ── What it does ──────────────────────────────────────────────────────────────
//   1. Fetches all email_queue rows where status IN ('pending','failed')
//      AND retry_count < 3 AND next_retry_at <= NOW()
//   2. For each row: attempts send via Resend
//   3. On success: marks status='sent', stores messageId
//   4. On failure: increments retry_count, stores error, schedules next retry
//      (retry 1: +1 min, retry 2: +5 min, retry 3: permanent fail)
//   5. Returns a JSON summary of what was processed

import { NextRequest, NextResponse } from 'next/server';
import { processEmailQueue } from '@/lib/email-server';
import { getSession } from '@/lib/session-server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30; // 30-second timeout (Vercel Hobby limit)

// ─── Auth guard ───────────────────────────────────────────────────────────────

function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;

  // Remediation note: this used to fall open ("allow all") whenever
  // CRON_SECRET was unset, which is exactly the state a fresh deploy is in
  // until someone remembers to set it. It now fails CLOSED when unset —
  // an admin session (checked by the caller, see GET below) is the only
  // way in until CRON_SECRET is configured.
  if (!cronSecret) return false;

  // Bearer token check (same header format Vercel Cron used — keeps compatibility
  // with any existing scripts or monitoring tools that call this endpoint)
  const authHeader = req.headers.get('authorization');
  if (authHeader === `Bearer ${cronSecret}`) return true;

  // Allow same-machine calls (dev server / CI) — only once a secret exists;
  // this is a convenience for local dev, not a way to bypass auth in prod.
  const host = req.headers.get('host') ?? '';
  if (host.startsWith('localhost') || host.startsWith('127.0.0.1')) return true;

  return false;
}

// ─── GET handler ──────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // Either a valid CRON_SECRET bearer token (external cron/monitor) OR an
  // authenticated admin session (manual flush from the browser) is accepted.
  const session = getSession(req);
  if (!isAuthorized(req) && session?.role !== 'admin') {
    console.warn('[process-queue] Unauthorized access attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startMs = Date.now();
  console.info('[process-queue] ▶ Manual queue flush started at', new Date().toISOString());

  try {
    const summary = await processEmailQueue();
    const durationMs = Date.now() - startMs;

    console.info(`[process-queue] ◀ Flush finished in ${durationMs}ms`, summary);

    return NextResponse.json({
      ok:          true,
      durationMs,
      ...summary,
    });
  } catch (err) {
    console.error('[process-queue] Worker crashed:', err);
    return NextResponse.json({ error: 'Worker failed', detail: String(err) }, { status: 500 });
  }
}

// Also support POST (keeps compatibility with any external monitoring/alerting
// that may POST to this endpoint)
export { GET as POST };
