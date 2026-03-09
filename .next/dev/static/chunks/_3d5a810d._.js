(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/lib/storage.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// ─── Types ────────────────────────────────────────────────────────────────────
__turbopack_context__.s([
    "DEFAULT_MENU",
    ()=>DEFAULT_MENU,
    "VALID_TRANSITIONS",
    ()=>VALID_TRANSITIONS,
    "addItemsToOrder",
    ()=>addItemsToOrder,
    "addOrder",
    ()=>addOrder,
    "addOrderToTab",
    ()=>addOrderToTab,
    "addWaiterCall",
    ()=>addWaiterCall,
    "applyDiscount",
    ()=>applyDiscount,
    "applyTabDiscount",
    ()=>applyTabDiscount,
    "cancelOrder",
    ()=>cancelOrder,
    "closeTab",
    ()=>closeTab,
    "createTab",
    ()=>createTab,
    "exportOrdersCSV",
    ()=>exportOrdersCSV,
    "getActiveTabsForTable",
    ()=>getActiveTabsForTable,
    "getEndOfDayReport",
    ()=>getEndOfDayReport,
    "getFraudAlerts",
    ()=>getFraudAlerts,
    "getMenu",
    ()=>getMenu,
    "getNextOrderNumber",
    ()=>getNextOrderNumber,
    "getOpenTabForCustomer",
    ()=>getOpenTabForCustomer,
    "getOrders",
    ()=>getOrders,
    "getOrdersInPeriod",
    ()=>getOrdersInPeriod,
    "getPin",
    ()=>getPin,
    "getPriorityOrders",
    ()=>getPriorityOrders,
    "getStaffSessions",
    ()=>getStaffSessions,
    "getTab",
    ()=>getTab,
    "getTabOrders",
    ()=>getTabOrders,
    "getTableOccupancy",
    ()=>getTableOccupancy,
    "getTables",
    ()=>getTables,
    "getTabs",
    ()=>getTabs,
    "getWaiterCalls",
    ()=>getWaiterCalls,
    "isValidTransition",
    ()=>isValidTransition,
    "requestBill",
    ()=>requestBill,
    "resolveWaiterCall",
    ()=>resolveWaiterCall,
    "saveMenu",
    ()=>saveMenu,
    "saveOrders",
    ()=>saveOrders,
    "savePin",
    ()=>savePin,
    "savePriorityOrders",
    ()=>savePriorityOrders,
    "saveStaffSessions",
    ()=>saveStaffSessions,
    "saveTables",
    ()=>saveTables,
    "saveTabs",
    ()=>saveTabs,
    "saveWaiterCalls",
    ()=>saveWaiterCalls,
    "syncTabTotal",
    ()=>syncTabTotal,
    "syncTableStatus",
    ()=>syncTableStatus,
    "updateOrderStatus",
    ()=>updateOrderStatus,
    "voidOrder",
    ()=>voidOrder
]);
// ─── Keys ─────────────────────────────────────────────────────────────────────
const KEYS = {
    orders: 'fl_orders',
    tables: 'fl_tables',
    menu: 'fl_menu',
    pin: 'fl_owner_pin',
    staff: 'fl_staff_sessions',
    calls: 'fl_waiter_calls',
    priority: 'fl_priority_orders',
    orderCounter: 'fl_order_counter',
    tabs: 'fl_tabs'
};
// ─── Helpers ──────────────────────────────────────────────────────────────────
function get(key, fallback) {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    try {
        const v = localStorage.getItem(key);
        return v ? JSON.parse(v) : fallback;
    } catch  {
        return fallback;
    }
}
function set(key, value) {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    localStorage.setItem(key, JSON.stringify(value));
}
const VALID_TRANSITIONS = {
    awaiting_waiter: [
        'pending',
        'cancelled'
    ],
    pending: [
        'preparing',
        'cancelled'
    ],
    preparing: [
        'prepared',
        'cancelled'
    ],
    prepared: [
        'served',
        'void'
    ],
    served: [
        'completed',
        'void'
    ],
    completed: [],
    void: [],
    cancelled: []
};
function isValidTransition(from, to) {
    const allowed = VALID_TRANSITIONS[from];
    return allowed ? allowed.includes(to) : false;
}
const getOrders = ()=>get(KEYS.orders, []);
const saveOrders = (o)=>set(KEYS.orders, o);
function getNextOrderNumber() {
    const current = get(KEYS.orderCounter, 1000);
    const next = current + 1;
    set(KEYS.orderCounter, next);
    return next;
}
function addOrder(order) {
    const orders = getOrders();
    // Guard: block duplicate IDs (rapid double-submit protection)
    if (orders.some((o)=>o.id === order.id)) return;
    // Auto-assign a sequential human-readable order number if not already set
    if (!order.orderNum) {
        order.orderNum = getNextOrderNumber();
    }
    // Ensure timeline is always initialised (use the order's actual starting status)
    if (!order.timeline || !order.timeline.length) {
        order.timeline = [
            {
                status: order.status,
                timestamp: order.timestamp
            }
        ];
    }
    orders.push(order);
    saveOrders(orders);
    // Auto-mark table as occupied when a dine-in order is placed
    if (order.type === 'dine-in' && order.tableId) {
        syncTableStatus(order.tableId);
    }
}
function updateOrderStatus(orderId, status, by, force = false) {
    const orders = getOrders();
    const idx = orders.findIndex((o)=>o.id === orderId);
    if (idx === -1) return false;
    const current = orders[idx].status;
    // Prevent any changes on already-cancelled or completed orders unless forced
    if (!force && !isValidTransition(current, status)) return false;
    orders[idx].status = status;
    if (!orders[idx].timeline) orders[idx].timeline = [];
    orders[idx].timeline.push({
        status,
        timestamp: new Date().toISOString(),
        by
    });
    saveOrders(orders);
    // Sync table status when a dine-in order completes or is served
    if (orders[idx].type === 'dine-in' && orders[idx].tableId) {
        syncTableStatus(orders[idx].tableId);
    }
    return true;
}
function cancelOrder(orderId, reason, by) {
    const orders = getOrders();
    const idx = orders.findIndex((o)=>o.id === orderId);
    if (idx === -1) return false;
    // Allow cancellation from: unconfirmed, pending, or being prepared
    const cancellable = [
        'awaiting_waiter',
        'pending',
        'preparing'
    ];
    if (!cancellable.includes(orders[idx].status)) return false;
    orders[idx].status = 'cancelled';
    orders[idx].cancelReason = reason;
    orders[idx].cancelledAt = new Date().toISOString();
    if (!orders[idx].timeline) orders[idx].timeline = [];
    orders[idx].timeline.push({
        status: 'cancelled',
        timestamp: new Date().toISOString(),
        by,
        note: reason
    });
    saveOrders(orders);
    // Free up the table if no other active orders remain for it
    if (orders[idx].type === 'dine-in' && orders[idx].tableId) {
        syncTableStatus(orders[idx].tableId);
    }
    return true;
}
function voidOrder(orderId, reason, by) {
    const orders = getOrders();
    const idx = orders.findIndex((o)=>o.id === orderId);
    if (idx === -1) return false;
    const voidable = [
        'prepared',
        'served'
    ];
    if (!voidable.includes(orders[idx].status)) return false;
    orders[idx].status = 'void';
    orders[idx].voidReason = reason;
    orders[idx].voidedAt = new Date().toISOString();
    if (!orders[idx].timeline) orders[idx].timeline = [];
    orders[idx].timeline.push({
        status: 'void',
        timestamp: new Date().toISOString(),
        by,
        note: `VOID — ${reason}`
    });
    saveOrders(orders);
    // Free table if no other active orders remain
    if (orders[idx].type === 'dine-in' && orders[idx].tableId) {
        syncTableStatus(orders[idx].tableId);
    }
    return true;
}
function addItemsToOrder(orderId, newItems, by) {
    const orders = getOrders();
    const idx = orders.findIndex((o)=>o.id === orderId);
    if (idx === -1) return false;
    const terminal = [
        'completed',
        'void',
        'cancelled'
    ];
    if (terminal.includes(orders[idx].status)) return false;
    // Merge items — bump qty for existing, push for new
    newItems.forEach((newItem)=>{
        const ei = orders[idx].items.findIndex((i)=>i.id === newItem.id);
        if (ei >= 0) {
            orders[idx].items[ei].qty += newItem.qty;
            orders[idx].items[ei].subtotal = orders[idx].items[ei].price * orders[idx].items[ei].qty;
        } else {
            orders[idx].items.push({
                ...newItem
            });
        }
    });
    // Recalculate order totals
    const subtotal = orders[idx].items.reduce((s, i)=>s + i.subtotal, 0);
    orders[idx].subtotal = subtotal;
    orders[idx].total = subtotal - (orders[idx].discount || 0);
    // Record edit history
    if (!orders[idx].editHistory) orders[idx].editHistory = [];
    const addedSummary = newItems.map((i)=>`${i.name} ×${i.qty}`).join(', ');
    orders[idx].editHistory.push({
        timestamp: new Date().toISOString(),
        change: `Added items: ${addedSummary}`,
        by
    });
    // If already prepared/served, return to kitchen for the new items
    const needsKitchen = [
        'prepared',
        'served'
    ];
    if (needsKitchen.includes(orders[idx].status)) {
        orders[idx].status = 'preparing';
        orders[idx].timeline.push({
            status: 'preparing',
            timestamp: new Date().toISOString(),
            by,
            note: `🆕 Extra items ordered — back to kitchen: ${addedSummary}`
        });
    } else {
        orders[idx].timeline.push({
            status: orders[idx].status,
            timestamp: new Date().toISOString(),
            by,
            note: `🆕 Items added: ${addedSummary}`
        });
    }
    saveOrders(orders);
    // Keep table occupied
    if (orders[idx].type === 'dine-in' && orders[idx].tableId) {
        syncTableStatus(orders[idx].tableId);
    }
    return true;
}
function applyDiscount(orderId, discount, reason, by) {
    const orders = getOrders();
    const idx = orders.findIndex((o)=>o.id === orderId);
    if (idx === -1) return false;
    const sub = orders[idx].subtotal || orders[idx].total;
    // Clamp discount to [0, subtotal] — prevents negative totals
    const safeDiscount = Math.min(Math.max(0, Math.round(discount)), sub);
    orders[idx].discount = safeDiscount;
    orders[idx].discountReason = reason;
    orders[idx].total = sub - safeDiscount;
    if (!orders[idx].editHistory) orders[idx].editHistory = [];
    orders[idx].editHistory.push({
        timestamp: new Date().toISOString(),
        change: `Discount ₹${safeDiscount} applied: ${reason}`,
        by
    });
    saveOrders(orders);
    return true;
}
const getPriorityOrders = ()=>get(KEYS.priority, {});
function savePriorityOrders(map) {
    // Prune completed/cancelled orders from the priority map
    const orders = getOrders();
    const activeIds = new Set(orders.filter((o)=>[
            'awaiting_waiter',
            'pending',
            'preparing',
            'prepared'
        ].includes(o.status)).map((o)=>o.id));
    // Note: void/cancelled/completed are intentionally excluded from priority tracking
    const pruned = {};
    for (const [id, val] of Object.entries(map)){
        if (activeIds.has(id) && val) pruned[id] = true;
    }
    set(KEYS.priority, pruned);
}
function getTables() {
    const saved = get(KEYS.tables, null);
    if (saved) return saved;
    const defaults = Array.from({
        length: 15
    }, (_, i)=>({
            id: i + 1,
            chairs: 4,
            status: 'available',
            occupants: []
        }));
    set(KEYS.tables, defaults);
    return defaults;
}
const saveTables = (t)=>set(KEYS.tables, t);
function syncTableStatus(tableId) {
    const tables = getTables();
    const idx = tables.findIndex((t)=>t.id === tableId);
    if (idx === -1) return;
    // A table is occupied if it has any open or awaiting_payment tabs
    const activeTabs = getTabs().filter((t)=>t.tableId === tableId && [
            'open',
            'awaiting_payment'
        ].includes(t.tabStatus));
    // Also check legacy orders not linked to tabs (backward compat)
    const orders = getOrders();
    const activeOrders = orders.filter((o)=>o.tableId === tableId && [
            'awaiting_waiter',
            'pending',
            'preparing',
            'prepared',
            'served'
        ].includes(o.status));
    const occupied = activeTabs.length > 0 || activeOrders.length > 0;
    if (tables[idx].status !== 'reserved') {
        tables[idx].status = occupied ? 'occupied' : 'available';
        if (occupied) {
            tables[idx].occupants = activeTabs.map((t)=>({
                    name: t.customerName
                }));
            if (!tables[idx].sessionStart) tables[idx].sessionStart = new Date().toISOString();
        } else {
            tables[idx].occupants = [];
            tables[idx].sessionStart = undefined;
        }
    }
    saveTables(tables);
}
function getTableOccupancy() {
    const tables = getTables();
    const tabs = getTabs();
    const orders = getOrders();
    const ACTIVE_TAB = [
        'open',
        'awaiting_payment'
    ];
    return tables.map((t)=>{
        const activeTabs = tabs.filter((tb)=>tb.tableId === t.id && ACTIVE_TAB.includes(tb.tabStatus));
        const chairsOccupied = activeTabs.reduce((s, tb)=>s + (tb.partySize ?? 1), 0);
        const guests = activeTabs.map((tb)=>{
            const tabOrders = orders.filter((o)=>tb.orderIds.includes(o.id) && ![
                    'void',
                    'cancelled'
                ].includes(o.status));
            return {
                name: tb.customerName,
                partySize: tb.partySize ?? 1,
                status: tb.tabStatus,
                orderTotal: tb.totalAmount
            };
        });
        return {
            tableId: t.id,
            tableName: `Table ${t.id}`,
            capacity: t.chairs,
            chairsOccupied,
            partiesCount: activeTabs.length,
            guests,
            tableStatus: t.status,
            sessionStart: t.sessionStart
        };
    });
}
function getTabs() {
    return get(KEYS.tabs, []);
}
const saveTabs = (tabs)=>set(KEYS.tabs, tabs);
function getTab(tabId) {
    return getTabs().find((t)=>t.id === tabId);
}
function getOpenTabForCustomer(tableId, customerName) {
    return getTabs().find((t)=>t.tableId === tableId && t.customerName.toLowerCase() === customerName.toLowerCase() && [
            'open',
            'awaiting_payment'
        ].includes(t.tabStatus));
}
function getActiveTabsForTable(tableId) {
    return getTabs().filter((t)=>t.tableId === tableId && [
            'open',
            'awaiting_payment'
        ].includes(t.tabStatus));
}
function syncTabTotal(tabId) {
    const tabs = getTabs();
    const idx = tabs.findIndex((t)=>t.id === tabId);
    if (idx === -1) return;
    const orders = getOrders();
    const gross = orders.filter((o)=>tabs[idx].orderIds.includes(o.id) && ![
            'void',
            'cancelled'
        ].includes(o.status)).reduce((s, o)=>s + o.total, 0);
    tabs[idx].totalAmount = Math.max(0, gross - (tabs[idx].discount || 0));
    saveTabs(tabs);
}
function createTab(tableId, customerName, partySize) {
    const tab = {
        id: `TAB-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        tableId,
        customerName,
        partySize,
        tabStatus: 'open',
        orderIds: [],
        totalAmount: 0,
        createdAt: new Date().toISOString()
    };
    const tabs = getTabs();
    tabs.push(tab);
    saveTabs(tabs);
    syncTableStatus(tableId);
    return tab;
}
function addOrderToTab(tabId, orderId) {
    const tabs = getTabs();
    const idx = tabs.findIndex((t)=>t.id === tabId);
    if (idx === -1) return false;
    if (!tabs[idx].orderIds.includes(orderId)) tabs[idx].orderIds.push(orderId);
    saveTabs(tabs);
    syncTabTotal(tabId);
    return true;
}
function requestBill(tabId) {
    const tabs = getTabs();
    const idx = tabs.findIndex((t)=>t.id === tabId);
    if (idx === -1 || tabs[idx].tabStatus !== 'open') return false;
    // Snapshot final total before locking
    const orders = getOrders();
    const gross = orders.filter((o)=>tabs[idx].orderIds.includes(o.id) && ![
            'void',
            'cancelled'
        ].includes(o.status)).reduce((s, o)=>s + o.total, 0);
    tabs[idx].totalAmount = Math.max(0, gross - (tabs[idx].discount || 0));
    tabs[idx].tabStatus = 'awaiting_payment';
    tabs[idx].requestedAt = new Date().toISOString();
    saveTabs(tabs);
    return true;
}
function applyTabDiscount(tabId, amount, reason) {
    const tabs = getTabs();
    const idx = tabs.findIndex((t)=>t.id === tabId);
    if (idx === -1 || tabs[idx].tabStatus === 'closed') return false;
    tabs[idx].discount = Math.max(0, amount);
    tabs[idx].discountReason = reason;
    saveTabs(tabs);
    syncTabTotal(tabId);
    return true;
}
function closeTab(tabId, payment, discount, discountReason) {
    const tabs = getTabs();
    const idx = tabs.findIndex((t)=>t.id === tabId);
    if (idx === -1 || tabs[idx].tabStatus !== 'awaiting_payment') return false;
    if (discount && discount > 0) {
        tabs[idx].discount = discount;
        tabs[idx].discountReason = discountReason;
    }
    // Final total calculation
    const orders = getOrders();
    const gross = orders.filter((o)=>tabs[idx].orderIds.includes(o.id) && ![
            'void',
            'cancelled'
        ].includes(o.status)).reduce((s, o)=>s + o.total, 0);
    tabs[idx].totalAmount = Math.max(0, gross - (tabs[idx].discount || 0));
    tabs[idx].tabStatus = 'closed';
    tabs[idx].payment = payment;
    tabs[idx].closedAt = new Date().toISOString();
    saveTabs(tabs);
    // Mark all non-terminal orders in the tab as 'completed'
    const allOrders = getOrders();
    let changed = false;
    tabs[idx].orderIds.forEach((oid)=>{
        const oi = allOrders.findIndex((o)=>o.id === oid);
        if (oi === -1) return;
        const closeable = [
            'awaiting_waiter',
            'pending',
            'preparing',
            'prepared',
            'served'
        ];
        if (closeable.includes(allOrders[oi].status)) {
            allOrders[oi].status = 'completed';
            allOrders[oi].payment = payment;
            allOrders[oi].timeline.push({
                status: 'completed',
                timestamp: new Date().toISOString(),
                by: 'Manager',
                note: `Tab closed · ${payment}`
            });
            changed = true;
        }
    });
    if (changed) saveOrders(allOrders);
    syncTableStatus(tabs[idx].tableId);
    return true;
}
function getTabOrders(tabId) {
    const tab = getTab(tabId);
    if (!tab) return [];
    const orders = getOrders();
    return orders.filter((o)=>tab.orderIds.includes(o.id));
}
const DEFAULT_MENU = [
    {
        id: 1,
        category: 'Biryani',
        name: 'Hyderabadi Chicken Dum Biryani',
        desc: 'Slow-cooked tender chicken layered with fragrant basmati rice & saffron',
        price: 280,
        img: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&auto=format&fit=crop&q=80',
        badge: 'bestseller',
        available: true
    },
    {
        id: 2,
        category: 'Biryani',
        name: 'Hyderabadi Mutton Dum Biryani',
        desc: 'Tender mutton pieces slow-cooked with aromatic whole spices',
        price: 350,
        img: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=400&auto=format&fit=crop&q=80',
        available: true
    },
    {
        id: 3,
        category: 'Biryani',
        name: 'Veg Hyderabadi Biryani',
        desc: 'Fresh garden vegetables cooked in authentic Hyderabadi dum style',
        price: 200,
        img: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400&auto=format&fit=crop&q=80',
        available: true
    },
    {
        id: 4,
        category: 'Biryani',
        name: 'Paneer Dum Biryani',
        desc: 'Soft cottage cheese cubes layered with spiced aromatic basmati',
        price: 240,
        img: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&auto=format&fit=crop&q=80',
        badge: 'popular',
        available: true
    },
    {
        id: 5,
        category: 'Biryani',
        name: 'Egg Biryani',
        desc: 'Perfectly boiled eggs cooked with Hyderabadi spices and basmati',
        price: 220,
        img: 'https://images.unsplash.com/photo-1546833998-877b37c2e5c6?w=400&auto=format&fit=crop&q=80',
        available: true
    },
    {
        id: 6,
        category: 'Biryani',
        name: 'Special Double Dum Biryani',
        desc: 'Our signature extra-large portion with double the flavors & dry fruits',
        price: 420,
        img: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&auto=format&fit=crop&q=80',
        badge: 'chef',
        available: true
    },
    {
        id: 7,
        category: 'Starters',
        name: 'Chicken 65',
        desc: 'Crispy deep-fried chicken with fiery red marinade & curry leaves',
        price: 220,
        img: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&auto=format&fit=crop&q=80',
        available: true
    },
    {
        id: 8,
        category: 'Starters',
        name: 'Mutton Seekh Kebab',
        desc: 'Minced mutton blended with spices & grilled over coal',
        price: 280,
        img: 'https://images.unsplash.com/photo-1512058454905-6b84c2b38f50?w=400&auto=format&fit=crop&q=80',
        available: true
    },
    {
        id: 9,
        category: 'Starters',
        name: 'Paneer Tikka',
        desc: 'Marinated cottage cheese cubes grilled in tandoor',
        price: 200,
        img: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400&auto=format&fit=crop&q=80',
        available: true
    },
    {
        id: 10,
        category: 'Starters',
        name: 'Veg Shammi Kebab',
        desc: 'Soft & spicy mixed vegetable patties pan-fried golden',
        price: 160,
        img: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&auto=format&fit=crop&q=80',
        available: true
    },
    {
        id: 11,
        category: 'Mains',
        name: 'Chicken Curry',
        desc: 'Rich and spicy Hyderabadi style chicken curry in thick gravy',
        price: 260,
        img: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&auto=format&fit=crop&q=80',
        available: true
    },
    {
        id: 12,
        category: 'Mains',
        name: 'Mutton Rogan Josh',
        desc: 'Slow-cooked tender mutton in aromatic Kashmiri spice gravy',
        price: 320,
        img: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&auto=format&fit=crop&q=80',
        available: true
    },
    {
        id: 13,
        category: 'Mains',
        name: 'Dal Makhani',
        desc: 'Slow-cooked black lentils simmered with cream & butter overnight',
        price: 180,
        img: 'https://images.unsplash.com/photo-1546833998-877b37c2e5c6?w=400&auto=format&fit=crop&q=80',
        available: true
    },
    {
        id: 14,
        category: 'Mains',
        name: 'Paneer Butter Masala',
        desc: 'Soft paneer cubes in rich creamy tomato-cashew gravy',
        price: 220,
        img: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&auto=format&fit=crop&q=80',
        available: true
    },
    {
        id: 15,
        category: 'Mains',
        name: 'Raita',
        desc: 'Chilled yogurt with cucumber, onion, tomato & roasted cumin',
        price: 60,
        img: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&auto=format&fit=crop&q=80',
        available: true
    },
    {
        id: 16,
        category: 'Breads',
        name: 'Butter Naan',
        desc: 'Soft leavened bread baked in tandoor brushed with fresh butter',
        price: 40,
        img: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&auto=format&fit=crop&q=80',
        available: true
    },
    {
        id: 17,
        category: 'Breads',
        name: 'Garlic Naan',
        desc: 'Naan generously topped with garlic, butter & fresh coriander',
        price: 50,
        img: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&auto=format&fit=crop&q=80',
        available: true
    },
    {
        id: 18,
        category: 'Breads',
        name: 'Tandoori Roti',
        desc: 'Whole wheat bread baked fresh in clay tandoor',
        price: 30,
        img: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&auto=format&fit=crop&q=80',
        available: true
    },
    {
        id: 19,
        category: 'Desserts',
        name: 'Double Ka Meetha',
        desc: 'Iconic Hyderabadi bread pudding with cream, dry fruits & saffron',
        price: 120,
        img: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&auto=format&fit=crop&q=80',
        badge: 'famous',
        available: true
    },
    {
        id: 20,
        category: 'Desserts',
        name: 'Qubani Ka Meetha',
        desc: 'Traditional Hyderabadi apricot dessert topped with fresh cream',
        price: 100,
        img: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&auto=format&fit=crop&q=80',
        available: true
    },
    {
        id: 21,
        category: 'Desserts',
        name: 'Kheer',
        desc: 'Creamy rich rice pudding infused with saffron, cardamom & nuts',
        price: 80,
        img: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&auto=format&fit=crop&q=80',
        available: true
    },
    {
        id: 22,
        category: 'Drinks',
        name: 'Sweet Lassi',
        desc: "Chilled sweet yogurt drink - Punjab's most beloved classic",
        price: 80,
        img: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&auto=format&fit=crop&q=80',
        available: true
    },
    {
        id: 23,
        category: 'Drinks',
        name: 'Salted Lassi',
        desc: 'Refreshing salted yogurt drink with roasted cumin',
        price: 80,
        img: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&auto=format&fit=crop&q=80',
        available: true
    },
    {
        id: 24,
        category: 'Drinks',
        name: 'Masala Chai',
        desc: 'Aromatic spiced tea brewed with ginger, cardamom & cinnamon',
        price: 40,
        img: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&auto=format&fit=crop&q=80',
        available: true
    },
    {
        id: 25,
        category: 'Drinks',
        name: 'Cold Drink',
        desc: 'Pepsi / Coke / Sprite / Thumbs Up (chilled)',
        price: 50,
        img: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=400&auto=format&fit=crop&q=80',
        available: true
    },
    {
        id: 26,
        category: 'Drinks',
        name: 'Mineral Water',
        desc: '500ml chilled mineral water bottle',
        price: 20,
        img: 'https://images.unsplash.com/photo-1560023907-5f339617ea30?w=400&auto=format&fit=crop&q=80',
        available: true
    }
];
function getMenu() {
    const saved = get(KEYS.menu, null);
    if (saved) return saved;
    set(KEYS.menu, DEFAULT_MENU);
    return DEFAULT_MENU;
}
const saveMenu = (items)=>set(KEYS.menu, items);
const getPin = ()=>get(KEYS.pin, '1234');
const savePin = (p)=>set(KEYS.pin, p);
const getStaffSessions = ()=>get(KEYS.staff, []);
const saveStaffSessions = (s)=>set(KEYS.staff, s);
const getWaiterCalls = ()=>get(KEYS.calls, []);
const saveWaiterCalls = (c)=>set(KEYS.calls, c);
function addWaiterCall(tableId, message, customerName) {
    const calls = getWaiterCalls();
    calls.push({
        id: `CALL-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        tableId,
        customerName,
        message,
        timestamp: new Date().toISOString(),
        resolved: false
    });
    saveWaiterCalls(calls);
}
function resolveWaiterCall(callId, by) {
    const calls = getWaiterCalls();
    const idx = calls.findIndex((c)=>c.id === callId);
    if (idx === -1) return;
    calls[idx].resolved = true;
    calls[idx].resolvedAt = new Date().toISOString();
    calls[idx].resolvedBy = by;
    saveWaiterCalls(calls);
}
function getOrdersInPeriod(period) {
    const all = getOrders();
    const now = new Date();
    return all.filter((o)=>{
        // Exclude cancelled, voided, and unconfirmed orders from revenue/analytics
        if (o.status === 'cancelled' || o.status === 'void' || o.status === 'awaiting_waiter') return false;
        const d = new Date(o.timestamp);
        if (period === 'today') return d.toDateString() === now.toDateString();
        if (period === 'week') {
            const s = new Date(now);
            s.setDate(now.getDate() - now.getDay());
            s.setHours(0, 0, 0, 0);
            return d >= s;
        }
        if (period === 'month') return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
        return true;
    });
}
function exportOrdersCSV() {
    const orders = getOrders();
    if (!orders.length) {
        alert('No orders to export.');
        return;
    }
    const DAY = [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday'
    ];
    const MONTH = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December'
    ];
    const PAY = {
        paytm: 'Paytm',
        phonepe: 'PhonePe',
        gpay: 'Google Pay',
        cod: 'Cash'
    };
    const headers = [
        'Order ID',
        'Date',
        'Time',
        'Day',
        'Week No.',
        'Month',
        'Year',
        'Customer',
        'Phone',
        'Type',
        'Table/Pickup',
        'Staff',
        'Item Name',
        'Item Qty',
        'Unit Price (₹)',
        'Line Total (₹)',
        'Subtotal (₹)',
        'Discount (₹)',
        'Discount Reason',
        'Total (₹)',
        'Payment',
        'Status',
        'Cancel Reason'
    ];
    const rows = [];
    orders.forEach((order)=>{
        const d = new Date(order.timestamp);
        const date = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        const time = d.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit'
        });
        const loc = order.type === 'dine-in' ? `Table ${order.tableId}` : 'Pickup';
        const pay = PAY[order.payment] ?? order.payment ?? '';
        const items = order.items ?? [];
        if (!items.length) {
            rows.push([
                order.id,
                date,
                time,
                DAY[d.getDay()],
                Math.ceil(d.getDate() / 7),
                MONTH[d.getMonth()],
                d.getFullYear(),
                order.customerName,
                order.phone ?? '',
                order.type,
                loc,
                order.staffName ?? '',
                '',
                '',
                '',
                '',
                order.subtotal,
                order.discount ?? 0,
                order.discountReason ?? '',
                order.total,
                pay,
                order.status,
                order.cancelReason ?? ''
            ]);
        } else {
            items.forEach((item, i)=>{
                const line = item.subtotal ?? item.price * item.qty;
                rows.push([
                    i === 0 ? order.id : '',
                    i === 0 ? date : '',
                    i === 0 ? time : '',
                    i === 0 ? DAY[d.getDay()] : '',
                    i === 0 ? Math.ceil(d.getDate() / 7) : '',
                    i === 0 ? MONTH[d.getMonth()] : '',
                    i === 0 ? d.getFullYear() : '',
                    i === 0 ? order.customerName : '',
                    i === 0 ? order.phone ?? '' : '',
                    i === 0 ? order.type : '',
                    i === 0 ? loc : '',
                    i === 0 ? order.staffName ?? '' : '',
                    item.name,
                    item.qty,
                    item.price,
                    line,
                    i === 0 ? order.subtotal : '',
                    i === 0 ? order.discount ?? 0 : '',
                    i === 0 ? order.discountReason ?? '' : '',
                    i === 0 ? order.total : '',
                    i === 0 ? pay : '',
                    i === 0 ? order.status : '',
                    i === 0 ? order.cancelReason ?? '' : ''
                ]);
            });
        }
    });
    const esc = (v)=>{
        const s = String(v ?? '');
        return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [
        headers,
        ...rows
    ].map((r)=>r.map(esc).join(',')).join('\n');
    const blob = new Blob([
        '\uFEFF' + csv
    ], {
        type: 'text/csv;charset=utf-8;'
    });
    const url = URL.createObjectURL(blob);
    const now = new Date();
    const fname = `FoodieLover_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}.csv`;
    const a = document.createElement('a');
    a.href = url;
    a.download = fname;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
function getEndOfDayReport(date) {
    const d = date || new Date();
    const dayStr = d.toDateString();
    const all = getOrders().filter((o)=>new Date(o.timestamp).toDateString() === dayStr);
    const completed = all.filter((o)=>o.status === 'completed');
    const cancelled = all.filter((o)=>o.status === 'cancelled');
    const voided = all.filter((o)=>o.status === 'void');
    const awaiting = all.filter((o)=>o.status === 'awaiting_waiter');
    const gross = completed.reduce((s, o)=>s + (o.subtotal || o.total), 0);
    const disc = completed.reduce((s, o)=>s + (o.discount || 0), 0);
    const net = completed.reduce((s, o)=>s + o.total, 0);
    // Payment breakdown
    const payBreak = {};
    completed.forEach((o)=>{
        const pay = o.payment || 'cod';
        if (!payBreak[pay]) payBreak[pay] = {
            count: 0,
            amount: 0
        };
        payBreak[pay].count++;
        payBreak[pay].amount += o.total;
    });
    // Peak hour (by order count)
    const hourCounts = {};
    all.forEach((o)=>{
        const h = new Date(o.timestamp).getHours();
        hourCounts[h] = (hourCounts[h] || 0) + 1;
    });
    const peakEntry = Object.entries(hourCounts).sort((a, b)=>Number(b[1]) - Number(a[1]))[0];
    const peakHour = peakEntry ? `${String(Number(peakEntry[0])).padStart(2, '0')}:00 – ${String(Number(peakEntry[0])).padStart(2, '0')}:59` : 'N/A';
    // Top items (from completed orders only)
    const itemMap = {};
    completed.forEach((o)=>{
        o.items.forEach((item)=>{
            itemMap[item.name] = (itemMap[item.name] || 0) + item.qty;
        });
    });
    const topItems = Object.entries(itemMap).sort((a, b)=>b[1] - a[1]).slice(0, 6).map(([name, qty])=>({
            name,
            qty
        }));
    return {
        date: d.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }),
        totalOrders: all.length,
        completedOrders: completed.length,
        cancelledOrders: cancelled.length,
        voidedOrders: voided.length,
        awaitingOrders: awaiting.length,
        grossRevenue: gross,
        discounts: disc,
        netRevenue: net,
        paymentBreakdown: payBreak,
        avgBillValue: completed.length ? Math.round(net / completed.length) : 0,
        peakHour,
        topItems
    };
}
function getFraudAlerts() {
    const today = new Date().toDateString();
    const orders = getOrders().filter((o)=>new Date(o.timestamp).toDateString() === today);
    const alerts = [];
    // Waiter/staff with many cancellations today
    const cancelByStaff = {};
    orders.filter((o)=>o.status === 'cancelled').forEach((o)=>{
        const who = o.staffName || 'Unknown';
        cancelByStaff[who] = (cancelByStaff[who] || 0) + 1;
    });
    Object.entries(cancelByStaff).forEach(([staff, count])=>{
        if (count >= 3) {
            alerts.push({
                type: 'high_cancellations',
                severity: count >= 5 ? 'critical' : 'warning',
                message: `${staff} has ${count} cancellation${count > 1 ? 's' : ''} today`,
                staff,
                count
            });
        }
    });
    // High number of discounts today
    const discountOrders = orders.filter((o)=>(o.discount || 0) > 0);
    if (discountOrders.length >= 5) {
        const totalDisc = discountOrders.reduce((s, o)=>s + (o.discount || 0), 0);
        alerts.push({
            type: 'high_discounts',
            severity: discountOrders.length >= 10 ? 'critical' : 'warning',
            message: `${discountOrders.length} discounts today totalling ₹${totalDisc}`,
            count: discountOrders.length
        });
    }
    // Large individual discounts (>₹100)
    orders.filter((o)=>(o.discount || 0) > 100).forEach((o)=>{
        alerts.push({
            type: 'large_single_discount',
            severity: 'warning',
            message: `Large discount ₹${o.discount} on order ${o.orderNum ? `#${o.orderNum}` : o.id}`,
            details: o.discountReason || 'No reason given'
        });
    });
    // Any voided orders today
    const voidOrders = orders.filter((o)=>o.status === 'void');
    if (voidOrders.length > 0) {
        alerts.push({
            type: 'voided_orders',
            severity: voidOrders.length >= 2 ? 'critical' : 'warning',
            message: `${voidOrders.length} order${voidOrders.length > 1 ? 's' : ''} voided today — verify with manager`,
            count: voidOrders.length
        });
    }
    return alerts;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/app/table/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>TablePage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/storage.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
const CATEGORIES = [
    'All',
    'Biryani',
    'Starters',
    'Mains',
    'Breads',
    'Desserts',
    'Drinks'
];
const BADGE_LABELS = {
    bestseller: '⭐ Bestseller',
    popular: '🔥 Popular',
    chef: "👨‍🍳 Chef's Special",
    famous: '🏆 Famous',
    new: '✨ New'
};
const UPSELL_MAP = {
    Biryani: [
        'Starters',
        'Drinks',
        'Desserts'
    ],
    Starters: [
        'Breads',
        'Drinks'
    ],
    Mains: [
        'Breads',
        'Drinks',
        'Desserts'
    ],
    Breads: [
        'Mains',
        'Drinks'
    ],
    Desserts: [
        'Drinks'
    ],
    Drinks: []
};
const STATUS_LABEL = {
    awaiting_waiter: {
        label: 'Awaiting Confirmation',
        color: '#f97316',
        icon: '⏳'
    },
    pending: {
        label: 'Order Received',
        color: '#f59e0b',
        icon: '📋'
    },
    preparing: {
        label: 'Being Prepared',
        color: '#3b82f6',
        icon: '👨‍🍳'
    },
    prepared: {
        label: 'Ready to Serve',
        color: '#8b5cf6',
        icon: '✅'
    },
    served: {
        label: 'Served',
        color: '#06b6d4',
        icon: '🍽️'
    },
    completed: {
        label: 'Payment Done',
        color: '#16a34a',
        icon: '🎉'
    },
    cancelled: {
        label: 'Cancelled',
        color: '#ef4444',
        icon: '❌'
    }
};
const FLOW = [
    'pending',
    'preparing',
    'prepared',
    'served',
    'completed'
];
const MAX_QTY = 20;
// ─── TrackingBar Component ────────────────────────────────────────────────────
function TrackingBar({ order }) {
    if (!order) return null;
    const statusIndex = FLOW.indexOf(order.status);
    const progress = statusIndex >= 0 ? (statusIndex + 1) / FLOW.length * 100 : 0;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        style: {
            margin: '16px 0'
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    fontSize: '12px',
                    color: '#666',
                    marginBottom: '8px',
                    fontWeight: '500'
                },
                children: [
                    STATUS_LABEL[order.status]?.icon,
                    " ",
                    STATUS_LABEL[order.status]?.label
                ]
            }, void 0, true, {
                fileName: "[project]/app/table/page.tsx",
                lineNumber: 56,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    height: '4px',
                    background: '#e0e0e0',
                    borderRadius: '2px',
                    overflow: 'hidden'
                },
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        height: '100%',
                        background: `linear-gradient(90deg, #E65C00, #F9A826)`,
                        width: `${progress}%`,
                        transition: 'width 0.3s ease'
                    }
                }, void 0, false, {
                    fileName: "[project]/app/table/page.tsx",
                    lineNumber: 60,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/table/page.tsx",
                lineNumber: 59,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/table/page.tsx",
        lineNumber: 55,
        columnNumber: 5
    }, this);
}
_c = TrackingBar;
// ─── Main Component ──────────────────────────────────────────────────────────
function TableContent() {
    _s();
    const searchParams = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSearchParams"])();
    const tableId = parseInt(searchParams.get('table') || '1', 10);
    // Session storage keys
    const TAB_KEY = `fl_tab_${tableId}_id`;
    const NAME_KEY = `fl_tab_${tableId}_name`;
    const PARTY_KEY = `fl_tab_${tableId}_party`;
    // State
    const [view, setView] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('landing');
    const [tab, setTab] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [tabOrders, setTabOrders] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [latestOrder, setLatestOrder] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [menu, setMenu] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [cart, setCart] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [name, setName] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [partySize, setPartySize] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(1);
    const [selectedCategory, setSelectedCategory] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('All');
    const [showUpsell, setShowUpsell] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [upsellCategory, setUpsellCategory] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [waiterCallCooldown, setWaiterCallCooldown] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const pollingRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    // Landing step:
    // 'name'  → customer enters their name; system checks if they have an active tab
    // 'party' → no existing tab found; ask party size before creating a new one
    const [landingMode, setLandingMode] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('name');
    // ─── Init Effect ──────────────────────────────────────────────────────────
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "TableContent.useEffect": ()=>{
            // Load menu
            setMenu((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getMenu"])());
            // Check sessionStorage for saved tab
            const savedTabId = sessionStorage.getItem(TAB_KEY);
            const savedName = sessionStorage.getItem(NAME_KEY);
            const savedParty = sessionStorage.getItem(PARTY_KEY);
            if (savedTabId && savedName) {
                const existingTab = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getTab"])(savedTabId);
                if (existingTab) {
                    setTab(existingTab);
                    setName(savedName);
                    setPartySize(parseInt(savedParty || '1', 10));
                    // Determine view based on tab status
                    if (existingTab.tabStatus === 'closed') {
                        setView('receipt');
                    } else if (existingTab.tabStatus === 'awaiting_payment') {
                        setView('tracking');
                    } else {
                        setView('tracking');
                    }
                    // Load tab orders
                    const orders = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getTabOrders"])(savedTabId);
                    setTabOrders(orders);
                    // Find latest non-completed order
                    const latest = orders.find({
                        "TableContent.useEffect.latest": (o)=>o.status !== 'completed' && o.status !== 'void' && o.status !== 'cancelled'
                    }["TableContent.useEffect.latest"]);
                    setLatestOrder(latest || null);
                } else {
                    // Saved tab no longer exists, start fresh
                    sessionStorage.removeItem(TAB_KEY);
                    sessionStorage.removeItem(NAME_KEY);
                    sessionStorage.removeItem(PARTY_KEY);
                    setView('landing');
                }
            } else {
                setView('landing');
            }
        }
    }["TableContent.useEffect"], [
        TAB_KEY,
        NAME_KEY,
        PARTY_KEY
    ]);
    // ─── Polling Effect ──────────────────────────────────────────────────────
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "TableContent.useEffect": ()=>{
            if (view !== 'tracking' || !tab) {
                if (pollingRef.current) clearInterval(pollingRef.current);
                return;
            }
            const pollTab = {
                "TableContent.useEffect.pollTab": ()=>{
                    const updatedTab = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getTab"])(tab.id);
                    if (!updatedTab) return;
                    setTab(updatedTab);
                    // If tab is now closed, switch to receipt
                    if (updatedTab.tabStatus === 'closed') {
                        setView('receipt');
                        if (pollingRef.current) clearInterval(pollingRef.current);
                        return;
                    }
                    // Reload orders
                    const orders = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getTabOrders"])(updatedTab.id);
                    setTabOrders(orders);
                    // Find latest non-completed order
                    const latest = orders.find({
                        "TableContent.useEffect.pollTab.latest": (o)=>o.status !== 'completed' && o.status !== 'void' && o.status !== 'cancelled'
                    }["TableContent.useEffect.pollTab.latest"]);
                    setLatestOrder(latest || null);
                }
            }["TableContent.useEffect.pollTab"];
            pollingRef.current = setInterval(pollTab, 4000);
            return ({
                "TableContent.useEffect": ()=>{
                    if (pollingRef.current) clearInterval(pollingRef.current);
                }
            })["TableContent.useEffect"];
        }
    }["TableContent.useEffect"], [
        view,
        tab
    ]);
    // ─── Waiter Call Cooldown ─────────────────────────────────────────────────
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "TableContent.useEffect": ()=>{
            if (waiterCallCooldown <= 0) return;
            const timer = setTimeout({
                "TableContent.useEffect.timer": ()=>setWaiterCallCooldown({
                        "TableContent.useEffect.timer": (c)=>c - 1
                    }["TableContent.useEffect.timer"])
            }["TableContent.useEffect.timer"], 1000);
            return ({
                "TableContent.useEffect": ()=>clearTimeout(timer)
            })["TableContent.useEffect"];
        }
    }["TableContent.useEffect"], [
        waiterCallCooldown
    ]);
    // ─── Landing Submit ───────────────────────────────────────────────────────
    const submitLanding = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "TableContent.useCallback[submitLanding]": ()=>{
            setError('');
            if (!name.trim()) {
                setError('Please enter your name');
                return;
            }
            if (landingMode === 'name') {
                // Smart lookup: check if this customer already has an active tab at this table.
                // This covers: first-time visitor, customer who lost session, customer who requested
                // bill and came back to check status — the system just handles it automatically.
                const existingTab = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getOpenTabForCustomer"])(tableId, name.trim());
                if (existingTab) {
                    // Restore their session seamlessly — no "join" button needed
                    const tabParty = existingTab.partySize ?? 1;
                    sessionStorage.setItem(TAB_KEY, existingTab.id);
                    sessionStorage.setItem(NAME_KEY, name.trim());
                    sessionStorage.setItem(PARTY_KEY, String(tabParty));
                    setPartySize(tabParty);
                    const orders = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getTabOrders"])(existingTab.id);
                    setTab(existingTab);
                    setTabOrders(orders);
                    const latest = orders.find({
                        "TableContent.useCallback[submitLanding].latest": (o)=>o.status !== 'completed' && o.status !== 'void' && o.status !== 'cancelled'
                    }["TableContent.useCallback[submitLanding].latest"]);
                    setLatestOrder(latest || null);
                    setCart([]);
                    setView('tracking');
                } else {
                    // No active tab found — move to party size step, then create a fresh tab
                    setLandingMode('party');
                }
            } else {
                // landingMode === 'party': customer confirmed party size, create the tab now
                const newTab = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createTab"])(tableId, name.trim(), partySize);
                sessionStorage.setItem(TAB_KEY, newTab.id);
                sessionStorage.setItem(NAME_KEY, name.trim());
                sessionStorage.setItem(PARTY_KEY, partySize.toString());
                setTab(newTab);
                setCart([]);
                setView('menu');
            }
        }
    }["TableContent.useCallback[submitLanding]"], [
        name,
        partySize,
        landingMode,
        tableId,
        TAB_KEY,
        NAME_KEY,
        PARTY_KEY
    ]);
    // ─── Place Order ──────────────────────────────────────────────────────────
    const placeOrder = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "TableContent.useCallback[placeOrder]": ()=>{
            if (!tab || cart.length === 0) return;
            const subtotal = cart.reduce({
                "TableContent.useCallback[placeOrder].subtotal": (sum, item)=>sum + item.subtotal
            }["TableContent.useCallback[placeOrder].subtotal"], 0);
            const newOrder = {
                id: `order_${Date.now()}_${Math.random().toString(36).slice(2)}`,
                type: 'dine-in',
                tableId,
                customerName: name,
                items: cart,
                subtotal,
                discount: 0,
                total: subtotal,
                payment: 'pending',
                status: 'awaiting_waiter',
                partySize,
                timestamp: new Date().toISOString(),
                timeline: []
            };
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["addOrder"])(newOrder);
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["addOrderToTab"])(tab.id, newOrder.id);
            // Reload tab and orders
            const updatedTab = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getTab"])(tab.id);
            if (updatedTab) {
                setTab(updatedTab);
                const orders = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getTabOrders"])(updatedTab.id);
                setTabOrders(orders);
                const latest = orders.find({
                    "TableContent.useCallback[placeOrder].latest": (o)=>o.status !== 'completed' && o.status !== 'void' && o.status !== 'cancelled'
                }["TableContent.useCallback[placeOrder].latest"]);
                setLatestOrder(latest || null);
            }
            setCart([]);
            setView('tracking');
        }
    }["TableContent.useCallback[placeOrder]"], [
        tab,
        cart,
        name,
        partySize,
        tableId
    ]);
    // ─── Request Bill ─────────────────────────────────────────────────────────
    const handleRequestBill = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "TableContent.useCallback[handleRequestBill]": ()=>{
            if (!tab) return;
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestBill"])(tab.id);
            const updatedTab = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getTab"])(tab.id);
            if (updatedTab) setTab(updatedTab);
        }
    }["TableContent.useCallback[handleRequestBill]"], [
        tab
    ]);
    // ─── Call Waiter ──────────────────────────────────────────────────────────
    const callWaiter = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "TableContent.useCallback[callWaiter]": ()=>{
            if (waiterCallCooldown > 0 || !tab) return;
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["addWaiterCall"])(tableId, 'Customer called', name);
            setWaiterCallCooldown(60);
        }
    }["TableContent.useCallback[callWaiter]"], [
        waiterCallCooldown,
        tab,
        tableId,
        name
    ]);
    // ─── Add/Remove from Cart ──────────────────────────────────────────────────
    const addToCart = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "TableContent.useCallback[addToCart]": (item)=>{
            setCart({
                "TableContent.useCallback[addToCart]": (prev)=>{
                    const existing = prev.find({
                        "TableContent.useCallback[addToCart].existing": (i)=>i.id === item.id
                    }["TableContent.useCallback[addToCart].existing"]);
                    if (existing && existing.qty < MAX_QTY) {
                        return prev.map({
                            "TableContent.useCallback[addToCart]": (i)=>i.id === item.id ? {
                                    ...i,
                                    qty: i.qty + 1,
                                    subtotal: (i.qty + 1) * i.price
                                } : i
                        }["TableContent.useCallback[addToCart]"]);
                    }
                    if (!existing) {
                        return [
                            ...prev,
                            {
                                id: item.id,
                                name: item.name,
                                category: item.category,
                                price: item.price,
                                qty: 1,
                                subtotal: item.price
                            }
                        ];
                    }
                    return prev;
                }
            }["TableContent.useCallback[addToCart]"]);
            setShowUpsell(true);
            setUpsellCategory(UPSELL_MAP[item.category]?.[0] || '');
        }
    }["TableContent.useCallback[addToCart]"], []);
    const removeFromCart = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "TableContent.useCallback[removeFromCart]": (itemId)=>{
            setCart({
                "TableContent.useCallback[removeFromCart]": (prev)=>prev.filter({
                        "TableContent.useCallback[removeFromCart]": (i)=>i.id !== itemId
                    }["TableContent.useCallback[removeFromCart]"])
            }["TableContent.useCallback[removeFromCart]"]);
        }
    }["TableContent.useCallback[removeFromCart]"], []);
    const updateQty = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "TableContent.useCallback[updateQty]": (itemId, qty)=>{
            if (qty < 1) {
                removeFromCart(itemId);
                return;
            }
            if (qty > MAX_QTY) qty = MAX_QTY;
            setCart({
                "TableContent.useCallback[updateQty]": (prev)=>prev.map({
                        "TableContent.useCallback[updateQty]": (i)=>i.id === itemId ? {
                                ...i,
                                qty,
                                subtotal: qty * i.price
                            } : i
                    }["TableContent.useCallback[updateQty]"])
            }["TableContent.useCallback[updateQty]"]);
        }
    }["TableContent.useCallback[updateQty]"], [
        removeFromCart
    ]);
    // ─── Aggregated Items (all orders in tab) ──────────────────────────────────
    // For receipt: include completed orders (manager has closed tab → all orders are 'completed').
    // For tracking: only show active (in-progress) orders to reflect current kitchen state.
    const aggregatedItems = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "TableContent.useMemo[aggregatedItems]": ()=>{
            const agg = {};
            tabOrders.forEach({
                "TableContent.useMemo[aggregatedItems]": (order)=>{
                    // Always skip voided/cancelled items — they were reversed
                    if (order.status === 'void' || order.status === 'cancelled') return;
                    // In tracking view, skip orders that are already completed (clean bill view)
                    // In receipt view, we want everything including completed so the receipt isn't blank
                    if (view !== 'receipt' && order.status === 'completed') return;
                    order.items.forEach({
                        "TableContent.useMemo[aggregatedItems]": (item)=>{
                            if (!agg[item.id]) {
                                agg[item.id] = {
                                    ...item,
                                    qty: 0,
                                    subtotal: 0
                                };
                            }
                            agg[item.id].qty += item.qty;
                            agg[item.id].subtotal += item.subtotal;
                        }
                    }["TableContent.useMemo[aggregatedItems]"]);
                }
            }["TableContent.useMemo[aggregatedItems]"]);
            return Object.values(agg);
        }
    }["TableContent.useMemo[aggregatedItems]"], [
        tabOrders,
        view
    ]);
    // ─── Filtered Menu ────────────────────────────────────────────────────────
    const filteredMenu = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "TableContent.useMemo[filteredMenu]": ()=>{
            if (selectedCategory === 'All') return menu;
            return menu.filter({
                "TableContent.useMemo[filteredMenu]": (item)=>item.category === selectedCategory
            }["TableContent.useMemo[filteredMenu]"]);
        }
    }["TableContent.useMemo[filteredMenu]"], [
        menu,
        selectedCategory
    ]);
    // ─── Render Landing View ──────────────────────────────────────────────────
    if (view === 'landing') {
        const inputStyle = {
            width: '100%',
            padding: '14px',
            border: '1px solid #E65C00',
            borderRadius: '6px',
            fontSize: '15px',
            boxSizing: 'border-box',
            background: '#2D0F00',
            color: 'white',
            outline: 'none'
        };
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: {
                minHeight: '100vh',
                background: 'linear-gradient(135deg,#1A0800,#2D0F00)',
                color: 'white',
                padding: '20px',
                fontFamily: 'Poppins, sans-serif',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
            },
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    maxWidth: '400px',
                    width: '100%'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            textAlign: 'center',
                            marginBottom: '36px'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    fontSize: '40px',
                                    marginBottom: '8px'
                                },
                                children: "🍽️"
                            }, void 0, false, {
                                fileName: "[project]/app/table/page.tsx",
                                lineNumber: 386,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                style: {
                                    fontSize: '28px',
                                    margin: '0 0 8px 0',
                                    fontFamily: 'Playfair Display, serif'
                                },
                                children: [
                                    "Table ",
                                    tableId
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/table/page.tsx",
                                lineNumber: 387,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                style: {
                                    margin: 0,
                                    fontSize: '14px',
                                    color: '#bbb'
                                },
                                children: landingMode === 'name' ? 'Enter your name to start or resume your order' : 'How many guests are at your table?'
                            }, void 0, false, {
                                fileName: "[project]/app/table/page.tsx",
                                lineNumber: 390,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/table/page.tsx",
                        lineNumber: 385,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            marginBottom: '16px'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                style: {
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontSize: '13px',
                                    color: '#ccc'
                                },
                                children: "Your Name"
                            }, void 0, false, {
                                fileName: "[project]/app/table/page.tsx",
                                lineNumber: 399,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                type: "text",
                                value: name,
                                onChange: (e)=>{
                                    setName(e.target.value);
                                    setError('');
                                },
                                onKeyDown: (e)=>e.key === 'Enter' && submitLanding(),
                                placeholder: "e.g. Rahul",
                                disabled: landingMode === 'party',
                                style: {
                                    ...inputStyle,
                                    opacity: landingMode === 'party' ? 0.6 : 1
                                },
                                autoFocus: true
                            }, void 0, false, {
                                fileName: "[project]/app/table/page.tsx",
                                lineNumber: 402,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/table/page.tsx",
                        lineNumber: 398,
                        columnNumber: 11
                    }, this),
                    landingMode === 'party' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            marginBottom: '16px'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                style: {
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontSize: '13px',
                                    color: '#ccc'
                                },
                                children: "Number of Guests (including you)"
                            }, void 0, false, {
                                fileName: "[project]/app/table/page.tsx",
                                lineNumber: 420,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                value: partySize,
                                onChange: (e)=>setPartySize(parseInt(e.target.value, 10)),
                                style: inputStyle,
                                children: [
                                    1,
                                    2,
                                    3,
                                    4,
                                    5,
                                    6,
                                    7,
                                    8
                                ].map((n)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                        value: n,
                                        children: [
                                            n,
                                            " ",
                                            n === 1 ? 'person' : 'people'
                                        ]
                                    }, n, true, {
                                        fileName: "[project]/app/table/page.tsx",
                                        lineNumber: 429,
                                        columnNumber: 19
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/app/table/page.tsx",
                                lineNumber: 423,
                                columnNumber: 15
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/table/page.tsx",
                        lineNumber: 419,
                        columnNumber: 13
                    }, this),
                    error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            color: '#ff6b6b',
                            fontSize: '13px',
                            marginBottom: '16px'
                        },
                        children: error
                    }, void 0, false, {
                        fileName: "[project]/app/table/page.tsx",
                        lineNumber: 437,
                        columnNumber: 13
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            display: 'flex',
                            gap: '12px'
                        },
                        children: [
                            landingMode === 'party' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>{
                                    setLandingMode('name');
                                    setError('');
                                },
                                style: {
                                    flex: '0 0 80px',
                                    padding: '14px',
                                    background: 'rgba(255,255,255,0.1)',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    color: 'white',
                                    fontSize: '14px',
                                    borderRadius: '6px',
                                    cursor: 'pointer'
                                },
                                children: "← Back"
                            }, void 0, false, {
                                fileName: "[project]/app/table/page.tsx",
                                lineNumber: 445,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: submitLanding,
                                style: {
                                    flex: 1,
                                    padding: '14px',
                                    background: '#E65C00',
                                    border: 'none',
                                    color: 'white',
                                    fontSize: '15px',
                                    fontWeight: 'bold',
                                    borderRadius: '6px',
                                    cursor: 'pointer'
                                },
                                children: landingMode === 'name' ? 'Continue →' : '🍴 Start Ordering'
                            }, void 0, false, {
                                fileName: "[project]/app/table/page.tsx",
                                lineNumber: 461,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/table/page.tsx",
                        lineNumber: 443,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/table/page.tsx",
                lineNumber: 382,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/app/table/page.tsx",
            lineNumber: 371,
            columnNumber: 7
        }, this);
    }
    // ─── Render Menu View ──────────────────────────────────────────────────────
    if (view === 'menu') {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: {
                minHeight: '100vh',
                background: 'linear-gradient(135deg,#faf8f3,#f5f0e8)',
                color: '#1A0800',
                padding: '0',
                fontFamily: 'Poppins, sans-serif'
            },
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        background: '#E65C00',
                        color: 'white',
                        padding: '16px',
                        position: 'sticky',
                        top: 0,
                        zIndex: 100
                    },
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            maxWidth: '440px',
                            margin: '0 auto',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                style: {
                                    fontSize: '20px',
                                    margin: 0,
                                    fontFamily: 'Playfair Display, serif'
                                },
                                children: "Menu"
                            }, void 0, false, {
                                fileName: "[project]/app/table/page.tsx",
                                lineNumber: 504,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    fontSize: '14px'
                                },
                                children: [
                                    "Table ",
                                    tableId
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/table/page.tsx",
                                lineNumber: 505,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/table/page.tsx",
                        lineNumber: 503,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/app/table/page.tsx",
                    lineNumber: 495,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        padding: '16px',
                        borderBottom: '1px solid #ddd',
                        maxWidth: '440px',
                        margin: '0 auto',
                        overflowX: 'auto',
                        display: 'flex',
                        gap: '12px'
                    },
                    children: CATEGORIES.map((cat)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: ()=>setSelectedCategory(cat),
                            style: {
                                padding: '8px 16px',
                                border: 'none',
                                borderRadius: '20px',
                                background: selectedCategory === cat ? '#E65C00' : '#fff',
                                color: selectedCategory === cat ? 'white' : '#1A0800',
                                cursor: 'pointer',
                                fontWeight: selectedCategory === cat ? 'bold' : 'normal',
                                fontSize: '13px',
                                whiteSpace: 'nowrap'
                            },
                            children: cat
                        }, cat, false, {
                            fileName: "[project]/app/table/page.tsx",
                            lineNumber: 520,
                            columnNumber: 13
                        }, this))
                }, void 0, false, {
                    fileName: "[project]/app/table/page.tsx",
                    lineNumber: 510,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        maxWidth: '440px',
                        margin: '0 auto',
                        padding: '16px'
                    },
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: '12px',
                            marginBottom: '80px'
                        },
                        children: filteredMenu.map((item)=>{
                            const inCart = cart.find((c)=>c.id === item.id);
                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    background: 'white',
                                    borderRadius: '8px',
                                    padding: '12px',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                    position: 'relative'
                                },
                                children: [
                                    item.badge && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            position: 'absolute',
                                            top: '8px',
                                            right: '8px',
                                            background: '#F9A826',
                                            color: '#1A0800',
                                            padding: '4px 8px',
                                            borderRadius: '4px',
                                            fontSize: '11px',
                                            fontWeight: 'bold'
                                        },
                                        children: BADGE_LABELS[item.badge] || item.badge
                                    }, void 0, false, {
                                        fileName: "[project]/app/table/page.tsx",
                                        lineNumber: 557,
                                        columnNumber: 21
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        style: {
                                            fontSize: '14px',
                                            fontWeight: 'bold',
                                            margin: '0 0 4px 0'
                                        },
                                        children: item.name
                                    }, void 0, false, {
                                        fileName: "[project]/app/table/page.tsx",
                                        lineNumber: 571,
                                        columnNumber: 19
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        style: {
                                            fontSize: '12px',
                                            color: '#666',
                                            margin: '0 0 8px 0',
                                            lineHeight: '1.3'
                                        },
                                        children: item.desc
                                    }, void 0, false, {
                                        fileName: "[project]/app/table/page.tsx",
                                        lineNumber: 572,
                                        columnNumber: 19
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                style: {
                                                    fontSize: '14px',
                                                    fontWeight: 'bold',
                                                    color: '#E65C00'
                                                },
                                                children: [
                                                    "₹",
                                                    item.price
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/table/page.tsx",
                                                lineNumber: 574,
                                                columnNumber: 21
                                            }, this),
                                            !inCart ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                onClick: ()=>addToCart(item),
                                                style: {
                                                    padding: '6px 12px',
                                                    background: '#E65C00',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                    fontSize: '12px',
                                                    fontWeight: 'bold'
                                                },
                                                children: "Add"
                                            }, void 0, false, {
                                                fileName: "[project]/app/table/page.tsx",
                                                lineNumber: 576,
                                                columnNumber: 23
                                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    display: 'flex',
                                                    gap: '6px',
                                                    alignItems: 'center'
                                                },
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        onClick: ()=>updateQty(item.id, inCart.qty - 1),
                                                        style: {
                                                            padding: '4px 8px',
                                                            background: '#ddd',
                                                            border: 'none',
                                                            borderRadius: '4px',
                                                            cursor: 'pointer'
                                                        },
                                                        children: "−"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/table/page.tsx",
                                                        lineNumber: 593,
                                                        columnNumber: 25
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        style: {
                                                            fontSize: '12px',
                                                            fontWeight: 'bold',
                                                            minWidth: '20px',
                                                            textAlign: 'center'
                                                        },
                                                        children: inCart.qty
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/table/page.tsx",
                                                        lineNumber: 605,
                                                        columnNumber: 25
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        onClick: ()=>updateQty(item.id, inCart.qty + 1),
                                                        style: {
                                                            padding: '4px 8px',
                                                            background: '#E65C00',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '4px',
                                                            cursor: 'pointer'
                                                        },
                                                        children: "+"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/table/page.tsx",
                                                        lineNumber: 606,
                                                        columnNumber: 25
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/table/page.tsx",
                                                lineNumber: 592,
                                                columnNumber: 23
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/table/page.tsx",
                                        lineNumber: 573,
                                        columnNumber: 19
                                    }, this)
                                ]
                            }, item.id, true, {
                                fileName: "[project]/app/table/page.tsx",
                                lineNumber: 546,
                                columnNumber: 17
                            }, this);
                        })
                    }, void 0, false, {
                        fileName: "[project]/app/table/page.tsx",
                        lineNumber: 542,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/app/table/page.tsx",
                    lineNumber: 541,
                    columnNumber: 9
                }, this),
                showUpsell && upsellCategory && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'flex-end',
                        zIndex: 200
                    },
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            width: '100%',
                            background: 'white',
                            padding: '24px 16px',
                            borderRadius: '16px 16px 0 0',
                            maxWidth: '440px',
                            margin: '0 auto'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                style: {
                                    fontSize: '18px',
                                    fontWeight: 'bold',
                                    marginBottom: '16px',
                                    fontFamily: 'Playfair Display, serif'
                                },
                                children: "Don't forget..."
                            }, void 0, false, {
                                fileName: "[project]/app/table/page.tsx",
                                lineNumber: 646,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(2, 1fr)',
                                    gap: '12px',
                                    marginBottom: '16px'
                                },
                                children: menu.filter((item)=>item.category === upsellCategory).slice(0, 4).map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            background: '#f5f0e8',
                                            padding: '12px',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            textAlign: 'center'
                                        },
                                        onClick: ()=>{
                                            addToCart(item);
                                            setShowUpsell(false);
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    fontSize: '12px',
                                                    fontWeight: 'bold'
                                                },
                                                children: item.name
                                            }, void 0, false, {
                                                fileName: "[project]/app/table/page.tsx",
                                                lineNumber: 668,
                                                columnNumber: 23
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    fontSize: '12px',
                                                    color: '#E65C00',
                                                    marginTop: '4px'
                                                },
                                                children: [
                                                    "₹",
                                                    item.price
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/table/page.tsx",
                                                lineNumber: 669,
                                                columnNumber: 23
                                            }, this)
                                        ]
                                    }, item.id, true, {
                                        fileName: "[project]/app/table/page.tsx",
                                        lineNumber: 654,
                                        columnNumber: 21
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/app/table/page.tsx",
                                lineNumber: 649,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>setShowUpsell(false),
                                style: {
                                    width: '100%',
                                    padding: '12px',
                                    background: '#E65C00',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold'
                                },
                                children: "Continue"
                            }, void 0, false, {
                                fileName: "[project]/app/table/page.tsx",
                                lineNumber: 673,
                                columnNumber: 15
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/table/page.tsx",
                        lineNumber: 638,
                        columnNumber: 13
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/app/table/page.tsx",
                    lineNumber: 630,
                    columnNumber: 11
                }, this),
                cart.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        position: 'fixed',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        background: 'white',
                        borderTop: '1px solid #ddd',
                        padding: '16px',
                        maxWidth: '440px',
                        margin: '0 auto',
                        zIndex: 100
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                marginBottom: '12px'
                            },
                            children: [
                                cart.map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            fontSize: '13px',
                                            marginBottom: '6px'
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                children: [
                                                    item.name,
                                                    " x",
                                                    item.qty
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/table/page.tsx",
                                                lineNumber: 709,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                children: [
                                                    "₹",
                                                    item.subtotal
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/table/page.tsx",
                                                lineNumber: 710,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, item.id, true, {
                                        fileName: "[project]/app/table/page.tsx",
                                        lineNumber: 708,
                                        columnNumber: 17
                                    }, this)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        borderTop: '1px solid #ddd',
                                        paddingTop: '8px',
                                        marginTop: '8px',
                                        fontSize: '14px',
                                        fontWeight: 'bold',
                                        display: 'flex',
                                        justifyContent: 'space-between'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            children: "Total:"
                                        }, void 0, false, {
                                            fileName: "[project]/app/table/page.tsx",
                                            lineNumber: 722,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            children: [
                                                "₹",
                                                cart.reduce((sum, item)=>sum + item.subtotal, 0)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/table/page.tsx",
                                            lineNumber: 723,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/table/page.tsx",
                                    lineNumber: 713,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/table/page.tsx",
                            lineNumber: 706,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: placeOrder,
                            style: {
                                width: '100%',
                                padding: '12px',
                                background: '#E65C00',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                fontSize: '14px'
                            },
                            children: "Place Order →"
                        }, void 0, false, {
                            fileName: "[project]/app/table/page.tsx",
                            lineNumber: 726,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/table/page.tsx",
                    lineNumber: 694,
                    columnNumber: 11
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/app/table/page.tsx",
            lineNumber: 487,
            columnNumber: 7
        }, this);
    }
    // ─── Render Tracking View ──────────────────────────────────────────────────
    if (view === 'tracking') {
        const tabIsOpen = tab?.tabStatus === 'open';
        const tabAwaitingPayment = tab?.tabStatus === 'awaiting_payment';
        // Tab is active if open or awaiting payment — customer is still seated
        const tabIsActive = tabIsOpen || tabAwaitingPayment;
        // Block "Request Bill" if ANY order in this tab is still in the kitchen/waiting to be served.
        // It makes no sense to generate a bill while food hasn't arrived at the table yet.
        const hasUnservedOrders = tabOrders.some((o)=>[
                'awaiting_waiter',
                'pending',
                'preparing',
                'prepared'
            ].includes(o.status));
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: {
                minHeight: '100vh',
                background: 'linear-gradient(135deg,#1A0800,#2D0F00)',
                color: 'white',
                padding: '16px',
                fontFamily: 'Poppins, sans-serif'
            },
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    maxWidth: '440px',
                    margin: '0 auto'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            marginBottom: '24px'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                style: {
                                    fontSize: '28px',
                                    margin: '0 0 8px 0',
                                    fontFamily: 'Playfair Display, serif'
                                },
                                children: [
                                    "Table ",
                                    tableId
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/table/page.tsx",
                                lineNumber: 772,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                style: {
                                    margin: 0,
                                    fontSize: '14px',
                                    color: '#ccc'
                                },
                                children: [
                                    name,
                                    " ",
                                    partySize > 1 ? `• ${partySize} people` : ''
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/table/page.tsx",
                                lineNumber: 775,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/table/page.tsx",
                        lineNumber: 771,
                        columnNumber: 11
                    }, this),
                    tabAwaitingPayment && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            background: '#E65C00',
                            padding: '20px 16px',
                            borderRadius: '8px',
                            marginBottom: '20px',
                            textAlign: 'center'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    fontSize: '20px',
                                    marginBottom: '8px'
                                },
                                children: "🧾"
                            }, void 0, false, {
                                fileName: "[project]/app/table/page.tsx",
                                lineNumber: 789,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    fontSize: '18px',
                                    fontWeight: 'bold',
                                    marginBottom: '8px'
                                },
                                children: "Please pay at the counter"
                            }, void 0, false, {
                                fileName: "[project]/app/table/page.tsx",
                                lineNumber: 790,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    fontSize: '13px',
                                    opacity: 0.9,
                                    marginBottom: '12px'
                                },
                                children: "Your bill total is ready. Please visit the counter to complete payment."
                            }, void 0, false, {
                                fileName: "[project]/app/table/page.tsx",
                                lineNumber: 793,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    background: 'rgba(0,0,0,0.2)',
                                    borderRadius: '6px',
                                    padding: '10px',
                                    fontSize: '20px',
                                    fontWeight: 'bold',
                                    letterSpacing: '1px'
                                },
                                children: [
                                    "₹",
                                    tab?.totalAmount || 0
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/table/page.tsx",
                                lineNumber: 796,
                                columnNumber: 15
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/table/page.tsx",
                        lineNumber: 782,
                        columnNumber: 13
                    }, this),
                    latestOrder && tabIsActive && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            marginBottom: '24px'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                style: {
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    margin: '0 0 12px 0'
                                },
                                children: [
                                    "Latest Order #",
                                    latestOrder.orderNum
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/table/page.tsx",
                                lineNumber: 813,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(TrackingBar, {
                                order: latestOrder
                            }, void 0, false, {
                                fileName: "[project]/app/table/page.tsx",
                                lineNumber: 816,
                                columnNumber: 15
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/table/page.tsx",
                        lineNumber: 812,
                        columnNumber: 13
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            marginBottom: '24px'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                style: {
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    margin: '0 0 12px 0'
                                },
                                children: "Items"
                            }, void 0, false, {
                                fileName: "[project]/app/table/page.tsx",
                                lineNumber: 822,
                                columnNumber: 13
                            }, this),
                            aggregatedItems.length > 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    background: 'rgba(255,255,255,0.1)',
                                    padding: '12px',
                                    borderRadius: '8px'
                                },
                                children: aggregatedItems.map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            fontSize: '13px',
                                            marginBottom: '8px'
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                children: [
                                                    item.name,
                                                    " x",
                                                    item.qty
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/table/page.tsx",
                                                lineNumber: 827,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                children: [
                                                    "₹",
                                                    item.subtotal
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/table/page.tsx",
                                                lineNumber: 828,
                                                columnNumber: 21
                                            }, this)
                                        ]
                                    }, item.id, true, {
                                        fileName: "[project]/app/table/page.tsx",
                                        lineNumber: 826,
                                        columnNumber: 19
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/app/table/page.tsx",
                                lineNumber: 824,
                                columnNumber: 15
                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                style: {
                                    fontSize: '13px',
                                    color: '#ccc',
                                    margin: 0
                                },
                                children: "No items yet"
                            }, void 0, false, {
                                fileName: "[project]/app/table/page.tsx",
                                lineNumber: 833,
                                columnNumber: 15
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/table/page.tsx",
                        lineNumber: 821,
                        columnNumber: 11
                    }, this),
                    tabOrders.length > 1 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            marginBottom: '24px'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                style: {
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    margin: '0 0 12px 0'
                                },
                                children: "Order History"
                            }, void 0, false, {
                                fileName: "[project]/app/table/page.tsx",
                                lineNumber: 840,
                                columnNumber: 15
                            }, this),
                            tabOrders.map((order)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        background: 'rgba(255,255,255,0.05)',
                                        padding: '12px',
                                        borderRadius: '4px',
                                        marginBottom: '8px',
                                        fontSize: '12px'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                marginBottom: '6px'
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    style: {
                                                        fontWeight: 'bold'
                                                    },
                                                    children: [
                                                        "Order #",
                                                        order.orderNum
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/table/page.tsx",
                                                    lineNumber: 850,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    style: {
                                                        color: '#ccc'
                                                    },
                                                    children: STATUS_LABEL[order.status]?.label
                                                }, void 0, false, {
                                                    fileName: "[project]/app/table/page.tsx",
                                                    lineNumber: 851,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/table/page.tsx",
                                            lineNumber: 849,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                color: '#ccc'
                                            },
                                            children: [
                                                order.items.length,
                                                " items • ₹",
                                                order.total
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/table/page.tsx",
                                            lineNumber: 853,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, order.id, true, {
                                    fileName: "[project]/app/table/page.tsx",
                                    lineNumber: 842,
                                    columnNumber: 17
                                }, this))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/table/page.tsx",
                        lineNumber: 839,
                        columnNumber: 13
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            background: 'rgba(255,255,255,0.1)',
                            padding: '16px',
                            borderRadius: '8px',
                            marginBottom: '24px'
                        },
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: '18px',
                                fontWeight: 'bold'
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    children: "Total:"
                                }, void 0, false, {
                                    fileName: "[project]/app/table/page.tsx",
                                    lineNumber: 867,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    children: [
                                        "₹",
                                        tab?.totalAmount || 0
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/table/page.tsx",
                                    lineNumber: 868,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/table/page.tsx",
                            lineNumber: 866,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/app/table/page.tsx",
                        lineNumber: 860,
                        columnNumber: 11
                    }, this),
                    tabIsActive && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            marginBottom: '24px'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: callWaiter,
                                disabled: waiterCallCooldown > 0,
                                style: {
                                    padding: '12px',
                                    background: waiterCallCooldown > 0 ? '#555' : '#F9A826',
                                    color: waiterCallCooldown > 0 ? '#ccc' : '#1A0800',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: waiterCallCooldown > 0 ? 'not-allowed' : 'pointer',
                                    fontWeight: 'bold',
                                    fontSize: '14px'
                                },
                                children: [
                                    "🔔 Call Waiter ",
                                    waiterCallCooldown > 0 && `(${waiterCallCooldown}s)`
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/table/page.tsx",
                                lineNumber: 876,
                                columnNumber: 15
                            }, this),
                            tabIsOpen && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>setView('menu'),
                                        style: {
                                            padding: '12px',
                                            background: '#E65C00',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontWeight: 'bold',
                                            fontSize: '14px'
                                        },
                                        children: "➕ Order More"
                                    }, void 0, false, {
                                        fileName: "[project]/app/table/page.tsx",
                                        lineNumber: 896,
                                        columnNumber: 19
                                    }, this),
                                    hasUnservedOrders && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            background: 'rgba(249,168,38,0.15)',
                                            border: '1px solid #F9A826',
                                            borderRadius: '4px',
                                            padding: '10px 12px',
                                            fontSize: '12px',
                                            color: '#F9A826',
                                            textAlign: 'center',
                                            lineHeight: '1.5'
                                        },
                                        children: "⏳ Your food is still being prepared. You can request the bill once everything is served."
                                    }, void 0, false, {
                                        fileName: "[project]/app/table/page.tsx",
                                        lineNumber: 914,
                                        columnNumber: 21
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: hasUnservedOrders ? undefined : handleRequestBill,
                                        disabled: hasUnservedOrders,
                                        style: {
                                            padding: '12px',
                                            background: hasUnservedOrders ? '#333' : '#555',
                                            color: hasUnservedOrders ? '#666' : 'white',
                                            border: hasUnservedOrders ? '1px solid #444' : 'none',
                                            borderRadius: '4px',
                                            cursor: hasUnservedOrders ? 'not-allowed' : 'pointer',
                                            fontWeight: 'bold',
                                            fontSize: '14px',
                                            opacity: hasUnservedOrders ? 0.5 : 1
                                        },
                                        children: "🧾 Request Bill"
                                    }, void 0, false, {
                                        fileName: "[project]/app/table/page.tsx",
                                        lineNumber: 928,
                                        columnNumber: 19
                                    }, this)
                                ]
                            }, void 0, true)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/table/page.tsx",
                        lineNumber: 874,
                        columnNumber: 13
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/table/page.tsx",
                lineNumber: 769,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/app/table/page.tsx",
            lineNumber: 762,
            columnNumber: 7
        }, this);
    }
    // ─── Render Receipt View ───────────────────────────────────────────────────
    if (view === 'receipt') {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: {
                minHeight: '100vh',
                background: 'linear-gradient(135deg,#1A0800,#2D0F00)',
                color: 'white',
                padding: '20px',
                fontFamily: 'Poppins, sans-serif',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
            },
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    maxWidth: '440px',
                    width: '100%',
                    textAlign: 'center'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                        style: {
                            fontSize: '48px',
                            margin: '0 0 16px 0'
                        },
                        children: "🎉"
                    }, void 0, false, {
                        fileName: "[project]/app/table/page.tsx",
                        lineNumber: 969,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                        style: {
                            fontSize: '28px',
                            margin: '0 0 16px 0',
                            fontFamily: 'Playfair Display, serif'
                        },
                        children: "Thank You!"
                    }, void 0, false, {
                        fileName: "[project]/app/table/page.tsx",
                        lineNumber: 970,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        style: {
                            fontSize: '16px',
                            color: '#ccc',
                            margin: '0 0 32px 0'
                        },
                        children: [
                            "We loved serving you at Table ",
                            tableId
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/table/page.tsx",
                        lineNumber: 971,
                        columnNumber: 11
                    }, this),
                    tab && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            background: 'rgba(255,255,255,0.1)',
                            padding: '16px',
                            borderRadius: '8px',
                            marginBottom: '32px',
                            textAlign: 'left'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    marginBottom: '12px',
                                    borderBottom: '1px solid rgba(255,255,255,0.2)',
                                    paddingBottom: '12px'
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            fontSize: '13px',
                                            marginBottom: '6px'
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                children: "Customer:"
                                            }, void 0, false, {
                                                fileName: "[project]/app/table/page.tsx",
                                                lineNumber: 986,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                children: name
                                            }, void 0, false, {
                                                fileName: "[project]/app/table/page.tsx",
                                                lineNumber: 987,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/table/page.tsx",
                                        lineNumber: 985,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            fontSize: '13px'
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                children: "Party Size:"
                                            }, void 0, false, {
                                                fileName: "[project]/app/table/page.tsx",
                                                lineNumber: 990,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                children: partySize
                                            }, void 0, false, {
                                                fileName: "[project]/app/table/page.tsx",
                                                lineNumber: 991,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/table/page.tsx",
                                        lineNumber: 989,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/table/page.tsx",
                                lineNumber: 984,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    marginBottom: '12px',
                                    borderBottom: '1px solid rgba(255,255,255,0.2)',
                                    paddingBottom: '12px'
                                },
                                children: aggregatedItems.map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            fontSize: '13px',
                                            marginBottom: '6px'
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                children: [
                                                    item.name,
                                                    " x",
                                                    item.qty
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/table/page.tsx",
                                                lineNumber: 997,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                children: [
                                                    "₹",
                                                    item.subtotal
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/table/page.tsx",
                                                lineNumber: 998,
                                                columnNumber: 21
                                            }, this)
                                        ]
                                    }, item.id, true, {
                                        fileName: "[project]/app/table/page.tsx",
                                        lineNumber: 996,
                                        columnNumber: 19
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/app/table/page.tsx",
                                lineNumber: 994,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    fontSize: '16px',
                                    fontWeight: 'bold'
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: "Total:"
                                    }, void 0, false, {
                                        fileName: "[project]/app/table/page.tsx",
                                        lineNumber: 1003,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: [
                                            "₹",
                                            tab.totalAmount
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/table/page.tsx",
                                        lineNumber: 1004,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/table/page.tsx",
                                lineNumber: 1002,
                                columnNumber: 15
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/table/page.tsx",
                        lineNumber: 977,
                        columnNumber: 13
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>{
                            sessionStorage.removeItem(TAB_KEY);
                            sessionStorage.removeItem(NAME_KEY);
                            sessionStorage.removeItem(PARTY_KEY);
                            setView('landing');
                            setTab(null);
                            setTabOrders([]);
                            setLatestOrder(null);
                            setCart([]);
                            setName('');
                            setPartySize(1);
                            setLandingMode('name');
                        },
                        style: {
                            width: '100%',
                            padding: '12px',
                            background: '#E65C00',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            fontSize: '14px'
                        },
                        children: "Start New Tab"
                    }, void 0, false, {
                        fileName: "[project]/app/table/page.tsx",
                        lineNumber: 1009,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/table/page.tsx",
                lineNumber: 968,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/app/table/page.tsx",
            lineNumber: 957,
            columnNumber: 7
        }, this);
    }
    return null;
}
_s(TableContent, "YryR1N/4lTH2mnlmiMaKW3kIeU8=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSearchParams"]
    ];
});
_c1 = TableContent;
function TablePage() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Suspense"], {
        fallback: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: {
                minHeight: '100vh',
                background: '#1A0800',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
            },
            children: "Loading..."
        }, void 0, false, {
            fileName: "[project]/app/table/page.tsx",
            lineNumber: 1047,
            columnNumber: 25
        }, void 0),
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(TableContent, {}, void 0, false, {
            fileName: "[project]/app/table/page.tsx",
            lineNumber: 1048,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/app/table/page.tsx",
        lineNumber: 1047,
        columnNumber: 5
    }, this);
}
_c2 = TablePage;
var _c, _c1, _c2;
__turbopack_context__.k.register(_c, "TrackingBar");
__turbopack_context__.k.register(_c1, "TableContent");
__turbopack_context__.k.register(_c2, "TablePage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=_3d5a810d._.js.map