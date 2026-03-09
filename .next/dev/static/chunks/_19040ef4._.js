(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
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
"[project]/app/manager/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>ManagerPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/auth.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/storage.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
const PAY_LABELS = {
    cod: 'Cash',
    gpay: 'Google Pay',
    phonepe: 'PhonePe',
    paytm: 'Paytm',
    card: 'Card',
    upi: 'UPI'
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
function ManagerPage() {
    _s();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const [session, setSession] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [authChecked, setAuthChecked] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [orders, setOrders] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [selOrder, setSelOrder] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [filter, setFilter] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('billing'); // billing | all | completed | tables
    const [clock, setClock] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        date: '',
        time: ''
    });
    const [occupancy, setOccupancy] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    // Tab billing
    const [tabs, setTabs] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [selTab, setSelTab] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [tabPayMethod, setTabPayMethod] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('cod');
    const [tabDiscAmt, setTabDiscAmt] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [tabDiscNote, setTabDiscNote] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [tabDiscPin, setTabDiscPin] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [tabDiscMsg, setTabDiscMsg] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [tabBillMsg, setTabBillMsg] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [tabShowDisc, setTabShowDisc] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [tabCloseConfirm, setTabCloseConfirm] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false); // true after first close attempt when in-progress orders exist
    // Billing flow
    const [payMethod, setPayMethod] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('cod');
    const [discAmt, setDiscAmt] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [discNote, setDiscNote] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [pinInput, setPinInput] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [pinMsg, setPinMsg] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [discTab, setDiscTab] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [billMsg, setBillMsg] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    // Void flow
    const [voidTab, setVoidTab] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [voidReason, setVoidReason] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [voidPin, setVoidPin] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [voidMsg, setVoidMsg] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    // ── Auth ─────────────────────────────────────────────────────────────────────
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ManagerPage.useEffect": ()=>{
            const s = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getSession"])('manager');
            if (!s) {
                router.replace('/manager/login');
                return;
            }
            setSession(s);
            setAuthChecked(true);
        }
    }["ManagerPage.useEffect"], [
        router
    ]);
    // ── Data ─────────────────────────────────────────────────────────────────────
    const refresh = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "ManagerPage.useCallback[refresh]": ()=>{
            const all = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getOrders"])();
            setOrders(all);
            setOccupancy((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getTableOccupancy"])());
            setTabs((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getTabs"])());
            setSelOrder({
                "ManagerPage.useCallback[refresh]": (prev)=>{
                    if (!prev) return null;
                    return all.find({
                        "ManagerPage.useCallback[refresh]": (o)=>o.id === prev.id
                    }["ManagerPage.useCallback[refresh]"]) ?? null;
                }
            }["ManagerPage.useCallback[refresh]"]);
            setSelTab({
                "ManagerPage.useCallback[refresh]": (prev)=>{
                    if (!prev) return null;
                    const updated = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getTabs"])().find({
                        "ManagerPage.useCallback[refresh].updated": (t)=>t.id === prev.id
                    }["ManagerPage.useCallback[refresh].updated"]);
                    return updated ?? null;
                }
            }["ManagerPage.useCallback[refresh]"]);
        }
    }["ManagerPage.useCallback[refresh]"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ManagerPage.useEffect": ()=>{
            if (!authChecked) return;
            refresh();
            const t1 = setInterval(refresh, 3000);
            const t2 = setInterval({
                "ManagerPage.useEffect.t2": ()=>{
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
            }["ManagerPage.useEffect.t2"], 1000);
            return ({
                "ManagerPage.useEffect": ()=>{
                    clearInterval(t1);
                    clearInterval(t2);
                }
            })["ManagerPage.useEffect"];
        }
    }["ManagerPage.useEffect"], [
        refresh,
        authChecked
    ]);
    function logout() {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clearSession"])('manager');
        router.replace('/manager/login');
    }
    // ── Bill actions ─────────────────────────────────────────────────────────────
    function applyOrderDiscount() {
        if (!selOrder) return;
        const amt = parseInt(discAmt);
        if (!amt || amt <= 0) {
            setPinMsg('❌ Enter valid amount');
            return;
        }
        const max = selOrder.subtotal || selOrder.total;
        if (amt > max) {
            setPinMsg(`❌ Discount cannot exceed ₹${max}`);
            return;
        }
        if (pinInput !== (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getPin"])()) {
            setPinMsg('❌ Wrong admin PIN');
            return;
        }
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["applyDiscount"])(selOrder.id, amt, discNote || 'Manager discount', 'Manager');
        setDiscAmt('');
        setDiscNote('');
        setPinInput('');
        setPinMsg('');
        setDiscTab(false);
        refresh();
    }
    function markCompleted() {
        if (!selOrder) return;
        // Update payment method in timeline note and mark completed
        const ok = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["updateOrderStatus"])(selOrder.id, 'completed', 'Manager', true);
        if (ok) {
            setBillMsg('✅ Bill settled! Order marked complete.');
            setTimeout(()=>{
                setBillMsg('');
                setSelOrder(null);
            }, 2500);
            refresh();
        }
    }
    function voidSelectedOrder() {
        if (!selOrder) return;
        if (!voidReason.trim()) {
            setVoidMsg('❌ Enter void reason');
            return;
        }
        if (voidPin !== (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getPin"])()) {
            setVoidMsg('❌ Wrong admin PIN');
            return;
        }
        const ok = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["voidOrder"])(selOrder.id, voidReason.trim(), 'Manager');
        if (ok) {
            setVoidMsg('');
            setBillMsg('⚠️ Order voided and logged for admin review.');
            setTimeout(()=>{
                setBillMsg('');
                setSelOrder(null);
            }, 2500);
            setVoidTab(false);
            setVoidReason('');
            setVoidPin('');
            refresh();
        } else {
            setVoidMsg('❌ Cannot void this order at its current status');
        }
    }
    // ── Derived data ─────────────────────────────────────────────────────────────
    // Dine-in tabs awaiting payment
    const billingTabs = tabs.filter((t)=>t.tabStatus === 'awaiting_payment');
    // Pickup orders (unchanged - no tab system for pickup)
    const billingPickupOrders = orders.filter((o)=>o.type === 'pickup' && [
            'pending',
            'preparing',
            'prepared',
            'served'
        ].includes(o.status));
    const completedToday = orders.filter((o)=>o.status === 'completed' && new Date(o.timestamp).toDateString() === new Date().toDateString());
    const todayRevenue = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getOrdersInPeriod"])('today').reduce((s, o)=>s + (o.total || 0), 0);
    const todayOrders = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getOrdersInPeriod"])('today').length;
    const shown = filter === 'billing' ? orders : filter === 'completed' ? completedToday : orders.slice(-60).reverse();
    // ── Styles ───────────────────────────────────────────────────────────────────
    const btn = (bg = '#E65C00', c = 'white')=>({
            background: bg,
            color: c,
            border: 'none',
            borderRadius: 8,
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '0.82rem',
            fontFamily: 'Poppins,sans-serif',
            padding: '0.5rem 1rem'
        });
    const inp = {
        width: '100%',
        padding: '0.6rem 0.75rem',
        border: '2px solid #e5e7eb',
        borderRadius: 8,
        fontFamily: 'Poppins,sans-serif',
        fontSize: '0.88rem'
    };
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
                        children: "💳"
                    }, void 0, false, {
                        fileName: "[project]/app/manager/page.tsx",
                        lineNumber: 178,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: "Loading Manager Portal…"
                    }, void 0, false, {
                        fileName: "[project]/app/manager/page.tsx",
                        lineNumber: 179,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/manager/page.tsx",
                lineNumber: 177,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/app/manager/page.tsx",
            lineNumber: 176,
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
                    background: 'linear-gradient(135deg,#064e3b,#065f46)',
                    color: 'white',
                    padding: '0.9rem 1.5rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    position: 'sticky',
                    top: 0,
                    zIndex: 50,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
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
                                children: "💳"
                            }, void 0, false, {
                                fileName: "[project]/app/manager/page.tsx",
                                lineNumber: 191,
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
                                        children: "Manager — Counter"
                                    }, void 0, false, {
                                        fileName: "[project]/app/manager/page.tsx",
                                        lineNumber: 193,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            fontSize: '0.7rem',
                                            color: '#6ee7b7'
                                        },
                                        children: "Billing & Payment Portal"
                                    }, void 0, false, {
                                        fileName: "[project]/app/manager/page.tsx",
                                        lineNumber: 194,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/manager/page.tsx",
                                lineNumber: 192,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/manager/page.tsx",
                        lineNumber: 190,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem'
                        },
                        children: [
                            billingTabs.length + billingPickupOrders.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    background: '#f59e0b',
                                    color: 'white',
                                    padding: '0.25rem 0.75rem',
                                    borderRadius: 20,
                                    fontSize: '0.75rem',
                                    fontWeight: 800
                                },
                                children: [
                                    "💰 ",
                                    billingTabs.length + billingPickupOrders.length,
                                    " Awaiting Payment"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/manager/page.tsx",
                                lineNumber: 199,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    textAlign: 'right'
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            fontSize: '0.78rem',
                                            fontWeight: 700
                                        },
                                        children: clock.date
                                    }, void 0, false, {
                                        fileName: "[project]/app/manager/page.tsx",
                                        lineNumber: 204,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            fontSize: '0.7rem',
                                            color: '#6ee7b7'
                                        },
                                        children: clock.time
                                    }, void 0, false, {
                                        fileName: "[project]/app/manager/page.tsx",
                                        lineNumber: 205,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/manager/page.tsx",
                                lineNumber: 203,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: logout,
                                style: {
                                    ...btn('#ef444430', '#ef4444'),
                                    border: '1px solid #ef444440',
                                    fontSize: '0.72rem'
                                },
                                children: "🚪 Logout"
                            }, void 0, false, {
                                fileName: "[project]/app/manager/page.tsx",
                                lineNumber: 207,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/manager/page.tsx",
                        lineNumber: 197,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/manager/page.tsx",
                lineNumber: 189,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    background: '#065f46',
                    color: 'white',
                    padding: '0.6rem 1.5rem',
                    display: 'flex',
                    gap: '2rem',
                    overflowX: 'auto'
                },
                children: [
                    {
                        icon: '📋',
                        val: todayOrders,
                        label: "Today's Orders"
                    },
                    {
                        icon: '💰',
                        val: `₹${todayRevenue}`,
                        label: 'Net Revenue'
                    },
                    {
                        icon: '🧾',
                        val: billingTabs.length + billingPickupOrders.length,
                        label: 'Pending Bills'
                    },
                    {
                        icon: '✅',
                        val: completedToday.length,
                        label: 'Settled Today'
                    }
                ].map((s)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            textAlign: 'center',
                            whiteSpace: 'nowrap'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    fontSize: '1.2rem',
                                    fontWeight: 900,
                                    color: '#6ee7b7'
                                },
                                children: [
                                    s.icon,
                                    " ",
                                    s.val
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/manager/page.tsx",
                                lineNumber: 222,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    fontSize: '0.62rem',
                                    color: '#a7f3d0'
                                },
                                children: s.label
                            }, void 0, false, {
                                fileName: "[project]/app/manager/page.tsx",
                                lineNumber: 223,
                                columnNumber: 13
                            }, this)
                        ]
                    }, s.label, true, {
                        fileName: "[project]/app/manager/page.tsx",
                        lineNumber: 221,
                        columnNumber: 11
                    }, this))
            }, void 0, false, {
                fileName: "[project]/app/manager/page.tsx",
                lineNumber: 214,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    padding: '0.75rem 1.5rem',
                    display: 'flex',
                    gap: '0.5rem',
                    overflowX: 'auto'
                },
                children: [
                    {
                        key: 'billing',
                        label: `💰 Awaiting Payment (${billingTabs.length + billingPickupOrders.length})`
                    },
                    {
                        key: 'tables',
                        label: `🪑 Table Occupancy`
                    },
                    {
                        key: 'completed',
                        label: `✅ Completed Today (${completedToday.length})`
                    },
                    {
                        key: 'all',
                        label: '📋 All Orders'
                    }
                ].map((f)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>setFilter(f.key),
                        style: {
                            padding: '0.35rem 0.9rem',
                            borderRadius: 20,
                            cursor: 'pointer',
                            fontFamily: 'Poppins,sans-serif',
                            fontWeight: 600,
                            fontSize: '0.78rem',
                            whiteSpace: 'nowrap',
                            border: `2px solid ${filter === f.key ? '#16a34a' : '#ddd'}`,
                            background: filter === f.key ? '#16a34a' : 'white',
                            color: filter === f.key ? 'white' : '#666'
                        },
                        children: f.label
                    }, f.key, false, {
                        fileName: "[project]/app/manager/page.tsx",
                        lineNumber: 236,
                        columnNumber: 11
                    }, this))
            }, void 0, false, {
                fileName: "[project]/app/manager/page.tsx",
                lineNumber: 229,
                columnNumber: 7
            }, this),
            filter === 'tables' && (()=>{
                const occupied = occupancy.filter((t)=>t.tableStatus === 'occupied');
                const available = occupancy.filter((t)=>t.tableStatus === 'available');
                const reserved = occupancy.filter((t)=>t.tableStatus === 'reserved');
                const totalChairs = occupancy.reduce((s, t)=>s + t.capacity, 0);
                const occupiedChairs = occupancy.reduce((s, t)=>s + t.chairsOccupied, 0);
                const totalGuests = occupancy.reduce((s, t)=>s + t.guests.reduce((gs, g)=>gs + g.partySize, 0), 0);
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        padding: '0 1.5rem 2rem'
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))',
                                gap: '0.75rem',
                                marginBottom: '1.5rem'
                            },
                            children: [
                                {
                                    icon: '🪑',
                                    label: 'Tables Occupied',
                                    val: `${occupied.length} / ${occupancy.length}`,
                                    color: occupied.length > 0 ? '#E65C00' : '#16a34a'
                                },
                                {
                                    icon: '🚪',
                                    label: 'Tables Free',
                                    val: `${available.length}`,
                                    color: '#16a34a'
                                },
                                {
                                    icon: '👥',
                                    label: 'Total Guests',
                                    val: totalGuests,
                                    color: '#3b82f6'
                                },
                                {
                                    icon: '💺',
                                    label: 'Chairs Occupied',
                                    val: `${occupiedChairs} / ${totalChairs}`,
                                    color: '#8b5cf6'
                                }
                            ].map((s)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        background: 'white',
                                        borderRadius: 12,
                                        padding: '0.85rem 1rem',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                                        textAlign: 'center'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                fontSize: '1.5rem',
                                                marginBottom: '0.25rem'
                                            },
                                            children: s.icon
                                        }, void 0, false, {
                                            fileName: "[project]/app/manager/page.tsx",
                                            lineNumber: 267,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                fontWeight: 900,
                                                fontSize: '1.3rem',
                                                color: s.color
                                            },
                                            children: s.val
                                        }, void 0, false, {
                                            fileName: "[project]/app/manager/page.tsx",
                                            lineNumber: 268,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                fontSize: '0.68rem',
                                                color: '#888',
                                                marginTop: '0.1rem'
                                            },
                                            children: s.label
                                        }, void 0, false, {
                                            fileName: "[project]/app/manager/page.tsx",
                                            lineNumber: 269,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, s.label, true, {
                                    fileName: "[project]/app/manager/page.tsx",
                                    lineNumber: 266,
                                    columnNumber: 17
                                }, this))
                        }, void 0, false, {
                            fileName: "[project]/app/manager/page.tsx",
                            lineNumber: 259,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                background: 'white',
                                borderRadius: 12,
                                padding: '1rem 1.25rem',
                                marginBottom: '1.5rem',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        fontSize: '0.78rem',
                                        fontWeight: 700,
                                        color: '#444',
                                        marginBottom: '0.5rem'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            children: "Restaurant Occupancy"
                                        }, void 0, false, {
                                            fileName: "[project]/app/manager/page.tsx",
                                            lineNumber: 277,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            style: {
                                                color: '#E65C00'
                                            },
                                            children: [
                                                totalChairs ? Math.round(occupiedChairs / totalChairs * 100) : 0,
                                                "%"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/manager/page.tsx",
                                            lineNumber: 278,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/manager/page.tsx",
                                    lineNumber: 276,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        background: '#f5f0e8',
                                        borderRadius: 20,
                                        height: '12px',
                                        overflow: 'hidden'
                                    },
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            height: '100%',
                                            width: `${totalChairs ? Math.round(occupiedChairs / totalChairs * 100) : 0}%`,
                                            background: 'linear-gradient(90deg,#E65C00,#F9A826)',
                                            borderRadius: 20,
                                            transition: 'width 0.5s'
                                        }
                                    }, void 0, false, {
                                        fileName: "[project]/app/manager/page.tsx",
                                        lineNumber: 281,
                                        columnNumber: 17
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/app/manager/page.tsx",
                                    lineNumber: 280,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        fontSize: '0.68rem',
                                        color: '#aaa',
                                        marginTop: '0.3rem'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            children: [
                                                occupiedChairs,
                                                " occupied"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/manager/page.tsx",
                                            lineNumber: 284,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            children: [
                                                totalChairs - occupiedChairs,
                                                " free"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/manager/page.tsx",
                                            lineNumber: 284,
                                            columnNumber: 55
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/manager/page.tsx",
                                    lineNumber: 283,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/manager/page.tsx",
                            lineNumber: 275,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))',
                                gap: '0.75rem'
                            },
                            children: occupancy.map((t)=>{
                                const statusColor = t.tableStatus === 'occupied' ? '#E65C00' : t.tableStatus === 'reserved' ? '#8b5cf6' : '#16a34a';
                                const fillPct = t.capacity ? Math.round(t.chairsOccupied / t.capacity * 100) : 0;
                                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        background: 'white',
                                        borderRadius: 12,
                                        overflow: 'hidden',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
                                        borderTop: `4px solid ${statusColor}`
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                padding: '0.75rem 1rem 0.5rem'
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    style: {
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        marginBottom: '0.3rem'
                                                    },
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            style: {
                                                                fontWeight: 900,
                                                                fontSize: '1rem',
                                                                color: '#1A0800'
                                                            },
                                                            children: [
                                                                "Table ",
                                                                t.tableId
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/manager/page.tsx",
                                                            lineNumber: 297,
                                                            columnNumber: 25
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            style: {
                                                                fontSize: '0.68rem',
                                                                fontWeight: 700,
                                                                padding: '0.15rem 0.5rem',
                                                                borderRadius: 10,
                                                                background: statusColor + '18',
                                                                color: statusColor,
                                                                textTransform: 'uppercase'
                                                            },
                                                            children: t.tableStatus
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/manager/page.tsx",
                                                            lineNumber: 298,
                                                            columnNumber: 25
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/manager/page.tsx",
                                                    lineNumber: 296,
                                                    columnNumber: 23
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    style: {
                                                        display: 'flex',
                                                        gap: '3px',
                                                        flexWrap: 'wrap',
                                                        marginBottom: '0.4rem'
                                                    },
                                                    children: Array.from({
                                                        length: t.capacity
                                                    }).map((_, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            style: {
                                                                fontSize: '1rem',
                                                                opacity: i < t.chairsOccupied ? 1 : 0.25
                                                            },
                                                            children: "🪑"
                                                        }, i, false, {
                                                            fileName: "[project]/app/manager/page.tsx",
                                                            lineNumber: 305,
                                                            columnNumber: 27
                                                        }, this))
                                                }, void 0, false, {
                                                    fileName: "[project]/app/manager/page.tsx",
                                                    lineNumber: 303,
                                                    columnNumber: 23
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    style: {
                                                        background: '#f5f0e8',
                                                        borderRadius: 10,
                                                        height: '6px',
                                                        overflow: 'hidden',
                                                        marginBottom: '0.5rem'
                                                    },
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        style: {
                                                            height: '100%',
                                                            width: `${fillPct}%`,
                                                            background: statusColor,
                                                            borderRadius: 10
                                                        }
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/manager/page.tsx",
                                                        lineNumber: 310,
                                                        columnNumber: 25
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/app/manager/page.tsx",
                                                    lineNumber: 309,
                                                    columnNumber: 23
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    style: {
                                                        fontSize: '0.7rem',
                                                        color: '#888'
                                                    },
                                                    children: [
                                                        t.chairsOccupied,
                                                        "/",
                                                        t.capacity,
                                                        " chairs · ",
                                                        t.partiesCount,
                                                        " ",
                                                        t.partiesCount === 1 ? 'party' : 'parties'
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/manager/page.tsx",
                                                    lineNumber: 312,
                                                    columnNumber: 23
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/manager/page.tsx",
                                            lineNumber: 295,
                                            columnNumber: 21
                                        }, this),
                                        t.guests.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                borderTop: '1px solid #f5f0e8',
                                                padding: '0.5rem 1rem 0.75rem'
                                            },
                                            children: t.guests.map((g, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    style: {
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        padding: '0.2rem 0',
                                                        fontSize: '0.75rem'
                                                    },
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    style: {
                                                                        fontWeight: 700,
                                                                        color: '#1A0800'
                                                                    },
                                                                    children: g.name
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/manager/page.tsx",
                                                                    lineNumber: 322,
                                                                    columnNumber: 31
                                                                }, this),
                                                                g.partySize > 1 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    style: {
                                                                        color: '#888',
                                                                        marginLeft: '0.25rem'
                                                                    },
                                                                    children: [
                                                                        "+",
                                                                        g.partySize - 1
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/manager/page.tsx",
                                                                    lineNumber: 323,
                                                                    columnNumber: 51
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/manager/page.tsx",
                                                            lineNumber: 321,
                                                            columnNumber: 29
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            style: {
                                                                display: 'flex',
                                                                gap: '0.4rem',
                                                                alignItems: 'center'
                                                            },
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    style: {
                                                                        fontSize: '0.68rem',
                                                                        fontWeight: 700,
                                                                        padding: '0.1rem 0.4rem',
                                                                        borderRadius: 8,
                                                                        background: (STATUS_COLOR[g.status] || '#ddd') + '20',
                                                                        color: STATUS_COLOR[g.status] || '#666'
                                                                    },
                                                                    children: g.status.replace('_', ' ')
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/manager/page.tsx",
                                                                    lineNumber: 326,
                                                                    columnNumber: 31
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    style: {
                                                                        fontWeight: 700,
                                                                        color: '#16a34a',
                                                                        fontSize: '0.78rem'
                                                                    },
                                                                    children: [
                                                                        "₹",
                                                                        g.orderTotal
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/manager/page.tsx",
                                                                    lineNumber: 329,
                                                                    columnNumber: 31
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/manager/page.tsx",
                                                            lineNumber: 325,
                                                            columnNumber: 29
                                                        }, this)
                                                    ]
                                                }, i, true, {
                                                    fileName: "[project]/app/manager/page.tsx",
                                                    lineNumber: 320,
                                                    columnNumber: 27
                                                }, this))
                                        }, void 0, false, {
                                            fileName: "[project]/app/manager/page.tsx",
                                            lineNumber: 318,
                                            columnNumber: 23
                                        }, this),
                                        t.tableStatus === 'available' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                padding: '0.4rem 1rem 0.6rem',
                                                fontSize: '0.72rem',
                                                color: '#aaa'
                                            },
                                            children: "No active orders"
                                        }, void 0, false, {
                                            fileName: "[project]/app/manager/page.tsx",
                                            lineNumber: 336,
                                            columnNumber: 23
                                        }, this)
                                    ]
                                }, t.tableId, true, {
                                    fileName: "[project]/app/manager/page.tsx",
                                    lineNumber: 294,
                                    columnNumber: 19
                                }, this);
                            })
                        }, void 0, false, {
                            fileName: "[project]/app/manager/page.tsx",
                            lineNumber: 289,
                            columnNumber: 13
                        }, this),
                        reserved.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                marginTop: '1rem',
                                fontSize: '0.75rem',
                                color: '#888',
                                textAlign: 'center'
                            },
                            children: [
                                "🔒 ",
                                reserved.length,
                                " table",
                                reserved.length > 1 ? 's' : '',
                                " reserved"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/manager/page.tsx",
                            lineNumber: 344,
                            columnNumber: 15
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/manager/page.tsx",
                    lineNumber: 257,
                    columnNumber: 11
                }, this);
            })(),
            filter !== 'tables' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    padding: '0 1.5rem 2rem'
                },
                children: filter === 'billing' ? // Billing view: show tabs and pickup orders
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))',
                        gap: '1rem'
                    },
                    children: [
                        billingTabs.map((tab)=>{
                            const tabOrdersList = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getTabOrders"])(tab.id);
                            const waitMins = tab.requestedAt ? Math.floor((Date.now() - new Date(tab.requestedAt).getTime()) / 60000) : 0;
                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                onClick: ()=>{
                                    setSelTab(tab);
                                    setTabPayMethod('cod');
                                    setTabDiscAmt('');
                                    setTabDiscNote('');
                                    setTabDiscPin('');
                                    setTabDiscMsg('');
                                    setTabBillMsg('');
                                    setTabShowDisc(false);
                                    setTabCloseConfirm(false);
                                },
                                style: {
                                    background: 'white',
                                    borderRadius: 12,
                                    overflow: 'hidden',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                    borderLeft: '4px solid #f59e0b',
                                    cursor: 'pointer'
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            padding: '0.8rem 1rem'
                                        },
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'flex-start'
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            style: {
                                                                fontWeight: 900,
                                                                fontSize: '1.1rem',
                                                                color: '#064e3b'
                                                            },
                                                            children: [
                                                                "Table ",
                                                                tab.tableId
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/manager/page.tsx",
                                                            lineNumber: 379,
                                                            columnNumber: 25
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            style: {
                                                                fontSize: '0.82rem',
                                                                color: '#333',
                                                                fontWeight: 700
                                                            },
                                                            children: tab.customerName
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/manager/page.tsx",
                                                            lineNumber: 380,
                                                            columnNumber: 25
                                                        }, this),
                                                        tab.partySize && tab.partySize > 1 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            style: {
                                                                fontSize: '0.72rem',
                                                                color: '#888'
                                                            },
                                                            children: [
                                                                tab.partySize,
                                                                " guests"
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/manager/page.tsx",
                                                            lineNumber: 382,
                                                            columnNumber: 27
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            style: {
                                                                fontSize: '0.7rem',
                                                                color: '#f59e0b',
                                                                fontWeight: 700,
                                                                marginTop: '0.2rem'
                                                            },
                                                            children: [
                                                                "💳 Bill requested ",
                                                                waitMins,
                                                                "m ago"
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/manager/page.tsx",
                                                            lineNumber: 384,
                                                            columnNumber: 25
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/manager/page.tsx",
                                                    lineNumber: 378,
                                                    columnNumber: 23
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    style: {
                                                        textAlign: 'right'
                                                    },
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            style: {
                                                                fontWeight: 900,
                                                                color: '#16a34a',
                                                                fontSize: '1.3rem'
                                                            },
                                                            children: [
                                                                "₹",
                                                                tab.totalAmount
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/manager/page.tsx",
                                                            lineNumber: 389,
                                                            columnNumber: 25
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            style: {
                                                                fontSize: '0.7rem',
                                                                color: '#888'
                                                            },
                                                            children: [
                                                                tabOrdersList.length,
                                                                " order(s)"
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/manager/page.tsx",
                                                            lineNumber: 390,
                                                            columnNumber: 25
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/manager/page.tsx",
                                                    lineNumber: 388,
                                                    columnNumber: 23
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/manager/page.tsx",
                                            lineNumber: 377,
                                            columnNumber: 21
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/app/manager/page.tsx",
                                        lineNumber: 376,
                                        columnNumber: 19
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            padding: '0.4rem 1rem',
                                            borderTop: '1px solid #f5f0e8',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            fontSize: '0.78rem',
                                            color: '#888'
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                children: [
                                                    tabOrdersList.reduce((s, o)=>s + o.items.reduce((is, i)=>is + i.qty, 0), 0),
                                                    " items across ",
                                                    tabOrdersList.length,
                                                    " round(s)"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/manager/page.tsx",
                                                lineNumber: 395,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                style: {
                                                    color: '#f59e0b',
                                                    fontWeight: 700
                                                },
                                                children: "Awaiting Payment"
                                            }, void 0, false, {
                                                fileName: "[project]/app/manager/page.tsx",
                                                lineNumber: 396,
                                                columnNumber: 21
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/manager/page.tsx",
                                        lineNumber: 394,
                                        columnNumber: 19
                                    }, this)
                                ]
                            }, tab.id, true, {
                                fileName: "[project]/app/manager/page.tsx",
                                lineNumber: 362,
                                columnNumber: 17
                            }, this);
                        }),
                        billingPickupOrders.map((order)=>{
                            const mins = Math.floor((Date.now() - new Date(order.timestamp).getTime()) / 60000);
                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                onClick: ()=>{
                                    setSelOrder(order);
                                    setDiscTab(false);
                                    setDiscAmt('');
                                    setDiscNote('');
                                    setPinInput('');
                                    setPinMsg('');
                                    setBillMsg('');
                                    setVoidTab(false);
                                    setVoidReason('');
                                    setVoidPin('');
                                    setVoidMsg('');
                                },
                                style: {
                                    background: 'white',
                                    borderRadius: 12,
                                    overflow: 'hidden',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                    borderLeft: `4px solid ${STATUS_COLOR[order.status] || '#ddd'}`,
                                    cursor: 'pointer',
                                    transition: 'box-shadow 0.2s'
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            padding: '0.8rem 1rem',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'flex-start'
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        style: {
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.5rem'
                                                        },
                                                        children: [
                                                            order.orderNum && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                style: {
                                                                    fontWeight: 900,
                                                                    fontSize: '1.1rem',
                                                                    color: '#064e3b'
                                                                },
                                                                children: [
                                                                    "#",
                                                                    order.orderNum
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/manager/page.tsx",
                                                                lineNumber: 420,
                                                                columnNumber: 27
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                style: {
                                                                    fontWeight: 600,
                                                                    fontSize: '0.72rem',
                                                                    color: '#aaa'
                                                                },
                                                                children: order.id
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/manager/page.tsx",
                                                                lineNumber: 422,
                                                                columnNumber: 25
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/manager/page.tsx",
                                                        lineNumber: 418,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        style: {
                                                            fontSize: '0.73rem',
                                                            color: '#888',
                                                            marginTop: '0.1rem'
                                                        },
                                                        children: [
                                                            order.customerName,
                                                            order.partySize && order.partySize > 1 ? ` (${order.partySize} guests)` : '',
                                                            ' • Pickup'
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/manager/page.tsx",
                                                        lineNumber: 424,
                                                        columnNumber: 23
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
                                                        fileName: "[project]/app/manager/page.tsx",
                                                        lineNumber: 429,
                                                        columnNumber: 23
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/manager/page.tsx",
                                                lineNumber: 417,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'flex-end',
                                                    gap: '0.3rem'
                                                },
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        style: {
                                                            fontSize: '0.7rem',
                                                            fontWeight: 700,
                                                            padding: '0.15rem 0.5rem',
                                                            borderRadius: 10,
                                                            background: (STATUS_COLOR[order.status] || '#ddd') + '20',
                                                            color: STATUS_COLOR[order.status] || '#666',
                                                            textTransform: 'uppercase'
                                                        },
                                                        children: order.status
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/manager/page.tsx",
                                                        lineNumber: 432,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        style: {
                                                            fontWeight: 900,
                                                            color: '#16a34a',
                                                            fontSize: '1rem'
                                                        },
                                                        children: [
                                                            "₹",
                                                            order.total
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/manager/page.tsx",
                                                        lineNumber: 435,
                                                        columnNumber: 23
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/manager/page.tsx",
                                                lineNumber: 431,
                                                columnNumber: 21
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/manager/page.tsx",
                                        lineNumber: 416,
                                        columnNumber: 19
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            padding: '0.4rem 1rem',
                                            borderTop: '1px solid #f5f0e8',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            fontSize: '0.78rem',
                                            color: '#666'
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                children: [
                                                    (order.items || []).reduce((s, i)=>s + i.qty, 0),
                                                    " item(s)"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/manager/page.tsx",
                                                lineNumber: 439,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                children: PAY_LABELS[order.payment] || order.payment || 'Cash'
                                            }, void 0, false, {
                                                fileName: "[project]/app/manager/page.tsx",
                                                lineNumber: 440,
                                                columnNumber: 21
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/manager/page.tsx",
                                        lineNumber: 438,
                                        columnNumber: 19
                                    }, this)
                                ]
                            }, order.id, true, {
                                fileName: "[project]/app/manager/page.tsx",
                                lineNumber: 406,
                                columnNumber: 17
                            }, this);
                        }),
                        billingTabs.length === 0 && billingPickupOrders.length === 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                gridColumn: '1/-1',
                                textAlign: 'center',
                                color: '#999',
                                padding: '3rem'
                            },
                            children: "🎉 No pending bills right now!"
                        }, void 0, false, {
                            fileName: "[project]/app/manager/page.tsx",
                            lineNumber: 448,
                            columnNumber: 15
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/manager/page.tsx",
                    lineNumber: 356,
                    columnNumber: 11
                }, this) : // All orders view
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))',
                        gap: '1rem'
                    },
                    children: !shown.length ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            gridColumn: '1/-1',
                            textAlign: 'center',
                            color: '#999',
                            padding: '3rem'
                        },
                        children: "No orders found"
                    }, void 0, false, {
                        fileName: "[project]/app/manager/page.tsx",
                        lineNumber: 457,
                        columnNumber: 15
                    }, this) : shown.map((order)=>{
                        const mins = Math.floor((Date.now() - new Date(order.timestamp).getTime()) / 60000);
                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            onClick: ()=>{
                                setSelOrder(order);
                                setDiscTab(false);
                                setDiscAmt('');
                                setDiscNote('');
                                setPinInput('');
                                setPinMsg('');
                                setBillMsg('');
                                setVoidTab(false);
                                setVoidReason('');
                                setVoidPin('');
                                setVoidMsg('');
                            },
                            style: {
                                background: 'white',
                                borderRadius: 12,
                                overflow: 'hidden',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                borderLeft: `4px solid ${STATUS_COLOR[order.status] || '#ddd'}`,
                                cursor: 'pointer',
                                transition: 'box-shadow 0.2s'
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        padding: '0.8rem 1rem',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'flex-start'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    style: {
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.5rem'
                                                    },
                                                    children: [
                                                        order.orderNum && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            style: {
                                                                fontWeight: 900,
                                                                fontSize: '1.1rem',
                                                                color: '#064e3b'
                                                            },
                                                            children: [
                                                                "#",
                                                                order.orderNum
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/manager/page.tsx",
                                                            lineNumber: 477,
                                                            columnNumber: 27
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            style: {
                                                                fontWeight: 600,
                                                                fontSize: '0.72rem',
                                                                color: '#aaa'
                                                            },
                                                            children: order.id
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/manager/page.tsx",
                                                            lineNumber: 479,
                                                            columnNumber: 25
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/manager/page.tsx",
                                                    lineNumber: 475,
                                                    columnNumber: 23
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    style: {
                                                        fontSize: '0.73rem',
                                                        color: '#888',
                                                        marginTop: '0.1rem'
                                                    },
                                                    children: [
                                                        order.customerName,
                                                        order.partySize && order.partySize > 1 ? ` (${order.partySize} guests)` : '',
                                                        ' • ',
                                                        order.type === 'dine-in' ? `Table ${order.tableId}` : 'Pickup'
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/manager/page.tsx",
                                                    lineNumber: 481,
                                                    columnNumber: 23
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
                                                    fileName: "[project]/app/manager/page.tsx",
                                                    lineNumber: 486,
                                                    columnNumber: 23
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/manager/page.tsx",
                                            lineNumber: 474,
                                            columnNumber: 21
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'flex-end',
                                                gap: '0.3rem'
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    style: {
                                                        fontSize: '0.7rem',
                                                        fontWeight: 700,
                                                        padding: '0.15rem 0.5rem',
                                                        borderRadius: 10,
                                                        background: (STATUS_COLOR[order.status] || '#ddd') + '20',
                                                        color: STATUS_COLOR[order.status] || '#666',
                                                        textTransform: 'uppercase'
                                                    },
                                                    children: order.status
                                                }, void 0, false, {
                                                    fileName: "[project]/app/manager/page.tsx",
                                                    lineNumber: 489,
                                                    columnNumber: 23
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    style: {
                                                        fontWeight: 900,
                                                        color: '#16a34a',
                                                        fontSize: '1rem'
                                                    },
                                                    children: [
                                                        "₹",
                                                        order.total
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/manager/page.tsx",
                                                    lineNumber: 492,
                                                    columnNumber: 23
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/manager/page.tsx",
                                            lineNumber: 488,
                                            columnNumber: 21
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/manager/page.tsx",
                                    lineNumber: 473,
                                    columnNumber: 19
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        padding: '0.4rem 1rem',
                                        borderTop: '1px solid #f5f0e8',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        fontSize: '0.78rem',
                                        color: '#666'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            children: [
                                                (order.items || []).reduce((s, i)=>s + i.qty, 0),
                                                " item(s)"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/manager/page.tsx",
                                            lineNumber: 496,
                                            columnNumber: 21
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            children: PAY_LABELS[order.payment] || order.payment || 'Cash'
                                        }, void 0, false, {
                                            fileName: "[project]/app/manager/page.tsx",
                                            lineNumber: 497,
                                            columnNumber: 21
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/manager/page.tsx",
                                    lineNumber: 495,
                                    columnNumber: 19
                                }, this)
                            ]
                        }, order.id, true, {
                            fileName: "[project]/app/manager/page.tsx",
                            lineNumber: 463,
                            columnNumber: 17
                        }, this);
                    })
                }, void 0, false, {
                    fileName: "[project]/app/manager/page.tsx",
                    lineNumber: 455,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/manager/page.tsx",
                lineNumber: 353,
                columnNumber: 31
            }, this),
            selOrder && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.6)',
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    zIndex: 200,
                    padding: '0'
                },
                onClick: ()=>setSelOrder(null),
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    onClick: (e)=>e.stopPropagation(),
                    style: {
                        background: 'white',
                        width: '100%',
                        maxWidth: '540px',
                        maxHeight: '92vh',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: '16px 16px 0 0',
                        boxShadow: '0 -20px 60px rgba(0,0,0,0.3)'
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                background: 'linear-gradient(135deg,#064e3b,#16a34a)',
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
                                                        color: '#6ee7b7'
                                                    },
                                                    children: [
                                                        "#",
                                                        selOrder.orderNum
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/manager/page.tsx",
                                                    lineNumber: 521,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    style: {
                                                        fontFamily: "'Playfair Display',serif",
                                                        fontWeight: 900,
                                                        fontSize: '1.0rem',
                                                        opacity: 0.8
                                                    },
                                                    children: [
                                                        "🧾 ",
                                                        selOrder.id
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/manager/page.tsx",
                                                    lineNumber: 523,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/manager/page.tsx",
                                            lineNumber: 519,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                fontSize: '0.73rem',
                                                opacity: 0.8,
                                                marginTop: '0.1rem'
                                            },
                                            children: [
                                                selOrder.customerName,
                                                selOrder.partySize && selOrder.partySize > 1 ? ` · ${selOrder.partySize} guests` : '',
                                                ' · ',
                                                selOrder.type === 'dine-in' ? `Table ${selOrder.tableId}` : 'Pickup',
                                                ' ',
                                                "• ⏱ ",
                                                Math.floor((Date.now() - new Date(selOrder.timestamp).getTime()) / 60000),
                                                "m ago"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/manager/page.tsx",
                                            lineNumber: 525,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/manager/page.tsx",
                                    lineNumber: 518,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: ()=>setSelOrder(null),
                                    style: {
                                        background: 'none',
                                        border: 'none',
                                        color: 'white',
                                        fontSize: '1.5rem',
                                        cursor: 'pointer'
                                    },
                                    children: "×"
                                }, void 0, false, {
                                    fileName: "[project]/app/manager/page.tsx",
                                    lineNumber: 532,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/manager/page.tsx",
                            lineNumber: 517,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                flex: 1,
                                overflowY: 'auto',
                                padding: '1.25rem 1.5rem'
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        marginBottom: '1rem'
                                    },
                                    children: (selOrder.items || []).map((item, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
                                                            fileName: "[project]/app/manager/page.tsx",
                                                            lineNumber: 540,
                                                            columnNumber: 65
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/manager/page.tsx",
                                                    lineNumber: 540,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    style: {
                                                        fontWeight: 700,
                                                        color: '#1A0800'
                                                    },
                                                    children: [
                                                        "₹",
                                                        item.subtotal ?? item.price * item.qty
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/manager/page.tsx",
                                                    lineNumber: 541,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, i, true, {
                                            fileName: "[project]/app/manager/page.tsx",
                                            lineNumber: 539,
                                            columnNumber: 19
                                        }, this))
                                }, void 0, false, {
                                    fileName: "[project]/app/manager/page.tsx",
                                    lineNumber: 537,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        background: '#f0fdf4',
                                        borderRadius: 10,
                                        padding: '0.85rem 1rem',
                                        marginBottom: '1rem'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                fontSize: '0.85rem',
                                                marginBottom: '0.3rem'
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    style: {
                                                        color: '#666'
                                                    },
                                                    children: "Subtotal"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/manager/page.tsx",
                                                    lineNumber: 549,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    style: {
                                                        fontWeight: 600
                                                    },
                                                    children: [
                                                        "₹",
                                                        selOrder.subtotal
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/manager/page.tsx",
                                                    lineNumber: 550,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/manager/page.tsx",
                                            lineNumber: 548,
                                            columnNumber: 17
                                        }, this),
                                        (selOrder.discount || 0) > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                fontSize: '0.85rem',
                                                marginBottom: '0.3rem',
                                                color: '#16a34a'
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    children: [
                                                        "Discount (",
                                                        selOrder.discountReason,
                                                        ")"
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/manager/page.tsx",
                                                    lineNumber: 554,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    style: {
                                                        fontWeight: 700
                                                    },
                                                    children: [
                                                        "−₹",
                                                        selOrder.discount
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/manager/page.tsx",
                                                    lineNumber: 555,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/manager/page.tsx",
                                            lineNumber: 553,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                fontSize: '1.05rem',
                                                fontWeight: 900,
                                                borderTop: '2px solid #16a34a',
                                                paddingTop: '0.4rem',
                                                marginTop: '0.3rem',
                                                color: '#064e3b'
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    children: "TOTAL"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/manager/page.tsx",
                                                    lineNumber: 559,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    children: [
                                                        "₹",
                                                        selOrder.total
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/manager/page.tsx",
                                                    lineNumber: 560,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/manager/page.tsx",
                                            lineNumber: 558,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/manager/page.tsx",
                                    lineNumber: 547,
                                    columnNumber: 15
                                }, this),
                                selOrder.status !== 'completed' && selOrder.status !== 'cancelled' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        marginBottom: '1rem'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            style: {
                                                fontSize: '0.78rem',
                                                fontWeight: 700,
                                                color: '#555',
                                                display: 'block',
                                                marginBottom: '0.4rem'
                                            },
                                            children: "Payment Method"
                                        }, void 0, false, {
                                            fileName: "[project]/app/manager/page.tsx",
                                            lineNumber: 567,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                display: 'flex',
                                                gap: '0.4rem',
                                                flexWrap: 'wrap'
                                            },
                                            children: [
                                                {
                                                    k: 'cod',
                                                    l: '💵 Cash'
                                                },
                                                {
                                                    k: 'gpay',
                                                    l: '📱 Google Pay'
                                                },
                                                {
                                                    k: 'phonepe',
                                                    l: '📱 PhonePe'
                                                },
                                                {
                                                    k: 'card',
                                                    l: '💳 Card'
                                                },
                                                {
                                                    k: 'upi',
                                                    l: '📲 UPI'
                                                }
                                            ].map((p)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    onClick: ()=>setPayMethod(p.k),
                                                    style: {
                                                        padding: '0.35rem 0.75rem',
                                                        borderRadius: 8,
                                                        border: `2px solid ${payMethod === p.k ? '#16a34a' : '#e5e7eb'}`,
                                                        background: payMethod === p.k ? '#f0fdf4' : 'white',
                                                        color: payMethod === p.k ? '#16a34a' : '#666',
                                                        fontWeight: 700,
                                                        cursor: 'pointer',
                                                        fontSize: '0.78rem',
                                                        fontFamily: 'Poppins,sans-serif'
                                                    },
                                                    children: p.l
                                                }, p.k, false, {
                                                    fileName: "[project]/app/manager/page.tsx",
                                                    lineNumber: 576,
                                                    columnNumber: 23
                                                }, this))
                                        }, void 0, false, {
                                            fileName: "[project]/app/manager/page.tsx",
                                            lineNumber: 568,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/manager/page.tsx",
                                    lineNumber: 566,
                                    columnNumber: 17
                                }, this),
                                selOrder.status !== 'completed' && selOrder.status !== 'cancelled' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        marginBottom: '1rem'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            onClick: ()=>setDiscTab(!discTab),
                                            style: {
                                                ...btn('#f5f0e8', '#E65C00'),
                                                fontSize: '0.78rem',
                                                width: '100%',
                                                border: '1px solid #F9A826'
                                            },
                                            children: [
                                                "🏷️ ",
                                                discTab ? 'Hide' : 'Apply',
                                                " Discount"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/manager/page.tsx",
                                            lineNumber: 598,
                                            columnNumber: 19
                                        }, this),
                                        discTab && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                marginTop: '0.75rem',
                                                padding: '1rem',
                                                background: '#fffbeb',
                                                borderRadius: 10,
                                                border: '1px solid #fde68a'
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    style: {
                                                        display: 'grid',
                                                        gridTemplateColumns: '1fr 1fr',
                                                        gap: '0.5rem',
                                                        marginBottom: '0.5rem'
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
                                                                    children: "Amount (₹)"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/manager/page.tsx",
                                                                    lineNumber: 608,
                                                                    columnNumber: 27
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                    type: "number",
                                                                    value: discAmt,
                                                                    onChange: (e)=>setDiscAmt(e.target.value),
                                                                    placeholder: "e.g. 50",
                                                                    style: {
                                                                        ...inp,
                                                                        fontSize: '0.82rem'
                                                                    }
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/manager/page.tsx",
                                                                    lineNumber: 609,
                                                                    columnNumber: 27
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/manager/page.tsx",
                                                            lineNumber: 607,
                                                            columnNumber: 25
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
                                                                    children: "Reason"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/manager/page.tsx",
                                                                    lineNumber: 612,
                                                                    columnNumber: 27
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                    value: discNote,
                                                                    onChange: (e)=>setDiscNote(e.target.value),
                                                                    placeholder: "e.g. Loyalty",
                                                                    style: {
                                                                        ...inp,
                                                                        fontSize: '0.82rem'
                                                                    }
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/manager/page.tsx",
                                                                    lineNumber: 613,
                                                                    columnNumber: 27
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/manager/page.tsx",
                                                            lineNumber: 611,
                                                            columnNumber: 25
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/manager/page.tsx",
                                                    lineNumber: 606,
                                                    columnNumber: 23
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
                                                            children: "Admin PIN"
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/manager/page.tsx",
                                                            lineNumber: 617,
                                                            columnNumber: 25
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            type: "password",
                                                            value: pinInput,
                                                            onChange: (e)=>setPinInput(e.target.value),
                                                            placeholder: "••••",
                                                            maxLength: 6,
                                                            style: {
                                                                ...inp,
                                                                letterSpacing: '0.4em',
                                                                textAlign: 'center',
                                                                fontSize: '0.82rem'
                                                            }
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/manager/page.tsx",
                                                            lineNumber: 618,
                                                            columnNumber: 25
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/manager/page.tsx",
                                                    lineNumber: 616,
                                                    columnNumber: 23
                                                }, this),
                                                pinMsg && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    style: {
                                                        fontSize: '0.75rem',
                                                        color: '#ef4444',
                                                        marginTop: '0.4rem'
                                                    },
                                                    children: pinMsg
                                                }, void 0, false, {
                                                    fileName: "[project]/app/manager/page.tsx",
                                                    lineNumber: 620,
                                                    columnNumber: 34
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    onClick: applyOrderDiscount,
                                                    style: {
                                                        ...btn('#f59e0b', '#1A0800'),
                                                        width: '100%',
                                                        marginTop: '0.5rem',
                                                        fontSize: '0.82rem'
                                                    },
                                                    children: "Apply Discount"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/manager/page.tsx",
                                                    lineNumber: 621,
                                                    columnNumber: 23
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/manager/page.tsx",
                                            lineNumber: 605,
                                            columnNumber: 21
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/manager/page.tsx",
                                    lineNumber: 597,
                                    columnNumber: 17
                                }, this),
                                [
                                    'prepared',
                                    'served'
                                ].includes(selOrder.status) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        marginBottom: '1rem'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            onClick: ()=>setVoidTab(!voidTab),
                                            style: {
                                                ...btn('#7f1d1d', '#fca5a5'),
                                                fontSize: '0.78rem',
                                                width: '100%',
                                                border: '1px solid #fca5a5'
                                            },
                                            children: [
                                                "⚠️ ",
                                                voidTab ? 'Hide' : 'Void Order',
                                                " (food already prepared — requires PIN)"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/manager/page.tsx",
                                            lineNumber: 632,
                                            columnNumber: 19
                                        }, this),
                                        voidTab && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                marginTop: '0.75rem',
                                                padding: '1rem',
                                                background: '#fef2f2',
                                                borderRadius: 10,
                                                border: '1px solid #fecaca'
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    style: {
                                                        fontSize: '0.75rem',
                                                        color: '#7f1d1d',
                                                        marginBottom: '0.5rem',
                                                        fontWeight: 600
                                                    },
                                                    children: "⚠️ Void = food was prepared but bill is reversed. This action is logged for owner audit."
                                                }, void 0, false, {
                                                    fileName: "[project]/app/manager/page.tsx",
                                                    lineNumber: 640,
                                                    columnNumber: 23
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    style: {
                                                        marginBottom: '0.5rem'
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
                                                            children: "Void Reason (required)"
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/manager/page.tsx",
                                                            lineNumber: 644,
                                                            columnNumber: 25
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            value: voidReason,
                                                            onChange: (e)=>setVoidReason(e.target.value),
                                                            placeholder: "e.g. Wrong order, customer refused",
                                                            style: {
                                                                ...inp,
                                                                fontSize: '0.82rem'
                                                            }
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/manager/page.tsx",
                                                            lineNumber: 645,
                                                            columnNumber: 25
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/manager/page.tsx",
                                                    lineNumber: 643,
                                                    columnNumber: 23
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    style: {
                                                        marginBottom: '0.5rem'
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
                                                            children: "Admin PIN"
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/manager/page.tsx",
                                                            lineNumber: 648,
                                                            columnNumber: 25
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            type: "password",
                                                            value: voidPin,
                                                            onChange: (e)=>setVoidPin(e.target.value),
                                                            placeholder: "••••",
                                                            maxLength: 6,
                                                            style: {
                                                                ...inp,
                                                                letterSpacing: '0.4em',
                                                                textAlign: 'center',
                                                                fontSize: '0.82rem'
                                                            }
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/manager/page.tsx",
                                                            lineNumber: 649,
                                                            columnNumber: 25
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/manager/page.tsx",
                                                    lineNumber: 647,
                                                    columnNumber: 23
                                                }, this),
                                                voidMsg && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    style: {
                                                        fontSize: '0.75rem',
                                                        color: '#ef4444',
                                                        marginBottom: '0.4rem'
                                                    },
                                                    children: voidMsg
                                                }, void 0, false, {
                                                    fileName: "[project]/app/manager/page.tsx",
                                                    lineNumber: 651,
                                                    columnNumber: 35
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    onClick: voidSelectedOrder,
                                                    style: {
                                                        ...btn('#ef4444'),
                                                        width: '100%',
                                                        fontSize: '0.82rem'
                                                    },
                                                    children: "⚠️ Confirm Void Order"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/manager/page.tsx",
                                                    lineNumber: 652,
                                                    columnNumber: 23
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/manager/page.tsx",
                                            lineNumber: 639,
                                            columnNumber: 21
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/manager/page.tsx",
                                    lineNumber: 631,
                                    columnNumber: 17
                                }, this),
                                billMsg && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        background: '#dcfce7',
                                        color: '#16a34a',
                                        borderRadius: 10,
                                        padding: '0.75rem',
                                        textAlign: 'center',
                                        fontWeight: 700,
                                        marginBottom: '0.75rem'
                                    },
                                    children: billMsg
                                }, void 0, false, {
                                    fileName: "[project]/app/manager/page.tsx",
                                    lineNumber: 662,
                                    columnNumber: 17
                                }, this),
                                selOrder.status !== 'completed' && selOrder.status !== 'cancelled' && selOrder.status !== 'void' && !billMsg && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: markCompleted,
                                    style: {
                                        ...btn('#16a34a'),
                                        width: '100%',
                                        padding: '0.85rem',
                                        fontSize: '1rem',
                                        borderRadius: 12
                                    },
                                    children: [
                                        "✅ Settle Bill — ₹",
                                        selOrder.total,
                                        " (",
                                        PAY_LABELS[payMethod] || payMethod,
                                        ")"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/manager/page.tsx",
                                    lineNumber: 668,
                                    columnNumber: 17
                                }, this),
                                selOrder.status === 'completed' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        background: '#f0fdf4',
                                        color: '#16a34a',
                                        borderRadius: 10,
                                        padding: '0.85rem',
                                        textAlign: 'center',
                                        fontWeight: 800,
                                        fontSize: '1rem'
                                    },
                                    children: "✅ Bill Settled"
                                }, void 0, false, {
                                    fileName: "[project]/app/manager/page.tsx",
                                    lineNumber: 677,
                                    columnNumber: 17
                                }, this),
                                selOrder.status === 'cancelled' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        background: '#fef2f2',
                                        color: '#ef4444',
                                        borderRadius: 10,
                                        padding: '0.85rem',
                                        textAlign: 'center',
                                        fontWeight: 700,
                                        fontSize: '0.9rem'
                                    },
                                    children: [
                                        "❌ Order Cancelled — ",
                                        selOrder.cancelReason || ''
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/manager/page.tsx",
                                    lineNumber: 682,
                                    columnNumber: 17
                                }, this),
                                selOrder.status === 'void' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        background: '#fef2f2',
                                        color: '#7f1d1d',
                                        borderRadius: 10,
                                        padding: '0.85rem',
                                        textAlign: 'center',
                                        fontWeight: 700,
                                        fontSize: '0.9rem'
                                    },
                                    children: [
                                        "⚠️ Order Voided — ",
                                        selOrder.voidReason || '',
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                fontSize: '0.72rem',
                                                color: '#ef4444',
                                                marginTop: '0.25rem'
                                            },
                                            children: "Logged for admin audit"
                                        }, void 0, false, {
                                            fileName: "[project]/app/manager/page.tsx",
                                            lineNumber: 689,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/manager/page.tsx",
                                    lineNumber: 687,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/manager/page.tsx",
                            lineNumber: 535,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/manager/page.tsx",
                    lineNumber: 512,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/manager/page.tsx",
                lineNumber: 508,
                columnNumber: 9
            }, this),
            selTab && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.6)',
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    zIndex: 200
                },
                onClick: ()=>setSelTab(null),
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    onClick: (e)=>e.stopPropagation(),
                    style: {
                        background: 'white',
                        width: '100%',
                        maxWidth: '540px',
                        maxHeight: '92vh',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: '16px 16px 0 0',
                        boxShadow: '0 -20px 60px rgba(0,0,0,0.3)'
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                background: 'linear-gradient(135deg,#064e3b,#16a34a)',
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
                                                fontWeight: 900,
                                                fontSize: '1.3rem'
                                            },
                                            children: [
                                                "🪑 Table ",
                                                selTab.tableId,
                                                " — ",
                                                selTab.customerName
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/manager/page.tsx",
                                            lineNumber: 710,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                fontSize: '0.75rem',
                                                color: '#6ee7b7'
                                            },
                                            children: [
                                                "💳 Awaiting Payment · ",
                                                selTab.partySize && selTab.partySize > 1 ? `${selTab.partySize} guests · ` : '',
                                                (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getTabOrders"])(selTab.id).length,
                                                " order(s)"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/manager/page.tsx",
                                            lineNumber: 713,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/manager/page.tsx",
                                    lineNumber: 709,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: ()=>setSelTab(null),
                                    style: {
                                        background: 'none',
                                        border: 'none',
                                        color: 'white',
                                        fontSize: '1.5rem',
                                        cursor: 'pointer'
                                    },
                                    children: "×"
                                }, void 0, false, {
                                    fileName: "[project]/app/manager/page.tsx",
                                    lineNumber: 717,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/manager/page.tsx",
                            lineNumber: 708,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                flex: 1,
                                overflowY: 'auto',
                                padding: '1rem 1.5rem'
                            },
                            children: [
                                tabBillMsg && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        background: tabBillMsg.startsWith('✅') ? '#f0fdf4' : '#fef2f2',
                                        border: `1px solid ${tabBillMsg.startsWith('✅') ? '#86efac' : '#fecaca'}`,
                                        borderRadius: 8,
                                        padding: '0.6rem 0.85rem',
                                        marginBottom: '0.75rem',
                                        fontSize: '0.85rem',
                                        fontWeight: 700,
                                        color: tabBillMsg.startsWith('✅') ? '#16a34a' : '#dc2626'
                                    },
                                    children: tabBillMsg
                                }, void 0, false, {
                                    fileName: "[project]/app/manager/page.tsx",
                                    lineNumber: 723,
                                    columnNumber: 17
                                }, this),
                                (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getTabOrders"])(selTab.id).map((order, oi)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            marginBottom: '0.75rem',
                                            background: '#f9fafb',
                                            borderRadius: 10,
                                            padding: '0.75rem 1rem'
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    marginBottom: '0.4rem'
                                                },
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        style: {
                                                            fontWeight: 800,
                                                            fontSize: '0.88rem',
                                                            color: '#064e3b'
                                                        },
                                                        children: [
                                                            "Round ",
                                                            oi + 1,
                                                            " ",
                                                            order.orderNum ? `· #${order.orderNum}` : ''
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/manager/page.tsx",
                                                        lineNumber: 732,
                                                        columnNumber: 21
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
                                                                    fontSize: '0.68rem',
                                                                    fontWeight: 700,
                                                                    padding: '0.1rem 0.5rem',
                                                                    borderRadius: 8,
                                                                    background: (STATUS_COLOR[order.status] || '#ddd') + '20',
                                                                    color: STATUS_COLOR[order.status] || '#666',
                                                                    textTransform: 'uppercase'
                                                                },
                                                                children: order.status
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/manager/page.tsx",
                                                                lineNumber: 736,
                                                                columnNumber: 23
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                style: {
                                                                    fontWeight: 900,
                                                                    color: '#16a34a',
                                                                    fontSize: '0.95rem'
                                                                },
                                                                children: [
                                                                    "₹",
                                                                    order.total
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/manager/page.tsx",
                                                                lineNumber: 739,
                                                                columnNumber: 23
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/manager/page.tsx",
                                                        lineNumber: 735,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/manager/page.tsx",
                                                lineNumber: 731,
                                                columnNumber: 19
                                            }, this),
                                            order.items.map((item, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    style: {
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        fontSize: '0.82rem',
                                                        padding: '0.15rem 0',
                                                        borderBottom: '1px solid #f0f0f0'
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
                                                                    fileName: "[project]/app/manager/page.tsx",
                                                                    lineNumber: 744,
                                                                    columnNumber: 67
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/manager/page.tsx",
                                                            lineNumber: 744,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            style: {
                                                                color: '#666'
                                                            },
                                                            children: [
                                                                "₹",
                                                                item.subtotal ?? item.price * item.qty
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/manager/page.tsx",
                                                            lineNumber: 745,
                                                            columnNumber: 23
                                                        }, this)
                                                    ]
                                                }, i, true, {
                                                    fileName: "[project]/app/manager/page.tsx",
                                                    lineNumber: 743,
                                                    columnNumber: 21
                                                }, this))
                                        ]
                                    }, order.id, true, {
                                        fileName: "[project]/app/manager/page.tsx",
                                        lineNumber: 730,
                                        columnNumber: 17
                                    }, this)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        borderTop: '2px solid #e5e7eb',
                                        paddingTop: '0.75rem',
                                        marginBottom: '1rem'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                fontSize: '0.88rem',
                                                color: '#666',
                                                marginBottom: '0.3rem'
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    children: "Subtotal"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/manager/page.tsx",
                                                    lineNumber: 754,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    children: [
                                                        "₹",
                                                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getTabOrders"])(selTab.id).filter((o)=>![
                                                                'void',
                                                                'cancelled'
                                                            ].includes(o.status)).reduce((s, o)=>s + o.total, 0)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/manager/page.tsx",
                                                    lineNumber: 755,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/manager/page.tsx",
                                            lineNumber: 753,
                                            columnNumber: 17
                                        }, this),
                                        (selTab.discount ?? 0) > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                fontSize: '0.88rem',
                                                color: '#16a34a',
                                                marginBottom: '0.3rem'
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    children: "Discount"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/manager/page.tsx",
                                                    lineNumber: 759,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    children: [
                                                        "−₹",
                                                        selTab.discount
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/manager/page.tsx",
                                                    lineNumber: 759,
                                                    columnNumber: 42
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/manager/page.tsx",
                                            lineNumber: 758,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                fontWeight: 900,
                                                fontSize: '1.3rem',
                                                color: '#16a34a'
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    children: "Total"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/manager/page.tsx",
                                                    lineNumber: 763,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    children: [
                                                        "₹",
                                                        selTab.totalAmount
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/manager/page.tsx",
                                                    lineNumber: 763,
                                                    columnNumber: 37
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/manager/page.tsx",
                                            lineNumber: 762,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/manager/page.tsx",
                                    lineNumber: 752,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: ()=>setTabShowDisc(!tabShowDisc),
                                    style: {
                                        ...btn('#f3f4f6', '#333'),
                                        width: '100%',
                                        marginBottom: '0.75rem',
                                        fontSize: '0.82rem'
                                    },
                                    children: tabShowDisc ? '▲ Hide Discount' : '🏷️ Apply Discount'
                                }, void 0, false, {
                                    fileName: "[project]/app/manager/page.tsx",
                                    lineNumber: 768,
                                    columnNumber: 15
                                }, this),
                                tabShowDisc && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        background: '#fafafa',
                                        borderRadius: 10,
                                        padding: '0.85rem',
                                        marginBottom: '1rem',
                                        border: '1px solid #e5e7eb'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                display: 'flex',
                                                gap: '0.5rem',
                                                marginBottom: '0.5rem'
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                    placeholder: "Amount ₹",
                                                    value: tabDiscAmt,
                                                    onChange: (e)=>setTabDiscAmt(e.target.value),
                                                    style: {
                                                        ...inp,
                                                        width: '100px',
                                                        flex: 'none'
                                                    }
                                                }, void 0, false, {
                                                    fileName: "[project]/app/manager/page.tsx",
                                                    lineNumber: 777,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                    placeholder: "Reason",
                                                    value: tabDiscNote,
                                                    onChange: (e)=>setTabDiscNote(e.target.value),
                                                    style: {
                                                        ...inp,
                                                        flex: 1
                                                    }
                                                }, void 0, false, {
                                                    fileName: "[project]/app/manager/page.tsx",
                                                    lineNumber: 783,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/manager/page.tsx",
                                            lineNumber: 776,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                display: 'flex',
                                                gap: '0.5rem'
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                    placeholder: "Admin PIN",
                                                    type: "password",
                                                    value: tabDiscPin,
                                                    onChange: (e)=>setTabDiscPin(e.target.value),
                                                    style: {
                                                        ...inp,
                                                        flex: 1
                                                    }
                                                }, void 0, false, {
                                                    fileName: "[project]/app/manager/page.tsx",
                                                    lineNumber: 791,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    onClick: ()=>{
                                                        const amt = parseInt(tabDiscAmt);
                                                        if (!tabDiscNote.trim()) {
                                                            setTabDiscMsg('❌ Enter reason');
                                                            return;
                                                        }
                                                        if (tabDiscPin !== (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getPin"])()) {
                                                            setTabDiscMsg('❌ Wrong PIN');
                                                            return;
                                                        }
                                                        if (isNaN(amt) || amt < 0) {
                                                            setTabDiscMsg('❌ Invalid amount');
                                                            return;
                                                        }
                                                        const ok = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["applyTabDiscount"])(selTab.id, amt, tabDiscNote.trim());
                                                        if (ok) {
                                                            const updatedTabs = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getTabs"])();
                                                            const updated = updatedTabs.find((t)=>t.id === selTab.id);
                                                            if (updated) setSelTab(updated);
                                                            setTabs(updatedTabs);
                                                            setTabDiscMsg('✅ Discount applied!');
                                                            setTabShowDisc(false);
                                                            setTimeout(()=>setTabDiscMsg(''), 2000);
                                                        } else {
                                                            setTabDiscMsg('❌ Could not apply discount');
                                                        }
                                                    },
                                                    style: btn(),
                                                    children: "Apply"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/manager/page.tsx",
                                                    lineNumber: 798,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/manager/page.tsx",
                                            lineNumber: 790,
                                            columnNumber: 19
                                        }, this),
                                        tabDiscMsg && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                fontSize: '0.78rem',
                                                color: tabDiscMsg.startsWith('✅') ? '#16a34a' : '#dc2626',
                                                marginTop: '0.4rem',
                                                fontWeight: 700
                                            },
                                            children: tabDiscMsg
                                        }, void 0, false, {
                                            fileName: "[project]/app/manager/page.tsx",
                                            lineNumber: 820,
                                            columnNumber: 34
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/manager/page.tsx",
                                    lineNumber: 775,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        marginBottom: '1rem'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                fontWeight: 700,
                                                fontSize: '0.82rem',
                                                color: '#555',
                                                marginBottom: '0.5rem'
                                            },
                                            children: "Payment Method"
                                        }, void 0, false, {
                                            fileName: "[project]/app/manager/page.tsx",
                                            lineNumber: 826,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                display: 'flex',
                                                flexWrap: 'wrap',
                                                gap: '0.5rem'
                                            },
                                            children: Object.entries(PAY_LABELS).map(([key, label])=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    onClick: ()=>setTabPayMethod(key),
                                                    style: {
                                                        padding: '0.4rem 0.9rem',
                                                        borderRadius: 20,
                                                        cursor: 'pointer',
                                                        fontFamily: 'Poppins,sans-serif',
                                                        fontWeight: 600,
                                                        fontSize: '0.78rem',
                                                        border: `2px solid ${tabPayMethod === key ? '#16a34a' : '#ddd'}`,
                                                        background: tabPayMethod === key ? '#16a34a' : 'white',
                                                        color: tabPayMethod === key ? 'white' : '#555'
                                                    },
                                                    children: label
                                                }, key, false, {
                                                    fileName: "[project]/app/manager/page.tsx",
                                                    lineNumber: 829,
                                                    columnNumber: 21
                                                }, this))
                                        }, void 0, false, {
                                            fileName: "[project]/app/manager/page.tsx",
                                            lineNumber: 827,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/manager/page.tsx",
                                    lineNumber: 825,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/manager/page.tsx",
                            lineNumber: 721,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                padding: '1rem 1.5rem',
                                borderTop: '2px solid #f5f0e8',
                                background: 'white'
                            },
                            children: [
                                tabCloseConfirm && (()=>{
                                    const inProgress = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getTabOrders"])(selTab.id).filter((o)=>[
                                            'awaiting_waiter',
                                            'pending',
                                            'preparing',
                                            'prepared'
                                        ].includes(o.status));
                                    if (inProgress.length === 0) return null;
                                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            background: '#fff7ed',
                                            border: '2px solid #f97316',
                                            borderRadius: 8,
                                            padding: '0.75rem 1rem',
                                            marginBottom: '0.75rem'
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    fontWeight: 800,
                                                    color: '#c2410c',
                                                    fontSize: '0.85rem',
                                                    marginBottom: '0.35rem'
                                                },
                                                children: [
                                                    "⚠️ ",
                                                    inProgress.length,
                                                    " Order",
                                                    inProgress.length > 1 ? 's' : '',
                                                    " Still In Progress"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/manager/page.tsx",
                                                lineNumber: 851,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    fontSize: '0.78rem',
                                                    color: '#9a3412',
                                                    lineHeight: 1.5
                                                },
                                                children: [
                                                    inProgress.map((o)=>`#${o.orderNum || o.id.slice(-4)} (${o.status})`).join(', '),
                                                    " — are you sure you want to close this tab anyway? This will mark all orders as completed."
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/manager/page.tsx",
                                                lineNumber: 854,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                onClick: ()=>setTabCloseConfirm(false),
                                                style: {
                                                    marginTop: '0.5rem',
                                                    fontSize: '0.75rem',
                                                    background: 'none',
                                                    border: 'none',
                                                    color: '#9a3412',
                                                    cursor: 'pointer',
                                                    textDecoration: 'underline',
                                                    padding: 0
                                                },
                                                children: "Cancel"
                                            }, void 0, false, {
                                                fileName: "[project]/app/manager/page.tsx",
                                                lineNumber: 857,
                                                columnNumber: 21
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/manager/page.tsx",
                                        lineNumber: 850,
                                        columnNumber: 19
                                    }, this);
                                })(),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: ()=>{
                                        // Check for in-progress orders; warn manager on first click
                                        if (!tabCloseConfirm) {
                                            const inProgress = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getTabOrders"])(selTab.id).filter((o)=>[
                                                    'awaiting_waiter',
                                                    'pending',
                                                    'preparing',
                                                    'prepared'
                                                ].includes(o.status));
                                            if (inProgress.length > 0) {
                                                setTabCloseConfirm(true);
                                                return; // don't close yet — force manager to click again
                                            }
                                        }
                                        setTabCloseConfirm(false);
                                        const ok = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["closeTab"])(selTab.id, tabPayMethod, selTab.discount, selTab.discountReason);
                                        if (ok) {
                                            setTabBillMsg('✅ Payment collected! Tab closed.');
                                            setTabs((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getTabs"])());
                                            refresh();
                                            setTimeout(()=>{
                                                setSelTab(null);
                                                setTabBillMsg('');
                                                setTabCloseConfirm(false);
                                            }, 1800);
                                        } else {
                                            setTabBillMsg('❌ Could not close tab');
                                        }
                                    },
                                    style: {
                                        ...btn(tabCloseConfirm ? '#dc2626' : undefined),
                                        width: '100%',
                                        padding: '0.85rem',
                                        fontSize: '1rem',
                                        letterSpacing: '0.3px'
                                    },
                                    children: tabCloseConfirm ? '⚠️ Confirm — Close Tab Anyway' : `✅ Collect ₹${selTab.totalAmount} · Close Tab`
                                }, void 0, false, {
                                    fileName: "[project]/app/manager/page.tsx",
                                    lineNumber: 866,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/manager/page.tsx",
                            lineNumber: 842,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/manager/page.tsx",
                    lineNumber: 703,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/manager/page.tsx",
                lineNumber: 699,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/manager/page.tsx",
        lineNumber: 186,
        columnNumber: 5
    }, this);
}
_s(ManagerPage, "+cV/L4KDJzxMf17yizKvwVHCwRY=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"]
    ];
});
_c = ManagerPage;
var _c;
__turbopack_context__.k.register(_c, "ManagerPage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=_19040ef4._.js.map