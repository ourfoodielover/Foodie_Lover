module.exports = [
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[project]/lib/storage.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// ─── Types ────────────────────────────────────────────────────────────────────
__turbopack_context__.s([
    "DEFAULT_MENU",
    ()=>DEFAULT_MENU,
    "VALID_TRANSITIONS",
    ()=>VALID_TRANSITIONS,
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
    "getPriorityOrders",
    ()=>getPriorityOrders,
    "getStaffSessions",
    ()=>getStaffSessions,
    "getTables",
    ()=>getTables,
    "getWaiterCalls",
    ()=>getWaiterCalls,
    "isValidTransition",
    ()=>isValidTransition,
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
    calls: 'fl_waiter_calls',
    priority: 'fl_priority_orders'
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
const VALID_TRANSITIONS = {
    pending: [
        'preparing',
        'cancelled'
    ],
    preparing: [
        'prepared',
        'cancelled'
    ],
    prepared: [
        'served'
    ],
    served: [
        'completed'
    ],
    completed: [],
    cancelled: []
};
function isValidTransition(from, to) {
    const allowed = VALID_TRANSITIONS[from];
    return allowed ? allowed.includes(to) : false;
}
const getOrders = ()=>get(KEYS.orders, []);
const saveOrders = (o)=>set(KEYS.orders, o);
function addOrder(order) {
    const orders = getOrders();
    // Guard: block duplicate IDs (rapid double-submit protection)
    if (orders.some((o)=>o.id === order.id)) return;
    // Ensure timeline is always initialised
    if (!order.timeline || !order.timeline.length) {
        order.timeline = [
            {
                status: 'pending',
                timestamp: order.timestamp
            }
        ];
    }
    orders.push(order);
    saveOrders(orders);
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
    return true;
}
function cancelOrder(orderId, reason, by) {
    const orders = getOrders();
    const idx = orders.findIndex((o)=>o.id === orderId);
    if (idx === -1) return false;
    // Only allow cancellation from cancellable states
    const cancellable = [
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
            'pending',
            'preparing',
            'prepared'
        ].includes(o.status)).map((o)=>o.id));
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
"[project]/app/page.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>CustomerPage
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
function CustomerPage() {
    const [menu, setMenu] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [cart, setCart] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [filter, setFilter] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('All');
    const [cartOpen, setCartOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [orderPlaced, setOrderPlaced] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [lastOrderId, setLastOrderId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('');
    const [form, setForm] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])({
        name: '',
        phone: '',
        type: 'pickup',
        payment: 'cod',
        tableNo: ''
    });
    const [showCheckout, setShowCheckout] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [isSubmitting, setIsSubmitting] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    // Ref prevents double-submit even before React re-renders
    const submittingRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        setMenu((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getMenu"])());
    }, []);
    // Close modals on Escape key
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        function handleKey(e) {
            if (e.key === 'Escape') {
                if (!isSubmitting) {
                    setCartOpen(false);
                    setShowCheckout(false);
                }
            }
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
                if (ex.qty >= MAX_QTY) return prev; // cap quantity
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
        if (form.type === 'dine-in' && !form.tableNo.trim()) {
            alert('Please enter your table number');
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
            // Add random suffix to prevent timestamp collisions on rapid clicks
            const id = `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
            const items = cart.map((c)=>({
                    id: c.item.id,
                    name: c.item.name,
                    category: c.item.category,
                    price: c.item.price,
                    qty: c.qty,
                    subtotal: c.item.price * c.qty
                }));
            const tableId = form.type === 'dine-in' ? parseInt(form.tableNo.trim()) || undefined : undefined;
            const order = {
                id,
                type: form.type,
                tableId,
                customerName: form.name.trim(),
                phone: form.phone.trim() || undefined,
                items,
                subtotal: cartTotal,
                discount: 0,
                total: cartTotal,
                payment: form.payment,
                status: 'pending',
                timeline: [
                    {
                        status: 'pending',
                        timestamp: ts
                    }
                ],
                timestamp: ts
            };
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["addOrder"])(order);
            setLastOrderId(id);
            setCart([]);
            setShowCheckout(false);
            setOrderPlaced(true);
            setTimeout(()=>setOrderPlaced(false), 6000);
        } finally{
            submittingRef.current = false;
            setIsSubmitting(false);
        }
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        style: {
            minHeight: '100vh',
            background: 'linear-gradient(135deg,#faf8f3,#f5f0e8)'
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    background: 'linear-gradient(135deg,#1A0800,#2D0F00)',
                    color: 'white',
                    padding: '1.25rem 2rem',
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
                                    fontSize: '1.4rem',
                                    fontWeight: 900
                                },
                                children: "🍽️ Foodie Lover"
                            }, void 0, false, {
                                fileName: "[project]/app/page.tsx",
                                lineNumber: 119,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    fontSize: '0.8rem',
                                    color: '#F9A826'
                                },
                                children: "Pickup & Dine-In Ordering"
                            }, void 0, false, {
                                fileName: "[project]/app/page.tsx",
                                lineNumber: 120,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/page.tsx",
                        lineNumber: 118,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>setCartOpen(true),
                        style: {
                            background: '#E65C00',
                            border: 'none',
                            color: 'white',
                            padding: '0.6rem 1.2rem',
                            borderRadius: '20px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        },
                        children: [
                            "🛒 Cart",
                            cartCount > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                style: {
                                    background: 'white',
                                    color: '#E65C00',
                                    borderRadius: '50%',
                                    width: '20px',
                                    height: '20px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.75rem',
                                    fontWeight: 900
                                },
                                children: cartCount
                            }, void 0, false, {
                                fileName: "[project]/app/page.tsx",
                                lineNumber: 128,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/page.tsx",
                        lineNumber: 122,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/page.tsx",
                lineNumber: 117,
                columnNumber: 7
            }, this),
            orderPlaced && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    background: '#dcfce7',
                    border: '1px solid #86efac',
                    color: '#15803d',
                    padding: '1rem 2rem',
                    textAlign: 'center',
                    fontWeight: 700
                },
                children: [
                    "✅ Order placed successfully! Order ID: ",
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                        children: lastOrderId
                    }, void 0, false, {
                        fileName: "[project]/app/page.tsx",
                        lineNumber: 138,
                        columnNumber: 50
                    }, this),
                    " — We'll prepare it shortly."
                ]
            }, void 0, true, {
                fileName: "[project]/app/page.tsx",
                lineNumber: 137,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    padding: '1rem 1.5rem',
                    display: 'flex',
                    gap: '0.5rem',
                    overflowX: 'auto'
                },
                children: CATEGORIES.map((cat)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>setFilter(cat),
                        style: {
                            padding: '0.4rem 1rem',
                            borderRadius: '20px',
                            border: '2px solid',
                            borderColor: filter === cat ? '#E65C00' : '#ddd',
                            background: filter === cat ? '#E65C00' : 'white',
                            color: filter === cat ? 'white' : '#666',
                            fontWeight: 600,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            fontSize: '0.82rem',
                            fontFamily: 'Poppins,sans-serif'
                        },
                        children: cat
                    }, cat, false, {
                        fileName: "[project]/app/page.tsx",
                        lineNumber: 145,
                        columnNumber: 11
                    }, this))
            }, void 0, false, {
                fileName: "[project]/app/page.tsx",
                lineNumber: 143,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    padding: '0 1.5rem 6rem',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))',
                    gap: '1rem'
                },
                children: filtered.map((item)=>{
                    const inCart = cart.find((c)=>c.item.id === item.id);
                    const atMax = inCart && inCart.qty >= MAX_QTY;
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            background: 'white',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                        },
                        children: [
                            item.img && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                src: item.img,
                                alt: item.name,
                                style: {
                                    width: '100%',
                                    height: '160px',
                                    objectFit: 'cover'
                                }
                            }, void 0, false, {
                                fileName: "[project]/app/page.tsx",
                                lineNumber: 159,
                                columnNumber: 28
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    padding: '1rem'
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'flex-start',
                                            marginBottom: '0.3rem'
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    fontWeight: 700,
                                                    fontSize: '0.95rem',
                                                    color: '#1A0800'
                                                },
                                                children: item.name
                                            }, void 0, false, {
                                                fileName: "[project]/app/page.tsx",
                                                lineNumber: 162,
                                                columnNumber: 19
                                            }, this),
                                            item.badge && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                style: {
                                                    fontSize: '0.65rem',
                                                    background: '#FFF5EB',
                                                    color: '#E65C00',
                                                    padding: '0.15rem 0.4rem',
                                                    borderRadius: '8px',
                                                    fontWeight: 700,
                                                    whiteSpace: 'nowrap',
                                                    marginLeft: '0.5rem'
                                                },
                                                children: BADGE_LABELS[item.badge] || item.badge
                                            }, void 0, false, {
                                                fileName: "[project]/app/page.tsx",
                                                lineNumber: 164,
                                                columnNumber: 21
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/page.tsx",
                                        lineNumber: 161,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            fontSize: '0.78rem',
                                            color: '#888',
                                            marginBottom: '0.75rem',
                                            lineHeight: '1.4'
                                        },
                                        children: item.desc
                                    }, void 0, false, {
                                        fileName: "[project]/app/page.tsx",
                                        lineNumber: 169,
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
                                                    color: '#E65C00',
                                                    fontSize: '1.05rem'
                                                },
                                                children: [
                                                    "₹",
                                                    item.price
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/page.tsx",
                                                lineNumber: 171,
                                                columnNumber: 19
                                            }, this),
                                            inCart ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem'
                                                },
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        onClick: ()=>changeQty(item.id, -1),
                                                        style: {
                                                            width: '28px',
                                                            height: '28px',
                                                            borderRadius: '50%',
                                                            border: '2px solid #E65C00',
                                                            background: 'white',
                                                            color: '#E65C00',
                                                            fontWeight: 900,
                                                            cursor: 'pointer',
                                                            fontSize: '1rem',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        },
                                                        children: "−"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/page.tsx",
                                                        lineNumber: 174,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        style: {
                                                            fontWeight: 800,
                                                            minWidth: '20px',
                                                            textAlign: 'center'
                                                        },
                                                        children: inCart.qty
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/page.tsx",
                                                        lineNumber: 175,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        onClick: ()=>changeQty(item.id, 1),
                                                        disabled: !!atMax,
                                                        style: {
                                                            width: '28px',
                                                            height: '28px',
                                                            borderRadius: '50%',
                                                            background: atMax ? '#ddd' : '#E65C00',
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
                                                        fileName: "[project]/app/page.tsx",
                                                        lineNumber: 176,
                                                        columnNumber: 23
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/page.tsx",
                                                lineNumber: 173,
                                                columnNumber: 21
                                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                onClick: ()=>addToCart(item),
                                                style: {
                                                    background: '#E65C00',
                                                    color: 'white',
                                                    border: 'none',
                                                    padding: '0.4rem 1rem',
                                                    borderRadius: '20px',
                                                    fontWeight: 700,
                                                    cursor: 'pointer',
                                                    fontSize: '0.82rem',
                                                    fontFamily: 'Poppins,sans-serif'
                                                },
                                                children: "+ Add"
                                            }, void 0, false, {
                                                fileName: "[project]/app/page.tsx",
                                                lineNumber: 183,
                                                columnNumber: 21
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/page.tsx",
                                        lineNumber: 170,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/page.tsx",
                                lineNumber: 160,
                                columnNumber: 15
                            }, this)
                        ]
                    }, item.id, true, {
                        fileName: "[project]/app/page.tsx",
                        lineNumber: 158,
                        columnNumber: 13
                    }, this);
                })
            }, void 0, false, {
                fileName: "[project]/app/page.tsx",
                lineNumber: 153,
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
                        borderRadius: '16px',
                        width: '100%',
                        maxWidth: '440px',
                        maxHeight: '90vh',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                background: 'linear-gradient(135deg,#1A0800,#E65C00)',
                                color: 'white',
                                padding: '1.25rem 1.5rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    style: {
                                        fontFamily: "'Playfair Display',serif",
                                        fontWeight: 900,
                                        fontSize: '1.1rem'
                                    },
                                    children: "🛒 Your Cart"
                                }, void 0, false, {
                                    fileName: "[project]/app/page.tsx",
                                    lineNumber: 197,
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
                                    fileName: "[project]/app/page.tsx",
                                    lineNumber: 198,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/page.tsx",
                            lineNumber: 196,
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
                                fileName: "[project]/app/page.tsx",
                                lineNumber: 202,
                                columnNumber: 19
                            }, this) : cart.map((c)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '0.75rem 0',
                                        borderBottom: '1px solid #f5f0e8'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    style: {
                                                        fontWeight: 600,
                                                        fontSize: '0.9rem'
                                                    },
                                                    children: c.item.name
                                                }, void 0, false, {
                                                    fileName: "[project]/app/page.tsx",
                                                    lineNumber: 206,
                                                    columnNumber: 23
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    style: {
                                                        fontSize: '0.78rem',
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
                                                            fileName: "[project]/app/page.tsx",
                                                            lineNumber: 207,
                                                            columnNumber: 103
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/page.tsx",
                                                    lineNumber: 207,
                                                    columnNumber: 23
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/page.tsx",
                                            lineNumber: 205,
                                            columnNumber: 21
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.4rem'
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    onClick: ()=>changeQty(c.item.id, -1),
                                                    style: {
                                                        width: '26px',
                                                        height: '26px',
                                                        borderRadius: '50%',
                                                        border: '2px solid #E65C00',
                                                        background: 'white',
                                                        color: '#E65C00',
                                                        fontWeight: 900,
                                                        cursor: 'pointer'
                                                    },
                                                    children: "−"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/page.tsx",
                                                    lineNumber: 210,
                                                    columnNumber: 23
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    style: {
                                                        fontWeight: 800,
                                                        minWidth: '18px',
                                                        textAlign: 'center'
                                                    },
                                                    children: c.qty
                                                }, void 0, false, {
                                                    fileName: "[project]/app/page.tsx",
                                                    lineNumber: 211,
                                                    columnNumber: 23
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    onClick: ()=>changeQty(c.item.id, 1),
                                                    disabled: c.qty >= MAX_QTY,
                                                    style: {
                                                        width: '26px',
                                                        height: '26px',
                                                        borderRadius: '50%',
                                                        background: c.qty >= MAX_QTY ? '#ddd' : '#E65C00',
                                                        border: 'none',
                                                        color: 'white',
                                                        fontWeight: 900,
                                                        cursor: c.qty >= MAX_QTY ? 'not-allowed' : 'pointer'
                                                    },
                                                    children: "+"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/page.tsx",
                                                    lineNumber: 212,
                                                    columnNumber: 23
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/page.tsx",
                                            lineNumber: 209,
                                            columnNumber: 21
                                        }, this)
                                    ]
                                }, c.item.id, true, {
                                    fileName: "[project]/app/page.tsx",
                                    lineNumber: 204,
                                    columnNumber: 19
                                }, this))
                        }, void 0, false, {
                            fileName: "[project]/app/page.tsx",
                            lineNumber: 200,
                            columnNumber: 13
                        }, this),
                        cart.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                padding: '1rem 1.5rem',
                                borderTop: '2px solid #f5f0e8'
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        fontWeight: 900,
                                        fontSize: '1.05rem',
                                        marginBottom: '1rem',
                                        color: '#1A0800'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            children: "Total"
                                        }, void 0, false, {
                                            fileName: "[project]/app/page.tsx",
                                            lineNumber: 221,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            style: {
                                                color: '#E65C00'
                                            },
                                            children: [
                                                "₹",
                                                cartTotal
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/page.tsx",
                                            lineNumber: 221,
                                            columnNumber: 37
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/page.tsx",
                                    lineNumber: 220,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: ()=>{
                                        setCartOpen(false);
                                        setShowCheckout(true);
                                    },
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
                                    children: "Proceed to Checkout →"
                                }, void 0, false, {
                                    fileName: "[project]/app/page.tsx",
                                    lineNumber: 223,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/page.tsx",
                            lineNumber: 219,
                            columnNumber: 15
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/page.tsx",
                    lineNumber: 195,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/page.tsx",
                lineNumber: 194,
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
                        borderRadius: '16px',
                        width: '100%',
                        maxWidth: '440px',
                        maxHeight: '90vh',
                        overflow: 'auto'
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                background: 'linear-gradient(135deg,#1A0800,#E65C00)',
                                color: 'white',
                                padding: '1.25rem 1.5rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    style: {
                                        fontFamily: "'Playfair Display',serif",
                                        fontWeight: 900,
                                        fontSize: '1.1rem'
                                    },
                                    children: "Checkout"
                                }, void 0, false, {
                                    fileName: "[project]/app/page.tsx",
                                    lineNumber: 237,
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
                                    fileName: "[project]/app/page.tsx",
                                    lineNumber: 239,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/page.tsx",
                            lineNumber: 236,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                padding: '1.5rem'
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        marginBottom: '1rem'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            style: {
                                                fontSize: '0.8rem',
                                                fontWeight: 700,
                                                color: '#555',
                                                display: 'block',
                                                marginBottom: '0.3rem'
                                            },
                                            children: "Your Name *"
                                        }, void 0, false, {
                                            fileName: "[project]/app/page.tsx",
                                            lineNumber: 244,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            value: form.name,
                                            onChange: (e)=>setForm((f)=>({
                                                        ...f,
                                                        name: e.target.value
                                                    })),
                                            placeholder: "Enter your name",
                                            disabled: isSubmitting,
                                            style: {
                                                width: '100%',
                                                padding: '0.6rem',
                                                border: '2px solid #ddd',
                                                borderRadius: '8px',
                                                fontFamily: 'Poppins,sans-serif',
                                                fontSize: '0.9rem'
                                            }
                                        }, void 0, false, {
                                            fileName: "[project]/app/page.tsx",
                                            lineNumber: 245,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/page.tsx",
                                    lineNumber: 243,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        marginBottom: '1rem'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            style: {
                                                fontSize: '0.8rem',
                                                fontWeight: 700,
                                                color: '#555',
                                                display: 'block',
                                                marginBottom: '0.3rem'
                                            },
                                            children: "Phone (optional)"
                                        }, void 0, false, {
                                            fileName: "[project]/app/page.tsx",
                                            lineNumber: 254,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
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
                                                borderRadius: '8px',
                                                fontFamily: 'Poppins,sans-serif',
                                                fontSize: '0.9rem'
                                            }
                                        }, void 0, false, {
                                            fileName: "[project]/app/page.tsx",
                                            lineNumber: 255,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/page.tsx",
                                    lineNumber: 253,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        marginBottom: '1rem'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            style: {
                                                fontSize: '0.8rem',
                                                fontWeight: 700,
                                                color: '#555',
                                                display: 'block',
                                                marginBottom: '0.5rem'
                                            },
                                            children: "Order Type"
                                        }, void 0, false, {
                                            fileName: "[project]/app/page.tsx",
                                            lineNumber: 264,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                display: 'flex',
                                                gap: '0.5rem'
                                            },
                                            children: [
                                                'pickup',
                                                'dine-in'
                                            ].map((t)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    onClick: ()=>!isSubmitting && setForm((f)=>({
                                                                ...f,
                                                                type: t
                                                            })),
                                                    style: {
                                                        flex: 1,
                                                        padding: '0.5rem',
                                                        border: `2px solid ${form.type === t ? '#E65C00' : '#ddd'}`,
                                                        borderRadius: '8px',
                                                        background: form.type === t ? '#FFF5EB' : 'white',
                                                        color: form.type === t ? '#E65C00' : '#666',
                                                        fontWeight: 700,
                                                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                                        fontFamily: 'Poppins,sans-serif',
                                                        textTransform: 'capitalize'
                                                    },
                                                    children: t === 'pickup' ? '🛍️ Pickup' : '🪑 Dine-In'
                                                }, t, false, {
                                                    fileName: "[project]/app/page.tsx",
                                                    lineNumber: 267,
                                                    columnNumber: 21
                                                }, this))
                                        }, void 0, false, {
                                            fileName: "[project]/app/page.tsx",
                                            lineNumber: 265,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/page.tsx",
                                    lineNumber: 263,
                                    columnNumber: 15
                                }, this),
                                form.type === 'dine-in' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        marginBottom: '1rem'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            style: {
                                                fontSize: '0.8rem',
                                                fontWeight: 700,
                                                color: '#555',
                                                display: 'block',
                                                marginBottom: '0.3rem'
                                            },
                                            children: "Table Number *"
                                        }, void 0, false, {
                                            fileName: "[project]/app/page.tsx",
                                            lineNumber: 276,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            type: "number",
                                            value: form.tableNo,
                                            onChange: (e)=>setForm((f)=>({
                                                        ...f,
                                                        tableNo: e.target.value
                                                    })),
                                            placeholder: "e.g. 5",
                                            disabled: isSubmitting,
                                            min: 1,
                                            style: {
                                                width: '100%',
                                                padding: '0.6rem',
                                                border: '2px solid #ddd',
                                                borderRadius: '8px',
                                                fontFamily: 'Poppins,sans-serif',
                                                fontSize: '0.9rem'
                                            }
                                        }, void 0, false, {
                                            fileName: "[project]/app/page.tsx",
                                            lineNumber: 277,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/page.tsx",
                                    lineNumber: 275,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        marginBottom: '1.5rem'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            style: {
                                                fontSize: '0.8rem',
                                                fontWeight: 700,
                                                color: '#555',
                                                display: 'block',
                                                marginBottom: '0.5rem'
                                            },
                                            children: "Payment Method"
                                        }, void 0, false, {
                                            fileName: "[project]/app/page.tsx",
                                            lineNumber: 289,
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
                                                borderRadius: '8px',
                                                fontFamily: 'Poppins,sans-serif',
                                                fontSize: '0.9rem'
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: "cod",
                                                    children: "Cash on Delivery"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/page.tsx",
                                                    lineNumber: 296,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: "gpay",
                                                    children: "Google Pay"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/page.tsx",
                                                    lineNumber: 297,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: "phonepe",
                                                    children: "PhonePe"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/page.tsx",
                                                    lineNumber: 298,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: "paytm",
                                                    children: "Paytm"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/page.tsx",
                                                    lineNumber: 299,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/page.tsx",
                                            lineNumber: 290,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/page.tsx",
                                    lineNumber: 288,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        background: '#FFF5EB',
                                        borderRadius: '8px',
                                        padding: '0.75rem',
                                        marginBottom: '1rem'
                                    },
                                    children: [
                                        cart.map((c)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    fontSize: '0.85rem',
                                                    padding: '0.2rem 0'
                                                },
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        children: [
                                                            c.item.name,
                                                            " × ",
                                                            c.qty
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/page.tsx",
                                                        lineNumber: 305,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        children: [
                                                            "₹",
                                                            c.item.price * c.qty
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/page.tsx",
                                                        lineNumber: 305,
                                                        columnNumber: 57
                                                    }, this)
                                                ]
                                            }, c.item.id, true, {
                                                fileName: "[project]/app/page.tsx",
                                                lineNumber: 304,
                                                columnNumber: 19
                                            }, this)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                borderTop: '2px solid #E65C00',
                                                marginTop: '0.5rem',
                                                paddingTop: '0.5rem',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                fontWeight: 900,
                                                color: '#E65C00'
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    children: "Total"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/page.tsx",
                                                    lineNumber: 309,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    children: [
                                                        "₹",
                                                        cartTotal
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/page.tsx",
                                                    lineNumber: 309,
                                                    columnNumber: 37
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/page.tsx",
                                            lineNumber: 308,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/page.tsx",
                                    lineNumber: 302,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: placeOrder,
                                    disabled: isSubmitting,
                                    style: {
                                        width: '100%',
                                        background: isSubmitting ? '#bbb' : '#E65C00',
                                        color: 'white',
                                        border: 'none',
                                        padding: '0.85rem',
                                        borderRadius: '10px',
                                        fontWeight: 700,
                                        fontSize: '1rem',
                                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                        fontFamily: 'Poppins,sans-serif',
                                        transition: 'background 0.2s'
                                    },
                                    children: isSubmitting ? '⏳ Placing Order...' : '✅ Place Order'
                                }, void 0, false, {
                                    fileName: "[project]/app/page.tsx",
                                    lineNumber: 312,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/page.tsx",
                            lineNumber: 242,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/page.tsx",
                    lineNumber: 235,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/page.tsx",
                lineNumber: 234,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/page.tsx",
        lineNumber: 115,
        columnNumber: 5
    }, this);
}
}),
"[project]/node_modules/next/dist/server/route-modules/app-page/module.compiled.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
;
else {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    else {
        if ("TURBOPACK compile-time truthy", 1) {
            if ("TURBOPACK compile-time truthy", 1) {
                module.exports = __turbopack_context__.r("[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)");
            } else //TURBOPACK unreachable
            ;
        } else //TURBOPACK unreachable
        ;
    }
} //# sourceMappingURL=module.compiled.js.map
}),
"[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

module.exports = __turbopack_context__.r("[project]/node_modules/next/dist/server/route-modules/app-page/module.compiled.js [app-ssr] (ecmascript)").vendored['react-ssr'].ReactJsxDevRuntime; //# sourceMappingURL=react-jsx-dev-runtime.js.map
}),
"[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

module.exports = __turbopack_context__.r("[project]/node_modules/next/dist/server/route-modules/app-page/module.compiled.js [app-ssr] (ecmascript)").vendored['react-ssr'].React; //# sourceMappingURL=react.js.map
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__7c6849b9._.js.map