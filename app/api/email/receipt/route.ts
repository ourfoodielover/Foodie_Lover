// POST /api/email/receipt — manually trigger a receipt email for an order
// Used for testing and for frontend-triggered sends (e.g., resend button in Manager portal).
// Actual automatic sending is done server-side via lib/email-server.ts
// called directly from /api/orders/[id] and /api/tabs/[id].
import { NextRequest, NextResponse } from 'next/server';
import { sendReceiptEmail, sendTabReceiptEmail } from '@/lib/email-server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Accept { tabId, email? }   — preferred for dine-in: sends a combined receipt
    //     OR { orderId, email? } — legacy/fallback: sends receipt for one order
    // email is an optional override when the record has no customer_email.
    const tabId         = (body.tabId)                             as string | undefined;
    const orderId       = (body.orderId ?? body.order_id)          as string | undefined;
    const emailOverride = typeof body.email === 'string' ? body.email.trim() : undefined;

    if (!tabId && !orderId) {
      return NextResponse.json(
        { error: 'tabId or orderId is required' },
        { status: 400 },
      );
    }

    if (emailOverride && !emailOverride.includes('@')) {
      return NextResponse.json(
        { error: 'email is not a valid email address' },
        { status: 400 },
      );
    }

    let result;

    if (tabId) {
      // Tab-level receipt: fetches ALL orders for the tab server-side — no stale state.
      // This is the correct path for the manager's "Send Receipt" button on dine-in tabs.
      console.info(`[POST /api/email/receipt] Tab receipt for tabId=${tabId}${emailOverride ? ` → ${emailOverride}` : ''}`);
      result = await sendTabReceiptEmail(tabId, emailOverride);
    } else {
      // Order-level receipt: legacy path used by automatic post-close sending.
      console.info(`[POST /api/email/receipt] Order receipt for orderId=${orderId}${emailOverride ? ` → ${emailOverride}` : ''}`);
      result = await sendReceiptEmail(orderId!, emailOverride);
    }

    if (result.sent) {
      return NextResponse.json({ ok: true, sent: true, messageId: result.messageId });
    } else {
      return NextResponse.json({ ok: true, sent: false, reason: result.reason });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[POST /api/email/receipt] Unexpected error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
