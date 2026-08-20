/**
 * POST /api/rewards/spin-invite
 *
 * Staff endpoint: send or resend the Spin & Win invitation email for an order or tab.
 * Also used as the primary "generate spin_token" endpoint when staff adds an email
 * to an order/tab that didn't have one at completion time.
 *
 * Body:
 *   { orderId: string }   — for pickup / delivery orders
 *   { tabId:   string }   — for dine-in tabs
 *   { email?:  string }   — optional email override (used when updating email on the fly)
 *
 * Behaviour:
 *   1. Validates the entity exists and is completed/closed.
 *   2. Checks spin_config: enabled, min amount, eligible order types.
 *   3. Generates spin_token if not already set (idempotent — never regenerated).
 *   4. If the customer already spun: sends a result summary email instead of an invite.
 *   5. If no email on file (and no override): returns { needsEmail: true }.
 *   6. Sends invite / result summary, updates spin_invite_sent_at.
 *
 * Returns:
 *   { sent: true,  action: 'invite' | 'result_summary' }
 *   { sent: false, reason: string }
 *   { needsEmail: true, reason: string }  — no email on file, prompt staff to add one
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient, generateSpinToken } from '@/lib/supabase-server';
import { sendSpinInviteEmail } from '@/lib/email-server';

export const dynamic = 'force-dynamic';

// ── Spin result summary HTML builder ─────────────────────────────────────────
// Sent when the customer already spun — shows their result without allowing re-spin.
function buildResultSummaryHtml(args: {
  customerName: string;
  isWinner:     boolean;
  rewardLabel?:  string;
  rewardType?:  string;
  couponCode?:  string;
  expiresAt?:   string;
  minNextOrder?: number;
  maxDiscount?:  number;
  spinUrl:       string;
}): string {
  const RESTAURANT_NAME = process.env.RESTAURANT_NAME ?? 'Foodie Lover';
  const { customerName, isWinner, rewardLabel, rewardType, couponCode, expiresAt, minNextOrder, maxDiscount, spinUrl } = args;

  const expiryFormatted = expiresAt
    ? new Date(expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  const rewardSection = isWinner && couponCode ? `
    <div style="background:#f5f3ff;border-radius:12px;padding:20px;margin:20px 0;text-align:center">
      <p style="color:#6b7280;font-size:11px;margin:0 0 6px;text-transform:uppercase;letter-spacing:1px;font-weight:700">YOUR COUPON CODE</p>
      <p style="font-family:monospace;font-size:30px;font-weight:900;color:#4f46e5;letter-spacing:5px;margin:0">${couponCode}</p>
      ${rewardLabel ? `<p style="font-size:14px;font-weight:700;color:#7c3aed;margin:8px 0 0">${rewardLabel}</p>` : ''}
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
      ${expiryFormatted ? `<tr><td style="color:#555;padding:4px 0;font-size:13px">Valid Until</td><td style="font-weight:600;padding:4px 0;font-size:13px;text-align:right">${expiryFormatted}</td></tr>` : ''}
      ${minNextOrder && minNextOrder > 0 ? `<tr><td style="color:#555;padding:4px 0;font-size:13px">Minimum Purchase</td><td style="font-weight:600;padding:4px 0;font-size:13px;text-align:right">₹${minNextOrder}</td></tr>` : ''}
      ${(rewardType === 'percent' && maxDiscount != null && maxDiscount > 0) ? `<tr><td style="color:#555;padding:4px 0;font-size:13px">Maximum Discount</td><td style="font-weight:600;padding:4px 0;font-size:13px;text-align:right">₹${maxDiscount}</td></tr>` : ''}
    </table>` : `
    <div style="background:#f8fafc;border-radius:12px;padding:20px;margin:20px 0;text-align:center">
      <div style="font-size:36px">🎯</div>
      <p style="font-size:15px;font-weight:700;color:#475569;margin:8px 0 4px">${rewardLabel || 'Better Luck Next Time'}</p>
      <p style="font-size:13px;color:#94a3b8;margin:0">Your spin was used for this order.</p>
    </div>`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="font-family:'Segoe UI',Arial,sans-serif;background:#f5f3ff;margin:0;padding:24px 16px">
  <div style="max-width:520px;margin:0 auto">
    <div style="background:linear-gradient(135deg,#7c3aed,#4f46e5);border-radius:16px 16px 0 0;padding:28px;text-align:center">
      <div style="font-size:40px;margin-bottom:6px">${isWinner ? '🎉' : '🎡'}</div>
      <h1 style="margin:0;font-size:22px;font-weight:900;color:white">
        ${isWinner ? 'Your Spin & Win Result!' : 'Your Spin Result'}
      </h1>
      <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.85)">${RESTAURANT_NAME}</p>
    </div>
    <div style="background:white;border-radius:0 0 16px 16px;padding:28px;box-shadow:0 4px 24px rgba(109,40,217,0.1)">
      <p style="font-size:15px;color:#374151;margin:0 0 6px">Hi <strong>${customerName}</strong>,</p>
      <p style="font-size:14px;color:#6b7280;margin:0 0 16px;line-height:1.6">
        Here's a summary of your Spin &amp; Win result from your recent visit at ${RESTAURANT_NAME}.
        ${isWinner ? 'Congratulations — you won a reward! Use your code on your next order.' : ''}
      </p>
      ${rewardSection}
      <div style="text-align:center;margin-top:20px">
        <a href="${spinUrl}" target="_blank" rel="noopener noreferrer"
           style="display:inline-block;background:#7c3aed;color:white;font-weight:700;font-size:14px;
                  padding:12px 28px;border-radius:10px;text-decoration:none">
          🎡 View My Spin Result
        </a>
      </div>
    </div>
    <div style="text-align:center;padding:16px;font-size:11px;color:#9ca3af">
      Thank you for choosing <strong style="color:#7c3aed">${RESTAURANT_NAME}</strong>! 🙏
    </div>
  </div>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      orderId?: string;
      tabId?:   string;
      email?:   string;         // optional email override from manager UI
    };
    const { orderId, tabId } = body;
    const emailOverride = body.email?.trim() || null;

    if (!orderId && !tabId) {
      return NextResponse.json({ error: 'orderId or tabId required' }, { status: 400 });
    }

    const sb  = getServerClient();
    const rid = process.env.NEXT_PUBLIC_RESTAURANT_ID ?? 'rest_default';
    const RESTAURANT_NAME = process.env.RESTAURANT_NAME ?? 'Foodie Lover';
    const APP_BASE_URL = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '');

    // ── 1. Load spin config ─────────────────────────────────────────────────
    const { data: config } = await sb
      .from('spin_config')
      .select('enabled, min_order_amount, eligible_order_types, require_email, require_phone')
      .eq('restaurant_id', rid)
      .single();

    if (!config?.enabled) {
      return NextResponse.json({ sent: false, reason: 'Spin & Win is not currently active' }, { status: 400 });
    }

    // ── 2. Fetch entity ─────────────────────────────────────────────────────
    let email:         string | null = emailOverride;
    let entityPhone:   string | null = null;
    let customerName:  string        = 'Valued Customer';
    let spinToken:     string | null = null;
    let entityTotal:   number        = 0;
    let orderType:     string        = 'pickup';
    let isEligible:    boolean       = false;
    let existingSpinResult: Record<string, unknown> | null = null;

    if (orderId) {
      const { data: order } = await sb
        .from('orders')
        .select('id, customer_email, customer_name, spin_token, total, type, status, phone')
        .eq('id', orderId)
        .single();

      if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      if (!email) email = (order.customer_email as string | null);
      entityPhone  = (order.phone as string | null) ?? null;
      customerName = (order.customer_name as string) || 'Valued Customer';
      spinToken    = order.spin_token as string | null;
      entityTotal  = Number(order.total) || 0;
      orderType    = (order.type as string) === 'online' ? 'delivery' : (order.type as string);
      isEligible   = ['completed', 'delivered'].includes(order.status as string);

      // If email override provided, persist it on the order
      if (emailOverride && emailOverride !== (order.customer_email as string | null)) {
        await sb.from('orders').update({ customer_email: emailOverride }).eq('id', orderId);
      }

      // Check existing spin result
      const { data: spin } = await sb
        .from('spin_results')
        .select('*, reward_coupons(coupon_code, expires_at, min_next_order, max_discount), spin_rewards(label, reward_type, reward_value)')
        .eq('order_id', orderId)
        .maybeSingle();
      if (spin) existingSpinResult = spin as Record<string, unknown>;

    } else {
      // tabId path
      const { data: tab } = await sb
        .from('customer_tabs')
        .select('id, customer_email, customer_name, spin_token, total, status, phone')
        .eq('id', tabId!)
        .single();

      if (!tab) {
        return NextResponse.json({ error: 'Tab not found' }, { status: 404 });
      }

      if (!email) email = (tab.customer_email as string | null);
      entityPhone  = (tab.phone as string | null) ?? null;
      customerName = (tab.customer_name as string) || 'Valued Customer';
      spinToken    = tab.spin_token as string | null;
      entityTotal  = Number(tab.total) || 0;
      orderType    = 'dine-in';
      isEligible   = tab.status === 'closed';

      // Tab phone fallback: if tab has no phone, check if any order in the tab does
      if (!entityPhone) {
        const { data: orderWithPhone } = await sb
          .from('orders')
          .select('phone')
          .eq('tab_id', tabId!)
          .not('phone', 'is', null)
          .limit(1)
          .maybeSingle();
        entityPhone = (orderWithPhone?.phone as string | null) ?? null;
      }

      // If email override provided, persist it on the tab
      if (emailOverride && emailOverride !== (tab.customer_email as string | null)) {
        await sb.from('customer_tabs').update({ customer_email: emailOverride }).eq('id', tabId!);
      }

      // Check existing spin result
      const { data: spin } = await sb
        .from('spin_results')
        .select('*, reward_coupons(coupon_code, expires_at, min_next_order, max_discount), spin_rewards(label, reward_type, reward_value)')
        .eq('tab_id', tabId!)
        .maybeSingle();
      if (spin) existingSpinResult = spin as Record<string, unknown>;
    }

    // ── 3. Eligibility checks ───────────────────────────────────────────────
    if (!isEligible) {
      return NextResponse.json({ sent: false, reason: 'Order/tab is not yet completed or closed' }, { status: 400 });
    }

    if (entityTotal < Number(config.min_order_amount)) {
      return NextResponse.json({
        sent: false,
        reason: `Total ₹${entityTotal.toFixed(0)} is below the minimum qualifying amount of ₹${config.min_order_amount}`,
      }, { status: 400 });
    }

    const eligibleTypes = (config.eligible_order_types as string[]) ?? [];
    if (!eligibleTypes.includes(orderType) && !eligibleTypes.includes('dine-in' === orderType ? 'dine-in' : orderType)) {
      return NextResponse.json({ sent: false, reason: `Order type "${orderType}" is not eligible for Spin & Win` }, { status: 400 });
    }

    // ── 4. Contact requirements — same rules as GET /api/rewards/eligibility ──
    if (!email) {
      return NextResponse.json({
        needsEmail: true,
        reason:     'No email address on file. Please add the customer\'s email and try again.',
      }, { status: 400 });
    }

    // require_phone check: spin_config.require_phone must be satisfied independently of email
    if (config.require_phone && !entityPhone) {
      return NextResponse.json({
        needsPhone: true,
        reason:     'Phone number required for Spin & Win. Please add the customer\'s phone number to the order first.',
      }, { status: 400 });
    }

    // ── 5. Generate spin_token if missing (idempotent — never regenerated) ──
    if (!spinToken) {
      spinToken = generateSpinToken();
      if (orderId) {
        await sb.from('orders').update({ spin_token: spinToken }).eq('id', orderId);
      } else {
        await sb.from('customer_tabs').update({ spin_token: spinToken }).eq('id', tabId!);
      }
    }

    // ── 6. Build spin URL ───────────────────────────────────────────────────
    const entityParam = orderId
      ? `orderId=${encodeURIComponent(orderId)}`
      : `tabId=${encodeURIComponent(tabId!)}`;
    const spinUrl = `${APP_BASE_URL}/spin?${entityParam}&token=${encodeURIComponent(spinToken)}`;

    // ── 7. Send invite OR result summary ────────────────────────────────────
    if (existingSpinResult) {
      // Customer already spun — send result summary instead of invite
      const reward   = existingSpinResult.spin_rewards as Record<string, unknown> | null;
      const couponRaw = existingSpinResult.reward_coupons;
      const coupon   = Array.isArray(couponRaw)
        ? (couponRaw[0] as Record<string, unknown> | undefined)
        : (couponRaw as Record<string, unknown> | null);

      const html    = buildResultSummaryHtml({
        customerName,
        isWinner:     existingSpinResult.is_winner as boolean,
        rewardLabel:  reward?.label as string | undefined,
        rewardType:   reward?.reward_type as string | undefined,
        couponCode:   coupon?.coupon_code as string | undefined,
        expiresAt:    coupon?.expires_at as string | undefined,
        minNextOrder: coupon?.min_next_order as number | undefined,
        maxDiscount:  coupon?.max_discount as number | undefined,
        spinUrl,
      });
      const subject = `Your Spin & Win result at ${RESTAURANT_NAME}`;

      const { sendEmail } = await import('@/lib/email');
      const result = await sendEmail({ to: email, subject, html });

      if ('error' in result) {
        return NextResponse.json({ sent: false, reason: result.error }, { status: 500 });
      }

      // Update spin_invite_sent_at (reuses same field for audit purposes)
      const now = new Date().toISOString();
      if (orderId) {
        await sb.from('orders').update({ spin_invite_sent_at: now }).eq('id', orderId);
      } else {
        await sb.from('customer_tabs').update({ spin_invite_sent_at: now }).eq('id', tabId!);
      }

      return NextResponse.json({ sent: true, action: 'result_summary', sentTo: email });
    }

    // Not yet spun — send the spin invite
    const result = await sendSpinInviteEmail({
      orderId:       orderId ?? undefined,
      tabId:         tabId   ?? undefined,
      spinToken,
      recipientEmail: email,
      customerName,
      orderTotal:    entityTotal,
      orderType,
    });

    if (!result.sent) {
      return NextResponse.json({ sent: false, reason: result.reason }, { status: 500 });
    }

    return NextResponse.json({ sent: true, action: 'invite', sentTo: email });

  } catch (err) {
    console.error('[POST /api/rewards/spin-invite] unexpected error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
