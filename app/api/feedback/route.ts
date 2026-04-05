// POST /api/feedback
// Store customer star-rating + optional comment for a completed order.
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
    const rating  = Number(body.rating);
    const comment = body.comment ? String(body.comment).trim().slice(0, 500) : null;

    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'rating must be an integer 1–5' }, { status: 400 });
    }

    // Idempotency: skip if feedback already submitted for this order
    const { data: existing } = await sb
      .from('order_feedback')
      .select('id')
      .eq('order_id', orderId)
      .maybeSingle();

    if (existing) {
      console.info(`[POST /api/feedback] feedback already exists for order ${orderId}`);
      return NextResponse.json({ ok: true, alreadySubmitted: true });
    }

    const { error } = await sb.from('order_feedback').insert({
      id:         newId('FB'),
      order_id:   orderId,
      rating,
      comment,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('[POST /api/feedback] DB error:', error.message, '| code:', error.code);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.info(`[POST /api/feedback] ✅ rating ${rating}/5 saved for order ${orderId}`);
    return NextResponse.json({ ok: true, alreadySubmitted: false }, { status: 201 });

  } catch (err) {
    console.error('[POST /api/feedback] unexpected error:', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}
