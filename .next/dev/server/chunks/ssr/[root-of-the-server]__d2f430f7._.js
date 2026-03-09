module.exports = [
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/action-async-storage.external.js [external] (next/dist/server/app-render/action-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/action-async-storage.external.js", () => require("next/dist/server/app-render/action-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[project]/claude_work/foodie-lover-next/lib/storage.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// ─── Types ────────────────────────────────────────────────────────────────────
__turbopack_context__.s([
    "DEFAULT_MENU",
    ()=>DEFAULT_MENU,
    "addOrder",
    ()=>addOrder,
    "addWaiterCall",
    ()=>addWaiterCall,
    "applyDiscount",
    ()=>applyDiscount,
    "cancelOrder",
    ()=>cancelOrder,
    "exportOrdersCSV",
    ()=>exportOrdersCSV,
    "getMenu",
    ()=>getMenu,
    "getOrders",
    ()=>getOrders,
    "getOrdersInPeriod",
    ()=>getOrdersInPeriod,
    "getPin",
    ()=>getPin,
    "getStaffSessions",
    ()=>getStaffSessions,
    "getTables",
    ()=>getTables,
    "getWaiterCalls",
    ()=>getWaiterCalls,
    "resolveWaiterCall",
    ()=>resolveWaiterCall,
    "saveMenu",
    ()=>saveMenu,
    "saveOrders",
    ()=>saveOrders,
    "savePin",
    ()=>savePin,
    "saveStaffSessions",
    ()=>saveStaffSessions,
    "saveTables",
    ()=>saveTables,
    "saveWaiterCalls",
    ()=>saveWaiterCalls,
    "updateOrderStatus",
    ()=>updateOrderStatus
]);
// ─── Keys ─────────────────────────────────────────────────────────────────────
const KEYS = {
    orders: 'fl_orders',
    tables: 'fl_tables',
    menu: 'fl_menu',
    pin: 'fl_owner_pin',
    staff: 'fl_staff_sessions',
    calls: 'fl_waiter_calls'
};
// ─── Helpers ──────────────────────────────────────────────────────────────────
function get(key, fallback) {
    if ("TURBOPACK compile-time truthy", 1) return fallback;
    //TURBOPACK unreachable
    ;
}
function set(key, value) {
    if ("TURBOPACK compile-time truthy", 1) return;
    //TURBOPACK unreachable
    ;
}
const getOrders = ()=>get(KEYS.orders, []);
const saveOrders = (o)=>set(KEYS.orders, o);
function addOrder(order) {
    const orders = getOrders();
    // Ensure timeline exists
    if (!order.timeline) order.timeline = [
        {
            status: 'pending',
            timestamp: order.timestamp
        }
    ];
    orders.push(order);
    saveOrders(orders);
}
function updateOrderStatus(orderId, status, by) {
    const orders = getOrders();
    const idx = orders.findIndex((o)=>o.id === orderId);
    if (idx === -1) return;
    orders[idx].status = status;
    if (!orders[idx].timeline) orders[idx].timeline = [];
    orders[idx].timeline.push({
        status,
        timestamp: new Date().toISOString(),
        by
    });
    saveOrders(orders);
}
function cancelOrder(orderId, reason, by) {
    const orders = getOrders();
    const idx = orders.findIndex((o)=>o.id === orderId);
    if (idx === -1) return;
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
}
function applyDiscount(orderId, discount, reason, by) {
    const orders = getOrders();
    const idx = orders.findIndex((o)=>o.id === orderId);
    if (idx === -1) return;
    const sub = orders[idx].subtotal || orders[idx].total;
    orders[idx].discount = discount;
    orders[idx].discountReason = reason;
    orders[idx].total = sub - discount;
    if (!orders[idx].editHistory) orders[idx].editHistory = [];
    orders[idx].editHistory.push({
        timestamp: new Date().toISOString(),
        change: `Discount ₹${discount} applied: ${reason}`,
        by
    });
    saveOrders(orders);
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
        id: `CALL-${Date.now()}`,
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
        if (o.status === 'cancelled') return false; // exclude cancelled from revenue
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
}),
"[project]/claude_work/foodie-lover-next/app/table/page.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>TablePage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/claude_work/foodie-lover-next/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/claude_work/foodie-lover-next/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/claude_work/foodie-lover-next/node_modules/next/navigation.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$lib$2f$storage$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/claude_work/foodie-lover-next/lib/storage.ts [app-ssr] (ecmascript)");
'use client';
;
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
const STATUS_LABEL = {
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
        label: 'Completed',
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
function TrackingBar({ status }) {
    const steps = [
        'pending',
        'preparing',
        'prepared',
        'served',
        'completed'
    ];
    const cur = steps.indexOf(status);
    if (status === 'cancelled') return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        style: {
            background: '#fef2f2',
            borderRadius: '10px',
            padding: '0.6rem 1rem',
            fontSize: '0.82rem',
            color: '#dc2626',
            fontWeight: 700
        },
        children: "❌ Order has been cancelled"
    }, void 0, false, {
        fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
        lineNumber: 26,
        columnNumber: 5
    }, this);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        style: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            marginTop: '0.5rem'
        },
        children: steps.map((step, i)=>{
            const done = i < cur;
            const active = i === cur;
            const info = STATUS_LABEL[step];
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.2rem'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 900,
                            transition: 'all 0.3s',
                            background: done ? '#16a34a' : active ? info.color : '#e5e7eb',
                            color: done || active ? 'white' : '#9ca3af',
                            boxShadow: active ? `0 0 0 3px ${info.color}33` : 'none'
                        },
                        children: done ? '✓' : info.icon
                    }, void 0, false, {
                        fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                        lineNumber: 38,
                        columnNumber: 13
                    }, this),
                    i < steps.length - 1 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            position: 'absolute',
                            width: '100%'
                        }
                    }, void 0, false, {
                        fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                        lineNumber: 48,
                        columnNumber: 15
                    }, this)
                ]
            }, step, true, {
                fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                lineNumber: 37,
                columnNumber: 11
            }, this);
        })
    }, void 0, false, {
        fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
        lineNumber: 31,
        columnNumber: 5
    }, this);
}
function TableContent() {
    const params = (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useSearchParams"])();
    const tableId = parseInt(params.get('table') || '1');
    const [menu, setMenu] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [cart, setCart] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [filter, setFilter] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('All');
    const [cartOpen, setCartOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [name, setName] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('');
    const [showCheckout, setShowCheckout] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [view, setView] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('menu');
    const [activeOrderId, setActiveOrderId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [activeOrder, setActiveOrder] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [allOrders, setAllOrders] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    // Call waiter
    const [callSent, setCallSent] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [callCooldown, setCallCooldown] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const refreshOrders = (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(()=>{
        const orders = (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$lib$2f$storage$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getOrders"])();
        setAllOrders(orders);
        if (activeOrderId) {
            const found = orders.find((o)=>o.id === activeOrderId);
            if (found) setActiveOrder(found);
        }
    }, [
        activeOrderId
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        setMenu((0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$lib$2f$storage$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getMenu"])());
        refreshOrders();
    }, [
        refreshOrders
    ]);
    // Poll for order updates every 4 seconds when in tracking/receipt view
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (view === 'tracking' || view === 'receipt') {
            const t = setInterval(refreshOrders, 4000);
            return ()=>clearInterval(t);
        }
    }, [
        view,
        refreshOrders
    ]);
    // Auto-switch to completed receipt
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (activeOrder?.status === 'completed' && view === 'tracking') {
            setView('receipt');
        }
    }, [
        activeOrder,
        view
    ]);
    const filtered = filter === 'All' ? menu : menu.filter((m)=>m.category === filter);
    const cartTotal = cart.reduce((s, c)=>s + c.item.price * c.qty, 0);
    const cartCount = cart.reduce((s, c)=>s + c.qty, 0);
    // Table's previous orders this session
    const tableOrders = allOrders.filter((o)=>o.tableId === tableId && o.type === 'dine-in').slice(-5).reverse();
    function addToCart(item) {
        setCart((prev)=>{
            const ex = prev.find((c)=>c.item.id === item.id);
            return ex ? prev.map((c)=>c.item.id === item.id ? {
                    ...c,
                    qty: c.qty + 1
                } : c) : [
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
                    qty: c.qty + delta
                } : c).filter((c)=>c.qty > 0));
    }
    function placeOrder() {
        if (!name.trim()) {
            alert('Enter your name');
            return;
        }
        const items = cart.map((c)=>({
                id: c.item.id,
                name: c.item.name,
                category: c.item.category,
                price: c.item.price,
                qty: c.qty,
                subtotal: c.item.price * c.qty
            }));
        const id = `ORD-${Date.now()}`;
        const order = {
            id,
            type: 'dine-in',
            tableId,
            customerName: name.trim(),
            items,
            subtotal: cartTotal,
            discount: 0,
            total: cartTotal,
            payment: 'cod',
            status: 'pending',
            timeline: [
                {
                    status: 'pending',
                    timestamp: new Date().toISOString()
                }
            ],
            timestamp: new Date().toISOString()
        };
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$lib$2f$storage$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["addOrder"])(order);
        setActiveOrderId(id);
        setActiveOrder(order);
        setCart([]);
        setShowCheckout(false);
        setView('tracking');
    }
    function callWaiter(message = 'Assistance needed') {
        if (callCooldown) return;
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$lib$2f$storage$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["addWaiterCall"])(tableId, message, name || undefined);
        setCallSent(true);
        setCallCooldown(true);
        setTimeout(()=>setCallSent(false), 4000);
        setTimeout(()=>setCallCooldown(false), 30000); // 30-second cooldown
    }
    const inp = {
        width: '100%',
        padding: '0.6rem 0.75rem',
        border: '2px solid #e5e7eb',
        borderRadius: '8px',
        fontFamily: 'Poppins,sans-serif',
        fontSize: '0.9rem'
    };
    // ── TRACKING VIEW ─────────────────────────────────────────────────────────
    if (view === 'tracking' && activeOrder) {
        const info = STATUS_LABEL[activeOrder.status] || STATUS_LABEL['pending'];
        const stepIdx = FLOW.indexOf(activeOrder.status);
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: {
                minHeight: '100vh',
                background: 'linear-gradient(135deg,#1A0800,#2D0F00)',
                color: 'white',
                fontFamily: 'Poppins,sans-serif',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '2rem 1rem'
            },
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    width: '100%',
                    maxWidth: '440px'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            textAlign: 'center',
                            marginBottom: '2rem'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    fontSize: '3rem',
                                    marginBottom: '0.5rem'
                                },
                                children: info.icon
                            }, void 0, false, {
                                fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                lineNumber: 164,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    fontFamily: "'Playfair Display',serif",
                                    fontSize: '1.6rem',
                                    fontWeight: 900
                                },
                                children: [
                                    "Table ",
                                    tableId
                                ]
                            }, void 0, true, {
                                fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                lineNumber: 165,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    color: '#F9A826',
                                    fontSize: '0.85rem'
                                },
                                children: [
                                    "Order • ",
                                    activeOrder.id
                                ]
                            }, void 0, true, {
                                fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                lineNumber: 166,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                        lineNumber: 163,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            background: 'rgba(255,255,255,0.08)',
                            borderRadius: '16px',
                            padding: '1.5rem',
                            marginBottom: '1.25rem',
                            border: `2px solid ${info.color}44`,
                            textAlign: 'center'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    fontSize: '1.1rem',
                                    fontWeight: 800,
                                    color: info.color,
                                    marginBottom: '0.5rem'
                                },
                                children: info.label
                            }, void 0, false, {
                                fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                lineNumber: 171,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(TrackingBar, {
                                status: activeOrder.status
                            }, void 0, false, {
                                fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                lineNumber: 172,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    marginTop: '1rem',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    fontSize: '0.72rem',
                                    color: '#aaa'
                                },
                                children: FLOW.map((step, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            textAlign: 'center',
                                            flex: 1,
                                            color: i <= stepIdx ? 'white' : '#666',
                                            fontWeight: i === stepIdx ? 700 : 400,
                                            fontSize: '0.65rem'
                                        },
                                        children: STATUS_LABEL[step]?.label?.split(' ')[0]
                                    }, step, false, {
                                        fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                        lineNumber: 175,
                                        columnNumber: 17
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                lineNumber: 173,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                        lineNumber: 170,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            background: 'rgba(255,255,255,0.06)',
                            borderRadius: '12px',
                            padding: '1rem',
                            marginBottom: '1.25rem'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                    color: '#F9A826',
                                    marginBottom: '0.6rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                },
                                children: "Your Order"
                            }, void 0, false, {
                                fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                lineNumber: 184,
                                columnNumber: 13
                            }, this),
                            (activeOrder.items || []).map((item, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        padding: '0.3rem 0',
                                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                                        fontSize: '0.85rem'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            style: {
                                                color: '#ddd'
                                            },
                                            children: [
                                                item.name,
                                                " ",
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    style: {
                                                        color: '#888'
                                                    },
                                                    children: [
                                                        "×",
                                                        item.qty
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                                    lineNumber: 187,
                                                    columnNumber: 61
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                            lineNumber: 187,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            style: {
                                                fontWeight: 700,
                                                color: '#F9A826'
                                            },
                                            children: [
                                                "₹",
                                                item.subtotal ?? item.price * item.qty
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                            lineNumber: 188,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, i, true, {
                                    fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                    lineNumber: 186,
                                    columnNumber: 15
                                }, this)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    fontWeight: 800,
                                    marginTop: '0.6rem',
                                    fontSize: '0.95rem'
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        style: {
                                            color: '#ddd'
                                        },
                                        children: "Total"
                                    }, void 0, false, {
                                        fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                        lineNumber: 192,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        style: {
                                            color: '#E65C00'
                                        },
                                        children: [
                                            "₹",
                                            activeOrder.total
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                        lineNumber: 193,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                lineNumber: 191,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                        lineNumber: 183,
                        columnNumber: 11
                    }, this),
                    (activeOrder.timeline || []).length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            background: 'rgba(255,255,255,0.06)',
                            borderRadius: '12px',
                            padding: '1rem',
                            marginBottom: '1.25rem'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                    color: '#F9A826',
                                    marginBottom: '0.6rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                },
                                children: "Order Timeline"
                            }, void 0, false, {
                                fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                lineNumber: 200,
                                columnNumber: 15
                            }, this),
                            activeOrder.timeline.map((ev, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        padding: '0.3rem 0'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                width: '8px',
                                                height: '8px',
                                                borderRadius: '50%',
                                                background: STATUS_LABEL[ev.status]?.color || '#888',
                                                flexShrink: 0
                                            }
                                        }, void 0, false, {
                                            fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                            lineNumber: 203,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            style: {
                                                color: STATUS_LABEL[ev.status]?.color || '#aaa',
                                                fontWeight: 700,
                                                fontSize: '0.8rem',
                                                textTransform: 'capitalize',
                                                minWidth: '70px'
                                            },
                                            children: ev.status
                                        }, void 0, false, {
                                            fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                            lineNumber: 204,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            style: {
                                                color: '#888',
                                                fontSize: '0.75rem'
                                            },
                                            children: new Date(ev.timestamp).toLocaleTimeString('en-IN', {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })
                                        }, void 0, false, {
                                            fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                            lineNumber: 205,
                                            columnNumber: 19
                                        }, this),
                                        ev.by && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            style: {
                                                color: '#666',
                                                fontSize: '0.72rem'
                                            },
                                            children: [
                                                "by ",
                                                ev.by
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                            lineNumber: 206,
                                            columnNumber: 29
                                        }, this)
                                    ]
                                }, i, true, {
                                    fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                    lineNumber: 202,
                                    columnNumber: 17
                                }, this))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                        lineNumber: 199,
                        columnNumber: 13
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            display: 'flex',
                            gap: '0.75rem',
                            marginBottom: '1rem'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>callWaiter('Customer needs assistance'),
                                disabled: callCooldown,
                                style: {
                                    flex: 1,
                                    padding: '0.75rem',
                                    borderRadius: '12px',
                                    border: 'none',
                                    cursor: callCooldown ? 'not-allowed' : 'pointer',
                                    fontWeight: 700,
                                    fontFamily: 'Poppins,sans-serif',
                                    fontSize: '0.88rem',
                                    background: callSent ? '#16a34a' : callCooldown ? '#374151' : '#F9A826',
                                    color: callCooldown && !callSent ? '#9ca3af' : '#1A0800',
                                    transition: 'all 0.3s'
                                },
                                children: callSent ? '✅ Waiter Notified!' : callCooldown ? '⏳ Please wait...' : '🔔 Call Waiter'
                            }, void 0, false, {
                                fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                lineNumber: 214,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>setView('menu'),
                                style: {
                                    flex: 1,
                                    padding: '0.75rem',
                                    borderRadius: '12px',
                                    border: '2px solid rgba(255,255,255,0.2)',
                                    background: 'transparent',
                                    cursor: 'pointer',
                                    fontWeight: 700,
                                    fontFamily: 'Poppins,sans-serif',
                                    fontSize: '0.88rem',
                                    color: 'white'
                                },
                                children: "➕ Order More"
                            }, void 0, false, {
                                fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                lineNumber: 218,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                        lineNumber: 213,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                lineNumber: 161,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
            lineNumber: 160,
            columnNumber: 7
        }, this);
    }
    // ── RECEIPT VIEW ──────────────────────────────────────────────────────────
    if (view === 'receipt' && activeOrder) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: {
                minHeight: '100vh',
                background: 'linear-gradient(135deg,#faf8f3,#f5f0e8)',
                fontFamily: 'Poppins,sans-serif',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '2rem 1rem'
            },
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    width: '100%',
                    maxWidth: '420px'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            textAlign: 'center',
                            marginBottom: '1.5rem'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    fontSize: '3.5rem',
                                    marginBottom: '0.5rem'
                                },
                                children: "🎉"
                            }, void 0, false, {
                                fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                lineNumber: 234,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    fontFamily: "'Playfair Display',serif",
                                    fontSize: '1.5rem',
                                    fontWeight: 900,
                                    color: '#1A0800'
                                },
                                children: "Thank You!"
                            }, void 0, false, {
                                fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                lineNumber: 235,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    fontSize: '0.85rem',
                                    color: '#888'
                                },
                                children: "Hope you enjoyed your meal"
                            }, void 0, false, {
                                fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                lineNumber: 236,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                        lineNumber: 233,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            background: 'white',
                            borderRadius: '16px',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                            overflow: 'hidden',
                            marginBottom: '1rem'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    background: 'linear-gradient(135deg,#1A0800,#E65C00)',
                                    color: 'white',
                                    padding: '1rem 1.5rem',
                                    textAlign: 'center'
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            fontFamily: "'Playfair Display',serif",
                                            fontWeight: 900,
                                            fontSize: '1.1rem'
                                        },
                                        children: "Foodie Lover"
                                    }, void 0, false, {
                                        fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                        lineNumber: 242,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            fontSize: '0.72rem',
                                            opacity: 0.8
                                        },
                                        children: [
                                            "Table ",
                                            tableId,
                                            " • ",
                                            activeOrder.id
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                        lineNumber: 243,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            fontSize: '0.7rem',
                                            opacity: 0.7
                                        },
                                        children: new Date(activeOrder.timestamp).toLocaleString('en-IN')
                                    }, void 0, false, {
                                        fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                        lineNumber: 244,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                lineNumber: 241,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    padding: '1rem 1.5rem'
                                },
                                children: [
                                    (activeOrder.items || []).map((item, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                padding: '0.35rem 0',
                                                borderBottom: '1px solid #f5f0e8',
                                                fontSize: '0.85rem'
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    style: {
                                                        color: '#333'
                                                    },
                                                    children: [
                                                        item.name,
                                                        " ",
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            style: {
                                                                color: '#aaa',
                                                                fontSize: '0.75rem'
                                                            },
                                                            children: [
                                                                "×",
                                                                item.qty
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                                            lineNumber: 249,
                                                            columnNumber: 63
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                                    lineNumber: 249,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    style: {
                                                        fontWeight: 700,
                                                        color: '#1A0800'
                                                    },
                                                    children: [
                                                        "₹",
                                                        item.subtotal ?? item.price * item.qty
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                                    lineNumber: 250,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, i, true, {
                                            fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                            lineNumber: 248,
                                            columnNumber: 17
                                        }, this)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            paddingTop: '0.6rem'
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    fontSize: '0.85rem',
                                                    color: '#666',
                                                    marginBottom: '0.25rem'
                                                },
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        children: "Subtotal"
                                                    }, void 0, false, {
                                                        fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                                        lineNumber: 255,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        children: [
                                                            "₹",
                                                            activeOrder.subtotal
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                                        lineNumber: 255,
                                                        columnNumber: 40
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                                lineNumber: 254,
                                                columnNumber: 17
                                            }, this),
                                            activeOrder.discount > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    fontSize: '0.85rem',
                                                    color: '#16a34a',
                                                    marginBottom: '0.25rem'
                                                },
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        children: "Discount"
                                                    }, void 0, false, {
                                                        fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                                        lineNumber: 259,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        children: [
                                                            "−₹",
                                                            activeOrder.discount
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                                        lineNumber: 259,
                                                        columnNumber: 42
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                                lineNumber: 258,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    fontWeight: 900,
                                                    fontSize: '1rem',
                                                    color: '#E65C00',
                                                    paddingTop: '0.4rem',
                                                    borderTop: '2px solid #f5f0e8'
                                                },
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        children: "Total"
                                                    }, void 0, false, {
                                                        fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                                        lineNumber: 263,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        children: [
                                                            "₹",
                                                            activeOrder.total
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                                        lineNumber: 263,
                                                        columnNumber: 37
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                                lineNumber: 262,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                        lineNumber: 253,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                lineNumber: 246,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    background: '#f9fafb',
                                    padding: '0.75rem 1.5rem',
                                    fontSize: '0.75rem',
                                    color: '#888',
                                    textAlign: 'center'
                                },
                                children: [
                                    "Customer: ",
                                    activeOrder.customerName,
                                    " • Payment: ",
                                    activeOrder.payment === 'cod' ? 'Cash' : activeOrder.payment
                                ]
                            }, void 0, true, {
                                fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                lineNumber: 267,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                        lineNumber: 240,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>setView('menu'),
                        style: {
                            width: '100%',
                            padding: '0.85rem',
                            background: '#E65C00',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            fontWeight: 700,
                            fontSize: '1rem',
                            cursor: 'pointer',
                            fontFamily: 'Poppins,sans-serif'
                        },
                        children: "🍽️ Order Again"
                    }, void 0, false, {
                        fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                        lineNumber: 272,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                lineNumber: 232,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
            lineNumber: 231,
            columnNumber: 7
        }, this);
    }
    // ── MENU VIEW (default) ────────────────────────────────────────────────────
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        style: {
            minHeight: '100vh',
            background: 'linear-gradient(135deg,#faf8f3,#f5f0e8)',
            fontFamily: 'Poppins,sans-serif'
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    background: 'linear-gradient(135deg,#1A0800,#2D0F00)',
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
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    fontFamily: "'Playfair Display',serif",
                                    fontSize: '1.2rem',
                                    fontWeight: 900
                                },
                                children: [
                                    "🍽️ Table ",
                                    tableId
                                ]
                            }, void 0, true, {
                                fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                lineNumber: 286,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    fontSize: '0.72rem',
                                    color: '#F9A826'
                                },
                                children: "Scan & Order"
                            }, void 0, false, {
                                fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                lineNumber: 287,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                        lineNumber: 285,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            display: 'flex',
                            gap: '0.6rem',
                            alignItems: 'center'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>callWaiter('Assistance needed'),
                                disabled: callCooldown,
                                style: {
                                    background: callSent ? '#16a34a' : callCooldown ? '#4b5563' : '#F9A826',
                                    border: 'none',
                                    color: callCooldown && !callSent ? '#9ca3af' : '#1A0800',
                                    padding: '0.45rem 0.85rem',
                                    borderRadius: '20px',
                                    fontWeight: 700,
                                    cursor: callCooldown ? 'not-allowed' : 'pointer',
                                    fontSize: '0.72rem',
                                    fontFamily: 'Poppins,sans-serif'
                                },
                                children: callSent ? '✅ Called!' : '🔔 Call Waiter'
                            }, void 0, false, {
                                fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                lineNumber: 291,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>setCartOpen(true),
                                style: {
                                    background: '#E65C00',
                                    border: 'none',
                                    color: 'white',
                                    padding: '0.45rem 1rem',
                                    borderRadius: '20px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    fontSize: '0.82rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    fontFamily: 'Poppins,sans-serif'
                                },
                                children: [
                                    "🛒 ",
                                    cartCount > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        style: {
                                            background: 'white',
                                            color: '#E65C00',
                                            borderRadius: '50%',
                                            width: '18px',
                                            height: '18px',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '0.7rem',
                                            fontWeight: 900
                                        },
                                        children: cartCount
                                    }, void 0, false, {
                                        fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                        lineNumber: 297,
                                        columnNumber: 34
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                lineNumber: 296,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                        lineNumber: 289,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                lineNumber: 284,
                columnNumber: 7
            }, this),
            tableOrders.find((o)=>[
                    'pending',
                    'preparing',
                    'prepared',
                    'served'
                ].includes(o.status)) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    background: '#fff7ed',
                    borderBottom: '2px solid #fed7aa',
                    padding: '0.65rem 1.5rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                },
                onClick: ()=>{
                    const o = tableOrders.find((o)=>[
                            'pending',
                            'preparing',
                            'prepared',
                            'served'
                        ].includes(o.status));
                    if (o) {
                        setActiveOrderId(o.id);
                        setActiveOrder(o);
                        setView('tracking');
                    }
                },
                style: {
                    cursor: 'pointer',
                    background: '#fff7ed',
                    borderBottom: '2px solid #fed7aa',
                    padding: '0.65rem 1.5rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    fontSize: '0.82rem',
                                    fontWeight: 700,
                                    color: '#92400e'
                                },
                                children: "📋 Order in Progress"
                            }, void 0, false, {
                                fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                lineNumber: 308,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    fontSize: '0.7rem',
                                    color: '#b45309'
                                },
                                children: (()=>{
                                    const o = tableOrders.find((o)=>[
                                            'pending',
                                            'preparing',
                                            'prepared',
                                            'served'
                                        ].includes(o.status));
                                    return o ? `${STATUS_LABEL[o.status]?.label} — ${o.id}` : '';
                                })()
                            }, void 0, false, {
                                fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                lineNumber: 309,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                        lineNumber: 307,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        style: {
                            fontSize: '0.75rem',
                            color: '#E65C00',
                            fontWeight: 700
                        },
                        children: "Track →"
                    }, void 0, false, {
                        fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                        lineNumber: 313,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                lineNumber: 304,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    gap: '0.4rem',
                    overflowX: 'auto'
                },
                children: CATEGORIES.map((cat)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>setFilter(cat),
                        style: {
                            padding: '0.35rem 0.85rem',
                            borderRadius: '20px',
                            border: `2px solid ${filter === cat ? '#E65C00' : '#ddd'}`,
                            background: filter === cat ? '#E65C00' : 'white',
                            color: filter === cat ? 'white' : '#666',
                            fontWeight: 600,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            fontSize: '0.78rem',
                            fontFamily: 'Poppins,sans-serif'
                        },
                        children: cat
                    }, cat, false, {
                        fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                        lineNumber: 320,
                        columnNumber: 11
                    }, this))
            }, void 0, false, {
                fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                lineNumber: 318,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    padding: '0 1rem 5rem',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))',
                    gap: '0.85rem'
                },
                children: filtered.filter((item)=>item.available !== false).map((item)=>{
                    const inCart = cart.find((c)=>c.item.id === item.id);
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            background: 'white',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                        },
                        children: [
                            item.img && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                src: item.img,
                                alt: item.name,
                                style: {
                                    width: '100%',
                                    height: '140px',
                                    objectFit: 'cover'
                                }
                            }, void 0, false, {
                                fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                lineNumber: 330,
                                columnNumber: 28
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    padding: '0.85rem'
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            fontWeight: 700,
                                            fontSize: '0.9rem',
                                            color: '#1A0800',
                                            marginBottom: '0.2rem'
                                        },
                                        children: item.name
                                    }, void 0, false, {
                                        fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                        lineNumber: 332,
                                        columnNumber: 17
                                    }, this),
                                    item.badge && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        style: {
                                            fontSize: '0.62rem',
                                            background: '#FFF5EB',
                                            color: '#E65C00',
                                            padding: '0.1rem 0.35rem',
                                            borderRadius: '6px',
                                            fontWeight: 700
                                        },
                                        children: BADGE_LABELS[item.badge] || item.badge
                                    }, void 0, false, {
                                        fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                        lineNumber: 333,
                                        columnNumber: 32
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            fontSize: '0.74rem',
                                            color: '#888',
                                            margin: '0.3rem 0 0.6rem',
                                            lineHeight: '1.3'
                                        },
                                        children: item.desc
                                    }, void 0, false, {
                                        fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                        lineNumber: 334,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                style: {
                                                    fontWeight: 900,
                                                    color: '#E65C00'
                                                },
                                                children: [
                                                    "₹",
                                                    item.price
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                                lineNumber: 336,
                                                columnNumber: 19
                                            }, this),
                                            inCart ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.4rem'
                                                },
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        onClick: ()=>changeQty(item.id, -1),
                                                        style: {
                                                            width: '26px',
                                                            height: '26px',
                                                            borderRadius: '50%',
                                                            border: '2px solid #E65C00',
                                                            background: 'white',
                                                            color: '#E65C00',
                                                            fontWeight: 900,
                                                            cursor: 'pointer',
                                                            fontSize: '0.9rem'
                                                        },
                                                        children: "−"
                                                    }, void 0, false, {
                                                        fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                                        lineNumber: 339,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        style: {
                                                            fontWeight: 800,
                                                            minWidth: '18px',
                                                            textAlign: 'center'
                                                        },
                                                        children: inCart.qty
                                                    }, void 0, false, {
                                                        fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                                        lineNumber: 340,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        onClick: ()=>changeQty(item.id, 1),
                                                        style: {
                                                            width: '26px',
                                                            height: '26px',
                                                            borderRadius: '50%',
                                                            background: '#E65C00',
                                                            border: 'none',
                                                            color: 'white',
                                                            fontWeight: 900,
                                                            cursor: 'pointer',
                                                            fontSize: '0.9rem'
                                                        },
                                                        children: "+"
                                                    }, void 0, false, {
                                                        fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                                        lineNumber: 341,
                                                        columnNumber: 23
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                                lineNumber: 338,
                                                columnNumber: 21
                                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                onClick: ()=>addToCart(item),
                                                style: {
                                                    background: '#E65C00',
                                                    color: 'white',
                                                    border: 'none',
                                                    padding: '0.35rem 0.85rem',
                                                    borderRadius: '20px',
                                                    fontWeight: 700,
                                                    cursor: 'pointer',
                                                    fontSize: '0.78rem',
                                                    fontFamily: 'Poppins,sans-serif'
                                                },
                                                children: "+ Add"
                                            }, void 0, false, {
                                                fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                                lineNumber: 344,
                                                columnNumber: 21
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                        lineNumber: 335,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                lineNumber: 331,
                                columnNumber: 15
                            }, this)
                        ]
                    }, item.id, true, {
                        fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                        lineNumber: 329,
                        columnNumber: 13
                    }, this);
                })
            }, void 0, false, {
                fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                lineNumber: 325,
                columnNumber: 7
            }, this),
            cartOpen && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "modal-overlay show",
                onClick: ()=>setCartOpen(false),
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    onClick: (e)=>e.stopPropagation(),
                    style: {
                        background: 'white',
                        borderRadius: '16px',
                        width: '100%',
                        maxWidth: '420px',
                        maxHeight: '88vh',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                background: 'linear-gradient(135deg,#1A0800,#E65C00)',
                                color: 'white',
                                padding: '1rem 1.5rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    style: {
                                        fontFamily: "'Playfair Display',serif",
                                        fontWeight: 900
                                    },
                                    children: [
                                        "🛒 Cart — Table ",
                                        tableId
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                    lineNumber: 358,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: ()=>setCartOpen(false),
                                    style: {
                                        background: 'none',
                                        border: 'none',
                                        color: 'white',
                                        fontSize: '1.4rem',
                                        cursor: 'pointer'
                                    },
                                    children: "×"
                                }, void 0, false, {
                                    fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                    lineNumber: 359,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                            lineNumber: 357,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                flex: 1,
                                overflowY: 'auto',
                                padding: '1rem 1.5rem'
                            },
                            children: !cart.length ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                style: {
                                    color: '#999',
                                    textAlign: 'center',
                                    padding: '2rem 0'
                                },
                                children: "Cart is empty"
                            }, void 0, false, {
                                fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                lineNumber: 362,
                                columnNumber: 31
                            }, this) : cart.map((c)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '0.6rem 0',
                                        borderBottom: '1px solid #f5f0e8'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    style: {
                                                        fontWeight: 600,
                                                        fontSize: '0.88rem'
                                                    },
                                                    children: c.item.name
                                                }, void 0, false, {
                                                    fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                                    lineNumber: 364,
                                                    columnNumber: 24
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    style: {
                                                        fontSize: '0.75rem',
                                                        color: '#888'
                                                    },
                                                    children: [
                                                        "₹",
                                                        c.item.price,
                                                        " × ",
                                                        c.qty
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                                    lineNumber: 364,
                                                    columnNumber: 97
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                            lineNumber: 364,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.4rem'
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    onClick: ()=>changeQty(c.item.id, -1),
                                                    style: {
                                                        width: '24px',
                                                        height: '24px',
                                                        borderRadius: '50%',
                                                        border: '2px solid #E65C00',
                                                        background: 'white',
                                                        color: '#E65C00',
                                                        fontWeight: 900,
                                                        cursor: 'pointer'
                                                    },
                                                    children: "−"
                                                }, void 0, false, {
                                                    fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                                    lineNumber: 366,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    style: {
                                                        fontWeight: 800,
                                                        minWidth: '16px',
                                                        textAlign: 'center'
                                                    },
                                                    children: c.qty
                                                }, void 0, false, {
                                                    fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                                    lineNumber: 367,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    onClick: ()=>changeQty(c.item.id, 1),
                                                    style: {
                                                        width: '24px',
                                                        height: '24px',
                                                        borderRadius: '50%',
                                                        background: '#E65C00',
                                                        border: 'none',
                                                        color: 'white',
                                                        fontWeight: 900,
                                                        cursor: 'pointer'
                                                    },
                                                    children: "+"
                                                }, void 0, false, {
                                                    fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                                    lineNumber: 368,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                            lineNumber: 365,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, c.item.id, true, {
                                    fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                    lineNumber: 363,
                                    columnNumber: 17
                                }, this))
                        }, void 0, false, {
                            fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                            lineNumber: 361,
                            columnNumber: 13
                        }, this),
                        cart.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                padding: '1rem 1.5rem',
                                borderTop: '2px solid #f5f0e8'
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        fontWeight: 900,
                                        fontSize: '1rem',
                                        marginBottom: '0.75rem',
                                        color: '#1A0800'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            children: "Total"
                                        }, void 0, false, {
                                            fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                            lineNumber: 375,
                                            columnNumber: 161
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            style: {
                                                color: '#E65C00'
                                            },
                                            children: [
                                                "₹",
                                                cartTotal
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                            lineNumber: 375,
                                            columnNumber: 179
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                    lineNumber: 375,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: ()=>{
                                        setCartOpen(false);
                                        setShowCheckout(true);
                                    },
                                    style: {
                                        width: '100%',
                                        background: '#E65C00',
                                        color: 'white',
                                        border: 'none',
                                        padding: '0.7rem',
                                        borderRadius: '10px',
                                        fontWeight: 700,
                                        fontSize: '0.95rem',
                                        cursor: 'pointer',
                                        fontFamily: 'Poppins,sans-serif'
                                    },
                                    children: "Place Order →"
                                }, void 0, false, {
                                    fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                    lineNumber: 376,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                            lineNumber: 374,
                            columnNumber: 15
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                    lineNumber: 356,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                lineNumber: 355,
                columnNumber: 9
            }, this),
            showCheckout && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "modal-overlay show",
                onClick: ()=>setShowCheckout(false),
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    onClick: (e)=>e.stopPropagation(),
                    style: {
                        background: 'white',
                        borderRadius: '16px',
                        width: '100%',
                        maxWidth: '380px',
                        padding: '2rem'
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                            style: {
                                fontFamily: "'Playfair Display',serif",
                                marginBottom: '0.5rem',
                                color: '#1A0800'
                            },
                            children: "Your Name"
                        }, void 0, false, {
                            fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                            lineNumber: 387,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            style: {
                                fontSize: '0.78rem',
                                color: '#888',
                                marginBottom: '1rem'
                            },
                            children: "We'll use this to track your order status."
                        }, void 0, false, {
                            fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                            lineNumber: 388,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                            value: name,
                            onChange: (e)=>setName(e.target.value),
                            onKeyDown: (e)=>e.key === 'Enter' && placeOrder(),
                            placeholder: "Enter your name",
                            style: {
                                ...inp,
                                marginBottom: '1rem'
                            },
                            autoFocus: true
                        }, void 0, false, {
                            fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                            lineNumber: 389,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: placeOrder,
                            style: {
                                width: '100%',
                                background: '#E65C00',
                                color: 'white',
                                border: 'none',
                                padding: '0.75rem',
                                borderRadius: '10px',
                                fontWeight: 700,
                                fontSize: '1rem',
                                cursor: 'pointer',
                                fontFamily: 'Poppins,sans-serif'
                            },
                            children: "✅ Confirm Order"
                        }, void 0, false, {
                            fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                            lineNumber: 392,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                    lineNumber: 386,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                lineNumber: 385,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
        lineNumber: 282,
        columnNumber: 5
    }, this);
}
function TablePage() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Suspense"], {
        fallback: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                fontFamily: 'Poppins,sans-serif',
                color: '#E65C00',
                fontSize: '1.1rem'
            },
            children: "Loading menu..."
        }, void 0, false, {
            fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
            lineNumber: 402,
            columnNumber: 25
        }, void 0),
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(TableContent, {}, void 0, false, {
            fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
            lineNumber: 403,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
        lineNumber: 402,
        columnNumber: 5
    }, this);
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__d2f430f7._.js.map