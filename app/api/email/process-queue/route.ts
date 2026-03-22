// GET /api/email/process-queue — hourly cleanup sweep for the email retry queue
//
// Architecture note:
//   Receipt emails are sent IMMEDIATELY at the point of order/tab completion
//   (see PATCH /api/orders/[id] and PATCH /api/tabs/[id]).  This route is a
//   safety-net that retries any sends that failed transiently (e.g. Resend API
//   blip, cold-start timeout).  It runs once per hour via Vercel Cron.
//
// Vercel Hobby plan supports cron schedules no more frequent than hourly.
// Schedule: "0 * * * *" (top of every hour) — see vercel.json.
//
// Security: accepts requests with Authorization: Bearer CRON_SECRET
// or from localhost. Vercel Cron automatically includes the CRON_SECRET header.
//
// What it does:
//   1. Fetches all email_queue rows where status IN ('pending','failed')
//      AND retry_count < 3 AND next_retry_at <= NOW()
//   2. For each row: attempts send via Resend
//   3. On success: marks status='sent', stores messageId
//   4. On failure: increments retry_count, stores error, schedules next retry
//      (1st retry: 1 min delay, 2nd retry: 5 min delay, 3rd: permanent fail)
//   5. Returns a JSON summary of what was processed

import { NextRequest, NextResponse } from 'next/server';
import { processEmailQueue } from '@/lib/email-server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30; // 30-second timeout (Vercel Hobby limit)

// ─── Auth guard ───────────────────────────────────────────────────────────────

function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;

  // If no CRON_SECRET configured, allow all (dev mode)
  if (!cronSecret) return true;

  // Check Authorization header (Vercel Cron sends this automatically)
  const authHeader = req.headers.get('authorization');
  if (authHeader === `Bearer ${cronSecret}`) return true;

  // Allow internal calls (same-origin)
  const host = req.headers.get('host') ?? '';
  if (host.startsWith('localhost') || host.startsWith('127.0.0.1')) return true;

  return false;
}

// ─── GET handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    console.warn('[process-queue] Unauthorized access attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startMs = Date.now();
  console.info('[process-queue] ▶ Worker started at', new Date().toISOString());

  try {
    const summary = await processEmailQueue();
    const durationMs = Date.now() - startMs;

    console.info(`[process-queue] ◀ Worker finished in ${durationMs}ms`, summary);

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

// Also support POST (some cron services use POST)
export { GET as POST };
