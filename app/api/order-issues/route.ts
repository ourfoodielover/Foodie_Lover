// ─────────────────────────────────────────────────────────────────────────────
// /api/order-issues — "Not Received" issue tracking
//
// GET  ?restaurantId=&status=open|all   — list active issues
// GET  ?restaurantId=&orderId=          — get issue for specific order
// POST                                   — create / increment issue (idempotent per order)
// PATCH ?id=                             — update issue status (reserving/resolved/escalated)
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient, newId, broadcast } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// Abuse limit — after this many retries, auto-escalate to manager
const MAX_RETRIES = 3;

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err)
    return String((err as { message: unknown }).message);
  return String(err);
}

function rowToIssue(r: Record<string, unknown>) {
  return {
    id:           r.id           as string,
    orderId:      r.order_id     as string,
    restaurantId: r.restaurant_id as string,
    issueType:    (r.issue_type ?? 'not_received') as string,
    status:       (r.status ?? 'open') as string,
    retryCount:   Number(r.retry_count ?? 1),
    reportedBy:   (r.reported_by ?? '') as string,
    reportedAt:   (r.reported_at ?? r.created_at) as string,
    resolvedBy:   (r.resolved_by ?? null) as string | null,
    resolvedAt:   (r.resolved_at ?? null) as string | null,
    escalated:    Boolean(r.escalated),
    notes:        (r.notes ?? '') as string,
    createdAt:    r.created_at as string,
    updatedAt:    r.updated_at as string,
  };
}

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const sb      = getServerClient();
    const url     = new URL(req.url);
    const rid     = url.searchParams.get('restaurantId') ?? 'rest_default';
    const orderId = url.searchParams.get('orderId');
    const status  = url.searchParams.get('status') ?? 'active';

    let query = sb
      .from('order_issues')
      .select('*')
      .eq('restaurant_id', rid)
      .order('created_at', { ascending: false });

    if (orderId) {
      query = query.eq('order_id', orderId);
    } else if (status === 'active') {
      // active = open + reserving + escalated (anything unresolved)
      query = query.in('status', ['open', 'reserving', 'escalated']);
    } else if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query.limit(200);
    if (error) throw error;

    return NextResponse.json((data ?? []).map(r => rowToIssue(r as Record<string, unknown>)));
  } catch (err) {
    console.error('[GET /api/order-issues]', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}

// ── POST — report "not received" ──────────────────────────────────────────────
// Idempotent: if an open issue already exists for this order, increment retry_count.
// Side effects:
//   1. Sets order.status = 're_serve_required'
//   2. Increments orders.issue_count
//   3. Auto-escalates if retry_count >= MAX_RETRIES
//   4. Broadcasts 'order_issue_reported' to all portals
export async function POST(req: NextRequest) {
  try {
    const sb   = getServerClient();
    const body = await req.json() as Record<string, unknown>;
    const rid  = (body.restaurantId as string | undefined) ?? 'rest_default';
    const orderId     = body.orderId as string;
    const reportedBy  = (body.reportedBy as string | undefined) ?? 'Customer';
    const issueType   = (body.issueType as string | undefined) ?? 'not_received';

    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    // ── Check if open issue already exists for this order ────────────────────
    const { data: existing } = await sb
      .from('order_issues')
      .select('*')
      .eq('order_id', orderId)
      .in('status', ['open', 'reserving', 'escalated'])
      .limit(1)
      .maybeSingle();

    let issue: Record<string, unknown>;

    if (existing) {
      // ── Increment retry count on existing issue ─────────────────────────────
      const newCount   = Number(existing.retry_count ?? 1) + 1;
      const autoEscalate = newCount >= MAX_RETRIES;

      const { data: updated, error: updErr } = await sb
        .from('order_issues')
        .update({
          retry_count: newCount,
          status:      autoEscalate ? 'escalated' : 'open',
          escalated:   autoEscalate,
          updated_at:  new Date().toISOString(),
          notes:       autoEscalate
            ? `Auto-escalated after ${newCount} retries`
            : (existing.notes ?? ''),
        })
        .eq('id', existing.id)
        .select()
        .single();
      if (updErr) throw updErr;
      issue = updated as Record<string, unknown>;
    } else {
      // ── Create new issue ────────────────────────────────────────────────────
      const id = newId('ISS');
      const { data: created, error: createErr } = await sb
        .from('order_issues')
        .insert({
          id,
          order_id:      orderId,
          restaurant_id: rid,
          issue_type:    issueType,
          status:        'open',
          retry_count:   1,
          reported_by:   reportedBy,
          reported_at:   new Date().toISOString(),
          escalated:     false,
        })
        .select()
        .single();
      if (createErr) throw createErr;
      issue = created as Record<string, unknown>;
    }

    // ── Move order → re_serve_required ───────────────────────────────────────
    const { error: orderErr } = await sb
      .from('orders')
      .update({
        status:      're_serve_required',
        issue_count: Number(issue.retry_count ?? 1),
        updated_at:  new Date().toISOString(),
      })
      .eq('id', orderId);
    if (orderErr) throw orderErr;

    // ── Log order event ───────────────────────────────────────────────────────
    await sb.from('order_events').insert({
      id:           newId('EV'),
      order_id:     orderId,
      event_type:   'NotReceived',
      performed_by: reportedBy,
      note:         `Retry #${issue.retry_count}${issue.escalated ? ' — ESCALATED' : ''}`,
    });

    // ── Fetch full order for broadcast ────────────────────────────────────────
    const { data: fullOrder } = await sb
      .from('orders')
      .select('*, order_items(*), order_events(*)')
      .eq('id', orderId)
      .single();

    // ── Broadcast to all portals ──────────────────────────────────────────────
    await broadcast(rid, 'order_issue_reported', {
      issue:   rowToIssue(issue),
      order:   fullOrder,
    });

    // If escalated, also broadcast escalation event for manager portal
    if (issue.escalated) {
      await broadcast(rid, 'order_issue_escalated', {
        issue:   rowToIssue(issue),
        order:   fullOrder,
      });
    }

    return NextResponse.json(rowToIssue(issue), { status: 201 });
  } catch (err) {
    console.error('[POST /api/order-issues]', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}

// ── PATCH — update issue status ───────────────────────────────────────────────
// Supported transitions:
//   open → reserving   (waiter/delivery began re-serving)
//   reserving → resolved  (customer confirmed, or staff confirmed re-delivery)
//   any → escalated    (manual manager escalation)
export async function PATCH(req: NextRequest) {
  try {
    const sb   = getServerClient();
    const url  = new URL(req.url);
    const id   = url.searchParams.get('id');
    const body = await req.json() as Record<string, unknown>;
    const rid  = (body.restaurantId as string | undefined) ?? 'rest_default';

    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.status)     updates.status      = body.status;
    if (body.resolvedBy) updates.resolved_by = body.resolvedBy;
    if (body.notes)      updates.notes       = body.notes;
    if (body.status === 'resolved' || body.status === 'escalated') {
      if (body.status === 'resolved') {
        updates.resolved_at = new Date().toISOString();
        updates.escalated   = false;
      } else {
        updates.escalated = true;
      }
    }

    const { data: updated, error: updErr } = await sb
      .from('order_issues')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (updErr) throw updErr;

    const issue = updated as Record<string, unknown>;

    // ── Re-serve: move order back to correct in-progress status ─────────────
    if (body.status === 'reserving') {
      // Fetch the order type FIRST — the re-serve target status differs by type:
      //   delivery  → out_for_delivery  (delivery portal picks it up; person re-delivers → delivered → customer confirms)
      //   dine-in / pickup → served     (waiter physically brings it to table/counter → customer confirms)
      const { data: orderRow } = await sb
        .from('orders')
        .select('type')
        .eq('id', issue.order_id as string)
        .single();

      const isDeliveryOrder = (orderRow?.type as string | null) === 'delivery';
      const reServeStatus   = isDeliveryOrder ? 'out_for_delivery' : 'served';

      await sb.from('orders')
        .update({ status: reServeStatus, updated_at: new Date().toISOString() })
        .eq('id', issue.order_id);

      await sb.from('order_events').insert({
        id:           newId('EV'),
        order_id:     issue.order_id,
        event_type:   'ReServing',
        performed_by: (body.resolvedBy as string) ?? 'Staff',
        note:         isDeliveryOrder
          ? 'Delivery re-dispatched after "not received" report'
          : 'Staff re-serving order after "not received" report',
      });

      // Fetch full order for broadcast (after status update)
      const { data: fullOrder } = await sb
        .from('orders')
        .select('*, order_items(*), order_events(*)')
        .eq('id', issue.order_id)
        .single();

      await broadcast(rid, 'order_issue_reserving', {
        issue:  rowToIssue(issue),
        order:  fullOrder,
      });
      // Fire the right event so every portal updates:
      // - delivery → order_status_changed wakes up delivery portal (it polls out_for_delivery orders)
      // - dine-in/pickup → order_served wakes up waiter portal
      await broadcast(rid, 'order_status_changed', fullOrder);
      if (!isDeliveryOrder) {
        await broadcast(rid, 'order_served', fullOrder);
      }
    }

    if (body.status === 'resolved') {
      // Issue resolved — move order to completed
      await sb.from('orders')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', issue.order_id);

      await sb.from('order_events').insert({
        id:           newId('EV'),
        order_id:     issue.order_id,
        event_type:   'IssueResolved',
        performed_by: (body.resolvedBy as string) ?? 'Customer',
        note:         'Issue resolved — customer confirmed receipt',
      });

      const { data: fullOrder } = await sb
        .from('orders')
        .select('*, order_items(*), order_events(*)')
        .eq('id', issue.order_id)
        .single();

      await broadcast(rid, 'order_issue_resolved', {
        issue:  rowToIssue(issue),
        order:  fullOrder,
      });
      await broadcast(rid, 'payment_completed', fullOrder);
    }

    return NextResponse.json(rowToIssue(issue));
  } catch (err) {
    console.error('[PATCH /api/order-issues]', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}
