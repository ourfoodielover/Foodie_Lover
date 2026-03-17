// ─── Foodie Lover — Storage Layer ─────────────────────────────────────────────
// All persistence via localStorage (no backend). v2.0 — CustomerTab system.
// Exports every type and function used across pages.

// ─── Types ────────────────────────────────────────────────────────────────────

export type OrderStatus =
  | 'awaiting_waiter'   // newly placed, waiter hasn't accepted yet
  | 'pending'           // accepted by kitchen, not yet started
  | 'preparing'         // kitchen actively cooking
  | 'prepared'          // ready for pickup by waiter / delivery person
  | 'served'            // delivered to dine-in table
  | 'out_for_delivery'  // delivery order picked up, on the way
  | 'delivered'         // arrived at customer — awaiting confirmation
  | 'completed'         // paid / confirmed and done
  | 'cancelled'         // cancelled before completion
  | 'void';             // voided by manager

export type OrderType = 'dine-in' | 'pickup' | 'delivery';

export type TabStatus = 'open' | 'awaiting_payment' | 'closed';

export interface OrderItem {
  name:        string;
  qty:         number;
  price:       number;
  subtotal:    number;
  itemStatus?: ItemStatus;
}

export interface TimelineEntry {
  status:     string;
  by?:        string;
  at?:        string;
  timestamp?: string;   // legacy alias for `at`
  note?:      string;
}

export interface Order {
  id:             string;
  orderNum?:      number;
  customerName:   string;
  tableId?:       string;
  type:           OrderType;
  items:          OrderItem[];
  status:         OrderStatus;
  total:          number;
  subtotal:       number;
  discount:       number;
  discountReason: string;
  payment:        string;
  timestamp:      string;
  cancelReason?:    string;
  cancelledAt?:     string;     // legacy alias — use timeline for cancellation time
  phone?:           string;     // customer phone number
  staffName?:       string;     // optional staff name (legacy)
  timeline?:        TimelineEntry[];
  source?:          'online' | 'in-store';  // where the order originated
  deliveryAddress?: string;     // filled for delivery orders
  trackingToken?:   string;     // secure token for /track page  (generated at order creation)
  deliveryPerson?:  string;     // name of delivery person assigned
  pickedByDeliveryId?: string; // set when a delivery person claims the order (race condition lock)
}

export interface CustomerTab {
  id:              string;
  tableId:         string;
  customerName:    string;
  partySize:       number;
  orderIds:        string[];
  tabStatus:       TabStatus;
  totalAmount:     number;    // running total of all orders in this tab
  discount:        number;
  discountReason:  string;
  paymentMethod:   string;
  createdAt:       string;
  closedAt?:       string;
  tableSessionId?: string;   // unique ID per table visit (for PIN-protected sessions)
  tableSessionPin?: string;  // 4-digit PIN set by the first customer at the table
}

export interface Table {
  id:               string;
  name:             string;   // human-readable name e.g. "Table 01"
  status:           'available' | 'occupied' | 'reserved';
  capacity:         number;
  occupiedSeats:    number;   // derived from sum of active tab partySizes
  activeSessionId?: string;   // tableSessionId of the first (host) open tab
  sessionStart?:    string;   // legacy — use CustomerTab for session info
}

export interface MenuItem {
  id:        string;
  name:      string;
  desc:      string;
  price:     number;
  img:       string;
  category:  string;
  badge:     string;
  available: boolean;
}

export interface TableOccupancy {
  tableId:   string;
  tabId:     string;
  name:      string;
  partySize: number;
  since:     string;
  status:    TabStatus;
}

// One record per (deviceId × tableId) — persists across browser restarts
export interface DeviceRecord {
  deviceId:     string;   // unique per physical device, stored in localStorage
  tableId:      string;
  tabId:        string;
  customerName: string;
  joinedAt:     string;
}

export interface EndOfDayReport {
  date:           string;
  totalOrders:    number;
  totalRevenue:   number;
  avgOrderValue:  number;
  topItems:       { name: string; qty: number }[];
  completedTabs:  number;
  voidedOrders:   number;
  discountsTotal: number;
}

export interface FraudAlert {
  id:       string;
  type:     'high_discount' | 'void_order' | 'cancel_after_prepare' | 'large_discount_chain';
  orderId?: string;
  tabId?:   string;
  detail:   string;
  by:       string;
  at:       string;
  amount?:  number;
}

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

export interface Expense {
  id:          string;
  category:    ExpenseCategory;
  description: string;
  amount:      number;
  date:        string;   // ISO date string (YYYY-MM-DD)
  addedBy:     string;
  createdAt:   string;   // ISO timestamp
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

// ─── localStorage keys ────────────────────────────────────────────────────────
const KEYS = {
  orders:      'fl_orders',
  tables:      'fl_tables',
  menu:        'fl_menu',
  pin:         'fl_admin_pin',
  tabs:        'fl_customer_tabs',
  orderNum:    'fl_order_num_counter',
  fraudAlerts: 'fl_fraud_alerts',
  waiterCalls: 'fl_waiter_calls',
  disputes:    'fl_food_disputes',
  splitBills:  'fl_split_bills',
  devices:     'fl_device_records',   // device-based session tracking
  events:      'fl_order_events',     // event log (event-based architecture)
  expenses:    'fl_expenses',         // manager expense tracker
};

// ─── Storage helpers ──────────────────────────────────────────────────────────
function ls_get<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

function ls_set<T>(key: string, val: T): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(val));
}

// ─── Default data ─────────────────────────────────────────────────────────────

export const DEFAULT_MENU: MenuItem[] = [
  { id:'M01', category:'Biryani',   name:'Chicken Dum Biryani',     desc:'Slow-cooked aromatic rice with tender chicken',     price:280, img:'🍗', badge:'bestseller', available:true },
  { id:'M02', category:'Biryani',   name:'Mutton Biryani',          desc:'Rich biryani with tender mutton pieces',            price:320, img:'🥩', badge:'famous',     available:true },
  { id:'M03', category:'Biryani',   name:'Veg Biryani',             desc:'Fragrant basmati with fresh vegetables',            price:200, img:'🥦', badge:'popular',    available:true },
  { id:'M04', category:'Biryani',   name:'Egg Biryani',             desc:'Classic biryani with boiled eggs',                  price:220, img:'🥚', badge:'',           available:true },
  { id:'M05', category:'Starters',  name:'Chicken 65',              desc:'Crispy spiced fried chicken',                       price:180, img:'🍗', badge:'bestseller', available:true },
  { id:'M06', category:'Starters',  name:'Gobi Manchurian',         desc:'Crispy cauliflower in tangy sauce',                 price:150, img:'🥦', badge:'popular',    available:true },
  { id:'M07', category:'Starters',  name:'Fish Fry',                desc:'Coastal spiced fried fish',                         price:220, img:'🐟', badge:'famous',     available:true },
  { id:'M08', category:'Starters',  name:'Paneer Tikka',            desc:'Grilled cottage cheese with bell peppers',          price:200, img:'🧀', badge:'chef',       available:true },
  { id:'M09', category:'Mains',     name:'Butter Chicken',          desc:'Creamy tomato-based chicken curry',                 price:250, img:'🍛', badge:'bestseller', available:true },
  { id:'M10', category:'Mains',     name:'Dal Tadka',               desc:'Yellow lentils with spiced tempering',              price:120, img:'🍲', badge:'',           available:true },
  { id:'M11', category:'Mains',     name:'Palak Paneer',            desc:'Cottage cheese in creamy spinach gravy',            price:180, img:'🍃', badge:'popular',    available:true },
  { id:'M12', category:'Mains',     name:'Prawn Masala',            desc:'Fresh prawns in spicy coconut gravy',               price:300, img:'🍤', badge:'chef',       available:true },
  { id:'M13', category:'Breads',    name:'Butter Naan',             desc:'Soft leavened bread with butter',                   price:45,  img:'🫓', badge:'',           available:true },
  { id:'M14', category:'Breads',    name:'Garlic Naan',             desc:'Naan topped with garlic and herbs',                 price:55,  img:'🫓', badge:'popular',    available:true },
  { id:'M15', category:'Breads',    name:'Rumali Roti',             desc:'Thin handkerchief bread',                           price:35,  img:'🫓', badge:'',           available:true },
  { id:'M16', category:'Desserts',  name:'Gulab Jamun',             desc:'Soft milk-solid dumplings in rose syrup',           price:80,  img:'🍮', badge:'bestseller', available:true },
  { id:'M17', category:'Desserts',  name:'Phirni',                  desc:'Creamy rice pudding with saffron',                  price:90,  img:'🍮', badge:'chef',       available:true },
  { id:'M18', category:'Drinks',    name:'Masala Chai',             desc:'Spiced milk tea',                                   price:40,  img:'☕', badge:'',           available:true },
  { id:'M19', category:'Drinks',    name:'Sweet Lassi',             desc:'Chilled yogurt drink',                              price:70,  img:'🥛', badge:'popular',    available:true },
  { id:'M20', category:'Drinks',    name:'Fresh Lime Soda',         desc:'Refreshing lemon soda',                             price:60,  img:'🍋', badge:'',           available:true },
];

const DEFAULT_TABLES: Table[] = Array.from({ length: 20 }, (_, i) => {
  const num      = String(i + 1).padStart(2, '0');
  const capacity = i < 4 ? 2 : i < 14 ? 4 : 6;
  const zone     = i < 4 ? 'Cosy' : i < 14 ? 'Main' : 'Banquet';
  return {
    id:            `T${num}`,
    name:          `${zone} ${num}`,
    status:        'available' as const,
    capacity,
    occupiedSeats: 0,
  };
});

// ─── Admin PIN ────────────────────────────────────────────────────────────────
export const getPin  = (): string    => ls_get<string>(KEYS.pin, '1234');
export const savePin = (p: string)   => ls_set(KEYS.pin, p);

// ─── Order number counter ─────────────────────────────────────────────────────
export function getNextOrderNumber(): number {
  const n = ls_get<number>(KEYS.orderNum, 0) + 1;
  ls_set(KEYS.orderNum, n);
  return n;
}

// ─── Orders ───────────────────────────────────────────────────────────────────
export const getOrders  = (): Order[] => ls_get<Order[]>(KEYS.orders, []);
export const saveOrders = (o: Order[]) => ls_set(KEYS.orders, o);

export function addOrder(order: Order): Order {
  // Generate tracking token if missing (used by /track page)
  if (!order.trackingToken) {
    order = { ...order, trackingToken: generateTrackingToken() };
  }
  const orders = getOrders();
  orders.push(order);
  saveOrders(orders);
  // Emit OrderPlaced event
  _addOrderEvent(order.id, 'OrderPlaced', order.customerName || 'Customer',
    order.type === 'delivery' ? `Delivery to: ${order.deliveryAddress}` :
    order.type === 'pickup'   ? 'Pickup order' : `Table ${order.tableId}`);
  return order;
}

/** Map OrderStatus → OrderEventType for automatic event emission */
const STATUS_TO_EVENT: Partial<Record<OrderStatus, OrderEventType>> = {
  pending:          'KitchenAccepted',
  preparing:        'Preparing',
  prepared:         'Prepared',
  served:           'Served',
  out_for_delivery: 'OutForDelivery',
  delivered:        'Delivered',
  completed:        'Closed',
  cancelled:        'Cancelled',
};

export function updateOrderStatus(
  id:     string,
  status: OrderStatus,
  by:     string  = 'System',
  force:  boolean = false,
): boolean {
  const orders = getOrders();
  const idx = orders.findIndex(o => o.id === id);
  if (idx === -1) return false;
  const order = orders[idx];

  // Role-based status flow enforcement (unless force=true)
  if (!force) {
    const flow: OrderStatus[] = [
      'awaiting_waiter', 'pending', 'preparing', 'prepared', 'served', 'completed',
    ];
    const currIdx = flow.indexOf(order.status);
    const nextIdx = flow.indexOf(status);
    if (currIdx === -1 || nextIdx === -1 || nextIdx !== currIdx + 1) {
      return false;
    }
  }

  orders[idx] = {
    ...order,
    status,
    timeline: [
      ...(order.timeline || []),
      { status, by, at: new Date().toISOString() },
    ],
  };
  saveOrders(orders);

  // Co-emit matching OrderEvent
  const evtType = STATUS_TO_EVENT[status];
  if (evtType) _addOrderEvent(id, evtType, by);

  return true;
}

export function cancelOrder(id: string, reason: string, by: string = 'System'): boolean {
  const orders = getOrders();
  const idx = orders.findIndex(o => o.id === id);
  if (idx === -1) return false;
  orders[idx] = {
    ...orders[idx],
    status:       'cancelled',
    cancelReason: reason,
    timeline: [
      ...(orders[idx].timeline || []),
      { status: 'cancelled', by, at: new Date().toISOString(), note: reason },
    ],
  };
  saveOrders(orders);
  _addOrderEvent(id, 'Cancelled', by, reason);
  return true;
}

export function voidOrder(id: string, reason: string, by: string = 'Manager'): boolean {
  const orders = getOrders();
  const idx = orders.findIndex(o => o.id === id);
  if (idx === -1) return false;
  orders[idx] = {
    ...orders[idx],
    status:       'void',
    cancelReason: reason,
    timeline: [
      ...(orders[idx].timeline || []),
      { status: 'void', by, at: new Date().toISOString(), note: reason },
    ],
  };
  saveOrders(orders);

  if ((orders[idx].total || 0) > 100) {
    addFraudAlert({
      type:    'void_order',
      orderId: id,
      detail:  `Order #${orders[idx].orderNum || id.slice(-4)} voided by ${by} — ₹${orders[idx].total}`,
      by,
      amount:  orders[idx].total,
    });
  }
  return true;
}

export function applyDiscount(
  id:     string,
  amount: number,
  reason: string,
  by:     string = 'Manager',
): boolean {
  const orders = getOrders();
  const idx = orders.findIndex(o => o.id === id);
  if (idx === -1) return false;
  const order = orders[idx];
  const subtotal = order.subtotal || order.total;

  const pct = amount / subtotal;
  if (pct > 0.5) {
    addFraudAlert({
      type:    'high_discount',
      orderId: id,
      detail:  `${Math.round(pct * 100)}% discount (₹${amount}) applied by ${by}`,
      by,
      amount,
    });
  }

  orders[idx] = {
    ...order,
    discount:       amount,
    discountReason: reason,
    total:          Math.max(0, subtotal - amount),
    timeline: [
      ...(order.timeline || []),
      { status: 'discount', by, at: new Date().toISOString(), note: `₹${amount} — ${reason}` },
    ],
  };
  saveOrders(orders);
  return true;
}

/** Returns completed orders within the given time period */
export function getOrdersInPeriod(period: 'today' | 'week' | 'month' | 'all'): Order[] {
  const orders = getOrders().filter(o => o.status === 'completed');
  const now = new Date();
  if (period === 'all') return orders;
  return orders.filter(o => {
    const d = new Date(o.timestamp);
    if (period === 'today') return d.toDateString() === now.toDateString();
    if (period === 'week') {
      const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
      return d >= weekAgo;
    }
    if (period === 'month') {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    return true;
  });
}

/** Export completed orders as CSV string */
export function exportOrdersCSV(): string {
  const orders = getOrders().filter(o => o.status === 'completed');
  const header = 'Order ID,Order#,Customer,Table,Type,Items,Subtotal,Discount,Total,Payment,Timestamp';
  const rows = orders.map(o => {
    const items = (o.items || []).map(i => `${i.name}x${i.qty}`).join('|');
    return [
      o.id, o.orderNum || '', o.customerName, o.tableId || '',
      o.type, `"${items}"`, o.subtotal, o.discount || 0, o.total,
      o.payment, o.timestamp,
    ].join(',');
  });
  return [header, ...rows].join('\n');
}

// ─── Tables ───────────────────────────────────────────────────────────────────
export const getTables  = (): Table[] => ls_get<Table[]>(KEYS.tables, DEFAULT_TABLES);
export const saveTables = (t: Table[]) => ls_set(KEYS.tables, t);

/**
 * Derive and persist occupancy data for a table from its active CustomerTabs.
 * Updates: status, occupiedSeats, activeSessionId.
 * Called after createTab(), closeTab(), or addPartyToTab().
 */
export function syncTableOccupancy(tableId: string): void {
  const activeTabs = getActiveTabsForTable(tableId);
  const tables     = getTables();
  const idx        = tables.findIndex(t => t.id === tableId);
  if (idx === -1) return;

  const occupiedSeats   = activeTabs.reduce((sum, t) => sum + (t.partySize || 0), 0);
  const activeSessionId = activeTabs.length > 0 ? activeTabs[0].tableSessionId : undefined;
  tables[idx] = {
    ...tables[idx],
    status:          activeTabs.length > 0 ? 'occupied' : 'available',
    occupiedSeats,
    activeSessionId,
  };
  saveTables(tables);
}

/** @deprecated Use syncTableOccupancy instead */
export function syncTableStatus(tableId: string): void {
  syncTableOccupancy(tableId);
}

/** Returns occupancy info for a table if any active tab exists */
export function getTableOccupancy(tableId: string): TableOccupancy | null {
  const activeTabs = getActiveTabsForTable(tableId);
  if (activeTabs.length === 0) return null;
  const tab = activeTabs[0];
  return {
    tableId:   tab.tableId,
    tabId:     tab.id,
    name:      tab.customerName,
    partySize: tab.partySize,
    since:     tab.createdAt,
    status:    tab.tabStatus,
  };
}

/**
 * Get remaining seat capacity for a table.
 * Returns 0 if the table is full or over-capacity.
 */
export function getRemainingCapacity(tableId: string): number {
  const table = getTables().find(t => t.id === tableId);
  if (!table) return 0;
  // Defensive: old localStorage records may lack occupiedSeats (pre-Phase-5 data)
  return Math.max(0, (table.capacity || 0) - (table.occupiedSeats || 0));
}

/**
 * Add additional seats to an existing tab (for joiners who bring a party).
 * Enforces capacity — returns false if there is not enough room.
 */
export function addPartyToTab(tabId: string, additionalSeats: number): boolean {
  if (additionalSeats < 1) return false;
  const tabs = getTabs();
  const idx  = tabs.findIndex(t => t.id === tabId);
  if (idx === -1) return false;
  if (!['open', 'awaiting_payment'].includes(tabs[idx].tabStatus)) return false;

  const tableId = tabs[idx].tableId;
  const table   = getTables().find(t => t.id === tableId);
  if (!table) return false;

  const freeSeats = Math.max(0, (table.capacity || 0) - (table.occupiedSeats || 0));
  if (additionalSeats > freeSeats) return false;   // not enough room

  tabs[idx] = { ...tabs[idx], partySize: tabs[idx].partySize + additionalSeats };
  saveTabs(tabs);
  syncTableOccupancy(tableId);
  return true;
}

/**
 * Restaurant-wide occupancy summary for the manager dashboard stats bar.
 */
export interface RestaurantOccupancyStats {
  totalTables:    number;
  totalSeats:     number;
  occupiedSeats:  number;
  freeSeats:      number;
  occupiedTables: number;
  freeTables:     number;
}

export function getRestaurantOccupancyStats(): RestaurantOccupancyStats {
  const tables = getTables();
  const totalTables    = tables.length;
  // Guard: old localStorage data may lack capacity / occupiedSeats fields
  const totalSeats     = tables.reduce((s, t) => s + (t.capacity    || 0), 0);
  const occupiedSeats  = tables.reduce((s, t) => s + (t.occupiedSeats || 0), 0);
  const occupiedTables = tables.filter(t => t.status === 'occupied').length;
  return {
    totalTables,
    totalSeats,
    occupiedSeats,
    freeSeats:      Math.max(0, totalSeats - occupiedSeats),
    occupiedTables,
    freeTables:     Math.max(0, totalTables - occupiedTables),
  };
}

// ─── Menu (with module-level cache for performance) ───────────────────────────
let _menuCache: MenuItem[] | null = null;

export function getMenu(): MenuItem[] {
  if (_menuCache !== null) return _menuCache;
  _menuCache = ls_get<MenuItem[]>(KEYS.menu, DEFAULT_MENU);
  return _menuCache;
}

export function saveMenu(m: MenuItem[]): void {
  _menuCache = null; // invalidate cache on write
  ls_set(KEYS.menu, m);
}

// ─── Customer Tabs ────────────────────────────────────────────────────────────
export const getTabs  = (): CustomerTab[] => ls_get<CustomerTab[]>(KEYS.tabs, []);
export const saveTabs = (t: CustomerTab[]) => ls_set(KEYS.tabs, t);

export function getTab(id: string): CustomerTab | null {
  return getTabs().find(t => t.id === id) ?? null;
}

/**
 * Returns the active tab for a customer at a table.
 * Matches 'open' OR 'awaiting_payment' so the customer can still view
 * their tab after requesting the bill.
 */
export function getOpenTabForCustomer(
  tableId:      string,
  customerName: string,
): CustomerTab | null {
  const name = customerName.trim().toLowerCase();
  return (
    getTabs().find(
      t =>
        t.tableId === tableId &&
        t.customerName.trim().toLowerCase() === name &&
        (t.tabStatus === 'open' || t.tabStatus === 'awaiting_payment'),
    ) ?? null
  );
}

/** Returns all tabs for a table that are still active (open or awaiting_payment) */
export function getActiveTabsForTable(tableId: string): CustomerTab[] {
  return getTabs().filter(
    t => t.tableId === tableId && (t.tabStatus === 'open' || t.tabStatus === 'awaiting_payment'),
  );
}

/** Recalculate and persist the running total for a tab */
export function syncTabTotal(tabId: string): void {
  const tabs = getTabs();
  const idx = tabs.findIndex(t => t.id === tabId);
  if (idx === -1) return;

  const orders = getOrders();
  const total = tabs[idx].orderIds.reduce((sum, oid) => {
    const order = orders.find(o => o.id === oid);
    if (!order || ['cancelled', 'void'].includes(order.status)) return sum;
    return sum + (order.total || 0);
  }, 0);

  tabs[idx] = { ...tabs[idx], totalAmount: total };
  saveTabs(tabs);
}

/** Create a new customer tab and mark the table occupied */
export function createTab(
  tableId:      string,
  customerName: string,
  partySize:    number,
  pin?:         string,   // optional 4-digit PIN for table session security
): CustomerTab {
  const sessionId = `SES-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const tab: CustomerTab = {
    id:             `TAB-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    tableId,
    customerName:   customerName.trim(),
    partySize,
    orderIds:       [],
    tabStatus:      'open',
    totalAmount:    0,
    discount:       0,
    discountReason: '',
    paymentMethod:  'cod',
    createdAt:      new Date().toISOString(),
    tableSessionId: sessionId,
    tableSessionPin: pin ? pin.trim() : undefined,
  };
  const tabs = getTabs();
  tabs.push(tab);
  saveTabs(tabs);

  // Sync occupancy (status + occupiedSeats + activeSessionId)
  syncTableOccupancy(tableId);

  return tab;
}

/** Link an order to a tab */
export function addOrderToTab(tabId: string, orderId: string): boolean {
  const tabs = getTabs();
  const idx = tabs.findIndex(t => t.id === tabId);
  if (idx === -1) return false;
  if (tabs[idx].tabStatus !== 'open') return false;
  if (!tabs[idx].orderIds.includes(orderId)) {
    tabs[idx] = { ...tabs[idx], orderIds: [...tabs[idx].orderIds, orderId] };
    saveTabs(tabs);
    syncTabTotal(tabId);
  }
  return true;
}

/** Customer requests the bill — moves tab to awaiting_payment */
export function requestBill(tabId: string): boolean {
  const tabs = getTabs();
  const idx = tabs.findIndex(t => t.id === tabId);
  if (idx === -1) return false;
  if (tabs[idx].tabStatus !== 'open') return false;
  tabs[idx] = { ...tabs[idx], tabStatus: 'awaiting_payment' };
  saveTabs(tabs);
  syncTabTotal(tabId);
  return true;
}

/** Apply a discount at tab level */
export function applyTabDiscount(
  tabId:  string,
  amount: number,
  reason: string,
  by:     string = 'Manager',
): boolean {
  const tabs = getTabs();
  const idx = tabs.findIndex(t => t.id === tabId);
  if (idx === -1) return false;
  tabs[idx] = { ...tabs[idx], discount: amount, discountReason: reason };
  saveTabs(tabs);

  if (amount / (tabs[idx].totalAmount || 1) > 0.5) {
    addFraudAlert({
      type:   'high_discount',
      tabId,
      detail: `${Math.round((amount / (tabs[idx].totalAmount || 1)) * 100)}% tab discount (₹${amount}) applied by ${by}`,
      by,
      amount,
    });
  }
  return true;
}

/** Collect payment and close the tab */
export function closeTab(
  tabId:          string,
  paymentMethod:  string,
  discount?:      number,
  discountReason?: string,
  by:             string = 'Manager',
): boolean {
  const tabs = getTabs();
  const idx = tabs.findIndex(t => t.id === tabId);
  if (idx === -1) return false;

  syncTabTotal(tabId);
  const refreshed = getTabs();
  const tab = refreshed[idx];

  const finalDiscount    = discount      ?? tab.discount;
  const finalDiscReason  = discountReason ?? tab.discountReason;

  refreshed[idx] = {
    ...tab,
    tabStatus:      'closed',
    discount:       finalDiscount,
    discountReason: finalDiscReason,
    paymentMethod,
    closedAt:       new Date().toISOString(),
  };
  saveTabs(refreshed);

  // Mark all tab orders as completed
  const orders = getOrders();
  let changed = false;
  tab.orderIds.forEach(oid => {
    const oIdx = orders.findIndex(o => o.id === oid);
    if (oIdx !== -1 && !['cancelled', 'void', 'completed'].includes(orders[oIdx].status)) {
      orders[oIdx] = {
        ...orders[oIdx],
        status:  'completed',
        payment: paymentMethod,
        timeline: [
          ...(orders[oIdx].timeline || []),
          { status: 'completed', by, at: new Date().toISOString(), note: `Tab closed — ${paymentMethod}` },
        ],
      };
      changed = true;
    }
  });
  if (changed) saveOrders(orders);

  // Recalculate occupancy (releases table if no more active tabs)
  syncTableOccupancy(tab.tableId);

  return true;
}

/** Get all orders belonging to a tab */
export function getTabOrders(tabId: string): Order[] {
  const tab = getTab(tabId);
  if (!tab) return [];
  const orders = getOrders();
  return tab.orderIds
    .map(oid => orders.find(o => o.id === oid))
    .filter((o): o is Order => o !== undefined);
}

// ─── Fraud Alerts ─────────────────────────────────────────────────────────────
function addFraudAlert(data: Omit<FraudAlert, 'id' | 'at'>): void {
  const alerts = ls_get<FraudAlert[]>(KEYS.fraudAlerts, []);
  alerts.push({
    ...data,
    id: `FA-${Date.now()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
    at: new Date().toISOString(),
  });
  if (alerts.length > 200) alerts.splice(0, alerts.length - 200);
  ls_set(KEYS.fraudAlerts, alerts);
}

export function getFraudAlerts(): FraudAlert[] {
  return ls_get<FraudAlert[]>(KEYS.fraudAlerts, []).slice().reverse();
}

export function clearFraudAlerts(): void {
  ls_set(KEYS.fraudAlerts, []);
}

// ─── End-of-day Report ────────────────────────────────────────────────────────
export function getEndOfDayReport(date?: Date): EndOfDayReport {
  const d = date || new Date();
  const dayOrders = getOrders().filter(
    o => new Date(o.timestamp).toDateString() === d.toDateString(),
  );
  const completedOrders = dayOrders.filter(o => o.status === 'completed');
  const voidedOrders    = dayOrders.filter(o => o.status === 'void').length;
  const totalRevenue    = completedOrders.reduce((s, o) => s + (o.total || 0), 0);
  const discountsTotal  = completedOrders.reduce((s, o) => s + (o.discount || 0), 0);

  const itemMap: Record<string, number> = {};
  completedOrders.forEach(o =>
    (o.items || []).forEach(i => {
      itemMap[i.name] = (itemMap[i.name] || 0) + i.qty;
    }),
  );
  const topItems = Object.entries(itemMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, qty]) => ({ name, qty }));

  const completedTabs = getTabs().filter(
    t =>
      t.tabStatus === 'closed' &&
      t.closedAt  &&
      new Date(t.closedAt).toDateString() === d.toDateString(),
  ).length;

  return {
    date:          d.toDateString(),
    totalOrders:   completedOrders.length,
    totalRevenue,
    avgOrderValue: completedOrders.length ? Math.round(totalRevenue / completedOrders.length) : 0,
    topItems,
    completedTabs,
    voidedOrders,
    discountsTotal,
  };
}

// ─── Item-Level Status ────────────────────────────────────────────────────────
export type ItemStatus = 'queued' | 'preparing' | 'prepared' | 'served';

export interface WaiterCall {
  id:              string;
  tableId:         string;
  tabId:           string;
  customerName:    string;
  at:              string;
  acknowledged:    boolean;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
}

export interface FoodReceiptDispute {
  id:           string;
  orderId:      string;
  tabId:        string;
  tableId:      string;
  customerName: string;
  at:           string;
  resolved:     boolean;
  resolvedBy?:  string;
  resolvedAt?:  string;
}

export interface SplitBillEntry {
  personLabel:    string;
  amount:         number;
  paid:           boolean;
  paymentMethod?: string;
  paidAt?:        string;
}

export interface SplitBill {
  id:          string;
  tabId:       string;
  splitType:   'equal' | 'custom';
  totalAmount: number;
  entries:     SplitBillEntry[];
  createdAt:   string;
}

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

// ─── Item-Level Status ────────────────────────────────────────────────────────
export function updateItemStatus(
  orderId:   string,
  itemIndex: number,
  status:    ItemStatus,
  by:        string = 'Kitchen',
): boolean {
  const orders = getOrders();
  const idx = orders.findIndex(o => o.id === orderId);
  if (idx === -1) return false;
  const items = [...(orders[idx].items || [])];
  if (itemIndex < 0 || itemIndex >= items.length) return false;
  items[itemIndex] = { ...items[itemIndex], itemStatus: status };
  orders[idx] = { ...orders[idx], items };
  saveOrders(orders);
  return true;
}

// ─── Waiter Calls ─────────────────────────────────────────────────────────────
export const getWaiterCalls       = (): WaiterCall[] => ls_get<WaiterCall[]>(KEYS.waiterCalls, []);
export const saveWaiterCalls      = (c: WaiterCall[]) => ls_set(KEYS.waiterCalls, c);
export const getPendingWaiterCalls = (): WaiterCall[] => getWaiterCalls().filter(c => !c.acknowledged);

export function addWaiterCall(tableId: string, tabId: string, customerName: string): WaiterCall {
  const call: WaiterCall = {
    id: `WC-${Date.now()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
    tableId, tabId, customerName,
    at: new Date().toISOString(),
    acknowledged: false,
  };
  const calls = getWaiterCalls();
  calls.push(call);
  if (calls.length > 100) calls.splice(0, calls.length - 100);
  saveWaiterCalls(calls);
  return call;
}

export function acknowledgeWaiterCall(id: string, by: string = 'Waiter'): boolean {
  const calls = getWaiterCalls();
  const idx = calls.findIndex(c => c.id === id);
  if (idx === -1) return false;
  calls[idx] = { ...calls[idx], acknowledged: true, acknowledgedAt: new Date().toISOString(), acknowledgedBy: by };
  saveWaiterCalls(calls);
  return true;
}

export function getLastWaiterCallTime(tableId: string): string | null {
  const calls = getWaiterCalls();
  const recent = calls.filter(c => c.tableId === tableId)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  if (!recent.length) return null;
  if (Date.now() - new Date(recent[0].at).getTime() > 5 * 60 * 1000) return null;
  return recent[0].at;
}

// ─── Food Receipt Disputes ────────────────────────────────────────────────────
export const getDisputeAlerts   = (): FoodReceiptDispute[] => ls_get<FoodReceiptDispute[]>(KEYS.disputes, []);
export const saveDisputeAlerts  = (d: FoodReceiptDispute[]) => ls_set(KEYS.disputes, d);
export const getPendingDisputes = (): FoodReceiptDispute[] => getDisputeAlerts().filter(d => !d.resolved);

export function addFoodReceiptDispute(
  orderId: string, tabId: string, tableId: string, customerName: string,
): FoodReceiptDispute {
  const dispute: FoodReceiptDispute = {
    id: `FD-${Date.now()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
    orderId, tabId, tableId, customerName,
    at: new Date().toISOString(),
    resolved: false,
  };
  const disputes = getDisputeAlerts();
  disputes.push(dispute);
  if (disputes.length > 200) disputes.splice(0, disputes.length - 200);
  saveDisputeAlerts(disputes);
  return dispute;
}

export function resolveDispute(id: string, by: string = 'Waiter'): boolean {
  const disputes = getDisputeAlerts();
  const idx = disputes.findIndex(d => d.id === id);
  if (idx === -1) return false;
  disputes[idx] = { ...disputes[idx], resolved: true, resolvedBy: by, resolvedAt: new Date().toISOString() };
  saveDisputeAlerts(disputes);
  return true;
}

// ─── Split Billing ────────────────────────────────────────────────────────────
export const getSplitBills  = (): SplitBill[] => ls_get<SplitBill[]>(KEYS.splitBills, []);
export const saveSplitBills = (s: SplitBill[]) => ls_set(KEYS.splitBills, s);

export function getSplitBillForTab(tabId: string): SplitBill | null {
  return getSplitBills().find(s => s.tabId === tabId) ?? null;
}

export function createSplitBill(
  tabId: string, splitType: 'equal' | 'custom', count: number, totalAmount: number,
): SplitBill {
  const existing = getSplitBills().filter(s => s.tabId !== tabId);
  const perPerson = Math.ceil(totalAmount / count);
  const entries: SplitBillEntry[] = Array.from({ length: count }, (_, i) => ({
    personLabel: `Person ${i + 1}`,
    amount: i === count - 1 ? totalAmount - perPerson * (count - 1) : perPerson,
    paid: false,
  }));
  const split: SplitBill = {
    id: `SB-${Date.now()}`, tabId, splitType, totalAmount, entries,
    createdAt: new Date().toISOString(),
  };
  existing.push(split);
  saveSplitBills(existing);
  return split;
}

export function markSplitEntryPaid(tabId: string, personLabel: string, paymentMethod: string): boolean {
  const splits = getSplitBills();
  const idx = splits.findIndex(s => s.tabId === tabId);
  if (idx === -1) return false;
  const eIdx = splits[idx].entries.findIndex(e => e.personLabel === personLabel);
  if (eIdx === -1) return false;
  splits[idx].entries[eIdx] = { ...splits[idx].entries[eIdx], paid: true, paymentMethod, paidAt: new Date().toISOString() };
  saveSplitBills(splits);
  return true;
}

export function isSplitFullyPaid(tabId: string): boolean {
  const split = getSplitBillForTab(tabId);
  return split ? split.entries.every(e => e.paid) : false;
}

// ─── Staff Accountability ─────────────────────────────────────────────────────
export function getWaiterStats(): WaiterStats[] {
  const orders = getOrders();
  const todayStr = new Date().toDateString();
  const todayOrders = orders.filter(o => new Date(o.timestamp).toDateString() === todayStr);
  const statMap: Record<string, { accepted: number; cancelled: number; served: number }> = {};
  todayOrders.forEach(o => {
    (o.timeline || []).forEach(t => {
      if (!t.by || ['System','Admin','Manager','Kitchen'].includes(t.by)) return;
      if (!statMap[t.by]) statMap[t.by] = { accepted: 0, cancelled: 0, served: 0 };
      if (t.status === 'pending')   statMap[t.by].accepted++;
      if (t.status === 'cancelled') statMap[t.by].cancelled++;
      if (t.status === 'served')    statMap[t.by].served++;
    });
  });
  return Object.entries(statMap).map(([name, s]) => ({
    name,
    ordersAccepted:   s.accepted,
    ordersCancelled:  s.cancelled,
    ordersServed:     s.served,
    cancellationRate: s.accepted > 0 ? Math.round((s.cancelled / s.accepted) * 100) : 0,
  })).sort((a, b) => b.ordersCancelled - a.ordersCancelled);
}

// ─── Table Occupancy Analytics ────────────────────────────────────────────────
export function getTableOccupancyStats(): TableOccupancyStats[] {
  const allTabs = getTabs().filter(t => t.tabStatus === 'closed' && t.closedAt);
  const map: Record<string, { sessions: number; totalMins: number; revenue: number; lastUsed: string }> = {};
  allTabs.forEach(tab => {
    if (!map[tab.tableId]) map[tab.tableId] = { sessions: 0, totalMins: 0, revenue: 0, lastUsed: '' };
    const mins = Math.floor((new Date(tab.closedAt!).getTime() - new Date(tab.createdAt).getTime()) / 60000);
    map[tab.tableId].sessions++;
    map[tab.tableId].totalMins += mins;
    map[tab.tableId].revenue += Math.max(0, tab.totalAmount - tab.discount);
    if (!map[tab.tableId].lastUsed || tab.closedAt! > map[tab.tableId].lastUsed)
      map[tab.tableId].lastUsed = tab.closedAt!;
  });
  return Object.entries(map).map(([tableId, s]) => ({
    tableId,
    totalSessions: s.sessions,
    avgMinutes: s.sessions > 0 ? Math.round(s.totalMins / s.sessions) : 0,
    totalRevenue: s.revenue,
    lastUsed: s.lastUsed,
  })).sort((a, b) => b.totalSessions - a.totalSessions);
}

// ─── Device-Based Session Detection ──────────────────────────────────────────
// Each physical device gets a permanent unique ID stored in localStorage.
// This lets customers auto-reconnect to their active table session without
// entering their name again.

/** Get the device_id from localStorage, creating one if it doesn't exist yet. */
export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem('fl_device_id');
  if (!id) {
    id = `DEV-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    localStorage.setItem('fl_device_id', id);
  }
  return id;
}

/** Read all device records from localStorage. */
export function getDeviceRecords(): DeviceRecord[] {
  return ls_get<DeviceRecord[]>(KEYS.devices, []);
}

/** Persist device records. */
export function saveDeviceRecords(records: DeviceRecord[]): void {
  ls_set(KEYS.devices, records);
}

/**
 * Register (or update) a device ↔ table ↔ tab link.
 * Old records for the same (deviceId × tableId) are replaced.
 * Records older than 24 h are pruned to prevent unbounded growth.
 */
export function registerDevice(
  deviceId:     string,
  tableId:      string,
  tabId:        string,
  customerName: string,
): DeviceRecord {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const pruned = getDeviceRecords().filter(
    r => new Date(r.joinedAt).getTime() > cutoff &&
         !(r.deviceId === deviceId && r.tableId === tableId),
  );
  const record: DeviceRecord = {
    deviceId, tableId, tabId, customerName,
    joinedAt: new Date().toISOString(),
  };
  pruned.push(record);
  saveDeviceRecords(pruned);
  return record;
}

/**
 * Check whether a device has an active (open / awaiting_payment) session at a table.
 * Returns the matching tab + record, or null if none.
 */
export function findActiveDeviceSession(
  deviceId: string,
  tableId:  string,
): { tab: CustomerTab; record: DeviceRecord } | null {
  const records = getDeviceRecords();
  const record  = records.find(r => r.deviceId === deviceId && r.tableId === tableId);
  if (!record) return null;
  const tab = getTabs().find(
    t => t.id === record.tabId && ['open', 'awaiting_payment'].includes(t.tabStatus),
  );
  if (!tab) return null;
  return { tab, record };
}

/**
 * Remove a device's session record for a specific table
 * (called after tab is closed / thank-you screen).
 */
export function removeDeviceRecord(deviceId: string, tableId: string): void {
  const records = getDeviceRecords().filter(
    r => !(r.deviceId === deviceId && r.tableId === tableId),
  );
  saveDeviceRecords(records);
}

/** Return all device records linked to a specific tab (i.e. all customers at the table). */
export function getDevicesForTab(tabId: string): DeviceRecord[] {
  return getDeviceRecords().filter(r => r.tabId === tabId);
}

// ─── Online Order Stats ───────────────────────────────────────────────────────
export interface OnlineOrderStats {
  todayTotal:        number;   // count of all online orders today
  todayPickup:       number;   // online pickup count today
  todayDelivery:     number;   // online delivery count today
  todayRevenue:      number;   // total revenue from online orders today
  pendingOnline:     number;   // online orders still in progress
  allTimeTotal:      number;   // all-time online orders
  allTimePickup:     number;
  allTimeDelivery:   number;
}

export function getOnlineOrderStats(): OnlineOrderStats {
  const orders   = getOrders();
  const todayStr = new Date().toDateString();
  const online   = orders.filter(o => o.source === 'online');
  const todayOnline = online.filter(o => new Date(o.timestamp).toDateString() === todayStr);
  return {
    todayTotal:      todayOnline.length,
    todayPickup:     todayOnline.filter(o => o.type === 'pickup').length,
    todayDelivery:   todayOnline.filter(o => o.type === 'delivery').length,
    todayRevenue:    todayOnline.filter(o => o.status !== 'cancelled').reduce((s, o) => s + (o.total || 0), 0),
    pendingOnline:   online.filter(o => !['completed', 'cancelled', 'void'].includes(o.status)).length,
    allTimeTotal:    online.length,
    allTimePickup:   online.filter(o => o.type === 'pickup').length,
    allTimeDelivery: online.filter(o => o.type === 'delivery').length,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── EVENT-BASED ORDER SYSTEM ─────────────────────────────────────────────────
// Every state change emits an immutable OrderEvent alongside the Order.status
// update. This allows the /track page, kitchen, delivery, and waiter dashboards
// to react to events, and makes it trivial to swap in a real API later.
// ═══════════════════════════════════════════════════════════════════════════════

export type OrderEventType =
  | 'OrderPlaced'       // Customer placed the order
  | 'KitchenAccepted'   // Waiter/system accepted → kitchen queue
  | 'Preparing'         // Kitchen started cooking
  | 'Prepared'          // Kitchen: item(s) ready
  | 'Served'            // Waiter served to dine-in table
  | 'BillRequested'     // Customer pressed "Request Bill"
  | 'OrderPickedUp'     // Delivery person picked order from kitchen
  | 'OutForDelivery'    // On the way to customer
  | 'Delivered'         // Arrived at customer address
  | 'CustomerConfirmed' // Customer tapped "Confirm Delivery" on /track
  | 'Closed'            // Tab/Order closed by manager
  | 'Cancelled';        // Cancelled at any stage

export interface OrderEvent {
  eventId:   string;
  orderId:   string;
  eventType: OrderEventType;
  actor:     string;    // who triggered this event (customer name / staff name / 'System')
  note?:     string;    // optional context note
  createdAt: string;    // ISO timestamp
}

// ─── Private helper (called internally — not exported to keep event writes consistent) ──
function _addOrderEvent(
  orderId:   string,
  eventType: OrderEventType,
  actor:     string,
  note?:     string,
): OrderEvent {
  const ev: OrderEvent = {
    eventId:   `EV-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    orderId,
    eventType,
    actor,
    note,
    createdAt: new Date().toISOString(),
  };
  const events = ls_get<OrderEvent[]>(KEYS.events, []);
  events.push(ev);
  ls_set(KEYS.events, events);
  return ev;
}

/** Get ALL events (all orders). */
export function getAllOrderEvents(): OrderEvent[] {
  return ls_get<OrderEvent[]>(KEYS.events, []);
}

/** Get events for a specific order, sorted oldest→newest. */
export function getEventsForOrder(orderId: string): OrderEvent[] {
  return getAllOrderEvents()
    .filter(e => e.orderId === orderId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

/** Get the most recent event for an order. */
export function getLatestEvent(orderId: string): OrderEvent | null {
  const events = getEventsForOrder(orderId);
  return events.length ? events[events.length - 1] : null;
}

// ─── Tracking Token ───────────────────────────────────────────────────────────

export function generateTrackingToken(): string {
  return Math.random().toString(36).slice(2, 6).toUpperCase() +
         Math.random().toString(36).slice(2, 6).toUpperCase();
}

/**
 * Verify a tracking token against an order.
 * Returns the Order if token matches, null otherwise.
 */
export function verifyTrackingToken(orderId: string, token: string): Order | null {
  const order = getOrders().find(o => o.id === orderId);
  if (!order) return null;
  if (order.trackingToken !== token) return null;
  return order;
}

/**
 * Look up the most recent pickup/delivery order for a customer by name + phone.
 * Used by /track when no URL token is present (customer clicks "Track Order" from home).
 * Matches last 10 digits of phone to handle country-code variations (e.g. 91XXXXXXXXXX vs XXXXXXXXXX).
 */
export function lookupOrderByContact(name: string, phone: string): Order | null {
  const nameLower   = name.trim().toLowerCase();
  const phoneDigits = phone.replace(/\D/g, '');
  if (!nameLower || !phoneDigits) return null;

  const matches = getOrders().filter(o => {
    if (o.type === 'dine-in') return false;           // dine-in uses table session, not contact lookup
    if (!o.trackingToken)     return false;           // must have a tracking token to be trackable
    const nameMatch  = o.customerName.trim().toLowerCase() === nameLower;
    const storedDigs = (o.phone || '').replace(/\D/g, '');
    const phoneMatch = storedDigs && phoneDigits &&
      storedDigs.slice(-10) === phoneDigits.slice(-10); // compare last 10 digits
    return nameMatch && phoneMatch;
  });

  if (!matches.length) return null;
  // Return most recent order
  return matches.sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )[0];
}

// ─── Delivery-specific helpers ────────────────────────────────────────────────

/**
 * Return orders that are ready for delivery dispatch:
 * type === 'delivery' AND status in ['prepared','out_for_delivery','delivered']
 */
export function getDeliveryQueue(): Order[] {
  return getOrders().filter(
    o => o.type === 'delivery' &&
         ['prepared', 'out_for_delivery', 'delivered'].includes(o.status),
  ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

/**
 * Delivery person picks up an order from kitchen.
 * Transitions: prepared → out_for_delivery, emits OrderPickedUp + OutForDelivery.
 * Race condition protection: if pickedByDeliveryId is already set to a DIFFERENT person, reject.
 */
export function markOrderPickedUp(orderId: string, deliveryPerson: string): boolean {
  const orders = getOrders();
  const idx = orders.findIndex(o => o.id === orderId);
  if (idx === -1 || orders[idx].status !== 'prepared') return false;
  // Race condition guard: if already claimed by a different delivery person, reject
  const existing = orders[idx].pickedByDeliveryId;
  if (existing && existing !== deliveryPerson) return false;
  orders[idx] = {
    ...orders[idx],
    status:             'out_for_delivery',
    deliveryPerson,
    pickedByDeliveryId: deliveryPerson,
    timeline: [
      ...(orders[idx].timeline || []),
      { status: 'out_for_delivery', by: deliveryPerson, at: new Date().toISOString(), note: 'Picked up for delivery' },
    ],
  };
  saveOrders(orders);
  _addOrderEvent(orderId, 'OrderPickedUp',    deliveryPerson, 'Picked up from kitchen');
  _addOrderEvent(orderId, 'OutForDelivery',   deliveryPerson, 'On the way to customer');
  return true;
}

/**
 * Atomically claim a delivery order before pickup (race condition prevention).
 * Sets pickedByDeliveryId only if the order is unclaimed. Returns true if claimed successfully.
 */
export function claimDeliveryOrder(orderId: string, deliveryPerson: string): boolean {
  const orders = getOrders();
  const idx = orders.findIndex(o => o.id === orderId);
  if (idx === -1 || orders[idx].status !== 'prepared') return false;
  if (orders[idx].pickedByDeliveryId) return false; // already claimed
  orders[idx] = { ...orders[idx], pickedByDeliveryId: deliveryPerson };
  saveOrders(orders);
  return true;
}

/**
 * Delivery person marks order as delivered.
 * Transitions: out_for_delivery → delivered, emits Delivered.
 */
export function markOrderDelivered(orderId: string, deliveryPerson: string): boolean {
  const orders = getOrders();
  const idx = orders.findIndex(o => o.id === orderId);
  if (idx === -1 || orders[idx].status !== 'out_for_delivery') return false;
  orders[idx] = {
    ...orders[idx],
    status: 'delivered',
    timeline: [
      ...(orders[idx].timeline || []),
      { status: 'delivered', by: deliveryPerson, at: new Date().toISOString() },
    ],
  };
  saveOrders(orders);
  _addOrderEvent(orderId, 'Delivered', deliveryPerson, 'Delivered to customer address');
  return true;
}

/**
 * Customer confirms delivery on the /track page.
 * Transitions: delivered → completed, emits CustomerConfirmed.
 */
export function customerConfirmDelivery(orderId: string, token: string): boolean {
  const order = verifyTrackingToken(orderId, token);
  if (!order || order.status !== 'delivered') return false;
  const orders = getOrders();
  const idx = orders.findIndex(o => o.id === orderId);
  if (idx === -1) return false;
  orders[idx] = {
    ...orders[idx],
    status: 'completed',
    timeline: [
      ...(orders[idx].timeline || []),
      { status: 'completed', by: order.customerName, at: new Date().toISOString(), note: 'Confirmed by customer' },
    ],
  };
  saveOrders(orders);
  _addOrderEvent(orderId, 'CustomerConfirmed', order.customerName, 'Customer confirmed delivery');
  _addOrderEvent(orderId, 'Closed',            order.customerName);
  return true;
}

/**
 * Emit a BillRequested event (tab-level; order status doesn't change).
 * Called from the table page when customer presses "Request Bill".
 */
export function emitBillRequestedEvent(tabId: string, actor: string): void {
  // BillRequested is a tab-level event, we store it under the tab's first orderId or a synthetic ID
  _addOrderEvent(`TAB-${tabId}`, 'BillRequested', actor);
}

/** Return the tracking URL for an order (relative path). */
export function getTrackingUrl(order: Order): string {
  if (!order.trackingToken) return '';
  return `/track?id=${encodeURIComponent(order.id)}&token=${encodeURIComponent(order.trackingToken)}`;
}

/**
 * Get the timestamp when the kitchen started preparing an order.
 * Used by the kitchen timer so elapsed time is measured from cooking start, not order creation.
 * Falls back to order creation timestamp if no Preparing event exists yet.
 */
export function getPreparingTimestamp(orderId: string): string | null {
  const events = getEventsForOrder(orderId);
  const ev = events.find(e => e.eventType === 'Preparing');
  return ev ? ev.createdAt : null;
}

/**
 * Verify a table session PIN.
 * Returns true if the tab has no PIN set, or the provided PIN matches.
 */
export function verifyTablePin(tabId: string, pin: string): boolean {
  const tab = getTab(tabId);
  if (!tab) return false;
  if (!tab.tableSessionPin) return true; // no PIN set — always allow
  return tab.tableSessionPin === pin.trim();
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── EXPENSE TRACKER ──────────────────────────────────────────────────────────
// Manager-only feature to log operating expenses and compare with revenue.
// ═══════════════════════════════════════════════════════════════════════════════

export const getExpenses  = (): Expense[] => ls_get<Expense[]>(KEYS.expenses, []);
export const saveExpenses = (e: Expense[]) => ls_set(KEYS.expenses, e);

/** Add a new expense entry and return it. */
export function addExpense(data: Omit<Expense, 'id' | 'createdAt'>): Expense {
  const expense: Expense = {
    ...data,
    id:        `EXP-${Date.now()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
    createdAt: new Date().toISOString(),
  };
  const expenses = getExpenses();
  expenses.push(expense);
  // Keep at most 1000 records to avoid unbounded growth
  if (expenses.length > 1000) expenses.splice(0, expenses.length - 1000);
  saveExpenses(expenses);
  return expense;
}

/** Remove an expense by ID. Returns true if found and deleted. */
export function deleteExpense(expenseId: string): boolean {
  const expenses = getExpenses();
  const next = expenses.filter(e => e.id !== expenseId);
  if (next.length === expenses.length) return false;
  saveExpenses(next);
  return true;
}

/** Compute rolling expense totals for today / this week / this month. */
export function getExpenseStats(): ExpenseStats {
  const expenses = getExpenses();
  const now      = new Date();

  // Boundary timestamps
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekStart  = (() => {
    const d = new Date(now);
    d.setDate(d.getDate() - d.getDay()); // Sunday
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  })();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  let todayTotal = 0, weekTotal = 0, monthTotal = 0;
  let todayCount = 0, weekCount = 0, monthCount = 0;
  const catMap: Record<string, number> = {};

  expenses.forEach(e => {
    const t = new Date(e.createdAt).getTime();
    const amt = e.amount || 0;
    catMap[e.category] = (catMap[e.category] || 0) + amt;
    if (t >= monthStart) { monthTotal += amt; monthCount++; }
    if (t >= weekStart)  { weekTotal  += amt; weekCount++;  }
    if (t >= todayStart) { todayTotal += amt; todayCount++; }
  });

  const byCategory = Object.entries(catMap)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);

  return { todayTotal, weekTotal, monthTotal, todayCount, weekCount, monthCount, byCategory };
}
