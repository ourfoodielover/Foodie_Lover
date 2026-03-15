(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
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
    "getActiveTabsForTable",
    ()=>getActiveTabsForTable,
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
    "requestBill",
    ()=>requestBill,
    "resolveDispute",
    ()=>resolveDispute,
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
    splitBills: 'fl_split_bills'
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
"[project]/app/kitchen/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>KitchenPage
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
const STATUS_COLOR = {
    pending: '#f59e0b',
    preparing: '#3b82f6',
    prepared: '#8b5cf6'
};
const STATUS_LABEL = {
    pending: 'Queued',
    preparing: 'Preparing',
    prepared: 'Ready'
};
function KitchenPage() {
    _s();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const [session, setSession] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [authChecked, setAuthChecked] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [orders, setOrders] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [tabs, setTabs] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [clock, setClock] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [filter, setFilter] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('all');
    // ── Auth ──────────────────────────────────────────────────────────────────
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "KitchenPage.useEffect": ()=>{
            const s = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getSession"])('kitchen');
            if (!s) {
                router.replace('/kitchen/login');
                return;
            }
            setSession(s);
            setAuthChecked(true);
        }
    }["KitchenPage.useEffect"], [
        router
    ]);
    // ── Data refresh ──────────────────────────────────────────────────────────
    const refresh = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "KitchenPage.useCallback[refresh]": ()=>{
            setOrders((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getOrders"])());
            setTabs((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getTabs"])());
        }
    }["KitchenPage.useCallback[refresh]"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "KitchenPage.useEffect": ()=>{
            if (!authChecked) return;
            refresh();
            const t1 = setInterval(refresh, 3000);
            const t2 = setInterval({
                "KitchenPage.useEffect.t2": ()=>setClock(new Date().toLocaleTimeString())
            }["KitchenPage.useEffect.t2"], 1000);
            return ({
                "KitchenPage.useEffect": ()=>{
                    clearInterval(t1);
                    clearInterval(t2);
                }
            })["KitchenPage.useEffect"];
        }
    }["KitchenPage.useEffect"], [
        refresh,
        authChecked
    ]);
    function logout() {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clearSession"])('kitchen');
        router.replace('/kitchen/login');
    }
    // ── Actions ───────────────────────────────────────────────────────────────
    function advanceOrder(order) {
        const next = order.status === 'pending' ? 'preparing' : order.status === 'preparing' ? 'prepared' : null;
        if (!next) return;
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["updateOrderStatus"])(order.id, next, session?.name || 'Kitchen');
        refresh();
    }
    function advanceItem(orderId, itemIndex) {
        const order = orders.find((o)=>o.id === orderId);
        if (!order) return;
        const item = order.items?.[itemIndex];
        if (!item) return;
        const currentStatus = item.itemStatus || 'queued';
        const nextStatus = currentStatus === 'queued' ? 'preparing' : currentStatus === 'preparing' ? 'prepared' : 'prepared';
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["updateItemStatus"])(orderId, itemIndex, nextStatus, session?.name || 'Kitchen');
        refresh();
    }
    // ── Derived ───────────────────────────────────────────────────────────────
    const kitchenOrders = orders.filter((o)=>[
            'pending',
            'preparing',
            'prepared'
        ].includes(o.status)).sort((a, b)=>new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const shown = filter === 'all' ? kitchenOrders : filter === 'queued' ? kitchenOrders.filter((o)=>o.status === 'pending') : filter === 'cooking' ? kitchenOrders.filter((o)=>o.status === 'preparing') : kitchenOrders.filter((o)=>o.status === 'prepared');
    const queuedCount = kitchenOrders.filter((o)=>o.status === 'pending').length;
    const cookingCount = kitchenOrders.filter((o)=>o.status === 'preparing').length;
    const readyCount = kitchenOrders.filter((o)=>o.status === 'prepared').length;
    // ── Styles ────────────────────────────────────────────────────────────────
    const btn = (bg = '#E65C00', c = 'white')=>({
            background: bg,
            color: c,
            border: 'none',
            borderRadius: 8,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'Poppins,sans-serif',
            padding: '0.45rem 1rem',
            fontSize: '0.8rem'
        });
    if (!authChecked) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: {
                minHeight: '100vh',
                background: '#111',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            },
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    color: '#888',
                    textAlign: 'center'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            fontSize: '2rem',
                            marginBottom: '0.5rem'
                        },
                        children: "👨‍🍳"
                    }, void 0, false, {
                        fileName: "[project]/app/kitchen/page.tsx",
                        lineNumber: 102,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: "Loading Kitchen Display…"
                    }, void 0, false, {
                        fileName: "[project]/app/kitchen/page.tsx",
                        lineNumber: 103,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/kitchen/page.tsx",
                lineNumber: 101,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/app/kitchen/page.tsx",
            lineNumber: 100,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        style: {
            minHeight: '100vh',
            background: '#111',
            color: 'white',
            fontFamily: 'Poppins,sans-serif'
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    background: '#1a1a1a',
                    borderBottom: '2px solid #333',
                    padding: '0.8rem 1.25rem',
                    position: 'sticky',
                    top: 0,
                    zIndex: 50,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.65rem'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                style: {
                                    fontSize: '1.6rem'
                                },
                                children: "👨‍🍳"
                            }, void 0, false, {
                                fileName: "[project]/app/kitchen/page.tsx",
                                lineNumber: 115,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            fontFamily: "'Playfair Display',serif",
                                            fontSize: '1.15rem',
                                            fontWeight: 900,
                                            color: '#F9A826'
                                        },
                                        children: "Kitchen Display"
                                    }, void 0, false, {
                                        fileName: "[project]/app/kitchen/page.tsx",
                                        lineNumber: 117,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            fontSize: '0.65rem',
                                            color: '#666'
                                        },
                                        children: clock
                                    }, void 0, false, {
                                        fileName: "[project]/app/kitchen/page.tsx",
                                        lineNumber: 118,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/kitchen/page.tsx",
                                lineNumber: 116,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/kitchen/page.tsx",
                        lineNumber: 114,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            display: 'flex',
                            gap: '0.75rem',
                            alignItems: 'center'
                        },
                        children: [
                            [
                                {
                                    count: queuedCount,
                                    color: '#f59e0b',
                                    label: 'Queued'
                                },
                                {
                                    count: cookingCount,
                                    color: '#3b82f6',
                                    label: 'Cooking'
                                },
                                {
                                    count: readyCount,
                                    color: '#8b5cf6',
                                    label: 'Ready'
                                }
                            ].map((s)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        textAlign: 'center'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                fontSize: '1rem',
                                                fontWeight: 900,
                                                color: s.color
                                            },
                                            children: s.count
                                        }, void 0, false, {
                                            fileName: "[project]/app/kitchen/page.tsx",
                                            lineNumber: 129,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                fontSize: '0.6rem',
                                                color: '#666'
                                            },
                                            children: s.label
                                        }, void 0, false, {
                                            fileName: "[project]/app/kitchen/page.tsx",
                                            lineNumber: 130,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, s.label, true, {
                                    fileName: "[project]/app/kitchen/page.tsx",
                                    lineNumber: 128,
                                    columnNumber: 13
                                }, this)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: logout,
                                style: {
                                    ...btn('#ffffff15', '#aaa'),
                                    border: '1px solid #333',
                                    fontSize: '0.72rem'
                                },
                                children: "🚪 Logout"
                            }, void 0, false, {
                                fileName: "[project]/app/kitchen/page.tsx",
                                lineNumber: 133,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/kitchen/page.tsx",
                        lineNumber: 121,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/kitchen/page.tsx",
                lineNumber: 113,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    padding: '0.6rem 1.25rem',
                    display: 'flex',
                    gap: '0.4rem',
                    background: '#1a1a1a',
                    borderBottom: '1px solid #2a2a2a',
                    overflowX: 'auto'
                },
                children: [
                    {
                        key: 'all',
                        label: `🍳 All (${kitchenOrders.length})`
                    },
                    {
                        key: 'queued',
                        label: `⏱ Queued (${queuedCount})`
                    },
                    {
                        key: 'cooking',
                        label: `🔥 Cooking (${cookingCount})`
                    },
                    {
                        key: 'ready',
                        label: `✅ Ready (${readyCount})`
                    }
                ].map((f)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>setFilter(f.key),
                        style: {
                            padding: '0.28rem 0.8rem',
                            borderRadius: 20,
                            whiteSpace: 'nowrap',
                            fontFamily: 'Poppins,sans-serif',
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            border: `2px solid ${filter === f.key ? '#F9A826' : '#333'}`,
                            background: filter === f.key ? '#F9A826' : '#222',
                            color: filter === f.key ? '#1A0800' : '#999'
                        },
                        children: f.label
                    }, f.key, false, {
                        fileName: "[project]/app/kitchen/page.tsx",
                        lineNumber: 147,
                        columnNumber: 11
                    }, this))
            }, void 0, false, {
                fileName: "[project]/app/kitchen/page.tsx",
                lineNumber: 140,
                columnNumber: 7
            }, this),
            !shown.length && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    textAlign: 'center',
                    padding: '4rem 1rem',
                    color: '#444'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            fontSize: '3rem',
                            marginBottom: '0.5rem'
                        },
                        children: "🎉"
                    }, void 0, false, {
                        fileName: "[project]/app/kitchen/page.tsx",
                        lineNumber: 166,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            fontWeight: 700
                        },
                        children: "All clear! No orders in kitchen."
                    }, void 0, false, {
                        fileName: "[project]/app/kitchen/page.tsx",
                        lineNumber: 167,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/kitchen/page.tsx",
                lineNumber: 165,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    padding: '1rem',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))',
                    gap: '0.85rem'
                },
                children: shown.map((order)=>{
                    const mins = Math.floor((Date.now() - new Date(order.timestamp).getTime()) / 60000);
                    const isUrgent = mins > 25;
                    const isHighPriority = mins > 15 && !isUrgent;
                    // Check if this order's tab has requested the bill
                    const billRequested = tabs.some((t)=>t.orderIds.includes(order.id) && t.tabStatus === 'awaiting_payment');
                    // Check total item quantity
                    const totalItems = (order.items || []).reduce((sum, item)=>sum + item.qty, 0);
                    const isLargeOrder = totalItems > 4;
                    const nextAction = order.status === 'pending' ? {
                        label: '🔥 Start Cooking',
                        bg: '#3b82f6'
                    } : order.status === 'preparing' ? {
                        label: '✅ Mark Ready',
                        bg: '#8b5cf6'
                    } : null;
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            background: '#1e1e1e',
                            borderRadius: 14,
                            overflow: 'hidden',
                            border: `2px solid ${isUrgent ? '#ef4444' : STATUS_COLOR[order.status] || '#333'}`,
                            boxShadow: isUrgent ? '0 0 16px rgba(239,68,68,0.3)' : '0 2px 8px rgba(0,0,0,0.3)'
                        },
                        children: [
                            billRequested && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    background: '#f59e0b',
                                    color: 'white',
                                    padding: '0.22rem 1rem',
                                    fontSize: '0.72rem',
                                    fontWeight: 800,
                                    textAlign: 'center',
                                    letterSpacing: '0.03em'
                                },
                                children: "💳 BILL REQUESTED — Rush!"
                            }, void 0, false, {
                                fileName: "[project]/app/kitchen/page.tsx",
                                lineNumber: 205,
                                columnNumber: 17
                            }, this),
                            isUrgent && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    background: '#ef4444',
                                    color: 'white',
                                    padding: '0.2rem 0.75rem',
                                    fontSize: '0.7rem',
                                    fontWeight: 800,
                                    textAlign: 'center'
                                },
                                children: [
                                    "🔥 URGENT — ",
                                    mins,
                                    "m waiting"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/kitchen/page.tsx",
                                lineNumber: 216,
                                columnNumber: 17
                            }, this),
                            isHighPriority && !isUrgent && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    background: '#f59e0b',
                                    color: 'white',
                                    padding: '0.2rem 0.75rem',
                                    fontSize: '0.7rem',
                                    fontWeight: 800,
                                    textAlign: 'center'
                                },
                                children: [
                                    "⚠️ 15+ MIN — ",
                                    mins,
                                    "m waiting"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/kitchen/page.tsx",
                                lineNumber: 224,
                                columnNumber: 17
                            }, this),
                            isLargeOrder && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    background: '#06b6d4',
                                    color: 'white',
                                    padding: '0.2rem 0.75rem',
                                    fontSize: '0.7rem',
                                    fontWeight: 800,
                                    textAlign: 'center'
                                },
                                children: "📦 LARGE ORDER"
                            }, void 0, false, {
                                fileName: "[project]/app/kitchen/page.tsx",
                                lineNumber: 234,
                                columnNumber: 17
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    padding: '0.75rem 1rem'
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'flex-start',
                                            marginBottom: '0.5rem'
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        style: {
                                                            fontWeight: 900,
                                                            fontSize: '1rem',
                                                            color: '#F9A826'
                                                        },
                                                        children: [
                                                            "#",
                                                            order.orderNum || order.id.slice(-4)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/kitchen/page.tsx",
                                                        lineNumber: 245,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        style: {
                                                            fontSize: '0.72rem',
                                                            color: '#888',
                                                            marginTop: '0.1rem'
                                                        },
                                                        children: [
                                                            order.customerName,
                                                            order.tableId ? ` · Table ${order.tableId}` : ''
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/kitchen/page.tsx",
                                                        lineNumber: 248,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/kitchen/page.tsx",
                                                lineNumber: 244,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    textAlign: 'right'
                                                },
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        style: {
                                                            fontSize: '0.7rem',
                                                            fontWeight: 700,
                                                            padding: '0.15rem 0.55rem',
                                                            borderRadius: 10,
                                                            background: (STATUS_COLOR[order.status] || '#333') + '30',
                                                            color: STATUS_COLOR[order.status] || '#888'
                                                        },
                                                        children: STATUS_LABEL[order.status] || order.status
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/kitchen/page.tsx",
                                                        lineNumber: 253,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        style: {
                                                            fontSize: '0.65rem',
                                                            color: '#555',
                                                            marginTop: '0.2rem'
                                                        },
                                                        children: [
                                                            "⏱ ",
                                                            mins,
                                                            "m"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/kitchen/page.tsx",
                                                        lineNumber: 256,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/kitchen/page.tsx",
                                                lineNumber: 252,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/kitchen/page.tsx",
                                        lineNumber: 243,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            borderTop: '1px solid #2a2a2a',
                                            paddingTop: '0.5rem',
                                            marginBottom: '0.6rem'
                                        },
                                        children: (order.items || []).map((item, i)=>{
                                            const itemStatus = item.itemStatus || 'queued';
                                            const isItemPrepared = itemStatus === 'prepared';
                                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    marginBottom: '0.5rem'
                                                },
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    style: {
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        marginBottom: '0.25rem'
                                                    },
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            style: {
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '0.4rem',
                                                                flex: 1
                                                            },
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    style: {
                                                                        fontWeight: 700,
                                                                        fontSize: '0.82rem',
                                                                        color: '#ccc'
                                                                    },
                                                                    children: item.name
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/kitchen/page.tsx",
                                                                    lineNumber: 270,
                                                                    columnNumber: 29
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    style: {
                                                                        color: '#F9A826',
                                                                        fontWeight: 800,
                                                                        fontSize: '0.75rem'
                                                                    },
                                                                    children: [
                                                                        "×",
                                                                        item.qty
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/kitchen/page.tsx",
                                                                    lineNumber: 271,
                                                                    columnNumber: 29
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/kitchen/page.tsx",
                                                            lineNumber: 269,
                                                            columnNumber: 27
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            style: {
                                                                display: 'flex',
                                                                gap: '0.3rem',
                                                                alignItems: 'center'
                                                            },
                                                            children: [
                                                                itemStatus === 'queued' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            style: {
                                                                                fontSize: '0.65rem',
                                                                                fontWeight: 700,
                                                                                padding: '0.1rem 0.4rem',
                                                                                borderRadius: 6,
                                                                                background: '#66666640',
                                                                                color: '#999'
                                                                            },
                                                                            children: "Queued"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/kitchen/page.tsx",
                                                                            lineNumber: 276,
                                                                            columnNumber: 33
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                            onClick: ()=>advanceItem(order.id, i),
                                                                            style: {
                                                                                ...btn('#3b82f6'),
                                                                                fontSize: '0.65rem',
                                                                                padding: '0.25rem 0.5rem',
                                                                                borderRadius: 6
                                                                            },
                                                                            children: "▶ Start"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/kitchen/page.tsx",
                                                                            lineNumber: 279,
                                                                            columnNumber: 33
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true),
                                                                itemStatus === 'preparing' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            style: {
                                                                                fontSize: '0.65rem',
                                                                                fontWeight: 700,
                                                                                padding: '0.1rem 0.4rem',
                                                                                borderRadius: 6,
                                                                                background: '#3b82f640',
                                                                                color: '#60a5fa'
                                                                            },
                                                                            children: "Cooking"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/kitchen/page.tsx",
                                                                            lineNumber: 289,
                                                                            columnNumber: 33
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                            onClick: ()=>advanceItem(order.id, i),
                                                                            style: {
                                                                                ...btn('#10b981'),
                                                                                fontSize: '0.65rem',
                                                                                padding: '0.25rem 0.5rem',
                                                                                borderRadius: 6
                                                                            },
                                                                            children: "✅ Done"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/kitchen/page.tsx",
                                                                            lineNumber: 292,
                                                                            columnNumber: 33
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true),
                                                                itemStatus === 'prepared' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    style: {
                                                                        fontSize: '0.65rem',
                                                                        fontWeight: 700,
                                                                        padding: '0.1rem 0.4rem',
                                                                        borderRadius: 6,
                                                                        background: '#8b5cf640',
                                                                        color: '#a78bfa'
                                                                    },
                                                                    children: "Ready"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/kitchen/page.tsx",
                                                                    lineNumber: 301,
                                                                    columnNumber: 31
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/kitchen/page.tsx",
                                                            lineNumber: 273,
                                                            columnNumber: 27
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/kitchen/page.tsx",
                                                    lineNumber: 268,
                                                    columnNumber: 25
                                                }, this)
                                            }, i, false, {
                                                fileName: "[project]/app/kitchen/page.tsx",
                                                lineNumber: 267,
                                                columnNumber: 23
                                            }, this);
                                        })
                                    }, void 0, false, {
                                        fileName: "[project]/app/kitchen/page.tsx",
                                        lineNumber: 261,
                                        columnNumber: 17
                                    }, this),
                                    nextAction && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>advanceOrder(order),
                                        style: {
                                            ...btn(nextAction.bg),
                                            width: '100%',
                                            padding: '0.55rem',
                                            borderRadius: 10,
                                            fontSize: '0.82rem'
                                        },
                                        children: nextAction.label
                                    }, void 0, false, {
                                        fileName: "[project]/app/kitchen/page.tsx",
                                        lineNumber: 314,
                                        columnNumber: 19
                                    }, this),
                                    order.status === 'prepared' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            background: '#8b5cf620',
                                            border: '1px solid #8b5cf640',
                                            borderRadius: 10,
                                            padding: '0.45rem',
                                            textAlign: 'center',
                                            fontSize: '0.78rem',
                                            color: '#a78bfa',
                                            fontWeight: 700
                                        },
                                        children: "✅ Ready — Waiting for waiter"
                                    }, void 0, false, {
                                        fileName: "[project]/app/kitchen/page.tsx",
                                        lineNumber: 322,
                                        columnNumber: 19
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/kitchen/page.tsx",
                                lineNumber: 242,
                                columnNumber: 15
                            }, this)
                        ]
                    }, order.id, true, {
                        fileName: "[project]/app/kitchen/page.tsx",
                        lineNumber: 193,
                        columnNumber: 13
                    }, this);
                })
            }, void 0, false, {
                fileName: "[project]/app/kitchen/page.tsx",
                lineNumber: 172,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/kitchen/page.tsx",
        lineNumber: 110,
        columnNumber: 5
    }, this);
}
_s(KitchenPage, "hwBJJCOnczagb+a45Oh/4RsKTQM=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"]
    ];
});
_c = KitchenPage;
var _c;
__turbopack_context__.k.register(_c, "KitchenPage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/node_modules/next/dist/compiled/react/cjs/react-jsx-dev-runtime.development.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
/**
 * @license React
 * react-jsx-dev-runtime.development.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ "use strict";
"production" !== ("TURBOPACK compile-time value", "development") && function() {
    function getComponentNameFromType(type) {
        if (null == type) return null;
        if ("function" === typeof type) return type.$$typeof === REACT_CLIENT_REFERENCE ? null : type.displayName || type.name || null;
        if ("string" === typeof type) return type;
        switch(type){
            case REACT_FRAGMENT_TYPE:
                return "Fragment";
            case REACT_PROFILER_TYPE:
                return "Profiler";
            case REACT_STRICT_MODE_TYPE:
                return "StrictMode";
            case REACT_SUSPENSE_TYPE:
                return "Suspense";
            case REACT_SUSPENSE_LIST_TYPE:
                return "SuspenseList";
            case REACT_ACTIVITY_TYPE:
                return "Activity";
            case REACT_VIEW_TRANSITION_TYPE:
                return "ViewTransition";
        }
        if ("object" === typeof type) switch("number" === typeof type.tag && console.error("Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."), type.$$typeof){
            case REACT_PORTAL_TYPE:
                return "Portal";
            case REACT_CONTEXT_TYPE:
                return type.displayName || "Context";
            case REACT_CONSUMER_TYPE:
                return (type._context.displayName || "Context") + ".Consumer";
            case REACT_FORWARD_REF_TYPE:
                var innerType = type.render;
                type = type.displayName;
                type || (type = innerType.displayName || innerType.name || "", type = "" !== type ? "ForwardRef(" + type + ")" : "ForwardRef");
                return type;
            case REACT_MEMO_TYPE:
                return innerType = type.displayName || null, null !== innerType ? innerType : getComponentNameFromType(type.type) || "Memo";
            case REACT_LAZY_TYPE:
                innerType = type._payload;
                type = type._init;
                try {
                    return getComponentNameFromType(type(innerType));
                } catch (x) {}
        }
        return null;
    }
    function testStringCoercion(value) {
        return "" + value;
    }
    function checkKeyStringCoercion(value) {
        try {
            testStringCoercion(value);
            var JSCompiler_inline_result = !1;
        } catch (e) {
            JSCompiler_inline_result = !0;
        }
        if (JSCompiler_inline_result) {
            JSCompiler_inline_result = console;
            var JSCompiler_temp_const = JSCompiler_inline_result.error;
            var JSCompiler_inline_result$jscomp$0 = "function" === typeof Symbol && Symbol.toStringTag && value[Symbol.toStringTag] || value.constructor.name || "Object";
            JSCompiler_temp_const.call(JSCompiler_inline_result, "The provided key is an unsupported type %s. This value must be coerced to a string before using it here.", JSCompiler_inline_result$jscomp$0);
            return testStringCoercion(value);
        }
    }
    function getTaskName(type) {
        if (type === REACT_FRAGMENT_TYPE) return "<>";
        if ("object" === typeof type && null !== type && type.$$typeof === REACT_LAZY_TYPE) return "<...>";
        try {
            var name = getComponentNameFromType(type);
            return name ? "<" + name + ">" : "<...>";
        } catch (x) {
            return "<...>";
        }
    }
    function getOwner() {
        var dispatcher = ReactSharedInternals.A;
        return null === dispatcher ? null : dispatcher.getOwner();
    }
    function UnknownOwner() {
        return Error("react-stack-top-frame");
    }
    function hasValidKey(config) {
        if (hasOwnProperty.call(config, "key")) {
            var getter = Object.getOwnPropertyDescriptor(config, "key").get;
            if (getter && getter.isReactWarning) return !1;
        }
        return void 0 !== config.key;
    }
    function defineKeyPropWarningGetter(props, displayName) {
        function warnAboutAccessingKey() {
            specialPropKeyWarningShown || (specialPropKeyWarningShown = !0, console.error("%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://react.dev/link/special-props)", displayName));
        }
        warnAboutAccessingKey.isReactWarning = !0;
        Object.defineProperty(props, "key", {
            get: warnAboutAccessingKey,
            configurable: !0
        });
    }
    function elementRefGetterWithDeprecationWarning() {
        var componentName = getComponentNameFromType(this.type);
        didWarnAboutElementRef[componentName] || (didWarnAboutElementRef[componentName] = !0, console.error("Accessing element.ref was removed in React 19. ref is now a regular prop. It will be removed from the JSX Element type in a future release."));
        componentName = this.props.ref;
        return void 0 !== componentName ? componentName : null;
    }
    function ReactElement(type, key, props, owner, debugStack, debugTask) {
        var refProp = props.ref;
        type = {
            $$typeof: REACT_ELEMENT_TYPE,
            type: type,
            key: key,
            props: props,
            _owner: owner
        };
        null !== (void 0 !== refProp ? refProp : null) ? Object.defineProperty(type, "ref", {
            enumerable: !1,
            get: elementRefGetterWithDeprecationWarning
        }) : Object.defineProperty(type, "ref", {
            enumerable: !1,
            value: null
        });
        type._store = {};
        Object.defineProperty(type._store, "validated", {
            configurable: !1,
            enumerable: !1,
            writable: !0,
            value: 0
        });
        Object.defineProperty(type, "_debugInfo", {
            configurable: !1,
            enumerable: !1,
            writable: !0,
            value: null
        });
        Object.defineProperty(type, "_debugStack", {
            configurable: !1,
            enumerable: !1,
            writable: !0,
            value: debugStack
        });
        Object.defineProperty(type, "_debugTask", {
            configurable: !1,
            enumerable: !1,
            writable: !0,
            value: debugTask
        });
        Object.freeze && (Object.freeze(type.props), Object.freeze(type));
        return type;
    }
    function jsxDEVImpl(type, config, maybeKey, isStaticChildren, debugStack, debugTask) {
        var children = config.children;
        if (void 0 !== children) if (isStaticChildren) if (isArrayImpl(children)) {
            for(isStaticChildren = 0; isStaticChildren < children.length; isStaticChildren++)validateChildKeys(children[isStaticChildren]);
            Object.freeze && Object.freeze(children);
        } else console.error("React.jsx: Static children should always be an array. You are likely explicitly calling React.jsxs or React.jsxDEV. Use the Babel transform instead.");
        else validateChildKeys(children);
        if (hasOwnProperty.call(config, "key")) {
            children = getComponentNameFromType(type);
            var keys = Object.keys(config).filter(function(k) {
                return "key" !== k;
            });
            isStaticChildren = 0 < keys.length ? "{key: someKey, " + keys.join(": ..., ") + ": ...}" : "{key: someKey}";
            didWarnAboutKeySpread[children + isStaticChildren] || (keys = 0 < keys.length ? "{" + keys.join(": ..., ") + ": ...}" : "{}", console.error('A props object containing a "key" prop is being spread into JSX:\n  let props = %s;\n  <%s {...props} />\nReact keys must be passed directly to JSX without using spread:\n  let props = %s;\n  <%s key={someKey} {...props} />', isStaticChildren, children, keys, children), didWarnAboutKeySpread[children + isStaticChildren] = !0);
        }
        children = null;
        void 0 !== maybeKey && (checkKeyStringCoercion(maybeKey), children = "" + maybeKey);
        hasValidKey(config) && (checkKeyStringCoercion(config.key), children = "" + config.key);
        if ("key" in config) {
            maybeKey = {};
            for(var propName in config)"key" !== propName && (maybeKey[propName] = config[propName]);
        } else maybeKey = config;
        children && defineKeyPropWarningGetter(maybeKey, "function" === typeof type ? type.displayName || type.name || "Unknown" : type);
        return ReactElement(type, children, maybeKey, getOwner(), debugStack, debugTask);
    }
    function validateChildKeys(node) {
        isValidElement(node) ? node._store && (node._store.validated = 1) : "object" === typeof node && null !== node && node.$$typeof === REACT_LAZY_TYPE && ("fulfilled" === node._payload.status ? isValidElement(node._payload.value) && node._payload.value._store && (node._payload.value._store.validated = 1) : node._store && (node._store.validated = 1));
    }
    function isValidElement(object) {
        return "object" === typeof object && null !== object && object.$$typeof === REACT_ELEMENT_TYPE;
    }
    var React = __turbopack_context__.r("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)"), REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"), REACT_PORTAL_TYPE = Symbol.for("react.portal"), REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"), REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"), REACT_PROFILER_TYPE = Symbol.for("react.profiler"), REACT_CONSUMER_TYPE = Symbol.for("react.consumer"), REACT_CONTEXT_TYPE = Symbol.for("react.context"), REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"), REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"), REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list"), REACT_MEMO_TYPE = Symbol.for("react.memo"), REACT_LAZY_TYPE = Symbol.for("react.lazy"), REACT_ACTIVITY_TYPE = Symbol.for("react.activity"), REACT_VIEW_TRANSITION_TYPE = Symbol.for("react.view_transition"), REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference"), ReactSharedInternals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, hasOwnProperty = Object.prototype.hasOwnProperty, isArrayImpl = Array.isArray, createTask = console.createTask ? console.createTask : function() {
        return null;
    };
    React = {
        react_stack_bottom_frame: function(callStackForError) {
            return callStackForError();
        }
    };
    var specialPropKeyWarningShown;
    var didWarnAboutElementRef = {};
    var unknownOwnerDebugStack = React.react_stack_bottom_frame.bind(React, UnknownOwner)();
    var unknownOwnerDebugTask = createTask(getTaskName(UnknownOwner));
    var didWarnAboutKeySpread = {};
    exports.Fragment = REACT_FRAGMENT_TYPE;
    exports.jsxDEV = function(type, config, maybeKey, isStaticChildren) {
        var trackActualOwner = 1e4 > ReactSharedInternals.recentlyCreatedOwnerStacks++;
        if (trackActualOwner) {
            var previousStackTraceLimit = Error.stackTraceLimit;
            Error.stackTraceLimit = 10;
            var debugStackDEV = Error("react-stack-top-frame");
            Error.stackTraceLimit = previousStackTraceLimit;
        } else debugStackDEV = unknownOwnerDebugStack;
        return jsxDEVImpl(type, config, maybeKey, isStaticChildren, debugStackDEV, trackActualOwner ? createTask(getTaskName(type)) : unknownOwnerDebugTask);
    };
}();
}),
"[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
'use strict';
if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
;
else {
    module.exports = __turbopack_context__.r("[project]/node_modules/next/dist/compiled/react/cjs/react-jsx-dev-runtime.development.js [app-client] (ecmascript)");
}
}),
"[project]/node_modules/next/navigation.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {

module.exports = __turbopack_context__.r("[project]/node_modules/next/dist/client/components/navigation.js [app-client] (ecmascript)");
}),
]);

//# sourceMappingURL=_775418cd._.js.map