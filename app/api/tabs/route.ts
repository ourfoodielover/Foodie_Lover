// GET  /api/tabs
// POST /api/tabs
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient, newId, broadcast } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// Map raw Supabase snake_case row → camelCase CustomerTab DTO
function rowToTab(row: Record<string, unknown>) {
  return {
    id:             row.id,
    tableId:        row.table_id ?? null,
    waiterName:     row.waiter_name ?? null,
    customerName:   (row.customer_name as string) || '',
    partySize:      Number(row.party_size) || 1,
    status:         row.status,               // 'open' | 'awaiting_payment' | 'closed'
    total:          Number(row.total) || 0,
    discount:       Number(row.discount) || 0,
    discountReason: row.discount_reason ?? null,
    paymentMethod:  (row.payment_method as string) || 'cod',
    pin:            (row.pin as string) || null,   // table session PIN stored server-side
    email:          (row.customer_email as string | null) ?? null,
    createdAt:      row.created_at,
    closedAt:       row.closed_at ?? null,
  };
}

// Extracts a human-readable message from any thrown value.
function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err) return String((err as { message: unknown }).message);
  return String(err);
}

export async function GET(req: NextRequest) {
  try {
    const sb  = getServerClient();
    const url = new URL(req.url);
    const rid    = url.searchParams.get('restaurantId') ?? 'rest_default';
    const status = url.searchParams.get('status');
    // 'since' limits results to rows with created_at >= value (ISO string).
    // Used by the admin page to only fetch today's closed tabs instead of all history.
    const since  = url.searchParams.get('since');
    let query = sb.from('customer_tabs').select('*').eq('restaurant_id', rid);
    if (status) query = query.eq('status', status);
    if (since)  query = query.gte('created_at', since);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) {
      console.error('[GET /api/tabs] Supabase error:', error.message, '| code:', error.code);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json((data ?? []).map(rowToTab));
  } catch (err) {
    console.error('[GET /api/tabs] unexpected error:', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const sb   = getServerClient();
    let body: Record<string, unknown>;
    try {
      body = await req.json() as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 });
    }

    // Validate required fields
    if (!body.customerName || String(body.customerName).trim().length < 1) {
      return NextResponse.json({ error: 'customerName is required' }, { status: 400 });
    }

    const rid = (body.restaurantId as string | undefined) ?? 'rest_default';
    const id  = newId('TAB');

    // ── Resolve tableId: clients send URL-param values (e.g. "T1", "tbl_01", or
    //    legacy "T01"/"T04"). Look up the real DB id by matching id OR name so
    //    the FK constraint on customer_tabs.table_id is never violated.
    //
    //    Normalization: "T04" → "T4" (strip leading zeros from T-prefixed names)
    //    so old QR codes still work even though the DB stores name as "T4".
    let resolvedTableId: string | null = null;
    if (body.tableId) {
      const tableIdStr = String(body.tableId);
      // Build normalized variant: T04 → T4, T010 → T10, tbl_04 → unchanged
      const normalizedStr = tableIdStr.replace(/^([A-Za-z]+)0+(\d)/, '$1$2');
      // Deduplicate — if normalizing didn't change anything, don't duplicate the filter
      const orParts = Array.from(
        new Set([`id.eq.${tableIdStr}`, `name.eq.${tableIdStr}`, `name.eq.${normalizedStr}`]),
      ).join(',');
      const { data: tableRow, error: tableErr } = await sb
        .from('tables')
        .select('id')
        .eq('restaurant_id', rid)
        .or(orParts)
        .maybeSingle();
      if (tableErr) {
        console.error('[POST /api/tabs] table lookup error:', tableErr.message);
        return NextResponse.json({ error: tableErr.message }, { status: 500 });
      }
      if (!tableRow) {
        console.error('[POST /api/tabs] table not found in DB:', tableIdStr);
        return NextResponse.json(
          { error: `Table '${tableIdStr}' not found. Please scan the QR code again or contact staff.` },
          { status: 400 },
        );
      }
      resolvedTableId = (tableRow as Record<string, unknown>).id as string;
    }

    // Validate + store optional customer email (no blocking — just trim and check)
    const rawEmail = body.email ? String(body.email).trim() : null;
    const customerEmail = rawEmail && rawEmail.includes('@') ? rawEmail : null;

    const { error } = await sb.from('customer_tabs').insert({
      id,
      restaurant_id:  rid,
      table_id:       resolvedTableId,
      waiter_id:      body.waiterId      ?? null,
      waiter_name:    body.waiterName    ?? null,
      customer_name:  String(body.customerName).trim(),
      party_size:     Number(body.partySize) || 1,
      pin:            body.pin ? String(body.pin) : null,  // 4-digit PIN for table security
      customer_email: customerEmail,
      status:         'open',
    });
    if (error) {
      console.error('[POST /api/tabs] insert error:', error.message, '| code:', error.code);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // ── Mark the Supabase table row as 'occupied' ───────────────────────────
    // Soft update: if the row doesn't match we log a warning but don't fail.
    if (resolvedTableId) {
      const { error: tblErr } = await sb
        .from('tables')
        .update({ status: 'occupied' })
        .eq('id', resolvedTableId);
      if (tblErr) {
        console.warn('[POST /api/tabs] could not mark table occupied:', tblErr.message);
      }
    }

    // ── Broadcast so the waiter portal gets an immediate "party seated" alert ──
    // broadcast() swallows its own errors — won't block the response.
    await broadcast(rid, 'table_session_started', {
      tabId:        id,
      tableId:      resolvedTableId,
      customerName: String(body.customerName).trim(),
      partySize:    Number(body.partySize) || 1,
    });

    // Fetch and return the mapped row
    const { data, error: fetchErr } = await sb
      .from('customer_tabs').select('*').eq('id', id).single();
    if (fetchErr || !data) {
      // Tab was created but fetch-back failed — return minimal safe payload
      console.warn('[POST /api/tabs] fetch-back failed:', fetchErr?.message);
      return NextResponse.json({ id }, { status: 201 });
    }
    return NextResponse.json(rowToTab(data as Record<string, unknown>), { status: 201 });
  } catch (err) {
    console.error('[POST /api/tabs] unexpected error:', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}
