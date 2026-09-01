// ─── Foodie Lover — API Service Layer ────────────────────────────────────────
// Async client that calls Next.js API routes instead of localStorage directly.
// Exports same function names as lib/storage.ts for easy migration.
'use client';

import { isToday } from '@/lib/date';

// ─── Types ────────────────────────────────────────────────────────────────────
export type OrderStatus =
  | 'awaiting_waiter' | 'pending' | 'preparing' | 'prepared' | 'served'
  | 're_serve_required'                        // customer reported "not received" — blocks billing
  | 'out_for_delivery' | 'delivered' | 'completed' | 'cancelled' | 'void';

export type OrderType = 'dine-in' | 'pickup' | 'delivery';
export type TabStatus = 'open' | 'awaiting_payment' | 'closed';

export interface OrderItem {
  id?:        string;
  name:       string;
  qty:        number;
  price:      number;
  subtotal:   number;
  itemStatus?: string;
  variant?:   string;  // e.g. "Half", "Full", "1 Piece" — embedded in name already
}

export interface Order {
  id:             string;
  orderNum?:      number;
  customerName:   string;
  customerEmail?: string;
  tableId?:       string;
  tabId?:         string;
  type:           OrderType;
  items:          OrderItem[];
  status:         OrderStatus;
  total:          number;
  subtotal:       number;
  tax:            number;
  discount:       number;
  discountReason?:string;
  tip:            number;
  payment?:       string;
  paymentMethod:  string;
  trackingToken?: string;
  deliveryAddress?:string;
  deliveryPerson?: string;
  assignedAt?:     string;   // ISO timestamp set when delivery person is assigned (out_for_delivery)
  deliveredAt?:    string;   // ISO timestamp set when order is delivered
  cancelReason?:   string;
  kitchenRoute?:   string;   // 'not_set' | 'printer' | 'kitchen_display'
  source?:         string;   // 'table-qr' | 'online' | 'waiter' | 'counter' | 'in-store'
  notes?:          string;   // order-level special instructions (e.g. "Less spicy, no onions")
  createdByStaffId?:   string;  // staff.id of the waiter/counter staff who submitted this order (undefined for customer-originated orders)
  createdByStaffName?: string;  // denormalised display name for the above
  phone?:          string;
  issueCount?:     number;    // increments each time customer reports "not received"
  timestamp:       string;
  updatedAt?:      string;
  timeline?:       { eventType: string; by?: string; at?: string; note?: string }[];
}

export interface MenuItem {
  id:        string;
  category:  string;
  name:      string;
  desc:      string;
  price:     number;        // = first variant's price (backward compat)
  img:       string;
  badge:     string;
  available: boolean;
  variants:  { name: string; price: number }[];  // pricing variants
}

export interface Table {
  id:       string;
  name:     string;
  capacity: number;
  status:   'available' | 'occupied' | 'reserved';
  active?:  boolean;
  // Legacy compat
  occupiedSeats?: number;
  activeSessionId?: string;
  sessionStart?: string;
}

export interface Staff {
  id:        string;
  name:      string;
  username:  string;
  pin:       string;
  role:      string;
  active:    boolean;
  createdAt?: string;
}

export interface ShiftLog {
  id:             string;
  staffId:        string;
  staffName?:     string;
  restaurantId:   string;
  shiftStart:     string;
  shiftEnd?:      string;
  ordersServed:   number;
  revenueHandled: number;
}

export interface CustomerTab {
  id:             string;
  tableId?:       string;       // mapped from table_id
  waiterName?:    string;       // mapped from waiter_name
  customerName:   string;       // mapped from customer_name ('' if absent)
  partySize:      number;       // mapped from party_size (1 if absent)
  status:         TabStatus;    // 'open' | 'awaiting_payment' | 'closed'
  total:          number;       // sum of order totals
  discount:       number;       // discount amount (0 if none)
  discountReason?:string;
  paymentMethod:  string;       // 'cod' | 'gpay' | 'card' | etc.
  pin?:           string | null;// 4-digit table session PIN (stored in Supabase)
  email?:         string | null;// optional customer email captured at tab open
  phone?:         string | null;// optional customer phone captured at tab open
  createdAt:      string;       // mapped from created_at
  closedAt?:      string;       // mapped from closed_at
  orderIds?:      string[];     // optional legacy
  // Coupon fields (populated at tab close when a reward coupon is redeemed)
  couponId?:      string | null;
  couponCode?:    string | null;
  couponDiscount?:number;       // discount given by the redeemed coupon
  // Only populated when getTabs() is called with a tableId (server computes
  // it in one grouped query for that table's tabs) — count of non-cancelled/
  // void orders on this tab, REGARDLESS of which channel created them
  // (QR self-order or Waiter-assisted). Undefined for any other getTabs() call.
  orderCount?:    number;
}

// ─── Tab Device type ──────────────────────────────────────────────────────────
export interface TabDevice {
  id:           string;
  tabId:        string;
  deviceId:     string;
  customerName: string;
  tableId?:     string | null;
  joinedAt:     string;
}

export interface AnalyticsData {
  period:     string;
  topItems:   { name: string; qty: number; revenue: number }[];
  peakHours:  { hour: number; count: number }[];
  revenueByDay: { day: string; revenue: number; orders: number }[];
  summary:    {
    avgOrderValue: number;
    totalOrders:   number;
    totalRevenue:  number;
    // Per-type counts — populated when querying analytics API
    countDineIn?:  number;
    countPickup?:  number;
    countDelivery?:number;
    countOnline?:  number;
  };
  byCategory: { category: string; orders: number; items: number }[];
  waiterPerformance: {
    staffId: string; name: string; ordersServed: number;
    revenueHandled: number; shiftHours: number; shiftStart?: string; shiftEnd?: string;
  }[];
  tableStats: { id: string; name: string; capacity: number; status: string; totalOrders: number }[];
}

// ─── Restaurant ID helper ─────────────────────────────────────────────────────
function rid(): string {
  return process.env.NEXT_PUBLIC_RESTAURANT_ID ?? 'rest_default';
}

// ─── Base fetch helper ────────────────────────────────────────────────────────
// Single source of truth for all HTTP calls in the app.
// Reads the response body ONCE (as text) then decides what to do with it so we
// never hit "body already consumed" errors in any branch.
async function apiFetch<T>(
  path:    string,
  options: RequestInit = {},
): Promise<T> {
  const base = typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000');
  const url  = `${base}${path}`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch (networkErr) {
    const msg = networkErr instanceof Error ? networkErr.message : String(networkErr);
    console.error(`[apiFetch] Network failure: ${url} | ${msg}`);
    throw new Error(`Network error — ${msg}`);
  }

  // Read body exactly once — both success and error branches need the text
  let rawBody = '';
  try { rawBody = await res.text(); } catch { /* body unreadable — proceed with empty */ }

  if (!res.ok) {
    // Log as a single string so Next.js dev overlay always shows full details.
    // Objects logged as a second argument can appear as "{}" in some overlay versions.
    console.error(
      `[apiFetch] API ERROR: ${res.status} ${res.statusText} | URL: ${url} | Body: ${rawBody || '(empty body)'}`,
    );

    // Extract the most specific human-readable message from the response body
    let errMsg = `HTTP ${res.status}`;
    if (rawBody) {
      try {
        const json = JSON.parse(rawBody) as {
          error?: string; message?: string; details?: string;
        };
        const base = json.error ?? json.message;
        errMsg = base
          ? (json.details ? `${base} — ${json.details}` : base)
          : errMsg;
      } catch {
        // Not JSON (could be an HTML error page or plain text) — use raw text truncated
        errMsg = rawBody.trim().length > 0 && rawBody.length < 300
          ? rawBody.trim()
          : `HTTP ${res.status} — ${res.statusText || 'Server error'}`;
      }
    }
    throw new Error(errMsg);
  }

  // 204 No Content — valid success with no body; return undefined typed as T
  if (!rawBody) return undefined as unknown as T;

  // Parse JSON, surfacing parse errors clearly
  try {
    return JSON.parse(rawBody) as T;
  } catch {
    console.error(
      `[apiFetch] JSON parse error: ${res.status} | URL: ${url} | Preview: ${rawBody.slice(0, 300)}`,
    );
    throw new Error(`Server returned invalid JSON from ${path}`);
  }
}

// ─── Orders ───────────────────────────────────────────────────────────────────
export async function getOrders(filters?: {
  status?:     string;
  type?:       string;
  /**
   * activeOnly: true  → exclude completed / cancelled / void orders.
   * Use in waiter, kitchen, delivery portals for in-flight data only.
   */
  activeOnly?: boolean;
  /**
   * limit: max rows returned (server caps at 200). Defaults to 150.
   */
  limit?:      number;
  /**
   * since: ISO timestamp — only return orders created after this point.
   */
  since?:      string;
  /**
   * tabId: restrict results to a single customer tab.
   * Use in the customer QR/table portal so it never fetches the whole table.
   */
  tabId?:      string;
}): Promise<Order[]> {
  const params = new URLSearchParams({ restaurantId: rid() });
  if (filters?.status)     params.set('status',    filters.status);
  if (filters?.type)       params.set('type',      filters.type);
  if (filters?.activeOnly) params.set('active',    '1');
  if (filters?.limit)      params.set('limit',     String(filters.limit));
  if (filters?.since)      params.set('since',     filters.since);
  if (filters?.tabId)      params.set('tabId',     filters.tabId);
  return apiFetch<Order[]>(`/api/orders?${params}`);
}

export async function getOrder(id: string): Promise<Order | null> {
  try { return await apiFetch<Order>(`/api/orders/${id}`); }
  catch { return null; }
}

export async function createOrder(data: {
  type:            OrderType;
  customerName:    string;
  customerEmail?:  string;
  phone?:          string;
  items:           { name: string; qty: number; price: number; subtotal: number; menuItemId?: string }[];
  subtotal:        number;
  tax?:            number;
  tip?:            number;
  total:           number;
  tableId?:        string;
  tabId?:          string;
  trackingToken?:  string;
  deliveryAddress?:string;
  source?:         string;
  notes?:              string;
  createdByStaffId?:   string;
  createdByStaffName?: string;
  // C5 remediation: stable per-submission key so a retry/offline-replay of the
  // same logical order returns the existing order instead of creating a duplicate.
  idempotencyKey?:     string;
}): Promise<Order> {
  return apiFetch<Order>('/api/orders', {
    method: 'POST',
    body:   JSON.stringify({ ...data, restaurantId: rid() }),
  });
}

export async function updateOrderStatus(
  id:     string,
  status: string,
  by:     string,
  opts?:  { note?: string; deliveryPerson?: string; cancelReason?: string; paymentMethod?: string; discount?: number; discountReason?: string },
): Promise<Order> {
  return apiFetch<Order>(`/api/orders/${id}`, {
    method: 'PATCH',
    body:   JSON.stringify({ status, by, ...opts }),
  });
}

// ─── Waiter Confirmation + Printing Workflow ─────────────────────────────────

/**
 * confirmAndPrintOrder — waiter approves an `awaiting_waiter` / `pending`
 * order. Moves it to 'preparing' and queues a KOT print job for the
 * companion print agent. Returns the updated order plus `printJobId`.
 */
export async function confirmAndPrintOrder(
  id: string,
  by: string,
  note?: string,
): Promise<Order & { printJobId?: string }> {
  return apiFetch<Order & { printJobId?: string }>(`/api/orders/${id}`, {
    method: 'PATCH',
    body:   JSON.stringify({ action: 'confirm_and_print', by, note }),
  });
}

/**
 * rejectOrder — waiter declines an `awaiting_waiter` / `pending` order
 * before it reaches the kitchen (e.g. item out of stock). Sets status to
 * 'cancelled' with the given reason.
 */
export async function rejectOrder(
  id: string,
  by: string,
  reason: string,
): Promise<Order> {
  return apiFetch<Order>(`/api/orders/${id}`, {
    method: 'PATCH',
    body:   JSON.stringify({ action: 'reject', by, reason }),
  });
}

/**
 * reprintOrder — queues another KOT (or receipt) print job for an order
 * that has already been confirmed, e.g. the kitchen printer jammed.
 */
export async function reprintOrder(
  id: string,
  by: string,
  jobType: 'kot' | 'receipt' = 'kot',
): Promise<Order & { printJobId?: string }> {
  return apiFetch<Order & { printJobId?: string }>(`/api/orders/${id}`, {
    method: 'PATCH',
    body:   JSON.stringify({ action: 'reprint', by, jobType }),
  });
}

/**
 * confirmAndKitchenOrder — waiter approves an `awaiting_waiter` / `pending`
 * order and routes it directly to the kitchen display (no KOT print job).
 * Moves order to 'preparing' and sets kitchen_route = 'kitchen_display'.
 */
export async function confirmAndKitchenOrder(
  id: string,
  by: string,
  note?: string,
): Promise<Order> {
  return apiFetch<Order>(`/api/orders/${id}`, {
    method: 'PATCH',
    body:   JSON.stringify({ action: 'confirm_and_kitchen', by, note }),
  });
}

/**
 * switchToKitchenDisplay — after a print job fails, waiter opts to show
 * the order on the kitchen display instead. Changes kitchen_route from
 * 'printer' to 'kitchen_display' and broadcasts 'order_confirmed'.
 */
export async function switchToKitchenDisplay(
  id: string,
  by: string,
): Promise<Order> {
  return apiFetch<Order>(`/api/orders/${id}`, {
    method: 'PATCH',
    body:   JSON.stringify({ action: 'switch_to_kitchen', by }),
  });
}

/**
 * genIdempotencyKey — stable per-submission key for any write that must
 * survive a double-tap or an offline/network retry without creating a
 * duplicate (matches the pattern app/online/page.tsx already uses for
 * createOrder). Call once per user action, not once per render.
 */
export function genIdempotencyKey(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * orderMoreOnPickup — Waiter "Order More" for an already-confirmed Pickup
 * order (task spec Part A6-A9 / B3). Appends ONLY the newly-ordered items
 * to the SAME order (no new order/customer is created) — the server
 * revalidates that the order is still type='pickup' and still in an active
 * kitchen status (pending/preparing/prepared) before accepting the items,
 * and only the new items are sent to the kitchen/printer, following
 * whichever routing (printer vs kitchen display) that order was already
 * confirmed with.
 */
export async function orderMoreOnPickup(
  orderId: string,
  data: {
    items:           { name: string; qty: number; price: number; subtotal: number; menuItemId?: string }[];
    subtotal:        number;
    total:           number;
    notes?:          string;
    by:              string;
    idempotencyKey:  string;
  },
): Promise<Order & { printJobId?: string; alreadyExists?: boolean }> {
  return apiFetch<Order & { printJobId?: string; alreadyExists?: boolean }>(`/api/orders/${orderId}`, {
    method: 'PATCH',
    body:   JSON.stringify({ action: 'order_more', ...data }),
  });
}

/**
 * getKitchenRoutingMode — the restaurant-wide default for how a confirmed
 * order reaches the kitchen: 'printer' (KOT ticket), 'kitchen_display'
 * (Kitchen Display board), or 'ask' (waiter chooses per order). Wraps the
 * same GET /api/admin/restaurant-config endpoint the main Waiter queue
 * already polls inline — exposed here as a reusable typed function for the
 * Take Order flow so a staff-submitted order can route itself the same way
 * a manually-confirmed order would.
 */
export async function getKitchenRoutingMode(): Promise<'ask' | 'printer' | 'kitchen_display'> {
  try {
    const d = await apiFetch<{ kitchen_mode?: string }>('/api/admin/restaurant-config');
    return d.kitchen_mode === 'printer' || d.kitchen_mode === 'kitchen_display' ? d.kitchen_mode : 'ask';
  } catch {
    return 'ask'; // safest fallback — lets the waiter choose explicitly rather than guessing
  }
}

export async function applyDiscount(
  id:     string,
  amount: number,
  note:   string,
  by?:    string,
): Promise<Order> {
  return apiFetch<Order>(`/api/orders/${id}`, {
    method: 'PATCH',
    body:   JSON.stringify({ discount: amount, discountReason: note, by: by ?? 'Manager' }),
  });
}

// Remediation: previously took a positional `itemIndex` into order.items[],
// which the server used to re-fetch items sorted by created_at and update
// whichever row landed at that position. That's only correct as long as the
// array order the kitchen page rendered from exactly matches the server's
// re-fetch order at the moment the PATCH lands — a realtime refresh racing
// with the click, or any future change to how items are sorted/returned,
// could silently advance the wrong item's status. order_items.id is a
// stable identifier that can't drift, so this now sends that directly (the
// server's `itemId` fast path in PATCH /api/orders/[id] already existed for
// this — the index path was a fallback only the kitchen page used).
export async function updateItemStatus(
  orderId:    string,
  itemId:     string,
  itemStatus: string,
): Promise<Order> {
  return apiFetch<Order>(`/api/orders/${orderId}`, {
    method: 'PATCH',
    body:   JSON.stringify({ itemId, itemStatus }),
  });
}

export async function lookupOrderByContact(name: string, phone: string): Promise<Order | null> {
  try {
    const params = new URLSearchParams({ restaurantId: rid(), name, phone });
    const res    = await apiFetch<{ order: Order | null }>(`/api/lookup?${params}`);
    return res.order;
  } catch { return null; }
}

// ─── Menu ─────────────────────────────────────────────────────────────────────
export async function getMenu(): Promise<MenuItem[]> {
  return apiFetch<MenuItem[]>(`/api/menu?restaurantId=${rid()}`);
}

export async function saveMenuItem(item: Partial<MenuItem> & { id?: string }): Promise<MenuItem> {
  if (item.id) {
    return apiFetch<MenuItem>(`/api/menu/${item.id}`, {
      method: 'PATCH',
      body:   JSON.stringify(item),
    });
  }
  return apiFetch<MenuItem>('/api/menu', {
    method: 'POST',
    body:   JSON.stringify({ ...item, restaurantId: rid() }),
  });
}

export async function deleteMenuItem(id: string): Promise<void> {
  await apiFetch(`/api/menu/${id}`, { method: 'DELETE' });
}

// ─── Tables ───────────────────────────────────────────────────────────────────
export async function getTables(): Promise<Table[]> {
  return apiFetch<Table[]>(`/api/tables?restaurantId=${rid()}`);
}

export async function updateTable(id: string, data: Partial<Table>): Promise<Table> {
  return apiFetch<Table>(`/api/tables/${id}`, {
    method: 'PATCH',
    body:   JSON.stringify(data),
  });
}

export async function createTable(name: string, capacity: number): Promise<{ id: string }> {
  return apiFetch<{ id: string }>('/api/tables', {
    method: 'POST',
    body:   JSON.stringify({ name, capacity, restaurantId: rid() }),
  });
}

export async function deleteTable(id: string): Promise<void> {
  await apiFetch<void>(`/api/tables/${id}`, { method: 'DELETE' });
}

// ─── Staff ────────────────────────────────────────────────────────────────────
export async function getStaff(role?: string): Promise<Staff[]> {
  const params = new URLSearchParams({ restaurantId: rid() });
  if (role) params.set('role', role);
  return apiFetch<Staff[]>(`/api/staff?${params}`);
}

export async function createStaffMember(data: {
  name: string; username: string; pin: string; role: string;
}): Promise<Staff> {
  return apiFetch<Staff>('/api/staff', {
    method: 'POST',
    body:   JSON.stringify({ ...data, restaurantId: rid() }),
  });
}

export async function updateStaffMember(
  id:   string,
  data: { pin?: string; active?: boolean; name?: string },
): Promise<Staff> {
  return apiFetch<Staff>(`/api/staff/${id}`, {
    method: 'PATCH',
    body:   JSON.stringify(data),
  });
}

export async function deleteStaffMember(id: string): Promise<void> {
  await apiFetch(`/api/staff/${id}`, { method: 'DELETE' });
}

// ─── Customer Tabs ────────────────────────────────────────────────────────────
// getTabs() returns EVERY tab at the restaurant (including other tables'
// name/phone/email/PIN) and now requires a staff session server-side — only
// call it from a staff portal (waiter/manager/admin). Customer-facing code
// (the table QR portal) that already knows its own tab id must use getTab()
// instead, which is public and scoped to exactly that one tab.
export async function getTabs(status?: string, since?: string, tableId?: string): Promise<CustomerTab[]> {
  const params = new URLSearchParams({ restaurantId: rid() });
  if (status)  params.set('status', status);
  // 'since' limits to tabs created on/after this ISO timestamp — avoids fetching all history
  if (since)   params.set('since', since);
  // 'tableId' scopes to one physical table's active sessions — e.g. the
  // Waiter "Take Order" screen's Table → Active Customers step. When set,
  // each returned tab also carries orderCount (see CustomerTab.orderCount).
  if (tableId) params.set('tableId', tableId);
  return apiFetch<CustomerTab[]>(`/api/tabs?${params}`);
}
export async function getTab(id: string): Promise<CustomerTab | null> {
  try {
    return await apiFetch<CustomerTab>(`/api/tabs/${id}`);
  } catch {
    return null;
  }
}

export async function createTab(data: {
  tableId?: string; customerName: string; partySize?: number; pin?: string; email?: string; phone?: string;
  // Set when a waiter opens this tab on the customer's behalf (Staff-Assisted
  // Ordering / Take Order). Server already accepted these two fields since
  // the original schema (customer_tabs.waiter_id / waiter_name) — this client
  // wrapper simply didn't expose them until now. Omitted entirely for a
  // customer-created (QR) tab, exactly as before.
  waiterId?: string; waiterName?: string;
}): Promise<CustomerTab> {
  return apiFetch<CustomerTab>('/api/tabs', {
    method: 'POST',
    body:   JSON.stringify({ ...data, restaurantId: rid() }),
  });
}

// ─── Feedback ─────────────────────────────────────────────────────────────────
export async function submitFeedback(data: {
  orderId?: string;  // pickup/delivery: provide orderId
  tabId?:   string;  // dine-in: provide tabId (API resolves to a representative order)
  rating:   number;  // 0.5–5.0 in 0.5 increments (half-star support)
  comment?: string;
}): Promise<{ ok: boolean; alreadySubmitted?: boolean }> {
  return apiFetch<{ ok: boolean; alreadySubmitted?: boolean }>('/api/feedback', {
    method: 'POST',
    body:   JSON.stringify(data),
  });
}

export async function closeTab(
  id:             string,
  paymentMethod:  string,
  discount?:      number,
  discountReason?:string,
): Promise<CustomerTab> {
  return apiFetch<CustomerTab>(`/api/tabs/${id}`, {
    method: 'PATCH',
    body:   JSON.stringify({
      close: true,
      paymentMethod,
      discount:       discount ?? 0,
      discountReason: discountReason ?? null,
      restaurantId:   rid(),
    }),
  });
}

/**
 * Admin-only: force-close a stale/ghost session regardless of order state.
 * Bypasses the re_serve_required guard. Use only for stuck/abandoned sessions.
 */
export async function forceCloseTab(id: string, tableId?: string): Promise<CustomerTab> {
  return apiFetch<CustomerTab>(`/api/tabs/${id}`, {
    method: 'PATCH',
    body:   JSON.stringify({
      close:         true,
      force:         true,           // bypasses re_serve_required guard
      paymentMethod: 'admin_override',
      discount:      0,
      tableId:       tableId ?? null,
      restaurantId:  rid(),
    }),
  });
}

export async function updateTab(
  id:   string,
  data: {
    status?:        TabStatus;
    discount?:      number;
    discountReason?:string;
    paymentMethod?: string;
    customerName?:  string;
    partySize?:     number;
    total?:         number;
    waiterName?:    string;
  },
): Promise<CustomerTab> {
  return apiFetch<CustomerTab>(`/api/tabs/${id}`, {
    method: 'PATCH',
    body:   JSON.stringify(data),
  });
}

export async function applyTabDiscount(
  tabId:  string,
  amount: number,
  reason: string,
): Promise<CustomerTab> {
  return updateTab(tabId, { discount: amount, discountReason: reason });
}

// ─── Shifts ───────────────────────────────────────────────────────────────────
export async function openShift(staffId: string): Promise<ShiftLog> {
  return apiFetch<ShiftLog>('/api/shifts', {
    method: 'POST',
    body:   JSON.stringify({ staffId, restaurantId: rid() }),
  });
}

export async function closeShift(
  shiftId:        string,
  ordersServed:   number,
  revenueHandled: number,
): Promise<ShiftLog> {
  return apiFetch<ShiftLog>(`/api/shifts/${shiftId}`, {
    method: 'PATCH',
    body:   JSON.stringify({ ordersServed, revenueHandled }),
  });
}

export async function getShifts(opts?: { staffId?: string; open?: boolean }): Promise<ShiftLog[]> {
  const params = new URLSearchParams({ restaurantId: rid() });
  if (opts?.staffId) params.set('staffId', opts.staffId);
  if (opts?.open)    params.set('open', '1');
  return apiFetch<ShiftLog[]>(`/api/shifts?${params}`);
}

// ─── Analytics ────────────────────────────────────────────────────────────────
export async function getAnalytics(period: 'today' | 'week' | 'month' | 'all' = 'today'): Promise<AnalyticsData> {
  // Server uses IST (Asia/Kolkata) directly — no tz offset needed from client
  return apiFetch<AnalyticsData>(`/api/analytics?restaurantId=${rid()}&period=${period}`);
}

// ─── Online order stats (computed from live Supabase orders) ─────────────────
// IMPORTANT: This replaces getOnlineOrderStats() from lib/storage.ts which reads
// localStorage. Admin dashboard must use this function with orders from getOrders().

export interface OnlineOrderStats {
  todayTotal:    number;  // all online orders today (pickup + delivery)
  todayPickup:   number;  // pickup orders today
  todayDelivery: number;  // delivery orders today
  todayRevenue:  number;  // revenue from online orders today (excl. cancelled)
  pendingOnline: number;  // online orders not yet completed/cancelled
  allTimeTotal:  number;
  allTimePickup: number;
  allTimeDelivery: number;
}

/**
 * computeOnlineOrderStats(orders)
 *
 * Computes online order statistics from a live Order[] array (from Supabase).
 * Uses the browser's local timezone for "today" boundary so IST users see
 * correct daily counts regardless of UTC offset.
 *
 * Call this inside refresh() with the fetched liveOrders — do NOT call
 * getOnlineOrderStats() from lib/storage which reads stale localStorage.
 */
export function computeOnlineOrderStats(orders: Order[]): OnlineOrderStats {
  // Only online-sourced orders (pickup / delivery placed via /online page)
  const online = orders.filter(o => o.source === 'online');

  // Today's online orders — compared in IST to avoid UTC midnight mismatch
  const todayOnline = online.filter(o => isToday(o.timestamp));

  const stats: OnlineOrderStats = {
    todayTotal:    todayOnline.length,
    todayPickup:   todayOnline.filter(o => o.type === 'pickup').length,
    todayDelivery: todayOnline.filter(o => o.type === 'delivery').length,
    todayRevenue:  todayOnline
      .filter(o => o.status !== 'cancelled')
      .reduce((s, o) => s + (o.total || 0), 0),
    pendingOnline: online.filter(
      o => !['completed', 'cancelled', 'void'].includes(o.status),
    ).length,
    allTimeTotal:    online.length,
    allTimePickup:   online.filter(o => o.type === 'pickup').length,
    allTimeDelivery: online.filter(o => o.type === 'delivery').length,
  };

  return stats;
}

// ─── Email receipt ────────────────────────────────────────────────────────────
// Manual trigger: send a receipt for a tab (preferred) or a single order.
// Pass { tabId } for dine-in — server fetches ALL tab orders from DB directly,
// so there's no dependency on the client's in-memory orders state.
// Pass { orderId } for single-order receipts (delivery/pickup auto-sends).
export async function sendEmailReceipt(
  target: { tabId: string } | { orderId: string },
  /** Optional email override — used when the DB record has no customer_email. */
  emailOverride?: string,
): Promise<{ ok: boolean; sent: boolean; reason?: string }> {
  return apiFetch<{ ok: boolean; sent: boolean; reason?: string }>('/api/email/receipt', {
    method: 'POST',
    body:   JSON.stringify({ ...target, email: emailOverride || undefined }),
  });
}

// ─── Delivery helpers ─────────────────────────────────────────────────────────
export async function getDeliveryQueue(): Promise<Order[]> {
  // ── Performance fix: fetch ONLY delivery-type orders, not all orders ─────────
  // Old: getOrders() → fetched every order then filtered client-side.
  // New: server filters by type=delivery + active=1 before sending the response.
  // ⚠️ ONLY delivery orders — pickup orders are handled separately at counter.
  // Pickup customers collect from counter: waiter marks as 'served', not via delivery portal.
  const deliveryOrders = await getOrders({ type: 'delivery', activeOnly: true });
  return deliveryOrders.filter(o =>
    // prepared          = kitchen done, waiting for delivery person pickup
    // served            = backward-compat (old data pre-fix where waiter may have used served)
    // out_for_delivery  = en route to customer (delivery person picked up)
    // delivered         = dropped off at customer, awaiting confirmation
    // re_serve_required = customer reported not received — needs re-delivery
    ['prepared', 'served', 'out_for_delivery', 'delivered', 're_serve_required'].includes(o.status),
  );
}

export async function markOrderPickedUp(orderId: string, deliveryName: string): Promise<Order> {
  // Sets status=out_for_delivery + delivery_person + assigned_at (server-side)
  return updateOrderStatus(orderId, 'out_for_delivery', deliveryName, { deliveryPerson: deliveryName });
}

export async function markOrderDelivered(orderId: string, deliveryName: string): Promise<Order> {
  // Sets status=delivered + delivered_at (server-side)
  return updateOrderStatus(orderId, 'delivered', deliveryName);
}

/**
 * Delivery partner confirms delivery AND records payment method in one action.
 * Step 1: PATCH status=delivered with paymentMethod (saves to DB, records deliveredAt).
 * Step 2: PATCH status=completed (auto-complete — fires receipt email, no customer confirm needed).
 * paymentMethod may be a combined string for split payments, e.g. "Cash ₹500 + UPI ₹300".
 */
export async function markOrderDeliveredWithPayment(
  orderId: string,
  deliveryName: string,
  paymentMethod: string,
): Promise<Order> {
  // Step 1: mark delivered + save payment method
  await apiFetch<Order>(`/api/orders/${orderId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      status:         'delivered',
      by:             deliveryName,
      paymentMethod,
      deliveryPerson: deliveryName,
    }),
  });
  // Step 2: auto-complete the order (fires receipt email to customer)
  return apiFetch<Order>(`/api/orders/${orderId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'completed', by: deliveryName }),
  });
}

// ─── Track / Verify ───────────────────────────────────────────────────────────
// Remediation (audit finding C6): this used to fetch the FULL order via
// getOrder() — no token involved in that request at all — and only compare
// order.trackingToken !== token in the browser AFTER the server had already
// sent every field (name, phone, address, items). GET /api/orders/[id] now
// enforces the token server-side (see app/api/orders/[id]/route.ts), so the
// token is sent as a query param on the request itself; an invalid/missing
// token now gets a 403 with no order data in the response body at all.
export async function verifyTrackingToken(orderId: string, token: string): Promise<Order | null> {
  try {
    return await apiFetch<Order>(`/api/orders/${encodeURIComponent(orderId)}?token=${encodeURIComponent(token)}`);
  } catch { return null; }
}

export async function customerConfirmDelivery(orderId: string): Promise<Order> {
  // MUST use action:'customer_confirm' — NOT status:'completed'.
  // The PATCH handler writes 'CustomerConfirmed' event only for this action.
  // status:'completed' would write 'PaymentCompleted' event which is NOT in
  // STEPS_DELIVERY, so the final "Delivery Confirmed" step would never light up.
  return apiFetch<Order>(`/api/orders/${orderId}`, {
    method: 'PATCH',
    body:   JSON.stringify({ action: 'customer_confirm' }),
  });
}

// ─── Tab Devices ──────────────────────────────────────────────────────────────
// Replaces lib/storage.ts device record functions (registerDevice, getDevicesForTab, etc.)
// All device-to-tab associations are now persisted in Supabase, not localStorage.

export async function registerTabDevice(params: {
  tabId: string; deviceId: string; customerName: string; tableId?: string;
  /** Individual customer's 4-digit PIN for per-person session recovery. */
  personalPin?: string;
}): Promise<void> {
  await apiFetch<{ ok: boolean }>('/api/tab-devices', {
    method: 'POST',
    body:   JSON.stringify({ ...params, restaurantId: rid() }),
  });
}

/**
 * Verifies a customer's personal PIN (stored in tab_devices.personal_pin).
 * Used by the "It's my session" Mode B recovery flow.
 * Falls back to verifying against the shared tab PIN for legacy sessions.
 *
 * Returns { ok, tabId, customerName } on success.
 */
export async function verifyPersonalPin(params: {
  tableId: string;
  customerName: string;
  pin: string;
}): Promise<{ ok: boolean; tabId?: string; customerName?: string; error?: string }> {
  try {
    return await apiFetch<{ ok: boolean; tabId?: string; customerName?: string; error?: string }>(
      '/api/tab-devices/verify',
      { method: 'POST', body: JSON.stringify(params) },
    );
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getTabDevices(tabId: string): Promise<TabDevice[]> {
  return apiFetch<TabDevice[]>(
    `/api/tab-devices?tabId=${encodeURIComponent(tabId)}&restaurantId=${encodeURIComponent(rid())}`,
  );
}

/** Returns the first device record for a specific device_id across all tabs, or null. */
export async function getDeviceTabRecord(deviceId: string): Promise<TabDevice | null> {
  const rows = await apiFetch<TabDevice[]>(
    `/api/tab-devices?deviceId=${encodeURIComponent(deviceId)}&restaurantId=${encodeURIComponent(rid())}`,
  );
  return rows.length > 0 ? rows[0] : null;
}

export async function removeTabDevice(deviceId: string, tabId?: string): Promise<void> {
  const params = new URLSearchParams({ deviceId });
  if (tabId) params.set('tabId', tabId);
  await apiFetch<{ ok: boolean }>(`/api/tab-devices?${params}`, { method: 'DELETE' });
}

// ─── Waiter Calls ─────────────────────────────────────────────────────────────
// Replaces lib/storage.ts addWaiterCall / getLastWaiterCallTime.

export async function recordWaiterCall(params: {
  tabId: string; tableId?: string; customerName?: string;
}): Promise<void> {
  await apiFetch<{ ok: boolean; calledAt: string }>('/api/waiter-calls', {
    method: 'POST',
    body:   JSON.stringify({ ...params, restaurantId: rid() }),
  });
}

/** Returns the ISO timestamp of the last waiter call for this tab, or null if none. */
export async function getLastWaiterCallAt(tabId: string): Promise<string | null> {
  const data = await apiFetch<{ calledAt: string } | null>(
    `/api/waiter-calls?tabId=${encodeURIComponent(tabId)}`,
  );
  return data?.calledAt ?? null;
}

/** Returns all recent waiter calls for this restaurant (last 2 hours). */
export async function getActiveWaiterCalls(): Promise<
  { id: string; tabId: string; tableId?: string | null; customerName?: string | null; at: string }[]
> {
  return apiFetch(
    `/api/waiter-calls?restaurantId=${encodeURIComponent(rid())}`,
  );
}

/**
 * Acknowledges a waiter call — sets acknowledged=true, records who dismissed it.
 * Uses PATCH instead of DELETE to preserve the audit trail in waiter_calls.
 */
export async function acknowledgeWaiterCallById(callId: string, acknowledgedBy?: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(
    `/api/waiter-calls?id=${encodeURIComponent(callId)}&restaurantId=${encodeURIComponent(rid())}`,
    {
      method: 'PATCH',
      body:   JSON.stringify({ acknowledgedBy: acknowledgedBy ?? null }),
    },
  );
}

// ─── Tab PIN verification ──────────────────────────────────────────────────────
// Replaces localStorage PIN check — PIN is now stored server-side in customer_tabs.pin.

export async function verifyTabPin(tabId: string, pin: string): Promise<boolean> {
  const result = await apiFetch<{ valid: boolean }>(
    `/api/tabs/${encodeURIComponent(tabId)}/verify-pin`,
    { method: 'POST', body: JSON.stringify({ pin }) },
  );
  return result.valid;
}

// ─── Order Events (food dispute) ──────────────────────────────────────────────
// Replaces lib/storage.ts addFoodReceiptDispute — appends an event to the order.

export async function createOrderEvent(
  orderId:     string,
  eventType:   string,
  performedBy?: string,
  note?:        string,
): Promise<void> {
  await apiFetch<unknown>(`/api/orders/${encodeURIComponent(orderId)}/events`, {
    method: 'POST',
    body:   JSON.stringify({ eventType, performedBy, note, restaurantId: rid() }),
  });
}

// ─── Restaurant settings (PINs etc.) ─────────────────────────────────────────
// All PIN and security-question data now lives in Supabase restaurant_settings.
// No localStorage reads/writes — all calls go through /api/settings.

export async function getSettings(): Promise<Record<string, string>> {
  return apiFetch<Record<string, string>>(
    `/api/settings?restaurantId=${encodeURIComponent(rid())}`,
  );
}

export async function getSetting(key: string): Promise<string | null> {
  const result = await apiFetch<{ value: string | null }>(
    `/api/settings?restaurantId=${encodeURIComponent(rid())}&key=${encodeURIComponent(key)}`,
  );
  return result.value;
}

export async function saveSettings(updates: Record<string, string>): Promise<void> {
  await apiFetch<{ ok: boolean }>('/api/settings', {
    method: 'PATCH',
    body:   JSON.stringify({ restaurantId: rid(), updates }),
  });
}

export async function saveSetting(key: string, value: string): Promise<void> {
  return saveSettings({ [key]: value });
}

// ─── Staff management (waiter + delivery accounts) ───────────────────────────
// Staff data lives in Supabase `staff` table — accessed via /api/staff.

export interface StaffMember {
  id:       string;
  name:     string;
  username: string;
  role:     string;
  active:   boolean;
  createdAt?: string;
}

export async function listStaff(role?: string): Promise<StaffMember[]> {
  const params = new URLSearchParams({ restaurantId: rid() });
  if (role) params.set('role', role);
  return apiFetch<StaffMember[]>(`/api/staff?${params.toString()}`);
}

export async function addStaff(data: {
  name: string; username: string; pin: string; role: string;
}): Promise<{ id: string }> {
  return apiFetch<{ id: string }>('/api/staff', {
    method: 'POST',
    body:   JSON.stringify({ ...data, restaurantId: rid() }),
  });
}

export async function patchStaff(id: string, updates: {
  pin?: string; active?: boolean; name?: string;
}): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/api/staff/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body:   JSON.stringify(updates),
  });
}

export async function removeStaff(id: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/api/staff/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

// ─── Expense tracking ─────────────────────────────────────────────────────────
// Expenses live in Supabase `expenses` table — accessed via /api/expenses.

// ─── Expense category types (moved from lib/storage for Supabase-first architecture) ──
export type ExpenseCategory =
  | 'Ingredients'
  | 'Utilities'
  | 'Staff Wages'
  | 'Rent'
  | 'Equipment'
  | 'Marketing'
  | 'Maintenance'
  | 'Packaging'
  | 'Other';

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Ingredients', 'Utilities', 'Staff Wages', 'Rent',
  'Equipment', 'Marketing', 'Maintenance', 'Packaging', 'Other',
];

// ─── Item-level status ─────────────────────────────────────────────────────────
export type ItemStatus = 'queued' | 'preparing' | 'prepared' | 'served';

// ─── Waiter / table analytics types (moved from lib/storage) ──────────────────
export interface WaiterStats {
  name:             string;
  ordersAccepted:   number;
  ordersCancelled:  number;
  ordersServed:     number;
  cancellationRate: number;
}

export interface TableOccupancyStats {
  tableId:       string;
  totalSessions: number;
  avgMinutes:    number;
  totalRevenue:  number;
  lastUsed?:     string;
}

export interface Expense {
  id:          string;
  category:    string;
  description: string;
  amount:      number;
  date:        string;
  addedBy:     string;
  createdAt:   string;
}

export interface ExpenseStats {
  todayTotal:  number;
  weekTotal:   number;
  monthTotal:  number;
  todayCount:  number;
  weekCount:   number;
  monthCount:  number;
  byCategory:  { category: string; total: number }[];
}

/**
 * getTodayRevenue — authoritative revenue for a date range, computed
 * server-side by the same engine Finance uses (computeSystemSales), so the
 * Manager Expenses page's "Today Revenue" / "Net Profit" figures always
 * agree with Finance's numbers for the same period instead of being
 * re-derived from a naive client-side orders.status filter.
 */
export async function getTodayRevenue(fromISO: string, toISO?: string): Promise<number> {
  const params = new URLSearchParams({ from: fromISO });
  if (toISO) params.set('to', toISO);
  const res = await apiFetch<{ revenue: number }>(`/api/manager/today-revenue?${params.toString()}`);
  return res.revenue;
}

/**
 * getSystemSalesSummary — same authoritative engine as getTodayRevenue(),
 * but returns the full gross/discount/net/count breakdown instead of just
 * net revenue. Used anywhere a period's "Net Revenue" / "Gross Revenue" /
 * "Discounts" headline figures need to match Finance exactly (e.g. Admin's
 * Sales Report tab), without requiring the Finance admin-PIN — this route
 * is gated to a manager/admin session only (GET /api/manager/today-revenue).
 */
export async function getSystemSalesSummary(
  fromISO: string, toISO?: string,
): Promise<{ revenue: number; gross: number; discount: number; orderCount: number }> {
  const params = new URLSearchParams({ from: fromISO });
  if (toISO) params.set('to', toISO);
  return apiFetch(`/api/manager/today-revenue?${params.toString()}`);
}

export async function listExpenses(since?: string, category?: string): Promise<Expense[]> {
  const params = new URLSearchParams({ restaurantId: rid() });
  if (since)    params.set('since', since);
  if (category) params.set('category', category);
  return apiFetch<Expense[]>(`/api/expenses?${params.toString()}`);
}

export async function addExpenseApi(data: {
  category: string; description: string; amount: number; addedBy?: string;
}): Promise<{ id: string }> {
  return apiFetch<{ id: string }>('/api/expenses', {
    method: 'POST',
    body:   JSON.stringify({ ...data, restaurantId: rid() }),
  });
}

export async function deleteExpenseApi(id: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(
    `/api/expenses?id=${encodeURIComponent(id)}&restaurantId=${encodeURIComponent(rid())}`,
    { method: 'DELETE' },
  );
}

/** Compute expense stats from a list of already-fetched expenses. */
export function computeExpenseStats(expenses: Expense[]): ExpenseStats {
  const now      = new Date();
  const weekAgo  = new Date(now.getTime() - 7  * 86_400_000);
  const monthAgo = new Date(now.getTime() - 30 * 86_400_000);

  // isToday uses IST — avoids UTC midnight mismatch when running on Vercel
  const todayExp  = expenses.filter(e => isToday(e.createdAt));
  const weekExp   = expenses.filter(e => new Date(e.createdAt) >= weekAgo);
  const monthExp  = expenses.filter(e => new Date(e.createdAt) >= monthAgo);

  const catMap = new Map<string, number>();
  expenses.forEach(e => catMap.set(e.category, (catMap.get(e.category) ?? 0) + e.amount));

  return {
    todayTotal:  todayExp.reduce((s, e) => s + e.amount, 0),
    weekTotal:   weekExp.reduce((s, e) => s + e.amount, 0),
    monthTotal:  monthExp.reduce((s, e) => s + e.amount, 0),
    todayCount:  todayExp.length,
    weekCount:   weekExp.length,
    monthCount:  monthExp.length,
    byCategory:  Array.from(catMap.entries())
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total),
  };
}

// ─── Split billing ────────────────────────────────────────────────────────────
// Split bills live in Supabase `split_bills` table — accessed via /api/split-bills.

export interface SplitEntry {
  label:          string;
  amount:         number;
  paid:           boolean;
  paidAt?:        string | null;
  paidBy?:        string | null;
  paymentMethod?: string | null;
}

export interface SplitBillData {
  id:        string;
  tabId:     string;
  mode:      string;
  entries:   SplitEntry[];
  createdAt: string;
  updatedAt: string;
}

export async function getSplitBillForTabApi(tabId: string): Promise<SplitBillData | null> {
  return apiFetch<SplitBillData | null>(
    `/api/split-bills?tabId=${encodeURIComponent(tabId)}`,
  );
}

export async function createSplitBillApi(
  tabId:   string,
  mode:    string,
  entries: SplitEntry[],
): Promise<SplitBillData> {
  return apiFetch<SplitBillData>('/api/split-bills', {
    method: 'POST',
    body:   JSON.stringify({ tabId, mode, entries, restaurantId: rid() }),
  });
}

export async function updateSplitBillApi(
  id:      string,
  entries: SplitEntry[],
): Promise<SplitBillData> {
  return apiFetch<SplitBillData>(`/api/split-bills/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body:   JSON.stringify({ entries }),
  });
}

// Convenience: mark a specific entry as paid and update the bill server-side
export async function markSplitEntryPaidApi(
  bill:          SplitBillData,
  label:         string,
  paymentMethod: string,
  paidBy?:       string,
): Promise<SplitBillData> {
  const updatedEntries = bill.entries.map(e =>
    e.label === label
      ? { ...e, paid: true, paidAt: new Date().toISOString(), paidBy: paidBy ?? null, paymentMethod }
      : e,
  );
  return updateSplitBillApi(bill.id, updatedEntries);
}

// ─── Auth helpers: verify credentials against Supabase ───────────────────────
// These replace the synchronous localStorage checks in lib/auth.ts.

export async function verifyRolePin(roleKey: string, inputPin: string): Promise<boolean> {
  const stored = await getSetting(roleKey);
  return stored !== null && stored === inputPin;
}

// Remediation (audit finding C3): this used to fetch the full staff record —
// including the plaintext `pin` column — to the browser and let the caller
// compare it locally. It now POSTs the entered PIN to a server-side login
// route (/api/auth/staff-login) that verifies it in the database and never
// sends the PIN back. Returns the staff record (no `pin` field — it no longer
// exists on the response) on success, or null on any failure (unknown
// username, wrong PIN, inactive account) — callers cannot distinguish which,
// deliberately, to avoid leaking which usernames exist.
export async function lookupStaffByUsername(
  username: string,
  role: string,
  pin: string,
): Promise<{ id: string; name: string; username: string; role: string } | null> {
  try {
    const res = await fetch('/api/auth/staff-login', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ username, role, pin, restaurantId: rid() }),
    });
    const result = await res.json() as { ok: boolean; staff?: { id: string; name: string; username: string; role: string } };
    if (!result.ok || !result.staff) return null;
    return result.staff;
  } catch {
    return null;
  }
}

// ─── Order Issues — "Not Received" workflow ───────────────────────────────────
// All issue data lives in Supabase `order_issues` table.
// Abuse limit: after MAX_RETRIES reports, issue is auto-escalated to manager.

export const ISSUE_MAX_RETRIES = 3;

export interface OrderIssue {
  id:           string;
  orderId:      string;
  restaurantId: string;
  issueType:    string;   // 'not_received' | 'wrong_item' | 'quality'
  status:       string;   // 'open' | 'reserving' | 'resolved' | 'escalated'
  retryCount:   number;
  reportedBy:   string;
  reportedAt:   string;
  resolvedBy:   string | null;
  resolvedAt:   string | null;
  escalated:    boolean;
  notes:        string;
  createdAt:    string;
  updatedAt:    string;
}

/** Report "not received" — creates or increments an issue for the given order.
 *  Moves the order → re_serve_required.
 *  Auto-escalates when retryCount reaches ISSUE_MAX_RETRIES.  */
export async function reportNotReceived(
  orderId:    string,
  reportedBy: string,
  issueType:  string = 'not_received',
): Promise<OrderIssue> {
  return apiFetch<OrderIssue>('/api/order-issues', {
    method: 'POST',
    body:   JSON.stringify({ orderId, reportedBy, issueType, restaurantId: rid() }),
  });
}

/** Fetch all active (open/reserving/escalated) issues for this restaurant. */
export async function getActiveIssues(): Promise<OrderIssue[]> {
  return apiFetch<OrderIssue[]>(
    `/api/order-issues?restaurantId=${encodeURIComponent(rid())}&status=active`,
  );
}

/** Fetch all issues (including resolved) — for admin analytics. */
export async function getAllIssues(since?: string): Promise<OrderIssue[]> {
  const params = new URLSearchParams({ restaurantId: rid(), status: 'all' });
  if (since) params.set('since', since);
  return apiFetch<OrderIssue[]>(`/api/order-issues?${params.toString()}`);
}

/** Get the active issue for a specific order (null if none). */
export async function getIssueForOrder(orderId: string): Promise<OrderIssue | null> {
  const list = await apiFetch<OrderIssue[]>(
    `/api/order-issues?restaurantId=${encodeURIComponent(rid())}&orderId=${encodeURIComponent(orderId)}`,
  );
  // Return the most recent unresolved issue, or null
  return list.find(i => i.status !== 'resolved') ?? null;
}

/** Mark issue as 'reserving' — staff started re-serving.
 *  Moves order back to 'served' so customer confirmation dialog re-appears. */
export async function startReserving(issueId: string, staffName: string): Promise<OrderIssue> {
  return apiFetch<OrderIssue>(`/api/order-issues?id=${encodeURIComponent(issueId)}`, {
    method: 'PATCH',
    body:   JSON.stringify({ status: 'reserving', resolvedBy: staffName, restaurantId: rid() }),
  });
}

/** Mark issue as 'resolved' — customer confirmed receipt after re-service.
 *  Moves order to 'completed'. */
export async function resolveIssue(issueId: string, resolvedBy: string): Promise<OrderIssue> {
  return apiFetch<OrderIssue>(`/api/order-issues?id=${encodeURIComponent(issueId)}`, {
    method: 'PATCH',
    body:   JSON.stringify({ status: 'resolved', resolvedBy, restaurantId: rid() }),
  });
}

/** Manually escalate to manager. */
export async function escalateIssue(issueId: string, by: string): Promise<OrderIssue> {
  return apiFetch<OrderIssue>(`/api/order-issues?id=${encodeURIComponent(issueId)}`, {
    method: 'PATCH',
    body:   JSON.stringify({ status: 'escalated', resolvedBy: by, restaurantId: rid() }),
  });
}

// ─── Finance / Cash Flow (Admin-only) ────────────────────────────────────────
// All /api/finance/** routes require the admin PIN on every request (sent as
// the x-admin-pin header for GETs, or in the JSON body for mutations) —
// unlike most of this app's existing routes, Finance enforces real
// server-side authorization (see lib/finance-server.ts on the server side).
// The PIN is supplied by the caller (AdminFinance component keeps it only in
// React state for the lifetime of the Finance view — never in localStorage)
// and is never cached inside this module.

async function financeFetch<T>(path: string, pin: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'x-admin-pin': pin };
  return apiFetch<T>(path, { ...options, headers: { ...headers, ...(options.headers as Record<string, string> | undefined) } });
}

/** Cheap call used purely to verify a PIN before unlocking the Finance UI. */
export async function verifyFinancePin(pin: string): Promise<boolean> {
  try {
    await financeFetch<unknown>(`/api/finance/accounts?restaurantId=${rid()}`, pin);
    return true;
  } catch {
    return false;
  }
}

export interface FinanceAccount {
  id: string; name: string; type: 'cash'|'bank'|'digital'|'other';
  openingBalance: number; paymentMethodKeywords: string[];
  isDefault: boolean; isActive: boolean; sortOrder: number;
}
export interface FinanceCategory {
  id: string; name: string; kind: 'income'|'expense'; color?: string; archived: boolean;
}
export interface FinanceTransaction {
  id: string; type: 'income'|'expense'|'transfer'|'adjustment';
  accountId: string; transferToAccountId?: string; categoryId?: string;
  amount: number; description: string; occurredAt: string;
  source: 'manual'|'vendor_payment'|'salary_payment'|'reconciliation'; sourceId?: string;
  createdBy?: string; createdAt: string; updatedAt: string;
  isVoided: boolean; voidedAt?: string; voidedBy?: string; voidedReason?: string;
}
export interface SystemSaleRow {
  sourceType: 'dine-in-tab'|'order'; sourceId: string; occurredAt: string;
  gross: number; discount: number; net: number; paymentMethod: string | null;
  orderType?: string; customerName?: string;
}
export interface SystemSalesResponse {
  summary: { count: number; gross: number; discount: number; net: number };
  byType:  Record<string, { count: number; net: number }>;
  byAccount: { accountId: string; name: string; net: number }[];
  rows: SystemSaleRow[];
  truncated: boolean;
}
export interface FinanceSummary {
  from: string; to: string;
  systemSales: { count: number; gross: number; discount: number; net: number };
  managerExpenses: { count: number; total: number; byCategory: { category: string; total: number }[] };
  ledger: { income: number; expense: number; vendorPaid: number; salaryPaid: number };
  netCashFlow: number;
}
export interface Vendor {
  id: string; name: string; contactName?: string; phone?: string; email?: string;
  notes?: string; isActive: boolean; createdAt: string;
}
export interface VendorPurchase {
  id: string; vendorId: string; description: string; amount: number;
  amountPaid: number; amountDue: number; purchaseDate: string;
  status: 'unpaid'|'partially_paid'|'paid'; createdBy?: string; createdAt: string; isVoided: boolean;
}
export interface VendorPayment {
  id: string; vendorPurchaseId: string; vendorId: string; accountId: string;
  amount: number; paidAt: string; note?: string; createdBy?: string; isVoided: boolean;
}
export interface Employee {
  id: string; name: string; role: string; phone?: string; email?: string;
  joiningDate?: string; employmentType: 'full_time'|'part_time'|'contract'|'temporary';
  linkedStaffId?: string; linkedStaffName?: string; isActive: boolean; notes?: string;
  createdAt: string; updatedAt: string;
  /** true if this employee has any salary rate configured or payment ever recorded — blocks hard delete. */
  hasHistory: boolean;
}
// Common payroll designations shown as quick-pick suggestions in the Admin
// "Add/Edit Employee" form. Purely a UI convenience — employees.role is free
// text server-side (supabase/migration_025_employee_payroll.sql), so Admin
// can always type a custom designation instead ("Other").
export const EMPLOYEE_ROLE_SUGGESTIONS = [
  'Head Chef', 'Chef', 'Assistant Chef', 'Kitchen Helper', 'Waiter', 'Delivery',
  'Cashier', 'Manager', 'Supervisor', 'Cleaner', 'Security',
] as const;
export const EMPLOYMENT_TYPES = ['full_time', 'part_time', 'contract', 'temporary'] as const;

export interface SalaryConfig {
  id: string; employeeId: string; staffId?: string; salaryType: 'monthly'|'daily'|'hourly';
  amount: number; effectiveFrom: string; isActive: boolean; createdAt: string;
}
export interface SalaryPayment {
  id: string; employeeId: string; staffId?: string; salaryConfigId?: string; accountId: string;
  periodLabel: string; amount: number; paidAt: string; note?: string; isVoided: boolean;
}
export interface DailyClosing {
  id: string; businessDate: string; snapshot: FinanceSummary; isClosed: boolean;
  closedBy?: string; closedAt: string; reopenedBy?: string; reopenedAt?: string;
  notes?: string; live?: FinanceSummary;
}
export interface FinanceAuditEntry {
  id: string; entityType: string; entityId: string; action: string;
  changedBy?: string; changedAt: string; before?: unknown; after?: unknown; note?: string;
}

// Accounts
export async function listFinanceAccounts(pin: string, includeInactive = false): Promise<FinanceAccount[]> {
  return financeFetch(`/api/finance/accounts?restaurantId=${rid()}${includeInactive ? '&includeInactive=1' : ''}`, pin);
}
export async function createFinanceAccount(pin: string, data: Partial<FinanceAccount> & { name: string; type: string }): Promise<{ id: string }> {
  return financeFetch('/api/finance/accounts', pin, { method: 'POST', body: JSON.stringify({ ...data, restaurantId: rid(), pin }) });
}
export async function updateFinanceAccount(pin: string, id: string, data: Partial<FinanceAccount>): Promise<void> {
  await financeFetch(`/api/finance/accounts/${id}`, pin, { method: 'PATCH', body: JSON.stringify({ ...data, restaurantId: rid(), pin }) });
}

// Categories
export async function listFinanceCategories(pin: string, kind?: 'income'|'expense'): Promise<FinanceCategory[]> {
  return financeFetch(`/api/finance/categories?restaurantId=${rid()}${kind ? `&kind=${kind}` : ''}`, pin);
}
export async function createFinanceCategory(pin: string, data: { name: string; kind: 'income'|'expense'; color?: string }): Promise<{ id: string }> {
  return financeFetch('/api/finance/categories', pin, { method: 'POST', body: JSON.stringify({ ...data, restaurantId: rid(), pin }) });
}

// Transactions
export async function listFinanceTransactions(pin: string, filters?: {
  from?: string; to?: string; type?: string; accountId?: string; categoryId?: string; includeVoided?: boolean; limit?: number;
}): Promise<FinanceTransaction[]> {
  const params = new URLSearchParams({ restaurantId: rid() });
  if (filters?.from) params.set('from', filters.from);
  if (filters?.to) params.set('to', filters.to);
  if (filters?.type) params.set('type', filters.type);
  if (filters?.accountId) params.set('accountId', filters.accountId);
  if (filters?.categoryId) params.set('categoryId', filters.categoryId);
  if (filters?.includeVoided) params.set('includeVoided', '1');
  if (filters?.limit) params.set('limit', String(filters.limit));
  return financeFetch(`/api/finance/transactions?${params}`, pin);
}
export async function createFinanceTransaction(pin: string, data: {
  type: 'income'|'expense'|'transfer'|'adjustment'; accountId: string; transferToAccountId?: string;
  categoryId?: string; amount: number; description?: string; occurredAt?: string; by?: string;
}): Promise<{ id: string }> {
  return financeFetch('/api/finance/transactions', pin, { method: 'POST', body: JSON.stringify({ ...data, restaurantId: rid(), pin }) });
}
export async function updateFinanceTransaction(pin: string, id: string, data: {
  amount?: number; description?: string; categoryId?: string; accountId?: string; occurredAt?: string; by?: string;
}): Promise<void> {
  await financeFetch(`/api/finance/transactions/${id}`, pin, { method: 'PATCH', body: JSON.stringify({ ...data, restaurantId: rid(), pin }) });
}
export async function voidFinanceTransaction(pin: string, id: string, by: string, reason?: string): Promise<void> {
  const params = new URLSearchParams({ restaurantId: rid(), by });
  if (reason) params.set('reason', reason);
  await financeFetch(`/api/finance/transactions/${id}?${params}`, pin, { method: 'DELETE' });
}

// System sales (live, read-only)
export async function getSystemSales(pin: string, from: string, to: string): Promise<SystemSalesResponse> {
  return financeFetch(`/api/finance/system-sales?restaurantId=${rid()}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, pin);
}

// Finance overview summary (live)
export async function getFinanceSummary(pin: string, from: string, to: string): Promise<FinanceSummary> {
  return financeFetch(`/api/finance/summary?restaurantId=${rid()}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, pin);
}

// Vendors
export async function listVendors(pin: string, includeInactive = false): Promise<Vendor[]> {
  return financeFetch(`/api/finance/vendors?restaurantId=${rid()}${includeInactive ? '&includeInactive=1' : ''}`, pin);
}
export async function createVendor(pin: string, data: { name: string; contactName?: string; phone?: string; email?: string; notes?: string }): Promise<{ id: string }> {
  return financeFetch('/api/finance/vendors', pin, { method: 'POST', body: JSON.stringify({ ...data, restaurantId: rid(), pin }) });
}
export async function updateVendor(pin: string, id: string, data: Partial<Vendor>): Promise<void> {
  await financeFetch(`/api/finance/vendors/${id}`, pin, { method: 'PATCH', body: JSON.stringify({ ...data, restaurantId: rid(), pin }) });
}

// Vendor purchases (payables)
export async function listVendorPurchases(pin: string, filters?: { vendorId?: string; status?: string }): Promise<VendorPurchase[]> {
  const params = new URLSearchParams({ restaurantId: rid() });
  if (filters?.vendorId) params.set('vendorId', filters.vendorId);
  if (filters?.status) params.set('status', filters.status);
  return financeFetch(`/api/finance/vendor-purchases?${params}`, pin);
}
export async function createVendorPurchase(pin: string, data: { vendorId: string; description: string; amount: number; purchaseDate?: string; by?: string }): Promise<{ id: string }> {
  return financeFetch('/api/finance/vendor-purchases', pin, { method: 'POST', body: JSON.stringify({ ...data, restaurantId: rid(), pin }) });
}
export async function voidVendorPurchase(pin: string, id: string, by: string, reason?: string): Promise<void> {
  await financeFetch(`/api/finance/vendor-purchases/${id}`, pin, { method: 'PATCH', body: JSON.stringify({ action: 'void', by, reason, restaurantId: rid(), pin }) });
}

// Vendor payments
export async function listVendorPayments(pin: string, filters?: { vendorPurchaseId?: string; vendorId?: string }): Promise<VendorPayment[]> {
  const params = new URLSearchParams({ restaurantId: rid() });
  if (filters?.vendorPurchaseId) params.set('vendorPurchaseId', filters.vendorPurchaseId);
  if (filters?.vendorId) params.set('vendorId', filters.vendorId);
  return financeFetch(`/api/finance/vendor-payments?${params}`, pin);
}
export async function createVendorPayment(pin: string, data: { vendorPurchaseId: string; accountId: string; amount: number; paidAt?: string; note?: string; by?: string; idempotencyKey?: string }): Promise<{ id: string; purchaseStatus: string; amountPaid: number }> {
  return financeFetch('/api/finance/vendor-payments', pin, { method: 'POST', body: JSON.stringify({ ...data, restaurantId: rid(), pin }) });
}
export async function voidVendorPayment(pin: string, id: string, by: string, reason?: string): Promise<void> {
  const params = new URLSearchParams({ restaurantId: rid(), by });
  if (reason) params.set('reason', reason);
  await financeFetch(`/api/finance/vendor-payments/${id}?${params}`, pin, { method: 'DELETE' });
}

// Employees (payroll/HR master — independent of `staff` login accounts;
// see supabase/migration_025_employee_payroll.sql)
export async function listEmployees(pin: string, includeInactive = false): Promise<Employee[]> {
  return financeFetch(`/api/finance/employees?restaurantId=${rid()}${includeInactive ? '&includeInactive=1' : ''}`, pin);
}
export async function createEmployee(pin: string, data: {
  name: string; role: string; phone?: string; email?: string; joiningDate?: string;
  employmentType?: typeof EMPLOYMENT_TYPES[number]; linkedStaffId?: string; notes?: string; by?: string;
}): Promise<{ id: string }> {
  return financeFetch('/api/finance/employees', pin, { method: 'POST', body: JSON.stringify({ ...data, restaurantId: rid(), pin }) });
}
export async function updateEmployee(pin: string, id: string, data: Partial<{
  name: string; role: string; phone: string; email: string; joiningDate: string;
  employmentType: typeof EMPLOYMENT_TYPES[number]; linkedStaffId: string | null; notes: string; isActive: boolean; by: string;
}>): Promise<void> {
  await financeFetch(`/api/finance/employees/${id}`, pin, { method: 'PATCH', body: JSON.stringify({ ...data, restaurantId: rid(), pin }) });
}
export async function deleteEmployee(pin: string, id: string, by?: string): Promise<void> {
  const params = new URLSearchParams({ restaurantId: rid() });
  if (by) params.set('by', by);
  await financeFetch(`/api/finance/employees/${id}?${params}`, pin, { method: 'DELETE' });
}

// Salary config + payments — keyed by employeeId
export async function listSalaryConfig(pin: string, employeeId?: string): Promise<SalaryConfig[]> {
  const params = new URLSearchParams({ restaurantId: rid() });
  if (employeeId) params.set('employeeId', employeeId);
  return financeFetch(`/api/finance/salary-config?${params}`, pin);
}
export async function setSalaryConfig(pin: string, data: { employeeId: string; salaryType: 'monthly'|'daily'|'hourly'; amount: number; effectiveFrom?: string; by?: string }): Promise<{ id: string }> {
  return financeFetch('/api/finance/salary-config', pin, { method: 'POST', body: JSON.stringify({ ...data, restaurantId: rid(), pin }) });
}
export async function listSalaryPayments(pin: string, employeeId?: string): Promise<SalaryPayment[]> {
  const params = new URLSearchParams({ restaurantId: rid() });
  if (employeeId) params.set('employeeId', employeeId);
  return financeFetch(`/api/finance/salary-payments?${params}`, pin);
}
export async function createSalaryPayment(pin: string, data: { employeeId: string; salaryConfigId?: string; accountId: string; periodLabel: string; amount: number; paidAt?: string; note?: string; by?: string; idempotencyKey?: string }): Promise<{ id: string }> {
  return financeFetch('/api/finance/salary-payments', pin, { method: 'POST', body: JSON.stringify({ ...data, restaurantId: rid(), pin }) });
}
export async function voidSalaryPayment(pin: string, id: string, by: string, reason?: string): Promise<void> {
  const params = new URLSearchParams({ restaurantId: rid(), by });
  if (reason) params.set('reason', reason);
  await financeFetch(`/api/finance/salary-payments/${id}?${params}`, pin, { method: 'DELETE' });
}

// Daily closings
export async function getDailyClosing(pin: string, date: string): Promise<DailyClosing | null> {
  return financeFetch(`/api/finance/closings?restaurantId=${rid()}&date=${date}`, pin);
}
export async function listDailyClosings(pin: string, limit = 30): Promise<DailyClosing[]> {
  return financeFetch(`/api/finance/closings?restaurantId=${rid()}&limit=${limit}`, pin);
}
export async function closeDay(pin: string, date: string, by: string, notes?: string): Promise<{ id: string; reClosed: boolean }> {
  return financeFetch('/api/finance/closings', pin, { method: 'POST', body: JSON.stringify({ date, by, notes, restaurantId: rid(), pin }) });
}
export async function reopenDay(pin: string, date: string, by: string, reason?: string): Promise<void> {
  await financeFetch('/api/finance/closings/reopen', pin, { method: 'POST', body: JSON.stringify({ date, by, reason, restaurantId: rid(), pin }) });
}

// Audit log
export async function getFinanceAuditLog(pin: string, filters?: { entityType?: string; entityId?: string; limit?: number }): Promise<FinanceAuditEntry[]> {
  const params = new URLSearchParams({ restaurantId: rid() });
  if (filters?.entityType) params.set('entityType', filters.entityType);
  if (filters?.entityId) params.set('entityId', filters.entityId);
  if (filters?.limit) params.set('limit', String(filters.limit));
  return financeFetch(`/api/finance/audit-log?${params}`, pin);
}

// ─── Test Data Reset (Admin Danger Zone — pre-production "start clean") ──────
// Gated the same way as every other Finance route: a real admin session
// (server-side, checked by the route) PLUS the Finance admin PIN (sent as
// x-admin-pin here via financeFetch, same as every call above). See
// app/api/admin/reset-test-data/route.ts and
// supabase/migration_024_reset_test_data.sql for the full authorization and
// atomicity design.

export interface TestDataResetCounts {
  orders: number; customerTabs: number; orderItems: number; orderEvents: number;
  orderIssues: number; orderFeedback: number; printJobs: number; emailQueue: number;
  emailLog: number; waiterCalls: number; tabDevices: number; splitBills: number;
  spinResults: number; rewardCoupons: number; shiftLogs: number; managerExpenses: number;
  financeTransactions: number; financeAuditLog: number; vendorPayments: number;
  vendorPurchases: number; salaryPayments: number; dailyClosings: number; occupiedTables: number;
}
export interface TestDataResetAmounts {
  systemSalesGross: number; systemSalesDiscount: number; systemSalesNet: number;
  managerExpenses: number; financeIncome: number; financeExpense: number;
  vendorPaid: number; salaryPaid: number; netCashFlow: number;
}
export interface TestDataAccountBalance {
  accountId: string; name: string; openingBalance: number; currentBalance: number;
}
export interface TestDataResetSnapshot {
  counts: TestDataResetCounts;
  amounts: TestDataResetAmounts;
  accountBalances: TestDataAccountBalance[];
  isClean: boolean;
}
export interface TestDataResetResult {
  ok: true;
  resetId: string;
  removed: { counts: TestDataResetCounts; amounts: TestDataResetAmounts };
  before: TestDataResetSnapshot;
  verification: TestDataResetSnapshot;
  crossCheckAgrees: boolean;
  message: string;
}

/** Preview what a test-data reset would remove. Read-only — deletes nothing. */
export async function previewTestDataReset(pin: string): Promise<TestDataResetSnapshot> {
  const res = await financeFetch<{ preview: TestDataResetSnapshot }>(
    `/api/admin/reset-test-data?restaurantId=${rid()}`, pin,
  );
  return res.preview;
}

/**
 * Executes the reset. `confirmText` must be exactly "RESET TEST DATA" (the
 * server re-validates this — the client-side check is only for a fast error
 * message, never the actual gate).
 */
export async function executeTestDataReset(pin: string, confirmText: string, note?: string): Promise<TestDataResetResult> {
  return financeFetch<TestDataResetResult>('/api/admin/reset-test-data', pin, {
    method: 'POST',
    body: JSON.stringify({ confirmText, note, restaurantId: rid() }),
  });
}

// ─── Bill / Receipt printing (client wrappers over /api/billing/*) ────────────
// Server-authoritative: these never send/trust a total — the server always
// recomputes from the DB (see lib/billing-server.ts). "View Bill" and
// "Print Bill" both call the SAME server computation, so the on-screen
// preview can never disagree with what gets printed.

export interface BillLineItem {
  name:     string;
  qty:      number;
  price:    number;
  subtotal: number;
}

export interface BillRound {
  orderId:     string;
  orderNumber: number | null;
  source:      string | null;
  createdAt:   string | null;
  items:       BillLineItem[];
}

export interface BillData {
  kind:             'dine-in' | 'pickup' | 'delivery';
  restaurantName:   string;
  tabId?:           string;
  orderId?:         string;
  orderIds:         string[];
  orderNumber?:     number | null;
  tableLabel?:      string | null;
  customerName:     string;
  phone:            string | null;
  deliveryAddress?: string | null;
  items:            BillLineItem[];
  rounds?:          BillRound[];
  subtotal:         number;
  discount:         number;
  discountReason:   string | null;
  couponCode:       string | null;
  couponDiscount:   number;
  total:            number;
  isPaid:           boolean;
  paymentMethod:    string | null;
  amountDue:        number;
  generatedAt:      string;
}

/** Fetches the server-computed Dine-In bill for one exact customer_tab (never table-wide). */
export async function getDineInBill(tabId: string): Promise<BillData> {
  return apiFetch<BillData>(`/api/billing/tab/${tabId}?restaurantId=${rid()}`);
}

/** Fetches the server-computed Pickup/Delivery bill for one order (all rounds included). */
export async function getOrderBill(orderId: string): Promise<BillData> {
  return apiFetch<BillData>(`/api/billing/order/${orderId}?restaurantId=${rid()}`);
}

/**
 * printBill — queues a real print_jobs row (CUSTOMER_BILL or
 * CUSTOMER_RECEIPT) through the existing print-job → print-agent pipeline.
 * NOT browser printing. Pass a fresh idempotencyKey per user tap (via
 * genIdempotencyKey) for a normal Print action; for an intentional Reprint
 * set isReprint: true (a new key, or none, is fine — reprints are allowed
 * to create another job on purpose).
 */
export async function printBill(params: {
  kind:            'dine-in' | 'pickup' | 'delivery';
  tabId?:          string;
  orderId?:        string;
  docType:         'CUSTOMER_BILL' | 'CUSTOMER_RECEIPT';
  by:              string;
  isReprint?:      boolean;
  idempotencyKey?: string;
}): Promise<{ ok: true; printJobId: string; docType: string; bill: BillData; alreadyExists?: boolean }> {
  return apiFetch(`/api/billing/print`, {
    method: 'POST',
    body:   JSON.stringify({ ...params, restaurantId: rid() }),
  });
}
