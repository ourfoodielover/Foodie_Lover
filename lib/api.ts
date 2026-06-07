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
  source?:         string;
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
  createdAt:      string;       // mapped from created_at
  closedAt?:      string;       // mapped from closed_at
  orderIds?:      string[];     // optional legacy
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
  opts?:  { note?: string; deliveryPerson?: string; cancelReason?: string },
): Promise<Order> {
  return apiFetch<Order>(`/api/orders/${id}`, {
    method: 'PATCH',
    body:   JSON.stringify({ status, by, ...opts }),
  });
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

export async function updateItemStatus(
  orderId:    string,
  itemIndex:  number,
  itemStatus: string,
): Promise<Order> {
  return apiFetch<Order>(`/api/orders/${orderId}`, {
    method: 'PATCH',
    body:   JSON.stringify({ itemIndex, itemStatus }),
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
export async function getTabs(status?: string, since?: string): Promise<CustomerTab[]> {
  const params = new URLSearchParams({ restaurantId: rid() });
  if (status) params.set('status', status);
  // 'since' limits to tabs created on/after this ISO timestamp — avoids fetching all history
  if (since)  params.set('since', since);
  return apiFetch<CustomerTab[]>(`/api/tabs?${params}`);
}

export async function createTab(data: {
  tableId?: string; customerName: string; partySize?: number; pin?: string; email?: string;
}): Promise<CustomerTab> {
  return apiFetch<CustomerTab>('/api/tabs', {
    method: 'POST',
    body:   JSON.stringify({ ...data, restaurantId: rid() }),
  });
}

// ─── Feedback ─────────────────────────────────────────────────────────────────
export async function submitFeedback(data: {
  orderId:  string;
  rating:   1 | 2 | 3 | 4 | 5;
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
export async function verifyTrackingToken(orderId: string, token: string): Promise<Order | null> {
  try {
    const order = await getOrder(orderId);
    if (!order || order.trackingToken !== token) return null;
    return order;
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
}): Promise<void> {
  await apiFetch<{ ok: boolean }>('/api/tab-devices', {
    method: 'POST',
    body:   JSON.stringify({ ...params, restaurantId: rid() }),
  });
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

export async function lookupStaffByUsername(
  username: string,
  role: string,
): Promise<{ id: string; name: string; username: string; pin: string; active: boolean } | null> {
  try {
    const list = await apiFetch<StaffMember[]>(
      `/api/staff?restaurantId=${encodeURIComponent(rid())}&role=${encodeURIComponent(role)}`,
    );
    // Find by username (case-insensitive)
    const match = list.find(
      s => s.username.toLowerCase() === username.toLowerCase(),
    );
    if (!match) return null;
    // We need the PIN — fetch full record via staff/[id]
    const full = await apiFetch<StaffMember & { pin?: string }>(
      `/api/staff/${encodeURIComponent(match.id)}`,
    );
    return { id: full.id, name: full.name, username: full.username, pin: full.pin ?? '', active: full.active };
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
