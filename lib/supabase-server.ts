// ─── Foodie Lover — Supabase Server Client ────────────────────────────────────
// ONLY import in API routes (server-side). Never expose service role key to browser.
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export function getServerClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || url.trim() === '') {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL env var is missing or empty');
  }
  if (!key || key.trim() === '') {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY env var is missing or empty');
  }
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// ─── ID + time helpers ────────────────────────────────────────────────────────

export function newId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function now(): string {
  return new Date().toISOString();
}

export async function nextOrderNum(supabase: SupabaseClient, restaurantId: string): Promise<number> {
  const { data } = await supabase
    .from('orders')
    .select('order_number')
    .eq('restaurant_id', restaurantId)
    .order('order_number', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.order_number ?? 0) + 1;
}

// ─── Row mappers ──────────────────────────────────────────────────────────────

export function rowToOrder(
  row:    Record<string, unknown>,
  items:  Record<string, unknown>[],
  events: Record<string, unknown>[],
) {
  return {
    id:             row.id,
    orderNum:       row.order_number,
    type:           row.type,
    tableId:        row.table_id   ?? undefined,
    tabId:          row.tab_id     ?? undefined,
    customerName:   row.customer_name,
    customerEmail:  row.customer_email  ?? undefined,
    phone:          row.phone           ?? undefined,
    status:         row.status,
    subtotal:       row.subtotal,
    tax:            row.tax,
    discount:       row.discount,
    discountReason: row.discount_reason ?? undefined,
    tip:            row.tip,
    total:          row.total,
    payment:        row.payment_method  ?? undefined,
    paymentMethod:  row.payment_method  ?? undefined,
    trackingToken:  row.tracking_token  ?? undefined,
    deliveryAddress:row.delivery_address ?? undefined,
    deliveryPerson: row.delivery_person  ?? undefined,
    assignedAt:     row.assigned_at      ?? undefined,   // set when status → out_for_delivery
    deliveredAt:    row.delivered_at     ?? undefined,   // set when status → delivered
    cancelReason:   row.cancel_reason   ?? undefined,
    source:         row.source,
    issueCount:     Number(row.issue_count ?? 0),
    timestamp:      row.created_at,
    updatedAt:      row.updated_at,
    items: (items ?? []).map(i => ({
      id:         i.id,
      menuItemId: i.menu_item_id,
      name:       i.name,
      qty:        i.qty,
      price:      i.price,
      subtotal:   i.subtotal,
      itemStatus: i.item_status,
    })),
    timeline: (events ?? []).map(e => ({
      eventType: e.event_type,
      by:        e.performed_by,
      at:        e.created_at,
      note:      e.note,
    })),
  };
}

// ─── Server-side broadcast (Supabase Realtime REST API) ───────────────────────
// Sends real-time events to all subscribed clients without Socket.io

export async function broadcast(
  restaurantId: string,
  event: string,
  payload: unknown,
): Promise<void> {
  try {
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/realtime/v1/api/broadcast`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
      },
      body: JSON.stringify({
        messages: [{
          topic:   `realtime:restaurant:${restaurantId}`,
          event,
          payload,
        }],
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      console.warn(`[broadcast] ${event} failed (${res.status}):`, txt);
    }
  } catch (err) {
    console.error('[broadcast] error:', err);
  }
}
