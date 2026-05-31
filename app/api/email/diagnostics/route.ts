// GET /api/email/diagnostics
// Returns email configuration status and recent queue activity.
// Used by the Admin panel's Email Diagnostics section.
import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const apiKey    = process.env.RESEND_API_KEY ?? '';
  const configured = Boolean(apiKey && !apiKey.startsWith('re_placeholder') && apiKey.length > 10);
  const fromEmail  = 'noreply@mail.ourfoodielover.com';

  // Pull last 10 queue entries for status overview
  let recentQueue: {
    id: string;
    order_id: string;
    status: string;
    error: string | null;
    retry_count: number;
    created_at: string;
    updated_at: string;
  }[] = [];
  let queueError: string | null = null;

  try {
    const sb = getServerClient();
    const { data, error } = await sb
      .from('email_queue')
      .select('id, order_id, status, error, retry_count, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(10);
    if (error) {
      queueError = error.message;
    } else {
      recentQueue = (data ?? []) as typeof recentQueue;
    }
  } catch (err) {
    queueError = err instanceof Error ? err.message : String(err);
  }

  // Summarise queue
  const sent   = recentQueue.filter(r => r.status === 'sent').length;
  const failed = recentQueue.filter(r => r.status === 'failed').length;
  const pending = recentQueue.filter(r => r.status === 'pending').length;
  const lastEntry = recentQueue[0] ?? null;

  console.info('[GET /api/email/diagnostics] RESEND configured:', configured, '| queue rows:', recentQueue.length);

  return NextResponse.json({
    configured,
    fromEmail,
    apiKeyPresent:  Boolean(apiKey),
    apiKeyLength:   apiKey.length,
    queueError,
    queueSummary: { total: recentQueue.length, sent, failed, pending },
    lastEntry,
    recentQueue,
  });
}
