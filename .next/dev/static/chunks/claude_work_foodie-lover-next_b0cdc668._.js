(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/claude_work/foodie-lover-next/lib/storage.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// ─── Types ────────────────────────────────────────────────────────────────────
__turbopack_context__.s([
    "DEFAULT_MENU",
    ()=>DEFAULT_MENU,
    "addOrder",
    ()=>addOrder,
    "exportOrdersCSV",
    ()=>exportOrdersCSV,
    "getMenu",
    ()=>getMenu,
    "getOrders",
    ()=>getOrders,
    "getPin",
    ()=>getPin,
    "getTables",
    ()=>getTables,
    "saveMenu",
    ()=>saveMenu,
    "saveOrders",
    ()=>saveOrders,
    "savePin",
    ()=>savePin,
    "saveTables",
    ()=>saveTables,
    "updateOrderStatus",
    ()=>updateOrderStatus
]);
// ─── Keys ─────────────────────────────────────────────────────────────────────
const KEYS = {
    orders: 'fl_orders',
    tables: 'fl_tables',
    menu: 'fl_menu',
    pin: 'fl_owner_pin'
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
const getOrders = ()=>get(KEYS.orders, []);
const saveOrders = (orders)=>set(KEYS.orders, orders);
function addOrder(order) {
    const orders = getOrders();
    orders.push(order);
    saveOrders(orders);
}
function updateOrderStatus(orderId, status) {
    const orders = getOrders();
    const idx = orders.findIndex((o)=>o.id === orderId);
    if (idx !== -1) {
        orders[idx].status = status;
        saveOrders(orders);
    }
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
const saveTables = (tables)=>set(KEYS.tables, tables);
const DEFAULT_MENU = [
    {
        id: 1,
        category: 'Biryani',
        name: 'Hyderabadi Chicken Dum Biryani',
        desc: 'Slow-cooked tender chicken layered with fragrant basmati rice & saffron',
        price: 280,
        img: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&auto=format&fit=crop&q=80',
        badge: 'bestseller'
    },
    {
        id: 2,
        category: 'Biryani',
        name: 'Hyderabadi Mutton Dum Biryani',
        desc: 'Tender mutton pieces slow-cooked with aromatic whole spices',
        price: 350,
        img: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=400&auto=format&fit=crop&q=80'
    },
    {
        id: 3,
        category: 'Biryani',
        name: 'Veg Hyderabadi Biryani',
        desc: 'Fresh garden vegetables cooked in authentic Hyderabadi dum style',
        price: 200,
        img: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400&auto=format&fit=crop&q=80'
    },
    {
        id: 4,
        category: 'Biryani',
        name: 'Paneer Dum Biryani',
        desc: 'Soft cottage cheese cubes layered with spiced aromatic basmati',
        price: 240,
        img: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&auto=format&fit=crop&q=80',
        badge: 'popular'
    },
    {
        id: 5,
        category: 'Biryani',
        name: 'Egg Biryani',
        desc: 'Perfectly boiled eggs cooked with Hyderabadi spices and basmati',
        price: 220,
        img: 'https://images.unsplash.com/photo-1546833998-877b37c2e5c6?w=400&auto=format&fit=crop&q=80'
    },
    {
        id: 6,
        category: 'Biryani',
        name: 'Special Double Dum Biryani',
        desc: 'Our signature extra-large portion with double the flavors & dry fruits',
        price: 420,
        img: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&auto=format&fit=crop&q=80',
        badge: 'chef'
    },
    {
        id: 7,
        category: 'Starters',
        name: 'Chicken 65',
        desc: 'Crispy deep-fried chicken with fiery red marinade & curry leaves',
        price: 220,
        img: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&auto=format&fit=crop&q=80'
    },
    {
        id: 8,
        category: 'Starters',
        name: 'Mutton Seekh Kebab',
        desc: 'Minced mutton blended with spices & grilled over coal',
        price: 280,
        img: 'https://images.unsplash.com/photo-1512058454905-6b84c2b38f50?w=400&auto=format&fit=crop&q=80'
    },
    {
        id: 9,
        category: 'Starters',
        name: 'Paneer Tikka',
        desc: 'Marinated cottage cheese cubes grilled in tandoor',
        price: 200,
        img: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400&auto=format&fit=crop&q=80'
    },
    {
        id: 10,
        category: 'Starters',
        name: 'Veg Shammi Kebab',
        desc: 'Soft & spicy mixed vegetable patties pan-fried golden',
        price: 160,
        img: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&auto=format&fit=crop&q=80'
    },
    {
        id: 11,
        category: 'Mains',
        name: 'Chicken Curry',
        desc: 'Rich and spicy Hyderabadi style chicken curry in thick gravy',
        price: 260,
        img: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&auto=format&fit=crop&q=80'
    },
    {
        id: 12,
        category: 'Mains',
        name: 'Mutton Rogan Josh',
        desc: 'Slow-cooked tender mutton in aromatic Kashmiri spice gravy',
        price: 320,
        img: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&auto=format&fit=crop&q=80'
    },
    {
        id: 13,
        category: 'Mains',
        name: 'Dal Makhani',
        desc: 'Slow-cooked black lentils simmered with cream & butter overnight',
        price: 180,
        img: 'https://images.unsplash.com/photo-1546833998-877b37c2e5c6?w=400&auto=format&fit=crop&q=80'
    },
    {
        id: 14,
        category: 'Mains',
        name: 'Paneer Butter Masala',
        desc: 'Soft paneer cubes in rich creamy tomato-cashew gravy',
        price: 220,
        img: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&auto=format&fit=crop&q=80'
    },
    {
        id: 15,
        category: 'Mains',
        name: 'Raita',
        desc: 'Chilled yogurt with cucumber, onion, tomato & roasted cumin',
        price: 60,
        img: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&auto=format&fit=crop&q=80'
    },
    {
        id: 16,
        category: 'Breads',
        name: 'Butter Naan',
        desc: 'Soft leavened bread baked in tandoor brushed with fresh butter',
        price: 40,
        img: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&auto=format&fit=crop&q=80'
    },
    {
        id: 17,
        category: 'Breads',
        name: 'Garlic Naan',
        desc: 'Naan generously topped with garlic, butter & fresh coriander',
        price: 50,
        img: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&auto=format&fit=crop&q=80'
    },
    {
        id: 18,
        category: 'Breads',
        name: 'Tandoori Roti',
        desc: 'Whole wheat bread baked fresh in clay tandoor',
        price: 30,
        img: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&auto=format&fit=crop&q=80'
    },
    {
        id: 19,
        category: 'Desserts',
        name: 'Double Ka Meetha',
        desc: 'Iconic Hyderabadi bread pudding with cream, dry fruits & saffron',
        price: 120,
        img: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&auto=format&fit=crop&q=80',
        badge: 'famous'
    },
    {
        id: 20,
        category: 'Desserts',
        name: 'Qubani Ka Meetha',
        desc: 'Traditional Hyderabadi apricot dessert topped with fresh cream',
        price: 100,
        img: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&auto=format&fit=crop&q=80'
    },
    {
        id: 21,
        category: 'Desserts',
        name: 'Kheer',
        desc: 'Creamy rich rice pudding infused with saffron, cardamom & nuts',
        price: 80,
        img: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&auto=format&fit=crop&q=80'
    },
    {
        id: 22,
        category: 'Drinks',
        name: 'Sweet Lassi',
        desc: "Chilled sweet yogurt drink - Punjab's most beloved classic",
        price: 80,
        img: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&auto=format&fit=crop&q=80'
    },
    {
        id: 23,
        category: 'Drinks',
        name: 'Salted Lassi',
        desc: 'Refreshing salted yogurt drink with roasted cumin',
        price: 80,
        img: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&auto=format&fit=crop&q=80'
    },
    {
        id: 24,
        category: 'Drinks',
        name: 'Masala Chai',
        desc: 'Aromatic spiced tea brewed with ginger, cardamom & cinnamon',
        price: 40,
        img: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&auto=format&fit=crop&q=80'
    },
    {
        id: 25,
        category: 'Drinks',
        name: 'Cold Drink',
        desc: 'Pepsi / Coke / Sprite / Thumbs Up (chilled)',
        price: 50,
        img: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=400&auto=format&fit=crop&q=80'
    },
    {
        id: 26,
        category: 'Drinks',
        name: 'Mineral Water',
        desc: '500ml chilled mineral water bottle',
        price: 20,
        img: 'https://images.unsplash.com/photo-1560023907-5f339617ea30?w=400&auto=format&fit=crop&q=80'
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
const savePin = (pin)=>set(KEYS.pin, pin);
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
        cod: 'Cash on Pickup'
    };
    const headers = [
        'Order ID',
        'Date',
        'Time',
        'Day of Week',
        'Week No.',
        'Month',
        'Year',
        'Customer Name',
        'Phone',
        'Order Type',
        'Table / Pickup',
        'Item Name',
        'Item Qty',
        'Item Unit Price (₹)',
        'Item Line Total (₹)',
        'Order Subtotal (₹)',
        'Owner Discount (₹)',
        'Order Total (₹)',
        'Payment Method',
        'Order Status'
    ];
    const rows = [];
    orders.forEach((order)=>{
        const d = new Date(order.timestamp);
        const date = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        const time = d.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
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
                '',
                '',
                '',
                '',
                order.subtotal,
                order.discount,
                order.total,
                pay,
                order.status
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
                    item.name,
                    item.qty,
                    item.price,
                    line,
                    i === 0 ? order.subtotal : '',
                    i === 0 ? order.discount : '',
                    i === 0 ? order.total : '',
                    i === 0 ? pay : '',
                    i === 0 ? order.status : ''
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
    const name = `FoodieLover_Sales_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}.csv`;
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/claude_work/foodie-lover-next/app/table/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>TablePage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/claude_work/foodie-lover-next/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/claude_work/foodie-lover-next/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/claude_work/foodie-lover-next/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/claude_work/foodie-lover-next/lib/storage.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
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
function TableContent() {
    _s();
    const params = (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSearchParams"])();
    const tableId = parseInt(params.get('table') || '1');
    const [menu, setMenu] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [cart, setCart] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [filter, setFilter] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('All');
    const [cartOpen, setCartOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [ordered, setOrdered] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [name, setName] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [showCheckout, setShowCheckout] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "TableContent.useEffect": ()=>{
            setMenu((0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getMenu"])());
        }
    }["TableContent.useEffect"], []);
    const filtered = filter === 'All' ? menu : menu.filter((m)=>m.category === filter);
    const cartTotal = cart.reduce((s, c)=>s + c.item.price * c.qty, 0);
    const cartCount = cart.reduce((s, c)=>s + c.qty, 0);
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
        const order = {
            id: `ORD-${Date.now()}`,
            type: 'dine-in',
            tableId,
            customerName: name,
            items,
            subtotal: cartTotal,
            discount: 0,
            total: cartTotal,
            payment: 'cod',
            status: 'pending',
            timestamp: new Date().toISOString()
        };
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["addOrder"])(order);
        setCart([]);
        setShowCheckout(false);
        setOrdered(true);
        setTimeout(()=>setOrdered(false), 5000);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        style: {
            minHeight: '100vh',
            background: 'linear-gradient(135deg,#faf8f3,#f5f0e8)'
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
                                lineNumber: 50,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    fontSize: '0.75rem',
                                    color: '#F9A826'
                                },
                                children: "Scan & Order"
                            }, void 0, false, {
                                fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                lineNumber: 51,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                        lineNumber: 49,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>setCartOpen(true),
                        style: {
                            background: '#E65C00',
                            border: 'none',
                            color: 'white',
                            padding: '0.5rem 1rem',
                            borderRadius: '20px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            fontFamily: 'Poppins,sans-serif'
                        },
                        children: [
                            "🛒 ",
                            cartCount > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
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
                                lineNumber: 54,
                                columnNumber: 28
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                        lineNumber: 53,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                lineNumber: 48,
                columnNumber: 7
            }, this),
            ordered && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    background: '#dcfce7',
                    color: '#15803d',
                    padding: '0.75rem 1.5rem',
                    fontWeight: 700,
                    textAlign: 'center'
                },
                children: "✅ Order sent to kitchen!"
            }, void 0, false, {
                fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                lineNumber: 58,
                columnNumber: 19
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    gap: '0.4rem',
                    overflowX: 'auto'
                },
                children: CATEGORIES.map((cat)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
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
                        lineNumber: 62,
                        columnNumber: 11
                    }, this))
            }, void 0, false, {
                fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                lineNumber: 60,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    padding: '0 1rem 5rem',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))',
                    gap: '0.85rem'
                },
                children: filtered.map((item)=>{
                    const inCart = cart.find((c)=>c.item.id === item.id);
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            background: 'white',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                        },
                        children: [
                            item.img && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                src: item.img,
                                alt: item.name,
                                style: {
                                    width: '100%',
                                    height: '140px',
                                    objectFit: 'cover'
                                }
                            }, void 0, false, {
                                fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                lineNumber: 71,
                                columnNumber: 26
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    padding: '0.85rem'
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            fontWeight: 700,
                                            fontSize: '0.9rem',
                                            color: '#1A0800',
                                            marginBottom: '0.2rem'
                                        },
                                        children: item.name
                                    }, void 0, false, {
                                        fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                        lineNumber: 73,
                                        columnNumber: 17
                                    }, this),
                                    item.badge && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
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
                                        lineNumber: 74,
                                        columnNumber: 30
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            fontSize: '0.74rem',
                                            color: '#888',
                                            margin: '0.3rem 0 0.6rem',
                                            lineHeight: '1.3'
                                        },
                                        children: item.desc
                                    }, void 0, false, {
                                        fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                        lineNumber: 75,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
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
                                                lineNumber: 77,
                                                columnNumber: 19
                                            }, this),
                                            inCart ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.4rem'
                                                },
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
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
                                                        lineNumber: 80,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        style: {
                                                            fontWeight: 800,
                                                            minWidth: '18px',
                                                            textAlign: 'center'
                                                        },
                                                        children: inCart.qty
                                                    }, void 0, false, {
                                                        fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                                        lineNumber: 81,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
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
                                                        lineNumber: 82,
                                                        columnNumber: 23
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                                lineNumber: 79,
                                                columnNumber: 21
                                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
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
                                                lineNumber: 85,
                                                columnNumber: 21
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                        lineNumber: 76,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                lineNumber: 72,
                                columnNumber: 15
                            }, this)
                        ]
                    }, item.id, true, {
                        fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                        lineNumber: 70,
                        columnNumber: 13
                    }, this);
                })
            }, void 0, false, {
                fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                lineNumber: 66,
                columnNumber: 7
            }, this),
            cartOpen && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "modal-overlay show",
                onClick: ()=>setCartOpen(false),
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                background: 'linear-gradient(135deg,#1A0800,#E65C00)',
                                color: 'white',
                                padding: '1rem 1.5rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
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
                                    lineNumber: 99,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
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
                                    lineNumber: 100,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                            lineNumber: 98,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                flex: 1,
                                overflowY: 'auto',
                                padding: '1rem 1.5rem'
                            },
                            children: !cart.length ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                style: {
                                    color: '#999',
                                    textAlign: 'center',
                                    padding: '2rem 0'
                                },
                                children: "Cart is empty"
                            }, void 0, false, {
                                fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                lineNumber: 103,
                                columnNumber: 29
                            }, this) : cart.map((c)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '0.6rem 0',
                                        borderBottom: '1px solid #f5f0e8'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    style: {
                                                        fontWeight: 600,
                                                        fontSize: '0.88rem'
                                                    },
                                                    children: c.item.name
                                                }, void 0, false, {
                                                    fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                                    lineNumber: 105,
                                                    columnNumber: 24
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
                                                    lineNumber: 105,
                                                    columnNumber: 94
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                            lineNumber: 105,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.4rem'
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
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
                                                    lineNumber: 107,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    style: {
                                                        fontWeight: 800,
                                                        minWidth: '16px',
                                                        textAlign: 'center'
                                                    },
                                                    children: c.qty
                                                }, void 0, false, {
                                                    fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                                    lineNumber: 108,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
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
                                                    lineNumber: 109,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                            lineNumber: 106,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, c.item.id, true, {
                                    fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                    lineNumber: 104,
                                    columnNumber: 17
                                }, this))
                        }, void 0, false, {
                            fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                            lineNumber: 102,
                            columnNumber: 13
                        }, this),
                        cart.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                padding: '1rem 1.5rem',
                                borderTop: '2px solid #f5f0e8'
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        fontWeight: 900,
                                        fontSize: '1rem',
                                        marginBottom: '0.75rem',
                                        color: '#1A0800'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            children: "Total"
                                        }, void 0, false, {
                                            fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                            lineNumber: 116,
                                            columnNumber: 150
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            style: {
                                                color: '#E65C00'
                                            },
                                            children: [
                                                "₹",
                                                cartTotal
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                            lineNumber: 116,
                                            columnNumber: 168
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                                    lineNumber: 116,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
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
                                    lineNumber: 117,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                            lineNumber: 115,
                            columnNumber: 15
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                    lineNumber: 97,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                lineNumber: 96,
                columnNumber: 9
            }, this),
            showCheckout && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "modal-overlay show",
                onClick: ()=>setShowCheckout(false),
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    onClick: (e)=>e.stopPropagation(),
                    style: {
                        background: 'white',
                        borderRadius: '16px',
                        width: '100%',
                        maxWidth: '380px',
                        padding: '2rem'
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                            style: {
                                fontFamily: "'Playfair Display',serif",
                                marginBottom: '1rem',
                                color: '#1A0800'
                            },
                            children: "Your Name"
                        }, void 0, false, {
                            fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                            lineNumber: 128,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                            value: name,
                            onChange: (e)=>setName(e.target.value),
                            placeholder: "Enter your name",
                            style: {
                                width: '100%',
                                padding: '0.7rem',
                                border: '2px solid #ddd',
                                borderRadius: '8px',
                                fontSize: '1rem',
                                fontFamily: 'Poppins,sans-serif',
                                marginBottom: '1rem'
                            }
                        }, void 0, false, {
                            fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                            lineNumber: 129,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
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
                            lineNumber: 130,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                    lineNumber: 127,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
                lineNumber: 126,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
        lineNumber: 47,
        columnNumber: 5
    }, this);
}
_s(TableContent, "czxh/a/ZPwvuJ09NskTMDRDOw9w=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSearchParams"]
    ];
});
_c = TableContent;
function TablePage() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Suspense"], {
        fallback: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
            lineNumber: 139,
            columnNumber: 30
        }, void 0),
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(TableContent, {}, void 0, false, {
            fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
            lineNumber: 139,
            columnNumber: 208
        }, this)
    }, void 0, false, {
        fileName: "[project]/claude_work/foodie-lover-next/app/table/page.tsx",
        lineNumber: 139,
        columnNumber: 10
    }, this);
}
_c1 = TablePage;
var _c, _c1;
__turbopack_context__.k.register(_c, "TableContent");
__turbopack_context__.k.register(_c1, "TablePage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/claude_work/foodie-lover-next/node_modules/next/dist/compiled/react/cjs/react-jsx-dev-runtime.development.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/claude_work/foodie-lover-next/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
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
    var React = __turbopack_context__.r("[project]/claude_work/foodie-lover-next/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)"), REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"), REACT_PORTAL_TYPE = Symbol.for("react.portal"), REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"), REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"), REACT_PROFILER_TYPE = Symbol.for("react.profiler"), REACT_CONSUMER_TYPE = Symbol.for("react.consumer"), REACT_CONTEXT_TYPE = Symbol.for("react.context"), REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"), REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"), REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list"), REACT_MEMO_TYPE = Symbol.for("react.memo"), REACT_LAZY_TYPE = Symbol.for("react.lazy"), REACT_ACTIVITY_TYPE = Symbol.for("react.activity"), REACT_VIEW_TRANSITION_TYPE = Symbol.for("react.view_transition"), REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference"), ReactSharedInternals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, hasOwnProperty = Object.prototype.hasOwnProperty, isArrayImpl = Array.isArray, createTask = console.createTask ? console.createTask : function() {
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
"[project]/claude_work/foodie-lover-next/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$claude_work$2f$foodie$2d$lover$2d$next$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/claude_work/foodie-lover-next/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
'use strict';
if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
;
else {
    module.exports = __turbopack_context__.r("[project]/claude_work/foodie-lover-next/node_modules/next/dist/compiled/react/cjs/react-jsx-dev-runtime.development.js [app-client] (ecmascript)");
}
}),
"[project]/claude_work/foodie-lover-next/node_modules/next/navigation.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {

module.exports = __turbopack_context__.r("[project]/claude_work/foodie-lover-next/node_modules/next/dist/client/components/navigation.js [app-client] (ecmascript)");
}),
]);

//# sourceMappingURL=claude_work_foodie-lover-next_b0cdc668._.js.map