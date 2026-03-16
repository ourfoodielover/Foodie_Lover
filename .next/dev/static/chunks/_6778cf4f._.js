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
const STATUS_FLOW = {
    awaiting_waiter: 'pending',
    prepared: 'served'
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
    pending: 'In Queue',
    preparing: 'Preparing',
    prepared: 'Ready to Serve',
    served: 'Served',
    completed: 'Completed',
    cancelled: 'Cancelled',
    void: 'Void'
};
function WaiterPage() {
    _s();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const [session, setSession] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [authChecked, setAuthChecked] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [orders, setOrders] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [tabs, setTabs] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [disputes, setDisputes] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [waiterCalls, setWaiterCalls] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [filter, setFilter] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('active');
    const [selOrder, setSelOrder] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [actionMsg, setActionMsg] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [cancelReason, setCancelReason] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [showCancelFor, setShowCancelFor] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    // ── Auth ──────────────────────────────────────────────────────────────────
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
    // ── Data refresh ──────────────────────────────────────────────────────────
    const refresh = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "WaiterPage.useCallback[refresh]": ()=>{
            setOrders((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getOrders"])());
            setTabs((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getTabs"])());
            setDisputes((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getPendingDisputes"])());
            setWaiterCalls((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getPendingWaiterCalls"])());
            setSelOrder({
                "WaiterPage.useCallback[refresh]": (prev)=>{
                    if (!prev) return null;
                    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getOrders"])().find({
                        "WaiterPage.useCallback[refresh]": (o)=>o.id === prev.id
                    }["WaiterPage.useCallback[refresh]"]) ?? null;
                }
            }["WaiterPage.useCallback[refresh]"]);
        }
    }["WaiterPage.useCallback[refresh]"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "WaiterPage.useEffect": ()=>{
            if (!authChecked) return;
            refresh();
            const t = setInterval(refresh, 3000);
            return ({
                "WaiterPage.useEffect": ()=>clearInterval(t)
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
    // ── Actions ───────────────────────────────────────────────────────────────
    function accept(order) {
        const ok = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["updateOrderStatus"])(order.id, 'pending', session?.name || 'Waiter');
        if (ok) {
            setActionMsg('✅ Order accepted and sent to kitchen');
            setTimeout(()=>setActionMsg(''), 2500);
            refresh();
        }
    }
    function markServed(order) {
        const ok = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["updateOrderStatus"])(order.id, 'served', session?.name || 'Waiter');
        if (ok) {
            setActionMsg('✅ Order marked as served');
            setTimeout(()=>setActionMsg(''), 2500);
            setSelOrder(null);
            refresh();
        }
    }
    function handleCancel(order) {
        if (!cancelReason.trim()) return;
        const ok = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cancelOrder"])(order.id, cancelReason, session?.name || 'Waiter');
        if (ok) {
            setActionMsg('Order cancelled');
            setTimeout(()=>setActionMsg(''), 2500);
            setShowCancelFor(null);
            setCancelReason('');
            setSelOrder(null);
            refresh();
        }
    }
    function handleResolveDispute(disputeId) {
        const ok = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["resolveDispute"])(disputeId, session?.name || 'Waiter');
        if (ok) {
            refresh();
        }
    }
    function handleAcknowledgeWaiterCall(callId) {
        const ok = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["acknowledgeWaiterCall"])(callId, session?.name || 'Waiter');
        if (ok) {
            refresh();
        }
    }
    // ── Derived ───────────────────────────────────────────────────────────────
    const active = orders.filter((o)=>[
            'awaiting_waiter',
            'pending',
            'preparing',
            'prepared'
        ].includes(o.status));
    const served = orders.filter((o)=>o.status === 'served');
    const shown = filter === 'active' ? active : filter === 'served' ? served : orders.slice(-80).reverse();
    // Delivery orders that are prepared — ready for delivery pickup
    const deliveryReadyOrders = orders.filter((o)=>o.type === 'delivery' && o.status === 'prepared');
    const deliveryEnRoute = orders.filter((o)=>o.type === 'delivery' && o.status === 'out_for_delivery');
    // For bill-requested smart banner
    const awaitingPaymentTabs = tabs.filter((t)=>t.tabStatus === 'awaiting_payment');
    const tabsWithPendingFood = awaitingPaymentTabs.filter((tab)=>orders.some((o)=>tab.orderIds.includes(o.id) && o.status === 'prepared'));
    const tabsReadyForCounter = awaitingPaymentTabs.filter((tab)=>!orders.some((o)=>tab.orderIds.includes(o.id) && o.status === 'prepared'));
    // Get waiter stats for today
    const waiterStats = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getWaiterStats"])();
    const myStats = waiterStats.find((s)=>s.name === session?.name);
    // ── Styles ────────────────────────────────────────────────────────────────
    const btn = (bg = '#E65C00', c = 'white')=>({
            background: bg,
            color: c,
            border: 'none',
            borderRadius: 8,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'Poppins,sans-serif',
            padding: '0.45rem 0.9rem',
            fontSize: '0.8rem'
        });
    if (!authChecked) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: {
                minHeight: '100vh',
                background: 'linear-gradient(135deg,#fff8f3,#fff0e8)',
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
                        children: "🛎️"
                    }, void 0, false, {
                        fileName: "[project]/app/waiter/page.tsx",
                        lineNumber: 156,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: "Loading Waiter Portal…"
                    }, void 0, false, {
                        fileName: "[project]/app/waiter/page.tsx",
                        lineNumber: 157,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/waiter/page.tsx",
                lineNumber: 155,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/app/waiter/page.tsx",
            lineNumber: 154,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        style: {
            minHeight: '100vh',
            background: 'linear-gradient(135deg,#fff8f3,#fff0e8)',
            fontFamily: 'Poppins,sans-serif'
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    background: 'linear-gradient(135deg,#7c3aed,#5b21b6)',
                    color: 'white',
                    padding: '0.9rem 1.25rem',
                    position: 'sticky',
                    top: 0,
                    zIndex: 50,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
                },
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
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
                                        fontSize: '1.5rem'
                                    },
                                    children: "🛎️"
                                }, void 0, false, {
                                    fileName: "[project]/app/waiter/page.tsx",
                                    lineNumber: 170,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                fontFamily: "'Playfair Display',serif",
                                                fontSize: '1.15rem',
                                                fontWeight: 900
                                            },
                                            children: "Waiter Station"
                                        }, void 0, false, {
                                            fileName: "[project]/app/waiter/page.tsx",
                                            lineNumber: 172,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                fontSize: '0.68rem',
                                                color: '#c4b5fd'
                                            },
                                            children: [
                                                session?.name,
                                                " ",
                                                myStats && `· ${myStats.ordersAccepted} accepted · ${myStats.ordersCancelled} cancelled · ${myStats.ordersServed} served`
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/waiter/page.tsx",
                                            lineNumber: 173,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/waiter/page.tsx",
                                    lineNumber: 171,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/waiter/page.tsx",
                            lineNumber: 169,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                display: 'flex',
                                gap: '0.5rem',
                                alignItems: 'center'
                            },
                            children: [
                                active.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        background: '#f59e0b',
                                        color: '#1A0800',
                                        padding: '0.2rem 0.6rem',
                                        borderRadius: 20,
                                        fontSize: '0.72rem',
                                        fontWeight: 800
                                    },
                                    children: [
                                        active.length,
                                        " Active"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/waiter/page.tsx",
                                    lineNumber: 180,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: logout,
                                    style: {
                                        ...btn('#ffffff20', 'white'),
                                        border: '1px solid #ffffff30',
                                        fontSize: '0.72rem'
                                    },
                                    children: "🚪 Logout"
                                }, void 0, false, {
                                    fileName: "[project]/app/waiter/page.tsx",
                                    lineNumber: 184,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/waiter/page.tsx",
                            lineNumber: 178,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/waiter/page.tsx",
                    lineNumber: 168,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/waiter/page.tsx",
                lineNumber: 167,
                columnNumber: 7
            }, this),
            disputes.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    background: '#7f1d1d',
                    borderBottom: '2px solid #dc2626',
                    padding: '0.65rem 1.25rem'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            fontWeight: 800,
                            fontSize: '0.82rem',
                            color: '#fca5a5',
                            marginBottom: '0.35rem'
                        },
                        children: "🚨 Food Disputes — Customers denied receiving food"
                    }, void 0, false, {
                        fileName: "[project]/app/waiter/page.tsx",
                        lineNumber: 194,
                        columnNumber: 11
                    }, this),
                    disputes.map((d)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '0.25rem 0',
                                fontSize: '0.78rem',
                                color: '#fca5a5'
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    children: [
                                        "Table ",
                                        d.tableId,
                                        " · ",
                                        d.customerName,
                                        " — Order dispute"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/waiter/page.tsx",
                                    lineNumber: 199,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: ()=>handleResolveDispute(d.id),
                                    style: {
                                        ...btn('#10b981'),
                                        fontSize: '0.65rem',
                                        padding: '0.2rem 0.5rem'
                                    },
                                    children: "✓ Resolved"
                                }, void 0, false, {
                                    fileName: "[project]/app/waiter/page.tsx",
                                    lineNumber: 200,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, d.id, true, {
                            fileName: "[project]/app/waiter/page.tsx",
                            lineNumber: 198,
                            columnNumber: 13
                        }, this))
                ]
            }, void 0, true, {
                fileName: "[project]/app/waiter/page.tsx",
                lineNumber: 193,
                columnNumber: 9
            }, this),
            waiterCalls.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    background: '#b45309',
                    borderBottom: '2px solid #f59e0b',
                    padding: '0.65rem 1.25rem'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            fontWeight: 800,
                            fontSize: '0.82rem',
                            color: '#fef3c7',
                            marginBottom: '0.35rem'
                        },
                        children: "🔔 Waiter Calls"
                    }, void 0, false, {
                        fileName: "[project]/app/waiter/page.tsx",
                        lineNumber: 214,
                        columnNumber: 11
                    }, this),
                    waiterCalls.map((call)=>{
                        const callMinutesAgo = Math.floor((Date.now() - new Date(call.at).getTime()) / 60000);
                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '0.25rem 0',
                                fontSize: '0.78rem',
                                color: '#78350f'
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    children: [
                                        "Table ",
                                        call.tableId,
                                        " · ",
                                        call.customerName,
                                        " (",
                                        callMinutesAgo,
                                        "m ago)"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/waiter/page.tsx",
                                    lineNumber: 221,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: ()=>handleAcknowledgeWaiterCall(call.id),
                                    style: {
                                        ...btn('#f59e0b', '#1A0800'),
                                        fontSize: '0.65rem',
                                        padding: '0.2rem 0.5rem'
                                    },
                                    children: "✓ Go"
                                }, void 0, false, {
                                    fileName: "[project]/app/waiter/page.tsx",
                                    lineNumber: 222,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, call.id, true, {
                            fileName: "[project]/app/waiter/page.tsx",
                            lineNumber: 220,
                            columnNumber: 15
                        }, this);
                    })
                ]
            }, void 0, true, {
                fileName: "[project]/app/waiter/page.tsx",
                lineNumber: 213,
                columnNumber: 9
            }, this),
            deliveryReadyOrders.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    background: '#eff6ff',
                    borderBottom: '2px solid #2563eb',
                    padding: '0.65rem 1.25rem'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            fontWeight: 800,
                            fontSize: '0.82rem',
                            color: '#1e40af',
                            marginBottom: '0.35rem'
                        },
                        children: "🛵 Delivery Orders Ready — Notify delivery person"
                    }, void 0, false, {
                        fileName: "[project]/app/waiter/page.tsx",
                        lineNumber: 237,
                        columnNumber: 11
                    }, this),
                    deliveryReadyOrders.map((o)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '0.2rem 0',
                                fontSize: '0.78rem',
                                color: '#1e40af'
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    children: [
                                        "#",
                                        o.id.slice(-6),
                                        " · ",
                                        o.customerName,
                                        " · ₹",
                                        o.total
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/waiter/page.tsx",
                                    lineNumber: 242,
                                    columnNumber: 15
                                }, this),
                                o.deliveryAddress && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    style: {
                                        color: '#3b82f6',
                                        fontSize: '0.7rem'
                                    },
                                    children: [
                                        "📍 ",
                                        o.deliveryAddress.slice(0, 25),
                                        o.deliveryAddress.length > 25 ? '…' : ''
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/waiter/page.tsx",
                                    lineNumber: 243,
                                    columnNumber: 37
                                }, this)
                            ]
                        }, o.id, true, {
                            fileName: "[project]/app/waiter/page.tsx",
                            lineNumber: 241,
                            columnNumber: 13
                        }, this))
                ]
            }, void 0, true, {
                fileName: "[project]/app/waiter/page.tsx",
                lineNumber: 236,
                columnNumber: 9
            }, this),
            deliveryEnRoute.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    background: '#f0f9ff',
                    borderBottom: '1px solid #bae6fd',
                    padding: '0.5rem 1.25rem'
                },
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        fontSize: '0.75rem',
                        color: '#0369a1',
                        fontWeight: 700
                    },
                    children: [
                        "🛵 ",
                        deliveryEnRoute.length,
                        " order",
                        deliveryEnRoute.length > 1 ? 's' : '',
                        " currently out for delivery"
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/waiter/page.tsx",
                    lineNumber: 250,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/waiter/page.tsx",
                lineNumber: 249,
                columnNumber: 9
            }, this),
            awaitingPaymentTabs.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    borderBottom: '2px solid #f59e0b'
                },
                children: [
                    tabsWithPendingFood.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            background: '#fff7ed',
                            padding: '0.65rem 1.25rem'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    fontWeight: 800,
                                    fontSize: '0.82rem',
                                    color: '#9a3412',
                                    marginBottom: '0.35rem'
                                },
                                children: "🍽️ Bill Requested — Serve food first, then direct to counter"
                            }, void 0, false, {
                                fileName: "[project]/app/waiter/page.tsx",
                                lineNumber: 262,
                                columnNumber: 15
                            }, this),
                            tabsWithPendingFood.map((tab)=>{
                                const readyOrders = orders.filter((o)=>tab.orderIds.includes(o.id) && o.status === 'prepared');
                                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '0.25rem 0',
                                        fontSize: '0.78rem',
                                        color: '#7c2d12'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            children: [
                                                "Table ",
                                                tab.tableId,
                                                " — ",
                                                tab.customerName
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/waiter/page.tsx",
                                            lineNumber: 271,
                                            columnNumber: 21
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            style: {
                                                background: '#fed7aa',
                                                color: '#9a3412',
                                                padding: '0.15rem 0.5rem',
                                                borderRadius: 10,
                                                fontSize: '0.7rem',
                                                fontWeight: 700
                                            },
                                            children: [
                                                "⚡ ",
                                                readyOrders.length,
                                                " ready — serve now"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/waiter/page.tsx",
                                            lineNumber: 272,
                                            columnNumber: 21
                                        }, this)
                                    ]
                                }, tab.id, true, {
                                    fileName: "[project]/app/waiter/page.tsx",
                                    lineNumber: 270,
                                    columnNumber: 19
                                }, this);
                            })
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/waiter/page.tsx",
                        lineNumber: 261,
                        columnNumber: 13
                    }, this),
                    tabsReadyForCounter.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            background: '#fef9c3',
                            padding: '0.65rem 1.25rem'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    fontWeight: 800,
                                    fontSize: '0.82rem',
                                    color: '#713f12',
                                    marginBottom: '0.2rem'
                                },
                                children: "💳 Bill Ready — Please direct customer(s) to the counter"
                            }, void 0, false, {
                                fileName: "[project]/app/waiter/page.tsx",
                                lineNumber: 283,
                                columnNumber: 15
                            }, this),
                            tabsReadyForCounter.map((tab)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        fontSize: '0.78rem',
                                        color: '#713f12',
                                        padding: '0.15rem 0'
                                    },
                                    children: [
                                        "Table ",
                                        tab.tableId,
                                        " — ",
                                        tab.customerName,
                                        " · ₹",
                                        tab.totalAmount - tab.discount
                                    ]
                                }, tab.id, true, {
                                    fileName: "[project]/app/waiter/page.tsx",
                                    lineNumber: 287,
                                    columnNumber: 17
                                }, this))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/waiter/page.tsx",
                        lineNumber: 282,
                        columnNumber: 13
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/waiter/page.tsx",
                lineNumber: 258,
                columnNumber: 9
            }, this),
            actionMsg && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    background: '#dcfce7',
                    borderBottom: '2px solid #16a34a',
                    padding: '0.6rem 1.25rem',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    color: '#16a34a'
                },
                children: actionMsg
            }, void 0, false, {
                fileName: "[project]/app/waiter/page.tsx",
                lineNumber: 298,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    padding: '0.65rem 1.25rem',
                    display: 'flex',
                    gap: '0.4rem',
                    overflowX: 'auto'
                },
                children: [
                    {
                        key: 'active',
                        label: `🟡 Active (${active.length})`
                    },
                    {
                        key: 'served',
                        label: `🟢 Served (${served.length})`
                    },
                    {
                        key: 'all',
                        label: '📋 All Orders'
                    }
                ].map((f)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>setFilter(f.key),
                        style: {
                            padding: '0.3rem 0.8rem',
                            borderRadius: 20,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            fontFamily: 'Poppins,sans-serif',
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            border: `2px solid ${filter === f.key ? '#7c3aed' : '#ddd'}`,
                            background: filter === f.key ? '#7c3aed' : 'white',
                            color: filter === f.key ? 'white' : '#666'
                        },
                        children: f.label
                    }, f.key, false, {
                        fileName: "[project]/app/waiter/page.tsx",
                        lineNumber: 310,
                        columnNumber: 11
                    }, this))
            }, void 0, false, {
                fileName: "[project]/app/waiter/page.tsx",
                lineNumber: 304,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    padding: '0 1rem 5rem',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))',
                    gap: '0.75rem'
                },
                children: !shown.length ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        gridColumn: '1/-1',
                        textAlign: 'center',
                        padding: '3rem',
                        color: '#999'
                    },
                    children: filter === 'active' ? '🎉 All caught up! No active orders.' : 'No orders found.'
                }, void 0, false, {
                    fileName: "[project]/app/waiter/page.tsx",
                    lineNumber: 329,
                    columnNumber: 11
                }, this) : shown.map((order)=>{
                    const mins = Math.floor((Date.now() - new Date(order.timestamp).getTime()) / 60000);
                    const canAccept = order.status === 'awaiting_waiter';
                    const canServe = order.status === 'prepared';
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        onClick: ()=>{
                            setSelOrder(order);
                            setShowCancelFor(null);
                            setCancelReason('');
                        },
                        style: {
                            background: 'white',
                            borderRadius: 12,
                            overflow: 'hidden',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
                            borderLeft: `4px solid ${STATUS_COLOR[order.status] || '#ddd'}`,
                            cursor: 'pointer'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    padding: '0.75rem 1rem',
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
                                                    fontSize: '0.88rem',
                                                    color: '#1A0800'
                                                },
                                                children: [
                                                    "#",
                                                    order.orderNum || order.id.slice(-4)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/waiter/page.tsx",
                                                lineNumber: 350,
                                                columnNumber: 19
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
                                                fileName: "[project]/app/waiter/page.tsx",
                                                lineNumber: 353,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    fontSize: '0.68rem',
                                                    color: '#aaa',
                                                    marginTop: '0.08rem'
                                                },
                                                children: [
                                                    "⏱ ",
                                                    mins,
                                                    "m ago"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/waiter/page.tsx",
                                                lineNumber: 356,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/waiter/page.tsx",
                                        lineNumber: 349,
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
                                                    fontSize: '0.68rem',
                                                    fontWeight: 700,
                                                    padding: '0.12rem 0.5rem',
                                                    borderRadius: 10,
                                                    background: (STATUS_COLOR[order.status] || '#ddd') + '25',
                                                    color: STATUS_COLOR[order.status] || '#555'
                                                },
                                                children: STATUS_LABEL[order.status] || order.status
                                            }, void 0, false, {
                                                fileName: "[project]/app/waiter/page.tsx",
                                                lineNumber: 359,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                style: {
                                                    fontWeight: 800,
                                                    color: '#16a34a',
                                                    fontSize: '0.9rem'
                                                },
                                                children: [
                                                    "₹",
                                                    order.total
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/waiter/page.tsx",
                                                lineNumber: 362,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/waiter/page.tsx",
                                        lineNumber: 358,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/waiter/page.tsx",
                                lineNumber: 348,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    padding: '0.35rem 1rem 0.5rem',
                                    fontSize: '0.75rem',
                                    color: '#666',
                                    borderTop: '1px solid #f5f0e8',
                                    display: 'flex',
                                    justifyContent: 'space-between'
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: [
                                            (order.items || []).reduce((s, i)=>s + i.qty, 0),
                                            " item(s)"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/waiter/page.tsx",
                                        lineNumber: 366,
                                        columnNumber: 17
                                    }, this),
                                    (canAccept || canServe) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        style: {
                                            color: canServe ? '#8b5cf6' : '#f59e0b',
                                            fontWeight: 700
                                        },
                                        children: canAccept ? '⚡ Action needed' : '✅ Ready to serve!'
                                    }, void 0, false, {
                                        fileName: "[project]/app/waiter/page.tsx",
                                        lineNumber: 368,
                                        columnNumber: 19
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/waiter/page.tsx",
                                lineNumber: 365,
                                columnNumber: 15
                            }, this),
                            (canAccept || canServe) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    padding: '0 0.75rem 0.6rem',
                                    display: 'flex',
                                    gap: '0.4rem'
                                },
                                onClick: (e)=>e.stopPropagation(),
                                children: [
                                    canAccept && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>accept(order),
                                        style: {
                                            ...btn('#f59e0b', '#1A0800'),
                                            flex: 1,
                                            fontSize: '0.76rem',
                                            padding: '0.4rem 0.5rem'
                                        },
                                        children: "✅ Accept"
                                    }, void 0, false, {
                                        fileName: "[project]/app/waiter/page.tsx",
                                        lineNumber: 377,
                                        columnNumber: 21
                                    }, this),
                                    canServe && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>markServed(order),
                                        style: {
                                            ...btn('#8b5cf6'),
                                            flex: 1,
                                            fontSize: '0.76rem',
                                            padding: '0.4rem 0.5rem'
                                        },
                                        children: "🍽️ Mark Served"
                                    }, void 0, false, {
                                        fileName: "[project]/app/waiter/page.tsx",
                                        lineNumber: 382,
                                        columnNumber: 21
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/waiter/page.tsx",
                                lineNumber: 375,
                                columnNumber: 17
                            }, this)
                        ]
                    }, order.id, true, {
                        fileName: "[project]/app/waiter/page.tsx",
                        lineNumber: 338,
                        columnNumber: 13
                    }, this);
                })
            }, void 0, false, {
                fileName: "[project]/app/waiter/page.tsx",
                lineNumber: 327,
                columnNumber: 7
            }, this),
            selOrder && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.55)',
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    zIndex: 200
                },
                onClick: ()=>{
                    setSelOrder(null);
                    setShowCancelFor(null);
                    setCancelReason('');
                },
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    onClick: (e)=>e.stopPropagation(),
                    style: {
                        background: 'white',
                        width: '100%',
                        maxWidth: '520px',
                        maxHeight: '88vh',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: '16px 16px 0 0',
                        boxShadow: '0 -16px 40px rgba(0,0,0,0.25)'
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                background: `linear-gradient(135deg,${STATUS_COLOR[selOrder.status] || '#7c3aed'},${STATUS_COLOR[selOrder.status] || '#5b21b6'})`,
                                color: 'white',
                                padding: '1rem 1.25rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                fontWeight: 900,
                                                fontSize: '1rem'
                                            },
                                            children: [
                                                "Order #",
                                                selOrder.orderNum || selOrder.id.slice(-4)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/waiter/page.tsx",
                                            lineNumber: 405,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                fontSize: '0.72rem',
                                                opacity: 0.85
                                            },
                                            children: [
                                                selOrder.customerName,
                                                selOrder.tableId ? ` · Table ${selOrder.tableId}` : '',
                                                " · ",
                                                STATUS_LABEL[selOrder.status]
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/waiter/page.tsx",
                                            lineNumber: 406,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/waiter/page.tsx",
                                    lineNumber: 404,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: ()=>{
                                        setSelOrder(null);
                                        setShowCancelFor(null);
                                    },
                                    style: {
                                        background: 'none',
                                        border: 'none',
                                        color: 'white',
                                        fontSize: '1.4rem',
                                        cursor: 'pointer'
                                    },
                                    children: "×"
                                }, void 0, false, {
                                    fileName: "[project]/app/waiter/page.tsx",
                                    lineNumber: 408,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/waiter/page.tsx",
                            lineNumber: 403,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                flex: 1,
                                overflowY: 'auto',
                                padding: '1rem 1.25rem'
                            },
                            children: [
                                (selOrder.items || []).map((item, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            padding: '0.4rem 0',
                                            borderBottom: '1px solid #f5f0e8',
                                            fontSize: '0.85rem'
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
                                                        fileName: "[project]/app/waiter/page.tsx",
                                                        lineNumber: 415,
                                                        columnNumber: 37
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/waiter/page.tsx",
                                                lineNumber: 415,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                style: {
                                                    fontWeight: 700
                                                },
                                                children: [
                                                    "₹",
                                                    item.subtotal ?? item.price * item.qty
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/waiter/page.tsx",
                                                lineNumber: 416,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, i, true, {
                                        fileName: "[project]/app/waiter/page.tsx",
                                        lineNumber: 414,
                                        columnNumber: 17
                                    }, this)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        fontWeight: 800,
                                        fontSize: '0.95rem',
                                        paddingTop: '0.5rem',
                                        color: '#1A0800'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            children: "Total"
                                        }, void 0, false, {
                                            fileName: "[project]/app/waiter/page.tsx",
                                            lineNumber: 420,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            children: [
                                                "₹",
                                                selOrder.total
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/waiter/page.tsx",
                                            lineNumber: 421,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/waiter/page.tsx",
                                    lineNumber: 419,
                                    columnNumber: 15
                                }, this),
                                (selOrder.timeline || []).length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        marginTop: '1rem'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                fontSize: '0.72rem',
                                                fontWeight: 700,
                                                color: '#888',
                                                marginBottom: '0.4rem',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.05em'
                                            },
                                            children: "Timeline"
                                        }, void 0, false, {
                                            fileName: "[project]/app/waiter/page.tsx",
                                            lineNumber: 427,
                                            columnNumber: 19
                                        }, this),
                                        selOrder.timeline.map((t, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    fontSize: '0.75rem',
                                                    color: '#666',
                                                    padding: '0.2rem 0',
                                                    display: 'flex',
                                                    gap: '0.4rem',
                                                    alignItems: 'center'
                                                },
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        style: {
                                                            color: STATUS_COLOR[t.status] || '#888',
                                                            fontWeight: 700
                                                        },
                                                        children: STATUS_LABEL[t.status] || t.status
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/waiter/page.tsx",
                                                        lineNumber: 430,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        style: {
                                                            color: '#aaa'
                                                        },
                                                        children: [
                                                            "· ",
                                                            t.by,
                                                            " · ",
                                                            new Date(t.at || t.timestamp || '').toLocaleTimeString()
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/waiter/page.tsx",
                                                        lineNumber: 431,
                                                        columnNumber: 23
                                                    }, this),
                                                    t.note && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        style: {
                                                            color: '#888',
                                                            fontStyle: 'italic'
                                                        },
                                                        children: t.note
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/waiter/page.tsx",
                                                        lineNumber: 432,
                                                        columnNumber: 34
                                                    }, this)
                                                ]
                                            }, i, true, {
                                                fileName: "[project]/app/waiter/page.tsx",
                                                lineNumber: 429,
                                                columnNumber: 21
                                            }, this))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/waiter/page.tsx",
                                    lineNumber: 426,
                                    columnNumber: 17
                                }, this),
                                [
                                    'awaiting_waiter',
                                    'pending'
                                ].includes(selOrder.status) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        marginTop: '1rem'
                                    },
                                    children: showCancelFor !== selOrder.id ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>setShowCancelFor(selOrder.id),
                                        style: {
                                            ...btn('#fef2f2', '#ef4444'),
                                            width: '100%',
                                            border: '1px solid #fecaca',
                                            fontSize: '0.8rem'
                                        },
                                        children: "❌ Cancel Order"
                                    }, void 0, false, {
                                        fileName: "[project]/app/waiter/page.tsx",
                                        lineNumber: 442,
                                        columnNumber: 21
                                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            background: '#fef2f2',
                                            borderRadius: 10,
                                            padding: '0.75rem',
                                            border: '1px solid #fecaca'
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                value: cancelReason,
                                                onChange: (e)=>setCancelReason(e.target.value),
                                                placeholder: "Reason for cancellation...",
                                                style: {
                                                    width: '100%',
                                                    boxSizing: 'border-box',
                                                    padding: '0.5rem 0.7rem',
                                                    border: '2px solid #fecaca',
                                                    borderRadius: 8,
                                                    fontFamily: 'Poppins,sans-serif',
                                                    fontSize: '0.82rem',
                                                    marginBottom: '0.5rem'
                                                }
                                            }, void 0, false, {
                                                fileName: "[project]/app/waiter/page.tsx",
                                                lineNumber: 447,
                                                columnNumber: 23
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    display: 'flex',
                                                    gap: '0.4rem'
                                                },
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        onClick: ()=>handleCancel(selOrder),
                                                        style: {
                                                            ...btn('#ef4444'),
                                                            flex: 1,
                                                            fontSize: '0.8rem'
                                                        },
                                                        children: "Confirm Cancel"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/waiter/page.tsx",
                                                        lineNumber: 454,
                                                        columnNumber: 25
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        onClick: ()=>{
                                                            setShowCancelFor(null);
                                                            setCancelReason('');
                                                        },
                                                        style: {
                                                            ...btn('#e5e7eb', '#555'),
                                                            flex: 1,
                                                            fontSize: '0.8rem'
                                                        },
                                                        children: "Keep Order"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/waiter/page.tsx",
                                                        lineNumber: 455,
                                                        columnNumber: 25
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/waiter/page.tsx",
                                                lineNumber: 453,
                                                columnNumber: 23
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/waiter/page.tsx",
                                        lineNumber: 446,
                                        columnNumber: 21
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/app/waiter/page.tsx",
                                    lineNumber: 440,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/waiter/page.tsx",
                            lineNumber: 411,
                            columnNumber: 13
                        }, this),
                        (selOrder.status === 'awaiting_waiter' || selOrder.status === 'prepared') && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                padding: '0.85rem 1.25rem',
                                borderTop: '2px solid #f5f0e8',
                                background: 'white'
                            },
                            children: [
                                selOrder.status === 'awaiting_waiter' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: ()=>{
                                        accept(selOrder);
                                        setSelOrder(null);
                                    },
                                    style: {
                                        ...btn('#f59e0b', '#1A0800'),
                                        width: '100%',
                                        padding: '0.75rem',
                                        fontSize: '0.95rem',
                                        borderRadius: 12
                                    },
                                    children: "✅ Accept & Send to Kitchen"
                                }, void 0, false, {
                                    fileName: "[project]/app/waiter/page.tsx",
                                    lineNumber: 467,
                                    columnNumber: 19
                                }, this),
                                selOrder.status === 'prepared' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: ()=>markServed(selOrder),
                                    style: {
                                        ...btn('#8b5cf6'),
                                        width: '100%',
                                        padding: '0.75rem',
                                        fontSize: '0.95rem',
                                        borderRadius: 12
                                    },
                                    children: "🍽️ Mark as Served"
                                }, void 0, false, {
                                    fileName: "[project]/app/waiter/page.tsx",
                                    lineNumber: 472,
                                    columnNumber: 19
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/waiter/page.tsx",
                            lineNumber: 465,
                            columnNumber: 15
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/waiter/page.tsx",
                    lineNumber: 399,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/waiter/page.tsx",
                lineNumber: 395,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/waiter/page.tsx",
        lineNumber: 164,
        columnNumber: 5
    }, this);
}
_s(WaiterPage, "rGX/U4kOBf/v7Nk7HM2IlOOhIrI=", false, function() {
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