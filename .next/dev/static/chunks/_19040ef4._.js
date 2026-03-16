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
    "loginDelivery",
    ()=>loginDelivery,
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
    manager: 'fl_session_manager',
    delivery: 'fl_session_delivery'
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
function loginDelivery(name) {
    const n = name.trim() || 'Delivery';
    const s = {
        role: 'delivery',
        name: n,
        username: n.toLowerCase().replace(/\s+/g, '_'),
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

// ─── Foodie Lover — Storage Layer ─────────────────────────────────────────────
// All persistence via localStorage (no backend). v2.0 — CustomerTab system.
// Exports every type and function used across pages.
// ─── Types ────────────────────────────────────────────────────────────────────
__turbopack_context__.s([
    "DEFAULT_MENU",
    ()=>DEFAULT_MENU,
    "acknowledgeWaiterCall",
    ()=>acknowledgeWaiterCall,
    "addFoodReceiptDispute",
    ()=>addFoodReceiptDispute,
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
    "buildWhatsappOrderUrl",
    ()=>buildWhatsappOrderUrl,
    "cancelOrder",
    ()=>cancelOrder,
    "clearFraudAlerts",
    ()=>clearFraudAlerts,
    "closeTab",
    ()=>closeTab,
    "createSplitBill",
    ()=>createSplitBill,
    "createTab",
    ()=>createTab,
    "customerConfirmDelivery",
    ()=>customerConfirmDelivery,
    "emitBillRequestedEvent",
    ()=>emitBillRequestedEvent,
    "exportOrdersCSV",
    ()=>exportOrdersCSV,
    "findActiveDeviceSession",
    ()=>findActiveDeviceSession,
    "generateTrackingToken",
    ()=>generateTrackingToken,
    "getActiveTabsForTable",
    ()=>getActiveTabsForTable,
    "getAllOrderEvents",
    ()=>getAllOrderEvents,
    "getDeliveryQueue",
    ()=>getDeliveryQueue,
    "getDeviceRecords",
    ()=>getDeviceRecords,
    "getDevicesForTab",
    ()=>getDevicesForTab,
    "getDisputeAlerts",
    ()=>getDisputeAlerts,
    "getEndOfDayReport",
    ()=>getEndOfDayReport,
    "getEventsForOrder",
    ()=>getEventsForOrder,
    "getFraudAlerts",
    ()=>getFraudAlerts,
    "getLastWaiterCallTime",
    ()=>getLastWaiterCallTime,
    "getLatestEvent",
    ()=>getLatestEvent,
    "getMenu",
    ()=>getMenu,
    "getNextOrderNumber",
    ()=>getNextOrderNumber,
    "getOnlineOrderStats",
    ()=>getOnlineOrderStats,
    "getOpenTabForCustomer",
    ()=>getOpenTabForCustomer,
    "getOrCreateDeviceId",
    ()=>getOrCreateDeviceId,
    "getOrders",
    ()=>getOrders,
    "getOrdersInPeriod",
    ()=>getOrdersInPeriod,
    "getPendingDisputes",
    ()=>getPendingDisputes,
    "getPendingWaiterCalls",
    ()=>getPendingWaiterCalls,
    "getPin",
    ()=>getPin,
    "getSplitBillForTab",
    ()=>getSplitBillForTab,
    "getSplitBills",
    ()=>getSplitBills,
    "getTab",
    ()=>getTab,
    "getTabOrders",
    ()=>getTabOrders,
    "getTableOccupancy",
    ()=>getTableOccupancy,
    "getTableOccupancyStats",
    ()=>getTableOccupancyStats,
    "getTables",
    ()=>getTables,
    "getTabs",
    ()=>getTabs,
    "getTrackingUrl",
    ()=>getTrackingUrl,
    "getWaiterCalls",
    ()=>getWaiterCalls,
    "getWaiterStats",
    ()=>getWaiterStats,
    "getWhatsappNumber",
    ()=>getWhatsappNumber,
    "isSplitFullyPaid",
    ()=>isSplitFullyPaid,
    "markOrderDelivered",
    ()=>markOrderDelivered,
    "markOrderPickedUp",
    ()=>markOrderPickedUp,
    "markSplitEntryPaid",
    ()=>markSplitEntryPaid,
    "registerDevice",
    ()=>registerDevice,
    "removeDeviceRecord",
    ()=>removeDeviceRecord,
    "requestBill",
    ()=>requestBill,
    "resolveDispute",
    ()=>resolveDispute,
    "saveDeviceRecords",
    ()=>saveDeviceRecords,
    "saveDisputeAlerts",
    ()=>saveDisputeAlerts,
    "saveMenu",
    ()=>saveMenu,
    "saveOrders",
    ()=>saveOrders,
    "savePin",
    ()=>savePin,
    "saveSplitBills",
    ()=>saveSplitBills,
    "saveTables",
    ()=>saveTables,
    "saveTabs",
    ()=>saveTabs,
    "saveWaiterCalls",
    ()=>saveWaiterCalls,
    "saveWhatsappNumber",
    ()=>saveWhatsappNumber,
    "syncTabTotal",
    ()=>syncTabTotal,
    "syncTableStatus",
    ()=>syncTableStatus,
    "updateItemStatus",
    ()=>updateItemStatus,
    "updateOrderStatus",
    ()=>updateOrderStatus,
    "verifyTrackingToken",
    ()=>verifyTrackingToken,
    "voidOrder",
    ()=>voidOrder
]);
// ─── localStorage keys ────────────────────────────────────────────────────────
const KEYS = {
    orders: 'fl_orders',
    tables: 'fl_tables',
    menu: 'fl_menu',
    pin: 'fl_admin_pin',
    tabs: 'fl_customer_tabs',
    orderNum: 'fl_order_num_counter',
    fraudAlerts: 'fl_fraud_alerts',
    waiterCalls: 'fl_waiter_calls',
    disputes: 'fl_food_disputes',
    splitBills: 'fl_split_bills',
    devices: 'fl_device_records',
    whatsapp: 'fl_whatsapp_number',
    events: 'fl_order_events'
};
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
const DEFAULT_MENU = [
    {
        id: 'M01',
        category: 'Biryani',
        name: 'Chicken Dum Biryani',
        desc: 'Slow-cooked aromatic rice with tender chicken',
        price: 280,
        img: '🍗',
        badge: 'bestseller',
        available: true
    },
    {
        id: 'M02',
        category: 'Biryani',
        name: 'Mutton Biryani',
        desc: 'Rich biryani with tender mutton pieces',
        price: 320,
        img: '🥩',
        badge: 'famous',
        available: true
    },
    {
        id: 'M03',
        category: 'Biryani',
        name: 'Veg Biryani',
        desc: 'Fragrant basmati with fresh vegetables',
        price: 200,
        img: '🥦',
        badge: 'popular',
        available: true
    },
    {
        id: 'M04',
        category: 'Biryani',
        name: 'Egg Biryani',
        desc: 'Classic biryani with boiled eggs',
        price: 220,
        img: '🥚',
        badge: '',
        available: true
    },
    {
        id: 'M05',
        category: 'Starters',
        name: 'Chicken 65',
        desc: 'Crispy spiced fried chicken',
        price: 180,
        img: '🍗',
        badge: 'bestseller',
        available: true
    },
    {
        id: 'M06',
        category: 'Starters',
        name: 'Gobi Manchurian',
        desc: 'Crispy cauliflower in tangy sauce',
        price: 150,
        img: '🥦',
        badge: 'popular',
        available: true
    },
    {
        id: 'M07',
        category: 'Starters',
        name: 'Fish Fry',
        desc: 'Coastal spiced fried fish',
        price: 220,
        img: '🐟',
        badge: 'famous',
        available: true
    },
    {
        id: 'M08',
        category: 'Starters',
        name: 'Paneer Tikka',
        desc: 'Grilled cottage cheese with bell peppers',
        price: 200,
        img: '🧀',
        badge: 'chef',
        available: true
    },
    {
        id: 'M09',
        category: 'Mains',
        name: 'Butter Chicken',
        desc: 'Creamy tomato-based chicken curry',
        price: 250,
        img: '🍛',
        badge: 'bestseller',
        available: true
    },
    {
        id: 'M10',
        category: 'Mains',
        name: 'Dal Tadka',
        desc: 'Yellow lentils with spiced tempering',
        price: 120,
        img: '🍲',
        badge: '',
        available: true
    },
    {
        id: 'M11',
        category: 'Mains',
        name: 'Palak Paneer',
        desc: 'Cottage cheese in creamy spinach gravy',
        price: 180,
        img: '🍃',
        badge: 'popular',
        available: true
    },
    {
        id: 'M12',
        category: 'Mains',
        name: 'Prawn Masala',
        desc: 'Fresh prawns in spicy coconut gravy',
        price: 300,
        img: '🍤',
        badge: 'chef',
        available: true
    },
    {
        id: 'M13',
        category: 'Breads',
        name: 'Butter Naan',
        desc: 'Soft leavened bread with butter',
        price: 45,
        img: '🫓',
        badge: '',
        available: true
    },
    {
        id: 'M14',
        category: 'Breads',
        name: 'Garlic Naan',
        desc: 'Naan topped with garlic and herbs',
        price: 55,
        img: '🫓',
        badge: 'popular',
        available: true
    },
    {
        id: 'M15',
        category: 'Breads',
        name: 'Rumali Roti',
        desc: 'Thin handkerchief bread',
        price: 35,
        img: '🫓',
        badge: '',
        available: true
    },
    {
        id: 'M16',
        category: 'Desserts',
        name: 'Gulab Jamun',
        desc: 'Soft milk-solid dumplings in rose syrup',
        price: 80,
        img: '🍮',
        badge: 'bestseller',
        available: true
    },
    {
        id: 'M17',
        category: 'Desserts',
        name: 'Phirni',
        desc: 'Creamy rice pudding with saffron',
        price: 90,
        img: '🍮',
        badge: 'chef',
        available: true
    },
    {
        id: 'M18',
        category: 'Drinks',
        name: 'Masala Chai',
        desc: 'Spiced milk tea',
        price: 40,
        img: '☕',
        badge: '',
        available: true
    },
    {
        id: 'M19',
        category: 'Drinks',
        name: 'Sweet Lassi',
        desc: 'Chilled yogurt drink',
        price: 70,
        img: '🥛',
        badge: 'popular',
        available: true
    },
    {
        id: 'M20',
        category: 'Drinks',
        name: 'Fresh Lime Soda',
        desc: 'Refreshing lemon soda',
        price: 60,
        img: '🍋',
        badge: '',
        available: true
    }
];
const DEFAULT_TABLES = Array.from({
    length: 20
}, (_, i)=>({
        id: `T${String(i + 1).padStart(2, '0')}`,
        status: 'available',
        capacity: i < 4 ? 2 : i < 14 ? 4 : 6
    }));
const getPin = ()=>ls_get(KEYS.pin, '1234');
const savePin = (p)=>ls_set(KEYS.pin, p);
function getNextOrderNumber() {
    const n = ls_get(KEYS.orderNum, 0) + 1;
    ls_set(KEYS.orderNum, n);
    return n;
}
const getOrders = ()=>ls_get(KEYS.orders, []);
const saveOrders = (o)=>ls_set(KEYS.orders, o);
function addOrder(order) {
    // Generate tracking token if missing (used by /track page)
    if (!order.trackingToken) {
        order = {
            ...order,
            trackingToken: generateTrackingToken()
        };
    }
    const orders = getOrders();
    orders.push(order);
    saveOrders(orders);
    // Emit OrderPlaced event
    _addOrderEvent(order.id, 'OrderPlaced', order.customerName || 'Customer', order.type === 'delivery' ? `Delivery to: ${order.deliveryAddress}` : order.type === 'pickup' ? 'Pickup order' : `Table ${order.tableId}`);
    return order;
}
/** Map OrderStatus → OrderEventType for automatic event emission */ const STATUS_TO_EVENT = {
    pending: 'KitchenAccepted',
    preparing: 'Preparing',
    prepared: 'Prepared',
    served: 'Served',
    out_for_delivery: 'OutForDelivery',
    delivered: 'Delivered',
    completed: 'Closed',
    cancelled: 'Cancelled'
};
function updateOrderStatus(id, status, by = 'System', force = false) {
    const orders = getOrders();
    const idx = orders.findIndex((o)=>o.id === id);
    if (idx === -1) return false;
    const order = orders[idx];
    // Role-based status flow enforcement (unless force=true)
    if (!force) {
        const flow = [
            'awaiting_waiter',
            'pending',
            'preparing',
            'prepared',
            'served',
            'completed'
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
            ...order.timeline || [],
            {
                status,
                by,
                at: new Date().toISOString()
            }
        ]
    };
    saveOrders(orders);
    // Co-emit matching OrderEvent
    const evtType = STATUS_TO_EVENT[status];
    if (evtType) _addOrderEvent(id, evtType, by);
    return true;
}
function cancelOrder(id, reason, by = 'System') {
    const orders = getOrders();
    const idx = orders.findIndex((o)=>o.id === id);
    if (idx === -1) return false;
    orders[idx] = {
        ...orders[idx],
        status: 'cancelled',
        cancelReason: reason,
        timeline: [
            ...orders[idx].timeline || [],
            {
                status: 'cancelled',
                by,
                at: new Date().toISOString(),
                note: reason
            }
        ]
    };
    saveOrders(orders);
    _addOrderEvent(id, 'Cancelled', by, reason);
    return true;
}
function voidOrder(id, reason, by = 'Manager') {
    const orders = getOrders();
    const idx = orders.findIndex((o)=>o.id === id);
    if (idx === -1) return false;
    orders[idx] = {
        ...orders[idx],
        status: 'void',
        cancelReason: reason,
        timeline: [
            ...orders[idx].timeline || [],
            {
                status: 'void',
                by,
                at: new Date().toISOString(),
                note: reason
            }
        ]
    };
    saveOrders(orders);
    if ((orders[idx].total || 0) > 100) {
        addFraudAlert({
            type: 'void_order',
            orderId: id,
            detail: `Order #${orders[idx].orderNum || id.slice(-4)} voided by ${by} — ₹${orders[idx].total}`,
            by,
            amount: orders[idx].total
        });
    }
    return true;
}
function applyDiscount(id, amount, reason, by = 'Manager') {
    const orders = getOrders();
    const idx = orders.findIndex((o)=>o.id === id);
    if (idx === -1) return false;
    const order = orders[idx];
    const subtotal = order.subtotal || order.total;
    const pct = amount / subtotal;
    if (pct > 0.5) {
        addFraudAlert({
            type: 'high_discount',
            orderId: id,
            detail: `${Math.round(pct * 100)}% discount (₹${amount}) applied by ${by}`,
            by,
            amount
        });
    }
    orders[idx] = {
        ...order,
        discount: amount,
        discountReason: reason,
        total: Math.max(0, subtotal - amount),
        timeline: [
            ...order.timeline || [],
            {
                status: 'discount',
                by,
                at: new Date().toISOString(),
                note: `₹${amount} — ${reason}`
            }
        ]
    };
    saveOrders(orders);
    return true;
}
function getOrdersInPeriod(period) {
    const orders = getOrders().filter((o)=>o.status === 'completed');
    const now = new Date();
    if (period === 'all') return orders;
    return orders.filter((o)=>{
        const d = new Date(o.timestamp);
        if (period === 'today') return d.toDateString() === now.toDateString();
        if (period === 'week') {
            const weekAgo = new Date(now);
            weekAgo.setDate(now.getDate() - 7);
            return d >= weekAgo;
        }
        if (period === 'month') {
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }
        return true;
    });
}
function exportOrdersCSV() {
    const orders = getOrders().filter((o)=>o.status === 'completed');
    const header = 'Order ID,Order#,Customer,Table,Type,Items,Subtotal,Discount,Total,Payment,Timestamp';
    const rows = orders.map((o)=>{
        const items = (o.items || []).map((i)=>`${i.name}x${i.qty}`).join('|');
        return [
            o.id,
            o.orderNum || '',
            o.customerName,
            o.tableId || '',
            o.type,
            `"${items}"`,
            o.subtotal,
            o.discount || 0,
            o.total,
            o.payment,
            o.timestamp
        ].join(',');
    });
    return [
        header,
        ...rows
    ].join('\n');
}
const getTables = ()=>ls_get(KEYS.tables, DEFAULT_TABLES);
const saveTables = (t)=>ls_set(KEYS.tables, t);
function syncTableStatus(tableId) {
    const activeTabs = getActiveTabsForTable(tableId);
    const tables = getTables();
    const idx = tables.findIndex((t)=>t.id === tableId);
    if (idx === -1) return;
    tables[idx] = {
        ...tables[idx],
        status: activeTabs.length > 0 ? 'occupied' : 'available'
    };
    saveTables(tables);
}
function getTableOccupancy(tableId) {
    const activeTabs = getActiveTabsForTable(tableId);
    if (activeTabs.length === 0) return null;
    const tab = activeTabs[0];
    return {
        tableId: tab.tableId,
        tabId: tab.id,
        name: tab.customerName,
        partySize: tab.partySize,
        since: tab.createdAt,
        status: tab.tabStatus
    };
}
const getMenu = ()=>ls_get(KEYS.menu, DEFAULT_MENU);
const saveMenu = (m)=>ls_set(KEYS.menu, m);
const getTabs = ()=>ls_get(KEYS.tabs, []);
const saveTabs = (t)=>ls_set(KEYS.tabs, t);
function getTab(id) {
    return getTabs().find((t)=>t.id === id) ?? null;
}
function getOpenTabForCustomer(tableId, customerName) {
    const name = customerName.trim().toLowerCase();
    return getTabs().find((t)=>t.tableId === tableId && t.customerName.trim().toLowerCase() === name && (t.tabStatus === 'open' || t.tabStatus === 'awaiting_payment')) ?? null;
}
function getActiveTabsForTable(tableId) {
    return getTabs().filter((t)=>t.tableId === tableId && (t.tabStatus === 'open' || t.tabStatus === 'awaiting_payment'));
}
function syncTabTotal(tabId) {
    const tabs = getTabs();
    const idx = tabs.findIndex((t)=>t.id === tabId);
    if (idx === -1) return;
    const orders = getOrders();
    const total = tabs[idx].orderIds.reduce((sum, oid)=>{
        const order = orders.find((o)=>o.id === oid);
        if (!order || [
            'cancelled',
            'void'
        ].includes(order.status)) return sum;
        return sum + (order.total || 0);
    }, 0);
    tabs[idx] = {
        ...tabs[idx],
        totalAmount: total
    };
    saveTabs(tabs);
}
function createTab(tableId, customerName, partySize) {
    const tab = {
        id: `TAB-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        tableId,
        customerName: customerName.trim(),
        partySize,
        orderIds: [],
        tabStatus: 'open',
        totalAmount: 0,
        discount: 0,
        discountReason: '',
        paymentMethod: 'cod',
        createdAt: new Date().toISOString()
    };
    const tabs = getTabs();
    tabs.push(tab);
    saveTabs(tabs);
    // Mark table occupied
    const tables = getTables();
    const tIdx = tables.findIndex((t)=>t.id === tableId);
    if (tIdx !== -1) {
        tables[tIdx] = {
            ...tables[tIdx],
            status: 'occupied'
        };
        saveTables(tables);
    }
    return tab;
}
function addOrderToTab(tabId, orderId) {
    const tabs = getTabs();
    const idx = tabs.findIndex((t)=>t.id === tabId);
    if (idx === -1) return false;
    if (tabs[idx].tabStatus !== 'open') return false;
    if (!tabs[idx].orderIds.includes(orderId)) {
        tabs[idx] = {
            ...tabs[idx],
            orderIds: [
                ...tabs[idx].orderIds,
                orderId
            ]
        };
        saveTabs(tabs);
        syncTabTotal(tabId);
    }
    return true;
}
function requestBill(tabId) {
    const tabs = getTabs();
    const idx = tabs.findIndex((t)=>t.id === tabId);
    if (idx === -1) return false;
    if (tabs[idx].tabStatus !== 'open') return false;
    tabs[idx] = {
        ...tabs[idx],
        tabStatus: 'awaiting_payment'
    };
    saveTabs(tabs);
    syncTabTotal(tabId);
    return true;
}
function applyTabDiscount(tabId, amount, reason, by = 'Manager') {
    const tabs = getTabs();
    const idx = tabs.findIndex((t)=>t.id === tabId);
    if (idx === -1) return false;
    tabs[idx] = {
        ...tabs[idx],
        discount: amount,
        discountReason: reason
    };
    saveTabs(tabs);
    if (amount / (tabs[idx].totalAmount || 1) > 0.5) {
        addFraudAlert({
            type: 'high_discount',
            tabId,
            detail: `${Math.round(amount / (tabs[idx].totalAmount || 1) * 100)}% tab discount (₹${amount}) applied by ${by}`,
            by,
            amount
        });
    }
    return true;
}
function closeTab(tabId, paymentMethod, discount, discountReason, by = 'Manager') {
    const tabs = getTabs();
    const idx = tabs.findIndex((t)=>t.id === tabId);
    if (idx === -1) return false;
    syncTabTotal(tabId);
    const refreshed = getTabs();
    const tab = refreshed[idx];
    const finalDiscount = discount ?? tab.discount;
    const finalDiscReason = discountReason ?? tab.discountReason;
    refreshed[idx] = {
        ...tab,
        tabStatus: 'closed',
        discount: finalDiscount,
        discountReason: finalDiscReason,
        paymentMethod,
        closedAt: new Date().toISOString()
    };
    saveTabs(refreshed);
    // Mark all tab orders as completed
    const orders = getOrders();
    let changed = false;
    tab.orderIds.forEach((oid)=>{
        const oIdx = orders.findIndex((o)=>o.id === oid);
        if (oIdx !== -1 && ![
            'cancelled',
            'void',
            'completed'
        ].includes(orders[oIdx].status)) {
            orders[oIdx] = {
                ...orders[oIdx],
                status: 'completed',
                payment: paymentMethod,
                timeline: [
                    ...orders[oIdx].timeline || [],
                    {
                        status: 'completed',
                        by,
                        at: new Date().toISOString(),
                        note: `Tab closed — ${paymentMethod}`
                    }
                ]
            };
            changed = true;
        }
    });
    if (changed) saveOrders(orders);
    // Release table if no more active tabs
    syncTableStatus(tab.tableId);
    return true;
}
function getTabOrders(tabId) {
    const tab = getTab(tabId);
    if (!tab) return [];
    const orders = getOrders();
    return tab.orderIds.map((oid)=>orders.find((o)=>o.id === oid)).filter((o)=>o !== undefined);
}
// ─── Fraud Alerts ─────────────────────────────────────────────────────────────
function addFraudAlert(data) {
    const alerts = ls_get(KEYS.fraudAlerts, []);
    alerts.push({
        ...data,
        id: `FA-${Date.now()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
        at: new Date().toISOString()
    });
    if (alerts.length > 200) alerts.splice(0, alerts.length - 200);
    ls_set(KEYS.fraudAlerts, alerts);
}
function getFraudAlerts() {
    return ls_get(KEYS.fraudAlerts, []).slice().reverse();
}
function clearFraudAlerts() {
    ls_set(KEYS.fraudAlerts, []);
}
function getEndOfDayReport(date) {
    const d = date || new Date();
    const dayOrders = getOrders().filter((o)=>new Date(o.timestamp).toDateString() === d.toDateString());
    const completedOrders = dayOrders.filter((o)=>o.status === 'completed');
    const voidedOrders = dayOrders.filter((o)=>o.status === 'void').length;
    const totalRevenue = completedOrders.reduce((s, o)=>s + (o.total || 0), 0);
    const discountsTotal = completedOrders.reduce((s, o)=>s + (o.discount || 0), 0);
    const itemMap = {};
    completedOrders.forEach((o)=>(o.items || []).forEach((i)=>{
            itemMap[i.name] = (itemMap[i.name] || 0) + i.qty;
        }));
    const topItems = Object.entries(itemMap).sort((a, b)=>b[1] - a[1]).slice(0, 5).map(([name, qty])=>({
            name,
            qty
        }));
    const completedTabs = getTabs().filter((t)=>t.tabStatus === 'closed' && t.closedAt && new Date(t.closedAt).toDateString() === d.toDateString()).length;
    return {
        date: d.toDateString(),
        totalOrders: completedOrders.length,
        totalRevenue,
        avgOrderValue: completedOrders.length ? Math.round(totalRevenue / completedOrders.length) : 0,
        topItems,
        completedTabs,
        voidedOrders,
        discountsTotal
    };
}
function updateItemStatus(orderId, itemIndex, status, by = 'Kitchen') {
    const orders = getOrders();
    const idx = orders.findIndex((o)=>o.id === orderId);
    if (idx === -1) return false;
    const items = [
        ...orders[idx].items || []
    ];
    if (itemIndex < 0 || itemIndex >= items.length) return false;
    items[itemIndex] = {
        ...items[itemIndex],
        itemStatus: status
    };
    orders[idx] = {
        ...orders[idx],
        items
    };
    saveOrders(orders);
    return true;
}
const getWaiterCalls = ()=>ls_get(KEYS.waiterCalls, []);
const saveWaiterCalls = (c)=>ls_set(KEYS.waiterCalls, c);
const getPendingWaiterCalls = ()=>getWaiterCalls().filter((c)=>!c.acknowledged);
function addWaiterCall(tableId, tabId, customerName) {
    const call = {
        id: `WC-${Date.now()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
        tableId,
        tabId,
        customerName,
        at: new Date().toISOString(),
        acknowledged: false
    };
    const calls = getWaiterCalls();
    calls.push(call);
    if (calls.length > 100) calls.splice(0, calls.length - 100);
    saveWaiterCalls(calls);
    return call;
}
function acknowledgeWaiterCall(id, by = 'Waiter') {
    const calls = getWaiterCalls();
    const idx = calls.findIndex((c)=>c.id === id);
    if (idx === -1) return false;
    calls[idx] = {
        ...calls[idx],
        acknowledged: true,
        acknowledgedAt: new Date().toISOString(),
        acknowledgedBy: by
    };
    saveWaiterCalls(calls);
    return true;
}
function getLastWaiterCallTime(tableId) {
    const calls = getWaiterCalls();
    const recent = calls.filter((c)=>c.tableId === tableId).sort((a, b)=>new Date(b.at).getTime() - new Date(a.at).getTime());
    if (!recent.length) return null;
    if (Date.now() - new Date(recent[0].at).getTime() > 5 * 60 * 1000) return null;
    return recent[0].at;
}
const getDisputeAlerts = ()=>ls_get(KEYS.disputes, []);
const saveDisputeAlerts = (d)=>ls_set(KEYS.disputes, d);
const getPendingDisputes = ()=>getDisputeAlerts().filter((d)=>!d.resolved);
function addFoodReceiptDispute(orderId, tabId, tableId, customerName) {
    const dispute = {
        id: `FD-${Date.now()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
        orderId,
        tabId,
        tableId,
        customerName,
        at: new Date().toISOString(),
        resolved: false
    };
    const disputes = getDisputeAlerts();
    disputes.push(dispute);
    if (disputes.length > 200) disputes.splice(0, disputes.length - 200);
    saveDisputeAlerts(disputes);
    return dispute;
}
function resolveDispute(id, by = 'Waiter') {
    const disputes = getDisputeAlerts();
    const idx = disputes.findIndex((d)=>d.id === id);
    if (idx === -1) return false;
    disputes[idx] = {
        ...disputes[idx],
        resolved: true,
        resolvedBy: by,
        resolvedAt: new Date().toISOString()
    };
    saveDisputeAlerts(disputes);
    return true;
}
const getSplitBills = ()=>ls_get(KEYS.splitBills, []);
const saveSplitBills = (s)=>ls_set(KEYS.splitBills, s);
function getSplitBillForTab(tabId) {
    return getSplitBills().find((s)=>s.tabId === tabId) ?? null;
}
function createSplitBill(tabId, splitType, count, totalAmount) {
    const existing = getSplitBills().filter((s)=>s.tabId !== tabId);
    const perPerson = Math.ceil(totalAmount / count);
    const entries = Array.from({
        length: count
    }, (_, i)=>({
            personLabel: `Person ${i + 1}`,
            amount: i === count - 1 ? totalAmount - perPerson * (count - 1) : perPerson,
            paid: false
        }));
    const split = {
        id: `SB-${Date.now()}`,
        tabId,
        splitType,
        totalAmount,
        entries,
        createdAt: new Date().toISOString()
    };
    existing.push(split);
    saveSplitBills(existing);
    return split;
}
function markSplitEntryPaid(tabId, personLabel, paymentMethod) {
    const splits = getSplitBills();
    const idx = splits.findIndex((s)=>s.tabId === tabId);
    if (idx === -1) return false;
    const eIdx = splits[idx].entries.findIndex((e)=>e.personLabel === personLabel);
    if (eIdx === -1) return false;
    splits[idx].entries[eIdx] = {
        ...splits[idx].entries[eIdx],
        paid: true,
        paymentMethod,
        paidAt: new Date().toISOString()
    };
    saveSplitBills(splits);
    return true;
}
function isSplitFullyPaid(tabId) {
    const split = getSplitBillForTab(tabId);
    return split ? split.entries.every((e)=>e.paid) : false;
}
function getWaiterStats() {
    const orders = getOrders();
    const todayStr = new Date().toDateString();
    const todayOrders = orders.filter((o)=>new Date(o.timestamp).toDateString() === todayStr);
    const statMap = {};
    todayOrders.forEach((o)=>{
        (o.timeline || []).forEach((t)=>{
            if (!t.by || [
                'System',
                'Admin',
                'Manager',
                'Kitchen'
            ].includes(t.by)) return;
            if (!statMap[t.by]) statMap[t.by] = {
                accepted: 0,
                cancelled: 0,
                served: 0
            };
            if (t.status === 'pending') statMap[t.by].accepted++;
            if (t.status === 'cancelled') statMap[t.by].cancelled++;
            if (t.status === 'served') statMap[t.by].served++;
        });
    });
    return Object.entries(statMap).map(([name, s])=>({
            name,
            ordersAccepted: s.accepted,
            ordersCancelled: s.cancelled,
            ordersServed: s.served,
            cancellationRate: s.accepted > 0 ? Math.round(s.cancelled / s.accepted * 100) : 0
        })).sort((a, b)=>b.ordersCancelled - a.ordersCancelled);
}
function getTableOccupancyStats() {
    const allTabs = getTabs().filter((t)=>t.tabStatus === 'closed' && t.closedAt);
    const map = {};
    allTabs.forEach((tab)=>{
        if (!map[tab.tableId]) map[tab.tableId] = {
            sessions: 0,
            totalMins: 0,
            revenue: 0,
            lastUsed: ''
        };
        const mins = Math.floor((new Date(tab.closedAt).getTime() - new Date(tab.createdAt).getTime()) / 60000);
        map[tab.tableId].sessions++;
        map[tab.tableId].totalMins += mins;
        map[tab.tableId].revenue += Math.max(0, tab.totalAmount - tab.discount);
        if (!map[tab.tableId].lastUsed || tab.closedAt > map[tab.tableId].lastUsed) map[tab.tableId].lastUsed = tab.closedAt;
    });
    return Object.entries(map).map(([tableId, s])=>({
            tableId,
            totalSessions: s.sessions,
            avgMinutes: s.sessions > 0 ? Math.round(s.totalMins / s.sessions) : 0,
            totalRevenue: s.revenue,
            lastUsed: s.lastUsed
        })).sort((a, b)=>b.totalSessions - a.totalSessions);
}
function getOrCreateDeviceId() {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    let id = localStorage.getItem('fl_device_id');
    if (!id) {
        id = `DEV-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
        localStorage.setItem('fl_device_id', id);
    }
    return id;
}
function getDeviceRecords() {
    return ls_get(KEYS.devices, []);
}
function saveDeviceRecords(records) {
    ls_set(KEYS.devices, records);
}
function registerDevice(deviceId, tableId, tabId, customerName) {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const pruned = getDeviceRecords().filter((r)=>new Date(r.joinedAt).getTime() > cutoff && !(r.deviceId === deviceId && r.tableId === tableId));
    const record = {
        deviceId,
        tableId,
        tabId,
        customerName,
        joinedAt: new Date().toISOString()
    };
    pruned.push(record);
    saveDeviceRecords(pruned);
    return record;
}
function findActiveDeviceSession(deviceId, tableId) {
    const records = getDeviceRecords();
    const record = records.find((r)=>r.deviceId === deviceId && r.tableId === tableId);
    if (!record) return null;
    const tab = getTabs().find((t)=>t.id === record.tabId && [
            'open',
            'awaiting_payment'
        ].includes(t.tabStatus));
    if (!tab) return null;
    return {
        tab,
        record
    };
}
function removeDeviceRecord(deviceId, tableId) {
    const records = getDeviceRecords().filter((r)=>!(r.deviceId === deviceId && r.tableId === tableId));
    saveDeviceRecords(records);
}
function getDevicesForTab(tabId) {
    return getDeviceRecords().filter((r)=>r.tabId === tabId);
}
function getWhatsappNumber() {
    return ls_get(KEYS.whatsapp, '');
}
function saveWhatsappNumber(num) {
    ls_set(KEYS.whatsapp, num.replace(/\D/g, '')); // store digits only
}
function getOnlineOrderStats() {
    const orders = getOrders();
    const todayStr = new Date().toDateString();
    const online = orders.filter((o)=>o.source === 'online');
    const todayOnline = online.filter((o)=>new Date(o.timestamp).toDateString() === todayStr);
    return {
        todayTotal: todayOnline.length,
        todayPickup: todayOnline.filter((o)=>o.type === 'pickup').length,
        todayDelivery: todayOnline.filter((o)=>o.type === 'delivery').length,
        todayRevenue: todayOnline.filter((o)=>o.status !== 'cancelled').reduce((s, o)=>s + (o.total || 0), 0),
        pendingOnline: online.filter((o)=>![
                'completed',
                'cancelled',
                'void'
            ].includes(o.status)).length,
        allTimeTotal: online.length,
        allTimePickup: online.filter((o)=>o.type === 'pickup').length,
        allTimeDelivery: online.filter((o)=>o.type === 'delivery').length
    };
}
function buildWhatsappOrderUrl(order, restaurantNumber) {
    const lines = [
        `🍽️ *New Online Order — Foodie Lover*`,
        `📋 Order ID: ${order.id}`,
        `👤 Name: ${order.customerName}`,
        `📱 Phone: ${order.phone || '—'}`,
        `📦 Type: ${order.type === 'delivery' ? '🚗 Delivery' : '🏪 Pickup'}`,
        order.deliveryAddress ? `📍 Address: ${order.deliveryAddress}` : '',
        `💳 Payment: ${order.payment?.toUpperCase() || 'COD'}`,
        ``,
        `*Items:*`,
        ...(order.items || []).map((i)=>`  • ${i.name} × ${i.qty}  ₹${i.subtotal}`),
        ``,
        `💰 *Total: ₹${order.total}*`,
        `🕐 Time: ${new Date(order.timestamp).toLocaleTimeString('en-IN')}`
    ].filter((l)=>l !== null);
    const msg = encodeURIComponent(lines.join('\n'));
    const num = restaurantNumber.replace(/\D/g, '');
    return num ? `https://wa.me/${num}?text=${msg}` : `https://wa.me/?text=${msg}`;
}
// ─── Private helper (called internally — not exported to keep event writes consistent) ──
function _addOrderEvent(orderId, eventType, actor, note) {
    const ev = {
        eventId: `EV-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        orderId,
        eventType,
        actor,
        note,
        createdAt: new Date().toISOString()
    };
    const events = ls_get(KEYS.events, []);
    events.push(ev);
    ls_set(KEYS.events, events);
    return ev;
}
function getAllOrderEvents() {
    return ls_get(KEYS.events, []);
}
function getEventsForOrder(orderId) {
    return getAllOrderEvents().filter((e)=>e.orderId === orderId).sort((a, b)=>new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}
function getLatestEvent(orderId) {
    const events = getEventsForOrder(orderId);
    return events.length ? events[events.length - 1] : null;
}
function generateTrackingToken() {
    return Math.random().toString(36).slice(2, 6).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
}
function verifyTrackingToken(orderId, token) {
    const order = getOrders().find((o)=>o.id === orderId);
    if (!order) return null;
    if (order.trackingToken !== token) return null;
    return order;
}
function getDeliveryQueue() {
    return getOrders().filter((o)=>o.type === 'delivery' && [
            'prepared',
            'out_for_delivery',
            'delivered'
        ].includes(o.status)).sort((a, b)=>new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}
function markOrderPickedUp(orderId, deliveryPerson) {
    const orders = getOrders();
    const idx = orders.findIndex((o)=>o.id === orderId);
    if (idx === -1 || orders[idx].status !== 'prepared') return false;
    orders[idx] = {
        ...orders[idx],
        status: 'out_for_delivery',
        deliveryPerson,
        timeline: [
            ...orders[idx].timeline || [],
            {
                status: 'out_for_delivery',
                by: deliveryPerson,
                at: new Date().toISOString(),
                note: 'Picked up for delivery'
            }
        ]
    };
    saveOrders(orders);
    _addOrderEvent(orderId, 'OrderPickedUp', deliveryPerson, 'Picked up from kitchen');
    _addOrderEvent(orderId, 'OutForDelivery', deliveryPerson, 'On the way to customer');
    return true;
}
function markOrderDelivered(orderId, deliveryPerson) {
    const orders = getOrders();
    const idx = orders.findIndex((o)=>o.id === orderId);
    if (idx === -1 || orders[idx].status !== 'out_for_delivery') return false;
    orders[idx] = {
        ...orders[idx],
        status: 'delivered',
        timeline: [
            ...orders[idx].timeline || [],
            {
                status: 'delivered',
                by: deliveryPerson,
                at: new Date().toISOString()
            }
        ]
    };
    saveOrders(orders);
    _addOrderEvent(orderId, 'Delivered', deliveryPerson, 'Delivered to customer address');
    return true;
}
function customerConfirmDelivery(orderId, token) {
    const order = verifyTrackingToken(orderId, token);
    if (!order || order.status !== 'delivered') return false;
    const orders = getOrders();
    const idx = orders.findIndex((o)=>o.id === orderId);
    if (idx === -1) return false;
    orders[idx] = {
        ...orders[idx],
        status: 'completed',
        timeline: [
            ...orders[idx].timeline || [],
            {
                status: 'completed',
                by: order.customerName,
                at: new Date().toISOString(),
                note: 'Confirmed by customer'
            }
        ]
    };
    saveOrders(orders);
    _addOrderEvent(orderId, 'CustomerConfirmed', order.customerName, 'Customer confirmed delivery');
    _addOrderEvent(orderId, 'Closed', order.customerName);
    return true;
}
function emitBillRequestedEvent(tabId, actor) {
    // BillRequested is a tab-level event, we store it under the tab's first orderId or a synthetic ID
    _addOrderEvent(`TAB-${tabId}`, 'BillRequested', actor);
}
function getTrackingUrl(order) {
    if (!order.trackingToken) return '';
    return `/track?id=${encodeURIComponent(order.id)}&token=${encodeURIComponent(order.trackingToken)}`;
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
    awaiting_waiter: '#f59e0b',
    pending: '#f59e0b',
    preparing: '#3b82f6',
    prepared: '#8b5cf6',
    served: '#06b6d4',
    completed: '#16a34a',
    cancelled: '#ef4444',
    void: '#9ca3af'
};
const STATUS_LABEL = {
    awaiting_waiter: 'Awaiting Waiter',
    pending: 'In Kitchen',
    preparing: 'Preparing',
    prepared: 'Ready',
    served: 'Served',
    completed: 'Completed',
    cancelled: 'Cancelled',
    void: 'Void'
};
function ManagerPage() {
    _s();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const [session, setSession] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [authChecked, setAuthChecked] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [tabs, setTabs] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [orders, setOrders] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [selTab, setSelTab] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [tabFilter, setTabFilter] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('awaiting');
    const [clock, setClock] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        date: '',
        time: ''
    });
    // Billing flow
    const [tabPayMethod, setTabPayMethod] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('cod');
    const [tabDiscAmt, setTabDiscAmt] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [tabDiscNote, setTabDiscNote] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [pinInput, setPinInput] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [pinMsg, setPinMsg] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [showDiscForm, setShowDiscForm] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [tabBillMsg, setTabBillMsg] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [tabCloseConfirm, setTabCloseConfirm] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    // Split billing
    const [splitBill, setSplitBill] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [showSplitModal, setShowSplitModal] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [splitCount, setSplitCount] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('2');
    const [splitPayEntry, setSplitPayEntry] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [splitPayMethod, setSplitPayMethod] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('cod');
    // End-of-day report
    const [showEOD, setShowEOD] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    // ── Auth ──────────────────────────────────────────────────────────────────
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
    // ── Data refresh ──────────────────────────────────────────────────────────
    const refresh = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "ManagerPage.useCallback[refresh]": ()=>{
            const allTabs = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getTabs"])();
            const allOrders = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getOrders"])();
            setTabs(allTabs);
            setOrders(allOrders);
            setSelTab({
                "ManagerPage.useCallback[refresh]": (prev)=>{
                    if (!prev) return null;
                    return allTabs.find({
                        "ManagerPage.useCallback[refresh]": (t)=>t.id === prev.id
                    }["ManagerPage.useCallback[refresh]"]) ?? null;
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
    // ── Discount action ───────────────────────────────────────────────────────
    function applyDiscount() {
        if (!selTab) return;
        const amt = parseInt(tabDiscAmt);
        if (!amt || amt <= 0) {
            setPinMsg('❌ Enter a valid amount');
            return;
        }
        if (amt > selTab.totalAmount) {
            setPinMsg(`❌ Discount cannot exceed ₹${selTab.totalAmount}`);
            return;
        }
        if (pinInput !== (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getPin"])()) {
            setPinMsg('❌ Wrong admin PIN');
            return;
        }
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["applyTabDiscount"])(selTab.id, amt, tabDiscNote || 'Manager discount', session?.name || 'Manager');
        setTabDiscAmt('');
        setTabDiscNote('');
        setPinInput('');
        setPinMsg('');
        setShowDiscForm(false);
        refresh();
    }
    // ── Close tab action ──────────────────────────────────────────────────────
    function handleCloseTab() {
        if (!selTab) return;
        if (!tabCloseConfirm) {
            const inProgress = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getTabOrders"])(selTab.id).filter((o)=>[
                    'awaiting_waiter',
                    'pending',
                    'preparing',
                    'prepared'
                ].includes(o.status));
            if (inProgress.length > 0) {
                setTabCloseConfirm(true);
                return;
            }
        }
        setTabCloseConfirm(false);
        const discount = selTab.discount || 0;
        const ok = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["closeTab"])(selTab.id, tabPayMethod, discount, selTab.discountReason, session?.name || 'Manager');
        if (ok) {
            setTabBillMsg('✅ Payment collected! Tab closed.');
            setTimeout(()=>{
                setTabBillMsg('');
                setSelTab(null);
                setTabCloseConfirm(false);
                setSplitBill(null);
                setShowSplitModal(false);
            }, 1800);
            refresh();
        }
    }
    // ── Split bill actions ────────────────────────────────────────────────────
    function handleCreateSplit() {
        if (!selTab) return;
        const count = Math.max(2, Math.min(10, parseInt(splitCount) || 2));
        const total = Math.max(0, (selTab.totalAmount || 0) - (selTab.discount || 0));
        const split = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createSplitBill"])(selTab.id, 'equal', count, total);
        setSplitBill(split);
        setShowSplitModal(false);
    }
    function handleMarkSplitPaid(personLabel) {
        if (!selTab) return;
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["markSplitEntryPaid"])(selTab.id, personLabel, splitPayMethod);
        // Reload split
        const updated = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getSplitBillForTab"])(selTab.id);
        setSplitBill(updated);
        setSplitPayEntry(null);
    }
    function loadSplitForTab(tabId) {
        const existing = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getSplitBillForTab"])(tabId);
        setSplitBill(existing);
    }
    // ── Derived data ──────────────────────────────────────────────────────────
    const awaitingTabs = tabs.filter((t)=>t.tabStatus === 'awaiting_payment');
    const openTabs = tabs.filter((t)=>t.tabStatus === 'open');
    const closedTabs = tabs.filter((t)=>t.tabStatus === 'closed' && t.closedAt && new Date(t.closedAt).toDateString() === new Date().toDateString());
    const todayRevenue = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getOrdersInPeriod"])('today').reduce((s, o)=>s + (o.total || 0), 0);
    const shown = tabFilter === 'awaiting' ? awaitingTabs : tabFilter === 'open' ? openTabs : closedTabs;
    const tabOrders = selTab ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getTabOrders"])(selTab.id) : [];
    const tabBillTotal = selTab ? Math.max(0, (selTab.totalAmount || 0) - (selTab.discount || 0)) : 0;
    const inProgressOrders = selTab ? tabOrders.filter((o)=>[
            'awaiting_waiter',
            'pending',
            'preparing',
            'prepared'
        ].includes(o.status)) : [];
    // EOD report
    const eodReport = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getEndOfDayReport"])();
    // ── Styles ────────────────────────────────────────────────────────────────
    const btn = (bg = '#E65C00', c = 'white')=>({
            background: bg,
            color: c,
            border: 'none',
            borderRadius: 8,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'Poppins,sans-serif',
            padding: '0.5rem 1rem',
            fontSize: '0.82rem'
        });
    const inp = {
        width: '100%',
        padding: '0.6rem 0.75rem',
        border: '2px solid #e5e7eb',
        borderRadius: 8,
        fontFamily: 'Poppins,sans-serif',
        fontSize: '0.88rem'
    };
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
                        lineNumber: 198,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: "Loading Manager Portal…"
                    }, void 0, false, {
                        fileName: "[project]/app/manager/page.tsx",
                        lineNumber: 199,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/manager/page.tsx",
                lineNumber: 197,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/app/manager/page.tsx",
            lineNumber: 196,
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
                                lineNumber: 211,
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
                                        lineNumber: 213,
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
                                        lineNumber: 214,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/manager/page.tsx",
                                lineNumber: 212,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/manager/page.tsx",
                        lineNumber: 210,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem'
                        },
                        children: [
                            awaitingTabs.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
                                    awaitingTabs.length,
                                    " Awaiting Payment"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/manager/page.tsx",
                                lineNumber: 219,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>setShowEOD(!showEOD),
                                style: {
                                    ...btn('#065f46', '#6ee7b7'),
                                    border: '1px solid #6ee7b7',
                                    fontSize: '0.72rem'
                                },
                                children: "📊 EOD Report"
                            }, void 0, false, {
                                fileName: "[project]/app/manager/page.tsx",
                                lineNumber: 223,
                                columnNumber: 11
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
                                        lineNumber: 227,
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
                                        lineNumber: 228,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/manager/page.tsx",
                                lineNumber: 226,
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
                                lineNumber: 230,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/manager/page.tsx",
                        lineNumber: 217,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/manager/page.tsx",
                lineNumber: 209,
                columnNumber: 7
            }, this),
            showEOD && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    background: '#064e3b',
                    color: 'white',
                    padding: '1.25rem 1.5rem',
                    borderBottom: '3px solid #059669'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '1rem'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    fontFamily: "'Playfair Display',serif",
                                    fontSize: '1rem',
                                    fontWeight: 900,
                                    color: '#6ee7b7'
                                },
                                children: [
                                    "📊 End-of-Day Report — ",
                                    eodReport.date
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/manager/page.tsx",
                                lineNumber: 240,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>setShowEOD(false),
                                style: {
                                    background: 'none',
                                    border: 'none',
                                    color: '#6ee7b7',
                                    fontSize: '1.25rem',
                                    cursor: 'pointer'
                                },
                                children: "×"
                            }, void 0, false, {
                                fileName: "[project]/app/manager/page.tsx",
                                lineNumber: 243,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/manager/page.tsx",
                        lineNumber: 239,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))',
                            gap: '0.75rem',
                            marginBottom: '1rem'
                        },
                        children: [
                            {
                                icon: '🧾',
                                val: eodReport.totalOrders,
                                label: 'Orders Completed',
                                color: '#6ee7b7'
                            },
                            {
                                icon: '💰',
                                val: `₹${eodReport.totalRevenue}`,
                                label: 'Total Revenue',
                                color: '#fbbf24'
                            },
                            {
                                icon: '📊',
                                val: `₹${eodReport.avgOrderValue}`,
                                label: 'Avg Order Value',
                                color: '#a78bfa'
                            },
                            {
                                icon: '✅',
                                val: eodReport.completedTabs,
                                label: 'Closed Tabs',
                                color: '#34d399'
                            },
                            {
                                icon: '🏷️',
                                val: `₹${eodReport.discountsTotal}`,
                                label: 'Discounts Given',
                                color: '#f87171'
                            },
                            {
                                icon: '🚫',
                                val: eodReport.voidedOrders,
                                label: 'Voided Orders',
                                color: '#fb923c'
                            }
                        ].map((s)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    background: 'rgba(255,255,255,0.08)',
                                    borderRadius: 10,
                                    padding: '0.75rem',
                                    textAlign: 'center'
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            fontSize: '1.2rem',
                                            marginBottom: '0.2rem'
                                        },
                                        children: s.icon
                                    }, void 0, false, {
                                        fileName: "[project]/app/manager/page.tsx",
                                        lineNumber: 255,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            fontSize: '1.1rem',
                                            fontWeight: 900,
                                            color: s.color
                                        },
                                        children: s.val
                                    }, void 0, false, {
                                        fileName: "[project]/app/manager/page.tsx",
                                        lineNumber: 256,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            fontSize: '0.62rem',
                                            color: '#9ca3af'
                                        },
                                        children: s.label
                                    }, void 0, false, {
                                        fileName: "[project]/app/manager/page.tsx",
                                        lineNumber: 257,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, s.label, true, {
                                fileName: "[project]/app/manager/page.tsx",
                                lineNumber: 254,
                                columnNumber: 15
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/app/manager/page.tsx",
                        lineNumber: 245,
                        columnNumber: 11
                    }, this),
                    eodReport.topItems.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                    color: '#6ee7b7',
                                    marginBottom: '0.4rem'
                                },
                                children: "🏆 Top Items Today"
                            }, void 0, false, {
                                fileName: "[project]/app/manager/page.tsx",
                                lineNumber: 263,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    display: 'flex',
                                    gap: '0.5rem',
                                    flexWrap: 'wrap'
                                },
                                children: eodReport.topItems.map((item, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            background: 'rgba(255,255,255,0.1)',
                                            borderRadius: 20,
                                            padding: '0.2rem 0.7rem',
                                            fontSize: '0.75rem',
                                            color: 'white'
                                        },
                                        children: [
                                            item.name,
                                            " ",
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                style: {
                                                    color: '#fbbf24',
                                                    fontWeight: 700
                                                },
                                                children: [
                                                    "×",
                                                    item.qty
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/manager/page.tsx",
                                                lineNumber: 267,
                                                columnNumber: 33
                                            }, this)
                                        ]
                                    }, i, true, {
                                        fileName: "[project]/app/manager/page.tsx",
                                        lineNumber: 266,
                                        columnNumber: 19
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/app/manager/page.tsx",
                                lineNumber: 264,
                                columnNumber: 15
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/manager/page.tsx",
                        lineNumber: 262,
                        columnNumber: 13
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/manager/page.tsx",
                lineNumber: 238,
                columnNumber: 9
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
                        icon: '💰',
                        val: `₹${todayRevenue}`,
                        label: 'Net Revenue'
                    },
                    {
                        icon: '🧾',
                        val: awaitingTabs.length,
                        label: 'Awaiting Payment'
                    },
                    {
                        icon: '🟢',
                        val: openTabs.length,
                        label: 'Open Tabs'
                    },
                    {
                        icon: '✅',
                        val: closedTabs.length,
                        label: 'Closed Today'
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
                                lineNumber: 285,
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
                                lineNumber: 286,
                                columnNumber: 13
                            }, this)
                        ]
                    }, s.label, true, {
                        fileName: "[project]/app/manager/page.tsx",
                        lineNumber: 284,
                        columnNumber: 11
                    }, this))
            }, void 0, false, {
                fileName: "[project]/app/manager/page.tsx",
                lineNumber: 277,
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
                        key: 'awaiting',
                        label: `💰 Awaiting Payment (${awaitingTabs.length})`
                    },
                    {
                        key: 'open',
                        label: `🟢 Open Tabs (${openTabs.length})`
                    },
                    {
                        key: 'closed',
                        label: `✅ Closed Today (${closedTabs.length})`
                    }
                ].map((f)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>setTabFilter(f.key),
                        style: {
                            padding: '0.35rem 0.9rem',
                            borderRadius: 20,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            fontFamily: 'Poppins,sans-serif',
                            fontWeight: 600,
                            fontSize: '0.78rem',
                            border: `2px solid ${tabFilter === f.key ? '#16a34a' : '#ddd'}`,
                            background: tabFilter === f.key ? '#16a34a' : 'white',
                            color: tabFilter === f.key ? 'white' : '#666'
                        },
                        children: f.label
                    }, f.key, false, {
                        fileName: "[project]/app/manager/page.tsx",
                        lineNumber: 298,
                        columnNumber: 11
                    }, this))
            }, void 0, false, {
                fileName: "[project]/app/manager/page.tsx",
                lineNumber: 292,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    padding: '0 1.5rem 2rem',
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
                    children: tabFilter === 'awaiting' ? '🎉 No pending payments right now!' : 'No tabs found.'
                }, void 0, false, {
                    fileName: "[project]/app/manager/page.tsx",
                    lineNumber: 313,
                    columnNumber: 11
                }, this) : shown.map((tab)=>{
                    const tabOrdrs = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getTabOrders"])(tab.id);
                    const activeOrdrs = tabOrdrs.filter((o)=>![
                            'cancelled',
                            'void',
                            'completed'
                        ].includes(o.status));
                    const billAmt = Math.max(0, (tab.totalAmount || 0) - (tab.discount || 0));
                    const sinceMin = Math.floor((Date.now() - new Date(tab.createdAt).getTime()) / 60000);
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        onClick: ()=>{
                            setSelTab(tab);
                            setShowDiscForm(false);
                            setTabDiscAmt('');
                            setTabDiscNote('');
                            setPinInput('');
                            setPinMsg('');
                            setTabBillMsg('');
                            setTabCloseConfirm(false);
                            setShowSplitModal(false);
                            setSplitPayEntry(null);
                            loadSplitForTab(tab.id);
                        },
                        style: {
                            background: 'white',
                            borderRadius: 12,
                            overflow: 'hidden',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                            borderLeft: `4px solid ${tab.tabStatus === 'awaiting_payment' ? '#f59e0b' : tab.tabStatus === 'open' ? '#16a34a' : '#9ca3af'}`,
                            cursor: 'pointer'
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
                                                    fontWeight: 800,
                                                    fontSize: '0.9rem',
                                                    color: '#1A0800'
                                                },
                                                children: [
                                                    "Table ",
                                                    tab.tableId
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/manager/page.tsx",
                                                lineNumber: 345,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    fontSize: '0.73rem',
                                                    color: '#888',
                                                    marginTop: '0.1rem'
                                                },
                                                children: [
                                                    tab.customerName,
                                                    " · ",
                                                    tab.partySize,
                                                    " guest",
                                                    tab.partySize !== 1 ? 's' : ''
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/manager/page.tsx",
                                                lineNumber: 346,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    fontSize: '0.68rem',
                                                    color: '#aaa',
                                                    marginTop: '0.05rem'
                                                },
                                                children: [
                                                    "⏱ ",
                                                    sinceMin,
                                                    "m seated"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/manager/page.tsx",
                                                lineNumber: 349,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/manager/page.tsx",
                                        lineNumber: 344,
                                        columnNumber: 17
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
                                                    background: tab.tabStatus === 'awaiting_payment' ? '#fef9c3' : tab.tabStatus === 'open' ? '#dcfce7' : '#f3f4f6',
                                                    color: tab.tabStatus === 'awaiting_payment' ? '#854d0e' : tab.tabStatus === 'open' ? '#166534' : '#6b7280'
                                                },
                                                children: tab.tabStatus === 'awaiting_payment' ? '💳 Bill Requested' : tab.tabStatus === 'open' ? '🟢 Open' : '✅ Closed'
                                            }, void 0, false, {
                                                fileName: "[project]/app/manager/page.tsx",
                                                lineNumber: 352,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                style: {
                                                    fontWeight: 900,
                                                    color: '#16a34a',
                                                    fontSize: '1rem'
                                                },
                                                children: [
                                                    "₹",
                                                    billAmt
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/manager/page.tsx",
                                                lineNumber: 359,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/manager/page.tsx",
                                        lineNumber: 351,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/manager/page.tsx",
                                lineNumber: 343,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    padding: '0.4rem 1rem',
                                    borderTop: '1px solid #f5f0e8',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    fontSize: '0.75rem',
                                    color: '#888'
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: [
                                            activeOrdrs.length,
                                            " active order",
                                            activeOrdrs.length !== 1 ? 's' : ''
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/manager/page.tsx",
                                        lineNumber: 363,
                                        columnNumber: 17
                                    }, this),
                                    tab.discount > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        style: {
                                            color: '#16a34a'
                                        },
                                        children: [
                                            "−₹",
                                            tab.discount,
                                            " disc."
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/manager/page.tsx",
                                        lineNumber: 364,
                                        columnNumber: 38
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/manager/page.tsx",
                                lineNumber: 362,
                                columnNumber: 15
                            }, this)
                        ]
                    }, tab.id, true, {
                        fileName: "[project]/app/manager/page.tsx",
                        lineNumber: 323,
                        columnNumber: 13
                    }, this);
                })
            }, void 0, false, {
                fileName: "[project]/app/manager/page.tsx",
                lineNumber: 311,
                columnNumber: 7
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
                onClick: ()=>{
                    setSelTab(null);
                    setTabCloseConfirm(false);
                    setSplitBill(null);
                    setShowSplitModal(false);
                },
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
                                                fontSize: '1.05rem'
                                            },
                                            children: [
                                                "🪑 Table ",
                                                selTab.tableId,
                                                " — ",
                                                selTab.customerName
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/manager/page.tsx",
                                            lineNumber: 384,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                fontSize: '0.73rem',
                                                opacity: 0.8
                                            },
                                            children: [
                                                selTab.partySize,
                                                " guest",
                                                selTab.partySize !== 1 ? 's' : '',
                                                " ·",
                                                ' ',
                                                selTab.tabStatus === 'awaiting_payment' ? '💳 Bill Requested' : selTab.tabStatus === 'open' ? '🟢 Open Tab' : '✅ Closed'
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/manager/page.tsx",
                                            lineNumber: 387,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/manager/page.tsx",
                                    lineNumber: 383,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: ()=>{
                                        setSelTab(null);
                                        setTabCloseConfirm(false);
                                        setSplitBill(null);
                                        setShowSplitModal(false);
                                    },
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
                                    lineNumber: 392,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/manager/page.tsx",
                            lineNumber: 382,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                flex: 1,
                                overflowY: 'auto',
                                padding: '1.25rem 1.5rem'
                            },
                            children: [
                                tabOrders.filter((o)=>![
                                        'cancelled',
                                        'void'
                                    ].includes(o.status)).map((order)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            marginBottom: '0.75rem',
                                            background: '#fafafa',
                                            borderRadius: 10,
                                            overflow: 'hidden',
                                            border: `1px solid ${STATUS_COLOR[order.status] || '#e5e7eb'}30`
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    padding: '0.5rem 0.85rem',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    background: (STATUS_COLOR[order.status] || '#e5e7eb') + '12',
                                                    borderBottom: '1px solid #f0f0f0'
                                                },
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        style: {
                                                            fontWeight: 700,
                                                            fontSize: '0.82rem',
                                                            color: '#1A0800'
                                                        },
                                                        children: [
                                                            "#",
                                                            order.orderNum || order.id.slice(-4)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/manager/page.tsx",
                                                        lineNumber: 401,
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
                                                                    fontSize: '0.7rem',
                                                                    fontWeight: 700,
                                                                    color: STATUS_COLOR[order.status] || '#888'
                                                                },
                                                                children: STATUS_LABEL[order.status] || order.status
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/manager/page.tsx",
                                                                lineNumber: 405,
                                                                columnNumber: 23
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                style: {
                                                                    fontWeight: 800,
                                                                    color: '#16a34a',
                                                                    fontSize: '0.85rem'
                                                                },
                                                                children: [
                                                                    "₹",
                                                                    order.total
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/manager/page.tsx",
                                                                lineNumber: 408,
                                                                columnNumber: 23
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/manager/page.tsx",
                                                        lineNumber: 404,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/manager/page.tsx",
                                                lineNumber: 400,
                                                columnNumber: 19
                                            }, this),
                                            (order.items || []).map((item, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    style: {
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        padding: '0.3rem 0.85rem',
                                                        fontSize: '0.8rem',
                                                        color: '#555',
                                                        borderBottom: i < order.items.length - 1 ? '1px solid #f5f5f5' : 'none'
                                                    },
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
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
                                                                    lineNumber: 413,
                                                                    columnNumber: 41
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/manager/page.tsx",
                                                            lineNumber: 413,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            children: [
                                                                "₹",
                                                                item.subtotal ?? item.price * item.qty
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/manager/page.tsx",
                                                            lineNumber: 414,
                                                            columnNumber: 23
                                                        }, this)
                                                    ]
                                                }, i, true, {
                                                    fileName: "[project]/app/manager/page.tsx",
                                                    lineNumber: 412,
                                                    columnNumber: 21
                                                }, this))
                                        ]
                                    }, order.id, true, {
                                        fileName: "[project]/app/manager/page.tsx",
                                        lineNumber: 399,
                                        columnNumber: 17
                                    }, this)),
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
                                                marginBottom: '0.25rem',
                                                color: '#555'
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    children: "Subtotal"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/manager/page.tsx",
                                                    lineNumber: 423,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    style: {
                                                        fontWeight: 600
                                                    },
                                                    children: [
                                                        "₹",
                                                        selTab.totalAmount
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/manager/page.tsx",
                                                    lineNumber: 424,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/manager/page.tsx",
                                            lineNumber: 422,
                                            columnNumber: 17
                                        }, this),
                                        (selTab.discount || 0) > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                fontSize: '0.85rem',
                                                marginBottom: '0.25rem',
                                                color: '#16a34a'
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    children: [
                                                        "Discount (",
                                                        selTab.discountReason,
                                                        ")"
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/manager/page.tsx",
                                                    lineNumber: 428,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    style: {
                                                        fontWeight: 700
                                                    },
                                                    children: [
                                                        "−₹",
                                                        selTab.discount
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/manager/page.tsx",
                                                    lineNumber: 429,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/manager/page.tsx",
                                            lineNumber: 427,
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
                                                marginTop: '0.25rem',
                                                color: '#064e3b'
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    children: "TOTAL"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/manager/page.tsx",
                                                    lineNumber: 433,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    children: [
                                                        "₹",
                                                        tabBillTotal
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/manager/page.tsx",
                                                    lineNumber: 434,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/manager/page.tsx",
                                            lineNumber: 432,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/manager/page.tsx",
                                    lineNumber: 421,
                                    columnNumber: 15
                                }, this),
                                selTab.tabStatus !== 'closed' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        marginBottom: '1rem'
                                    },
                                    children: !splitBill ? !showSplitModal ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>setShowSplitModal(true),
                                        style: {
                                            ...btn('#f0fdf4', '#16a34a'),
                                            fontSize: '0.78rem',
                                            width: '100%',
                                            border: '1px solid #86efac'
                                        },
                                        children: "✂️ Split Bill"
                                    }, void 0, false, {
                                        fileName: "[project]/app/manager/page.tsx",
                                        lineNumber: 443,
                                        columnNumber: 23
                                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            background: '#f0fdf4',
                                            borderRadius: 10,
                                            border: '1px solid #86efac',
                                            padding: '1rem',
                                            marginBottom: '0.5rem'
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    fontWeight: 700,
                                                    color: '#064e3b',
                                                    fontSize: '0.85rem',
                                                    marginBottom: '0.5rem'
                                                },
                                                children: "✂️ Split Equally Between"
                                            }, void 0, false, {
                                                fileName: "[project]/app/manager/page.tsx",
                                                lineNumber: 451,
                                                columnNumber: 25
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    display: 'flex',
                                                    gap: '0.4rem',
                                                    marginBottom: '0.5rem'
                                                },
                                                children: [
                                                    2,
                                                    3,
                                                    4,
                                                    5,
                                                    6
                                                ].map((n)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        onClick: ()=>setSplitCount(String(n)),
                                                        style: {
                                                            flex: 1,
                                                            padding: '0.4rem',
                                                            borderRadius: 8,
                                                            fontWeight: 700,
                                                            cursor: 'pointer',
                                                            border: `2px solid ${splitCount === String(n) ? '#16a34a' : '#d1fae5'}`,
                                                            background: splitCount === String(n) ? '#16a34a' : 'white',
                                                            color: splitCount === String(n) ? 'white' : '#065f46',
                                                            fontFamily: 'Poppins,sans-serif',
                                                            fontSize: '0.85rem'
                                                        },
                                                        children: n
                                                    }, n, false, {
                                                        fileName: "[project]/app/manager/page.tsx",
                                                        lineNumber: 454,
                                                        columnNumber: 29
                                                    }, this))
                                            }, void 0, false, {
                                                fileName: "[project]/app/manager/page.tsx",
                                                lineNumber: 452,
                                                columnNumber: 25
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    fontSize: '0.78rem',
                                                    color: '#16a34a',
                                                    fontWeight: 600,
                                                    marginBottom: '0.5rem'
                                                },
                                                children: [
                                                    "≈ ₹",
                                                    Math.ceil(tabBillTotal / (parseInt(splitCount) || 2)),
                                                    " per person"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/manager/page.tsx",
                                                lineNumber: 467,
                                                columnNumber: 25
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    display: 'flex',
                                                    gap: '0.4rem'
                                                },
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        onClick: handleCreateSplit,
                                                        style: {
                                                            ...btn('#16a34a'),
                                                            flex: 2,
                                                            fontSize: '0.78rem'
                                                        },
                                                        children: "Split Now"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/manager/page.tsx",
                                                        lineNumber: 471,
                                                        columnNumber: 27
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        onClick: ()=>setShowSplitModal(false),
                                                        style: {
                                                            ...btn('#9ca3af'),
                                                            flex: 1,
                                                            fontSize: '0.78rem'
                                                        },
                                                        children: "Cancel"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/manager/page.tsx",
                                                        lineNumber: 474,
                                                        columnNumber: 27
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/manager/page.tsx",
                                                lineNumber: 470,
                                                columnNumber: 25
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/manager/page.tsx",
                                        lineNumber: 450,
                                        columnNumber: 23
                                    }, this) : /* Split bill UI */ /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            background: '#f0fdf4',
                                            borderRadius: 10,
                                            border: '1px solid #86efac',
                                            padding: '1rem',
                                            marginBottom: '0.5rem'
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
                                                            fontWeight: 700,
                                                            color: '#064e3b',
                                                            fontSize: '0.85rem'
                                                        },
                                                        children: [
                                                            "✂️ Split Bill (",
                                                            splitBill.entries.length,
                                                            " persons)"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/manager/page.tsx",
                                                        lineNumber: 484,
                                                        columnNumber: 25
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        onClick: ()=>setSplitBill(null),
                                                        style: {
                                                            background: 'none',
                                                            border: 'none',
                                                            color: '#9ca3af',
                                                            cursor: 'pointer',
                                                            fontSize: '0.75rem'
                                                        },
                                                        children: "Reset"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/manager/page.tsx",
                                                        lineNumber: 485,
                                                        columnNumber: 25
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/manager/page.tsx",
                                                lineNumber: 483,
                                                columnNumber: 23
                                            }, this),
                                            splitBill.entries.map((entry, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    style: {
                                                        marginBottom: '0.5rem'
                                                    },
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            style: {
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'center',
                                                                padding: '0.5rem 0.75rem',
                                                                background: entry.paid ? '#dcfce7' : 'white',
                                                                borderRadius: 8,
                                                                border: `1px solid ${entry.paid ? '#86efac' : '#d1d5db'}`
                                                            },
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            style: {
                                                                                fontWeight: 700,
                                                                                fontSize: '0.82rem',
                                                                                color: entry.paid ? '#16a34a' : '#1A0800'
                                                                            },
                                                                            children: [
                                                                                entry.paid ? '✅' : '⬜',
                                                                                " ",
                                                                                entry.personLabel
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/app/manager/page.tsx",
                                                                            lineNumber: 491,
                                                                            columnNumber: 31
                                                                        }, this),
                                                                        entry.paid && entry.paymentMethod && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            style: {
                                                                                fontSize: '0.68rem',
                                                                                color: '#16a34a'
                                                                            },
                                                                            children: [
                                                                                "Paid via ",
                                                                                PAY_LABELS[entry.paymentMethod] || entry.paymentMethod
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/app/manager/page.tsx",
                                                                            lineNumber: 495,
                                                                            columnNumber: 33
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/manager/page.tsx",
                                                                    lineNumber: 490,
                                                                    columnNumber: 29
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
                                                                                fontWeight: 800,
                                                                                color: '#064e3b',
                                                                                fontSize: '0.9rem'
                                                                            },
                                                                            children: [
                                                                                "₹",
                                                                                entry.amount
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/app/manager/page.tsx",
                                                                            lineNumber: 501,
                                                                            columnNumber: 31
                                                                        }, this),
                                                                        !entry.paid && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                            onClick: ()=>setSplitPayEntry(entry.personLabel),
                                                                            style: {
                                                                                ...btn('#16a34a'),
                                                                                fontSize: '0.72rem',
                                                                                padding: '0.3rem 0.6rem'
                                                                            },
                                                                            children: "Mark Paid"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/manager/page.tsx",
                                                                            lineNumber: 503,
                                                                            columnNumber: 33
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/manager/page.tsx",
                                                                    lineNumber: 500,
                                                                    columnNumber: 29
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/manager/page.tsx",
                                                            lineNumber: 489,
                                                            columnNumber: 27
                                                        }, this),
                                                        splitPayEntry === entry.personLabel && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            style: {
                                                                background: '#fffbeb',
                                                                borderRadius: 8,
                                                                padding: '0.6rem',
                                                                marginTop: '0.25rem',
                                                                border: '1px solid #fde68a'
                                                            },
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    style: {
                                                                        fontSize: '0.72rem',
                                                                        fontWeight: 700,
                                                                        color: '#555',
                                                                        marginBottom: '0.3rem'
                                                                    },
                                                                    children: "Payment Method"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/manager/page.tsx",
                                                                    lineNumber: 515,
                                                                    columnNumber: 31
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    style: {
                                                                        display: 'flex',
                                                                        gap: '0.3rem',
                                                                        flexWrap: 'wrap',
                                                                        marginBottom: '0.4rem'
                                                                    },
                                                                    children: [
                                                                        {
                                                                            k: 'cod',
                                                                            l: '💵 Cash'
                                                                        },
                                                                        {
                                                                            k: 'gpay',
                                                                            l: '📱 GPay'
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
                                                                            onClick: ()=>setSplitPayMethod(p.k),
                                                                            style: {
                                                                                padding: '0.25rem 0.6rem',
                                                                                borderRadius: 6,
                                                                                border: `1.5px solid ${splitPayMethod === p.k ? '#16a34a' : '#d1d5db'}`,
                                                                                background: splitPayMethod === p.k ? '#f0fdf4' : 'white',
                                                                                color: splitPayMethod === p.k ? '#16a34a' : '#666',
                                                                                fontWeight: 600,
                                                                                cursor: 'pointer',
                                                                                fontSize: '0.72rem',
                                                                                fontFamily: 'Poppins,sans-serif'
                                                                            },
                                                                            children: p.l
                                                                        }, p.k, false, {
                                                                            fileName: "[project]/app/manager/page.tsx",
                                                                            lineNumber: 518,
                                                                            columnNumber: 35
                                                                        }, this))
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/manager/page.tsx",
                                                                    lineNumber: 516,
                                                                    columnNumber: 31
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    style: {
                                                                        display: 'flex',
                                                                        gap: '0.3rem'
                                                                    },
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                            onClick: ()=>handleMarkSplitPaid(entry.personLabel),
                                                                            style: {
                                                                                ...btn('#16a34a'),
                                                                                flex: 2,
                                                                                fontSize: '0.72rem'
                                                                            },
                                                                            children: [
                                                                                "✅ Confirm ₹",
                                                                                entry.amount,
                                                                                " Paid"
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/app/manager/page.tsx",
                                                                            lineNumber: 533,
                                                                            columnNumber: 33
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                            onClick: ()=>setSplitPayEntry(null),
                                                                            style: {
                                                                                ...btn('#9ca3af'),
                                                                                flex: 1,
                                                                                fontSize: '0.72rem'
                                                                            },
                                                                            children: "Cancel"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/manager/page.tsx",
                                                                            lineNumber: 536,
                                                                            columnNumber: 33
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/manager/page.tsx",
                                                                    lineNumber: 532,
                                                                    columnNumber: 31
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/manager/page.tsx",
                                                            lineNumber: 514,
                                                            columnNumber: 29
                                                        }, this)
                                                    ]
                                                }, i, true, {
                                                    fileName: "[project]/app/manager/page.tsx",
                                                    lineNumber: 488,
                                                    columnNumber: 25
                                                }, this)),
                                            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isSplitFullyPaid"])(selTab.id) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    background: '#dcfce7',
                                                    border: '1px solid #86efac',
                                                    borderRadius: 8,
                                                    padding: '0.5rem',
                                                    textAlign: 'center',
                                                    fontWeight: 700,
                                                    color: '#16a34a',
                                                    fontSize: '0.82rem',
                                                    marginTop: '0.25rem'
                                                },
                                                children: "🎉 All portions paid! You can now close the tab."
                                            }, void 0, false, {
                                                fileName: "[project]/app/manager/page.tsx",
                                                lineNumber: 545,
                                                columnNumber: 25
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/manager/page.tsx",
                                        lineNumber: 482,
                                        columnNumber: 21
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/app/manager/page.tsx",
                                    lineNumber: 440,
                                    columnNumber: 17
                                }, this),
                                selTab.tabStatus !== 'closed' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
                                            lineNumber: 557,
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
                                                    onClick: ()=>setTabPayMethod(p.k),
                                                    style: {
                                                        padding: '0.35rem 0.75rem',
                                                        borderRadius: 8,
                                                        border: `2px solid ${tabPayMethod === p.k ? '#16a34a' : '#e5e7eb'}`,
                                                        background: tabPayMethod === p.k ? '#f0fdf4' : 'white',
                                                        color: tabPayMethod === p.k ? '#16a34a' : '#666',
                                                        fontWeight: 700,
                                                        cursor: 'pointer',
                                                        fontSize: '0.78rem',
                                                        fontFamily: 'Poppins,sans-serif'
                                                    },
                                                    children: p.l
                                                }, p.k, false, {
                                                    fileName: "[project]/app/manager/page.tsx",
                                                    lineNumber: 566,
                                                    columnNumber: 23
                                                }, this))
                                        }, void 0, false, {
                                            fileName: "[project]/app/manager/page.tsx",
                                            lineNumber: 558,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/manager/page.tsx",
                                    lineNumber: 556,
                                    columnNumber: 17
                                }, this),
                                selTab.tabStatus !== 'closed' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        marginBottom: '1rem'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            onClick: ()=>setShowDiscForm(!showDiscForm),
                                            style: {
                                                ...btn('#f5f0e8', '#E65C00'),
                                                fontSize: '0.78rem',
                                                width: '100%',
                                                border: '1px solid #F9A826'
                                            },
                                            children: [
                                                "🏷️ ",
                                                showDiscForm ? 'Hide' : 'Apply',
                                                " Discount"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/manager/page.tsx",
                                            lineNumber: 588,
                                            columnNumber: 19
                                        }, this),
                                        showDiscForm && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
                                                                    lineNumber: 598,
                                                                    columnNumber: 27
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                    type: "number",
                                                                    value: tabDiscAmt,
                                                                    onChange: (e)=>setTabDiscAmt(e.target.value),
                                                                    placeholder: "e.g. 50",
                                                                    style: {
                                                                        ...inp,
                                                                        fontSize: '0.82rem'
                                                                    }
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/manager/page.tsx",
                                                                    lineNumber: 599,
                                                                    columnNumber: 27
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/manager/page.tsx",
                                                            lineNumber: 597,
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
                                                                    lineNumber: 602,
                                                                    columnNumber: 27
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                    value: tabDiscNote,
                                                                    onChange: (e)=>setTabDiscNote(e.target.value),
                                                                    placeholder: "e.g. Loyalty",
                                                                    style: {
                                                                        ...inp,
                                                                        fontSize: '0.82rem'
                                                                    }
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/manager/page.tsx",
                                                                    lineNumber: 603,
                                                                    columnNumber: 27
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/manager/page.tsx",
                                                            lineNumber: 601,
                                                            columnNumber: 25
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/manager/page.tsx",
                                                    lineNumber: 596,
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
                                                            lineNumber: 607,
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
                                                            lineNumber: 608,
                                                            columnNumber: 25
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/manager/page.tsx",
                                                    lineNumber: 606,
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
                                                    lineNumber: 611,
                                                    columnNumber: 34
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    onClick: applyDiscount,
                                                    style: {
                                                        ...btn('#f59e0b', '#1A0800'),
                                                        width: '100%',
                                                        marginTop: '0.5rem',
                                                        fontSize: '0.82rem'
                                                    },
                                                    children: "Apply Discount"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/manager/page.tsx",
                                                    lineNumber: 612,
                                                    columnNumber: 23
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/manager/page.tsx",
                                            lineNumber: 595,
                                            columnNumber: 21
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/manager/page.tsx",
                                    lineNumber: 587,
                                    columnNumber: 17
                                }, this),
                                tabCloseConfirm && inProgressOrders.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        background: '#fff7ed',
                                        border: '2px solid #f97316',
                                        borderRadius: 10,
                                        padding: '0.85rem 1rem',
                                        marginBottom: '1rem'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                fontWeight: 800,
                                                color: '#9a3412',
                                                fontSize: '0.88rem',
                                                marginBottom: '0.4rem'
                                            },
                                            children: [
                                                "⚠️ ",
                                                inProgressOrders.length,
                                                " Order",
                                                inProgressOrders.length !== 1 ? 's' : '',
                                                " Still In Progress"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/manager/page.tsx",
                                            lineNumber: 623,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                fontSize: '0.78rem',
                                                color: '#7c2d12',
                                                lineHeight: 1.5
                                            },
                                            children: inProgressOrders.map((o)=>`#${o.orderNum || o.id.slice(-4)} (${STATUS_LABEL[o.status] || o.status})`).join(' · ')
                                        }, void 0, false, {
                                            fileName: "[project]/app/manager/page.tsx",
                                            lineNumber: 626,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                fontSize: '0.75rem',
                                                color: '#9a3412',
                                                marginTop: '0.35rem'
                                            },
                                            children: "Closing this tab will mark all pending orders as completed."
                                        }, void 0, false, {
                                            fileName: "[project]/app/manager/page.tsx",
                                            lineNumber: 631,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/manager/page.tsx",
                                    lineNumber: 622,
                                    columnNumber: 17
                                }, this),
                                tabBillMsg && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        background: '#dcfce7',
                                        color: '#16a34a',
                                        borderRadius: 10,
                                        padding: '0.75rem',
                                        textAlign: 'center',
                                        fontWeight: 700,
                                        marginBottom: '0.75rem'
                                    },
                                    children: tabBillMsg
                                }, void 0, false, {
                                    fileName: "[project]/app/manager/page.tsx",
                                    lineNumber: 639,
                                    columnNumber: 17
                                }, this),
                                selTab.tabStatus !== 'closed' && !tabBillMsg && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: handleCloseTab,
                                    style: {
                                        ...btn(tabCloseConfirm ? '#dc2626' : '#16a34a'),
                                        width: '100%',
                                        padding: '0.85rem',
                                        fontSize: '0.95rem',
                                        borderRadius: 12
                                    },
                                    children: tabCloseConfirm ? '⚠️ Confirm — Close Tab Anyway' : `✅ Collect ₹${tabBillTotal} · Close Tab (${PAY_LABELS[tabPayMethod] || tabPayMethod})`
                                }, void 0, false, {
                                    fileName: "[project]/app/manager/page.tsx",
                                    lineNumber: 646,
                                    columnNumber: 17
                                }, this),
                                selTab.tabStatus === 'closed' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        background: '#f0fdf4',
                                        color: '#16a34a',
                                        borderRadius: 10,
                                        padding: '0.85rem',
                                        textAlign: 'center',
                                        fontWeight: 800,
                                        fontSize: '1rem'
                                    },
                                    children: [
                                        "✅ Tab Closed · Paid via ",
                                        PAY_LABELS[selTab.paymentMethod] || selTab.paymentMethod
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/manager/page.tsx",
                                    lineNumber: 660,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/manager/page.tsx",
                            lineNumber: 395,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/manager/page.tsx",
                    lineNumber: 377,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/manager/page.tsx",
                lineNumber: 373,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/manager/page.tsx",
        lineNumber: 206,
        columnNumber: 5
    }, this);
}
_s(ManagerPage, "adGQ7RGGoNO5nCzzQ6qvAZFoYbo=", false, function() {
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