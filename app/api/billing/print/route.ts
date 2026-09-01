// POST /api/billing/print — queues a CUSTOMER_BILL or CUSTOMER_RECEIPT
// print job, through the SAME print_jobs → (out-of-scope) print-agent →
// thermal-printer pipeline the existing KITCHEN_TICKET flow already uses.
// NOT browser printing — this only ever creates a real print_jobs row; the
// physical print-agent project (unchanged, out of scope for this task)
// still does the actual printing.
//
// This route NEVER:
//   - redeems/consumes/creates a coupon
//   - modifies discount/total/payment/order status
//   - triggers Spin & Win
//   - touches Finance
//   - resends kitchen items
// It only reads (via computeDineInBill/computeOrderBill — both pure SELECTs)
// and inserts one print_jobs row (+ non-fatal order_events audit rows).
//
// Idempotency: a normal "Print Bill"/"Print Receipt" tap sends a fresh
// idempotencyKey; a double-click/network-retry with the SAME key returns
// the already-created job instead of creating a second one (mirrors the
// orders.idempotency_key / order_events.idempotency_key pattern used
// elsewhere in this codebase — see migration_027's header comment). An
// intentional Reprint (isReprint: true) is expected to send a NEW key (or
// omit it) so it's allowed to create another physical print job on purpose.
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient, newId } from '@/lib/supabase-server';
import { requireAnyStaff } from '@/lib/session-server';
import { computeDineInBill, computeOrderBill, buildBillReceiptPayload, type BillData } from '@/lib/billing-server';

export const dynamic = 'force-dynamic';

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

type Body = {
  restaurantId?:   string;
  kind:            'dine-in' | 'pickup' | 'delivery';
  tabId?:          string;
  orderId?:        string;
  docType:         'CUSTOMER_BILL' | 'CUSTOMER_RECEIPT';
  isReprint?:      boolean;
  idempotencyKey?: string;
  printerId?:      string;
  by?:             string;
};

export async function POST(req: NextRequest) {
  const auth = requireAnyStaff(req);
  if (!auth.ok) return auth.response;
  try {
    const sb   = getServerClient();
    const body = await req.json() as Body;

    if (!['dine-in', 'pickup', 'delivery'].includes(body.kind)) {
      return NextResponse.json({ error: `Invalid kind: "${body.kind}"` }, { status: 400 });
    }
    if (!['CUSTOMER_BILL', 'CUSTOMER_RECEIPT'].includes(body.docType)) {
      return NextResponse.json({ error: `Invalid docType: "${body.docType}"` }, { status: 400 });
    }
    if (body.kind === 'dine-in' && !body.tabId) {
      return NextResponse.json({ error: 'tabId is required for kind=dine-in' }, { status: 400 });
    }
    if (body.kind !== 'dine-in' && !body.orderId) {
      return NextResponse.json({ error: 'orderId is required for kind=pickup/delivery' }, { status: 400 });
    }

    const rid = body.restaurantId ?? auth.session.restaurantId ?? 'rest_default';

    // ── Compute the bill fresh from the DB — never trust a client-supplied
    //    total/subtotal/discount (task spec: server is the sole source of
    //    truth for all financial figures on a printed document). ──────────
    let bill: BillData;
    if (body.kind === 'dine-in') {
      const found = await computeDineInBill(sb, rid, body.tabId!);
      if (!found) return NextResponse.json({ error: 'Tab not found' }, { status: 404 });
      bill = found;
    } else {
      const result = await computeOrderBill(sb, rid, body.orderId!, body.kind);
      if ('error' in result) {
        if (result.error === 'not_found') return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        return NextResponse.json({ error: `This order is type "${result.actualType}", not ${body.kind}.` }, { status: 400 });
      }
      bill = result;
    }

    // ── Role gate, derived from the ACTUAL bill kind (never the client's
    //    claimed `kind` alone — computeOrderBill already re-validates type
    //    against the DB row). ────────────────────────────────────────────
    const allowedRoles =
      bill.kind === 'delivery' ? ['delivery', 'manager', 'admin'] :
      bill.kind === 'dine-in'  ? ['waiter', 'manager', 'admin'] :
      /* pickup */               ['waiter', 'manager', 'admin'];
    if (!allowedRoles.includes(auth.session.role)) {
      return NextResponse.json(
        { error: `This action requires one of: ${allowedRoles.join(', ')}.` },
        { status: 403 },
      );
    }

    // ── A RECEIPT can never claim PAID for something that isn't paid yet.
    //    buildBillReceiptPayload() already forces paymentStatus:'PENDING'
    //    in that case, but refusing outright here gives a clear error
    //    instead of silently handing back a "receipt" that just says
    //    PENDING (confusing UX, and matches the non-negotiable rule "Do NOT
    //    mark an order paid merely because a receipt was printed" — the
    //    inverse case, printing a receipt before payment, is refused too). ─
    if (body.docType === 'CUSTOMER_RECEIPT' && !bill.isPaid) {
      return NextResponse.json(
        { error: 'Cannot print a receipt before payment is completed. Use "Print Bill" for the pending amount.' },
        { status: 409 },
      );
    }

    // ── Idempotency pre-check (skipped for an intentional reprint) ───────
    if (!body.isReprint && body.idempotencyKey) {
      const { data: existing } = await sb
        .from('print_jobs')
        .select('id')
        .eq('restaurant_id', rid)
        .eq('idempotency_key', body.idempotencyKey)
        .maybeSingle();
      if (existing) {
        return NextResponse.json({ ok: true, printJobId: existing.id, docType: body.docType, bill, alreadyExists: true });
      }
    }

    const requestedBy = body.by ?? `${auth.session.role} staff`;
    const payload = buildBillReceiptPayload(body.docType, bill, {
      isReprint:   !!body.isReprint,
      requestedBy,
    });

    const printJobId = newId('PJ');
    const { error: insErr } = await sb.from('print_jobs').insert({
      id:              printJobId,
      restaurant_id:   rid,
      order_id:        bill.orderId ?? null,
      tab_id:          bill.tabId ?? null,
      job_type:        'receipt',
      status:          'queued',
      printer_id:      body.printerId ?? 'default',
      payload,
      requested_by:    requestedBy,
      is_reprint:      !!body.isReprint,
      idempotency_key: body.idempotencyKey ?? null,
    });
    if (insErr) {
      // Unique-index race on (restaurant_id, idempotency_key): another
      // concurrent request with the same key already won — return that job
      // instead of erroring, so a double-tap still resolves to exactly one job.
      if (insErr.code === '23505' && body.idempotencyKey) {
        const { data: winner } = await sb
          .from('print_jobs')
          .select('id')
          .eq('restaurant_id', rid)
          .eq('idempotency_key', body.idempotencyKey)
          .maybeSingle();
        if (winner) {
          return NextResponse.json({ ok: true, printJobId: winner.id, docType: body.docType, bill, alreadyExists: true });
        }
      }
      throw insErr;
    }

    // ── Non-fatal audit trail on the contributing order(s) ────────────────
    // Purely informational (order_events), never load-bearing — wrapped so a
    // failure here can never fail the print job that was already created.
    try {
      const note = `${body.docType} ${body.isReprint ? 're' : ''}print job ${printJobId}`;
      const eventType = body.isReprint ? 'Reprinted' : 'PrintQueued';
      const rows = bill.orderIds.map(oid => ({
        id: newId('EV'), order_id: oid, event_type: eventType,
        performed_by: requestedBy, note,
      }));
      if (rows.length) await sb.from('order_events').insert(rows);
    } catch (auditErr) {
      console.error(`[POST /api/billing/print] audit trail insert failed (non-fatal) for job ${printJobId}:`, auditErr);
    }

    return NextResponse.json({ ok: true, printJobId, docType: body.docType, bill });
  } catch (err) {
    console.error('[POST /api/billing/print] unexpected error:', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}
