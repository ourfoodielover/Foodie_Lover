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
"[project]/lib/auth.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// ─── Foodie Lover — Auth System ───────────────────────────────────────────────
// Role-based session management using localStorage.
// No backend required — all state is local.
__turbopack_context__.s([
    "SECURITY_QUESTIONS",
    ()=>SECURITY_QUESTIONS,
    "clearSession",
    ()=>clearSession,
    "createStaffAccount",
    ()=>createStaffAccount,
    "deleteStaffAccount",
    ()=>deleteStaffAccount,
    "getKitchenPin",
    ()=>getKitchenPin,
    "getManagerPin",
    ()=>getManagerPin,
    "getSecuritySetup",
    ()=>getSecuritySetup,
    "getSession",
    ()=>getSession,
    "getStaffAccounts",
    ()=>getStaffAccounts,
    "loginAdmin",
    ()=>loginAdmin,
    "loginKitchen",
    ()=>loginKitchen,
    "loginManager",
    ()=>loginManager,
    "loginWaiter",
    ()=>loginWaiter,
    "resetAdminPinWithSecurity",
    ()=>resetAdminPinWithSecurity,
    "saveKitchenPin",
    ()=>saveKitchenPin,
    "saveManagerPin",
    ()=>saveManagerPin,
    "saveSecuritySetup",
    ()=>saveSecuritySetup,
    "saveSession",
    ()=>saveSession,
    "saveStaffAccounts",
    ()=>saveStaffAccounts,
    "toggleStaffAccount",
    ()=>toggleStaffAccount,
    "updateStaffPin",
    ()=>updateStaffPin,
    "verifySecurityAnswer",
    ()=>verifySecurityAnswer
]);
// ─── localStorage keys ────────────────────────────────────────────────────────
const SESSION_KEY = {
    admin: 'fl_session_admin',
    kitchen: 'fl_session_kitchen',
    waiter: 'fl_session_waiter',
    manager: 'fl_session_manager'
};
const KEYS = {
    kitchenPin: 'fl_kitchen_pin',
    managerPin: 'fl_manager_pin',
    staffAccounts: 'fl_staff_accounts',
    securitySetup: 'fl_admin_security'
};
// Sessions expire after 8 hours of inactivity
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
// ─── Storage helpers ──────────────────────────────────────────────────────────
function ls_get(key, fallback) {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    try {
        const v = localStorage.getItem(key);
        return v ? JSON.parse(v) : fallback;
    } catch  {
        return fallback;
    }
}
function ls_set(key, val) {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    localStorage.setItem(key, JSON.stringify(val));
}
const getKitchenPin = ()=>ls_get(KEYS.kitchenPin, '0000');
const saveKitchenPin = (p)=>ls_set(KEYS.kitchenPin, p);
const getManagerPin = ()=>ls_get(KEYS.managerPin, '9999');
const saveManagerPin = (p)=>ls_set(KEYS.managerPin, p);
const getStaffAccounts = ()=>ls_get(KEYS.staffAccounts, []);
const saveStaffAccounts = (a)=>ls_set(KEYS.staffAccounts, a);
function createStaffAccount(name, username, pin) {
    const accounts = getStaffAccounts();
    if (accounts.some((a)=>a.username.toLowerCase() === username.toLowerCase().trim())) {
        return {
            error: 'Username already exists'
        };
    }
    if (pin.length < 4) return {
        error: 'PIN must be at least 4 digits'
    };
    const account = {
        id: `STAFF-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        username: username.trim(),
        pin: pin.trim(),
        role: 'waiter',
        name: name.trim(),
        active: true,
        createdAt: new Date().toISOString()
    };
    accounts.push(account);
    saveStaffAccounts(accounts);
    return account;
}
function deleteStaffAccount(id) {
    saveStaffAccounts(getStaffAccounts().filter((a)=>a.id !== id));
}
function toggleStaffAccount(id) {
    saveStaffAccounts(getStaffAccounts().map((a)=>a.id === id ? {
            ...a,
            active: !a.active
        } : a));
}
function updateStaffPin(id, newPin) {
    saveStaffAccounts(getStaffAccounts().map((a)=>a.id === id ? {
            ...a,
            pin: newPin
        } : a));
}
function getSession(role) {
    const s = ls_get(SESSION_KEY[role], null);
    if (!s) return null;
    if (new Date(s.expiresAt) < new Date()) {
        clearSession(role);
        return null;
    }
    return s;
}
function saveSession(s) {
    ls_set(SESSION_KEY[s.role], s);
}
function clearSession(role) {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    localStorage.removeItem(SESSION_KEY[role]);
}
function loginAdmin(pin, ownerPin) {
    if (pin !== ownerPin) return null;
    const s = {
        role: 'admin',
        name: 'Admin',
        username: 'admin',
        loginAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString()
    };
    saveSession(s);
    return s;
}
function loginKitchen(pin) {
    if (pin !== getKitchenPin()) return null;
    const s = {
        role: 'kitchen',
        name: 'Kitchen Staff',
        username: 'kitchen',
        loginAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString()
    };
    saveSession(s);
    return s;
}
function loginWaiter(username, pin) {
    const account = getStaffAccounts().find((a)=>a.username.toLowerCase() === username.toLowerCase().trim() && a.pin === pin.trim() && a.active);
    if (!account) return null;
    const s = {
        accountId: account.id,
        role: 'waiter',
        name: account.name,
        username: account.username,
        loginAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString()
    };
    saveSession(s);
    return s;
}
function loginManager(pin) {
    if (pin !== getManagerPin()) return null;
    const s = {
        role: 'manager',
        name: 'Manager',
        username: 'manager',
        loginAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString()
    };
    saveSession(s);
    return s;
}
const SECURITY_QUESTIONS = [
    "What is the name of your first pet?",
    "What was the name of your first school?",
    "What is your mother's maiden name?",
    "What is the name of the street you grew up on?",
    "What was the make of your first car?",
    "What is the name of your favourite restaurant?",
    "What city were you born in?",
    "What was the name of your childhood best friend?"
];
function getSecuritySetup() {
    return ls_get(KEYS.securitySetup, null);
}
function saveSecuritySetup(question, answer) {
    const setup = {
        question,
        answerHash: answer.toLowerCase().trim(),
        setupAt: new Date().toISOString()
    };
    ls_set(KEYS.securitySetup, setup);
}
function verifySecurityAnswer(answer) {
    const setup = getSecuritySetup();
    if (!setup) return false;
    return setup.answerHash === answer.toLowerCase().trim();
}
function resetAdminPinWithSecurity(newPin, answer) {
    if (!verifySecurityAnswer(answer)) return false;
    // savePin is in storage.ts — we import it at call-site to avoid circular deps
    return true; // caller must call savePin(newPin) after this returns true
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/app/admin/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>AdminPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$qrcode$2f$lib$2f$browser$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/qrcode/lib/browser.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/storage.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/auth.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
;
// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_FLOW = [
    'awaiting_waiter',
    'pending',
    'preparing',
    'prepared',
    'served',
    'completed'
];
const CATEGORIES = [
    'Biryani',
    'Starters',
    'Mains',
    'Breads',
    'Desserts',
    'Drinks'
];
const BADGE_LABEL = {
    bestseller: '⭐ Bestseller',
    popular: '🔥 Popular',
    chef: "👨‍🍳 Chef's Special",
    famous: '🏆 Famous',
    new: '✨ New'
};
const STATUS_COLOR = {
    awaiting_waiter: '#f97316',
    pending: '#f59e0b',
    preparing: '#3b82f6',
    prepared: '#8b5cf6',
    served: '#06b6d4',
    completed: '#16a34a',
    cancelled: '#ef4444'
};
// ─── Style helpers ────────────────────────────────────────────────────────────
const card = (color = '#E65C00')=>({
        background: 'white',
        borderRadius: 12,
        padding: '1.4rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        marginBottom: '1.5rem',
        borderLeft: `4px solid ${color}`
    });
const tabB = (active)=>({
        padding: '0.42rem 1rem',
        border: `2px solid ${active ? '#E65C00' : '#ddd'}`,
        borderRadius: 20,
        background: active ? '#E65C00' : 'white',
        color: active ? 'white' : '#666',
        fontWeight: 600,
        cursor: 'pointer',
        fontSize: '0.8rem',
        fontFamily: 'Poppins,sans-serif'
    });
const inp = {
    width: '100%',
    padding: '0.6rem 0.75rem',
    border: '2px solid #e5e7eb',
    borderRadius: 8,
    fontFamily: 'Poppins,sans-serif',
    fontSize: '0.88rem',
    outline: 'none'
};
const btn = (bg = '#E65C00', c = 'white')=>({
        background: bg,
        color: c,
        border: 'none',
        padding: '0.55rem 1.1rem',
        borderRadius: 8,
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: 'Poppins,sans-serif',
        fontSize: '0.84rem'
    });
const emptyItem = ()=>({
        category: 'Biryani',
        name: '',
        desc: '',
        price: 0,
        img: '',
        badge: '',
        available: true
    });
function AdminPage() {
    _s();
    const [orders, setOrders] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [tables, setTables] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [menu, setMenu] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [clock, setClock] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        date: '',
        time: ''
    });
    const [qrDataUrls, setQrDataUrls] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({});
    // ── Auth ──
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const [authSession, setAuthSession] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [authChecked, setAuthChecked] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [section, setSection] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('overview');
    const [eodReport, setEodReport] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [fraudList, setFraudList] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    // ── Tabs / filters ──
    const [salesTab, setSalesTab] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('today');
    const [orderFilter, setOrderFilter] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('all');
    const [menuFilter, setMenuFilter] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('All');
    // ── Modals ──
    const [selOrder, setSelOrder] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [menuModal, setMenuModal] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        open: false,
        item: emptyItem(),
        isEdit: false
    });
    const [cancelModal, setCancelModal] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        open: false,
        orderId: ''
    });
    const [discountModal, setDiscountModal] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        open: false,
        orderId: ''
    });
    // ── Form values ──
    const [cancelReason, setCancelReason] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [discAmt, setDiscAmt] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [discNote, setDiscNote] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [pinInput, setPinInput] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [pinMsg, setPinMsg] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [showPinMgr, setShowPinMgr] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [newPin, setNewPin] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [newPinMsg, setNewPinMsg] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    // ── Staff management state ──
    const [staffAccounts, setStaffAccounts] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [staffForm, setStaffForm] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        name: '',
        username: '',
        pin: ''
    });
    const [staffMsg, setStaffMsg] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [kitchenPin, setKitchenPin] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [managerPin, setManagerPin] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [kitchenPinMsg, setKitchenPinMsg] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [managerPinMsg, setManagerPinMsg] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [editPinId, setEditPinId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [editPinVal, setEditPinVal] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    // ── Admin PIN change state ──
    const [adminNewPin, setAdminNewPin] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [adminNewPin2, setAdminNewPin2] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [adminPinOld, setAdminPinOld] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [adminPinMsg, setAdminPinMsg] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    // ── Security question state ──
    const [secQuestion, setSecQuestion] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [secAnswer, setSecAnswer] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [secAnswerConf, setSecAnswerConf] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [secMsg, setSecMsg] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [secSetup, setSecSetup] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    // ── Data refresh ──
    const refresh = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "AdminPage.useCallback[refresh]": ()=>{
            setOrders((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getOrders"])());
            setTables((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getTables"])());
            setMenu((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getMenu"])());
            setStaffAccounts((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getStaffAccounts"])());
            setKitchenPin((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getKitchenPin"])());
            setManagerPin((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getManagerPin"])());
            setEodReport((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getEndOfDayReport"])());
            setFraudList((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getFraudAlerts"])());
            setSecSetup((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getSecuritySetup"])());
        }
    }["AdminPage.useCallback[refresh]"], []);
    // ── Auth check ──
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AdminPage.useEffect": ()=>{
            const s = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getSession"])('admin');
            if (!s) {
                router.replace('/admin/login');
                return;
            }
            setAuthSession(s);
            setAuthChecked(true);
        }
    }["AdminPage.useEffect"], [
        router
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AdminPage.useEffect": ()=>{
            if (!authChecked) return;
            refresh();
            const t1 = setInterval(refresh, 5000);
            const t2 = setInterval({
                "AdminPage.useEffect.t2": ()=>{
                    const n = new Date();
                    setClock({
                        date: n.toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                        }),
                        time: n.toLocaleTimeString()
                    });
                }
            }["AdminPage.useEffect.t2"], 1000);
            return ({
                "AdminPage.useEffect": ()=>{
                    clearInterval(t1);
                    clearInterval(t2);
                }
            })["AdminPage.useEffect"];
        }
    }["AdminPage.useEffect"], [
        refresh,
        authChecked
    ]);
    // ── QR code generation (runs when entering QR section) ──
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AdminPage.useEffect": ()=>{
            if (section !== 'qr' || !authChecked || tables.length === 0) return;
            const origin = ("TURBOPACK compile-time truthy", 1) ? window.location.origin : "TURBOPACK unreachable";
            async function generateQRs() {
                const urls = {};
                for (const t of tables){
                    try {
                        urls[t.id] = await __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$qrcode$2f$lib$2f$browser$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].toDataURL(`${origin}/table?table=${t.id}`, {
                            width: 220,
                            margin: 2,
                            color: {
                                dark: '#1A0800',
                                light: '#FFFDF9'
                            }
                        });
                    } catch  {}
                }
                setQrDataUrls(urls);
            }
            generateQRs();
        }
    }["AdminPage.useEffect"], [
        section,
        tables,
        authChecked
    ]);
    function adminLogout() {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clearSession"])('admin');
        router.replace('/admin/login');
    }
    // ─── Today stats ──────────────────────────────────────────────────────────
    const todayStr = new Date().toDateString();
    const todayOrders = orders.filter((o)=>new Date(o.timestamp).toDateString() === todayStr && o.status !== 'cancelled');
    const todayRevenue = todayOrders.reduce((s, o)=>s + (o.total || 0), 0);
    const todayDiscount = todayOrders.reduce((s, o)=>s + (o.discount || 0), 0);
    const todayCancel = orders.filter((o)=>o.cancelledAt && new Date(o.cancelledAt).toDateString() === todayStr);
    const activeTables = tables.filter((t)=>t.status === 'occupied').length;
    const pendingCount = orders.filter((o)=>o.status === 'pending').length;
    const awaitingCount = orders.filter((o)=>o.status === 'awaiting_waiter').length;
    // ─── Order actions ────────────────────────────────────────────────────────
    function advance(id) {
        const o = orders.find((x)=>x.id === id);
        if (!o) return;
        const curIdx = STATUS_FLOW.indexOf(o.status);
        // Guard: unknown status or already at the final step
        if (curIdx === -1 || curIdx >= STATUS_FLOW.length - 1) return;
        const next = STATUS_FLOW[curIdx + 1];
        // Admin always uses force=true — full control over the order lifecycle
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["updateOrderStatus"])(id, next, 'Admin', true);
        refresh();
    }
    function doCancel() {
        if (!cancelReason.trim()) {
            alert('Please enter a reason');
            return;
        }
        const ok = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cancelOrder"])(cancelModal.orderId, cancelReason, 'Admin');
        if (!ok) {
            alert('This order can no longer be cancelled. It may already be prepared or completed.');
            setCancelModal({
                open: false,
                orderId: ''
            });
            setCancelReason('');
            return;
        }
        setCancelModal({
            open: false,
            orderId: ''
        });
        setCancelReason('');
        refresh();
        if (selOrder?.id === cancelModal.orderId) setSelOrder(null);
    }
    function doDiscount() {
        const amt = parseInt(discAmt);
        if (!amt || amt <= 0) {
            alert('Enter a valid amount');
            return;
        }
        // Validate discount does not exceed the order total
        const targetOrder = orders.find((o)=>o.id === discountModal.orderId);
        if (targetOrder) {
            const maxDiscount = targetOrder.subtotal || targetOrder.total;
            if (amt > maxDiscount) {
                alert(`Discount (₹${amt}) cannot exceed the order subtotal (₹${maxDiscount}).`);
                return;
            }
        }
        if (pinInput !== (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getPin"])()) {
            setPinMsg('❌ Wrong PIN');
            return;
        }
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["applyDiscount"])(discountModal.orderId, amt, discNote || 'Owner discount', 'Admin');
        setDiscountModal({
            open: false,
            orderId: ''
        });
        setDiscAmt('');
        setDiscNote('');
        setPinInput('');
        setPinMsg('');
        refresh();
    }
    // ─── Menu CRUD ────────────────────────────────────────────────────────────
    function saveItem() {
        const it = menuModal.item;
        if (!it.name?.trim()) {
            alert('Item name required');
            return;
        }
        if (!it.price || it.price <= 0) {
            alert('Enter valid price');
            return;
        }
        if (menuModal.isEdit) {
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["saveMenu"])(menu.map((m)=>m.id === it.id ? {
                    ...m,
                    ...it
                } : m));
        } else {
            const nid = menu.length ? Math.max(...menu.map((m)=>m.id)) + 1 : 1;
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["saveMenu"])([
                ...menu,
                {
                    id: nid,
                    category: it.category || 'Biryani',
                    name: it.name || '',
                    desc: it.desc || '',
                    price: it.price || 0,
                    img: it.img || '',
                    badge: it.badge || '',
                    available: true
                }
            ]);
        }
        setMenuModal({
            open: false,
            item: emptyItem(),
            isEdit: false
        });
        refresh();
    }
    // ─── Sales data ───────────────────────────────────────────────────────────
    const periodOrders = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getOrdersInPeriod"])(salesTab);
    const pTotal = periodOrders.reduce((s, o)=>s + (o.total || 0), 0);
    const pGross = periodOrders.reduce((s, o)=>s + (o.subtotal || o.total || 0), 0);
    const pDisc = periodOrders.reduce((s, o)=>s + (o.discount || 0), 0);
    const pCount = periodOrders.length;
    const pAvg = pCount > 0 ? Math.round(pTotal / pCount) : 0;
    // Payment breakdown
    const payMap = {};
    periodOrders.forEach((o)=>{
        const k = o.payment || 'other';
        if (!payMap[k]) payMap[k] = {
            count: 0,
            total: 0
        };
        payMap[k].count++;
        payMap[k].total += o.total || 0;
    });
    // Top items
    const itemMap = {};
    periodOrders.forEach((o)=>(o.items || []).forEach((it)=>{
            if (!itemMap[it.name]) itemMap[it.name] = {
                qty: 0,
                revenue: 0
            };
            itemMap[it.name].qty += it.qty || 1;
            itemMap[it.name].revenue += it.subtotal || it.price * (it.qty || 1);
        }));
    const topItems = Object.entries(itemMap).sort((a, b)=>b[1].qty - a[1].qty).slice(0, 10);
    // Breakdown rows
    const breakdownRows = (()=>{
        const now = new Date();
        if (salesTab === 'today') {
            const hrs = {};
            for(let h = 10; h <= 23; h++)hrs[h] = {
                o: 0,
                n: 0,
                d: 0
            };
            periodOrders.forEach((o)=>{
                const h = new Date(o.timestamp).getHours();
                if (hrs[h]) {
                    hrs[h].o++;
                    hrs[h].n += o.total || 0;
                    hrs[h].d += o.discount || 0;
                }
            });
            return Object.entries(hrs).filter(([, v])=>v.o > 0).map(([h, v])=>({
                    label: `${parseInt(h) > 12 ? parseInt(h) - 12 : h}:00${parseInt(h) >= 12 ? ' PM' : ' AM'}`,
                    orders: v.o,
                    net: v.n,
                    disc: v.d
                }));
        }
        if (salesTab === 'week') {
            const days = [
                'Sun',
                'Mon',
                'Tue',
                'Wed',
                'Thu',
                'Fri',
                'Sat'
            ];
            const map = {};
            for(let i = 0; i < 7; i++){
                const d = new Date(now);
                d.setDate(now.getDate() - now.getDay() + i);
                map[d.toDateString()] = {
                    o: 0,
                    n: 0,
                    d: 0
                };
            }
            periodOrders.forEach((o)=>{
                const k = new Date(o.timestamp).toDateString();
                if (map[k]) {
                    map[k].o++;
                    map[k].n += o.total || 0;
                    map[k].d += o.discount || 0;
                }
            });
            return Object.entries(map).map(([k, v])=>({
                    label: `${days[new Date(k).getDay()]} ${new Date(k).getDate()}`,
                    orders: v.o,
                    net: v.n,
                    disc: v.d
                }));
        }
        if (salesTab === 'month') {
            const map = {};
            periodOrders.forEach((o)=>{
                const d = new Date(o.timestamp);
                const k = `Week ${Math.ceil(d.getDate() / 7)}`;
                if (!map[k]) map[k] = {
                    o: 0,
                    n: 0,
                    d: 0
                };
                map[k].o++;
                map[k].n += o.total || 0;
                map[k].d += o.discount || 0;
            });
            return Object.entries(map).map(([k, v])=>({
                    label: k,
                    orders: v.o,
                    net: v.n,
                    disc: v.d
                }));
        }
        const map = {};
        periodOrders.forEach((o)=>{
            const d = new Date(o.timestamp);
            const k = d.toLocaleDateString('en-IN', {
                month: 'short',
                year: 'numeric'
            });
            if (!map[k]) map[k] = {
                o: 0,
                n: 0,
                d: 0
            };
            map[k].o++;
            map[k].n += o.total || 0;
            map[k].d += o.discount || 0;
        });
        return Object.entries(map).map(([k, v])=>({
                label: k,
                orders: v.o,
                net: v.n,
                disc: v.d
            }));
    })();
    // ─── Fraud data ───────────────────────────────────────────────────────────
    const discountOrders = orders.filter((o)=>(o.discount || 0) > 0).sort((a, b)=>new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const cancelledOrders = orders.filter((o)=>o.status === 'cancelled').sort((a, b)=>new Date(b.cancelledAt || b.timestamp).getTime() - new Date(a.cancelledAt || a.timestamp).getTime());
    const cancelRate = orders.length > 0 ? Math.round(cancelledOrders.length / orders.length * 100) : 0;
    const highDiscOrders = discountOrders.filter((o)=>(o.discount || 0) / (o.subtotal || o.total || 1) > 0.3);
    const todayDiscTotal = orders.filter((o)=>new Date(o.timestamp).toDateString() === todayStr).reduce((s, o)=>s + (o.discount || 0), 0);
    const alerts = [];
    if (cancelRate > 20) alerts.push(`⚠️ High cancellation rate: ${cancelRate}% of all orders cancelled`);
    if (highDiscOrders.length > 0) alerts.push(`⚠️ ${highDiscOrders.length} order(s) had discount >30% of bill — review now`);
    if (todayDiscTotal > 2000) alerts.push(`⚠️ Today's total discounts: ₹${todayDiscTotal} — above normal threshold`);
    // ─── Filtered orders for table ────────────────────────────────────────────
    const filteredOrders = (orderFilter === 'all' ? orders : orders.filter((o)=>o.status === orderFilter)).slice(-60).reverse();
    const menuItems = menuFilter === 'All' ? menu : menu.filter((m)=>m.category === menuFilter);
    // ─── Nav button ───────────────────────────────────────────────────────────
    const NavBtn = ({ id, label })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
            onClick: ()=>setSection(id),
            style: {
                padding: '0.55rem 1.25rem',
                border: 'none',
                background: section === id ? '#E65C00' : 'transparent',
                color: section === id ? 'white' : '#bbb',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'Poppins,sans-serif',
                fontSize: '0.83rem',
                borderRadius: 6,
                transition: 'all .2s',
                whiteSpace: 'nowrap'
            },
            children: label
        }, void 0, false, {
            fileName: "[project]/app/admin/page.tsx",
            lineNumber: 283,
            columnNumber: 5
        }, this);
    // ── Admin PIN change ─────────────────────────────────────────────────────
    function changeAdminPin() {
        setAdminPinMsg('');
        if (!adminPinOld) {
            setAdminPinMsg('❌ Enter your current PIN');
            return;
        }
        if (adminPinOld !== (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getPin"])()) {
            setAdminPinMsg('❌ Current PIN is incorrect');
            return;
        }
        if (adminNewPin.length < 4) {
            setAdminPinMsg('❌ New PIN must be at least 4 digits');
            return;
        }
        if (adminNewPin !== adminNewPin2) {
            setAdminPinMsg('❌ New PINs do not match');
            return;
        }
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["savePin"])(adminNewPin);
        setAdminPinMsg('✅ Admin PIN updated successfully!');
        setAdminPinOld('');
        setAdminNewPin('');
        setAdminNewPin2('');
        setTimeout(()=>setAdminPinMsg(''), 4000);
    }
    // ── Security question setup ───────────────────────────────────────────────
    function saveSecurityQuestion() {
        setSecMsg('');
        if (!secQuestion) {
            setSecMsg('❌ Select a security question');
            return;
        }
        if (!secAnswer.trim()) {
            setSecMsg('❌ Enter your answer');
            return;
        }
        if (secAnswer.toLowerCase().trim() !== secAnswerConf.toLowerCase().trim()) {
            setSecMsg('❌ Answers do not match');
            return;
        }
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["saveSecuritySetup"])(secQuestion, secAnswer);
        setSecMsg('✅ Security question saved! You can now recover your PIN if forgotten.');
        setSecQuestion('');
        setSecAnswer('');
        setSecAnswerConf('');
        refresh();
        setTimeout(()=>setSecMsg(''), 5000);
    }
    // ── Staff management actions ─────────────────────────────────────────────
    function addStaffAccount() {
        if (!staffForm.name.trim() || !staffForm.username.trim() || !staffForm.pin.trim()) {
            setStaffMsg('❌ All fields required');
            return;
        }
        const result = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createStaffAccount"])(staffForm.name, staffForm.username, staffForm.pin);
        if ('error' in result) {
            setStaffMsg(`❌ ${result.error}`);
            return;
        }
        setStaffMsg(`✅ Account created for ${result.name}`);
        setStaffForm({
            name: '',
            username: '',
            pin: ''
        });
        refresh();
    }
    function saveKitchenPinFn() {
        if (kitchenPin.length < 4) {
            setKitchenPinMsg('❌ PIN must be 4+ digits');
            return;
        }
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["saveKitchenPin"])(kitchenPin);
        setKitchenPinMsg('✅ Kitchen PIN updated');
        setTimeout(()=>setKitchenPinMsg(''), 3000);
    }
    function saveManagerPinFn() {
        if (managerPin.length < 4) {
            setManagerPinMsg('❌ PIN must be 4+ digits');
            return;
        }
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["saveManagerPin"])(managerPin);
        setManagerPinMsg('✅ Manager PIN updated');
        setTimeout(()=>setManagerPinMsg(''), 3000);
    }
    // ─────────────────────────────── RENDER ────────────────────────────────────
    if (!authChecked) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: {
                minHeight: '100vh',
                background: 'linear-gradient(135deg,#faf8f3,#f5f0e8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            },
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    textAlign: 'center',
                    color: '#888'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            fontSize: '2rem',
                            marginBottom: '0.5rem'
                        },
                        children: "📊"
                    }, void 0, false, {
                        fileName: "[project]/app/admin/page.tsx",
                        lineNumber: 345,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: "Loading Admin Dashboard…"
                    }, void 0, false, {
                        fileName: "[project]/app/admin/page.tsx",
                        lineNumber: 346,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/admin/page.tsx",
                lineNumber: 344,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/app/admin/page.tsx",
            lineNumber: 343,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        style: {
            minHeight: '100vh',
            background: 'linear-gradient(135deg,#faf8f3,#f5f0e8)',
            fontFamily: 'Poppins,sans-serif'
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    background: 'linear-gradient(135deg,#1A0800,#2D0F00)',
                    color: 'white',
                    padding: '0.9rem 1.75rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    position: 'sticky',
                    top: 0,
                    zIndex: 200,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.3)'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                style: {
                                    fontSize: '1.5rem'
                                },
                                children: "📊"
                            }, void 0, false, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 358,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            fontFamily: "'Playfair Display',serif",
                                            fontSize: '1.15rem',
                                            fontWeight: 900
                                        },
                                        children: "Admin Dashboard"
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 360,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            fontSize: '0.7rem',
                                            color: '#F9A826'
                                        },
                                        children: "Foodie Lover — Owner Control Panel"
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 361,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 359,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/admin/page.tsx",
                        lineNumber: 357,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem'
                        },
                        children: [
                            alerts.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    background: '#ef4444',
                                    color: 'white',
                                    padding: '0.25rem 0.75rem',
                                    borderRadius: 20,
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                },
                                onClick: ()=>setSection('fraud'),
                                children: [
                                    "🚨 ",
                                    alerts.length,
                                    " Alert",
                                    alerts.length > 1 ? 's' : ''
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 365,
                                columnNumber: 31
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>setSection('staff'),
                                style: {
                                    ...btn('#374151'),
                                    padding: '0.3rem 0.7rem',
                                    fontSize: '0.75rem'
                                },
                                children: "🔐 PIN & Staff"
                            }, void 0, false, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 366,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: adminLogout,
                                style: {
                                    ...btn('#7f1d1d'),
                                    padding: '0.3rem 0.7rem',
                                    fontSize: '0.75rem'
                                },
                                children: "🚪 Logout"
                            }, void 0, false, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 367,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    textAlign: 'right'
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            fontWeight: 700,
                                            fontSize: '0.85rem'
                                        },
                                        children: clock.date
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 369,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            fontSize: '0.78rem',
                                            color: '#F9A826'
                                        },
                                        children: clock.time
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 370,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 368,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/admin/page.tsx",
                        lineNumber: 364,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/admin/page.tsx",
                lineNumber: 356,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    background: '#1A0800',
                    display: 'flex',
                    gap: '0.2rem',
                    padding: '0.35rem 1.5rem',
                    overflowX: 'auto'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(NavBtn, {
                        id: "overview",
                        label: "📋 Overview"
                    }, void 0, false, {
                        fileName: "[project]/app/admin/page.tsx",
                        lineNumber: 377,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(NavBtn, {
                        id: "live",
                        label: `🔴 Live ${fraudList.length > 0 ? `(${fraudList.length}⚠)` : ''}`
                    }, void 0, false, {
                        fileName: "[project]/app/admin/page.tsx",
                        lineNumber: 378,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(NavBtn, {
                        id: "orders",
                        label: "🧾 Orders"
                    }, void 0, false, {
                        fileName: "[project]/app/admin/page.tsx",
                        lineNumber: 379,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(NavBtn, {
                        id: "sales",
                        label: "📊 Sales Report"
                    }, void 0, false, {
                        fileName: "[project]/app/admin/page.tsx",
                        lineNumber: 380,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(NavBtn, {
                        id: "dayclose",
                        label: "📅 Day Close"
                    }, void 0, false, {
                        fileName: "[project]/app/admin/page.tsx",
                        lineNumber: 381,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(NavBtn, {
                        id: "menu",
                        label: "🍽️ Menu"
                    }, void 0, false, {
                        fileName: "[project]/app/admin/page.tsx",
                        lineNumber: 382,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(NavBtn, {
                        id: "qr",
                        label: "🔲 QR Codes"
                    }, void 0, false, {
                        fileName: "[project]/app/admin/page.tsx",
                        lineNumber: 383,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(NavBtn, {
                        id: "fraud",
                        label: "🔍 Transparency"
                    }, void 0, false, {
                        fileName: "[project]/app/admin/page.tsx",
                        lineNumber: 384,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(NavBtn, {
                        id: "staff",
                        label: "👥 Staff"
                    }, void 0, false, {
                        fileName: "[project]/app/admin/page.tsx",
                        lineNumber: 385,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/admin/page.tsx",
                lineNumber: 376,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    maxWidth: '1400px',
                    margin: '0 auto',
                    padding: '1.5rem'
                },
                children: [
                    section === 'overview' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill,minmax(165px,1fr))',
                                    gap: '1rem',
                                    marginBottom: '1.5rem'
                                },
                                children: [
                                    {
                                        icon: '📋',
                                        val: todayOrders.length,
                                        label: "Today's Orders",
                                        color: '#E65C00'
                                    },
                                    {
                                        icon: '💰',
                                        val: `₹${todayRevenue}`,
                                        label: 'Net Revenue',
                                        color: '#E65C00'
                                    },
                                    {
                                        icon: '🏷️',
                                        val: `₹${todayDiscount}`,
                                        label: 'Discounts Given',
                                        color: '#16a34a'
                                    },
                                    {
                                        icon: '❌',
                                        val: todayCancel.length,
                                        label: 'Cancelled Today',
                                        color: '#ef4444'
                                    },
                                    {
                                        icon: '🪑',
                                        val: activeTables,
                                        label: 'Active Tables',
                                        color: '#3b82f6'
                                    },
                                    {
                                        icon: '⏳',
                                        val: pendingCount,
                                        label: 'Pending (Kitchen)',
                                        color: '#f59e0b'
                                    },
                                    {
                                        icon: '🔔',
                                        val: awaitingCount,
                                        label: 'Awaiting Waiter',
                                        color: '#f97316'
                                    }
                                ].map((s)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            background: 'white',
                                            padding: '1.1rem',
                                            borderRadius: 12,
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                            borderLeft: `4px solid ${s.color}`
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    fontSize: '1.5rem',
                                                    marginBottom: '0.25rem'
                                                },
                                                children: s.icon
                                            }, void 0, false, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 403,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    fontSize: '1.4rem',
                                                    fontWeight: 900,
                                                    color: s.color
                                                },
                                                children: s.val
                                            }, void 0, false, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 404,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    color: '#888',
                                                    fontSize: '0.76rem'
                                                },
                                                children: s.label
                                            }, void 0, false, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 405,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, s.label, true, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 402,
                                        columnNumber: 15
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 392,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: card(),
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                        style: {
                                            fontFamily: "'Playfair Display',serif",
                                            fontSize: '1.05rem',
                                            fontWeight: 700,
                                            marginBottom: '0.9rem',
                                            color: '#1A0800'
                                        },
                                        children: "🪑 Table Overview"
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 412,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fill,minmax(75px,1fr))',
                                            gap: '0.5rem'
                                        },
                                        children: tables.map((t)=>{
                                            const color = t.status === 'available' ? '#10b981' : t.status === 'occupied' ? '#f97316' : '#ef4444';
                                            const bg = t.status === 'available' ? '#d1fae5' : t.status === 'occupied' ? '#fed7aa' : '#fca5a5';
                                            const sessionMins = t.sessionStart ? Math.floor((Date.now() - new Date(t.sessionStart).getTime()) / 60000) : null;
                                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    background: bg,
                                                    border: `2px solid ${color}`,
                                                    borderRadius: 8,
                                                    padding: '0.55rem',
                                                    textAlign: 'center'
                                                },
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        style: {
                                                            fontWeight: 800,
                                                            fontSize: '0.88rem',
                                                            color: '#1A0800'
                                                        },
                                                        children: [
                                                            "T",
                                                            t.id
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 420,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        style: {
                                                            fontSize: '0.58rem',
                                                            color: '#555',
                                                            fontWeight: 600,
                                                            textTransform: 'uppercase'
                                                        },
                                                        children: t.status
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 421,
                                                        columnNumber: 21
                                                    }, this),
                                                    sessionMins !== null && t.status === 'occupied' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        style: {
                                                            fontSize: '0.56rem',
                                                            color: '#E65C00',
                                                            fontWeight: 700
                                                        },
                                                        children: [
                                                            sessionMins,
                                                            "m"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 422,
                                                        columnNumber: 65
                                                    }, this)
                                                ]
                                            }, t.id, true, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 419,
                                                columnNumber: 19
                                            }, this);
                                        })
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 413,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 411,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: card(),
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                        style: {
                                            fontFamily: "'Playfair Display',serif",
                                            fontSize: '1.05rem',
                                            fontWeight: 700,
                                            marginBottom: '1rem',
                                            color: '#1A0800'
                                        },
                                        children: "🔗 Quick Access"
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 431,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            marginBottom: '0.75rem'
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    fontSize: '0.7rem',
                                                    fontWeight: 700,
                                                    color: '#888',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.05em',
                                                    marginBottom: '0.4rem'
                                                },
                                                children: "Staff Portals"
                                            }, void 0, false, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 433,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    display: 'flex',
                                                    gap: '0.5rem',
                                                    flexWrap: 'wrap'
                                                },
                                                children: [
                                                    {
                                                        href: '/kitchen',
                                                        label: '🔥 Kitchen',
                                                        color: '#3b82f6'
                                                    },
                                                    {
                                                        href: '/waiter',
                                                        label: '🧑‍🍳 Waiter',
                                                        color: '#8b5cf6'
                                                    },
                                                    {
                                                        href: '/manager',
                                                        label: '💳 Manager',
                                                        color: '#16a34a'
                                                    }
                                                ].map((l)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                        href: l.href,
                                                        target: "_blank",
                                                        rel: "noreferrer",
                                                        style: {
                                                            padding: '0.45rem 1rem',
                                                            background: l.color,
                                                            color: 'white',
                                                            borderRadius: 8,
                                                            fontWeight: 700,
                                                            textDecoration: 'none',
                                                            fontSize: '0.82rem'
                                                        },
                                                        children: l.label
                                                    }, l.href, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 440,
                                                        columnNumber: 19
                                                    }, this))
                                            }, void 0, false, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 434,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 432,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    fontSize: '0.7rem',
                                                    fontWeight: 700,
                                                    color: '#888',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.05em',
                                                    marginBottom: '0.4rem'
                                                },
                                                children: "Customer Pages"
                                            }, void 0, false, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 445,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    display: 'flex',
                                                    gap: '0.5rem',
                                                    flexWrap: 'wrap'
                                                },
                                                children: [
                                                    [
                                                        {
                                                            href: '/online',
                                                            label: '📦 Online Order',
                                                            color: '#2563eb'
                                                        },
                                                        {
                                                            href: '/table?table=1',
                                                            label: '📱 Table Demo (T1)',
                                                            color: '#f59e0b'
                                                        }
                                                    ].map((l)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                            href: l.href,
                                                            target: "_blank",
                                                            rel: "noreferrer",
                                                            style: {
                                                                padding: '0.45rem 1rem',
                                                                background: l.color,
                                                                color: 'white',
                                                                borderRadius: 8,
                                                                fontWeight: 700,
                                                                textDecoration: 'none',
                                                                fontSize: '0.82rem'
                                                            },
                                                            children: l.label
                                                        }, l.href, false, {
                                                            fileName: "[project]/app/admin/page.tsx",
                                                            lineNumber: 451,
                                                            columnNumber: 19
                                                        }, this)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        onClick: ()=>setSection('qr'),
                                                        style: {
                                                            ...btn('#1A0800'),
                                                            fontSize: '0.82rem',
                                                            padding: '0.45rem 1rem'
                                                        },
                                                        children: "🔲 Generate All QR Codes →"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 453,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 446,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 444,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 430,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true),
                    section === 'orders' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: card(),
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '1rem',
                                    flexWrap: 'wrap',
                                    gap: '0.5rem'
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                        style: {
                                            fontFamily: "'Playfair Display',serif",
                                            fontSize: '1.05rem',
                                            fontWeight: 700,
                                            color: '#1A0800',
                                            margin: 0
                                        },
                                        children: "🧾 All Orders"
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 463,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            display: 'flex',
                                            gap: '0.35rem',
                                            flexWrap: 'wrap'
                                        },
                                        children: [
                                            'all',
                                            'awaiting_waiter',
                                            'pending',
                                            'preparing',
                                            'prepared',
                                            'served',
                                            'completed',
                                            'cancelled'
                                        ].map((s)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                onClick: ()=>setOrderFilter(s),
                                                style: {
                                                    ...tabB(orderFilter === s),
                                                    padding: '0.28rem 0.7rem',
                                                    fontSize: '0.72rem',
                                                    textTransform: 'capitalize',
                                                    background: orderFilter === s && s === 'awaiting_waiter' ? '#f97316' : orderFilter === s ? '#E65C00' : 'white',
                                                    borderColor: s === 'awaiting_waiter' && orderFilter !== s ? '#fed7aa' : ''
                                                },
                                                children: s === 'awaiting_waiter' ? `⏳ Awaiting${awaitingCount > 0 ? ` (${awaitingCount})` : ''}` : s
                                            }, s, false, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 466,
                                                columnNumber: 19
                                            }, this))
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 464,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 462,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    overflowX: 'auto'
                                },
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                                    style: {
                                        width: '100%',
                                        borderCollapse: 'collapse',
                                        fontSize: '0.81rem'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                style: {
                                                    background: '#FFF5EB'
                                                },
                                                children: [
                                                    'Order ID',
                                                    'Type',
                                                    'Location',
                                                    'Customer',
                                                    'Items',
                                                    'Subtotal',
                                                    'Disc.',
                                                    'Total',
                                                    'Payment',
                                                    'Status',
                                                    'Time',
                                                    'Actions'
                                                ].map((h)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        style: {
                                                            padding: '0.5rem 0.65rem',
                                                            textAlign: 'left',
                                                            fontWeight: 700,
                                                            fontSize: '0.7rem',
                                                            color: '#6B5246',
                                                            textTransform: 'uppercase',
                                                            whiteSpace: 'nowrap'
                                                        },
                                                        children: h
                                                    }, h, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 476,
                                                        columnNumber: 21
                                                    }, this))
                                            }, void 0, false, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 474,
                                                columnNumber: 24
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 474,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                            children: !filteredOrders.length ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                    colSpan: 12,
                                                    style: {
                                                        textAlign: 'center',
                                                        color: '#999',
                                                        padding: '2rem'
                                                    },
                                                    children: "No orders"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/admin/page.tsx",
                                                    lineNumber: 481,
                                                    columnNumber: 27
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 481,
                                                columnNumber: 23
                                            }, this) : filteredOrders.map((order)=>{
                                                const t = new Date(order.timestamp).toLocaleTimeString([], {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                });
                                                const curIdx = STATUS_FLOW.indexOf(order.status);
                                                const nxt = curIdx !== -1 && curIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[curIdx + 1] : undefined;
                                                const isc = order.status === 'cancelled';
                                                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                    style: {
                                                        borderBottom: '1px solid #f5f0e8',
                                                        opacity: isc ? 0.6 : 1
                                                    },
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            style: {
                                                                padding: '0.5rem 0.65rem'
                                                            },
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                onClick: ()=>setSelOrder(order),
                                                                style: {
                                                                    background: 'none',
                                                                    border: 'none',
                                                                    color: '#E65C00',
                                                                    textDecoration: 'underline',
                                                                    fontWeight: 700,
                                                                    cursor: 'pointer',
                                                                    fontFamily: 'Poppins,sans-serif',
                                                                    fontSize: '0.81rem'
                                                                },
                                                                children: order.orderNum ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    style: {
                                                                        fontWeight: 900,
                                                                        color: '#1A0800'
                                                                    },
                                                                    children: [
                                                                        "#",
                                                                        order.orderNum
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/admin/page.tsx",
                                                                    lineNumber: 491,
                                                                    columnNumber: 51
                                                                }, this) : order.id
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/admin/page.tsx",
                                                                lineNumber: 490,
                                                                columnNumber: 31
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/admin/page.tsx",
                                                            lineNumber: 489,
                                                            columnNumber: 29
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            style: {
                                                                padding: '0.5rem 0.65rem'
                                                            },
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                style: {
                                                                    fontSize: '0.7rem',
                                                                    fontWeight: 700,
                                                                    padding: '0.12rem 0.45rem',
                                                                    borderRadius: 10,
                                                                    background: order.type === 'dine-in' ? '#fff7ed' : '#f0fdf4',
                                                                    color: order.type === 'dine-in' ? '#ea580c' : '#16a34a'
                                                                },
                                                                children: order.type
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/admin/page.tsx",
                                                                lineNumber: 494,
                                                                columnNumber: 68
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/admin/page.tsx",
                                                            lineNumber: 494,
                                                            columnNumber: 29
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            style: {
                                                                padding: '0.5rem 0.65rem'
                                                            },
                                                            children: order.type === 'dine-in' ? `T${order.tableId}` : 'Pickup'
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/admin/page.tsx",
                                                            lineNumber: 495,
                                                            columnNumber: 29
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            style: {
                                                                padding: '0.5rem 0.65rem',
                                                                fontWeight: 600
                                                            },
                                                            children: order.customerName
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/admin/page.tsx",
                                                            lineNumber: 496,
                                                            columnNumber: 29
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            style: {
                                                                padding: '0.5rem 0.65rem',
                                                                textAlign: 'center'
                                                            },
                                                            children: order.items?.length || 0
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/admin/page.tsx",
                                                            lineNumber: 497,
                                                            columnNumber: 29
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            style: {
                                                                padding: '0.5rem 0.65rem'
                                                            },
                                                            children: [
                                                                "₹",
                                                                order.subtotal || order.total
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/admin/page.tsx",
                                                            lineNumber: 498,
                                                            columnNumber: 29
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            style: {
                                                                padding: '0.5rem 0.65rem',
                                                                color: '#16a34a',
                                                                fontWeight: 700
                                                            },
                                                            children: (order.discount || 0) > 0 ? `-₹${order.discount}` : '—'
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/admin/page.tsx",
                                                            lineNumber: 499,
                                                            columnNumber: 29
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            style: {
                                                                padding: '0.5rem 0.65rem',
                                                                fontWeight: 800
                                                            },
                                                            children: [
                                                                "₹",
                                                                order.total
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/admin/page.tsx",
                                                            lineNumber: 500,
                                                            columnNumber: 29
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            style: {
                                                                padding: '0.5rem 0.65rem',
                                                                color: '#888'
                                                            },
                                                            children: order.payment || 'N/A'
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/admin/page.tsx",
                                                            lineNumber: 501,
                                                            columnNumber: 29
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            style: {
                                                                padding: '0.5rem 0.65rem'
                                                            },
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                style: {
                                                                    fontSize: '0.7rem',
                                                                    fontWeight: 700,
                                                                    padding: '0.12rem 0.45rem',
                                                                    borderRadius: 10,
                                                                    background: (STATUS_COLOR[order.status] || '#888') + '22',
                                                                    color: STATUS_COLOR[order.status] || '#888',
                                                                    textTransform: 'capitalize'
                                                                },
                                                                children: order.status
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/admin/page.tsx",
                                                                lineNumber: 502,
                                                                columnNumber: 68
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/admin/page.tsx",
                                                            lineNumber: 502,
                                                            columnNumber: 29
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            style: {
                                                                padding: '0.5rem 0.65rem',
                                                                color: '#999',
                                                                whiteSpace: 'nowrap'
                                                            },
                                                            children: t
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/admin/page.tsx",
                                                            lineNumber: 503,
                                                            columnNumber: 29
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            style: {
                                                                padding: '0.5rem 0.65rem',
                                                                whiteSpace: 'nowrap',
                                                                display: 'flex',
                                                                gap: '0.25rem'
                                                            },
                                                            children: [
                                                                !isc && nxt && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                    onClick: ()=>advance(order.id),
                                                                    style: {
                                                                        ...btn('#f97316'),
                                                                        padding: '0.18rem 0.5rem',
                                                                        fontSize: '0.7rem'
                                                                    },
                                                                    children: [
                                                                        "▶",
                                                                        nxt
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/admin/page.tsx",
                                                                    lineNumber: 505,
                                                                    columnNumber: 43
                                                                }, this),
                                                                !isc && order.status !== 'completed' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                    onClick: ()=>{
                                                                        setCancelModal({
                                                                            open: true,
                                                                            orderId: order.id
                                                                        });
                                                                        setCancelReason('');
                                                                    },
                                                                    style: {
                                                                        ...btn('#ef4444'),
                                                                        padding: '0.18rem 0.45rem',
                                                                        fontSize: '0.7rem'
                                                                    },
                                                                    children: "✕"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/admin/page.tsx",
                                                                    lineNumber: 506,
                                                                    columnNumber: 66
                                                                }, this),
                                                                !isc && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                    onClick: ()=>{
                                                                        setDiscountModal({
                                                                            open: true,
                                                                            orderId: order.id
                                                                        });
                                                                        setDiscAmt('');
                                                                        setDiscNote('');
                                                                        setPinInput('');
                                                                        setPinMsg('');
                                                                    },
                                                                    style: {
                                                                        ...btn('#8b5cf6'),
                                                                        padding: '0.18rem 0.45rem',
                                                                        fontSize: '0.7rem'
                                                                    },
                                                                    children: "🏷"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/admin/page.tsx",
                                                                    lineNumber: 507,
                                                                    columnNumber: 38
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/admin/page.tsx",
                                                            lineNumber: 504,
                                                            columnNumber: 29
                                                        }, this)
                                                    ]
                                                }, order.id, true, {
                                                    fileName: "[project]/app/admin/page.tsx",
                                                    lineNumber: 488,
                                                    columnNumber: 27
                                                }, this);
                                            })
                                        }, void 0, false, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 479,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/admin/page.tsx",
                                    lineNumber: 473,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 472,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/admin/page.tsx",
                        lineNumber: 461,
                        columnNumber: 11
                    }, this),
                    section === 'sales' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '1rem',
                                    flexWrap: 'wrap',
                                    gap: '0.75rem'
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            display: 'flex',
                                            gap: '0.4rem',
                                            flexWrap: 'wrap'
                                        },
                                        children: [
                                            'today',
                                            'week',
                                            'month',
                                            'all'
                                        ].map((t)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                onClick: ()=>setSalesTab(t),
                                                style: tabB(salesTab === t),
                                                children: t === 'today' ? '📅 Today' : t === 'week' ? '📆 This Week' : t === 'month' ? '🗓️ This Month' : '📊 All Time'
                                            }, t, false, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 524,
                                                columnNumber: 17
                                            }, this))
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 522,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["exportOrdersCSV"],
                                        style: {
                                            ...btn('#16a34a'),
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.4rem'
                                        },
                                        children: "📁 Export CSV"
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 529,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 521,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))',
                                    gap: '0.7rem',
                                    marginBottom: '1.4rem'
                                },
                                children: [
                                    {
                                        val: pCount,
                                        label: 'Orders',
                                        color: '#3b82f6'
                                    },
                                    {
                                        val: `₹${pGross}`,
                                        label: 'Gross Rev.',
                                        color: '#E65C00'
                                    },
                                    {
                                        val: `₹${pDisc}`,
                                        label: 'Discounts',
                                        color: '#ef4444'
                                    },
                                    {
                                        val: `₹${pTotal}`,
                                        label: 'Net Revenue',
                                        color: '#16a34a'
                                    },
                                    {
                                        val: `₹${pAvg}`,
                                        label: 'Avg Order',
                                        color: '#8b5cf6'
                                    },
                                    {
                                        val: periodOrders.filter((o)=>o.type === 'dine-in').length,
                                        label: 'Dine-In',
                                        color: '#f97316'
                                    },
                                    {
                                        val: periodOrders.filter((o)=>o.type !== 'dine-in').length,
                                        label: 'Pickup',
                                        color: '#06b6d4'
                                    }
                                ].map((c)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            background: 'white',
                                            border: '1px solid #f0e4d7',
                                            borderRadius: 10,
                                            padding: '0.8rem',
                                            borderLeft: `4px solid ${c.color}`
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    fontSize: '1.2rem',
                                                    fontWeight: 900,
                                                    color: c.color
                                                },
                                                children: c.val
                                            }, void 0, false, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 536,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    fontSize: '0.7rem',
                                                    color: '#999'
                                                },
                                                children: c.label
                                            }, void 0, false, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 537,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, c.label, true, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 535,
                                        columnNumber: 15
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 533,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: card(),
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        style: {
                                            fontFamily: "'Playfair Display',serif",
                                            fontSize: '0.98rem',
                                            fontWeight: 700,
                                            marginBottom: '0.75rem',
                                            color: '#1A0800'
                                        },
                                        children: "💳 Payment Method Breakdown"
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 544,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            display: 'flex',
                                            gap: '0.7rem',
                                            flexWrap: 'wrap'
                                        },
                                        children: !Object.keys(payMap).length ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                color: '#999',
                                                fontSize: '0.85rem'
                                            },
                                            children: "No data for this period"
                                        }, void 0, false, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 547,
                                            columnNumber: 19
                                        }, this) : Object.entries(payMap).map(([method, data])=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    background: '#FFF5EB',
                                                    border: '1px solid #f0e4d7',
                                                    borderRadius: 8,
                                                    padding: '0.7rem 1rem',
                                                    minWidth: '130px'
                                                },
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        style: {
                                                            fontWeight: 800,
                                                            fontSize: '0.98rem',
                                                            color: '#E65C00'
                                                        },
                                                        children: [
                                                            "₹",
                                                            data.total
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 550,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        style: {
                                                            fontSize: '0.72rem',
                                                            color: '#888',
                                                            textTransform: 'capitalize'
                                                        },
                                                        children: [
                                                            method,
                                                            " (",
                                                            data.count,
                                                            " orders)"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 551,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, method, true, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 549,
                                                columnNumber: 19
                                            }, this))
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 545,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 543,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: card(),
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        style: {
                                            fontFamily: "'Playfair Display',serif",
                                            fontSize: '0.98rem',
                                            fontWeight: 700,
                                            marginBottom: '0.75rem',
                                            color: '#1A0800'
                                        },
                                        children: [
                                            salesTab === 'today' ? '⏰ Hour-by-Hour' : salesTab === 'week' ? '📅 Day-by-Day' : salesTab === 'month' ? '📆 Week-by-Week' : '🗓️ Month-by-Month',
                                            " Breakdown"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 560,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            overflowX: 'auto'
                                        },
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                                            style: {
                                                width: '100%',
                                                borderCollapse: 'collapse',
                                                fontSize: '0.83rem'
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                        style: {
                                                            background: 'linear-gradient(135deg,#E65C00,#F9A826)',
                                                            color: 'white'
                                                        },
                                                        children: [
                                                            'Period',
                                                            'Orders',
                                                            'Net Revenue',
                                                            'Discounts'
                                                        ].map((h)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                style: {
                                                                    padding: '0.55rem 0.8rem',
                                                                    textAlign: 'left',
                                                                    fontSize: '0.76rem',
                                                                    fontWeight: 700
                                                                },
                                                                children: h
                                                            }, h, false, {
                                                                fileName: "[project]/app/admin/page.tsx",
                                                                lineNumber: 566,
                                                                columnNumber: 73
                                                            }, this))
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 565,
                                                        columnNumber: 24
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/app/admin/page.tsx",
                                                    lineNumber: 565,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                                    children: !breakdownRows.length ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            colSpan: 4,
                                                            style: {
                                                                textAlign: 'center',
                                                                color: '#999',
                                                                padding: '1.5rem'
                                                            },
                                                            children: "No data"
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/admin/page.tsx",
                                                            lineNumber: 570,
                                                            columnNumber: 27
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 570,
                                                        columnNumber: 23
                                                    }, this) : breakdownRows.map((r, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                            style: {
                                                                borderBottom: '1px solid #f5f0e8',
                                                                background: i % 2 ? '#fffaf5' : 'white'
                                                            },
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    style: {
                                                                        padding: '0.5rem 0.8rem',
                                                                        fontWeight: 600
                                                                    },
                                                                    children: r.label
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/admin/page.tsx",
                                                                    lineNumber: 573,
                                                                    columnNumber: 27
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    style: {
                                                                        padding: '0.5rem 0.8rem'
                                                                    },
                                                                    children: r.orders
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/admin/page.tsx",
                                                                    lineNumber: 574,
                                                                    columnNumber: 27
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    style: {
                                                                        padding: '0.5rem 0.8rem',
                                                                        fontWeight: 700,
                                                                        color: '#16a34a'
                                                                    },
                                                                    children: [
                                                                        "₹",
                                                                        r.net
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/admin/page.tsx",
                                                                    lineNumber: 575,
                                                                    columnNumber: 27
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    style: {
                                                                        padding: '0.5rem 0.8rem',
                                                                        color: '#ef4444'
                                                                    },
                                                                    children: r.disc > 0 ? `-₹${r.disc}` : '—'
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/admin/page.tsx",
                                                                    lineNumber: 576,
                                                                    columnNumber: 27
                                                                }, this)
                                                            ]
                                                        }, i, true, {
                                                            fileName: "[project]/app/admin/page.tsx",
                                                            lineNumber: 572,
                                                            columnNumber: 25
                                                        }, this))
                                                }, void 0, false, {
                                                    fileName: "[project]/app/admin/page.tsx",
                                                    lineNumber: 568,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tfoot", {
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                        style: {
                                                            background: '#f5f0e8',
                                                            fontWeight: 800
                                                        },
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                style: {
                                                                    padding: '0.55rem 0.8rem',
                                                                    borderTop: '2px solid #E65C00'
                                                                },
                                                                children: "TOTAL"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/admin/page.tsx",
                                                                lineNumber: 582,
                                                                columnNumber: 19
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                style: {
                                                                    padding: '0.55rem 0.8rem',
                                                                    borderTop: '2px solid #E65C00'
                                                                },
                                                                children: pCount
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/admin/page.tsx",
                                                                lineNumber: 583,
                                                                columnNumber: 19
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                style: {
                                                                    padding: '0.55rem 0.8rem',
                                                                    borderTop: '2px solid #E65C00',
                                                                    color: '#16a34a'
                                                                },
                                                                children: [
                                                                    "₹",
                                                                    pTotal
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/admin/page.tsx",
                                                                lineNumber: 584,
                                                                columnNumber: 19
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                style: {
                                                                    padding: '0.55rem 0.8rem',
                                                                    borderTop: '2px solid #E65C00',
                                                                    color: '#ef4444'
                                                                },
                                                                children: pDisc > 0 ? `-₹${pDisc}` : '—'
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/admin/page.tsx",
                                                                lineNumber: 585,
                                                                columnNumber: 19
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 581,
                                                        columnNumber: 24
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/app/admin/page.tsx",
                                                    lineNumber: 581,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 564,
                                            columnNumber: 15
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 563,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 559,
                                columnNumber: 11
                            }, this),
                            topItems.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: card(),
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        style: {
                                            fontFamily: "'Playfair Display',serif",
                                            fontSize: '0.98rem',
                                            fontWeight: 700,
                                            marginBottom: '0.75rem',
                                            color: '#1A0800'
                                        },
                                        children: "🏆 Top Selling Items"
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 594,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fill,minmax(195px,1fr))',
                                            gap: '0.55rem'
                                        },
                                        children: topItems.map(([name, data], i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    background: '#fafafa',
                                                    border: '1px solid #f0f0f0',
                                                    borderRadius: 8,
                                                    padding: '0.65rem 0.85rem',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center'
                                                },
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                style: {
                                                                    fontSize: '0.65rem',
                                                                    color: '#f97316',
                                                                    fontWeight: 700
                                                                },
                                                                children: [
                                                                    "#",
                                                                    i + 1
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/admin/page.tsx",
                                                                lineNumber: 599,
                                                                columnNumber: 23
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                style: {
                                                                    fontWeight: 600,
                                                                    fontSize: '0.8rem',
                                                                    color: '#333'
                                                                },
                                                                children: name
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/admin/page.tsx",
                                                                lineNumber: 600,
                                                                columnNumber: 23
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                style: {
                                                                    fontSize: '0.68rem',
                                                                    color: '#999'
                                                                },
                                                                children: [
                                                                    "₹",
                                                                    data.revenue
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/admin/page.tsx",
                                                                lineNumber: 601,
                                                                columnNumber: 23
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 598,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        style: {
                                                            fontWeight: 900,
                                                            fontSize: '1.05rem',
                                                            color: '#E65C00',
                                                            textAlign: 'right'
                                                        },
                                                        children: [
                                                            data.qty,
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                style: {
                                                                    fontSize: '0.62rem',
                                                                    color: '#bbb',
                                                                    fontWeight: 400
                                                                },
                                                                children: "sold"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/admin/page.tsx",
                                                                lineNumber: 603,
                                                                columnNumber: 114
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 603,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, name, true, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 597,
                                                columnNumber: 19
                                            }, this))
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 595,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 593,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true),
                    section === 'menu' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '1rem',
                                    flexWrap: 'wrap',
                                    gap: '0.75rem'
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            display: 'flex',
                                            gap: '0.35rem',
                                            flexWrap: 'wrap'
                                        },
                                        children: [
                                            'All',
                                            ...CATEGORIES
                                        ].map((c)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                onClick: ()=>setMenuFilter(c),
                                                style: tabB(menuFilter === c),
                                                children: c
                                            }, c, false, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 616,
                                                columnNumber: 17
                                            }, this))
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 614,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            display: 'flex',
                                            gap: '0.5rem'
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                onClick: ()=>{
                                                    if (confirm('Reset all menu items to defaults?')) {
                                                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["saveMenu"])([
                                                            ...__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DEFAULT_MENU"]
                                                        ]);
                                                        refresh();
                                                    }
                                                },
                                                style: {
                                                    ...btn('#6b7280'),
                                                    fontSize: '0.78rem'
                                                },
                                                children: "↺ Reset"
                                            }, void 0, false, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 620,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                onClick: ()=>setMenuModal({
                                                        open: true,
                                                        item: emptyItem(),
                                                        isEdit: false
                                                    }),
                                                style: {
                                                    ...btn(),
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.35rem'
                                                },
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        style: {
                                                            fontSize: '1.1rem',
                                                            lineHeight: 1
                                                        },
                                                        children: "＋"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 621,
                                                        columnNumber: 161
                                                    }, this),
                                                    " Add Item"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 621,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 619,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 613,
                                columnNumber: 11
                            }, this),
                            !menuItems.length ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    textAlign: 'center',
                                    color: '#999',
                                    padding: '3rem',
                                    background: 'white',
                                    borderRadius: 12
                                },
                                children: "No items in this category"
                            }, void 0, false, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 626,
                                columnNumber: 15
                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill,minmax(255px,1fr))',
                                    gap: '1rem'
                                },
                                children: menuItems.map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            background: 'white',
                                            borderRadius: 12,
                                            overflow: 'hidden',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                            opacity: item.available === false ? 0.55 : 1,
                                            transition: 'opacity .2s'
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    position: 'relative',
                                                    height: '145px',
                                                    background: '#f5f0e8',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '2.5rem'
                                                },
                                                children: [
                                                    item.img && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                        src: item.img,
                                                        alt: item.name,
                                                        style: {
                                                            position: 'absolute',
                                                            inset: 0,
                                                            width: '100%',
                                                            height: '100%',
                                                            objectFit: 'cover'
                                                        },
                                                        onError: (e)=>{
                                                            e.target.style.display = 'none';
                                                        }
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 631,
                                                        columnNumber: 36
                                                    }, this),
                                                    !item.img && '🍽️',
                                                    item.badge && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        style: {
                                                            position: 'absolute',
                                                            top: 8,
                                                            left: 8,
                                                            background: '#E65C00',
                                                            color: 'white',
                                                            fontSize: '0.6rem',
                                                            padding: '0.18rem 0.45rem',
                                                            borderRadius: 8,
                                                            fontWeight: 700,
                                                            zIndex: 1
                                                        },
                                                        children: BADGE_LABEL[item.badge] || item.badge
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 633,
                                                        columnNumber: 38
                                                    }, this),
                                                    item.available === false && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        style: {
                                                            position: 'absolute',
                                                            inset: 0,
                                                            background: 'rgba(0,0,0,0.45)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            color: 'white',
                                                            fontWeight: 700,
                                                            fontSize: '0.82rem',
                                                            zIndex: 1
                                                        },
                                                        children: "UNAVAILABLE"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 634,
                                                        columnNumber: 50
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 630,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    padding: '0.85rem'
                                                },
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        style: {
                                                            fontSize: '0.62rem',
                                                            color: '#888',
                                                            fontWeight: 700,
                                                            textTransform: 'uppercase',
                                                            letterSpacing: '0.05em'
                                                        },
                                                        children: item.category
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 637,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        style: {
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'flex-start',
                                                            gap: '0.4rem',
                                                            margin: '0.2rem 0 0.25rem'
                                                        },
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                style: {
                                                                    fontWeight: 700,
                                                                    fontSize: '0.9rem',
                                                                    color: '#1A0800'
                                                                },
                                                                children: item.name
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/admin/page.tsx",
                                                                lineNumber: 639,
                                                                columnNumber: 25
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                style: {
                                                                    fontWeight: 900,
                                                                    color: '#E65C00',
                                                                    fontSize: '1rem',
                                                                    whiteSpace: 'nowrap'
                                                                },
                                                                children: [
                                                                    "₹",
                                                                    item.price
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/admin/page.tsx",
                                                                lineNumber: 640,
                                                                columnNumber: 25
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 638,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        style: {
                                                            fontSize: '0.73rem',
                                                            color: '#888',
                                                            marginBottom: '0.75rem',
                                                            lineHeight: '1.4'
                                                        },
                                                        children: item.desc
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 642,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        style: {
                                                            display: 'flex',
                                                            gap: '0.35rem'
                                                        },
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                onClick: ()=>setMenuModal({
                                                                        open: true,
                                                                        item: {
                                                                            ...item
                                                                        },
                                                                        isEdit: true
                                                                    }),
                                                                style: {
                                                                    ...btn('#3b82f6'),
                                                                    padding: '0.3rem 0.75rem',
                                                                    fontSize: '0.75rem',
                                                                    flex: 1
                                                                },
                                                                children: "✏️ Edit"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/admin/page.tsx",
                                                                lineNumber: 644,
                                                                columnNumber: 25
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                onClick: ()=>{
                                                                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["saveMenu"])(menu.map((m)=>m.id === item.id ? {
                                                                            ...m,
                                                                            available: !m.available
                                                                        } : m));
                                                                    refresh();
                                                                },
                                                                style: {
                                                                    ...btn(item.available === false ? '#16a34a' : '#6b7280'),
                                                                    padding: '0.3rem 0.65rem',
                                                                    fontSize: '0.75rem'
                                                                },
                                                                children: item.available === false ? '✅' : '⏸'
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/admin/page.tsx",
                                                                lineNumber: 645,
                                                                columnNumber: 25
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                onClick: ()=>{
                                                                    if (confirm(`Delete "${item.name}"?`)) {
                                                                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["saveMenu"])(menu.filter((m)=>m.id !== item.id));
                                                                        refresh();
                                                                    }
                                                                },
                                                                style: {
                                                                    ...btn('#ef4444'),
                                                                    padding: '0.3rem 0.6rem',
                                                                    fontSize: '0.75rem'
                                                                },
                                                                children: "🗑"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/admin/page.tsx",
                                                                lineNumber: 646,
                                                                columnNumber: 25
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 643,
                                                        columnNumber: 23
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 636,
                                                columnNumber: 21
                                            }, this)
                                        ]
                                    }, item.id, true, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 629,
                                        columnNumber: 19
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 627,
                                columnNumber: 15
                            }, this)
                        ]
                    }, void 0, true),
                    section === 'fraud' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                        children: [
                            fraudList.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    background: '#fef2f2',
                                    border: '2px solid #ef4444',
                                    borderRadius: 12,
                                    padding: '1.2rem',
                                    marginBottom: '1.4rem'
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        style: {
                                            color: '#ef4444',
                                            fontWeight: 700,
                                            marginBottom: '0.6rem',
                                            fontSize: '0.92rem'
                                        },
                                        children: "🚨 Today's Fraud Alerts"
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 660,
                                        columnNumber: 15
                                    }, this),
                                    fraudList.map((a, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                display: 'flex',
                                                gap: '0.5rem',
                                                padding: '0.3rem 0',
                                                borderBottom: '1px solid #fecaca',
                                                fontSize: '0.85rem'
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    style: {
                                                        fontWeight: 800,
                                                        color: a.severity === 'critical' ? '#dc2626' : '#f97316',
                                                        flexShrink: 0
                                                    },
                                                    children: a.severity === 'critical' ? '🚨' : '⚠️'
                                                }, void 0, false, {
                                                    fileName: "[project]/app/admin/page.tsx",
                                                    lineNumber: 663,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            style: {
                                                                fontWeight: 700,
                                                                color: '#7f1d1d'
                                                            },
                                                            children: a.message
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/admin/page.tsx",
                                                            lineNumber: 665,
                                                            columnNumber: 21
                                                        }, this),
                                                        a.details && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            style: {
                                                                fontSize: '0.72rem',
                                                                color: '#888'
                                                            },
                                                            children: a.details
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/admin/page.tsx",
                                                            lineNumber: 666,
                                                            columnNumber: 33
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/admin/page.tsx",
                                                    lineNumber: 664,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, i, true, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 662,
                                            columnNumber: 17
                                        }, this))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 659,
                                columnNumber: 13
                            }, this),
                            alerts.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    background: '#fffbeb',
                                    border: '2px solid #f59e0b',
                                    borderRadius: 12,
                                    padding: '1.2rem',
                                    marginBottom: '1.4rem'
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        style: {
                                            color: '#b45309',
                                            fontWeight: 700,
                                            marginBottom: '0.6rem',
                                            fontSize: '0.92rem'
                                        },
                                        children: "⚠️ Pattern Alerts"
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 675,
                                        columnNumber: 15
                                    }, this),
                                    alerts.map((a, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                color: '#7f1d1d',
                                                fontSize: '0.85rem',
                                                padding: '0.25rem 0',
                                                borderBottom: '1px solid #fde68a'
                                            },
                                            children: a
                                        }, i, false, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 676,
                                            columnNumber: 34
                                        }, this))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 674,
                                columnNumber: 13
                            }, this),
                            orders.filter((o)=>o.status === 'void').length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    ...card('#7f1d1d'),
                                    background: '#fef2f2',
                                    marginBottom: '1.4rem'
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        style: {
                                            fontFamily: "'Playfair Display',serif",
                                            fontSize: '0.98rem',
                                            fontWeight: 700,
                                            marginBottom: '0.75rem',
                                            color: '#7f1d1d'
                                        },
                                        children: "⚠️ Voided Orders Log"
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 682,
                                        columnNumber: 15
                                    }, this),
                                    orders.filter((o)=>o.status === 'void').sort((a, b)=>new Date(b.voidedAt || b.timestamp).getTime() - new Date(a.voidedAt || a.timestamp).getTime()).map((o)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                padding: '0.4rem 0',
                                                borderBottom: '1px solid #fecaca',
                                                fontSize: '0.82rem'
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            style: {
                                                                fontWeight: 700
                                                            },
                                                            children: o.orderNum ? `#${o.orderNum}` : o.id
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/admin/page.tsx",
                                                            lineNumber: 686,
                                                            columnNumber: 21
                                                        }, this),
                                                        o.tableId && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            style: {
                                                                color: '#888',
                                                                marginLeft: '0.4rem'
                                                            },
                                                            children: [
                                                                "T",
                                                                o.tableId
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/admin/page.tsx",
                                                            lineNumber: 687,
                                                            columnNumber: 33
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            style: {
                                                                color: '#dc2626',
                                                                marginLeft: '0.5rem'
                                                            },
                                                            children: [
                                                                "— ",
                                                                o.voidReason || 'No reason'
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/admin/page.tsx",
                                                            lineNumber: 688,
                                                            columnNumber: 21
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/admin/page.tsx",
                                                    lineNumber: 685,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    style: {
                                                        color: '#888',
                                                        fontSize: '0.75rem'
                                                    },
                                                    children: [
                                                        "₹",
                                                        o.total,
                                                        " · ",
                                                        new Date(o.voidedAt || o.timestamp).toLocaleTimeString([], {
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/admin/page.tsx",
                                                    lineNumber: 690,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, o.id, true, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 684,
                                            columnNumber: 17
                                        }, this))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 681,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill,minmax(155px,1fr))',
                                    gap: '0.7rem',
                                    marginBottom: '1.4rem'
                                },
                                children: [
                                    {
                                        val: `${cancelRate}%`,
                                        label: 'Cancel Rate',
                                        color: '#ef4444'
                                    },
                                    {
                                        val: cancelledOrders.length,
                                        label: 'Total Cancelled',
                                        color: '#f97316'
                                    },
                                    {
                                        val: discountOrders.length,
                                        label: 'Discounted Orders',
                                        color: '#8b5cf6'
                                    },
                                    {
                                        val: `₹${orders.reduce((s, o)=>s + (o.discount || 0), 0)}`,
                                        label: 'All-Time Discounts',
                                        color: '#E65C00'
                                    },
                                    {
                                        val: highDiscOrders.length,
                                        label: 'High Disc. (>30%)',
                                        color: '#dc2626'
                                    }
                                ].map((c)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            background: 'white',
                                            border: '1px solid #f0e4d7',
                                            borderRadius: 10,
                                            padding: '0.82rem',
                                            borderLeft: `4px solid ${c.color}`
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    fontSize: '1.25rem',
                                                    fontWeight: 900,
                                                    color: c.color
                                                },
                                                children: c.val
                                            }, void 0, false, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 699,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    fontSize: '0.7rem',
                                                    color: '#999'
                                                },
                                                children: c.label
                                            }, void 0, false, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 700,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, c.label, true, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 698,
                                        columnNumber: 15
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 696,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: card('#8b5cf6'),
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        style: {
                                            fontFamily: "'Playfair Display',serif",
                                            fontSize: '0.98rem',
                                            fontWeight: 700,
                                            marginBottom: '0.75rem',
                                            color: '#1A0800'
                                        },
                                        children: "🏷️ Discount Log"
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 707,
                                        columnNumber: 13
                                    }, this),
                                    !discountOrders.length ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            color: '#999',
                                            fontSize: '0.85rem'
                                        },
                                        children: "No discounts applied yet"
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 709,
                                        columnNumber: 17
                                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            overflowX: 'auto'
                                        },
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                                            style: {
                                                width: '100%',
                                                borderCollapse: 'collapse',
                                                fontSize: '0.8rem'
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                        style: {
                                                            background: '#f5f3ff'
                                                        },
                                                        children: [
                                                            'Order',
                                                            'Customer',
                                                            'Date',
                                                            'Subtotal',
                                                            'Discount',
                                                            '% Off',
                                                            'Reason',
                                                            'Status'
                                                        ].map((h)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                style: {
                                                                    padding: '0.48rem 0.7rem',
                                                                    textAlign: 'left',
                                                                    fontSize: '0.7rem',
                                                                    fontWeight: 700,
                                                                    color: '#6d28d9',
                                                                    textTransform: 'uppercase'
                                                                },
                                                                children: h
                                                            }, h, false, {
                                                                fileName: "[project]/app/admin/page.tsx",
                                                                lineNumber: 713,
                                                                columnNumber: 107
                                                            }, this))
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 712,
                                                        columnNumber: 28
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/app/admin/page.tsx",
                                                    lineNumber: 712,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                                    children: discountOrders.map((o)=>{
                                                        const sub = o.subtotal || o.total;
                                                        const pct = Math.round((o.discount || 0) / sub * 100);
                                                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                            style: {
                                                                borderBottom: '1px solid #f5f0e8',
                                                                background: pct > 30 ? '#fef2f2' : 'white'
                                                            },
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    style: {
                                                                        padding: '0.48rem 0.7rem'
                                                                    },
                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                        onClick: ()=>setSelOrder(o),
                                                                        style: {
                                                                            background: 'none',
                                                                            border: 'none',
                                                                            color: '#E65C00',
                                                                            textDecoration: 'underline',
                                                                            fontWeight: 700,
                                                                            cursor: 'pointer',
                                                                            fontFamily: 'Poppins,sans-serif',
                                                                            fontSize: '0.8rem'
                                                                        },
                                                                        children: o.id
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/admin/page.tsx",
                                                                        lineNumber: 721,
                                                                        columnNumber: 68
                                                                    }, this)
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/admin/page.tsx",
                                                                    lineNumber: 721,
                                                                    columnNumber: 29
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    style: {
                                                                        padding: '0.48rem 0.7rem',
                                                                        fontWeight: 600
                                                                    },
                                                                    children: o.customerName
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/admin/page.tsx",
                                                                    lineNumber: 722,
                                                                    columnNumber: 29
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    style: {
                                                                        padding: '0.48rem 0.7rem',
                                                                        color: '#888'
                                                                    },
                                                                    children: new Date(o.timestamp).toLocaleDateString()
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/admin/page.tsx",
                                                                    lineNumber: 723,
                                                                    columnNumber: 29
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    style: {
                                                                        padding: '0.48rem 0.7rem'
                                                                    },
                                                                    children: [
                                                                        "₹",
                                                                        sub
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/admin/page.tsx",
                                                                    lineNumber: 724,
                                                                    columnNumber: 29
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    style: {
                                                                        padding: '0.48rem 0.7rem',
                                                                        color: '#16a34a',
                                                                        fontWeight: 700
                                                                    },
                                                                    children: [
                                                                        "-₹",
                                                                        o.discount
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/admin/page.tsx",
                                                                    lineNumber: 725,
                                                                    columnNumber: 29
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    style: {
                                                                        padding: '0.48rem 0.7rem'
                                                                    },
                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        style: {
                                                                            fontWeight: 700,
                                                                            color: pct > 30 ? '#ef4444' : '#888'
                                                                        },
                                                                        children: [
                                                                            pct,
                                                                            "%",
                                                                            pct > 30 ? ' ⚠️' : ''
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/app/admin/page.tsx",
                                                                        lineNumber: 726,
                                                                        columnNumber: 68
                                                                    }, this)
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/admin/page.tsx",
                                                                    lineNumber: 726,
                                                                    columnNumber: 29
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    style: {
                                                                        padding: '0.48rem 0.7rem',
                                                                        color: '#555'
                                                                    },
                                                                    children: o.discountReason || '—'
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/admin/page.tsx",
                                                                    lineNumber: 727,
                                                                    columnNumber: 29
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    style: {
                                                                        padding: '0.48rem 0.7rem'
                                                                    },
                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        style: {
                                                                            fontSize: '0.7rem',
                                                                            fontWeight: 700,
                                                                            padding: '0.12rem 0.45rem',
                                                                            borderRadius: 10,
                                                                            background: (STATUS_COLOR[o.status] || '#888') + '22',
                                                                            color: STATUS_COLOR[o.status] || '#888',
                                                                            textTransform: 'capitalize'
                                                                        },
                                                                        children: o.status
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/admin/page.tsx",
                                                                        lineNumber: 728,
                                                                        columnNumber: 68
                                                                    }, this)
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/admin/page.tsx",
                                                                    lineNumber: 728,
                                                                    columnNumber: 29
                                                                }, this)
                                                            ]
                                                        }, o.id, true, {
                                                            fileName: "[project]/app/admin/page.tsx",
                                                            lineNumber: 720,
                                                            columnNumber: 27
                                                        }, this);
                                                    })
                                                }, void 0, false, {
                                                    fileName: "[project]/app/admin/page.tsx",
                                                    lineNumber: 715,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 711,
                                            columnNumber: 19
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 710,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 706,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: card('#ef4444'),
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        style: {
                                            fontFamily: "'Playfair Display',serif",
                                            fontSize: '0.98rem',
                                            fontWeight: 700,
                                            marginBottom: '0.75rem',
                                            color: '#1A0800'
                                        },
                                        children: "❌ Cancellation Log"
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 740,
                                        columnNumber: 13
                                    }, this),
                                    !cancelledOrders.length ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            color: '#999',
                                            fontSize: '0.85rem'
                                        },
                                        children: "No cancellations recorded"
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 742,
                                        columnNumber: 17
                                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            overflowX: 'auto'
                                        },
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                                            style: {
                                                width: '100%',
                                                borderCollapse: 'collapse',
                                                fontSize: '0.8rem'
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                        style: {
                                                            background: '#fef2f2'
                                                        },
                                                        children: [
                                                            'Order',
                                                            'Customer',
                                                            'Type',
                                                            'Amount',
                                                            'Cancelled At',
                                                            'Reason'
                                                        ].map((h)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                style: {
                                                                    padding: '0.48rem 0.7rem',
                                                                    textAlign: 'left',
                                                                    fontSize: '0.7rem',
                                                                    fontWeight: 700,
                                                                    color: '#991b1b',
                                                                    textTransform: 'uppercase'
                                                                },
                                                                children: h
                                                            }, h, false, {
                                                                fileName: "[project]/app/admin/page.tsx",
                                                                lineNumber: 746,
                                                                columnNumber: 92
                                                            }, this))
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 745,
                                                        columnNumber: 28
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/app/admin/page.tsx",
                                                    lineNumber: 745,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                                    children: cancelledOrders.map((o)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                            style: {
                                                                borderBottom: '1px solid #fee2e2'
                                                            },
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    style: {
                                                                        padding: '0.48rem 0.7rem'
                                                                    },
                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                        onClick: ()=>setSelOrder(o),
                                                                        style: {
                                                                            background: 'none',
                                                                            border: 'none',
                                                                            color: '#E65C00',
                                                                            textDecoration: 'underline',
                                                                            fontWeight: 700,
                                                                            cursor: 'pointer',
                                                                            fontFamily: 'Poppins,sans-serif',
                                                                            fontSize: '0.8rem'
                                                                        },
                                                                        children: o.id
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/admin/page.tsx",
                                                                        lineNumber: 751,
                                                                        columnNumber: 66
                                                                    }, this)
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/admin/page.tsx",
                                                                    lineNumber: 751,
                                                                    columnNumber: 27
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    style: {
                                                                        padding: '0.48rem 0.7rem',
                                                                        fontWeight: 600
                                                                    },
                                                                    children: o.customerName
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/admin/page.tsx",
                                                                    lineNumber: 752,
                                                                    columnNumber: 27
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    style: {
                                                                        padding: '0.48rem 0.7rem',
                                                                        textTransform: 'capitalize'
                                                                    },
                                                                    children: o.type
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/admin/page.tsx",
                                                                    lineNumber: 753,
                                                                    columnNumber: 27
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    style: {
                                                                        padding: '0.48rem 0.7rem',
                                                                        fontWeight: 700,
                                                                        color: '#ef4444'
                                                                    },
                                                                    children: [
                                                                        "₹",
                                                                        o.total
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/admin/page.tsx",
                                                                    lineNumber: 754,
                                                                    columnNumber: 27
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    style: {
                                                                        padding: '0.48rem 0.7rem',
                                                                        color: '#888'
                                                                    },
                                                                    children: o.cancelledAt ? new Date(o.cancelledAt).toLocaleString() : '—'
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/admin/page.tsx",
                                                                    lineNumber: 755,
                                                                    columnNumber: 27
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    style: {
                                                                        padding: '0.48rem 0.7rem',
                                                                        color: '#555'
                                                                    },
                                                                    children: o.cancelReason || '—'
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/admin/page.tsx",
                                                                    lineNumber: 756,
                                                                    columnNumber: 27
                                                                }, this)
                                                            ]
                                                        }, o.id, true, {
                                                            fileName: "[project]/app/admin/page.tsx",
                                                            lineNumber: 750,
                                                            columnNumber: 25
                                                        }, this))
                                                }, void 0, false, {
                                                    fileName: "[project]/app/admin/page.tsx",
                                                    lineNumber: 748,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 744,
                                            columnNumber: 19
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 743,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 739,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true),
                    section === 'staff' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: card('#E65C00'),
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        style: {
                                            fontFamily: "'Playfair Display',serif",
                                            fontSize: '1rem',
                                            fontWeight: 700,
                                            marginBottom: '0.2rem',
                                            color: '#1A0800'
                                        },
                                        children: "🔐 Change Admin PIN"
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 771,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        style: {
                                            fontSize: '0.78rem',
                                            color: '#888',
                                            marginBottom: '0.85rem'
                                        },
                                        children: "Used to login to this dashboard and authorise discounts. Requires your current PIN to change."
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 772,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            display: 'grid',
                                            gridTemplateColumns: '1fr 1fr 1fr',
                                            gap: '0.75rem',
                                            alignItems: 'flex-end'
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                        style: {
                                                            fontSize: '0.72rem',
                                                            fontWeight: 700,
                                                            color: '#555',
                                                            display: 'block',
                                                            marginBottom: '0.25rem'
                                                        },
                                                        children: "Current PIN"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 775,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                        type: "password",
                                                        inputMode: "numeric",
                                                        value: adminPinOld,
                                                        onChange: (e)=>setAdminPinOld(e.target.value.replace(/\D/g, '')),
                                                        maxLength: 8,
                                                        placeholder: "••••",
                                                        style: {
                                                            ...inp,
                                                            letterSpacing: '0.4em',
                                                            textAlign: 'center'
                                                        }
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 776,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 774,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                        style: {
                                                            fontSize: '0.72rem',
                                                            fontWeight: 700,
                                                            color: '#555',
                                                            display: 'block',
                                                            marginBottom: '0.25rem'
                                                        },
                                                        children: "New PIN"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 779,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                        type: "password",
                                                        inputMode: "numeric",
                                                        value: adminNewPin,
                                                        onChange: (e)=>setAdminNewPin(e.target.value.replace(/\D/g, '')),
                                                        maxLength: 8,
                                                        placeholder: "••••",
                                                        style: {
                                                            ...inp,
                                                            letterSpacing: '0.4em',
                                                            textAlign: 'center'
                                                        }
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 780,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 778,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                        style: {
                                                            fontSize: '0.72rem',
                                                            fontWeight: 700,
                                                            color: '#555',
                                                            display: 'block',
                                                            marginBottom: '0.25rem'
                                                        },
                                                        children: "Confirm PIN"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 783,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                        type: "password",
                                                        inputMode: "numeric",
                                                        value: adminNewPin2,
                                                        onChange: (e)=>setAdminNewPin2(e.target.value.replace(/\D/g, '')),
                                                        maxLength: 8,
                                                        placeholder: "••••",
                                                        style: {
                                                            ...inp,
                                                            letterSpacing: '0.4em',
                                                            textAlign: 'center'
                                                        }
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 784,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 782,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 773,
                                        columnNumber: 13
                                    }, this),
                                    adminPinMsg && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            fontSize: '0.78rem',
                                            color: adminPinMsg.includes('✅') ? '#16a34a' : '#ef4444',
                                            margin: '0.5rem 0'
                                        },
                                        children: adminPinMsg
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 787,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: changeAdminPin,
                                        style: {
                                            ...btn('#E65C00'),
                                            marginTop: '0.75rem'
                                        },
                                        children: "🔐 Update Admin PIN"
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 788,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 770,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: card('#7c3aed'),
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        style: {
                                            fontFamily: "'Playfair Display',serif",
                                            fontSize: '1rem',
                                            fontWeight: 700,
                                            marginBottom: '0.2rem',
                                            color: '#1A0800'
                                        },
                                        children: "🛡️ PIN Recovery — Security Question"
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 793,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        style: {
                                            fontSize: '0.78rem',
                                            color: '#888',
                                            marginBottom: '0.75rem'
                                        },
                                        children: [
                                            "Set a security question so you can reset your PIN if you ever forget it.",
                                            secSetup && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                style: {
                                                    color: '#16a34a',
                                                    marginLeft: '0.3rem'
                                                },
                                                children: [
                                                    "✅ Set up on ",
                                                    new Date(secSetup.setupAt).toLocaleDateString('en-IN')
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 796,
                                                columnNumber: 28
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 794,
                                        columnNumber: 13
                                    }, this),
                                    secSetup && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            background: '#f0fdf4',
                                            borderRadius: 8,
                                            padding: '0.6rem 0.85rem',
                                            marginBottom: '0.75rem',
                                            fontSize: '0.83rem',
                                            color: '#166534',
                                            fontWeight: 600
                                        },
                                        children: [
                                            'Current question: "',
                                            secSetup.question,
                                            '"'
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 799,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            display: 'grid',
                                            gridTemplateColumns: '1fr 1fr',
                                            gap: '0.75rem',
                                            marginBottom: '0.75rem'
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    gridColumn: '1/-1'
                                                },
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                        style: {
                                                            fontSize: '0.72rem',
                                                            fontWeight: 700,
                                                            color: '#555',
                                                            display: 'block',
                                                            marginBottom: '0.25rem'
                                                        },
                                                        children: "Security Question"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 805,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                        value: secQuestion,
                                                        onChange: (e)=>setSecQuestion(e.target.value),
                                                        style: {
                                                            ...inp,
                                                            fontSize: '0.82rem'
                                                        },
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                value: "",
                                                                children: "— Select a question —"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/admin/page.tsx",
                                                                lineNumber: 811,
                                                                columnNumber: 19
                                                            }, this),
                                                            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SECURITY_QUESTIONS"].map((q)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                    value: q,
                                                                    children: q
                                                                }, q, false, {
                                                                    fileName: "[project]/app/admin/page.tsx",
                                                                    lineNumber: 812,
                                                                    columnNumber: 46
                                                                }, this))
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 806,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 804,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                        style: {
                                                            fontSize: '0.72rem',
                                                            fontWeight: 700,
                                                            color: '#555',
                                                            display: 'block',
                                                            marginBottom: '0.25rem'
                                                        },
                                                        children: "Your Answer"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 816,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                        type: "text",
                                                        autoComplete: "off",
                                                        value: secAnswer,
                                                        onChange: (e)=>setSecAnswer(e.target.value),
                                                        placeholder: "Answer (not case sensitive)",
                                                        style: {
                                                            ...inp,
                                                            fontSize: '0.82rem'
                                                        }
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 817,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 815,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                        style: {
                                                            fontSize: '0.72rem',
                                                            fontWeight: 700,
                                                            color: '#555',
                                                            display: 'block',
                                                            marginBottom: '0.25rem'
                                                        },
                                                        children: "Confirm Answer"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 820,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                        type: "text",
                                                        autoComplete: "off",
                                                        value: secAnswerConf,
                                                        onChange: (e)=>setSecAnswerConf(e.target.value),
                                                        placeholder: "Re-enter answer",
                                                        style: {
                                                            ...inp,
                                                            fontSize: '0.82rem'
                                                        }
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 821,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 819,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 803,
                                        columnNumber: 13
                                    }, this),
                                    secMsg && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            fontSize: '0.78rem',
                                            color: secMsg.includes('✅') ? '#16a34a' : '#ef4444',
                                            marginBottom: '0.5rem'
                                        },
                                        children: secMsg
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 824,
                                        columnNumber: 24
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: saveSecurityQuestion,
                                        style: {
                                            ...btn('#7c3aed')
                                        },
                                        children: [
                                            "🛡️ ",
                                            secSetup ? 'Update' : 'Save',
                                            " Security Question"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 825,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 792,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '1rem',
                                    marginBottom: '1.5rem'
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: card('#3b82f6'),
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                style: {
                                                    fontFamily: "'Playfair Display',serif",
                                                    fontSize: '1rem',
                                                    fontWeight: 700,
                                                    marginBottom: '0.75rem',
                                                    color: '#1A0800'
                                                },
                                                children: "🔥 Kitchen PIN"
                                            }, void 0, false, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 831,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                style: {
                                                    fontSize: '0.78rem',
                                                    color: '#666',
                                                    marginBottom: '0.75rem'
                                                },
                                                children: [
                                                    "Shared PIN used by all kitchen staff to log in at ",
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("code", {
                                                        children: "/kitchen"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 832,
                                                        columnNumber: 133
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 832,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                value: kitchenPin,
                                                onChange: (e)=>setKitchenPin(e.target.value.replace(/\D/g, '')),
                                                maxLength: 6,
                                                type: "password",
                                                placeholder: "••••",
                                                style: {
                                                    ...inp,
                                                    letterSpacing: '0.4em',
                                                    textAlign: 'center',
                                                    marginBottom: '0.5rem'
                                                }
                                            }, void 0, false, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 833,
                                                columnNumber: 15
                                            }, this),
                                            kitchenPinMsg && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    fontSize: '0.75rem',
                                                    color: kitchenPinMsg.includes('✅') ? '#16a34a' : '#ef4444',
                                                    marginBottom: '0.4rem'
                                                },
                                                children: kitchenPinMsg
                                            }, void 0, false, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 839,
                                                columnNumber: 33
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                onClick: saveKitchenPinFn,
                                                style: {
                                                    ...btn('#3b82f6'),
                                                    width: '100%'
                                                },
                                                children: "💾 Save Kitchen PIN"
                                            }, void 0, false, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 840,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 830,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: card('#16a34a'),
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                style: {
                                                    fontFamily: "'Playfair Display',serif",
                                                    fontSize: '1rem',
                                                    fontWeight: 700,
                                                    marginBottom: '0.75rem',
                                                    color: '#1A0800'
                                                },
                                                children: "💳 Manager PIN"
                                            }, void 0, false, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 843,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                style: {
                                                    fontSize: '0.78rem',
                                                    color: '#666',
                                                    marginBottom: '0.75rem'
                                                },
                                                children: [
                                                    "PIN used by managers to access counter billing at ",
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("code", {
                                                        children: "/manager"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 844,
                                                        columnNumber: 133
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 844,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                value: managerPin,
                                                onChange: (e)=>setManagerPin(e.target.value.replace(/\D/g, '')),
                                                maxLength: 6,
                                                type: "password",
                                                placeholder: "••••",
                                                style: {
                                                    ...inp,
                                                    letterSpacing: '0.4em',
                                                    textAlign: 'center',
                                                    marginBottom: '0.5rem'
                                                }
                                            }, void 0, false, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 845,
                                                columnNumber: 15
                                            }, this),
                                            managerPinMsg && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    fontSize: '0.75rem',
                                                    color: managerPinMsg.includes('✅') ? '#16a34a' : '#ef4444',
                                                    marginBottom: '0.4rem'
                                                },
                                                children: managerPinMsg
                                            }, void 0, false, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 851,
                                                columnNumber: 33
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                onClick: saveManagerPinFn,
                                                style: {
                                                    ...btn('#16a34a'),
                                                    width: '100%'
                                                },
                                                children: "💾 Save Manager PIN"
                                            }, void 0, false, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 852,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 842,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 829,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: card('#8b5cf6'),
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        style: {
                                            fontFamily: "'Playfair Display',serif",
                                            fontSize: '1rem',
                                            fontWeight: 700,
                                            marginBottom: '0.75rem',
                                            color: '#1A0800'
                                        },
                                        children: "➕ Create Waiter Account"
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 858,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            display: 'grid',
                                            gridTemplateColumns: '1fr 1fr 1fr auto',
                                            gap: '0.75rem',
                                            alignItems: 'flex-end'
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                        style: {
                                                            fontSize: '0.73rem',
                                                            fontWeight: 700,
                                                            color: '#555',
                                                            display: 'block',
                                                            marginBottom: '0.25rem'
                                                        },
                                                        children: "Full Name"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 861,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                        value: staffForm.name,
                                                        onChange: (e)=>setStaffForm((f)=>({
                                                                    ...f,
                                                                    name: e.target.value
                                                                })),
                                                        placeholder: "e.g. Ravi Kumar",
                                                        style: {
                                                            ...inp
                                                        }
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 862,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 860,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                        style: {
                                                            fontSize: '0.73rem',
                                                            fontWeight: 700,
                                                            color: '#555',
                                                            display: 'block',
                                                            marginBottom: '0.25rem'
                                                        },
                                                        children: "Username"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 865,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                        value: staffForm.username,
                                                        onChange: (e)=>setStaffForm((f)=>({
                                                                    ...f,
                                                                    username: e.target.value
                                                                })),
                                                        placeholder: "e.g. ravi",
                                                        style: {
                                                            ...inp
                                                        }
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 866,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 864,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                        style: {
                                                            fontSize: '0.73rem',
                                                            fontWeight: 700,
                                                            color: '#555',
                                                            display: 'block',
                                                            marginBottom: '0.25rem'
                                                        },
                                                        children: "PIN (4+ digits)"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 869,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                        type: "password",
                                                        inputMode: "numeric",
                                                        value: staffForm.pin,
                                                        onChange: (e)=>setStaffForm((f)=>({
                                                                    ...f,
                                                                    pin: e.target.value.replace(/\D/g, '')
                                                                })),
                                                        placeholder: "••••",
                                                        maxLength: 6,
                                                        style: {
                                                            ...inp,
                                                            letterSpacing: '0.3em',
                                                            textAlign: 'center'
                                                        }
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 870,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 868,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                onClick: addStaffAccount,
                                                style: {
                                                    ...btn('#8b5cf6'),
                                                    padding: '0.65rem 1.1rem',
                                                    whiteSpace: 'nowrap'
                                                },
                                                children: "✅ Add"
                                            }, void 0, false, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 880,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 859,
                                        columnNumber: 13
                                    }, this),
                                    staffMsg && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            fontSize: '0.78rem',
                                            color: staffMsg.includes('✅') ? '#16a34a' : '#ef4444',
                                            marginTop: '0.5rem'
                                        },
                                        children: staffMsg
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 882,
                                        columnNumber: 26
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 857,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: card(),
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        style: {
                                            fontFamily: "'Playfair Display',serif",
                                            fontSize: '1rem',
                                            fontWeight: 700,
                                            marginBottom: '0.75rem',
                                            color: '#1A0800'
                                        },
                                        children: [
                                            "🧑‍🍳 Waiter Accounts (",
                                            staffAccounts.length,
                                            ")"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 887,
                                        columnNumber: 13
                                    }, this),
                                    !staffAccounts.length ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            color: '#999',
                                            fontSize: '0.85rem',
                                            textAlign: 'center',
                                            padding: '2rem 0'
                                        },
                                        children: "No waiter accounts yet. Create one above."
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 891,
                                        columnNumber: 17
                                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            overflowX: 'auto'
                                        },
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                                            style: {
                                                width: '100%',
                                                borderCollapse: 'collapse',
                                                fontSize: '0.83rem'
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                        style: {
                                                            background: '#FFF5EB'
                                                        },
                                                        children: [
                                                            'Name',
                                                            'Username',
                                                            'Status',
                                                            'Created',
                                                            'Actions'
                                                        ].map((h)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                style: {
                                                                    padding: '0.5rem 0.75rem',
                                                                    textAlign: 'left',
                                                                    fontSize: '0.7rem',
                                                                    fontWeight: 700,
                                                                    color: '#6B5246',
                                                                    textTransform: 'uppercase'
                                                                },
                                                                children: h
                                                            }, h, false, {
                                                                fileName: "[project]/app/admin/page.tsx",
                                                                lineNumber: 897,
                                                                columnNumber: 27
                                                            }, this))
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 895,
                                                        columnNumber: 23
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/app/admin/page.tsx",
                                                    lineNumber: 894,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                                    children: staffAccounts.map((acc)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                            style: {
                                                                borderBottom: '1px solid #f5f0e8',
                                                                opacity: acc.active ? 1 : 0.5
                                                            },
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    style: {
                                                                        padding: '0.55rem 0.75rem',
                                                                        fontWeight: 700
                                                                    },
                                                                    children: acc.name
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/admin/page.tsx",
                                                                    lineNumber: 904,
                                                                    columnNumber: 27
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    style: {
                                                                        padding: '0.55rem 0.75rem',
                                                                        color: '#666',
                                                                        fontFamily: 'monospace'
                                                                    },
                                                                    children: acc.username
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/admin/page.tsx",
                                                                    lineNumber: 905,
                                                                    columnNumber: 27
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    style: {
                                                                        padding: '0.55rem 0.75rem'
                                                                    },
                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        style: {
                                                                            fontSize: '0.72rem',
                                                                            fontWeight: 700,
                                                                            padding: '0.18rem 0.5rem',
                                                                            borderRadius: 10,
                                                                            background: acc.active ? '#dcfce7' : '#fee2e2',
                                                                            color: acc.active ? '#16a34a' : '#ef4444'
                                                                        },
                                                                        children: acc.active ? 'Active' : 'Inactive'
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/admin/page.tsx",
                                                                        lineNumber: 907,
                                                                        columnNumber: 29
                                                                    }, this)
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/admin/page.tsx",
                                                                    lineNumber: 906,
                                                                    columnNumber: 27
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    style: {
                                                                        padding: '0.55rem 0.75rem',
                                                                        color: '#aaa',
                                                                        fontSize: '0.78rem'
                                                                    },
                                                                    children: new Date(acc.createdAt).toLocaleDateString('en-IN', {
                                                                        day: '2-digit',
                                                                        month: 'short',
                                                                        year: 'numeric'
                                                                    })
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/admin/page.tsx",
                                                                    lineNumber: 911,
                                                                    columnNumber: 27
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    style: {
                                                                        padding: '0.55rem 0.75rem'
                                                                    },
                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        style: {
                                                                            display: 'flex',
                                                                            gap: '0.4rem',
                                                                            flexWrap: 'wrap'
                                                                        },
                                                                        children: [
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                                onClick: ()=>{
                                                                                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toggleStaffAccount"])(acc.id);
                                                                                    refresh();
                                                                                },
                                                                                style: {
                                                                                    ...btn(acc.active ? '#fef2f2' : '#f0fdf4', acc.active ? '#ef4444' : '#16a34a'),
                                                                                    fontSize: '0.72rem',
                                                                                    padding: '0.25rem 0.6rem',
                                                                                    border: `1px solid ${acc.active ? '#fecaca' : '#bbf7d0'}`
                                                                                },
                                                                                children: acc.active ? '⛔ Disable' : '✅ Enable'
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/admin/page.tsx",
                                                                                lineNumber: 916,
                                                                                columnNumber: 31
                                                                            }, this),
                                                                            editPinId === acc.id ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                style: {
                                                                                    display: 'flex',
                                                                                    gap: '0.3rem',
                                                                                    alignItems: 'center'
                                                                                },
                                                                                children: [
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                        type: "password",
                                                                                        inputMode: "numeric",
                                                                                        value: editPinVal,
                                                                                        onChange: (e)=>setEditPinVal(e.target.value.replace(/\D/g, '')),
                                                                                        placeholder: "New PIN",
                                                                                        maxLength: 6,
                                                                                        style: {
                                                                                            width: '80px',
                                                                                            padding: '0.25rem 0.4rem',
                                                                                            border: '2px solid #e5e7eb',
                                                                                            borderRadius: 6,
                                                                                            fontSize: '0.78rem',
                                                                                            fontFamily: 'Poppins,sans-serif',
                                                                                            letterSpacing: '0.3em',
                                                                                            textAlign: 'center'
                                                                                        }
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/admin/page.tsx",
                                                                                        lineNumber: 924,
                                                                                        columnNumber: 37
                                                                                    }, this),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                                        onClick: ()=>{
                                                                                            if (editPinVal.length >= 4) {
                                                                                                (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["updateStaffPin"])(acc.id, editPinVal);
                                                                                                setEditPinId('');
                                                                                                setEditPinVal('');
                                                                                                refresh();
                                                                                            }
                                                                                        },
                                                                                        style: {
                                                                                            ...btn('#3b82f6'),
                                                                                            fontSize: '0.72rem',
                                                                                            padding: '0.25rem 0.5rem'
                                                                                        },
                                                                                        children: "Save"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/admin/page.tsx",
                                                                                        lineNumber: 933,
                                                                                        columnNumber: 37
                                                                                    }, this),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                                        onClick: ()=>{
                                                                                            setEditPinId('');
                                                                                            setEditPinVal('');
                                                                                        },
                                                                                        style: {
                                                                                            ...btn('#e5e7eb', '#555'),
                                                                                            fontSize: '0.72rem',
                                                                                            padding: '0.25rem 0.5rem'
                                                                                        },
                                                                                        children: "✕"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/admin/page.tsx",
                                                                                        lineNumber: 934,
                                                                                        columnNumber: 37
                                                                                    }, this)
                                                                                ]
                                                                            }, void 0, true, {
                                                                                fileName: "[project]/app/admin/page.tsx",
                                                                                lineNumber: 923,
                                                                                columnNumber: 35
                                                                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                                onClick: ()=>{
                                                                                    setEditPinId(acc.id);
                                                                                    setEditPinVal('');
                                                                                },
                                                                                style: {
                                                                                    ...btn('#374151'),
                                                                                    fontSize: '0.72rem',
                                                                                    padding: '0.25rem 0.6rem'
                                                                                },
                                                                                children: "🔑 PIN"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/admin/page.tsx",
                                                                                lineNumber: 936,
                                                                                columnNumber: 35
                                                                            }, this),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                                onClick: ()=>{
                                                                                    if (confirm(`Delete account for ${acc.name}?`)) {
                                                                                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["deleteStaffAccount"])(acc.id);
                                                                                        refresh();
                                                                                    }
                                                                                },
                                                                                style: {
                                                                                    ...btn('#ef4444'),
                                                                                    fontSize: '0.72rem',
                                                                                    padding: '0.25rem 0.6rem'
                                                                                },
                                                                                children: "🗑️ Delete"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/admin/page.tsx",
                                                                                lineNumber: 938,
                                                                                columnNumber: 31
                                                                            }, this)
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/app/admin/page.tsx",
                                                                        lineNumber: 915,
                                                                        columnNumber: 29
                                                                    }, this)
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/admin/page.tsx",
                                                                    lineNumber: 914,
                                                                    columnNumber: 27
                                                                }, this)
                                                            ]
                                                        }, acc.id, true, {
                                                            fileName: "[project]/app/admin/page.tsx",
                                                            lineNumber: 903,
                                                            columnNumber: 25
                                                        }, this))
                                                }, void 0, false, {
                                                    fileName: "[project]/app/admin/page.tsx",
                                                    lineNumber: 901,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 893,
                                            columnNumber: 19
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 892,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 886,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: card(),
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        style: {
                                            fontFamily: "'Playfair Display',serif",
                                            fontSize: '1rem',
                                            fontWeight: 700,
                                            marginBottom: '1rem',
                                            color: '#1A0800'
                                        },
                                        children: "🔗 Portal & Page Links"
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 956,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            marginBottom: '1rem'
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    fontSize: '0.7rem',
                                                    fontWeight: 700,
                                                    color: '#888',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.05em',
                                                    marginBottom: '0.5rem'
                                                },
                                                children: "Staff Login Pages"
                                            }, void 0, false, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 960,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    display: 'grid',
                                                    gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))',
                                                    gap: '0.5rem'
                                                },
                                                children: [
                                                    {
                                                        href: '/kitchen/login',
                                                        label: '🔥 Kitchen Login',
                                                        color: '#3b82f6'
                                                    },
                                                    {
                                                        href: '/waiter/login',
                                                        label: '🧑‍🍳 Waiter Login',
                                                        color: '#8b5cf6'
                                                    },
                                                    {
                                                        href: '/manager/login',
                                                        label: '💳 Manager Login',
                                                        color: '#16a34a'
                                                    },
                                                    {
                                                        href: '/admin/login',
                                                        label: '🔧 Admin Login',
                                                        color: '#E65C00'
                                                    }
                                                ].map((l)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                        href: l.href,
                                                        target: "_blank",
                                                        rel: "noreferrer",
                                                        style: {
                                                            padding: '0.6rem 1rem',
                                                            background: l.color,
                                                            color: 'white',
                                                            borderRadius: 8,
                                                            fontWeight: 700,
                                                            textDecoration: 'none',
                                                            fontSize: '0.81rem',
                                                            textAlign: 'center',
                                                            display: 'block'
                                                        },
                                                        children: l.label
                                                    }, l.href, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 968,
                                                        columnNumber: 19
                                                    }, this))
                                            }, void 0, false, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 961,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 959,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    fontSize: '0.7rem',
                                                    fontWeight: 700,
                                                    color: '#888',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.05em',
                                                    marginBottom: '0.5rem'
                                                },
                                                children: "Customer-Facing Pages"
                                            }, void 0, false, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 977,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    display: 'grid',
                                                    gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))',
                                                    gap: '0.5rem'
                                                },
                                                children: [
                                                    [
                                                        {
                                                            href: '/',
                                                            label: '🏠 Restaurant Home',
                                                            color: '#1A0800'
                                                        },
                                                        {
                                                            href: '/online',
                                                            label: '📦 Online Ordering',
                                                            color: '#2563eb'
                                                        }
                                                    ].map((l)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                            href: l.href,
                                                            target: "_blank",
                                                            rel: "noreferrer",
                                                            style: {
                                                                padding: '0.6rem 1rem',
                                                                background: l.color,
                                                                color: 'white',
                                                                borderRadius: 8,
                                                                fontWeight: 700,
                                                                textDecoration: 'none',
                                                                fontSize: '0.81rem',
                                                                textAlign: 'center',
                                                                display: 'block'
                                                            },
                                                            children: l.label
                                                        }, l.href, false, {
                                                            fileName: "[project]/app/admin/page.tsx",
                                                            lineNumber: 983,
                                                            columnNumber: 19
                                                        }, this)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        onClick: ()=>setSection('qr'),
                                                        style: {
                                                            ...btn('#f59e0b', '#1A0800'),
                                                            textAlign: 'center',
                                                            fontSize: '0.81rem',
                                                            padding: '0.6rem 1rem'
                                                        },
                                                        children: "🔲 Table QR Codes →"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 987,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 978,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 976,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 955,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true),
                    section === 'qr' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: card('#f59e0b'),
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'flex-start',
                                        flexWrap: 'wrap',
                                        gap: '0.75rem',
                                        marginBottom: '0.5rem'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                                    style: {
                                                        fontFamily: "'Playfair Display',serif",
                                                        fontSize: '1.1rem',
                                                        fontWeight: 700,
                                                        color: '#1A0800',
                                                        margin: '0 0 0.3rem'
                                                    },
                                                    children: "🔲 Table QR Codes"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/admin/page.tsx",
                                                    lineNumber: 1003,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    style: {
                                                        margin: 0,
                                                        fontSize: '0.78rem',
                                                        color: '#888'
                                                    },
                                                    children: "Each QR code links customers directly to the ordering menu for that table. Print and place on each table."
                                                }, void 0, false, {
                                                    fileName: "[project]/app/admin/page.tsx",
                                                    lineNumber: 1004,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 1002,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            onClick: ()=>{
                                                const win = window.open('', '_blank');
                                                if (!win) return;
                                                const origin = window.location.origin;
                                                const imgs = tables.map((t)=>`
                    <div style="text-align:center;page-break-inside:avoid;margin:12px;display:inline-block;width:200px;border:2px solid #ccc;border-radius:8px;padding:10px;font-family:sans-serif">
                      <div style="font-size:1.1rem;font-weight:900;margin-bottom:4px">Table ${t.id}</div>
                      ${qrDataUrls[t.id] ? `<img src="${qrDataUrls[t.id]}" width="180" height="180" style="display:block;margin:0 auto"/>` : `<div style="width:180px;height:180px;background:#eee;margin:0 auto;display:flex;align-items:center;justify-content:center;font-size:0.75rem;color:#999">Loading…</div>`}
                      <div style="font-size:0.62rem;color:#888;margin-top:4px;word-break:break-all">${origin}/table?table=${t.id}</div>
                    </div>`).join('');
                                                win.document.write(`<!DOCTYPE html><html><head><title>Table QR Codes — Foodie Lover</title>
                    <style>@media print{body{margin:0}}body{font-family:sans-serif;background:#fff;padding:20px}h1{text-align:center;font-size:1.3rem;margin-bottom:16px}</style>
                    </head><body><h1>🍽️ Foodie Lover — Table QR Codes</h1><div style="display:flex;flex-wrap:wrap;justify-content:center;gap:8px">${imgs}</div></body></html>`);
                                                win.document.close();
                                                win.focus();
                                                setTimeout(()=>win.print(), 500);
                                            },
                                            style: {
                                                ...btn('#1A0800'),
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.4rem'
                                            },
                                            children: "🖨️ Print All QR Codes"
                                        }, void 0, false, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 1006,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/admin/page.tsx",
                                    lineNumber: 1001,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 1000,
                                columnNumber: 11
                            }, this),
                            Object.keys(qrDataUrls).length === 0 && tables.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    textAlign: 'center',
                                    padding: '3rem',
                                    color: '#888'
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            fontSize: '2rem',
                                            marginBottom: '0.5rem'
                                        },
                                        children: "⏳"
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 1035,
                                        columnNumber: 15
                                    }, this),
                                    "Generating QR codes…"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 1034,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))',
                                    gap: '1.25rem',
                                    marginBottom: '2rem'
                                },
                                children: tables.map((t)=>{
                                    const url = `${("TURBOPACK compile-time truthy", 1) ? window.location.origin : "TURBOPACK unreachable"}/table?table=${t.id}`;
                                    const color = t.status === 'available' ? '#10b981' : t.status === 'occupied' ? '#f97316' : '#ef4444';
                                    const bg = t.status === 'available' ? '#d1fae5' : t.status === 'occupied' ? '#fed7aa' : '#fca5a5';
                                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            background: 'white',
                                            borderRadius: 14,
                                            boxShadow: '0 3px 12px rgba(0,0,0,0.1)',
                                            overflow: 'hidden',
                                            border: `2px solid ${color}20`
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    background: `linear-gradient(135deg,#1A0800,#3D1A00)`,
                                                    color: 'white',
                                                    padding: '0.7rem 1rem',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center'
                                                },
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        style: {
                                                            fontFamily: "'Playfair Display',serif",
                                                            fontWeight: 900,
                                                            fontSize: '1rem'
                                                        },
                                                        children: [
                                                            "🪑 Table ",
                                                            t.id
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 1049,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        style: {
                                                            fontSize: '0.65rem',
                                                            fontWeight: 700,
                                                            background: color,
                                                            color: 'white',
                                                            padding: '0.18rem 0.55rem',
                                                            borderRadius: 10,
                                                            textTransform: 'uppercase'
                                                        },
                                                        children: t.status
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 1050,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 1048,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    padding: '1rem',
                                                    textAlign: 'center'
                                                },
                                                children: [
                                                    qrDataUrls[t.id] ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                        src: qrDataUrls[t.id],
                                                        alt: `QR Table ${t.id}`,
                                                        style: {
                                                            width: 180,
                                                            height: 180,
                                                            borderRadius: 8,
                                                            border: '1px solid #eee'
                                                        }
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 1056,
                                                        columnNumber: 25
                                                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        style: {
                                                            width: 180,
                                                            height: 180,
                                                            background: '#f5f5f5',
                                                            borderRadius: 8,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            margin: '0 auto',
                                                            color: '#bbb',
                                                            fontSize: '0.8rem'
                                                        },
                                                        children: "Generating…"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 1057,
                                                        columnNumber: 25
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        style: {
                                                            marginTop: '0.5rem',
                                                            fontSize: '0.65rem',
                                                            color: '#999',
                                                            wordBreak: 'break-all',
                                                            padding: '0 0.5rem'
                                                        },
                                                        children: url
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 1059,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 1054,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    padding: '0.6rem 1rem',
                                                    borderTop: '1px solid #f5f0e8',
                                                    display: 'flex',
                                                    gap: '0.4rem'
                                                },
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        onClick: ()=>{
                                                            const win = window.open('', '_blank');
                                                            if (!win) return;
                                                            win.document.write(`<!DOCTYPE html><html><head><title>Table ${t.id} QR</title>
                          <style>@media print{body{margin:0}}body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#fff}
                          .box{text-align:center;border:2px solid #1A0800;border-radius:12px;padding:20px;width:240px}
                          h2{font-size:1.4rem;margin:0 0 8px;color:#1A0800}img{display:block;margin:0 auto}
                          .url{font-size:0.6rem;color:#888;margin-top:8px;word-break:break-all}</style></head>
                          <body><div class="box"><h2>🪑 Table ${t.id}</h2><div style="font-size:0.75rem;color:#888;margin-bottom:8px">Scan to order</div>
                          ${qrDataUrls[t.id] ? `<img src="${qrDataUrls[t.id]}" width="200" height="200"/>` : ''}
                          <div class="url">${url}</div></div></body></html>`);
                                                            win.document.close();
                                                            win.focus();
                                                            setTimeout(()=>win.print(), 400);
                                                        },
                                                        style: {
                                                            ...btn('#1A0800'),
                                                            flex: 1,
                                                            fontSize: '0.75rem',
                                                            padding: '0.4rem 0.5rem',
                                                            textAlign: 'center'
                                                        },
                                                        children: "🖨️ Print"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 1064,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        onClick: ()=>{
                                                            navigator.clipboard?.writeText(url).then(()=>alert(`Copied: ${url}`));
                                                        },
                                                        style: {
                                                            ...btn('#374151'),
                                                            flex: 1,
                                                            fontSize: '0.75rem',
                                                            padding: '0.4rem 0.5rem',
                                                            textAlign: 'center'
                                                        },
                                                        children: "📋 Copy URL"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 1084,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 1063,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, t.id, true, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 1046,
                                        columnNumber: 17
                                    }, this);
                                })
                            }, void 0, false, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 1040,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    ...card('#2563eb'),
                                    background: '#eff6ff',
                                    borderLeft: '4px solid #2563eb'
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        style: {
                                            fontFamily: "'Playfair Display',serif",
                                            fontSize: '0.95rem',
                                            fontWeight: 700,
                                            color: '#1e3a5f',
                                            marginBottom: '0.6rem'
                                        },
                                        children: "📖 How to Use Table QR Codes"
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 1098,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
                                            gap: '0.75rem',
                                            fontSize: '0.8rem',
                                            color: '#374151'
                                        },
                                        children: [
                                            {
                                                step: '1',
                                                text: 'Print the QR code for each table and laminate it or place it in a stand.'
                                            },
                                            {
                                                step: '2',
                                                text: 'Customers scan the QR with their phone camera — no app needed.'
                                            },
                                            {
                                                step: '3',
                                                text: 'They see the menu, add items, and place their order directly.'
                                            },
                                            {
                                                step: '4',
                                                text: 'Orders appear instantly in the Kitchen & Waiter portals.'
                                            }
                                        ].map((s)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    display: 'flex',
                                                    gap: '0.6rem',
                                                    alignItems: 'flex-start'
                                                },
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        style: {
                                                            background: '#2563eb',
                                                            color: 'white',
                                                            borderRadius: '50%',
                                                            width: 22,
                                                            height: 22,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontWeight: 900,
                                                            fontSize: '0.75rem',
                                                            flexShrink: 0
                                                        },
                                                        children: s.step
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 1107,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        children: s.text
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 1108,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, s.step, true, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 1106,
                                                columnNumber: 17
                                            }, this))
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 1099,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 1097,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true),
                    section === 'live' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '1rem'
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                        style: {
                                            fontFamily: "'Playfair Display',serif",
                                            fontSize: '1.3rem',
                                            fontWeight: 900,
                                            color: '#1A0800',
                                            margin: 0
                                        },
                                        children: "🔴 Live Restaurant View"
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 1118,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            fontSize: '0.75rem',
                                            color: '#888'
                                        },
                                        children: "Auto-refreshes every 5 seconds"
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 1121,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 1117,
                                columnNumber: 11
                            }, this),
                            fraudList.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    ...card('#ef4444'),
                                    background: '#fef2f2'
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            fontWeight: 800,
                                            color: '#dc2626',
                                            marginBottom: '0.5rem',
                                            fontSize: '0.88rem'
                                        },
                                        children: [
                                            "⚠️ Fraud Alerts — ",
                                            new Date().toLocaleDateString('en-IN')
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 1127,
                                        columnNumber: 15
                                    }, this),
                                    fraudList.map((a, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                gap: '0.5rem',
                                                padding: '0.4rem 0',
                                                borderBottom: '1px solid #fecaca',
                                                fontSize: '0.82rem'
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    style: {
                                                        color: a.severity === 'critical' ? '#dc2626' : '#f97316',
                                                        fontWeight: 800,
                                                        flexShrink: 0
                                                    },
                                                    children: a.severity === 'critical' ? '🚨' : '⚠️'
                                                }, void 0, false, {
                                                    fileName: "[project]/app/admin/page.tsx",
                                                    lineNumber: 1130,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            style: {
                                                                fontWeight: 700,
                                                                color: '#1A0800'
                                                            },
                                                            children: a.message
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/admin/page.tsx",
                                                            lineNumber: 1134,
                                                            columnNumber: 21
                                                        }, this),
                                                        a.details && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            style: {
                                                                fontSize: '0.72rem',
                                                                color: '#888'
                                                            },
                                                            children: a.details
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/admin/page.tsx",
                                                            lineNumber: 1135,
                                                            columnNumber: 35
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/admin/page.tsx",
                                                    lineNumber: 1133,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, i, true, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 1129,
                                            columnNumber: 17
                                        }, this))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 1126,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    ...card('#065f46'),
                                    background: '#f0fdf4',
                                    marginBottom: '1rem'
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            marginBottom: '0.75rem'
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    fontWeight: 800,
                                                    color: '#064e3b'
                                                },
                                                children: "🪑 Table Status"
                                            }, void 0, false, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 1145,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    fontSize: '0.72rem',
                                                    color: '#888'
                                                },
                                                children: [
                                                    tables.filter((t)=>t.status === 'occupied').length,
                                                    "/",
                                                    tables.length,
                                                    " occupied ·",
                                                    ' ',
                                                    orders.filter((o)=>[
                                                            'awaiting_waiter',
                                                            'pending',
                                                            'preparing',
                                                            'prepared',
                                                            'served'
                                                        ].includes(o.status) && o.type === 'dine-in').reduce((s, o)=>s + (o.partySize ?? 1), 0),
                                                    " guests"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 1146,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 1144,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))',
                                            gap: '0.6rem'
                                        },
                                        children: tables.map((t)=>{
                                            const tableActiveOrders = orders.filter((o)=>o.tableId === t.id && [
                                                    'awaiting_waiter',
                                                    'pending',
                                                    'preparing',
                                                    'prepared',
                                                    'served'
                                                ].includes(o.status));
                                            const latestOrder = tableActiveOrders.slice(-1)[0];
                                            const mins = latestOrder ? Math.floor((Date.now() - new Date(latestOrder.timestamp).getTime()) / 60000) : 0;
                                            const chairsOccupied = tableActiveOrders.reduce((s, o)=>s + (o.partySize ?? 1), 0);
                                            const guestNames = tableActiveOrders.map((o)=>o.customerName).join(', ');
                                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    background: t.status === 'occupied' ? '#064e3b' : t.status === 'reserved' ? '#1e40af' : '#e5e7eb',
                                                    borderRadius: 10,
                                                    padding: '0.65rem 0.75rem',
                                                    textAlign: 'center',
                                                    color: t.status === 'available' ? '#6b7280' : 'white'
                                                },
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        style: {
                                                            fontWeight: 900,
                                                            fontSize: '1.1rem'
                                                        },
                                                        children: [
                                                            "T",
                                                            t.id
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 1164,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        style: {
                                                            fontSize: '0.65rem',
                                                            fontWeight: 700,
                                                            textTransform: 'uppercase',
                                                            marginTop: '0.1rem',
                                                            opacity: 0.85
                                                        },
                                                        children: t.status
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 1165,
                                                        columnNumber: 21
                                                    }, this),
                                                    tableActiveOrders.length > 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        style: {
                                                            fontSize: '0.6rem',
                                                            marginTop: '0.3rem',
                                                            opacity: 0.85,
                                                            lineHeight: 1.4
                                                        },
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                children: [
                                                                    "👥 ",
                                                                    chairsOccupied,
                                                                    "/",
                                                                    t.chairs,
                                                                    " chairs"
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/admin/page.tsx",
                                                                lineNumber: 1170,
                                                                columnNumber: 25
                                                            }, this),
                                                            guestNames && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                style: {
                                                                    opacity: 0.75,
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    whiteSpace: 'nowrap',
                                                                    maxWidth: '110px'
                                                                },
                                                                children: guestNames
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/admin/page.tsx",
                                                                lineNumber: 1171,
                                                                columnNumber: 40
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                style: {
                                                                    marginTop: '0.15rem',
                                                                    opacity: 0.7
                                                                },
                                                                children: [
                                                                    mins,
                                                                    "m · ",
                                                                    latestOrder?.status?.replace('_', ' ')
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/admin/page.tsx",
                                                                lineNumber: 1172,
                                                                columnNumber: 25
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 1169,
                                                        columnNumber: 23
                                                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        style: {
                                                            fontSize: '0.6rem',
                                                            marginTop: '0.2rem',
                                                            opacity: 0.6
                                                        },
                                                        children: [
                                                            t.chairs,
                                                            " chairs free"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 1175,
                                                        columnNumber: 23
                                                    }, this)
                                                ]
                                            }, t.id, true, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 1159,
                                                columnNumber: 19
                                            }, this);
                                        })
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 1151,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 1143,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
                                    gap: '1rem'
                                },
                                children: [
                                    'awaiting_waiter',
                                    'pending',
                                    'preparing',
                                    'prepared',
                                    'served'
                                ].map((status)=>{
                                    const statusOrders = orders.filter((o)=>o.status === status);
                                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            ...card(STATUS_COLOR[status])
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    marginBottom: '0.5rem'
                                                },
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        style: {
                                                            fontWeight: 800,
                                                            fontSize: '0.82rem',
                                                            color: STATUS_COLOR[status],
                                                            textTransform: 'capitalize'
                                                        },
                                                        children: status.replace('_', ' ')
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 1192,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        style: {
                                                            background: STATUS_COLOR[status],
                                                            color: 'white',
                                                            borderRadius: '50%',
                                                            width: 22,
                                                            height: 22,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontWeight: 900,
                                                            fontSize: '0.78rem'
                                                        },
                                                        children: statusOrders.length
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 1193,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 1191,
                                                columnNumber: 19
                                            }, this),
                                            statusOrders.slice(0, 4).map((o)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    style: {
                                                        padding: '0.3rem 0',
                                                        borderBottom: '1px solid #f5f0e8',
                                                        fontSize: '0.78rem'
                                                    },
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            style: {
                                                                fontWeight: 700
                                                            },
                                                            children: o.orderNum ? `#${o.orderNum}` : o.id
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/admin/page.tsx",
                                                            lineNumber: 1197,
                                                            columnNumber: 23
                                                        }, this),
                                                        o.tableId && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            style: {
                                                                color: '#888'
                                                            },
                                                            children: [
                                                                " · T",
                                                                o.tableId
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/admin/page.tsx",
                                                            lineNumber: 1198,
                                                            columnNumber: 37
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            style: {
                                                                color: '#aaa',
                                                                marginLeft: '0.4rem'
                                                            },
                                                            children: [
                                                                Math.floor((Date.now() - new Date(o.timestamp).getTime()) / 60000),
                                                                "m"
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/admin/page.tsx",
                                                            lineNumber: 1199,
                                                            columnNumber: 23
                                                        }, this)
                                                    ]
                                                }, o.id, true, {
                                                    fileName: "[project]/app/admin/page.tsx",
                                                    lineNumber: 1196,
                                                    columnNumber: 21
                                                }, this)),
                                            statusOrders.length > 4 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    fontSize: '0.7rem',
                                                    color: '#aaa',
                                                    marginTop: '0.3rem'
                                                },
                                                children: [
                                                    "+",
                                                    statusOrders.length - 4,
                                                    " more"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 1202,
                                                columnNumber: 47
                                            }, this),
                                            !statusOrders.length && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    fontSize: '0.75rem',
                                                    color: '#aaa'
                                                },
                                                children: "None"
                                            }, void 0, false, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 1203,
                                                columnNumber: 44
                                            }, this)
                                        ]
                                    }, status, true, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 1190,
                                        columnNumber: 17
                                    }, this);
                                })
                            }, void 0, false, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 1186,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true),
                    section === 'dayclose' && eodReport && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                style: {
                                    fontFamily: "'Playfair Display',serif",
                                    fontSize: '1.3rem',
                                    fontWeight: 900,
                                    color: '#1A0800',
                                    marginBottom: '1rem'
                                },
                                children: [
                                    "📅 End-of-Day Report — ",
                                    eodReport.date
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 1212,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))',
                                    gap: '1rem',
                                    marginBottom: '1.5rem'
                                },
                                children: [
                                    {
                                        icon: '📋',
                                        val: eodReport.totalOrders,
                                        label: 'Total Orders',
                                        color: '#E65C00'
                                    },
                                    {
                                        icon: '✅',
                                        val: eodReport.completedOrders,
                                        label: 'Completed',
                                        color: '#16a34a'
                                    },
                                    {
                                        icon: '❌',
                                        val: eodReport.cancelledOrders,
                                        label: 'Cancelled',
                                        color: '#ef4444'
                                    },
                                    {
                                        icon: '⚠️',
                                        val: eodReport.voidedOrders,
                                        label: 'Voided',
                                        color: '#7f1d1d'
                                    },
                                    {
                                        icon: '💰',
                                        val: `₹${eodReport.netRevenue}`,
                                        label: 'Net Revenue',
                                        color: '#E65C00'
                                    },
                                    {
                                        icon: '🏷️',
                                        val: `₹${eodReport.discounts}`,
                                        label: 'Discounts Given',
                                        color: '#f59e0b'
                                    },
                                    {
                                        icon: '📈',
                                        val: `₹${eodReport.avgBillValue}`,
                                        label: 'Avg Bill Value',
                                        color: '#3b82f6'
                                    },
                                    {
                                        icon: '⏰',
                                        val: eodReport.peakHour,
                                        label: 'Peak Hour',
                                        color: '#8b5cf6'
                                    }
                                ].map((s)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            ...card(s.color),
                                            padding: '1rem',
                                            textAlign: 'center',
                                            cursor: 'default'
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    fontSize: '1.6rem',
                                                    fontWeight: 900,
                                                    color: s.color
                                                },
                                                children: [
                                                    s.icon,
                                                    " ",
                                                    s.val
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 1229,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    fontSize: '0.7rem',
                                                    color: '#666',
                                                    marginTop: '0.2rem'
                                                },
                                                children: s.label
                                            }, void 0, false, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 1230,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, s.label, true, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 1228,
                                        columnNumber: 15
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 1217,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    ...card('#3b82f6'),
                                    background: '#eff6ff',
                                    marginBottom: '1rem'
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            fontWeight: 800,
                                            color: '#1e3a5f',
                                            marginBottom: '0.75rem'
                                        },
                                        children: "💳 Payment Method Breakdown"
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 1237,
                                        columnNumber: 13
                                    }, this),
                                    Object.keys(eodReport.paymentBreakdown).length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            color: '#888',
                                            fontSize: '0.82rem'
                                        },
                                        children: "No completed orders today"
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 1239,
                                        columnNumber: 15
                                    }, this) : Object.entries(eodReport.paymentBreakdown).map(([method, data])=>{
                                        const label = {
                                            cod: '💵 Cash',
                                            gpay: '📱 Google Pay',
                                            phonepe: '📱 PhonePe',
                                            card: '💳 Card',
                                            upi: '📲 UPI'
                                        };
                                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                padding: '0.4rem 0',
                                                borderBottom: '1px solid #dbeafe',
                                                fontSize: '0.85rem'
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    style: {
                                                        fontWeight: 600
                                                    },
                                                    children: label[method] || method
                                                }, void 0, false, {
                                                    fileName: "[project]/app/admin/page.tsx",
                                                    lineNumber: 1244,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    style: {
                                                        color: '#1e40af',
                                                        fontWeight: 700
                                                    },
                                                    children: [
                                                        data.count,
                                                        " orders · ₹",
                                                        data.amount
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/admin/page.tsx",
                                                    lineNumber: 1245,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, method, true, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 1243,
                                            columnNumber: 17
                                        }, this);
                                    })
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 1236,
                                columnNumber: 11
                            }, this),
                            eodReport.topItems.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    ...card('#16a34a'),
                                    background: '#f0fdf4'
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            fontWeight: 800,
                                            color: '#064e3b',
                                            marginBottom: '0.75rem'
                                        },
                                        children: "🍽️ Top Selling Items"
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 1254,
                                        columnNumber: 15
                                    }, this),
                                    eodReport.topItems.map((it, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                padding: '0.35rem 0',
                                                borderBottom: '1px solid #dcfce7',
                                                fontSize: '0.85rem'
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            style: {
                                                                fontWeight: 900,
                                                                color: '#16a34a',
                                                                marginRight: '0.5rem'
                                                            },
                                                            children: [
                                                                "#",
                                                                i + 1
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/admin/page.tsx",
                                                            lineNumber: 1257,
                                                            columnNumber: 25
                                                        }, this),
                                                        it.name
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/admin/page.tsx",
                                                    lineNumber: 1257,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    style: {
                                                        fontWeight: 700,
                                                        color: '#064e3b'
                                                    },
                                                    children: [
                                                        it.qty,
                                                        " sold"
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/admin/page.tsx",
                                                    lineNumber: 1258,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, it.name, true, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 1256,
                                            columnNumber: 17
                                        }, this))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 1253,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true)
                ]
            }, void 0, true, {
                fileName: "[project]/app/admin/page.tsx",
                lineNumber: 388,
                columnNumber: 7
            }, this),
            selOrder && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "modal-overlay show",
                onClick: ()=>setSelOrder(null),
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    onClick: (e)=>e.stopPropagation(),
                    style: {
                        background: 'white',
                        borderRadius: 16,
                        width: '100%',
                        maxWidth: 600,
                        maxHeight: '90vh',
                        overflow: 'auto',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                background: 'linear-gradient(135deg,#1A0800,#E65C00)',
                                color: 'white',
                                padding: '1.2rem 1.7rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                position: 'sticky',
                                top: 0,
                                zIndex: 2,
                                borderRadius: '16px 16px 0 0'
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                fontSize: '0.68rem',
                                                opacity: 0.7,
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.1em'
                                            },
                                            children: "Order Details"
                                        }, void 0, false, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 1273,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.6rem'
                                            },
                                            children: [
                                                selOrder.orderNum && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    style: {
                                                        fontFamily: 'monospace',
                                                        fontSize: '1.4rem',
                                                        fontWeight: 900,
                                                        color: '#F9A826'
                                                    },
                                                    children: [
                                                        "#",
                                                        selOrder.orderNum
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/admin/page.tsx",
                                                    lineNumber: 1275,
                                                    columnNumber: 41
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    style: {
                                                        fontSize: '0.9rem',
                                                        fontWeight: 700,
                                                        fontFamily: "'Playfair Display',serif",
                                                        opacity: 0.8
                                                    },
                                                    children: selOrder.id
                                                }, void 0, false, {
                                                    fileName: "[project]/app/admin/page.tsx",
                                                    lineNumber: 1276,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 1274,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                fontSize: '0.75rem',
                                                opacity: 0.8
                                            },
                                            children: new Date(selOrder.timestamp).toLocaleString()
                                        }, void 0, false, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 1278,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/admin/page.tsx",
                                    lineNumber: 1272,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        display: 'flex',
                                        gap: '0.5rem',
                                        alignItems: 'center'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            style: {
                                                fontSize: '0.7rem',
                                                fontWeight: 700,
                                                padding: '0.18rem 0.55rem',
                                                borderRadius: 10,
                                                background: (STATUS_COLOR[selOrder.status] || '#888') + '44',
                                                color: 'white',
                                                textTransform: 'capitalize'
                                            },
                                            children: selOrder.status
                                        }, void 0, false, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 1281,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            onClick: ()=>setSelOrder(null),
                                            style: {
                                                background: 'none',
                                                border: 'none',
                                                color: 'white',
                                                fontSize: '1.7rem',
                                                cursor: 'pointer',
                                                lineHeight: 1
                                            },
                                            children: "×"
                                        }, void 0, false, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 1282,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/admin/page.tsx",
                                    lineNumber: 1280,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/admin/page.tsx",
                            lineNumber: 1271,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                padding: '1rem 1.7rem',
                                background: '#FFFAF5',
                                borderBottom: '1px solid #f0e4d7',
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '0.45rem 1.5rem'
                            },
                            children: [
                                [
                                    [
                                        'Customer',
                                        selOrder.customerName
                                    ],
                                    [
                                        'Phone',
                                        selOrder.phone || '—'
                                    ],
                                    [
                                        'Type',
                                        selOrder.type
                                    ],
                                    [
                                        'Location',
                                        selOrder.type === 'dine-in' ? `Table ${selOrder.tableId}` : 'Pickup'
                                    ],
                                    [
                                        'Payment',
                                        selOrder.payment || 'N/A'
                                    ],
                                    [
                                        'Staff',
                                        selOrder.staffName || '—'
                                    ]
                                ].map(([l, v])=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    fontSize: '0.65rem',
                                                    color: '#999',
                                                    fontWeight: 700,
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.05em'
                                                },
                                                children: l
                                            }, void 0, false, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 1287,
                                                columnNumber: 30
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    fontSize: '0.86rem',
                                                    fontWeight: 700,
                                                    color: '#1A0800',
                                                    textTransform: 'capitalize'
                                                },
                                                children: v
                                            }, void 0, false, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 1287,
                                                columnNumber: 150
                                            }, this)
                                        ]
                                    }, l, true, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 1287,
                                        columnNumber: 17
                                    }, this)),
                                selOrder.cancelReason && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        gridColumn: '1/-1'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                fontSize: '0.65rem',
                                                color: '#ef4444',
                                                fontWeight: 700,
                                                textTransform: 'uppercase'
                                            },
                                            children: "Cancel Reason"
                                        }, void 0, false, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 1289,
                                            columnNumber: 74
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                fontSize: '0.86rem',
                                                color: '#ef4444',
                                                fontWeight: 600
                                            },
                                            children: selOrder.cancelReason
                                        }, void 0, false, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 1289,
                                            columnNumber: 184
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/admin/page.tsx",
                                    lineNumber: 1289,
                                    columnNumber: 41
                                }, this),
                                selOrder.discountReason && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        gridColumn: '1/-1'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                fontSize: '0.65rem',
                                                color: '#8b5cf6',
                                                fontWeight: 700,
                                                textTransform: 'uppercase'
                                            },
                                            children: "Discount Reason"
                                        }, void 0, false, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 1290,
                                            columnNumber: 76
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                fontSize: '0.86rem',
                                                color: '#8b5cf6',
                                                fontWeight: 600
                                            },
                                            children: selOrder.discountReason
                                        }, void 0, false, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 1290,
                                            columnNumber: 188
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/admin/page.tsx",
                                    lineNumber: 1290,
                                    columnNumber: 43
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/admin/page.tsx",
                            lineNumber: 1285,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                padding: '1rem 1.7rem'
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        color: '#6B5246',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.06em',
                                        marginBottom: '0.5rem'
                                    },
                                    children: "Items Ordered"
                                }, void 0, false, {
                                    fileName: "[project]/app/admin/page.tsx",
                                    lineNumber: 1293,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                                    style: {
                                        width: '100%',
                                        borderCollapse: 'collapse',
                                        fontSize: '0.83rem'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                style: {
                                                    background: '#f5f0e8'
                                                },
                                                children: [
                                                    '#',
                                                    'Item',
                                                    'Qty',
                                                    'Unit',
                                                    'Total'
                                                ].map((h)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        style: {
                                                            padding: '0.48rem 0.65rem',
                                                            textAlign: 'left',
                                                            fontSize: '0.7rem',
                                                            fontWeight: 700,
                                                            color: '#6B5246',
                                                            textTransform: 'uppercase'
                                                        },
                                                        children: h
                                                    }, h, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 1295,
                                                        columnNumber: 101
                                                    }, this))
                                            }, void 0, false, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 1295,
                                                columnNumber: 24
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 1295,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                            children: (selOrder.items || []).map((item, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                    style: {
                                                        borderBottom: '1px solid #f5f0e8'
                                                    },
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            style: {
                                                                padding: '0.52rem 0.65rem',
                                                                color: '#bbb'
                                                            },
                                                            children: i + 1
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/admin/page.tsx",
                                                            lineNumber: 1299,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            style: {
                                                                padding: '0.52rem 0.65rem',
                                                                fontWeight: 600
                                                            },
                                                            children: item.name
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/admin/page.tsx",
                                                            lineNumber: 1300,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            style: {
                                                                padding: '0.52rem 0.65rem',
                                                                textAlign: 'center',
                                                                fontWeight: 700
                                                            },
                                                            children: item.qty
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/admin/page.tsx",
                                                            lineNumber: 1301,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            style: {
                                                                padding: '0.52rem 0.65rem'
                                                            },
                                                            children: [
                                                                "₹",
                                                                item.price
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/admin/page.tsx",
                                                            lineNumber: 1302,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            style: {
                                                                padding: '0.52rem 0.65rem',
                                                                fontWeight: 700
                                                            },
                                                            children: [
                                                                "₹",
                                                                item.subtotal || item.price * item.qty
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/admin/page.tsx",
                                                            lineNumber: 1303,
                                                            columnNumber: 23
                                                        }, this)
                                                    ]
                                                }, i, true, {
                                                    fileName: "[project]/app/admin/page.tsx",
                                                    lineNumber: 1298,
                                                    columnNumber: 21
                                                }, this))
                                        }, void 0, false, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 1296,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/admin/page.tsx",
                                    lineNumber: 1294,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        textAlign: 'right',
                                        marginTop: '0.65rem'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                fontSize: '0.83rem',
                                                color: '#555'
                                            },
                                            children: [
                                                "Subtotal: ",
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                    children: [
                                                        "₹",
                                                        selOrder.subtotal || selOrder.total
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/admin/page.tsx",
                                                    lineNumber: 1309,
                                                    columnNumber: 74
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 1309,
                                            columnNumber: 17
                                        }, this),
                                        (selOrder.discount || 0) > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                fontSize: '0.83rem',
                                                color: '#16a34a'
                                            },
                                            children: [
                                                "Discount: ",
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                    children: [
                                                        "-₹",
                                                        selOrder.discount
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/admin/page.tsx",
                                                    lineNumber: 1310,
                                                    columnNumber: 106
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 1310,
                                            columnNumber: 46
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                fontSize: '0.98rem',
                                                fontWeight: 900,
                                                color: '#E65C00',
                                                borderTop: '2px solid #f0f0f0',
                                                paddingTop: '0.4rem',
                                                marginTop: '0.3rem'
                                            },
                                            children: [
                                                "Total: ₹",
                                                selOrder.total
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 1311,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/admin/page.tsx",
                                    lineNumber: 1308,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/admin/page.tsx",
                            lineNumber: 1292,
                            columnNumber: 13
                        }, this),
                        selOrder.timeline?.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                padding: '0.75rem 1.7rem 1.4rem',
                                borderTop: '1px solid #f0e4d7'
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        color: '#6B5246',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.06em',
                                        marginBottom: '0.6rem'
                                    },
                                    children: "⏱ Order Timeline"
                                }, void 0, false, {
                                    fileName: "[project]/app/admin/page.tsx",
                                    lineNumber: 1316,
                                    columnNumber: 17
                                }, this),
                                selOrder.timeline.map((ev, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            display: 'flex',
                                            gap: '0.65rem',
                                            alignItems: 'flex-start',
                                            marginBottom: '0.35rem'
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    width: 9,
                                                    height: 9,
                                                    borderRadius: '50%',
                                                    background: STATUS_COLOR[ev.status] || '#888',
                                                    marginTop: 3,
                                                    flexShrink: 0
                                                }
                                            }, void 0, false, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 1319,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        style: {
                                                            fontWeight: 700,
                                                            textTransform: 'capitalize',
                                                            color: STATUS_COLOR[ev.status] || '#333',
                                                            fontSize: '0.8rem'
                                                        },
                                                        children: ev.status
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 1321,
                                                        columnNumber: 23
                                                    }, this),
                                                    ev.by && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        style: {
                                                            color: '#888',
                                                            fontSize: '0.73rem'
                                                        },
                                                        children: [
                                                            " by ",
                                                            ev.by
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 1322,
                                                        columnNumber: 31
                                                    }, this),
                                                    ev.note && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        style: {
                                                            fontSize: '0.72rem',
                                                            color: '#888',
                                                            fontStyle: 'italic'
                                                        },
                                                        children: ev.note
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 1323,
                                                        columnNumber: 33
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        style: {
                                                            fontSize: '0.7rem',
                                                            color: '#bbb'
                                                        },
                                                        children: new Date(ev.timestamp).toLocaleTimeString()
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 1324,
                                                        columnNumber: 23
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 1320,
                                                columnNumber: 21
                                            }, this)
                                        ]
                                    }, i, true, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 1318,
                                        columnNumber: 19
                                    }, this))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/admin/page.tsx",
                            lineNumber: 1315,
                            columnNumber: 15
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/admin/page.tsx",
                    lineNumber: 1270,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/admin/page.tsx",
                lineNumber: 1269,
                columnNumber: 9
            }, this),
            menuModal.open && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "modal-overlay show",
                onClick: ()=>setMenuModal({
                        open: false,
                        item: emptyItem(),
                        isEdit: false
                    }),
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    onClick: (e)=>e.stopPropagation(),
                    style: {
                        background: 'white',
                        borderRadius: 16,
                        width: '100%',
                        maxWidth: 510,
                        maxHeight: '92vh',
                        overflow: 'auto',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                background: 'linear-gradient(135deg,#1A0800,#E65C00)',
                                color: 'white',
                                padding: '1.1rem 1.6rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                borderRadius: '16px 16px 0 0',
                                position: 'sticky',
                                top: 0,
                                zIndex: 2
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    style: {
                                        fontFamily: "'Playfair Display',serif",
                                        fontWeight: 900,
                                        fontSize: '1.05rem'
                                    },
                                    children: menuModal.isEdit ? '✏️ Edit Menu Item' : '➕ Add New Item'
                                }, void 0, false, {
                                    fileName: "[project]/app/admin/page.tsx",
                                    lineNumber: 1339,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: ()=>setMenuModal({
                                            open: false,
                                            item: emptyItem(),
                                            isEdit: false
                                        }),
                                    style: {
                                        background: 'none',
                                        border: 'none',
                                        color: 'white',
                                        fontSize: '1.5rem',
                                        cursor: 'pointer',
                                        lineHeight: 1
                                    },
                                    children: "×"
                                }, void 0, false, {
                                    fileName: "[project]/app/admin/page.tsx",
                                    lineNumber: 1340,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/admin/page.tsx",
                            lineNumber: 1338,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                padding: '1.4rem'
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: '0.85rem',
                                        marginBottom: '0.85rem'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    style: {
                                                        fontSize: '0.76rem',
                                                        fontWeight: 700,
                                                        color: '#555',
                                                        display: 'block',
                                                        marginBottom: '0.28rem'
                                                    },
                                                    children: "Category *"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/admin/page.tsx",
                                                    lineNumber: 1345,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                    value: menuModal.item.category || 'Biryani',
                                                    onChange: (e)=>setMenuModal((m)=>({
                                                                ...m,
                                                                item: {
                                                                    ...m.item,
                                                                    category: e.target.value
                                                                }
                                                            })),
                                                    style: {
                                                        ...inp
                                                    },
                                                    children: CATEGORIES.map((c)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                            value: c,
                                                            children: c
                                                        }, c, false, {
                                                            fileName: "[project]/app/admin/page.tsx",
                                                            lineNumber: 1347,
                                                            columnNumber: 40
                                                        }, this))
                                                }, void 0, false, {
                                                    fileName: "[project]/app/admin/page.tsx",
                                                    lineNumber: 1346,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 1344,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    style: {
                                                        fontSize: '0.76rem',
                                                        fontWeight: 700,
                                                        color: '#555',
                                                        display: 'block',
                                                        marginBottom: '0.28rem'
                                                    },
                                                    children: "Badge"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/admin/page.tsx",
                                                    lineNumber: 1351,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                    value: menuModal.item.badge || '',
                                                    onChange: (e)=>setMenuModal((m)=>({
                                                                ...m,
                                                                item: {
                                                                    ...m.item,
                                                                    badge: e.target.value
                                                                }
                                                            })),
                                                    style: {
                                                        ...inp
                                                    },
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                            value: "",
                                                            children: "— None —"
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/admin/page.tsx",
                                                            lineNumber: 1353,
                                                            columnNumber: 21
                                                        }, this),
                                                        Object.entries(BADGE_LABEL).map(([k, v])=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                value: k,
                                                                children: v
                                                            }, k, false, {
                                                                fileName: "[project]/app/admin/page.tsx",
                                                                lineNumber: 1354,
                                                                columnNumber: 63
                                                            }, this))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/admin/page.tsx",
                                                    lineNumber: 1352,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 1350,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/admin/page.tsx",
                                    lineNumber: 1343,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        marginBottom: '0.85rem'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            style: {
                                                fontSize: '0.76rem',
                                                fontWeight: 700,
                                                color: '#555',
                                                display: 'block',
                                                marginBottom: '0.28rem'
                                            },
                                            children: "Item Name *"
                                        }, void 0, false, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 1359,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            value: menuModal.item.name || '',
                                            onChange: (e)=>setMenuModal((m)=>({
                                                        ...m,
                                                        item: {
                                                            ...m.item,
                                                            name: e.target.value
                                                        }
                                                    })),
                                            placeholder: "e.g. Hyderabadi Chicken Biryani",
                                            style: {
                                                ...inp
                                            }
                                        }, void 0, false, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 1360,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/admin/page.tsx",
                                    lineNumber: 1358,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        marginBottom: '0.85rem'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            style: {
                                                fontSize: '0.76rem',
                                                fontWeight: 700,
                                                color: '#555',
                                                display: 'block',
                                                marginBottom: '0.28rem'
                                            },
                                            children: "Description"
                                        }, void 0, false, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 1363,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                                            value: menuModal.item.desc || '',
                                            onChange: (e)=>setMenuModal((m)=>({
                                                        ...m,
                                                        item: {
                                                            ...m.item,
                                                            desc: e.target.value
                                                        }
                                                    })),
                                            placeholder: "Short appetizing description…",
                                            rows: 2,
                                            style: {
                                                ...inp,
                                                resize: 'vertical'
                                            }
                                        }, void 0, false, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 1364,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/admin/page.tsx",
                                    lineNumber: 1362,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        marginBottom: '0.85rem'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            style: {
                                                fontSize: '0.76rem',
                                                fontWeight: 700,
                                                color: '#555',
                                                display: 'block',
                                                marginBottom: '0.28rem'
                                            },
                                            children: "Price (₹) *"
                                        }, void 0, false, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 1367,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            type: "number",
                                            value: menuModal.item.price || '',
                                            onChange: (e)=>setMenuModal((m)=>({
                                                        ...m,
                                                        item: {
                                                            ...m.item,
                                                            price: parseInt(e.target.value) || 0
                                                        }
                                                    })),
                                            placeholder: "e.g. 280",
                                            min: "1",
                                            style: {
                                                ...inp
                                            }
                                        }, void 0, false, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 1368,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/admin/page.tsx",
                                    lineNumber: 1366,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        marginBottom: '1.1rem'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            style: {
                                                fontSize: '0.76rem',
                                                fontWeight: 700,
                                                color: '#555',
                                                display: 'block',
                                                marginBottom: '0.28rem'
                                            },
                                            children: "Image URL"
                                        }, void 0, false, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 1371,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            value: menuModal.item.img || '',
                                            onChange: (e)=>setMenuModal((m)=>({
                                                        ...m,
                                                        item: {
                                                            ...m.item,
                                                            img: e.target.value
                                                        }
                                                    })),
                                            placeholder: "https://images.unsplash.com/…",
                                            style: {
                                                ...inp
                                            }
                                        }, void 0, false, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 1372,
                                            columnNumber: 17
                                        }, this),
                                        menuModal.item.img && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                width: '100%',
                                                height: '130px',
                                                borderRadius: 8,
                                                overflow: 'hidden',
                                                marginTop: '0.45rem',
                                                background: '#f5f0e8'
                                            },
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                src: menuModal.item.img,
                                                alt: "preview",
                                                style: {
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'cover'
                                                },
                                                onError: (e)=>{
                                                    e.target.style.display = 'none';
                                                }
                                            }, void 0, false, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 1375,
                                                columnNumber: 21
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 1374,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/admin/page.tsx",
                                    lineNumber: 1370,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        display: 'flex',
                                        gap: '0.65rem'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            onClick: ()=>setMenuModal({
                                                    open: false,
                                                    item: emptyItem(),
                                                    isEdit: false
                                                }),
                                            style: {
                                                ...btn('#e5e7eb', '#555'),
                                                flex: 1
                                            },
                                            children: "Cancel"
                                        }, void 0, false, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 1380,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            onClick: saveItem,
                                            style: {
                                                ...btn(),
                                                flex: 2
                                            },
                                            children: menuModal.isEdit ? '💾 Save Changes' : '✅ Add to Menu'
                                        }, void 0, false, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 1381,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/admin/page.tsx",
                                    lineNumber: 1379,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/admin/page.tsx",
                            lineNumber: 1342,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/admin/page.tsx",
                    lineNumber: 1337,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/admin/page.tsx",
                lineNumber: 1336,
                columnNumber: 9
            }, this),
            cancelModal.open && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "modal-overlay show",
                onClick: ()=>setCancelModal({
                        open: false,
                        orderId: ''
                    }),
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    onClick: (e)=>e.stopPropagation(),
                    style: {
                        background: 'white',
                        borderRadius: 16,
                        width: '100%',
                        maxWidth: 390,
                        padding: '1.75rem',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                            style: {
                                fontFamily: "'Playfair Display',serif",
                                color: '#ef4444',
                                marginBottom: '0.4rem',
                                fontSize: '1.1rem'
                            },
                            children: "❌ Cancel Order"
                        }, void 0, false, {
                            fileName: "[project]/app/admin/page.tsx",
                            lineNumber: 1392,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            style: {
                                fontSize: '0.82rem',
                                color: '#666',
                                marginBottom: '0.9rem'
                            },
                            children: "Cannot be undone. Order stays in the Cancellation Log."
                        }, void 0, false, {
                            fileName: "[project]/app/admin/page.tsx",
                            lineNumber: 1393,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                            style: {
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                color: '#555',
                                display: 'block',
                                marginBottom: '0.28rem'
                            },
                            children: "Reason *"
                        }, void 0, false, {
                            fileName: "[project]/app/admin/page.tsx",
                            lineNumber: 1394,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                            value: cancelReason,
                            onChange: (e)=>setCancelReason(e.target.value),
                            placeholder: "e.g. Customer request, wrong order…",
                            rows: 3,
                            style: {
                                ...inp,
                                marginBottom: '0.9rem',
                                resize: 'none'
                            }
                        }, void 0, false, {
                            fileName: "[project]/app/admin/page.tsx",
                            lineNumber: 1395,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                display: 'flex',
                                gap: '0.65rem'
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: ()=>setCancelModal({
                                            open: false,
                                            orderId: ''
                                        }),
                                    style: {
                                        ...btn('#e5e7eb', '#555'),
                                        flex: 1
                                    },
                                    children: "Back"
                                }, void 0, false, {
                                    fileName: "[project]/app/admin/page.tsx",
                                    lineNumber: 1397,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: doCancel,
                                    style: {
                                        ...btn('#ef4444'),
                                        flex: 2
                                    },
                                    children: "Confirm Cancel"
                                }, void 0, false, {
                                    fileName: "[project]/app/admin/page.tsx",
                                    lineNumber: 1398,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/admin/page.tsx",
                            lineNumber: 1396,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/admin/page.tsx",
                    lineNumber: 1391,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/admin/page.tsx",
                lineNumber: 1390,
                columnNumber: 9
            }, this),
            discountModal.open && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "modal-overlay show",
                onClick: ()=>setDiscountModal({
                        open: false,
                        orderId: ''
                    }),
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    onClick: (e)=>e.stopPropagation(),
                    style: {
                        background: 'white',
                        borderRadius: 16,
                        width: '100%',
                        maxWidth: 390,
                        padding: '1.75rem',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                            style: {
                                fontFamily: "'Playfair Display',serif",
                                color: '#8b5cf6',
                                marginBottom: '0.4rem',
                                fontSize: '1.1rem'
                            },
                            children: "🏷️ Apply Discount"
                        }, void 0, false, {
                            fileName: "[project]/app/admin/page.tsx",
                            lineNumber: 1408,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            style: {
                                fontSize: '0.82rem',
                                color: '#666',
                                marginBottom: '0.9rem'
                            },
                            children: "Owner PIN required. Every discount is logged permanently."
                        }, void 0, false, {
                            fileName: "[project]/app/admin/page.tsx",
                            lineNumber: 1409,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                            style: {
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                color: '#555',
                                display: 'block',
                                marginBottom: '0.28rem'
                            },
                            children: "Discount Amount (₹)"
                        }, void 0, false, {
                            fileName: "[project]/app/admin/page.tsx",
                            lineNumber: 1410,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                            type: "number",
                            value: discAmt,
                            onChange: (e)=>setDiscAmt(e.target.value),
                            placeholder: "e.g. 50",
                            style: {
                                ...inp,
                                marginBottom: '0.75rem'
                            }
                        }, void 0, false, {
                            fileName: "[project]/app/admin/page.tsx",
                            lineNumber: 1411,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                            style: {
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                color: '#555',
                                display: 'block',
                                marginBottom: '0.28rem'
                            },
                            children: "Reason"
                        }, void 0, false, {
                            fileName: "[project]/app/admin/page.tsx",
                            lineNumber: 1412,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                            value: discNote,
                            onChange: (e)=>setDiscNote(e.target.value),
                            placeholder: "e.g. Loyalty customer, complaint…",
                            style: {
                                ...inp,
                                marginBottom: '0.75rem'
                            }
                        }, void 0, false, {
                            fileName: "[project]/app/admin/page.tsx",
                            lineNumber: 1413,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                            style: {
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                color: '#555',
                                display: 'block',
                                marginBottom: '0.28rem'
                            },
                            children: "Owner PIN"
                        }, void 0, false, {
                            fileName: "[project]/app/admin/page.tsx",
                            lineNumber: 1414,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                            type: "password",
                            value: pinInput,
                            onChange: (e)=>setPinInput(e.target.value),
                            placeholder: "••••",
                            maxLength: 4,
                            style: {
                                ...inp,
                                letterSpacing: '0.35em',
                                textAlign: 'center',
                                marginBottom: '0.25rem'
                            }
                        }, void 0, false, {
                            fileName: "[project]/app/admin/page.tsx",
                            lineNumber: 1415,
                            columnNumber: 13
                        }, this),
                        pinMsg && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                fontSize: '0.76rem',
                                color: '#ef4444',
                                marginBottom: '0.5rem'
                            },
                            children: pinMsg
                        }, void 0, false, {
                            fileName: "[project]/app/admin/page.tsx",
                            lineNumber: 1416,
                            columnNumber: 24
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                display: 'flex',
                                gap: '0.65rem',
                                marginTop: '0.75rem'
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: ()=>setDiscountModal({
                                            open: false,
                                            orderId: ''
                                        }),
                                    style: {
                                        ...btn('#e5e7eb', '#555'),
                                        flex: 1
                                    },
                                    children: "Cancel"
                                }, void 0, false, {
                                    fileName: "[project]/app/admin/page.tsx",
                                    lineNumber: 1418,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: doDiscount,
                                    style: {
                                        ...btn('#8b5cf6'),
                                        flex: 2
                                    },
                                    children: "Apply Discount"
                                }, void 0, false, {
                                    fileName: "[project]/app/admin/page.tsx",
                                    lineNumber: 1419,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/admin/page.tsx",
                            lineNumber: 1417,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/admin/page.tsx",
                    lineNumber: 1407,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/admin/page.tsx",
                lineNumber: 1406,
                columnNumber: 9
            }, this),
            showPinMgr && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "modal-overlay show",
                onClick: ()=>{
                    setShowPinMgr(false);
                    setNewPin('');
                    setNewPinMsg('');
                },
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    onClick: (e)=>e.stopPropagation(),
                    style: {
                        background: 'white',
                        borderRadius: 16,
                        width: '100%',
                        maxWidth: 350,
                        padding: '1.75rem',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                            style: {
                                fontFamily: "'Playfair Display',serif",
                                marginBottom: '0.3rem',
                                fontSize: '1.1rem'
                            },
                            children: "🔑 Owner PIN"
                        }, void 0, false, {
                            fileName: "[project]/app/admin/page.tsx",
                            lineNumber: 1429,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            style: {
                                fontSize: '0.8rem',
                                color: '#666',
                                marginBottom: '0.9rem'
                            },
                            children: [
                                "Used to authorise discounts. Current PIN: ",
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                    children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getPin"])()
                                }, void 0, false, {
                                    fileName: "[project]/app/admin/page.tsx",
                                    lineNumber: 1430,
                                    columnNumber: 121
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/admin/page.tsx",
                            lineNumber: 1430,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                            style: {
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                color: '#555',
                                display: 'block',
                                marginBottom: '0.28rem'
                            },
                            children: "New 4-digit PIN"
                        }, void 0, false, {
                            fileName: "[project]/app/admin/page.tsx",
                            lineNumber: 1431,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                            type: "password",
                            value: newPin,
                            onChange: (e)=>setNewPin(e.target.value),
                            placeholder: "••••",
                            maxLength: 4,
                            style: {
                                ...inp,
                                letterSpacing: '0.35em',
                                textAlign: 'center',
                                marginBottom: '0.25rem'
                            }
                        }, void 0, false, {
                            fileName: "[project]/app/admin/page.tsx",
                            lineNumber: 1432,
                            columnNumber: 13
                        }, this),
                        newPinMsg && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                fontSize: '0.76rem',
                                color: newPinMsg.includes('✓') ? '#16a34a' : '#ef4444',
                                marginBottom: '0.5rem'
                            },
                            children: newPinMsg
                        }, void 0, false, {
                            fileName: "[project]/app/admin/page.tsx",
                            lineNumber: 1433,
                            columnNumber: 27
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: ()=>{
                                if (!/^\d{4}$/.test(newPin)) {
                                    setNewPinMsg('❌ Must be exactly 4 digits');
                                    return;
                                }
                                (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["savePin"])(newPin);
                                setNewPinMsg('✓ PIN updated!');
                                setTimeout(()=>{
                                    setShowPinMgr(false);
                                    setNewPin('');
                                    setNewPinMsg('');
                                }, 1500);
                            },
                            style: {
                                ...btn(),
                                width: '100%',
                                marginTop: '0.5rem'
                            },
                            children: "Save PIN"
                        }, void 0, false, {
                            fileName: "[project]/app/admin/page.tsx",
                            lineNumber: 1434,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/admin/page.tsx",
                    lineNumber: 1428,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/admin/page.tsx",
                lineNumber: 1427,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/admin/page.tsx",
        lineNumber: 353,
        columnNumber: 5
    }, this);
}
_s(AdminPage, "CUgGsoJ4phHSAZSwU+i+CJi8T54=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"]
    ];
});
_c = AdminPage;
var _c;
__turbopack_context__.k.register(_c, "AdminPage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=_62661deb._.js.map