module.exports = [
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[project]/lib/storage.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
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
    "exportOrdersCSV",
    ()=>exportOrdersCSV,
    "findActiveDeviceSession",
    ()=>findActiveDeviceSession,
    "getActiveTabsForTable",
    ()=>getActiveTabsForTable,
    "getDeviceRecords",
    ()=>getDeviceRecords,
    "getDevicesForTab",
    ()=>getDevicesForTab,
    "getDisputeAlerts",
    ()=>getDisputeAlerts,
    "getEndOfDayReport",
    ()=>getEndOfDayReport,
    "getFraudAlerts",
    ()=>getFraudAlerts,
    "getLastWaiterCallTime",
    ()=>getLastWaiterCallTime,
    "getMenu",
    ()=>getMenu,
    "getNextOrderNumber",
    ()=>getNextOrderNumber,
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
    "getWaiterCalls",
    ()=>getWaiterCalls,
    "getWaiterStats",
    ()=>getWaiterStats,
    "isSplitFullyPaid",
    ()=>isSplitFullyPaid,
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
    "syncTabTotal",
    ()=>syncTabTotal,
    "syncTableStatus",
    ()=>syncTableStatus,
    "updateItemStatus",
    ()=>updateItemStatus,
    "updateOrderStatus",
    ()=>updateOrderStatus,
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
    devices: 'fl_device_records'
};
// ─── Storage helpers ──────────────────────────────────────────────────────────
function ls_get(key, fallback) {
    if ("TURBOPACK compile-time truthy", 1) return fallback;
    //TURBOPACK unreachable
    ;
}
function ls_set(key, val) {
    if ("TURBOPACK compile-time truthy", 1) return;
    //TURBOPACK unreachable
    ;
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
    const orders = getOrders();
    orders.push(order);
    saveOrders(orders);
}
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
    if ("TURBOPACK compile-time truthy", 1) return '';
    //TURBOPACK unreachable
    ;
    let id;
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
}),
"[project]/app/online/page.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>OnlineOrderPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/storage.ts [app-ssr] (ecmascript)");
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
const MAX_QTY = 20;
function OnlineOrderPage() {
    const [menu, setMenu] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [cart, setCart] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [filter, setFilter] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('All');
    const [cartOpen, setCartOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [showCheckout, setShowCheckout] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [orderPlaced, setOrderPlaced] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [lastOrderId, setLastOrderId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('');
    const [isSubmitting, setIsSubmitting] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [form, setForm] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])({
        name: '',
        phone: '',
        type: 'pickup',
        address: '',
        payment: 'cod'
    });
    const submittingRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        setMenu((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getMenu"])());
    }, []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        function handleKey(e) {
            if (e.key !== 'Escape' || isSubmitting) return;
            setCartOpen(false);
            setShowCheckout(false);
        }
        window.addEventListener('keydown', handleKey);
        return ()=>window.removeEventListener('keydown', handleKey);
    }, [
        isSubmitting
    ]);
    const filtered = filter === 'All' ? menu.filter((m)=>m.available !== false) : menu.filter((m)=>m.category === filter && m.available !== false);
    const cartTotal = cart.reduce((s, c)=>s + c.item.price * c.qty, 0);
    const cartCount = cart.reduce((s, c)=>s + c.qty, 0);
    function addToCart(item) {
        setCart((prev)=>{
            const ex = prev.find((c)=>c.item.id === item.id);
            if (ex) {
                if (ex.qty >= MAX_QTY) return prev;
                return prev.map((c)=>c.item.id === item.id ? {
                        ...c,
                        qty: c.qty + 1
                    } : c);
            }
            return [
                ...prev,
                {
                    item,
                    qty: 1
                }
            ];
        });
    }
    function changeQty(id, delta) {
        setCart((prev)=>prev.map((c)=>c.item.id === id ? {
                    ...c,
                    qty: Math.min(c.qty + delta, MAX_QTY)
                } : c).filter((c)=>c.qty > 0));
    }
    function placeOrder() {
        if (submittingRef.current || isSubmitting) return;
        if (!form.name.trim()) {
            alert('Please enter your name');
            return;
        }
        if (!form.phone.trim()) {
            alert('Please enter your phone number');
            return;
        }
        if (form.type === 'delivery' && !form.address.trim()) {
            alert('Please enter delivery address');
            return;
        }
        if (!cart.length) {
            alert('Cart is empty');
            return;
        }
        submittingRef.current = true;
        setIsSubmitting(true);
        try {
            const ts = new Date().toISOString();
            const id = `ONL-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
            const items = cart.map((c)=>({
                    name: c.item.name,
                    price: c.item.price,
                    qty: c.qty,
                    subtotal: c.item.price * c.qty
                }));
            const order = {
                id,
                type: 'pickup',
                customerName: form.name.trim(),
                phone: form.phone.trim(),
                items,
                subtotal: cartTotal,
                discount: 0,
                discountReason: '',
                total: cartTotal,
                payment: form.payment,
                status: 'pending',
                timeline: [
                    {
                        status: 'pending',
                        at: ts,
                        note: form.type === 'delivery' ? `Delivery: ${form.address}` : 'Pickup'
                    }
                ],
                timestamp: ts,
                staffName: form.type === 'delivery' ? `Delivery: ${form.address}` : 'Pickup'
            };
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["addOrder"])(order);
            setLastOrderId(id);
            setCart([]);
            setShowCheckout(false);
            setOrderPlaced(true);
            setForm({
                name: '',
                phone: '',
                type: 'pickup',
                address: '',
                payment: 'cod'
            });
        } finally{
            submittingRef.current = false;
            setIsSubmitting(false);
        }
    }
    const O = '#2563eb'; // Online blue accent
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        style: {
            minHeight: '100vh',
            background: '#f0f9ff'
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    background: 'linear-gradient(135deg,#1e3a5f,#2563eb)',
                    color: 'white',
                    padding: '1rem 1.5rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    position: 'sticky',
                    top: 0,
                    zIndex: 100
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    fontFamily: "'Playfair Display',serif",
                                    fontSize: '1.3rem',
                                    fontWeight: 900
                                },
                                children: "🍽️ Foodie Lover"
                            }, void 0, false, {
                                fileName: "[project]/app/online/page.tsx",
                                lineNumber: 125,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    fontSize: '0.75rem',
                                    color: '#93c5fd'
                                },
                                children: "📦 Online Ordering — Pickup & Delivery"
                            }, void 0, false, {
                                fileName: "[project]/app/online/page.tsx",
                                lineNumber: 126,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/online/page.tsx",
                        lineNumber: 124,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>setCartOpen(true),
                        style: {
                            background: O,
                            border: '2px solid #93c5fd',
                            color: 'white',
                            padding: '0.5rem 1.1rem',
                            borderRadius: 20,
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontSize: '0.88rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        },
                        children: [
                            "🛒 Cart",
                            cartCount > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                style: {
                                    background: 'white',
                                    color: O,
                                    borderRadius: '50%',
                                    width: 20,
                                    height: 20,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.72rem',
                                    fontWeight: 900
                                },
                                children: cartCount
                            }, void 0, false, {
                                fileName: "[project]/app/online/page.tsx",
                                lineNumber: 134,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/online/page.tsx",
                        lineNumber: 128,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/online/page.tsx",
                lineNumber: 123,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    background: '#eff6ff',
                    borderBottom: '2px solid #bfdbfe',
                    padding: '0.65rem 1.5rem',
                    display: 'flex',
                    gap: '1.5rem',
                    fontSize: '0.78rem',
                    color: '#1d4ed8',
                    overflowX: 'auto'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        children: "🚗 Free delivery (local area)"
                    }, void 0, false, {
                        fileName: "[project]/app/online/page.tsx",
                        lineNumber: 143,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        children: "⏱ Pickup ready in 20–30 min"
                    }, void 0, false, {
                        fileName: "[project]/app/online/page.tsx",
                        lineNumber: 144,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        children: "📱 Track your order in real time"
                    }, void 0, false, {
                        fileName: "[project]/app/online/page.tsx",
                        lineNumber: 145,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/online/page.tsx",
                lineNumber: 142,
                columnNumber: 7
            }, this),
            orderPlaced && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    background: '#dcfce7',
                    border: '1px solid #86efac',
                    color: '#15803d',
                    padding: '1rem 1.5rem',
                    textAlign: 'center',
                    fontWeight: 700
                },
                children: [
                    "✅ Order placed! ID: ",
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                        children: lastOrderId
                    }, void 0, false, {
                        fileName: "[project]/app/online/page.tsx",
                        lineNumber: 151,
                        columnNumber: 31
                    }, this),
                    " — We'll prepare it right away.",
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>setOrderPlaced(false),
                        style: {
                            marginLeft: '1rem',
                            background: 'none',
                            border: 'none',
                            color: '#15803d',
                            cursor: 'pointer',
                            fontWeight: 700,
                            fontFamily: 'Poppins,sans-serif',
                            fontSize: '0.85rem'
                        },
                        children: "×"
                    }, void 0, false, {
                        fileName: "[project]/app/online/page.tsx",
                        lineNumber: 152,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/online/page.tsx",
                lineNumber: 150,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    padding: '0.85rem 1.5rem',
                    display: 'flex',
                    gap: '0.4rem',
                    overflowX: 'auto'
                },
                children: CATEGORIES.map((cat)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>setFilter(cat),
                        style: {
                            padding: '0.35rem 0.9rem',
                            borderRadius: 20,
                            border: '2px solid',
                            borderColor: filter === cat ? O : '#ddd',
                            background: filter === cat ? O : 'white',
                            color: filter === cat ? 'white' : '#666',
                            fontWeight: 600,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            fontSize: '0.8rem',
                            fontFamily: 'Poppins,sans-serif'
                        },
                        children: cat
                    }, cat, false, {
                        fileName: "[project]/app/online/page.tsx",
                        lineNumber: 159,
                        columnNumber: 11
                    }, this))
            }, void 0, false, {
                fileName: "[project]/app/online/page.tsx",
                lineNumber: 157,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    padding: '0 1.5rem 6rem',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill,minmax(270px,1fr))',
                    gap: '1rem'
                },
                children: filtered.map((item)=>{
                    const inCart = cart.find((c)=>c.item.id === item.id);
                    const atMax = inCart && inCart.qty >= MAX_QTY;
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            background: 'white',
                            borderRadius: 12,
                            overflow: 'hidden',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
                            border: '1px solid #e0f2fe'
                        },
                        children: [
                            item.img && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                src: item.img,
                                alt: item.name,
                                style: {
                                    width: '100%',
                                    height: '150px',
                                    objectFit: 'cover'
                                }
                            }, void 0, false, {
                                fileName: "[project]/app/online/page.tsx",
                                lineNumber: 179,
                                columnNumber: 28
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    padding: '0.9rem'
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'flex-start',
                                            marginBottom: '0.25rem'
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    fontWeight: 700,
                                                    fontSize: '0.92rem',
                                                    color: '#1e3a5f'
                                                },
                                                children: item.name
                                            }, void 0, false, {
                                                fileName: "[project]/app/online/page.tsx",
                                                lineNumber: 182,
                                                columnNumber: 19
                                            }, this),
                                            item.badge && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                style: {
                                                    fontSize: '0.63rem',
                                                    background: '#eff6ff',
                                                    color: O,
                                                    padding: '0.12rem 0.4rem',
                                                    borderRadius: 8,
                                                    fontWeight: 700,
                                                    whiteSpace: 'nowrap',
                                                    marginLeft: '0.4rem'
                                                },
                                                children: BADGE_LABELS[item.badge] || item.badge
                                            }, void 0, false, {
                                                fileName: "[project]/app/online/page.tsx",
                                                lineNumber: 184,
                                                columnNumber: 21
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/online/page.tsx",
                                        lineNumber: 181,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            fontSize: '0.75rem',
                                            color: '#888',
                                            marginBottom: '0.7rem',
                                            lineHeight: 1.4
                                        },
                                        children: item.desc
                                    }, void 0, false, {
                                        fileName: "[project]/app/online/page.tsx",
                                        lineNumber: 189,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                style: {
                                                    fontWeight: 900,
                                                    color: O,
                                                    fontSize: '1rem'
                                                },
                                                children: [
                                                    "₹",
                                                    item.price
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/online/page.tsx",
                                                lineNumber: 191,
                                                columnNumber: 19
                                            }, this),
                                            inCart ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.4rem'
                                                },
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        onClick: ()=>changeQty(item.id, -1),
                                                        style: {
                                                            width: 28,
                                                            height: 28,
                                                            borderRadius: '50%',
                                                            border: `2px solid ${O}`,
                                                            background: 'white',
                                                            color: O,
                                                            fontWeight: 900,
                                                            cursor: 'pointer',
                                                            fontSize: '1rem',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        },
                                                        children: "−"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/online/page.tsx",
                                                        lineNumber: 194,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        style: {
                                                            fontWeight: 800,
                                                            minWidth: 20,
                                                            textAlign: 'center'
                                                        },
                                                        children: inCart.qty
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/online/page.tsx",
                                                        lineNumber: 195,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        onClick: ()=>changeQty(item.id, 1),
                                                        disabled: !!atMax,
                                                        style: {
                                                            width: 28,
                                                            height: 28,
                                                            borderRadius: '50%',
                                                            background: atMax ? '#ddd' : O,
                                                            border: 'none',
                                                            color: 'white',
                                                            fontWeight: 900,
                                                            cursor: atMax ? 'not-allowed' : 'pointer',
                                                            fontSize: '1rem',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        },
                                                        children: "+"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/online/page.tsx",
                                                        lineNumber: 196,
                                                        columnNumber: 23
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/online/page.tsx",
                                                lineNumber: 193,
                                                columnNumber: 21
                                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                onClick: ()=>addToCart(item),
                                                style: {
                                                    background: O,
                                                    color: 'white',
                                                    border: 'none',
                                                    padding: '0.38rem 0.95rem',
                                                    borderRadius: 20,
                                                    fontWeight: 700,
                                                    cursor: 'pointer',
                                                    fontSize: '0.8rem',
                                                    fontFamily: 'Poppins,sans-serif'
                                                },
                                                children: "+ Add"
                                            }, void 0, false, {
                                                fileName: "[project]/app/online/page.tsx",
                                                lineNumber: 199,
                                                columnNumber: 21
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/online/page.tsx",
                                        lineNumber: 190,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/online/page.tsx",
                                lineNumber: 180,
                                columnNumber: 15
                            }, this)
                        ]
                    }, item.id, true, {
                        fileName: "[project]/app/online/page.tsx",
                        lineNumber: 178,
                        columnNumber: 13
                    }, this);
                })
            }, void 0, false, {
                fileName: "[project]/app/online/page.tsx",
                lineNumber: 173,
                columnNumber: 7
            }, this),
            cartOpen && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "modal-overlay show",
                onClick: ()=>{
                    if (!isSubmitting) setCartOpen(false);
                },
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    onClick: (e)=>e.stopPropagation(),
                    style: {
                        background: 'white',
                        borderRadius: 16,
                        width: '100%',
                        maxWidth: 440,
                        maxHeight: '90vh',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                background: `linear-gradient(135deg,#1e3a5f,${O})`,
                                color: 'white',
                                padding: '1.1rem 1.5rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    style: {
                                        fontFamily: "'Playfair Display',serif",
                                        fontWeight: 900,
                                        fontSize: '1.05rem'
                                    },
                                    children: "🛒 Your Cart"
                                }, void 0, false, {
                                    fileName: "[project]/app/online/page.tsx",
                                    lineNumber: 213,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: ()=>setCartOpen(false),
                                    style: {
                                        background: 'none',
                                        border: 'none',
                                        color: 'white',
                                        fontSize: '1.5rem',
                                        cursor: 'pointer'
                                    },
                                    children: "×"
                                }, void 0, false, {
                                    fileName: "[project]/app/online/page.tsx",
                                    lineNumber: 214,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/online/page.tsx",
                            lineNumber: 212,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                flex: 1,
                                overflowY: 'auto',
                                padding: '1rem 1.5rem'
                            },
                            children: !cart.length ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                style: {
                                    color: '#999',
                                    textAlign: 'center',
                                    padding: '2rem 0'
                                },
                                children: "Your cart is empty"
                            }, void 0, false, {
                                fileName: "[project]/app/online/page.tsx",
                                lineNumber: 218,
                                columnNumber: 19
                            }, this) : cart.map((c)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '0.7rem 0',
                                        borderBottom: '1px solid #f0f9ff'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    style: {
                                                        fontWeight: 600,
                                                        fontSize: '0.88rem'
                                                    },
                                                    children: c.item.name
                                                }, void 0, false, {
                                                    fileName: "[project]/app/online/page.tsx",
                                                    lineNumber: 222,
                                                    columnNumber: 23
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    style: {
                                                        fontSize: '0.75rem',
                                                        color: '#888'
                                                    },
                                                    children: [
                                                        "₹",
                                                        c.item.price,
                                                        " × ",
                                                        c.qty,
                                                        " = ",
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                            children: [
                                                                "₹",
                                                                c.item.price * c.qty
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/online/page.tsx",
                                                            lineNumber: 223,
                                                            columnNumber: 103
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/online/page.tsx",
                                                    lineNumber: 223,
                                                    columnNumber: 23
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/online/page.tsx",
                                            lineNumber: 221,
                                            columnNumber: 21
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.35rem'
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    onClick: ()=>changeQty(c.item.id, -1),
                                                    style: {
                                                        width: 26,
                                                        height: 26,
                                                        borderRadius: '50%',
                                                        border: `2px solid ${O}`,
                                                        background: 'white',
                                                        color: O,
                                                        fontWeight: 900,
                                                        cursor: 'pointer'
                                                    },
                                                    children: "−"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/online/page.tsx",
                                                    lineNumber: 226,
                                                    columnNumber: 23
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    style: {
                                                        fontWeight: 800,
                                                        minWidth: 18,
                                                        textAlign: 'center'
                                                    },
                                                    children: c.qty
                                                }, void 0, false, {
                                                    fileName: "[project]/app/online/page.tsx",
                                                    lineNumber: 227,
                                                    columnNumber: 23
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    onClick: ()=>changeQty(c.item.id, 1),
                                                    disabled: c.qty >= MAX_QTY,
                                                    style: {
                                                        width: 26,
                                                        height: 26,
                                                        borderRadius: '50%',
                                                        background: c.qty >= MAX_QTY ? '#ddd' : O,
                                                        border: 'none',
                                                        color: 'white',
                                                        fontWeight: 900,
                                                        cursor: c.qty >= MAX_QTY ? 'not-allowed' : 'pointer'
                                                    },
                                                    children: "+"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/online/page.tsx",
                                                    lineNumber: 228,
                                                    columnNumber: 23
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/online/page.tsx",
                                            lineNumber: 225,
                                            columnNumber: 21
                                        }, this)
                                    ]
                                }, c.item.id, true, {
                                    fileName: "[project]/app/online/page.tsx",
                                    lineNumber: 220,
                                    columnNumber: 19
                                }, this))
                        }, void 0, false, {
                            fileName: "[project]/app/online/page.tsx",
                            lineNumber: 216,
                            columnNumber: 13
                        }, this),
                        cart.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                padding: '1rem 1.5rem',
                                borderTop: '2px solid #f0f9ff'
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        fontWeight: 900,
                                        fontSize: '1rem',
                                        marginBottom: '0.85rem',
                                        color: '#1e3a5f'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            children: "Total"
                                        }, void 0, false, {
                                            fileName: "[project]/app/online/page.tsx",
                                            lineNumber: 237,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            style: {
                                                color: O
                                            },
                                            children: [
                                                "₹",
                                                cartTotal
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/online/page.tsx",
                                            lineNumber: 237,
                                            columnNumber: 37
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/online/page.tsx",
                                    lineNumber: 236,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: ()=>{
                                        setCartOpen(false);
                                        setShowCheckout(true);
                                    },
                                    style: {
                                        width: '100%',
                                        background: O,
                                        color: 'white',
                                        border: 'none',
                                        padding: '0.75rem',
                                        borderRadius: 10,
                                        fontWeight: 700,
                                        fontSize: '1rem',
                                        cursor: 'pointer',
                                        fontFamily: 'Poppins,sans-serif'
                                    },
                                    children: "Proceed to Checkout →"
                                }, void 0, false, {
                                    fileName: "[project]/app/online/page.tsx",
                                    lineNumber: 239,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/online/page.tsx",
                            lineNumber: 235,
                            columnNumber: 15
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/online/page.tsx",
                    lineNumber: 211,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/online/page.tsx",
                lineNumber: 210,
                columnNumber: 9
            }, this),
            showCheckout && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "modal-overlay show",
                onClick: ()=>{
                    if (!isSubmitting) setShowCheckout(false);
                },
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    onClick: (e)=>e.stopPropagation(),
                    style: {
                        background: 'white',
                        borderRadius: 16,
                        width: '100%',
                        maxWidth: 440,
                        maxHeight: '92vh',
                        overflow: 'auto'
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                background: `linear-gradient(135deg,#1e3a5f,${O})`,
                                color: 'white',
                                padding: '1.1rem 1.5rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    style: {
                                        fontFamily: "'Playfair Display',serif",
                                        fontWeight: 900,
                                        fontSize: '1.05rem'
                                    },
                                    children: "📦 Checkout"
                                }, void 0, false, {
                                    fileName: "[project]/app/online/page.tsx",
                                    lineNumber: 253,
                                    columnNumber: 15
                                }, this),
                                !isSubmitting && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: ()=>setShowCheckout(false),
                                    style: {
                                        background: 'none',
                                        border: 'none',
                                        color: 'white',
                                        fontSize: '1.5rem',
                                        cursor: 'pointer'
                                    },
                                    children: "×"
                                }, void 0, false, {
                                    fileName: "[project]/app/online/page.tsx",
                                    lineNumber: 255,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/online/page.tsx",
                            lineNumber: 252,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                padding: '1.4rem'
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        marginBottom: '1rem'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            style: {
                                                fontSize: '0.78rem',
                                                fontWeight: 700,
                                                color: '#555',
                                                display: 'block',
                                                marginBottom: '0.3rem'
                                            },
                                            children: "Your Name *"
                                        }, void 0, false, {
                                            fileName: "[project]/app/online/page.tsx",
                                            lineNumber: 260,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            value: form.name,
                                            onChange: (e)=>setForm((f)=>({
                                                        ...f,
                                                        name: e.target.value
                                                    })),
                                            placeholder: "Full name",
                                            disabled: isSubmitting,
                                            style: {
                                                width: '100%',
                                                padding: '0.6rem',
                                                border: '2px solid #ddd',
                                                borderRadius: 8,
                                                fontFamily: 'Poppins,sans-serif',
                                                fontSize: '0.9rem'
                                            }
                                        }, void 0, false, {
                                            fileName: "[project]/app/online/page.tsx",
                                            lineNumber: 261,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/online/page.tsx",
                                    lineNumber: 259,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        marginBottom: '1rem'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            style: {
                                                fontSize: '0.78rem',
                                                fontWeight: 700,
                                                color: '#555',
                                                display: 'block',
                                                marginBottom: '0.3rem'
                                            },
                                            children: "Phone Number *"
                                        }, void 0, false, {
                                            fileName: "[project]/app/online/page.tsx",
                                            lineNumber: 265,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            type: "tel",
                                            value: form.phone,
                                            onChange: (e)=>setForm((f)=>({
                                                        ...f,
                                                        phone: e.target.value
                                                    })),
                                            placeholder: "+91 XXXXX XXXXX",
                                            disabled: isSubmitting,
                                            style: {
                                                width: '100%',
                                                padding: '0.6rem',
                                                border: '2px solid #ddd',
                                                borderRadius: 8,
                                                fontFamily: 'Poppins,sans-serif',
                                                fontSize: '0.9rem'
                                            }
                                        }, void 0, false, {
                                            fileName: "[project]/app/online/page.tsx",
                                            lineNumber: 266,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/online/page.tsx",
                                    lineNumber: 264,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        marginBottom: '1rem'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            style: {
                                                fontSize: '0.78rem',
                                                fontWeight: 700,
                                                color: '#555',
                                                display: 'block',
                                                marginBottom: '0.4rem'
                                            },
                                            children: "Order Type"
                                        }, void 0, false, {
                                            fileName: "[project]/app/online/page.tsx",
                                            lineNumber: 270,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                display: 'flex',
                                                gap: '0.5rem'
                                            },
                                            children: [
                                                {
                                                    k: 'pickup',
                                                    l: '🏪 Pickup'
                                                },
                                                {
                                                    k: 'delivery',
                                                    l: '🚗 Delivery'
                                                }
                                            ].map((t)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    onClick: ()=>!isSubmitting && setForm((f)=>({
                                                                ...f,
                                                                type: t.k
                                                            })),
                                                    style: {
                                                        flex: 1,
                                                        padding: '0.5rem',
                                                        border: `2px solid ${form.type === t.k ? O : '#ddd'}`,
                                                        borderRadius: 8,
                                                        background: form.type === t.k ? '#eff6ff' : 'white',
                                                        color: form.type === t.k ? O : '#666',
                                                        fontWeight: 700,
                                                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                                        fontFamily: 'Poppins,sans-serif'
                                                    },
                                                    children: t.l
                                                }, t.k, false, {
                                                    fileName: "[project]/app/online/page.tsx",
                                                    lineNumber: 276,
                                                    columnNumber: 21
                                                }, this))
                                        }, void 0, false, {
                                            fileName: "[project]/app/online/page.tsx",
                                            lineNumber: 271,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/online/page.tsx",
                                    lineNumber: 269,
                                    columnNumber: 15
                                }, this),
                                form.type === 'delivery' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        marginBottom: '1rem'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            style: {
                                                fontSize: '0.78rem',
                                                fontWeight: 700,
                                                color: '#555',
                                                display: 'block',
                                                marginBottom: '0.3rem'
                                            },
                                            children: "Delivery Address *"
                                        }, void 0, false, {
                                            fileName: "[project]/app/online/page.tsx",
                                            lineNumber: 291,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                                            value: form.address,
                                            onChange: (e)=>setForm((f)=>({
                                                        ...f,
                                                        address: e.target.value
                                                    })),
                                            placeholder: "Full address including landmark",
                                            rows: 3,
                                            disabled: isSubmitting,
                                            style: {
                                                width: '100%',
                                                padding: '0.6rem',
                                                border: '2px solid #ddd',
                                                borderRadius: 8,
                                                fontFamily: 'Poppins,sans-serif',
                                                fontSize: '0.9rem',
                                                resize: 'vertical'
                                            }
                                        }, void 0, false, {
                                            fileName: "[project]/app/online/page.tsx",
                                            lineNumber: 292,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/online/page.tsx",
                                    lineNumber: 290,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        marginBottom: '1.25rem'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            style: {
                                                fontSize: '0.78rem',
                                                fontWeight: 700,
                                                color: '#555',
                                                display: 'block',
                                                marginBottom: '0.4rem'
                                            },
                                            children: "Payment"
                                        }, void 0, false, {
                                            fileName: "[project]/app/online/page.tsx",
                                            lineNumber: 297,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                            value: form.payment,
                                            onChange: (e)=>setForm((f)=>({
                                                        ...f,
                                                        payment: e.target.value
                                                    })),
                                            disabled: isSubmitting,
                                            style: {
                                                width: '100%',
                                                padding: '0.6rem',
                                                border: '2px solid #ddd',
                                                borderRadius: 8,
                                                fontFamily: 'Poppins,sans-serif',
                                                fontSize: '0.9rem'
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: "cod",
                                                    children: "Cash on Delivery/Pickup"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/online/page.tsx",
                                                    lineNumber: 299,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: "gpay",
                                                    children: "Google Pay"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/online/page.tsx",
                                                    lineNumber: 300,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: "phonepe",
                                                    children: "PhonePe"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/online/page.tsx",
                                                    lineNumber: 301,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: "upi",
                                                    children: "UPI"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/online/page.tsx",
                                                    lineNumber: 302,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: "card",
                                                    children: "Card"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/online/page.tsx",
                                                    lineNumber: 303,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/online/page.tsx",
                                            lineNumber: 298,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/online/page.tsx",
                                    lineNumber: 296,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        background: '#eff6ff',
                                        borderRadius: 8,
                                        padding: '0.75rem',
                                        marginBottom: '1rem'
                                    },
                                    children: [
                                        cart.map((c)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    fontSize: '0.83rem',
                                                    padding: '0.18rem 0'
                                                },
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        children: [
                                                            c.item.name,
                                                            " × ",
                                                            c.qty
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/online/page.tsx",
                                                        lineNumber: 311,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        children: [
                                                            "₹",
                                                            c.item.price * c.qty
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/online/page.tsx",
                                                        lineNumber: 311,
                                                        columnNumber: 57
                                                    }, this)
                                                ]
                                            }, c.item.id, true, {
                                                fileName: "[project]/app/online/page.tsx",
                                                lineNumber: 310,
                                                columnNumber: 19
                                            }, this)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                borderTop: `2px solid ${O}`,
                                                marginTop: '0.4rem',
                                                paddingTop: '0.4rem',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                fontWeight: 900,
                                                color: O
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    children: "Total"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/online/page.tsx",
                                                    lineNumber: 315,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    children: [
                                                        "₹",
                                                        cartTotal
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/online/page.tsx",
                                                    lineNumber: 315,
                                                    columnNumber: 37
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/online/page.tsx",
                                            lineNumber: 314,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/online/page.tsx",
                                    lineNumber: 308,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: placeOrder,
                                    disabled: isSubmitting,
                                    style: {
                                        width: '100%',
                                        background: isSubmitting ? '#bbb' : O,
                                        color: 'white',
                                        border: 'none',
                                        padding: '0.85rem',
                                        borderRadius: 10,
                                        fontWeight: 700,
                                        fontSize: '1rem',
                                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                        fontFamily: 'Poppins,sans-serif'
                                    },
                                    children: isSubmitting ? '⏳ Placing Order…' : `✅ Place Order — ₹${cartTotal}`
                                }, void 0, false, {
                                    fileName: "[project]/app/online/page.tsx",
                                    lineNumber: 319,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/online/page.tsx",
                            lineNumber: 258,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/online/page.tsx",
                    lineNumber: 251,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/online/page.tsx",
                lineNumber: 250,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/online/page.tsx",
        lineNumber: 120,
        columnNumber: 5
    }, this);
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__90180dac._.js.map