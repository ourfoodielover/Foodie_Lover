// POST /api/feedback
// Store customer star-rating + optional comment for a completed order.
// Accepts either orderId (pickup/delivery) or tabId (dine-in).
// Idempotent: returns 200 if feedback already exists for this order.

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient, newId } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'object' && e !== null && 'message' in e) return String((e as { message: unknown }).message);
  return String(e);
}

export async function POST(req: NextRequest) {
  try {
    const sb = getServerClient();
    let body: Record<string, unknown>;
    try {
      body = await req.json() as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 });
    }

    const orderId = body.orderId ? String(body.orderId).trim() : '';
    const tabId   = body.tabId   ? String(body.tabId).trim()   : '';
    const rating  = Number(body.rating);
    const comment = body.comment ? String(body.comment).trim().slice(0, 500) : null;

    // Half-star validation: must be 0.5–5.0 in 0.5 increments
    const validRating = rating >= 0.5 && rating <= 5.0 && (rating * 2) === Math.floor(rating * 2);
    if (!validRating) {
      return NextResponse.json({ error: 'rating must be 0.5–5.0 in 0.5 increments' }, { status: 400 });
    }

    // ── Resolve order ID ───────────────────────────────────────────────────────
    // For dine-in tab-based feedback: look up a representative order from the tab.
    let resolvedOrderId = orderId;

    if (!resolvedOrderId && tabId) {
      // Find any order from this tab to attach the feedback to
      const { data: tabOrders } = await sb
        .from('orders')
        .select('id')
        .eq('tab_id', tabId)
        .order('created_at', { ascending: true })
        .limit(1);
      if (tabOrders && tabOrders.length > 0) {
        resolvedOrderId = (tabOrders[0] as { id: string }).id;
      }
    }

    if (!resolvedOrderId) {
      return NextResponse.json({ error: 'orderId or tabId is required' }, { status: 400 });
    }

    // Idempotency: skip if feedback already submitted for this order
    const { data: existing } = await sb
      .from('order_feedback')
      .select('id')
      .eq('order_id', resolvedOrderId)
      .maybeSingle();

    if (existing) {
      console.info(`[POST /api/feedback] feedback already exists for order ${resolvedOrderId}`);
      return NextResponse.json({ ok: true, alreadySubmitted: true });
    }

    const { error } = await sb.from('order_feedback').insert({
      id:         newId('FB'),
      order_id:   resolvedOrderId,
      rating,
      comment,
      created_at: new Date().toISOString(),
    });

    if (error) {
      // Handle unique constraint violation (race condition)
      if (error.code === '23505') {
        return NextResponse.json({ ok: true, alreadySubmitted: true });
      }
      console.error('[POST /api/feedback] DB error:', error.message, '| code:', error.code);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.info(`[POST /api/feedback] ✅ rating ${rating}/5 saved for order ${resolvedOrderId}`);
    return NextResponse.json({ ok: true, alreadySubmitted: false }, { status: 201 });

  } catch (err) {
    console.error('[POST /api/feedback] unexpected error:', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}
