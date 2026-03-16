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
"[project]/app/admin/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>AdminPage
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
// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_FLOW = [
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
    // ── Auth ──
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const [authSession, setAuthSession] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [authChecked, setAuthChecked] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [section, setSection] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('overview');
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
    // ── Analytics state ──
    const [waiterStats, setWaiterStats] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [tableOccupancy, setTableOccupancy] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [onlineStats, setOnlineStats] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    // ── WhatsApp setting ──
    const [waNum, setWaNum] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [waNumMsg, setWaNumMsg] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
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
            setSecSetup((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getSecuritySetup"])());
            setWaiterStats((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getWaiterStats"])());
            setTableOccupancy((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getTableOccupancyStats"])());
            setOnlineStats((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getOnlineOrderStats"])());
            setWaNum((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getWhatsappNumber"])());
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
    function adminLogout() {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clearSession"])('admin');
        router.replace('/admin/login');
    }
    // ─── Today stats ──────────────────────────────────────────────────────────
    const todayStr = new Date().toDateString();
    const todayOrders = orders.filter((o)=>new Date(o.timestamp).toDateString() === todayStr && o.status !== 'cancelled');
    const todayRevenue = todayOrders.reduce((s, o)=>s + (o.total || 0), 0);
    const todayDiscount = todayOrders.reduce((s, o)=>s + (o.discount || 0), 0);
    const todayCancel = orders.filter((o)=>o.status === 'cancelled' && new Date(o.timestamp).toDateString() === todayStr);
    const activeTables = tables.filter((t)=>t.status === 'occupied').length;
    const pendingCount = orders.filter((o)=>o.status === 'pending').length;
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
            const nid = `M${Date.now()}`;
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
    const cancelledOrders = orders.filter((o)=>o.status === 'cancelled').sort((a, b)=>new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
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
            lineNumber: 270,
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
    function saveWaNumFn() {
        const digits = waNum.replace(/\D/g, '');
        if (digits.length < 10) {
            setWaNumMsg('❌ Enter a valid number (min 10 digits with country code)');
            return;
        }
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["saveWhatsappNumber"])(digits);
        setWaNumMsg('✅ WhatsApp number saved!');
        setTimeout(()=>setWaNumMsg(''), 3000);
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
                        lineNumber: 340,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: "Loading Admin Dashboard…"
                    }, void 0, false, {
                        fileName: "[project]/app/admin/page.tsx",
                        lineNumber: 341,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/admin/page.tsx",
                lineNumber: 339,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/app/admin/page.tsx",
            lineNumber: 338,
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
                                lineNumber: 353,
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
                                        lineNumber: 355,
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
                                        lineNumber: 356,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 354,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/admin/page.tsx",
                        lineNumber: 352,
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
                                lineNumber: 360,
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
                                lineNumber: 361,
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
                                lineNumber: 362,
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
                                        lineNumber: 364,
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
                                        lineNumber: 365,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 363,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/admin/page.tsx",
                        lineNumber: 359,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/admin/page.tsx",
                lineNumber: 351,
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
                        lineNumber: 372,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(NavBtn, {
                        id: "orders",
                        label: "🧾 Orders"
                    }, void 0, false, {
                        fileName: "[project]/app/admin/page.tsx",
                        lineNumber: 373,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(NavBtn, {
                        id: "sales",
                        label: "📊 Sales Report"
                    }, void 0, false, {
                        fileName: "[project]/app/admin/page.tsx",
                        lineNumber: 374,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(NavBtn, {
                        id: "menu",
                        label: "🍽️ Menu Management"
                    }, void 0, false, {
                        fileName: "[project]/app/admin/page.tsx",
                        lineNumber: 375,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(NavBtn, {
                        id: "fraud",
                        label: "🔍 Transparency"
                    }, void 0, false, {
                        fileName: "[project]/app/admin/page.tsx",
                        lineNumber: 376,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(NavBtn, {
                        id: "staff",
                        label: "👥 Staff"
                    }, void 0, false, {
                        fileName: "[project]/app/admin/page.tsx",
                        lineNumber: 377,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/admin/page.tsx",
                lineNumber: 371,
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
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    color: '#888',
                                    textTransform: 'uppercase',
                                    letterSpacing: 1,
                                    marginBottom: '0.5rem'
                                },
                                children: "🍽️ Dine-In & General"
                            }, void 0, false, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 385,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill,minmax(165px,1fr))',
                                    gap: '1rem',
                                    marginBottom: '1.25rem'
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
                                        label: 'Pending Orders',
                                        color: '#f59e0b'
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
                                                lineNumber: 396,
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
                                                lineNumber: 397,
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
                                                lineNumber: 398,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, s.label, true, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 395,
                                        columnNumber: 15
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 386,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    color: '#888',
                                    textTransform: 'uppercase',
                                    letterSpacing: 1,
                                    marginBottom: '0.5rem'
                                },
                                children: "📦 Online Orders (Today)"
                            }, void 0, false, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 404,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill,minmax(165px,1fr))',
                                    gap: '1rem',
                                    marginBottom: '1.5rem'
                                },
                                children: [
                                    {
                                        icon: '📦',
                                        val: onlineStats?.todayTotal ?? 0,
                                        label: 'Online Orders Today',
                                        color: '#2563eb'
                                    },
                                    {
                                        icon: '🏪',
                                        val: onlineStats?.todayPickup ?? 0,
                                        label: 'Pickup Orders',
                                        color: '#0891b2'
                                    },
                                    {
                                        icon: '🚗',
                                        val: onlineStats?.todayDelivery ?? 0,
                                        label: 'Delivery Orders',
                                        color: '#7c3aed'
                                    },
                                    {
                                        icon: '💵',
                                        val: `₹${onlineStats?.todayRevenue ?? 0}`,
                                        label: 'Online Revenue',
                                        color: '#16a34a'
                                    },
                                    {
                                        icon: '⏳',
                                        val: onlineStats?.pendingOnline ?? 0,
                                        label: 'Pending Online',
                                        color: '#f59e0b'
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
                                                lineNumber: 414,
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
                                                lineNumber: 415,
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
                                                lineNumber: 416,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, s.label, true, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 413,
                                        columnNumber: 15
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 405,
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
                                        lineNumber: 423,
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
                                                        lineNumber: 431,
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
                                                        lineNumber: 432,
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
                                                        lineNumber: 433,
                                                        columnNumber: 65
                                                    }, this)
                                                ]
                                            }, t.id, true, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 430,
                                                columnNumber: 19
                                            }, this);
                                        })
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 424,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 422,
                                columnNumber: 11
                            }, this),
                            (()=>{
                                const eod = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getEndOfDayReport"])();
                                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: card('#16a34a'),
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                            style: {
                                                fontFamily: "'Playfair Display',serif",
                                                fontSize: '1.05rem',
                                                fontWeight: 700,
                                                marginBottom: '0.85rem',
                                                color: '#1A0800'
                                            },
                                            children: "📊 End-of-Day Report — Today"
                                        }, void 0, false, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 445,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))',
                                                gap: '0.7rem',
                                                marginBottom: '0.75rem'
                                            },
                                            children: [
                                                {
                                                    icon: '🧾',
                                                    val: eod.totalOrders,
                                                    label: 'Orders Completed',
                                                    color: '#16a34a'
                                                },
                                                {
                                                    icon: '💰',
                                                    val: `₹${eod.totalRevenue}`,
                                                    label: 'Total Revenue',
                                                    color: '#E65C00'
                                                },
                                                {
                                                    icon: '📊',
                                                    val: `₹${eod.avgOrderValue}`,
                                                    label: 'Avg Order Value',
                                                    color: '#8b5cf6'
                                                },
                                                {
                                                    icon: '✅',
                                                    val: eod.completedTabs,
                                                    label: 'Closed Tabs',
                                                    color: '#3b82f6'
                                                },
                                                {
                                                    icon: '🏷️',
                                                    val: `₹${eod.discountsTotal}`,
                                                    label: 'Discounts',
                                                    color: '#f59e0b'
                                                },
                                                {
                                                    icon: '🚫',
                                                    val: eod.voidedOrders,
                                                    label: 'Voided Orders',
                                                    color: '#ef4444'
                                                }
                                            ].map((s)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    style: {
                                                        background: 'white',
                                                        border: `1px solid ${s.color}30`,
                                                        borderRadius: 10,
                                                        padding: '0.75rem',
                                                        textAlign: 'center',
                                                        borderLeft: `3px solid ${s.color}`
                                                    },
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            style: {
                                                                fontSize: '1.1rem',
                                                                marginBottom: '0.15rem'
                                                            },
                                                            children: s.icon
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/admin/page.tsx",
                                                            lineNumber: 456,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            style: {
                                                                fontSize: '1.1rem',
                                                                fontWeight: 900,
                                                                color: s.color
                                                            },
                                                            children: s.val
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/admin/page.tsx",
                                                            lineNumber: 457,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            style: {
                                                                fontSize: '0.62rem',
                                                                color: '#999'
                                                            },
                                                            children: s.label
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/admin/page.tsx",
                                                            lineNumber: 458,
                                                            columnNumber: 23
                                                        }, this)
                                                    ]
                                                }, s.label, true, {
                                                    fileName: "[project]/app/admin/page.tsx",
                                                    lineNumber: 455,
                                                    columnNumber: 21
                                                }, this))
                                        }, void 0, false, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 446,
                                            columnNumber: 17
                                        }, this),
                                        eod.topItems.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    style: {
                                                        fontSize: '0.78rem',
                                                        fontWeight: 700,
                                                        color: '#16a34a',
                                                        marginBottom: '0.35rem'
                                                    },
                                                    children: "🏆 Today's Top Items"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/admin/page.tsx",
                                                    lineNumber: 464,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    style: {
                                                        display: 'flex',
                                                        gap: '0.4rem',
                                                        flexWrap: 'wrap'
                                                    },
                                                    children: eod.topItems.map((item, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            style: {
                                                                background: '#f0fdf4',
                                                                borderRadius: 20,
                                                                padding: '0.2rem 0.7rem',
                                                                fontSize: '0.75rem',
                                                                color: '#064e3b',
                                                                fontWeight: 600
                                                            },
                                                            children: [
                                                                item.name,
                                                                " ",
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    style: {
                                                                        color: '#E65C00',
                                                                        fontWeight: 700
                                                                    },
                                                                    children: [
                                                                        "×",
                                                                        item.qty
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/admin/page.tsx",
                                                                    lineNumber: 468,
                                                                    columnNumber: 39
                                                                }, this)
                                                            ]
                                                        }, i, true, {
                                                            fileName: "[project]/app/admin/page.tsx",
                                                            lineNumber: 467,
                                                            columnNumber: 25
                                                        }, this))
                                                }, void 0, false, {
                                                    fileName: "[project]/app/admin/page.tsx",
                                                    lineNumber: 465,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 463,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/admin/page.tsx",
                                    lineNumber: 444,
                                    columnNumber: 15
                                }, this);
                            })(),
                            tableOccupancy.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: card('#3b82f6'),
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                        style: {
                                            fontFamily: "'Playfair Display',serif",
                                            fontSize: '1.05rem',
                                            fontWeight: 700,
                                            marginBottom: '0.75rem',
                                            color: '#1A0800'
                                        },
                                        children: "🪑 Table Occupancy Analytics"
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 481,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            overflowX: 'auto'
                                        },
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                                            style: {
                                                width: '100%',
                                                borderCollapse: 'collapse',
                                                fontSize: '0.82rem'
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                        style: {
                                                            background: '#eff6ff'
                                                        },
                                                        children: [
                                                            'Table',
                                                            'Sessions',
                                                            'Avg Time',
                                                            'Revenue',
                                                            'Last Used'
                                                        ].map((h)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                style: {
                                                                    padding: '0.48rem 0.75rem',
                                                                    textAlign: 'left',
                                                                    fontSize: '0.7rem',
                                                                    fontWeight: 700,
                                                                    color: '#1d4ed8',
                                                                    textTransform: 'uppercase'
                                                                },
                                                                children: h
                                                            }, h, false, {
                                                                fileName: "[project]/app/admin/page.tsx",
                                                                lineNumber: 486,
                                                                columnNumber: 23
                                                            }, this))
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 484,
                                                        columnNumber: 26
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/app/admin/page.tsx",
                                                    lineNumber: 484,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                                    children: tableOccupancy.slice(0, 10).map((t, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                            style: {
                                                                borderBottom: '1px solid #dbeafe',
                                                                background: i % 2 ? '#f0f9ff' : 'white'
                                                            },
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    style: {
                                                                        padding: '0.48rem 0.75rem',
                                                                        fontWeight: 700,
                                                                        color: '#1A0800'
                                                                    },
                                                                    children: t.tableId
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/admin/page.tsx",
                                                                    lineNumber: 492,
                                                                    columnNumber: 25
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    style: {
                                                                        padding: '0.48rem 0.75rem',
                                                                        fontWeight: 700,
                                                                        color: '#3b82f6'
                                                                    },
                                                                    children: t.totalSessions
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/admin/page.tsx",
                                                                    lineNumber: 493,
                                                                    columnNumber: 25
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    style: {
                                                                        padding: '0.48rem 0.75rem'
                                                                    },
                                                                    children: [
                                                                        t.avgMinutes,
                                                                        " min"
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/admin/page.tsx",
                                                                    lineNumber: 494,
                                                                    columnNumber: 25
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    style: {
                                                                        padding: '0.48rem 0.75rem',
                                                                        fontWeight: 700,
                                                                        color: '#16a34a'
                                                                    },
                                                                    children: [
                                                                        "₹",
                                                                        t.totalRevenue
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/admin/page.tsx",
                                                                    lineNumber: 495,
                                                                    columnNumber: 25
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    style: {
                                                                        padding: '0.48rem 0.75rem',
                                                                        color: '#888',
                                                                        fontSize: '0.75rem'
                                                                    },
                                                                    children: t.lastUsed ? new Date(t.lastUsed).toLocaleDateString('en-IN') : '—'
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/admin/page.tsx",
                                                                    lineNumber: 496,
                                                                    columnNumber: 25
                                                                }, this)
                                                            ]
                                                        }, t.tableId, true, {
                                                            fileName: "[project]/app/admin/page.tsx",
                                                            lineNumber: 491,
                                                            columnNumber: 23
                                                        }, this))
                                                }, void 0, false, {
                                                    fileName: "[project]/app/admin/page.tsx",
                                                    lineNumber: 489,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 483,
                                            columnNumber: 17
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 482,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 480,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: card(),
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                        style: {
                                            fontFamily: "'Playfair Display',serif",
                                            fontSize: '1.05rem',
                                            fontWeight: 700,
                                            marginBottom: '0.85rem',
                                            color: '#1A0800'
                                        },
                                        children: "👥 Staff Pages"
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 507,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            display: 'flex',
                                            gap: '0.65rem',
                                            flexWrap: 'wrap'
                                        },
                                        children: [
                                            {
                                                href: '/kitchen',
                                                label: '🔥 Kitchen',
                                                color: 'linear-gradient(135deg,#E65C00,#F9A826)'
                                            },
                                            {
                                                href: '/waiter',
                                                label: '🧑‍🍳 Waiter',
                                                color: 'linear-gradient(135deg,#E65C00,#F9A826)'
                                            },
                                            {
                                                href: '/manager',
                                                label: '💳 Manager Counter',
                                                color: 'linear-gradient(135deg,#064e3b,#16a34a)'
                                            },
                                            {
                                                href: '/table?table=T01',
                                                label: '📱 Table Ordering',
                                                color: 'linear-gradient(135deg,#E65C00,#F9A826)'
                                            },
                                            {
                                                href: '/',
                                                label: '🛍️ Customer Menu',
                                                color: 'linear-gradient(135deg,#E65C00,#F9A826)'
                                            },
                                            {
                                                href: '/qr',
                                                label: '📱 QR Generator',
                                                color: 'linear-gradient(135deg,#3b82f6,#1d4ed8)'
                                            }
                                        ].map((l)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                href: l.href,
                                                style: {
                                                    padding: '0.55rem 1.1rem',
                                                    background: l.color,
                                                    color: 'white',
                                                    borderRadius: 8,
                                                    fontWeight: 700,
                                                    textDecoration: 'none',
                                                    fontSize: '0.84rem'
                                                },
                                                children: l.label
                                            }, l.href, false, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 517,
                                                columnNumber: 17
                                            }, this))
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 508,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 506,
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
                                        lineNumber: 527,
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
                                                    textTransform: 'capitalize'
                                                },
                                                children: s
                                            }, s, false, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 530,
                                                columnNumber: 19
                                            }, this))
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 528,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 526,
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
                                                        lineNumber: 538,
                                                        columnNumber: 21
                                                    }, this))
                                            }, void 0, false, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 536,
                                                columnNumber: 24
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 536,
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
                                                    lineNumber: 543,
                                                    columnNumber: 27
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 543,
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
                                                                children: order.id
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/admin/page.tsx",
                                                                lineNumber: 551,
                                                                columnNumber: 68
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/admin/page.tsx",
                                                            lineNumber: 551,
                                                            columnNumber: 29
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            style: {
                                                                padding: '0.5rem 0.65rem'
                                                            },
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    style: {
                                                                        fontSize: '0.7rem',
                                                                        fontWeight: 700,
                                                                        padding: '0.12rem 0.45rem',
                                                                        borderRadius: 10,
                                                                        background: order.type === 'dine-in' ? '#fff7ed' : order.type === 'delivery' ? '#f5f3ff' : '#f0fdf4',
                                                                        color: order.type === 'dine-in' ? '#ea580c' : order.type === 'delivery' ? '#7c3aed' : '#16a34a'
                                                                    },
                                                                    children: order.type === 'dine-in' ? '🍽️ Dine-In' : order.type === 'delivery' ? '🚗 Delivery' : '🏪 Pickup'
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/admin/page.tsx",
                                                                    lineNumber: 553,
                                                                    columnNumber: 31
                                                                }, this),
                                                                order.source === 'online' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    style: {
                                                                        marginLeft: '0.25rem',
                                                                        fontSize: '0.62rem',
                                                                        fontWeight: 700,
                                                                        background: '#dbeafe',
                                                                        color: '#1d4ed8',
                                                                        padding: '0.1rem 0.35rem',
                                                                        borderRadius: 6
                                                                    },
                                                                    children: "ONLINE"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/admin/page.tsx",
                                                                    lineNumber: 556,
                                                                    columnNumber: 59
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/admin/page.tsx",
                                                            lineNumber: 552,
                                                            columnNumber: 29
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            style: {
                                                                padding: '0.5rem 0.65rem',
                                                                fontSize: '0.8rem'
                                                            },
                                                            children: order.type === 'dine-in' ? `Table ${order.tableId}` : order.deliveryAddress ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                title: order.deliveryAddress,
                                                                children: [
                                                                    "📍 ",
                                                                    order.deliveryAddress.slice(0, 22),
                                                                    order.deliveryAddress.length > 22 ? '…' : ''
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/admin/page.tsx",
                                                                lineNumber: 559,
                                                                columnNumber: 102
                                                            }, this) : '—'
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/admin/page.tsx",
                                                            lineNumber: 558,
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
                                                            lineNumber: 561,
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
                                                            lineNumber: 562,
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
                                                            lineNumber: 563,
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
                                                            lineNumber: 564,
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
                                                            lineNumber: 565,
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
                                                            lineNumber: 566,
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
                                                                lineNumber: 567,
                                                                columnNumber: 68
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/admin/page.tsx",
                                                            lineNumber: 567,
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
                                                            lineNumber: 568,
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
                                                                    lineNumber: 570,
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
                                                                    lineNumber: 571,
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
                                                                    lineNumber: 572,
                                                                    columnNumber: 38
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/admin/page.tsx",
                                                            lineNumber: 569,
                                                            columnNumber: 29
                                                        }, this)
                                                    ]
                                                }, order.id, true, {
                                                    fileName: "[project]/app/admin/page.tsx",
                                                    lineNumber: 550,
                                                    columnNumber: 27
                                                }, this);
                                            })
                                        }, void 0, false, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 541,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/admin/page.tsx",
                                    lineNumber: 535,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 534,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/admin/page.tsx",
                        lineNumber: 525,
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
                                                lineNumber: 589,
                                                columnNumber: 17
                                            }, this))
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 587,
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
                                        lineNumber: 594,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 586,
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
                                        label: '🍽️ Dine-In',
                                        color: '#f97316'
                                    },
                                    {
                                        val: periodOrders.filter((o)=>o.type === 'pickup').length,
                                        label: '🏪 Pickup',
                                        color: '#06b6d4'
                                    },
                                    {
                                        val: periodOrders.filter((o)=>o.type === 'delivery').length,
                                        label: '🚗 Delivery',
                                        color: '#7c3aed'
                                    },
                                    {
                                        val: periodOrders.filter((o)=>o.source === 'online').length,
                                        label: '📦 Online',
                                        color: '#2563eb'
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
                                                lineNumber: 601,
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
                                                lineNumber: 602,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, c.label, true, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 600,
                                        columnNumber: 15
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 598,
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
                                        lineNumber: 609,
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
                                            lineNumber: 612,
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
                                                        lineNumber: 615,
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
                                                        lineNumber: 616,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, method, true, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 614,
                                                columnNumber: 19
                                            }, this))
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 610,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 608,
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
                                        lineNumber: 625,
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
                                                                lineNumber: 631,
                                                                columnNumber: 73
                                                            }, this))
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 630,
                                                        columnNumber: 24
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/app/admin/page.tsx",
                                                    lineNumber: 630,
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
                                                            lineNumber: 635,
                                                            columnNumber: 27
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 635,
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
                                                                    lineNumber: 638,
                                                                    columnNumber: 27
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    style: {
                                                                        padding: '0.5rem 0.8rem'
                                                                    },
                                                                    children: r.orders
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/admin/page.tsx",
                                                                    lineNumber: 639,
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
                                                                    lineNumber: 640,
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
                                                                    lineNumber: 641,
                                                                    columnNumber: 27
                                                                }, this)
                                                            ]
                                                        }, i, true, {
                                                            fileName: "[project]/app/admin/page.tsx",
                                                            lineNumber: 637,
                                                            columnNumber: 25
                                                        }, this))
                                                }, void 0, false, {
                                                    fileName: "[project]/app/admin/page.tsx",
                                                    lineNumber: 633,
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
                                                                lineNumber: 647,
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
                                                                lineNumber: 648,
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
                                                                lineNumber: 649,
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
                                                                lineNumber: 650,
                                                                columnNumber: 19
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 646,
                                                        columnNumber: 24
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/app/admin/page.tsx",
                                                    lineNumber: 646,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 629,
                                            columnNumber: 15
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 628,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 624,
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
                                        lineNumber: 659,
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
                                                                lineNumber: 664,
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
                                                                lineNumber: 665,
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
                                                                lineNumber: 666,
                                                                columnNumber: 23
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 663,
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
                                                                lineNumber: 668,
                                                                columnNumber: 114
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 668,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, name, true, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 662,
                                                columnNumber: 19
                                            }, this))
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 660,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 658,
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
                                                lineNumber: 681,
                                                columnNumber: 17
                                            }, this))
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 679,
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
                                                lineNumber: 685,
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
                                                        lineNumber: 686,
                                                        columnNumber: 161
                                                    }, this),
                                                    " Add Item"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 686,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 684,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 678,
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
                                lineNumber: 691,
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
                                                        lineNumber: 696,
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
                                                        lineNumber: 698,
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
                                                        lineNumber: 699,
                                                        columnNumber: 50
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 695,
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
                                                        lineNumber: 702,
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
                                                                lineNumber: 704,
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
                                                                lineNumber: 705,
                                                                columnNumber: 25
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 703,
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
                                                        lineNumber: 707,
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
                                                                lineNumber: 709,
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
                                                                lineNumber: 710,
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
                                                                lineNumber: 711,
                                                                columnNumber: 25
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 708,
                                                        columnNumber: 23
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 701,
                                                columnNumber: 21
                                            }, this)
                                        ]
                                    }, item.id, true, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 694,
                                        columnNumber: 19
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 692,
                                columnNumber: 15
                            }, this)
                        ]
                    }, void 0, true),
                    section === 'fraud' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                        children: [
                            alerts.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
                                        children: "🚨 Active Alerts"
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 724,
                                        columnNumber: 15
                                    }, this),
                                    alerts.map((a, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                color: '#7f1d1d',
                                                fontSize: '0.85rem',
                                                padding: '0.25rem 0',
                                                borderBottom: '1px solid #fecaca'
                                            },
                                            children: a
                                        }, i, false, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 725,
                                            columnNumber: 34
                                        }, this))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 723,
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
                                                lineNumber: 732,
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
                                                lineNumber: 733,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, c.label, true, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 731,
                                        columnNumber: 15
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 729,
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
                                        lineNumber: 740,
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
                                                                lineNumber: 746,
                                                                columnNumber: 107
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
                                                                        lineNumber: 754,
                                                                        columnNumber: 68
                                                                    }, this)
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/admin/page.tsx",
                                                                    lineNumber: 754,
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
                                                                    lineNumber: 755,
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
                                                                    lineNumber: 756,
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
                                                                    lineNumber: 757,
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
                                                                    lineNumber: 758,
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
                                                                        lineNumber: 759,
                                                                        columnNumber: 68
                                                                    }, this)
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/admin/page.tsx",
                                                                    lineNumber: 759,
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
                                                                    lineNumber: 760,
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
                                                                        lineNumber: 761,
                                                                        columnNumber: 68
                                                                    }, this)
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/admin/page.tsx",
                                                                    lineNumber: 761,
                                                                    columnNumber: 29
                                                                }, this)
                                                            ]
                                                        }, o.id, true, {
                                                            fileName: "[project]/app/admin/page.tsx",
                                                            lineNumber: 753,
                                                            columnNumber: 27
                                                        }, this);
                                                    })
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
                                        lineNumber: 773,
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
                                        lineNumber: 775,
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
                                                                lineNumber: 779,
                                                                columnNumber: 92
                                                            }, this))
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 778,
                                                        columnNumber: 28
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/app/admin/page.tsx",
                                                    lineNumber: 778,
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
                                                                        lineNumber: 784,
                                                                        columnNumber: 66
                                                                    }, this)
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/admin/page.tsx",
                                                                    lineNumber: 784,
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
                                                                    lineNumber: 785,
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
                                                                    lineNumber: 786,
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
                                                                    lineNumber: 787,
                                                                    columnNumber: 27
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    style: {
                                                                        padding: '0.48rem 0.7rem',
                                                                        color: '#888'
                                                                    },
                                                                    children: new Date(o.timestamp).toLocaleString()
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/admin/page.tsx",
                                                                    lineNumber: 788,
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
                                                                    lineNumber: 789,
                                                                    columnNumber: 27
                                                                }, this)
                                                            ]
                                                        }, o.id, true, {
                                                            fileName: "[project]/app/admin/page.tsx",
                                                            lineNumber: 783,
                                                            columnNumber: 25
                                                        }, this))
                                                }, void 0, false, {
                                                    fileName: "[project]/app/admin/page.tsx",
                                                    lineNumber: 781,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 777,
                                            columnNumber: 19
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 776,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 772,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: card('#06b6d4'),
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        style: {
                                            fontFamily: "'Playfair Display',serif",
                                            fontSize: '0.98rem',
                                            fontWeight: 700,
                                            marginBottom: '0.75rem',
                                            color: '#1A0800'
                                        },
                                        children: "👤 Staff Accountability — Today"
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 800,
                                        columnNumber: 13
                                    }, this),
                                    !waiterStats.length ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            color: '#999',
                                            fontSize: '0.85rem'
                                        },
                                        children: "No waiter activity recorded today."
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 802,
                                        columnNumber: 17
                                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            overflowX: 'auto'
                                        },
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                                            style: {
                                                width: '100%',
                                                borderCollapse: 'collapse',
                                                fontSize: '0.82rem'
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                        style: {
                                                            background: '#ecfeff'
                                                        },
                                                        children: [
                                                            'Waiter',
                                                            'Accepted',
                                                            'Cancelled',
                                                            'Served',
                                                            'Cancel Rate'
                                                        ].map((h)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                style: {
                                                                    padding: '0.48rem 0.75rem',
                                                                    textAlign: 'left',
                                                                    fontSize: '0.7rem',
                                                                    fontWeight: 700,
                                                                    color: '#0e7490',
                                                                    textTransform: 'uppercase'
                                                                },
                                                                children: h
                                                            }, h, false, {
                                                                fileName: "[project]/app/admin/page.tsx",
                                                                lineNumber: 807,
                                                                columnNumber: 25
                                                            }, this))
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 805,
                                                        columnNumber: 28
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/app/admin/page.tsx",
                                                    lineNumber: 805,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                                    children: waiterStats.map((s, i)=>{
                                                        const isFlagged = s.cancellationRate > 20;
                                                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                            style: {
                                                                borderBottom: '1px solid #cffafe',
                                                                background: isFlagged ? '#fef2f2' : i % 2 ? '#f0fdfe' : 'white'
                                                            },
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    style: {
                                                                        padding: '0.48rem 0.75rem',
                                                                        fontWeight: 700,
                                                                        color: '#1A0800'
                                                                    },
                                                                    children: [
                                                                        s.name,
                                                                        isFlagged && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                            style: {
                                                                                marginLeft: '0.3rem',
                                                                                color: '#ef4444',
                                                                                fontSize: '0.7rem'
                                                                            },
                                                                            children: "⚠️ High"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/admin/page.tsx",
                                                                            lineNumber: 815,
                                                                            columnNumber: 120
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/admin/page.tsx",
                                                                    lineNumber: 815,
                                                                    columnNumber: 29
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    style: {
                                                                        padding: '0.48rem 0.75rem',
                                                                        fontWeight: 700,
                                                                        color: '#16a34a'
                                                                    },
                                                                    children: s.ordersAccepted
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/admin/page.tsx",
                                                                    lineNumber: 816,
                                                                    columnNumber: 29
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    style: {
                                                                        padding: '0.48rem 0.75rem',
                                                                        fontWeight: 700,
                                                                        color: s.ordersCancelled > 0 ? '#ef4444' : '#9ca3af'
                                                                    },
                                                                    children: s.ordersCancelled
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/admin/page.tsx",
                                                                    lineNumber: 817,
                                                                    columnNumber: 29
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    style: {
                                                                        padding: '0.48rem 0.75rem',
                                                                        fontWeight: 700,
                                                                        color: '#06b6d4'
                                                                    },
                                                                    children: s.ordersServed
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/admin/page.tsx",
                                                                    lineNumber: 818,
                                                                    columnNumber: 29
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    style: {
                                                                        padding: '0.48rem 0.75rem'
                                                                    },
                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        style: {
                                                                            fontWeight: 700,
                                                                            color: s.cancellationRate > 20 ? '#ef4444' : s.cancellationRate > 10 ? '#f59e0b' : '#16a34a'
                                                                        },
                                                                        children: [
                                                                            s.cancellationRate,
                                                                            "%"
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/app/admin/page.tsx",
                                                                        lineNumber: 820,
                                                                        columnNumber: 31
                                                                    }, this)
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/admin/page.tsx",
                                                                    lineNumber: 819,
                                                                    columnNumber: 29
                                                                }, this)
                                                            ]
                                                        }, s.name, true, {
                                                            fileName: "[project]/app/admin/page.tsx",
                                                            lineNumber: 814,
                                                            columnNumber: 27
                                                        }, this);
                                                    })
                                                }, void 0, false, {
                                                    fileName: "[project]/app/admin/page.tsx",
                                                    lineNumber: 810,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 804,
                                            columnNumber: 19
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 803,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 799,
                                columnNumber: 11
                            }, this),
                            (()=>{
                                const fraudAlerts = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getFraudAlerts"])().slice(0, 20);
                                if (!fraudAlerts.length) return null;
                                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: card('#f97316'),
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                            style: {
                                                fontFamily: "'Playfair Display',serif",
                                                fontSize: '0.98rem',
                                                fontWeight: 700,
                                                marginBottom: '0.75rem',
                                                color: '#1A0800'
                                            },
                                            children: "🚨 Fraud Alert Log"
                                        }, void 0, false, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 839,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
                                                                background: '#fff7ed'
                                                            },
                                                            children: [
                                                                'Type',
                                                                'Detail',
                                                                'By',
                                                                'Amount',
                                                                'Date'
                                                            ].map((h)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                    style: {
                                                                        padding: '0.48rem 0.7rem',
                                                                        textAlign: 'left',
                                                                        fontSize: '0.7rem',
                                                                        fontWeight: 700,
                                                                        color: '#9a3412',
                                                                        textTransform: 'uppercase'
                                                                    },
                                                                    children: h
                                                                }, h, false, {
                                                                    fileName: "[project]/app/admin/page.tsx",
                                                                    lineNumber: 843,
                                                                    columnNumber: 70
                                                                }, this))
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/admin/page.tsx",
                                                            lineNumber: 842,
                                                            columnNumber: 28
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 842,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                                        children: fraudAlerts.map((a)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                style: {
                                                                    borderBottom: '1px solid #fed7aa'
                                                                },
                                                                children: [
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
                                                                                background: '#fff7ed',
                                                                                color: '#ea580c'
                                                                            },
                                                                            children: a.type.replace(/_/g, ' ')
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/admin/page.tsx",
                                                                            lineNumber: 848,
                                                                            columnNumber: 66
                                                                        }, this)
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/admin/page.tsx",
                                                                        lineNumber: 848,
                                                                        columnNumber: 27
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                        style: {
                                                                            padding: '0.48rem 0.7rem',
                                                                            color: '#555',
                                                                            maxWidth: '200px',
                                                                            overflow: 'hidden',
                                                                            textOverflow: 'ellipsis',
                                                                            whiteSpace: 'nowrap'
                                                                        },
                                                                        children: a.detail
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/admin/page.tsx",
                                                                        lineNumber: 849,
                                                                        columnNumber: 27
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                        style: {
                                                                            padding: '0.48rem 0.7rem',
                                                                            fontWeight: 600
                                                                        },
                                                                        children: a.by
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/admin/page.tsx",
                                                                        lineNumber: 850,
                                                                        columnNumber: 27
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                        style: {
                                                                            padding: '0.48rem 0.7rem',
                                                                            color: '#ef4444',
                                                                            fontWeight: 700
                                                                        },
                                                                        children: a.amount ? `₹${a.amount}` : '—'
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/admin/page.tsx",
                                                                        lineNumber: 851,
                                                                        columnNumber: 27
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                        style: {
                                                                            padding: '0.48rem 0.7rem',
                                                                            color: '#888',
                                                                            fontSize: '0.75rem'
                                                                        },
                                                                        children: new Date(a.at).toLocaleString('en-IN', {
                                                                            dateStyle: 'short',
                                                                            timeStyle: 'short'
                                                                        })
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/admin/page.tsx",
                                                                        lineNumber: 852,
                                                                        columnNumber: 27
                                                                    }, this)
                                                                ]
                                                            }, a.id, true, {
                                                                fileName: "[project]/app/admin/page.tsx",
                                                                lineNumber: 847,
                                                                columnNumber: 25
                                                            }, this))
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 845,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 841,
                                                columnNumber: 19
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 840,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/admin/page.tsx",
                                    lineNumber: 838,
                                    columnNumber: 15
                                }, this);
                            })()
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
                                        lineNumber: 868,
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
                                        lineNumber: 869,
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
                                                        lineNumber: 872,
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
                                                        lineNumber: 873,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 871,
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
                                                        lineNumber: 876,
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
                                                        lineNumber: 877,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 875,
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
                                                        lineNumber: 880,
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
                                                        lineNumber: 881,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 879,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 870,
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
                                        lineNumber: 884,
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
                                        lineNumber: 885,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 867,
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
                                        lineNumber: 890,
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
                                                lineNumber: 893,
                                                columnNumber: 28
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 891,
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
                                        lineNumber: 896,
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
                                                        lineNumber: 902,
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
                                                                lineNumber: 908,
                                                                columnNumber: 19
                                                            }, this),
                                                            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SECURITY_QUESTIONS"].map((q)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                    value: q,
                                                                    children: q
                                                                }, q, false, {
                                                                    fileName: "[project]/app/admin/page.tsx",
                                                                    lineNumber: 909,
                                                                    columnNumber: 46
                                                                }, this))
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 903,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 901,
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
                                                        lineNumber: 913,
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
                                                        lineNumber: 914,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 912,
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
                                                        lineNumber: 917,
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
                                                        lineNumber: 918,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 916,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 900,
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
                                        lineNumber: 921,
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
                                        lineNumber: 922,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 889,
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
                                                lineNumber: 928,
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
                                                        lineNumber: 929,
                                                        columnNumber: 133
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 929,
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
                                                lineNumber: 930,
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
                                                lineNumber: 936,
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
                                                lineNumber: 937,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 927,
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
                                                lineNumber: 940,
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
                                                        lineNumber: 941,
                                                        columnNumber: 133
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 941,
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
                                                lineNumber: 942,
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
                                                lineNumber: 948,
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
                                                lineNumber: 949,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 939,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 926,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: card('#25d366'),
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        style: {
                                            fontFamily: "'Playfair Display',serif",
                                            fontSize: '1rem',
                                            fontWeight: 700,
                                            marginBottom: '0.4rem',
                                            color: '#1A0800'
                                        },
                                        children: "📱 WhatsApp Notification Number"
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 955,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        style: {
                                            fontSize: '0.78rem',
                                            color: '#555',
                                            marginBottom: '0.75rem',
                                            lineHeight: 1.5
                                        },
                                        children: "When a customer places an online order, WhatsApp will open with the order details pre-filled — so the customer can send it directly to this number. Include country code (e.g. 919876543210 for India)."
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 956,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        value: waNum,
                                        onChange: (e)=>setWaNum(e.target.value),
                                        placeholder: "e.g. 919876543210",
                                        type: "tel",
                                        style: {
                                            ...inp,
                                            marginBottom: '0.5rem'
                                        }
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 959,
                                        columnNumber: 13
                                    }, this),
                                    waNumMsg && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            fontSize: '0.75rem',
                                            color: waNumMsg.includes('✅') ? '#16a34a' : '#ef4444',
                                            marginBottom: '0.4rem'
                                        },
                                        children: waNumMsg
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 966,
                                        columnNumber: 26
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            display: 'flex',
                                            gap: '0.6rem',
                                            alignItems: 'center',
                                            flexWrap: 'wrap'
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                onClick: saveWaNumFn,
                                                style: {
                                                    ...btn('#25d366'),
                                                    padding: '0.5rem 1.1rem'
                                                },
                                                children: "💾 Save Number"
                                            }, void 0, false, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 968,
                                                columnNumber: 15
                                            }, this),
                                            waNum.replace(/\D/g, '').length >= 10 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                href: `https://wa.me/${waNum.replace(/\D/g, '')}`,
                                                target: "_blank",
                                                rel: "noopener noreferrer",
                                                style: {
                                                    fontSize: '0.78rem',
                                                    color: '#25d366',
                                                    fontWeight: 700,
                                                    textDecoration: 'underline'
                                                },
                                                children: "Test this number →"
                                            }, void 0, false, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 970,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 967,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 954,
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
                                        lineNumber: 979,
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
                                                        lineNumber: 982,
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
                                                        lineNumber: 983,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 981,
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
                                                        lineNumber: 986,
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
                                                        lineNumber: 987,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 985,
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
                                                        lineNumber: 990,
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
                                                        lineNumber: 991,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 989,
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
                                                lineNumber: 1001,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 980,
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
                                        lineNumber: 1003,
                                        columnNumber: 26
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 978,
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
                                        lineNumber: 1008,
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
                                        lineNumber: 1012,
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
                                                                lineNumber: 1018,
                                                                columnNumber: 27
                                                            }, this))
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 1016,
                                                        columnNumber: 23
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/app/admin/page.tsx",
                                                    lineNumber: 1015,
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
                                                                    lineNumber: 1025,
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
                                                                    lineNumber: 1026,
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
                                                                        lineNumber: 1028,
                                                                        columnNumber: 29
                                                                    }, this)
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/admin/page.tsx",
                                                                    lineNumber: 1027,
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
                                                                    lineNumber: 1032,
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
                                                                                lineNumber: 1037,
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
                                                                                        lineNumber: 1045,
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
                                                                                        lineNumber: 1054,
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
                                                                                        lineNumber: 1055,
                                                                                        columnNumber: 37
                                                                                    }, this)
                                                                                ]
                                                                            }, void 0, true, {
                                                                                fileName: "[project]/app/admin/page.tsx",
                                                                                lineNumber: 1044,
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
                                                                                lineNumber: 1057,
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
                                                                                lineNumber: 1059,
                                                                                columnNumber: 31
                                                                            }, this)
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/app/admin/page.tsx",
                                                                        lineNumber: 1036,
                                                                        columnNumber: 29
                                                                    }, this)
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/admin/page.tsx",
                                                                    lineNumber: 1035,
                                                                    columnNumber: 27
                                                                }, this)
                                                            ]
                                                        }, acc.id, true, {
                                                            fileName: "[project]/app/admin/page.tsx",
                                                            lineNumber: 1024,
                                                            columnNumber: 25
                                                        }, this))
                                                }, void 0, false, {
                                                    fileName: "[project]/app/admin/page.tsx",
                                                    lineNumber: 1022,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 1014,
                                            columnNumber: 19
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 1013,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 1007,
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
                                        children: "🔗 Staff Portal Links"
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 1077,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))',
                                            gap: '0.65rem'
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
                                            },
                                            {
                                                href: '/online',
                                                label: '📦 Online Ordering',
                                                color: '#06b6d4'
                                            },
                                            {
                                                href: '/',
                                                label: '🪑 Dine-In Menu',
                                                color: '#f59e0b'
                                            }
                                        ].map((l)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                href: l.href,
                                                target: "_blank",
                                                rel: "noreferrer",
                                                style: {
                                                    padding: '0.65rem 1rem',
                                                    background: l.color,
                                                    color: 'white',
                                                    borderRadius: 8,
                                                    fontWeight: 700,
                                                    textDecoration: 'none',
                                                    fontSize: '0.82rem',
                                                    textAlign: 'center',
                                                    display: 'block'
                                                },
                                                children: l.label
                                            }, l.href, false, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 1087,
                                                columnNumber: 17
                                            }, this))
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 1078,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 1076,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true)
                ]
            }, void 0, true, {
                fileName: "[project]/app/admin/page.tsx",
                lineNumber: 380,
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
                                            lineNumber: 1103,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                fontSize: '1.05rem',
                                                fontWeight: 900,
                                                fontFamily: "'Playfair Display',serif"
                                            },
                                            children: selOrder.id
                                        }, void 0, false, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 1104,
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
                                            lineNumber: 1105,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/admin/page.tsx",
                                    lineNumber: 1102,
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
                                            lineNumber: 1108,
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
                                            lineNumber: 1109,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/admin/page.tsx",
                                    lineNumber: 1107,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/admin/page.tsx",
                            lineNumber: 1101,
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
                                        'Channel',
                                        selOrder.source === 'online' ? '📦 Online Order' : '🍽️ In-Store'
                                    ],
                                    [
                                        'Type',
                                        selOrder.type === 'dine-in' ? '🍽️ Dine-In' : selOrder.type === 'delivery' ? '🚗 Delivery' : '🏪 Pickup'
                                    ],
                                    [
                                        'Location',
                                        selOrder.type === 'dine-in' ? `Table ${selOrder.tableId}` : selOrder.deliveryAddress ? selOrder.deliveryAddress : 'Counter Pickup'
                                    ],
                                    [
                                        'Payment',
                                        selOrder.payment || 'N/A'
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
                                                lineNumber: 1121,
                                                columnNumber: 30
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    fontSize: '0.86rem',
                                                    fontWeight: 700,
                                                    color: '#1A0800'
                                                },
                                                children: v
                                            }, void 0, false, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 1121,
                                                columnNumber: 150
                                            }, this)
                                        ]
                                    }, l, true, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 1121,
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
                                            lineNumber: 1123,
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
                                            lineNumber: 1123,
                                            columnNumber: 184
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/admin/page.tsx",
                                    lineNumber: 1123,
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
                                            lineNumber: 1124,
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
                                            lineNumber: 1124,
                                            columnNumber: 188
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/admin/page.tsx",
                                    lineNumber: 1124,
                                    columnNumber: 43
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/admin/page.tsx",
                            lineNumber: 1112,
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
                                    lineNumber: 1127,
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
                                                        lineNumber: 1129,
                                                        columnNumber: 101
                                                    }, this))
                                            }, void 0, false, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 1129,
                                                columnNumber: 24
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 1129,
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
                                                            lineNumber: 1133,
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
                                                            lineNumber: 1134,
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
                                                            lineNumber: 1135,
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
                                                            lineNumber: 1136,
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
                                                            lineNumber: 1137,
                                                            columnNumber: 23
                                                        }, this)
                                                    ]
                                                }, i, true, {
                                                    fileName: "[project]/app/admin/page.tsx",
                                                    lineNumber: 1132,
                                                    columnNumber: 21
                                                }, this))
                                        }, void 0, false, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 1130,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/admin/page.tsx",
                                    lineNumber: 1128,
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
                                                    lineNumber: 1143,
                                                    columnNumber: 74
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 1143,
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
                                                    lineNumber: 1144,
                                                    columnNumber: 106
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 1144,
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
                                            lineNumber: 1145,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/admin/page.tsx",
                                    lineNumber: 1142,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/admin/page.tsx",
                            lineNumber: 1126,
                            columnNumber: 13
                        }, this),
                        (selOrder.timeline?.length ?? 0) > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
                                    lineNumber: 1150,
                                    columnNumber: 17
                                }, this),
                                (selOrder.timeline || []).map((ev, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
                                                lineNumber: 1153,
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
                                                        lineNumber: 1155,
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
                                                        lineNumber: 1156,
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
                                                        lineNumber: 1157,
                                                        columnNumber: 33
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        style: {
                                                            fontSize: '0.7rem',
                                                            color: '#bbb'
                                                        },
                                                        children: new Date(ev.at || ev.timestamp || '').toLocaleTimeString()
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 1158,
                                                        columnNumber: 23
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 1154,
                                                columnNumber: 21
                                            }, this)
                                        ]
                                    }, i, true, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 1152,
                                        columnNumber: 19
                                    }, this))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/admin/page.tsx",
                            lineNumber: 1149,
                            columnNumber: 15
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/admin/page.tsx",
                    lineNumber: 1100,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/admin/page.tsx",
                lineNumber: 1099,
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
                                    lineNumber: 1173,
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
                                    lineNumber: 1174,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/admin/page.tsx",
                            lineNumber: 1172,
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
                                                    lineNumber: 1179,
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
                                                            lineNumber: 1181,
                                                            columnNumber: 40
                                                        }, this))
                                                }, void 0, false, {
                                                    fileName: "[project]/app/admin/page.tsx",
                                                    lineNumber: 1180,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 1178,
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
                                                    lineNumber: 1185,
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
                                                            lineNumber: 1187,
                                                            columnNumber: 21
                                                        }, this),
                                                        Object.entries(BADGE_LABEL).map(([k, v])=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                value: k,
                                                                children: v
                                                            }, k, false, {
                                                                fileName: "[project]/app/admin/page.tsx",
                                                                lineNumber: 1188,
                                                                columnNumber: 63
                                                            }, this))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/admin/page.tsx",
                                                    lineNumber: 1186,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 1184,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/admin/page.tsx",
                                    lineNumber: 1177,
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
                                            lineNumber: 1193,
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
                                            lineNumber: 1194,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/admin/page.tsx",
                                    lineNumber: 1192,
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
                                            lineNumber: 1197,
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
                                            lineNumber: 1198,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/admin/page.tsx",
                                    lineNumber: 1196,
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
                                            lineNumber: 1201,
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
                                            lineNumber: 1202,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/admin/page.tsx",
                                    lineNumber: 1200,
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
                                            lineNumber: 1205,
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
                                            lineNumber: 1206,
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
                                                lineNumber: 1209,
                                                columnNumber: 21
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 1208,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/admin/page.tsx",
                                    lineNumber: 1204,
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
                                            lineNumber: 1214,
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
                                            lineNumber: 1215,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/admin/page.tsx",
                                    lineNumber: 1213,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/admin/page.tsx",
                            lineNumber: 1176,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/admin/page.tsx",
                    lineNumber: 1171,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/admin/page.tsx",
                lineNumber: 1170,
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
                            lineNumber: 1226,
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
                            lineNumber: 1227,
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
                            lineNumber: 1228,
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
                            lineNumber: 1229,
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
                                    lineNumber: 1231,
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
                                    lineNumber: 1232,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/admin/page.tsx",
                            lineNumber: 1230,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/admin/page.tsx",
                    lineNumber: 1225,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/admin/page.tsx",
                lineNumber: 1224,
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
                            lineNumber: 1242,
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
                            lineNumber: 1243,
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
                            lineNumber: 1244,
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
                            lineNumber: 1245,
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
                            lineNumber: 1246,
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
                            lineNumber: 1247,
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
                            lineNumber: 1248,
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
                            lineNumber: 1249,
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
                            lineNumber: 1250,
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
                                    lineNumber: 1252,
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
                                    lineNumber: 1253,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/admin/page.tsx",
                            lineNumber: 1251,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/admin/page.tsx",
                    lineNumber: 1241,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/admin/page.tsx",
                lineNumber: 1240,
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
                            lineNumber: 1263,
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
                                    lineNumber: 1264,
                                    columnNumber: 121
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/admin/page.tsx",
                            lineNumber: 1264,
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
                            lineNumber: 1265,
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
                            lineNumber: 1266,
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
                            lineNumber: 1267,
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
                            lineNumber: 1268,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/admin/page.tsx",
                    lineNumber: 1262,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/admin/page.tsx",
                lineNumber: 1261,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/admin/page.tsx",
        lineNumber: 348,
        columnNumber: 5
    }, this);
}
_s(AdminPage, "Efel/vuC0i80WouVzf1xDcRX8tw=", false, function() {
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