// ─── Foodie Lover — Storage Layer ─────────────────────────────────────────────
// All persistence via localStorage (no backend). v2.0 — CustomerTab system.
// Exports every type and function used across pages.

// ─── Types ────────────────────────────────────────────────────────────────────

export type OrderStatus =
  | 'awaiting_waiter'   // newly placed, waiter hasn't accepted yet
  | 'pending'           // accepted by kitchen, not yet started
  | 'preparing'         // kitchen actively cooking
  | 'prepared'          // ready for pickup by waiter
  | 'served'            // delivered to table
  | 'completed'         // paid and done
  | 'cancelled'         // cancelled before completion
  | 'void';             // voided by manager

export type OrderType = 'dine-in' | 'pickup';

export type TabStatus = 'open' | 'awaiting_payment' | 'closed';

export interface OrderItem {
  name:     string;
  qty:      number;
  price:    number;
  subtotal: number;
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
  cancelReason?:  string;
  cancelledAt?:   string;   // legacy alias — use timeline for cancellation time
  phone?:         string;   // optional customer phone (legacy)
  staffName?:     string;   // optional staff name (legacy)
  timeline?:      TimelineEntry[];
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
}

export interface Table {
  id:            string;
  status:        'available' | 'occupied' | 'reserved';
  capacity:      number;
  sessionStart?: string;  // legacy — use CustomerTab for session info
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

// ─── localStorage keys ────────────────────────────────────────────────────────
const KEYS = {
  orders:      'fl_orders',
  tables:      'fl_tables',
  menu:        'fl_menu',
  pin:         'fl_admin_pin',
  tabs:        'fl_customer_tabs',
  orderNum:    'fl_order_num_counter',
  fraudAlerts: 'fl_fraud_alerts',
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

const DEFAULT_TABLES: Table[] = Array.from({ length: 20 }, (_, i) => ({
  id:       `T${String(i + 1).padStart(2, '0')}`,
  status:   'available' as const,
  capacity: i < 4 ? 2 : i < 14 ? 4 : 6,
}));

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

export function addOrder(order: Order): void {
  const orders = getOrders();
  orders.push(order);
  saveOrders(orders);
}

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

export function syncTableStatus(tableId: string): void {
  const activeTabs = getActiveTabsForTable(tableId);
  const tables = getTables();
  const idx = tables.findIndex(t => t.id === tableId);
  if (idx === -1) return;
  tables[idx] = {
    ...tables[idx],
    status: activeTabs.length > 0 ? 'occupied' : 'available',
  };
  saveTables(tables);
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

// ─── Menu ─────────────────────────────────────────────────────────────────────
export const getMenu  = (): MenuItem[] => ls_get<MenuItem[]>(KEYS.menu, DEFAULT_MENU);
export const saveMenu = (m: MenuItem[]) => ls_set(KEYS.menu, m);

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
): CustomerTab {
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
  };
  const tabs = getTabs();
  tabs.push(tab);
  saveTabs(tabs);

  // Mark table occupied
  const tables = getTables();
  const tIdx = tables.findIndex(t => t.id === tableId);
  if (tIdx !== -1) {
    tables[tIdx] = { ...tables[tIdx], status: 'occupied' };
    saveTables(tables);
  }

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

  // Release table if no more active tabs
  syncTableStatus(tab.tableId);

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
