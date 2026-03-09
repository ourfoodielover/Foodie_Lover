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
"[project]/app/waiter/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>WaiterPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/storage.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/auth.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
// Waiter's domain: deliver food to table (prepared → served)
// Kitchen (pending→preparing→prepared) and Payment (served→completed) are NOT waiter's domain
const WAITER_FLOW = [
    'prepared',
    'served'
];
const STATUS_COLOR = {
    awaiting_waiter: '#f97316',
    pending: '#f59e0b',
    preparing: '#3b82f6',
    prepared: '#8b5cf6',
    served: '#06b6d4',
    completed: '#16a34a',
    cancelled: '#ef4444'
};
function WaiterPage() {
    _s();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const [session, setSession] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [authChecked, setAuthChecked] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [orders, setOrders] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [calls, setCalls] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [tabs, setTabs] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [filter, setFilter] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('active');
    const [time, setTime] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    // Cancel modal
    const [cancelModal, setCancelModal] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [cancelId, setCancelId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [cancelReason, setCancelReason] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [cancelConfirm, setCancelConfirm] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false); // second confirmation step
    // Order detail modal
    const [detailOrder, setDetailOrder] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    // Processing guard — prevents double-clicks on advance/cancel
    const processingRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(new Set());
    // ── Auth check ────────────────────────────────────────────────────────────────
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "WaiterPage.useEffect": ()=>{
            const s = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getSession"])('waiter');
            if (!s) {
                router.replace('/waiter/login');
                return;
            }
            setSession(s);
            setAuthChecked(true);
        }
    }["WaiterPage.useEffect"], [
        router
    ]);
    // ── Data refresh ─────────────────────────────────────────────────────────────
    const refresh = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "WaiterPage.useCallback[refresh]": ()=>{
            const all = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getOrders"])();
            setOrders(all);
            setCalls((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getWaiterCalls"])());
            setTabs((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getTabs"])());
            // Keep detail modal fresh — re-find the order from latest data
            setDetailOrder({
                "WaiterPage.useCallback[refresh]": (prev)=>{
                    if (!prev) return null;
                    const updated = all.find({
                        "WaiterPage.useCallback[refresh].updated": (o)=>o.id === prev.id
                    }["WaiterPage.useCallback[refresh].updated"]);
                    return updated ?? null;
                }
            }["WaiterPage.useCallback[refresh]"]);
        }
    }["WaiterPage.useCallback[refresh]"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "WaiterPage.useEffect": ()=>{
            if (!authChecked) return;
            refresh();
            const t1 = setInterval(refresh, 3000);
            const t2 = setInterval({
                "WaiterPage.useEffect.t2": ()=>setTime(new Date().toLocaleTimeString())
            }["WaiterPage.useEffect.t2"], 1000);
            return ({
                "WaiterPage.useEffect": ()=>{
                    clearInterval(t1);
                    clearInterval(t2);
                }
            })["WaiterPage.useEffect"];
        }
    }["WaiterPage.useEffect"], [
        refresh,
        authChecked
    ]);
    function logout() {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clearSession"])('waiter');
        router.replace('/waiter/login');
    }
    // Escape key handler for all modals
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "WaiterPage.useEffect": ()=>{
            function handleKey(e) {
                if (e.key !== 'Escape') return;
                if (cancelModal) {
                    setCancelModal(false);
                    setCancelConfirm(false);
                    setCancelId('');
                    setCancelReason('');
                    return;
                }
                if (detailOrder) {
                    setDetailOrder(null);
                    return;
                }
            }
            window.addEventListener('keydown', handleKey);
            return ({
                "WaiterPage.useEffect": ()=>window.removeEventListener('keydown', handleKey)
            })["WaiterPage.useEffect"];
        }
    }["WaiterPage.useEffect"], [
        cancelModal,
        detailOrder
    ]);
    // ── Advance order (WAITER domain only: prepared → served) ─────────────────
    function advance(id, cur) {
        if (processingRef.current.has(id)) return;
        const curIdx = WAITER_FLOW.indexOf(cur);
        if (curIdx === -1) return; // not a waiter-domain status — do nothing
        // Cannot advance past 'completed' (last step)
        if (curIdx >= WAITER_FLOW.length - 1) return;
        const next = WAITER_FLOW[curIdx + 1];
        // Validate against lifecycle rules
        if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isValidTransition"])(cur, next)) return;
        processingRef.current.add(id);
        const ok = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["updateOrderStatus"])(id, next, session?.name || 'Waiter');
        if (ok) refresh();
        setTimeout(()=>{
            processingRef.current.delete(id);
        }, 500);
    }
    // ── Confirm order (awaiting_waiter → pending → kitchen queue) ───────────────
    function confirmOrder(id) {
        if (processingRef.current.has(id)) return;
        processingRef.current.add(id);
        const ok = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["updateOrderStatus"])(id, 'pending', session?.name || 'Waiter');
        if (ok) refresh();
        setTimeout(()=>{
            processingRef.current.delete(id);
        }, 500);
    }
    // ── Cancel order (two-step) ───────────────────────────────────────────────────
    function openCancel(id) {
        setCancelId(id);
        setCancelReason('');
        setCancelConfirm(false);
        setCancelModal(true);
    }
    function proceedToConfirm() {
        if (!cancelReason.trim()) {
            alert('Please enter a reason for cancellation');
            return;
        }
        setCancelConfirm(true);
    }
    function confirmCancel() {
        if (!cancelReason.trim()) return;
        if (processingRef.current.has(cancelId)) return;
        processingRef.current.add(cancelId);
        const ok = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cancelOrder"])(cancelId, cancelReason.trim(), session?.name || 'Waiter');
        if (!ok) {
            alert('This order can no longer be cancelled (it may have already been prepared or cancelled).');
        }
        setCancelModal(false);
        setCancelConfirm(false);
        setCancelId('');
        setCancelReason('');
        refresh();
        setTimeout(()=>{
            processingRef.current.delete(cancelId);
        }, 500);
    }
    // ── Waiter calls ─────────────────────────────────────────────────────────────
    function handleResolveCall(callId) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["resolveWaiterCall"])(callId, session?.name || 'Waiter');
        refresh();
    }
    // ── Derived data ─────────────────────────────────────────────────────────────
    const activeCalls = calls.filter((c)=>!c.resolved);
    const FILTERS = [
        'active',
        'awaiting_waiter',
        'pending',
        'preparing',
        'prepared',
        'served',
        'completed',
        'cancelled',
        'all'
    ];
    const filtered = (()=>{
        if (filter === 'active') return orders.filter((o)=>[
                'awaiting_waiter',
                'pending',
                'preparing',
                'prepared',
                'served'
            ].includes(o.status));
        if (filter === 'all') return orders;
        return orders.filter((o)=>o.status === filter);
    })();
    // Orders that need waiter confirmation (dine-in orders from QR table scanning)
    const awaitingOrders = orders.filter((o)=>o.status === 'awaiting_waiter').sort((a, b)=>new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()); // oldest first
    // Most-recent first, capped at 60 for performance
    const shown = filtered.slice().reverse().slice(0, 60);
    // ── Styles ───────────────────────────────────────────────────────────────────
    const inp = {
        width: '100%',
        padding: '0.6rem 0.75rem',
        border: '2px solid #e5e7eb',
        borderRadius: '8px',
        fontFamily: 'Poppins,sans-serif',
        fontSize: '0.88rem'
    };
    const btn = (bg = '#E65C00', c = 'white')=>({
            background: bg,
            color: c,
            border: 'none',
            borderRadius: '8px',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '0.8rem',
            fontFamily: 'Poppins,sans-serif',
            padding: '0.4rem 0.85rem'
        });
    // ── Auth guard ────────────────────────────────────────────────────────────────
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
                        children: "🧑‍🍳"
                    }, void 0, false, {
                        fileName: "[project]/app/waiter/page.tsx",
                        lineNumber: 207,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: "Loading Waiter Portal…"
                    }, void 0, false, {
                        fileName: "[project]/app/waiter/page.tsx",
                        lineNumber: 208,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/waiter/page.tsx",
                lineNumber: 206,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/app/waiter/page.tsx",
            lineNumber: 205,
            columnNumber: 7
        }, this);
    }
    // ── Render ───────────────────────────────────────────────────────────────────
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
                    padding: '1rem 1.5rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                    position: 'sticky',
                    top: 0,
                    zIndex: 50
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
                                children: "🧑‍🍳"
                            }, void 0, false, {
                                fileName: "[project]/app/waiter/page.tsx",
                                lineNumber: 221,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            fontFamily: "'Playfair Display',serif",
                                            fontSize: '1.2rem',
                                            fontWeight: 900
                                        },
                                        children: "Waiter Portal"
                                    }, void 0, false, {
                                        fileName: "[project]/app/waiter/page.tsx",
                                        lineNumber: 223,
                                        columnNumber: 13
                                    }, this),
                                    session?.name && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            fontSize: '0.7rem',
                                            color: '#F9A826'
                                        },
                                        children: [
                                            "👤 ",
                                            session.name
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/waiter/page.tsx",
                                        lineNumber: 224,
                                        columnNumber: 31
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/waiter/page.tsx",
                                lineNumber: 222,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/waiter/page.tsx",
                        lineNumber: 220,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem'
                        },
                        children: [
                            activeCalls.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    background: '#ef4444',
                                    color: 'white',
                                    borderRadius: '20px',
                                    padding: '0.3rem 0.75rem',
                                    fontSize: '0.75rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    animation: 'pulse 1s infinite'
                                },
                                onClick: ()=>setFilter('active'),
                                children: [
                                    "🔔 ",
                                    activeCalls.length,
                                    " Call",
                                    activeCalls.length > 1 ? 's' : ''
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/waiter/page.tsx",
                                lineNumber: 229,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    fontSize: '0.8rem',
                                    color: '#F9A826'
                                },
                                children: time
                            }, void 0, false, {
                                fileName: "[project]/app/waiter/page.tsx",
                                lineNumber: 236,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: logout,
                                style: {
                                    ...btn('#ef444430', '#ef4444'),
                                    fontSize: '0.72rem',
                                    border: '1px solid #ef444440'
                                },
                                children: "🚪 Logout"
                            }, void 0, false, {
                                fileName: "[project]/app/waiter/page.tsx",
                                lineNumber: 237,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/waiter/page.tsx",
                        lineNumber: 227,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/waiter/page.tsx",
                lineNumber: 219,
                columnNumber: 7
            }, this),
            activeCalls.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    background: '#fef2f2',
                    borderBottom: '2px solid #fecaca',
                    padding: '0.75rem 1.5rem'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            fontSize: '0.8rem',
                            fontWeight: 800,
                            color: '#dc2626',
                            marginBottom: '0.4rem'
                        },
                        children: [
                            "🔔 Table Assistance Requests",
                            activeCalls.length > 5 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                style: {
                                    marginLeft: '0.5rem',
                                    fontWeight: 400
                                },
                                children: [
                                    "(showing 5 of ",
                                    activeCalls.length,
                                    ")"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/waiter/page.tsx",
                                lineNumber: 251,
                                columnNumber: 40
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/waiter/page.tsx",
                        lineNumber: 249,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.4rem'
                        },
                        children: activeCalls.slice(0, 5).map((call)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    background: 'white',
                                    padding: '0.5rem 0.85rem',
                                    borderRadius: '8px',
                                    border: '1px solid #fecaca'
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                style: {
                                                    fontWeight: 700,
                                                    fontSize: '0.82rem',
                                                    color: '#1A0800'
                                                },
                                                children: [
                                                    "🪑 Table ",
                                                    call.tableId
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/waiter/page.tsx",
                                                lineNumber: 257,
                                                columnNumber: 19
                                            }, this),
                                            call.customerName && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                style: {
                                                    fontSize: '0.75rem',
                                                    color: '#666',
                                                    marginLeft: '0.4rem'
                                                },
                                                children: [
                                                    "(",
                                                    call.customerName,
                                                    ")"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/waiter/page.tsx",
                                                lineNumber: 258,
                                                columnNumber: 41
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                style: {
                                                    fontSize: '0.75rem',
                                                    color: '#888',
                                                    marginLeft: '0.5rem'
                                                },
                                                children: [
                                                    "— ",
                                                    call.message
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/waiter/page.tsx",
                                                lineNumber: 259,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                style: {
                                                    fontSize: '0.68rem',
                                                    color: '#bbb',
                                                    marginLeft: '0.5rem'
                                                },
                                                children: [
                                                    Math.floor((Date.now() - new Date(call.timestamp).getTime()) / 60000),
                                                    "m ago"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/waiter/page.tsx",
                                                lineNumber: 260,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/waiter/page.tsx",
                                        lineNumber: 256,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>handleResolveCall(call.id),
                                        style: {
                                            ...btn('#16a34a'),
                                            fontSize: '0.72rem',
                                            padding: '0.25rem 0.7rem'
                                        },
                                        children: "✓ Done"
                                    }, void 0, false, {
                                        fileName: "[project]/app/waiter/page.tsx",
                                        lineNumber: 264,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, call.id, true, {
                                fileName: "[project]/app/waiter/page.tsx",
                                lineNumber: 255,
                                columnNumber: 15
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/app/waiter/page.tsx",
                        lineNumber: 253,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/waiter/page.tsx",
                lineNumber: 248,
                columnNumber: 9
            }, this),
            awaitingOrders.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    background: '#fff7ed',
                    borderBottom: '3px solid #f97316',
                    padding: '0.9rem 1.5rem'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            fontSize: '0.82rem',
                            fontWeight: 800,
                            color: '#92400e',
                            marginBottom: '0.6rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                style: {
                                    animation: 'pulse 1s infinite',
                                    display: 'inline-block'
                                },
                                children: "🔔"
                            }, void 0, false, {
                                fileName: "[project]/app/waiter/page.tsx",
                                lineNumber: 280,
                                columnNumber: 13
                            }, this),
                            awaitingOrders.length,
                            " Order",
                            awaitingOrders.length > 1 ? 's' : '',
                            " Awaiting Your Confirmation",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                style: {
                                    fontSize: '0.72rem',
                                    fontWeight: 400,
                                    color: '#b45309'
                                },
                                children: "— Go to the table, verify the customer is present, then confirm"
                            }, void 0, false, {
                                fileName: "[project]/app/waiter/page.tsx",
                                lineNumber: 282,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/waiter/page.tsx",
                        lineNumber: 279,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5rem'
                        },
                        children: awaitingOrders.map((order)=>{
                            const isProc = processingRef.current.has(order.id);
                            const mins = Math.floor((Date.now() - new Date(order.timestamp).getTime()) / 60000);
                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    background: 'white',
                                    borderRadius: '10px',
                                    border: '2px solid #fed7aa',
                                    padding: '0.7rem 1rem',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    flexWrap: 'wrap'
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            flex: 1,
                                            minWidth: 200
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    fontWeight: 800,
                                                    fontSize: '0.88rem',
                                                    color: '#1A0800'
                                                },
                                                children: [
                                                    "🪑 Table ",
                                                    order.tableId,
                                                    "  ·  ",
                                                    order.customerName
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/waiter/page.tsx",
                                                lineNumber: 293,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    fontSize: '0.76rem',
                                                    color: '#666',
                                                    marginTop: '0.2rem',
                                                    lineHeight: 1.5
                                                },
                                                children: [
                                                    order.items.slice(0, 3).map((i)=>`${i.name} ×${i.qty}`).join(', '),
                                                    order.items.length > 3 ? ` +${order.items.length - 3} more` : ''
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/waiter/page.tsx",
                                                lineNumber: 296,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    fontSize: '0.72rem',
                                                    color: '#E65C00',
                                                    fontWeight: 700,
                                                    marginTop: '0.15rem'
                                                },
                                                children: [
                                                    "₹",
                                                    order.total,
                                                    "  ·  ",
                                                    mins,
                                                    "m ago"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/waiter/page.tsx",
                                                lineNumber: 300,
                                                columnNumber: 21
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/waiter/page.tsx",
                                        lineNumber: 292,
                                        columnNumber: 19
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            display: 'flex',
                                            gap: '0.4rem',
                                            flexShrink: 0
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                onClick: ()=>confirmOrder(order.id),
                                                disabled: isProc,
                                                style: {
                                                    ...btn('#16a34a'),
                                                    fontSize: '0.78rem',
                                                    padding: '0.45rem 1rem',
                                                    opacity: isProc ? 0.5 : 1,
                                                    cursor: isProc ? 'not-allowed' : 'pointer'
                                                },
                                                children: "✅ Confirm Order"
                                            }, void 0, false, {
                                                fileName: "[project]/app/waiter/page.tsx",
                                                lineNumber: 305,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                onClick: ()=>openCancel(order.id),
                                                disabled: isProc,
                                                style: {
                                                    ...btn('#ef4444'),
                                                    fontSize: '0.78rem',
                                                    padding: '0.45rem 0.75rem',
                                                    opacity: isProc ? 0.5 : 1,
                                                    cursor: isProc ? 'not-allowed' : 'pointer'
                                                },
                                                children: "✕ Reject"
                                            }, void 0, false, {
                                                fileName: "[project]/app/waiter/page.tsx",
                                                lineNumber: 312,
                                                columnNumber: 21
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/waiter/page.tsx",
                                        lineNumber: 304,
                                        columnNumber: 19
                                    }, this)
                                ]
                            }, order.id, true, {
                                fileName: "[project]/app/waiter/page.tsx",
                                lineNumber: 291,
                                columnNumber: 17
                            }, this);
                        })
                    }, void 0, false, {
                        fileName: "[project]/app/waiter/page.tsx",
                        lineNumber: 286,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/waiter/page.tsx",
                lineNumber: 278,
                columnNumber: 9
            }, this),
            tabs.filter((t)=>t.tabStatus === 'awaiting_payment').length > 0 && (()=>{
                const awaitingPaymentTabs = tabs.filter((t)=>t.tabStatus === 'awaiting_payment');
                // For each tab, check if there are still unserved orders (prepared but not yet served)
                const tabsWithPendingFood = awaitingPaymentTabs.filter((tab)=>orders.some((o)=>tab.orderIds.includes(o.id) && o.status === 'prepared'));
                const tabsReadyForCounter = awaitingPaymentTabs.filter((tab)=>!orders.some((o)=>tab.orderIds.includes(o.id) && o.status === 'prepared'));
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        borderBottom: '2px solid #f59e0b'
                    },
                    children: [
                        tabsWithPendingFood.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                background: '#fff7ed',
                                padding: '0.75rem 1.5rem',
                                borderBottom: tabsReadyForCounter.length > 0 ? '1px solid #fed7aa' : 'none'
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        fontWeight: 800,
                                        color: '#c2410c',
                                        fontSize: '0.88rem',
                                        marginBottom: '0.5rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.4rem'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            style: {
                                                animation: 'pulse 1s infinite',
                                                display: 'inline-block'
                                            },
                                            children: "🍽️"
                                        }, void 0, false, {
                                            fileName: "[project]/app/waiter/page.tsx",
                                            lineNumber: 345,
                                            columnNumber: 19
                                        }, this),
                                        "Bill Requested — Serve food first, then direct to counter"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/waiter/page.tsx",
                                    lineNumber: 344,
                                    columnNumber: 17
                                }, this),
                                tabsWithPendingFood.map((tab)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '0.3rem 0',
                                            fontSize: '0.82rem'
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                style: {
                                                    color: '#9a3412',
                                                    fontWeight: 600
                                                },
                                                children: [
                                                    "🪑 Table ",
                                                    tab.tableId,
                                                    " — ",
                                                    tab.customerName,
                                                    tab.partySize && tab.partySize > 1 ? ` (${tab.partySize} guests)` : '',
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        style: {
                                                            marginLeft: '0.4rem',
                                                            fontSize: '0.72rem',
                                                            background: '#fed7aa',
                                                            padding: '0.1rem 0.4rem',
                                                            borderRadius: 4,
                                                            color: '#c2410c',
                                                            fontWeight: 700
                                                        },
                                                        children: "⚡ Food ready — serve now"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/waiter/page.tsx",
                                                        lineNumber: 353,
                                                        columnNumber: 23
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/waiter/page.tsx",
                                                lineNumber: 350,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                style: {
                                                    fontWeight: 900,
                                                    color: '#E65C00'
                                                },
                                                children: [
                                                    "₹",
                                                    tab.totalAmount
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/waiter/page.tsx",
                                                lineNumber: 357,
                                                columnNumber: 21
                                            }, this)
                                        ]
                                    }, tab.id, true, {
                                        fileName: "[project]/app/waiter/page.tsx",
                                        lineNumber: 349,
                                        columnNumber: 19
                                    }, this))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/waiter/page.tsx",
                            lineNumber: 343,
                            columnNumber: 15
                        }, this),
                        tabsReadyForCounter.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                background: '#fef9c3',
                                padding: '0.75rem 1.5rem'
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        fontWeight: 800,
                                        color: '#92400e',
                                        fontSize: '0.88rem',
                                        marginBottom: '0.5rem'
                                    },
                                    children: "💳 Bill Ready — Please direct customer(s) to the counter"
                                }, void 0, false, {
                                    fileName: "[project]/app/waiter/page.tsx",
                                    lineNumber: 366,
                                    columnNumber: 17
                                }, this),
                                tabsReadyForCounter.map((tab)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '0.3rem 0',
                                            fontSize: '0.82rem'
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                style: {
                                                    color: '#92400e',
                                                    fontWeight: 600
                                                },
                                                children: [
                                                    "🪑 Table ",
                                                    tab.tableId,
                                                    " — ",
                                                    tab.customerName,
                                                    tab.partySize && tab.partySize > 1 ? ` (${tab.partySize} guests)` : ''
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/waiter/page.tsx",
                                                lineNumber: 371,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                style: {
                                                    fontWeight: 900,
                                                    color: '#E65C00'
                                                },
                                                children: [
                                                    "₹",
                                                    tab.totalAmount
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/waiter/page.tsx",
                                                lineNumber: 375,
                                                columnNumber: 21
                                            }, this)
                                        ]
                                    }, tab.id, true, {
                                        fileName: "[project]/app/waiter/page.tsx",
                                        lineNumber: 370,
                                        columnNumber: 19
                                    }, this))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/waiter/page.tsx",
                            lineNumber: 365,
                            columnNumber: 15
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/waiter/page.tsx",
                    lineNumber: 340,
                    columnNumber: 11
                }, this);
            })(),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    padding: '0.75rem 1.5rem',
                    display: 'flex',
                    gap: '0.4rem',
                    overflowX: 'auto'
                },
                children: FILTERS.map((s)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>setFilter(s),
                        style: {
                            padding: '0.35rem 0.85rem',
                            borderRadius: '20px',
                            cursor: 'pointer',
                            fontFamily: 'Poppins,sans-serif',
                            fontWeight: 600,
                            fontSize: '0.78rem',
                            whiteSpace: 'nowrap',
                            border: `2px solid ${filter === s ? '#E65C00' : '#ddd'}`,
                            background: filter === s ? '#E65C00' : 'white',
                            color: filter === s ? 'white' : '#666',
                            textTransform: 'capitalize'
                        },
                        children: s === 'active' ? '⚡ Active' : s === 'all' ? 'All Orders' : s === 'awaiting_waiter' ? `⏳ Awaiting${awaitingOrders.length > 0 ? ` (${awaitingOrders.length})` : ''}` : s
                    }, s, false, {
                        fileName: "[project]/app/waiter/page.tsx",
                        lineNumber: 387,
                        columnNumber: 11
                    }, this))
            }, void 0, false, {
                fileName: "[project]/app/waiter/page.tsx",
                lineNumber: 385,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    padding: '0 1.5rem 2rem',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))',
                    gap: '1rem'
                },
                children: !shown.length ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        gridColumn: '1/-1',
                        textAlign: 'center',
                        color: '#999',
                        padding: '3rem',
                        fontSize: '1rem'
                    },
                    children: "No orders found"
                }, void 0, false, {
                    fileName: "[project]/app/waiter/page.tsx",
                    lineNumber: 403,
                    columnNumber: 11
                }, this) : shown.map((order)=>{
                    const mins = Math.floor((Date.now() - new Date(order.timestamp).getTime()) / 60000);
                    const isAwaitingConf = order.status === 'awaiting_waiter';
                    const canCancel = [
                        'awaiting_waiter',
                        'pending',
                        'preparing'
                    ].includes(order.status);
                    const isProc = processingRef.current.has(order.id);
                    // Waiter can only advance within their own domain (not awaiting_waiter — that has dedicated confirm btn)
                    const waiterIdx = WAITER_FLOW.indexOf(order.status);
                    const canAdvance = waiterIdx !== -1 && waiterIdx < WAITER_FLOW.length - 1 && order.status !== 'cancelled';
                    const nextStatus = canAdvance ? WAITER_FLOW[waiterIdx + 1] : null;
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            background: 'white',
                            borderRadius: '12px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                            overflow: 'hidden',
                            borderLeft: `4px solid ${STATUS_COLOR[order.status] || '#ddd'}`,
                            opacity: order.status === 'cancelled' ? 0.7 : 1
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    padding: '0.8rem 1rem',
                                    borderBottom: '1px solid #f5f0e8',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                    cursor: 'pointer'
                                },
                                onClick: ()=>setDetailOrder(order),
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    fontWeight: 800,
                                                    fontSize: '0.9rem',
                                                    color: '#1A0800'
                                                },
                                                children: order.id
                                            }, void 0, false, {
                                                fileName: "[project]/app/waiter/page.tsx",
                                                lineNumber: 428,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    fontSize: '0.73rem',
                                                    color: '#888',
                                                    marginTop: '0.15rem'
                                                },
                                                children: [
                                                    order.type === 'dine-in' ? `🪑 Table ${order.tableId}` : '🛍️ Pickup',
                                                    " • ",
                                                    order.customerName
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/waiter/page.tsx",
                                                lineNumber: 429,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    fontSize: '0.7rem',
                                                    color: '#aaa'
                                                },
                                                children: [
                                                    "⏱ ",
                                                    mins,
                                                    "m ago"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/waiter/page.tsx",
                                                lineNumber: 432,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/waiter/page.tsx",
                                        lineNumber: 427,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'flex-end',
                                            gap: '0.25rem'
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                style: {
                                                    fontSize: '0.7rem',
                                                    fontWeight: 700,
                                                    background: (STATUS_COLOR[order.status] || '#ddd') + '20',
                                                    color: STATUS_COLOR[order.status] || '#666',
                                                    padding: '0.18rem 0.55rem',
                                                    borderRadius: '10px',
                                                    textTransform: 'uppercase'
                                                },
                                                children: order.status
                                            }, void 0, false, {
                                                fileName: "[project]/app/waiter/page.tsx",
                                                lineNumber: 435,
                                                columnNumber: 19
                                            }, this),
                                            order.staffName && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                style: {
                                                    fontSize: '0.65rem',
                                                    color: '#aaa'
                                                },
                                                children: [
                                                    "by ",
                                                    order.staffName
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/waiter/page.tsx",
                                                lineNumber: 438,
                                                columnNumber: 39
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/waiter/page.tsx",
                                        lineNumber: 434,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/waiter/page.tsx",
                                lineNumber: 423,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    padding: '0.5rem 1rem'
                                },
                                children: [
                                    (order.items || []).slice(0, 3).map((item, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                fontSize: '0.82rem',
                                                padding: '0.18rem 0'
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    style: {
                                                        color: '#444'
                                                    },
                                                    children: item.name
                                                }, void 0, false, {
                                                    fileName: "[project]/app/waiter/page.tsx",
                                                    lineNumber: 446,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    style: {
                                                        fontWeight: 700,
                                                        color: '#E65C00'
                                                    },
                                                    children: [
                                                        "×",
                                                        item.qty
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/waiter/page.tsx",
                                                    lineNumber: 447,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, i, true, {
                                            fileName: "[project]/app/waiter/page.tsx",
                                            lineNumber: 445,
                                            columnNumber: 19
                                        }, this)),
                                    (order.items || []).length > 3 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            fontSize: '0.72rem',
                                            color: '#aaa'
                                        },
                                        children: [
                                            "+",
                                            (order.items || []).length - 3,
                                            " more items"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/waiter/page.tsx",
                                        lineNumber: 451,
                                        columnNumber: 19
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/waiter/page.tsx",
                                lineNumber: 443,
                                columnNumber: 15
                            }, this),
                            order.status === 'cancelled' && order.cancelReason && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    padding: '0.35rem 1rem',
                                    background: '#fef2f2',
                                    fontSize: '0.72rem',
                                    color: '#dc2626'
                                },
                                children: [
                                    "❌ ",
                                    order.cancelReason
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/waiter/page.tsx",
                                lineNumber: 457,
                                columnNumber: 17
                            }, this),
                            (()=>{
                                const orderTab = tabs.find((t)=>t.orderIds.includes(order.id) && t.tabStatus === 'awaiting_payment');
                                return orderTab ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        padding: '0.35rem 1rem',
                                        background: '#fef3c7',
                                        fontSize: '0.72rem',
                                        color: '#92400e',
                                        fontWeight: 700
                                    },
                                    children: "💳 Bill Requested"
                                }, void 0, false, {
                                    fileName: "[project]/app/waiter/page.tsx",
                                    lineNumber: 466,
                                    columnNumber: 19
                                }, this) : null;
                            })(),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    padding: '0.6rem 1rem',
                                    borderTop: '1px solid #f5f0e8',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    flexWrap: 'wrap'
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.4rem'
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                style: {
                                                    fontWeight: 800,
                                                    color: '#E65C00',
                                                    fontSize: '0.9rem'
                                                },
                                                children: [
                                                    "₹",
                                                    order.total
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/waiter/page.tsx",
                                                lineNumber: 475,
                                                columnNumber: 19
                                            }, this),
                                            (()=>{
                                                const orderTab = tabs.find((t)=>t.orderIds.includes(order.id) && t.tabStatus === 'awaiting_payment');
                                                return orderTab ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    style: {
                                                        fontSize: '0.65rem',
                                                        fontWeight: 700,
                                                        color: '#92400e',
                                                        background: '#fef3c7',
                                                        padding: '0.1rem 0.4rem',
                                                        borderRadius: '6px',
                                                        display: 'inline-block'
                                                    },
                                                    children: "💳 Bill Requested"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/waiter/page.tsx",
                                                    lineNumber: 479,
                                                    columnNumber: 23
                                                }, this) : null;
                                            })()
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/waiter/page.tsx",
                                        lineNumber: 474,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            display: 'flex',
                                            gap: '0.4rem',
                                            alignItems: 'center',
                                            justifySelf: 'flex-end'
                                        },
                                        children: [
                                            isAwaitingConf && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                onClick: ()=>confirmOrder(order.id),
                                                disabled: isProc,
                                                style: {
                                                    ...btn('#16a34a'),
                                                    fontSize: '0.72rem',
                                                    padding: '0.3rem 0.75rem',
                                                    opacity: isProc ? 0.5 : 1,
                                                    cursor: isProc ? 'not-allowed' : 'pointer'
                                                },
                                                children: "✅ Confirm"
                                            }, void 0, false, {
                                                fileName: "[project]/app/waiter/page.tsx",
                                                lineNumber: 488,
                                                columnNumber: 21
                                            }, this),
                                            canCancel && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                onClick: ()=>openCancel(order.id),
                                                disabled: isProc,
                                                style: {
                                                    ...btn('#ef4444'),
                                                    fontSize: '0.72rem',
                                                    padding: '0.3rem 0.65rem',
                                                    opacity: isProc ? 0.5 : 1,
                                                    cursor: isProc ? 'not-allowed' : 'pointer'
                                                },
                                                children: "✕ Cancel"
                                            }, void 0, false, {
                                                fileName: "[project]/app/waiter/page.tsx",
                                                lineNumber: 497,
                                                columnNumber: 21
                                            }, this),
                                            canAdvance && nextStatus && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                onClick: ()=>advance(order.id, order.status),
                                                disabled: isProc,
                                                style: {
                                                    background: isProc ? '#bbb' : '#7c3aed',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    fontWeight: 800,
                                                    cursor: isProc ? 'not-allowed' : 'pointer',
                                                    fontSize: '0.72rem',
                                                    fontFamily: 'Poppins,sans-serif',
                                                    padding: '0.3rem 0.75rem'
                                                },
                                                children: isProc ? '⏳...' : '🍽️ Mark Served'
                                            }, void 0, false, {
                                                fileName: "[project]/app/waiter/page.tsx",
                                                lineNumber: 506,
                                                columnNumber: 21
                                            }, this),
                                            order.status === 'completed' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                style: {
                                                    color: '#16a34a',
                                                    fontSize: '0.8rem',
                                                    fontWeight: 700
                                                },
                                                children: "✅ Done"
                                            }, void 0, false, {
                                                fileName: "[project]/app/waiter/page.tsx",
                                                lineNumber: 521,
                                                columnNumber: 21
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/waiter/page.tsx",
                                        lineNumber: 485,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/waiter/page.tsx",
                                lineNumber: 473,
                                columnNumber: 15
                            }, this)
                        ]
                    }, order.id, true, {
                        fileName: "[project]/app/waiter/page.tsx",
                        lineNumber: 417,
                        columnNumber: 13
                    }, this);
                })
            }, void 0, false, {
                fileName: "[project]/app/waiter/page.tsx",
                lineNumber: 401,
                columnNumber: 7
            }, this),
            cancelModal && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 200
                },
                onClick: ()=>{
                    setCancelModal(false);
                    setCancelConfirm(false);
                    setCancelId('');
                    setCancelReason('');
                },
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    onClick: (e)=>e.stopPropagation(),
                    style: {
                        background: 'white',
                        borderRadius: '16px',
                        padding: '2rem',
                        width: '380px',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
                    },
                    children: !cancelConfirm ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                style: {
                                    fontFamily: "'Playfair Display',serif",
                                    marginBottom: '0.5rem',
                                    color: '#dc2626'
                                },
                                children: "❌ Cancel Order"
                            }, void 0, false, {
                                fileName: "[project]/app/waiter/page.tsx",
                                lineNumber: 539,
                                columnNumber: 17
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                style: {
                                    fontSize: '0.8rem',
                                    color: '#888',
                                    marginBottom: '1rem'
                                },
                                children: [
                                    "Order ",
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                        children: cancelId
                                    }, void 0, false, {
                                        fileName: "[project]/app/waiter/page.tsx",
                                        lineNumber: 541,
                                        columnNumber: 25
                                    }, this),
                                    " — This will be permanently logged. Please provide a reason."
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/waiter/page.tsx",
                                lineNumber: 540,
                                columnNumber: 17
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                                value: cancelReason,
                                onChange: (e)=>setCancelReason(e.target.value),
                                placeholder: "Reason (e.g. customer left, wrong order, out of stock…)",
                                rows: 3,
                                style: {
                                    ...inp,
                                    resize: 'vertical',
                                    marginBottom: '1rem'
                                },
                                autoFocus: true
                            }, void 0, false, {
                                fileName: "[project]/app/waiter/page.tsx",
                                lineNumber: 543,
                                columnNumber: 17
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    display: 'flex',
                                    gap: '0.75rem'
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>{
                                            setCancelModal(false);
                                            setCancelId('');
                                            setCancelReason('');
                                        },
                                        style: {
                                            ...btn('#f3f4f6', '#666'),
                                            flex: 1,
                                            padding: '0.6rem'
                                        },
                                        children: "Back"
                                    }, void 0, false, {
                                        fileName: "[project]/app/waiter/page.tsx",
                                        lineNumber: 552,
                                        columnNumber: 19
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: proceedToConfirm,
                                        style: {
                                            ...btn('#f97316'),
                                            flex: 2,
                                            padding: '0.6rem'
                                        },
                                        children: "Next: Confirm →"
                                    }, void 0, false, {
                                        fileName: "[project]/app/waiter/page.tsx",
                                        lineNumber: 558,
                                        columnNumber: 19
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/waiter/page.tsx",
                                lineNumber: 551,
                                columnNumber: 17
                            }, this)
                        ]
                    }, void 0, true) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                style: {
                                    fontFamily: "'Playfair Display',serif",
                                    marginBottom: '0.5rem',
                                    color: '#dc2626'
                                },
                                children: "⚠️ Are You Sure?"
                            }, void 0, false, {
                                fileName: "[project]/app/waiter/page.tsx",
                                lineNumber: 568,
                                columnNumber: 17
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                style: {
                                    fontSize: '0.83rem',
                                    color: '#555',
                                    marginBottom: '0.5rem'
                                },
                                children: [
                                    "You are about to ",
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                        children: "permanently cancel"
                                    }, void 0, false, {
                                        fileName: "[project]/app/waiter/page.tsx",
                                        lineNumber: 570,
                                        columnNumber: 36
                                    }, this),
                                    " order ",
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                        children: cancelId
                                    }, void 0, false, {
                                        fileName: "[project]/app/waiter/page.tsx",
                                        lineNumber: 570,
                                        columnNumber: 78
                                    }, this),
                                    "."
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/waiter/page.tsx",
                                lineNumber: 569,
                                columnNumber: 17
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    background: '#fef2f2',
                                    borderRadius: '8px',
                                    padding: '0.6rem 0.9rem',
                                    marginBottom: '1.2rem',
                                    fontSize: '0.82rem',
                                    color: '#7f1d1d'
                                },
                                children: [
                                    "Reason: ",
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("em", {
                                        children: cancelReason
                                    }, void 0, false, {
                                        fileName: "[project]/app/waiter/page.tsx",
                                        lineNumber: 573,
                                        columnNumber: 27
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/waiter/page.tsx",
                                lineNumber: 572,
                                columnNumber: 17
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    display: 'flex',
                                    gap: '0.75rem'
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>setCancelConfirm(false),
                                        style: {
                                            ...btn('#f3f4f6', '#666'),
                                            flex: 1,
                                            padding: '0.6rem'
                                        },
                                        children: "← Back"
                                    }, void 0, false, {
                                        fileName: "[project]/app/waiter/page.tsx",
                                        lineNumber: 576,
                                        columnNumber: 19
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: confirmCancel,
                                        style: {
                                            ...btn('#ef4444'),
                                            flex: 2,
                                            padding: '0.6rem',
                                            fontWeight: 800
                                        },
                                        children: "✕ Confirm Cancellation"
                                    }, void 0, false, {
                                        fileName: "[project]/app/waiter/page.tsx",
                                        lineNumber: 577,
                                        columnNumber: 19
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/waiter/page.tsx",
                                lineNumber: 575,
                                columnNumber: 17
                            }, this)
                        ]
                    }, void 0, true)
                }, void 0, false, {
                    fileName: "[project]/app/waiter/page.tsx",
                    lineNumber: 536,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/waiter/page.tsx",
                lineNumber: 532,
                columnNumber: 9
            }, this),
            detailOrder && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 200,
                    padding: '1rem'
                },
                onClick: ()=>setDetailOrder(null),
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    onClick: (e)=>e.stopPropagation(),
                    style: {
                        background: 'white',
                        borderRadius: '16px',
                        width: '100%',
                        maxWidth: '460px',
                        maxHeight: '88vh',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                background: 'linear-gradient(135deg,#1A0800,#E65C00)',
                                color: 'white',
                                padding: '1rem 1.5rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                fontFamily: "'Playfair Display',serif",
                                                fontWeight: 900
                                            },
                                            children: detailOrder.id
                                        }, void 0, false, {
                                            fileName: "[project]/app/waiter/page.tsx",
                                            lineNumber: 596,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                fontSize: '0.75rem',
                                                opacity: 0.8
                                            },
                                            children: [
                                                detailOrder.customerName,
                                                " • ",
                                                detailOrder.type === 'dine-in' ? `Table ${detailOrder.tableId}` : 'Pickup'
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/waiter/page.tsx",
                                            lineNumber: 597,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/waiter/page.tsx",
                                    lineNumber: 595,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            style: {
                                                fontSize: '0.7rem',
                                                fontWeight: 700,
                                                padding: '0.18rem 0.55rem',
                                                borderRadius: '10px',
                                                background: 'rgba(255,255,255,0.2)',
                                                textTransform: 'uppercase'
                                            },
                                            children: detailOrder.status
                                        }, void 0, false, {
                                            fileName: "[project]/app/waiter/page.tsx",
                                            lineNumber: 602,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            onClick: ()=>setDetailOrder(null),
                                            style: {
                                                background: 'none',
                                                border: 'none',
                                                color: 'white',
                                                fontSize: '1.5rem',
                                                cursor: 'pointer'
                                            },
                                            children: "×"
                                        }, void 0, false, {
                                            fileName: "[project]/app/waiter/page.tsx",
                                            lineNumber: 605,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/waiter/page.tsx",
                                    lineNumber: 601,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/waiter/page.tsx",
                            lineNumber: 594,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                flex: 1,
                                overflowY: 'auto',
                                padding: '1.25rem 1.5rem'
                            },
                            children: [
                                (()=>{
                                    const orderTab = tabs.find((t)=>t.orderIds.includes(detailOrder.id));
                                    return orderTab ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            background: '#fef3c7',
                                            borderRadius: '8px',
                                            padding: '0.6rem 0.85rem',
                                            margin: '0 0 0.75rem 0',
                                            fontSize: '0.82rem'
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    fontWeight: 700,
                                                    color: '#92400e'
                                                },
                                                children: [
                                                    "Tab: ",
                                                    orderTab.customerName,
                                                    " — Table ",
                                                    orderTab.tableId
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/waiter/page.tsx",
                                                lineNumber: 614,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    color: '#b45309',
                                                    fontSize: '0.75rem',
                                                    marginTop: '0.2rem'
                                                },
                                                children: [
                                                    "Tab Status: ",
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                        children: orderTab.tabStatus
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/waiter/page.tsx",
                                                        lineNumber: 616,
                                                        columnNumber: 35
                                                    }, this),
                                                    " · Running Total: ",
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                        children: [
                                                            "₹",
                                                            orderTab.totalAmount
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/waiter/page.tsx",
                                                        lineNumber: 617,
                                                        columnNumber: 38
                                                    }, this),
                                                    " ·",
                                                    orderTab.orderIds.length,
                                                    " order(s)"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/waiter/page.tsx",
                                                lineNumber: 615,
                                                columnNumber: 21
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/waiter/page.tsx",
                                        lineNumber: 613,
                                        columnNumber: 19
                                    }, this) : null;
                                })(),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        marginBottom: '1rem'
                                    },
                                    children: (detailOrder.items || []).map((item, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                padding: '0.35rem 0',
                                                borderBottom: '1px solid #f5f0e8',
                                                fontSize: '0.85rem'
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    style: {
                                                        color: '#333'
                                                    },
                                                    children: [
                                                        item.name,
                                                        " ",
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            style: {
                                                                color: '#aaa'
                                                            },
                                                            children: [
                                                                "×",
                                                                item.qty
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/waiter/page.tsx",
                                                            lineNumber: 628,
                                                            columnNumber: 65
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/waiter/page.tsx",
                                                    lineNumber: 628,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    style: {
                                                        fontWeight: 700,
                                                        color: '#E65C00'
                                                    },
                                                    children: [
                                                        "₹",
                                                        item.subtotal ?? item.price * item.qty
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/waiter/page.tsx",
                                                    lineNumber: 629,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, i, true, {
                                            fileName: "[project]/app/waiter/page.tsx",
                                            lineNumber: 627,
                                            columnNumber: 19
                                        }, this))
                                }, void 0, false, {
                                    fileName: "[project]/app/waiter/page.tsx",
                                    lineNumber: 625,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        fontWeight: 800,
                                        color: '#1A0800',
                                        marginBottom: '0.5rem'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            children: "Total"
                                        }, void 0, false, {
                                            fileName: "[project]/app/waiter/page.tsx",
                                            lineNumber: 634,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            style: {
                                                color: '#E65C00'
                                            },
                                            children: [
                                                "₹",
                                                detailOrder.total
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/waiter/page.tsx",
                                            lineNumber: 635,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/waiter/page.tsx",
                                    lineNumber: 633,
                                    columnNumber: 15
                                }, this),
                                (detailOrder.discount ?? 0) > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        fontSize: '0.78rem',
                                        color: '#16a34a'
                                    },
                                    children: [
                                        "Discount: −₹",
                                        detailOrder.discount,
                                        " (",
                                        detailOrder.discountReason,
                                        ")"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/waiter/page.tsx",
                                    lineNumber: 638,
                                    columnNumber: 17
                                }, this),
                                (detailOrder.timeline || []).length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        marginTop: '1rem'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                fontSize: '0.78rem',
                                                fontWeight: 800,
                                                color: '#888',
                                                textTransform: 'uppercase',
                                                marginBottom: '0.5rem'
                                            },
                                            children: "Order Timeline"
                                        }, void 0, false, {
                                            fileName: "[project]/app/waiter/page.tsx",
                                            lineNumber: 646,
                                            columnNumber: 19
                                        }, this),
                                        detailOrder.timeline.map((ev, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    display: 'flex',
                                                    gap: '0.6rem',
                                                    marginBottom: '0.4rem',
                                                    fontSize: '0.8rem'
                                                },
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        style: {
                                                            color: STATUS_COLOR[ev.status] || '#888',
                                                            fontWeight: 700,
                                                            minWidth: '70px',
                                                            textTransform: 'capitalize'
                                                        },
                                                        children: ev.status
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/waiter/page.tsx",
                                                        lineNumber: 649,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        style: {
                                                            color: '#aaa'
                                                        },
                                                        children: new Date(ev.timestamp).toLocaleTimeString('en-IN', {
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/waiter/page.tsx",
                                                        lineNumber: 652,
                                                        columnNumber: 23
                                                    }, this),
                                                    ev.by && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        style: {
                                                            color: '#666'
                                                        },
                                                        children: [
                                                            "by ",
                                                            ev.by
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/waiter/page.tsx",
                                                        lineNumber: 655,
                                                        columnNumber: 33
                                                    }, this),
                                                    ev.note && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        style: {
                                                            color: '#dc2626'
                                                        },
                                                        children: [
                                                            "— ",
                                                            ev.note
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/waiter/page.tsx",
                                                        lineNumber: 656,
                                                        columnNumber: 35
                                                    }, this)
                                                ]
                                            }, i, true, {
                                                fileName: "[project]/app/waiter/page.tsx",
                                                lineNumber: 648,
                                                columnNumber: 21
                                            }, this))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/waiter/page.tsx",
                                    lineNumber: 645,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/waiter/page.tsx",
                            lineNumber: 608,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/waiter/page.tsx",
                    lineNumber: 593,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/waiter/page.tsx",
                lineNumber: 589,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/waiter/page.tsx",
        lineNumber: 216,
        columnNumber: 5
    }, this);
}
_s(WaiterPage, "oSz/YeOXyvZawcbel60wsZzpTl0=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"]
    ];
});
_c = WaiterPage;
var _c;
__turbopack_context__.k.register(_c, "WaiterPage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=_6778cf4f._.js.map