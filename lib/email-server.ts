// ─── Foodie Lover — Server-side Email Helper ────────────────────────────────
// SERVER ONLY — never import this in 'use client' files.
//
// Exports two public functions:
//   enqueueReceiptEmail(orderId) — queue an email for reliable delivery (use this at triggers)
//   sendReceiptEmail(orderId)    — attempt an immediate send (used by the queue worker)
// ────────────────────────────────────────────────────────────────────────────

import { getServerClient, newId } from '@/lib/supabase-server';
import { sendEmail } from '@/lib/email';

// ─── Types ────────────────────────────────────────────────────────────────────

export type EnqueueResult =
  | { queued: true }
  | { queued: false; reason: string };

export type SendReceiptResult =
  | { sent: true;  messageId: string }
  | { sent: false; reason: string    };

// ─── Retry delay schedule ─────────────────────────────────────────────────────
// retry_count 0 → try immediately
// retry_count 1 → wait 1 minute  after last failure
// retry_count 2 → wait 5 minutes after last failure
// retry_count >= 3 → permanently failed, no more retries

const RETRY_DELAY_MS = [0, 60_000, 5 * 60_000] as const; // ms per retry slot
const MAX_RETRIES    = 3;

// ─── Build HTML receipt ───────────────────────────────────────────────────────

function buildReceiptHtml(order: Record<string, unknown>, items: Record<string, unknown>[]): string {
  const orderId   = (order.id as string) || '';
  const orderNum  = (order.order_number as number) ?? String(orderId).slice(-6);
  const custName  = (order.customer_name  as string) || 'Valued Customer';
  const custEmail = (order.customer_email as string) || '';
  const payment   = ((order.payment_method as string) || 'COD').toUpperCase();
  const subtotal  = Number(order.subtotal)  || 0;
  const tax       = Number(order.tax)       || 0;
  const discount  = Number(order.discount)  || 0;
  const tip       = Number(order.tip)       || 0;
  const total     = Number(order.total)     || 0;
  const discReason= (order.discount_reason as string) || '';
  const createdAt = order.created_at
    ? new Date(order.created_at as string).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : '';
  const orderType = (order.type as string) || 'dine-in';

  const itemRows = items.map(it => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:14px;color:#334155">
        ${String(it.name)} <span style="color:#94a3b8">× ${Number(it.qty) || 1}</span>
      </td>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:right;font-size:14px;color:#334155">
        ₹${(Number(it.subtotal) || 0).toFixed(2)}
      </td>
    </tr>`).join('');

  const typeLabel =
    orderType === 'delivery' ? '🚗 Delivery' :
    orderType === 'pickup'   ? '🏪 Pickup'   :
    '🍽️ Dine-In';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Your Foodie Lover Receipt</title>
</head>
<body style="font-family:'Segoe UI',Arial,sans-serif;background:#f1f5f9;margin:0;padding:24px 16px">
  <div style="max-width:540px;margin:0 auto">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#E65C00,#F9D423);border-radius:16px 16px 0 0;padding:32px;text-align:center">
      <div style="font-size:36px;margin-bottom:8px">🍽️</div>
      <h1 style="margin:0;font-size:26px;font-weight:900;color:white;letter-spacing:-0.5px;text-shadow:0 1px 3px rgba(0,0,0,0.2)">
        Foodie Lover
      </h1>
      <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.9)">Payment Receipt</p>
    </div>

    <!-- Card -->
    <div style="background:white;border-radius:0 0 16px 16px;padding:32px;box-shadow:0 4px 24px rgba(0,0,0,0.08)">

      <!-- Order info box -->
      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:16px 20px;margin-bottom:24px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px">
          <div>
            <div style="font-size:11px;color:#9a3412;font-weight:700;text-transform:uppercase;letter-spacing:1px">
              Order #${orderNum}
            </div>
            <div style="font-size:16px;font-weight:700;color:#1e293b;margin-top:4px">${custName}</div>
            ${custEmail ? `<div style="font-size:12px;color:#64748b;margin-top:2px">${custEmail}</div>` : ''}
            ${orderId ? `<div style="font-size:11px;color:#94a3b8;margin-top:4px;font-family:monospace">ID: ${orderId}</div>` : ''}
          </div>
          <div style="text-align:right">
            <div style="font-size:11px;font-weight:600;background:#E65C00;color:white;padding:3px 10px;border-radius:20px;white-space:nowrap">
              ${typeLabel}
            </div>
            <div style="font-size:11px;color:#64748b;margin-top:6px">${createdAt}</div>
          </div>
        </div>
      </div>

      <!-- Items -->
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;margin-bottom:8px">
        Order Items
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
        <tbody>${itemRows}</tbody>
      </table>

      <!-- Totals -->
      <div style="border-top:2px solid #f1f5f9;padding-top:16px">
        <table style="width:100%;border-collapse:collapse">
          <tr>
            <td style="padding:4px 0;color:#64748b;font-size:14px">Subtotal</td>
            <td style="padding:4px 0;text-align:right;font-size:14px;color:#334155">₹${subtotal.toFixed(2)}</td>
          </tr>
          ${tax > 0 ? `<tr>
            <td style="padding:4px 0;color:#64748b;font-size:14px">Tax</td>
            <td style="padding:4px 0;text-align:right;font-size:14px;color:#334155">₹${tax.toFixed(2)}</td>
          </tr>` : ''}
          ${discount > 0 ? `<tr>
            <td style="padding:4px 0;color:#16a34a;font-size:14px">
              Discount${discReason ? ` (${discReason})` : ''}
            </td>
            <td style="padding:4px 0;text-align:right;color:#16a34a;font-size:14px">−₹${discount.toFixed(2)}</td>
          </tr>` : ''}
          ${tip > 0 ? `<tr>
            <td style="padding:4px 0;color:#64748b;font-size:14px">Tip</td>
            <td style="padding:4px 0;text-align:right;font-size:14px;color:#334155">₹${tip.toFixed(2)}</td>
          </tr>` : ''}
          <tr>
            <td style="padding:14px 0 0;font-weight:800;font-size:18px;color:#E65C00">Total</td>
            <td style="padding:14px 0 0;text-align:right;font-weight:900;font-size:20px;color:#E65C00">
              ₹${total.toFixed(2)}
            </td>
          </tr>
        </table>
      </div>

      <!-- Payment badge -->
      <div style="margin-top:20px;padding:12px 16px;background:#f8fafc;border-radius:8px;font-size:13px;color:#475569">
        <span style="font-size:16px">💳</span>
        Paid via <strong style="color:#1e293b">${payment}</strong>
        <span style="margin-left:8px;color:#16a34a;font-weight:700;font-size:12px">✓ PAID</span>
      </div>

      <!-- CTA -->
      <div style="margin-top:24px;text-align:center;padding:16px;background:#fff7ed;border-radius:10px">
        <p style="margin:0 0 6px;font-size:13px;color:#9a3412">
          💬 Questions about your order? Contact us and quote:
        </p>
        <p style="margin:0;font-size:12px;color:#7c3aed;font-family:monospace;font-weight:700">
          ${orderId || `Order #${orderNum}`}
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:20px;font-size:12px;color:#94a3b8">
      Thank you for choosing <strong style="color:#E65C00">Foodie Lover</strong>! 🙏<br/>
      <span style="font-size:11px">This is an automated receipt — please do not reply to this email.</span>
    </div>
  </div>
</body>
</html>`;
}

// ─── Internal: dispatch via Resend (delegates to lib/email.ts) ───────────────
// Preserves the same return type used by sendReceiptEmail / sendTabReceiptEmail.
// Adds the domain-restriction prefix so callers can show actionable UI messages.

async function dispatchViaResend(
  email:    string,
  subject:  string,
  html:     string,
): Promise<{ messageId: string } | { error: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.startsWith('re_placeholder')) {
    return { error: 'RESEND_API_KEY not configured' };
  }

  const result = await sendEmail({ to: email, subject, html });

  if ('error' in result) {
    // Detect the Resend free-tier domain restriction and surface an actionable message.
    const errMsg = result.error;
    if (errMsg.includes('verify a domain') || errMsg.includes('testing emails')) {
      return { error: `RESEND_DOMAIN_REQUIRED: ${errMsg}` };
    }
    return { error: errMsg };
  }

  return { messageId: result.messageId };
}

// ─── Build tab-level receipt HTML (orders shown per round with IDs) ───────────

function buildTabReceiptHtml(
  tab:    Record<string, unknown>,
  orders: { order: Record<string, unknown>; items: Record<string, unknown>[] }[],
  emailOverride?: string,
): string {
  const custName   = (tab.customer_name  as string) || 'Valued Customer';
  const custEmail  = emailOverride || (tab.customer_email as string) || '';
  const payment    = ((tab.payment_method as string) || 'Cash').toUpperCase();
  const tabTotal   = Number(tab.total)    || 0;
  const discount   = Number(tab.discount) || 0;
  const discReason = (tab.discount_reason as string) || '';
  // tab.total is the final amount (post-discount); add discount back to derive subtotal for display
  const subtotal   = tabTotal + discount;
  const tableId    = (tab.table_id as string) || '';
  const tableName  = (tab.table_name as string) || tableId || '';
  const createdAt  = tab.created_at
    ? new Date(tab.created_at as string).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : '';

  // Determine the order type from the first order (all orders in a tab share the same type)
  const firstOrderType = (orders[0]?.order.type as string) || 'dine-in';
  const typeLabel =
    firstOrderType === 'delivery' ? '🚗 Delivery' :
    firstOrderType === 'pickup'   ? '🏪 Pickup'   :
    '🍽️ Dine-In';

  // Collect all order IDs for the reference section
  const orderIds = orders.map(o => (o.order.id as string) || '').filter(Boolean);

  // Build per-order sections (each round gets its own heading + item list)
  const orderSections = orders.map((o, idx) => {
    const orderId  = (o.order.id as string) || '';
    const orderNum = (o.order.order_number as number) ?? String(orderId).slice(-6);
    const orderTime = o.order.created_at
      ? new Date(o.order.created_at as string).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
      : '';

    const itemRows = o.items.map(it => `
      <tr>
        <td style="padding:7px 0;border-bottom:1px solid #f8f8f8;font-size:13px;color:#334155">
          ${String(it.name)} <span style="color:#94a3b8">× ${Number(it.qty) || 1}</span>
        </td>
        <td style="padding:7px 0;border-bottom:1px solid #f8f8f8;text-align:right;font-size:13px;color:#334155">
          ₹${(Number(it.subtotal) || 0).toFixed(2)}
        </td>
      </tr>`).join('');

    return `
    <!-- Order round ${idx + 1} -->
    <div style="margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:#f8fafc;border-radius:8px;margin-bottom:4px">
        <div>
          <span style="font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.5px">
            Round ${idx + 1}${orders.length > 1 ? ` — Order #${orderNum}` : ` — Order #${orderNum}`}
          </span>
          <span style="display:block;font-size:10px;color:#94a3b8;font-family:monospace;margin-top:1px">${orderId}</span>
        </div>
        ${orderTime ? `<span style="font-size:11px;color:#94a3b8">${orderTime}</span>` : ''}
      </div>
      <table style="width:100%;border-collapse:collapse">
        <tbody>${itemRows}</tbody>
      </table>
    </div>`;
  }).join('');

  // Reference IDs block shown in the footer CTA
  const refIdLines = orderIds.map(id => `<div style="font-family:monospace;font-size:11px;color:#7c3aed;font-weight:700">${id}</div>`).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Your Foodie Lover Receipt</title>
</head>
<body style="font-family:'Segoe UI',Arial,sans-serif;background:#f1f5f9;margin:0;padding:24px 16px">
  <div style="max-width:540px;margin:0 auto">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#E65C00,#F9D423);border-radius:16px 16px 0 0;padding:32px;text-align:center">
      <div style="font-size:36px;margin-bottom:8px">🍽️</div>
      <h1 style="margin:0;font-size:26px;font-weight:900;color:white;letter-spacing:-0.5px;text-shadow:0 1px 3px rgba(0,0,0,0.2)">Foodie Lover</h1>
      <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.9)">Payment Receipt</p>
    </div>

    <!-- Card -->
    <div style="background:white;border-radius:0 0 16px 16px;padding:32px;box-shadow:0 4px 24px rgba(0,0,0,0.08)">

      <!-- Session info box -->
      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:16px 20px;margin-bottom:24px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px">
          <div>
            <div style="font-size:11px;color:#9a3412;font-weight:700;text-transform:uppercase;letter-spacing:1px">${typeLabel}${tableName ? ` — ${tableName}` : ''}</div>
            <div style="font-size:16px;font-weight:700;color:#1e293b;margin-top:4px">${custName}</div>
            ${custEmail ? `<div style="font-size:12px;color:#64748b;margin-top:2px">${custEmail}</div>` : ''}
          </div>
          <div style="text-align:right">
            <div style="font-size:11px;color:#64748b">${createdAt}</div>
            <div style="font-size:11px;color:#94a3b8;margin-top:4px">${orders.length} order${orders.length !== 1 ? 's' : ''}</div>
          </div>
        </div>
      </div>

      <!-- Per-order item sections -->
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;margin-bottom:12px">
        Order Details
      </div>
      ${orderSections}

      <!-- Totals -->
      <div style="border-top:2px solid #f1f5f9;padding-top:16px;margin-top:8px">
        <table style="width:100%;border-collapse:collapse">
          <tr>
            <td style="padding:4px 0;color:#64748b;font-size:14px">Subtotal</td>
            <td style="padding:4px 0;text-align:right;font-size:14px;color:#334155">₹${subtotal.toFixed(2)}</td>
          </tr>
          ${discount > 0 ? `<tr>
            <td style="padding:4px 0;color:#16a34a;font-size:14px">Discount${discReason ? ` (${discReason})` : ''}</td>
            <td style="padding:4px 0;text-align:right;color:#16a34a;font-size:14px">−₹${discount.toFixed(2)}</td>
          </tr>` : ''}
          <tr>
            <td style="padding:14px 0 0;font-weight:800;font-size:18px;color:#E65C00">Total</td>
            <td style="padding:14px 0 0;text-align:right;font-weight:900;font-size:20px;color:#E65C00">₹${tabTotal.toFixed(2)}</td>
          </tr>
        </table>
      </div>

      <!-- Payment badge -->
      <div style="margin-top:20px;padding:12px 16px;background:#f8fafc;border-radius:8px;font-size:13px;color:#475569">
        <span style="font-size:16px">💳</span>
        Paid via <strong style="color:#1e293b">${payment}</strong>
        <span style="margin-left:8px;color:#16a34a;font-weight:700;font-size:12px">✓ PAID</span>
      </div>

      <!-- Reference IDs (for tracking / support) -->
      <div style="margin-top:24px;padding:16px;background:#fff7ed;border-radius:10px">
        <p style="margin:0 0 8px;font-size:13px;color:#9a3412;text-align:center">
          💬 Questions? Contact us and quote your order reference${orderIds.length > 1 ? 's' : ''}:
        </p>
        <div style="text-align:center">
          ${refIdLines}
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:20px;font-size:12px;color:#94a3b8">
      Thank you for choosing <strong style="color:#E65C00">Foodie Lover</strong>! 🙏<br/>
      <span style="font-size:11px">This is an automated receipt — please do not reply to this email.</span>
    </div>
  </div>
</body>
</html>`;
}

// ─── Public: enqueueReceiptEmail ──────────────────────────────────────────────
/**
 * enqueueReceiptEmail(orderId)
 *
 * Inserts a job into email_queue with status='pending'.
 * Idempotent — safe to call multiple times for the same order:
 *   • skips if a non-failed queue entry already exists
 *   • skips if ReceiptEmailSent is already in order_events
 *
 * The background worker at /api/email/process-queue picks it up within 1 min.
 * On failure the worker retries up to 3 times with exponential backoff.
 */
export async function enqueueReceiptEmail(orderId: string): Promise<EnqueueResult> {
  const TAG = `[email/enqueue orderId=${orderId}]`;
  const sb  = getServerClient();

  try {
    // 1. Fetch order to validate email exists
    const { data: order, error: fetchErr } = await sb
      .from('orders')
      .select('customer_email')
      .eq('id', orderId)
      .single();

    if (fetchErr || !order) {
      console.warn(`${TAG} Order not found — cannot enqueue`);
      return { queued: false, reason: 'Order not found' };
    }

    const email = order.customer_email as string | null;
    if (!email) {
      console.info(`${TAG} No customer_email — skipping enqueue`);
      return { queued: false, reason: 'No customer email' };
    }

    // 2. Idempotency: skip if already sent or queued (not permanently failed)
    const { data: existing } = await sb
      .from('email_queue')
      .select('id, status, retry_count')
      .eq('order_id', orderId)
      .in('status', ['pending', 'sent'])
      .maybeSingle();

    if (existing) {
      console.info(`${TAG} Already queued/sent (status=${existing.status}) — skipping`);
      return { queued: false, reason: `Already ${existing.status}` };
    }

    // 3. Idempotency: skip if ReceiptEmailSent already recorded in order_events
    const { data: events } = await sb
      .from('order_events')
      .select('id')
      .eq('order_id', orderId)
      .eq('event_type', 'ReceiptEmailSent')
      .limit(1);

    if (events && events.length > 0) {
      console.info(`${TAG} ReceiptEmailSent event exists — skipping enqueue`);
      return { queued: false, reason: 'Already sent (order_events)' };
    }

    // 4. Insert queue entry — worker will send within the next cron cycle
    await sb.from('email_queue').insert({
      id:           newId('EQ'),
      order_id:     orderId,
      email,
      status:       'pending',
      retry_count:  0,
      next_retry_at: new Date().toISOString(),   // eligible immediately
    });

    console.info(`${TAG} ✅ Queued receipt for ${email}`);
    return { queued: true };

  } catch (err) {
    console.error(`${TAG} Failed to enqueue:`, err);
    return { queued: false, reason: String(err) };
  }
}

// ─── Public: sendReceiptEmail ─────────────────────────────────────────────────
/**
 * sendReceiptEmail(orderId)
 *
 * Immediately attempts to send a receipt for this order via Resend.
 * Used by: queue worker, manual /api/email/receipt trigger.
 *
 * Idempotent via order_events — will return { sent: false, reason: 'Already sent' }
 * if ReceiptEmailSent is already recorded. This is intentional — the worker will
 * update the queue record to 'sent' without re-sending.
 */
export async function sendReceiptEmail(
  orderId:       string,
  /** Optional email override. Used when the order has no customer_email stored
   *  (e.g. dine-in tabs). If omitted, falls back to order.customer_email. */
  emailOverride?: string,
): Promise<SendReceiptResult> {
  const TAG = `[email/send orderId=${orderId}]`;
  const sb  = getServerClient();

  try {
    // 1. Fetch order + items + events in one query
    const { data: raw, error: fetchErr } = await sb
      .from('orders')
      .select('*, order_items(*), order_events(*)')
      .eq('id', orderId)
      .single();

    if (fetchErr || !raw) {
      console.error(`${TAG} Order not found:`, fetchErr);
      return { sent: false, reason: 'Order not found' };
    }

    // 2. Resolve recipient email: prefer explicit override, fall back to order record
    const email = (emailOverride?.trim() || (raw.customer_email as string | null)) ?? null;
    if (!email) {
      console.info(`${TAG} No customer_email and no override — skipping`);
      return { sent: false, reason: 'No customer email' };
    }

    // 3. Duplicate prevention: check order_events for ReceiptEmailSent
    const events: Record<string, unknown>[] = (raw.order_events as Record<string, unknown>[]) ?? [];
    const alreadySent = events.some(ev => ev.event_type === 'ReceiptEmailSent');
    if (alreadySent) {
      console.info(`${TAG} Receipt already sent to ${email} — skipping duplicate`);
      return { sent: false, reason: 'Already sent' };
    }

    // 4. Build email
    const items: Record<string, unknown>[] = (raw.order_items as Record<string, unknown>[]) ?? [];
    const html     = buildReceiptHtml(raw as Record<string, unknown>, items);
    const orderNum = (raw.order_number as number) ?? String(raw.id).slice(-6);
    const subject  = `Your Foodie Lover Receipt — Order #${orderNum}`;

    console.info(`${TAG} Dispatching receipt to ${email}`);

    // 5. Send via Resend
    const result = await dispatchViaResend(email, subject, html);

    if ('error' in result) {
      console.error(`${TAG} Resend error: ${result.error}`);
      return { sent: false, reason: result.error };
    }

    console.info(`${TAG} ✅ Sent to ${email} — messageId: ${result.messageId}`);

    // 6. Record ReceiptEmailSent event (also prevents future duplicates)
    await sb.from('order_events').insert({
      id:           newId('EV'),
      order_id:     orderId,
      event_type:   'ReceiptEmailSent',
      performed_by: 'System',
      note:         `Receipt emailed to ${email} (messageId: ${result.messageId})`,
    });

    return { sent: true, messageId: result.messageId };

  } catch (err) {
    console.error(`${TAG} Unexpected error:`, err);
    return { sent: false, reason: String(err) };
  }
}

// ─── Public: sendTabReceiptEmail ──────────────────────────────────────────────
/**
 * sendTabReceiptEmail(tabId, emailOverride?)
 *
 * Sends a single combined receipt for ALL non-cancelled orders on a tab.
 * Designed for dine-in tabs where the manager triggers the send after close.
 *
 * - Fetches tab row + all orders + all items directly from DB (no client-state needed).
 * - Builds a merged receipt showing every item ordered across all rounds.
 * - Records a ReceiptEmailSent event on every order for idempotency.
 * - Returns { sent: true, messageId } on success or { sent: false, reason } on failure.
 */
export async function sendTabReceiptEmail(
  tabId:          string,
  emailOverride?: string,
): Promise<SendReceiptResult> {
  const TAG = `[email/sendTab tabId=${tabId}]`;
  const sb  = getServerClient();

  try {
    // 1. Fetch tab row
    const { data: tab, error: tabErr } = await sb
      .from('customer_tabs')
      .select('*')
      .eq('id', tabId)
      .single();

    if (tabErr || !tab) {
      console.error(`${TAG} Tab not found:`, tabErr?.message);
      return { sent: false, reason: 'Tab not found' };
    }

    // 2. Resolve recipient email
    const email = (emailOverride?.trim() || (tab.customer_email as string | null)) ?? null;
    if (!email) {
      console.info(`${TAG} No email — skipping`);
      return { sent: false, reason: 'No customer email' };
    }

    // 3. Fetch all non-cancelled/void orders for this tab (no need for order_events)
    const { data: rawOrders, error: ordersErr } = await sb
      .from('orders')
      .select('*, order_items(*)')
      .eq('tab_id', tabId)
      .not('status', 'in', '("cancelled","void")')
      .order('created_at', { ascending: true });

    if (ordersErr) {
      console.error(`${TAG} Orders fetch error:`, ordersErr.message);
      return { sent: false, reason: ordersErr.message };
    }

    if (!rawOrders || rawOrders.length === 0) {
      console.warn(`${TAG} No orders found for tab`);
      return { sent: false, reason: 'No orders found on this tab' };
    }

    // Note: no idempotency block here — the manager can intentionally re-send
    // (e.g. customer says they didn't receive it). Each send is still recorded
    // in order_events for the audit trail.

    // 4. Build combined receipt
    const ordersForHtml = rawOrders.map(o => ({
      order: o as Record<string, unknown>,
      items: (o.order_items as Record<string, unknown>[]) ?? [],
    }));
    const html       = buildTabReceiptHtml(tab as Record<string, unknown>, ordersForHtml, emailOverride);
    const tablePart  = (tab.table_name as string) || (tab.table_id as string) || '';
    const namePart   = (tab.customer_name as string) || 'Dine-In';
    const subject    = tablePart
      ? `Your Foodie Lover Receipt — ${namePart} (${tablePart})`
      : `Your Foodie Lover Receipt — ${namePart}`;

    console.info(`${TAG} Dispatching tab receipt to ${email} (${rawOrders.length} orders)`);

    // 5. Send via Resend
    const result = await dispatchViaResend(email, subject, html);
    if ('error' in result) {
      console.error(`${TAG} Resend error: ${result.error}`);
      return { sent: false, reason: result.error };
    }

    console.info(`${TAG} ✅ Sent to ${email} — messageId: ${result.messageId}`);

    // 6. Record ReceiptEmailSent event on each order (audit trail)
    const eventRows = rawOrders.map(o => ({
      id:           newId('EV'),
      order_id:     o.id as string,
      event_type:   'ReceiptEmailSent',
      performed_by: 'System',
      note:         `Tab receipt emailed to ${email} (messageId: ${result.messageId})`,
    }));
    await sb.from('order_events').insert(eventRows);

    return { sent: true, messageId: result.messageId };

  } catch (err) {
    console.error(`${TAG} Unexpected error:`, err);
    return { sent: false, reason: String(err) };
  }
}

// ─── Public: processEmailQueue ────────────────────────────────────────────────
/**
 * processEmailQueue()
 *
 * Called by the cron worker (/api/email/process-queue).
 * Fetches all queue entries that are ready to send (based on next_retry_at),
 * attempts each, and updates the record with the result.
 *
 * Retry schedule (exponential backoff):
 *   Attempt 1 (retry_count=0): immediate
 *   Attempt 2 (retry_count=1): 1 minute after last failure
 *   Attempt 3 (retry_count=2): 5 minutes after last failure
 *   After 3 failures: status='failed' permanently
 *
 * Returns a summary of what was processed.
 */
export async function processEmailQueue(): Promise<{
  processed: number;
  sent:      number;
  failed:    number;
  skipped:   number;
  details:   { orderId: string; email: string; result: string }[];
}> {
  const TAG = '[email/queue/worker]';
  const sb  = getServerClient();

  const summary = { processed: 0, sent: 0, failed: 0, skipped: 0, details: [] as { orderId: string; email: string; result: string }[] };

  try {
    // Fetch jobs that are ready: (pending or failed) AND retries remaining AND due now
    const now = new Date().toISOString();
    const { data: jobs, error: fetchErr } = await sb
      .from('email_queue')
      .select('*')
      .in('status', ['pending', 'failed'])
      .lt('retry_count', MAX_RETRIES)
      .lte('next_retry_at', now)
      .order('created_at', { ascending: true })
      .limit(50);  // process max 50 per run to avoid timeouts

    if (fetchErr) {
      console.error(`${TAG} Failed to fetch queue:`, fetchErr);
      return summary;
    }

    if (!jobs || jobs.length === 0) {
      console.info(`${TAG} Queue empty — nothing to process`);
      return summary;
    }

    console.info(`${TAG} Processing ${jobs.length} job(s)`);

    for (const job of jobs) {
      summary.processed++;
      const jobId   = job.id as string;
      const orderId = job.order_id as string;
      const email   = job.email as string;
      const retryN  = Number(job.retry_count);

      console.info(`${TAG} [${jobId}] attempt ${retryN + 1}/${MAX_RETRIES} → order ${orderId} → ${email}`);

      const result = await sendReceiptEmail(orderId);

      if (result.sent || result.reason === 'Already sent') {
        // Success (or another worker beat us — either way, mark sent)
        await sb.from('email_queue').update({
          status:          'sent',
          last_attempt_at: new Date().toISOString(),
          message_id:      result.sent ? result.messageId : 'dedup',
          error:           null,
        }).eq('id', jobId);

        summary.sent++;
        summary.details.push({ orderId, email, result: 'sent' });
        console.info(`${TAG} [${jobId}] ✅ sent`);

      } else {
        // Failure — increment retries and schedule next attempt
        const newRetryCount = retryN + 1;
        const isPermanentFail = newRetryCount >= MAX_RETRIES;
        const delayMs = RETRY_DELAY_MS[newRetryCount] ?? 0;
        const nextRetry = new Date(Date.now() + delayMs).toISOString();

        await sb.from('email_queue').update({
          // Keep 'pending' so the worker retries; only 'failed' after MAX_RETRIES
          status:          isPermanentFail ? 'failed' : 'pending',
          retry_count:     newRetryCount,
          last_attempt_at: new Date().toISOString(),
          next_retry_at:   isPermanentFail ? null : nextRetry,
          error:           result.reason,
        }).eq('id', jobId);

        if (isPermanentFail) {
          summary.failed++;
          summary.details.push({ orderId, email, result: `permanently_failed: ${result.reason}` });
          console.error(`${TAG} [${jobId}] ❌ permanently failed after ${MAX_RETRIES} attempts: ${result.reason}`);
        } else {
          summary.skipped++;
          summary.details.push({ orderId, email, result: `retry_${newRetryCount}: ${result.reason}` });
          console.warn(`${TAG} [${jobId}] ⚠️ attempt ${newRetryCount} failed, next retry at ${nextRetry}: ${result.reason}`);
        }
      }
    }

  } catch (err) {
    console.error(`${TAG} Worker error:`, err);
  }

  console.info(`${TAG} Done — processed:${summary.processed} sent:${summary.sent} failed:${summary.failed} retrying:${summary.skipped}`);
  return summary;
}
// ─── Transactional notification emails ───────────────────────────────────────
// Sent at key lifecycle points: order created, order ready (prepared), delivery.
// These are lightweight in comparison to the full receipt HTML — they confirm
// an event has happened and give the customer a reference number.

// ─── HTML builders ─────────────────────────────────────────────────────────

function buildConfirmationHtml(order: Record<string, unknown>, items: Record<string, unknown>[]): string {
  const orderId  = (order.id as string) || '';
  const orderNum = (order.order_number as number) ?? String(orderId).slice(-6);
  const custName = (order.customer_name as string) || 'Valued Customer';
  const total    = Number(order.total) || 0;
  const typeRaw  = (order.type as string) || 'dine-in';
  const typeLabel =
    typeRaw === 'delivery' ? '🚗 Delivery' :
    typeRaw === 'pickup'   ? '🏪 Pickup'   : '🍽️ Dine-In';
  const deliveryAddr = (order.delivery_address as string) || '';

  const itemRows = items.map(it => `
    <tr>
      <td style="padding:7px 0;border-bottom:1px solid #f0f0f0;font-size:13px;color:#334155">
        ${String(it.name)} <span style="color:#94a3b8">× ${Number(it.qty) || 1}</span>
      </td>
      <td style="padding:7px 0;border-bottom:1px solid #f0f0f0;text-align:right;font-size:13px;color:#334155">
        ₹${(Number(it.subtotal) || 0).toFixed(2)}
      </td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="font-family:'Segoe UI',Arial,sans-serif;background:#f1f5f9;margin:0;padding:24px 16px">
  <div style="max-width:520px;margin:0 auto">
    <div style="background:linear-gradient(135deg,#E65C00,#F9D423);border-radius:16px 16px 0 0;padding:28px;text-align:center">
      <div style="font-size:32px;margin-bottom:6px">✅</div>
      <h1 style="margin:0;font-size:22px;font-weight:900;color:white">Order Confirmed!</h1>
      <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.9)">Foodie Lover</p>
    </div>
    <div style="background:white;border-radius:0 0 16px 16px;padding:28px;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
      <p style="font-size:15px;color:#334155;margin:0 0 20px">Hi <strong>${custName}</strong>, we've received your order!</p>
      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:14px 18px;margin-bottom:20px">
        <div style="font-size:11px;font-weight:700;color:#9a3412;text-transform:uppercase;letter-spacing:1px">${typeLabel} — Order #${orderNum}</div>
        <div style="font-family:monospace;font-size:11px;color:#94a3b8;margin-top:4px">${orderId}</div>
        ${deliveryAddr ? `<div style="font-size:12px;color:#475569;margin-top:6px">📍 ${deliveryAddr}</div>` : ''}
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:18px">
        <tbody>${itemRows}</tbody>
      </table>
      <div style="border-top:2px solid #f1f5f9;padding-top:14px;text-align:right">
        <span style="font-size:18px;font-weight:900;color:#E65C00">Total: ₹${total.toFixed(2)}</span>
      </div>
      <p style="margin:20px 0 0;font-size:13px;color:#64748b;text-align:center">
        We'll notify you when your order is ready. Keep this email for reference.<br/>
        <span style="font-family:monospace;font-size:11px;color:#7c3aed">${orderId}</span>
      </p>
    </div>
    <div style="text-align:center;padding:16px;font-size:11px;color:#94a3b8">
      Thank you for choosing <strong style="color:#E65C00">Foodie Lover</strong>! 🙏
    </div>
  </div>
</body>
</html>`;
}

function buildOrderReadyHtml(order: Record<string, unknown>): string {
  const orderId  = (order.id as string) || '';
  const orderNum = (order.order_number as number) ?? String(orderId).slice(-6);
  const custName = (order.customer_name as string) || 'Valued Customer';
  const typeRaw  = (order.type as string) || 'pickup';
  const isDelivery = typeRaw === 'delivery';
  const icon     = isDelivery ? '🛵' : '🏪';
  const headline = isDelivery ? 'Your order is on its way!' : 'Your order is ready for pickup!';
  const message  = isDelivery
    ? 'Our delivery team will bring your order to you shortly.'
    : 'Please come to the counter to collect your order.';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="font-family:'Segoe UI',Arial,sans-serif;background:#f1f5f9;margin:0;padding:24px 16px">
  <div style="max-width:520px;margin:0 auto">
    <div style="background:linear-gradient(135deg,#16a34a,#22c55e);border-radius:16px 16px 0 0;padding:28px;text-align:center">
      <div style="font-size:40px;margin-bottom:6px">${icon}</div>
      <h1 style="margin:0;font-size:22px;font-weight:900;color:white">${headline}</h1>
      <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.9)">Foodie Lover</p>
    </div>
    <div style="background:white;border-radius:0 0 16px 16px;padding:28px;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
      <p style="font-size:15px;color:#334155;margin:0 0 20px">Hi <strong>${custName}</strong>,</p>
      <p style="font-size:14px;color:#475569;margin:0 0 24px">${message}</p>
      <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:14px 18px;text-align:center">
        <div style="font-size:11px;font-weight:700;color:#16a34a;text-transform:uppercase;letter-spacing:1px">Order #${orderNum}</div>
        <div style="font-family:monospace;font-size:11px;color:#94a3b8;margin-top:4px">${orderId}</div>
      </div>
    </div>
    <div style="text-align:center;padding:16px;font-size:11px;color:#94a3b8">
      Thank you for choosing <strong style="color:#E65C00">Foodie Lover</strong>! 🙏
    </div>
  </div>
</body>
</html>`;
}

// ─── Public: sendOrderConfirmationEmail ──────────────────────────────────────
/**
 * sendOrderConfirmationEmail(orderId)
 *
 * Sent immediately after order creation to acknowledge the customer's order.
 * Only fires if the order has a customer_email.
 * Fire-and-forget from POST /api/orders — never blocks the API response.
 */
export async function sendOrderConfirmationEmail(orderId: string): Promise<void> {
  const TAG = `[email/confirmation orderId=${orderId}]`;
  const sb  = getServerClient();

  try {
    const { data: raw, error: fetchErr } = await sb
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .single();

    if (fetchErr || !raw) {
      console.warn(`${TAG} Order not found — skipping confirmation`);
      return;
    }

    const email = raw.customer_email as string | null;
    if (!email) {
      console.info(`${TAG} No customer_email — skipping`);
      return;
    }

    const orderNum = (raw.order_number as number) ?? String(raw.id).slice(-6);
    const items    = (raw.order_items as Record<string, unknown>[]) ?? [];
    const html     = buildConfirmationHtml(raw as Record<string, unknown>, items);
    const subject  = `Order Confirmed — #${orderNum} 🍽️`;

    console.info(`${TAG} Sending confirmation to ${email}`);
    const result = await sendEmail({ to: email, subject, html });

    if ('error' in result) {
      console.error(`${TAG} Failed: ${result.error}`);
    } else {
      console.info(`${TAG} ✅ Sent — messageId: ${result.messageId}`);
    }
  } catch (err) {
    console.error(`${TAG} Unexpected error:`, err);
  }
}

// ─── Public: sendOrderReadyEmail ─────────────────────────────────────────────
/**
 * sendOrderReadyEmail(orderId)
 *
 * Sent when order status transitions to 'prepared'.
 * Tells the customer their food is ready (for pickup) or on its way (delivery).
 * Only fires if the order has a customer_email.
 * Fire-and-forget from PATCH /api/orders/[id] — never blocks the API response.
 */
export async function sendOrderReadyEmail(orderId: string): Promise<void> {
  const TAG = `[email/ready orderId=${orderId}]`;
  const sb  = getServerClient();

  try {
    const { data: raw, error: fetchErr } = await sb
      .from('orders')
      .select('id, order_number, customer_name, customer_email, type')
      .eq('id', orderId)
      .single();

    if (fetchErr || !raw) {
      console.warn(`${TAG} Order not found — skipping ready notification`);
      return;
    }

    const email = raw.customer_email as string | null;
    if (!email) {
      console.info(`${TAG} No customer_email — skipping`);
      return;
    }

    const orderNum  = (raw.order_number as number) ?? String(raw.id).slice(-6);
    const typeRaw   = (raw.type as string) || 'pickup';
    const isDelivery = typeRaw === 'delivery';
    const subject   = isDelivery
      ? `Your Foodie Lover Order #${orderNum} is On Its Way! 🛵`
      : `Your Foodie Lover Order #${orderNum} is Ready! 🏪`;
    const html      = buildOrderReadyHtml(raw as Record<string, unknown>);

    console.info(`${TAG} Sending ready notification to ${email}`);
    const result = await sendEmail({ to: email, subject, html });

    if ('error' in result) {
      console.error(`${TAG} Failed: ${result.error}`);
    } else {
      console.info(`${TAG} ✅ Sent — messageId: ${result.messageId}`);
    }
  } catch (err) {
    console.error(`${TAG} Unexpected error:`, err);
  }
}
