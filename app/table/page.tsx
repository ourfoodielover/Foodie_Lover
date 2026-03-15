'use client';
import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  getMenu, addOrder, getOrders, getNextOrderNumber,
  getTabs, getOpenTabForCustomer, getActiveTabsForTable,
  createTab, addOrderToTab, requestBill, syncTabTotal,
  addWaiterCall, getLastWaiterCallTime, addFoodReceiptDispute,
  MenuItem, Order, CustomerTab,
} from '@/lib/storage';

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES = ['All', 'Biryani', 'Starters', 'Mains', 'Breads', 'Desserts', 'Drinks'];
const BADGE_LABEL: Record<string, string> = {
  bestseller: '⭐ Bestseller', popular: '🔥 Popular',
  chef: "👨‍🍳 Chef's Special", famous: '🏆 Famous', new: '✨ New',
};

// ─── Style helpers ─────────────────────────────────────────────────────────────
const btn = (bg = '#E65C00', c = 'white'): React.CSSProperties => ({
  background: bg, color: c, border: 'none', borderRadius: 8,
  fontWeight: 700, cursor: 'pointer', fontFamily: 'Poppins,sans-serif',
  padding: '0.5rem 1rem', fontSize: '0.85rem',
});

// ─── SessionStorage helpers ────────────────────────────────────────────────────
function ssGet(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try { return sessionStorage.getItem(key); } catch { return null; }
}
function ssSet(key: string, val: string): void {
  if (typeof window === 'undefined') return;
  try { sessionStorage.setItem(key, val); } catch {}
}
function ssClear(tableId: string): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(`fl_tab_${tableId}_id`);
    sessionStorage.removeItem(`fl_tab_${tableId}_name`);
    sessionStorage.removeItem(`fl_tab_${tableId}_party`);
    sessionStorage.removeItem(`fl_confirmed_${tableId}`);
  } catch {}
}
function getConfirmedOrderIds(tableId: string): Set<string> {
  try {
    const raw = ssGet(`fl_confirmed_${tableId}`);
    return raw ? new Set<string>(JSON.parse(raw)) : new Set<string>();
  } catch { return new Set<string>(); }
}
function addConfirmedOrderId(tableId: string, orderId: string): void {
  const set = getConfirmedOrderIds(tableId);
  set.add(orderId);
  ssSet(`fl_confirmed_${tableId}`, JSON.stringify([...set]));
}

// ─── Inner component (uses useSearchParams) ────────────────────────────────────
function TablePageInner() {
  const searchParams = useSearchParams();
  const tableId = (searchParams.get('table') || searchParams.get('tableId') || 'T01').toUpperCase();

  // ── View state ──
  type View = 'landing' | 'menu' | 'cart' | 'tracking';
  const [view, setView] = useState<View>('landing');

  // ── Customer identity ──
  const [customerName, setCustomerName]   = useState('');
  const [nameInput, setNameInput]         = useState('');
  const [partyInput, setPartyInput]       = useState('1');
  const [nameError, setNameError]         = useState('');

  // ── Tab ──
  const [tabId, setTabId]                 = useState<string | null>(null);
  const [tab, setTab]                     = useState<CustomerTab | null>(null);

  // ── Menu & cart ──
  const [menu, setMenu]                   = useState<MenuItem[]>([]);
  const [catFilter, setCatFilter]         = useState('All');
  const [cart, setCart]                   = useState<Record<string, number>>({});
  const [specialNote, setSpecialNote]     = useState('');

  // ── Orders (tracking) ──
  const [orders, setOrders]               = useState<Order[]>([]);

  // ── UI ──
  const [orderMsg, setOrderMsg]           = useState('');
  const [billMsg, setBillMsg]             = useState('');
  const [trackingView, setTrackingView]   = useState<'aggregated' | 'individual'>('aggregated');

  // ── Waiter call cooldown ──
  const [callCooldown, setCallCooldown]   = useState(0); // seconds remaining

  // ── Food receipt confirmation ──
  const [disputeOrder, setDisputeOrder]   = useState<Order | null>(null);
  // Use a ref so refresh() callback always sees latest confirmed IDs without re-creating
  const confirmedRef = useRef<Set<string>>(new Set<string>());

  // ─── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    setMenu(getMenu().filter(m => m.available));

    // Check sessionStorage for existing session on this table
    const savedTabId   = ssGet(`fl_tab_${tableId}_id`);
    const savedName    = ssGet(`fl_tab_${tableId}_name`);
    const savedParty   = ssGet(`fl_tab_${tableId}_party`);

    if (savedTabId && savedName) {
      const allTabs = getTabs();
      const existingTab = allTabs.find(
        t => t.id === savedTabId &&
             ['open', 'awaiting_payment', 'closed'].includes(t.tabStatus),
      );
      if (existingTab) {
        setTabId(savedTabId);
        setCustomerName(savedName);
        setPartyInput(savedParty || '1');
        setTab(existingTab);
        // Restore confirmed order IDs
        confirmedRef.current = getConfirmedOrderIds(tableId);
        // Restore cooldown
        const lastCallAt = getLastWaiterCallTime(tableId);
        if (lastCallAt) {
          const elapsed = Math.floor((Date.now() - new Date(lastCallAt).getTime()) / 1000);
          const remaining = Math.max(0, 60 - elapsed);
          setCallCooldown(remaining);
        }
        setView('tracking');
        return;
      } else {
        ssClear(tableId);
      }
    }
  }, [tableId]);

  // ─── Cooldown countdown ────────────────────────────────────────────────────
  useEffect(() => {
    if (callCooldown <= 0) return;
    const t = setInterval(() => setCallCooldown(prev => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(t);
  }, [callCooldown]);

  // ─── Periodic refresh ─────────────────────────────────────────────────────
  const refresh = useCallback(() => {
    if (!tabId) return;
    const allTabs = getTabs();
    const currentTab = allTabs.find(t => t.id === tabId);
    if (currentTab) {
      setTab(currentTab);
      if (currentTab.tabStatus === 'open') syncTabTotal(tabId);
    }
    const latestOrders = getOrders();
    setOrders(latestOrders);

    // Check for newly served orders that need food receipt confirmation
    if (currentTab && currentTab.tabStatus !== 'closed') {
      const tabOrdrs = currentTab.orderIds
        .map(oid => latestOrders.find(o => o.id === oid))
        .filter((o): o is Order => !!o);
      const servedUnconfirmed = tabOrdrs.find(
        o => o.status === 'served' && !confirmedRef.current.has(o.id),
      );
      if (servedUnconfirmed) {
        setDisputeOrder(servedUnconfirmed);
      }
    }
  }, [tabId]);

  useEffect(() => {
    if (!tabId) return;
    refresh();
    const t = setInterval(refresh, 3000);
    return () => clearInterval(t);
  }, [refresh, tabId]);

  // ─── Landing — start or resume session ────────────────────────────────────
  function handleStartSession() {
    const name = nameInput.trim();
    if (!name) { setNameError('Please enter your name'); return; }
    if (name.length < 2) { setNameError('Name must be at least 2 characters'); return; }
    const party = Math.max(1, parseInt(partyInput) || 1);

    const existingTab = getOpenTabForCustomer(tableId, name);
    if (existingTab) {
      setTabId(existingTab.id);
      setCustomerName(name);
      setTab(existingTab);
      ssSet(`fl_tab_${tableId}_id`,    existingTab.id);
      ssSet(`fl_tab_${tableId}_name`,  name);
      ssSet(`fl_tab_${tableId}_party`, String(party));
      confirmedRef.current = getConfirmedOrderIds(tableId);
      setView('tracking');
      return;
    }

    const activeTabs = getActiveTabsForTable(tableId);
    if (activeTabs.length > 0) {
      const occupantName = activeTabs[0].customerName;
      setNameError(`Table ${tableId} is currently occupied by ${occupantName}. If you're part of their group, ask them to add you to the same order.`);
      return;
    }

    const newTab = createTab(tableId, name, party);
    setTabId(newTab.id);
    setCustomerName(name);
    setTab(newTab);
    ssSet(`fl_tab_${tableId}_id`,    newTab.id);
    ssSet(`fl_tab_${tableId}_name`,  name);
    ssSet(`fl_tab_${tableId}_party`, String(party));
    confirmedRef.current = new Set<string>();
    setNameError('');
    setView('menu');
  }

  // ─── Place order ──────────────────────────────────────────────────────────
  function handlePlaceOrder() {
    if (!tabId || !customerName) return;
    const entries = Object.entries(cart).filter(([, qty]) => qty > 0);
    if (!entries.length) return;

    const menuMap = Object.fromEntries(menu.map(m => [m.id, m]));
    const items = entries.map(([id, qty]) => {
      const m = menuMap[id];
      return { name: m.name, qty, price: m.price, subtotal: m.price * qty };
    });
    const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
    const orderNum = getNextOrderNumber();
    const orderId  = `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    const order = {
      id:             orderId,
      orderNum,
      customerName,
      tableId,
      type:           'dine-in' as const,
      items,
      status:         'awaiting_waiter' as const,
      total:          subtotal,
      subtotal,
      discount:       0,
      discountReason: '',
      payment:        'cod',
      timestamp:      new Date().toISOString(),
      timeline:       [{ status: 'awaiting_waiter', by: customerName, at: new Date().toISOString() }],
    };

    addOrder(order);
    addOrderToTab(tabId, orderId);
    setCart({});
    setSpecialNote('');
    setOrderMsg(`✅ Order #${orderNum} placed! Your waiter will be with you shortly.`);
    setTimeout(() => setOrderMsg(''), 4000);
    setView('tracking');
    refresh();
  }

  // ─── Request bill ─────────────────────────────────────────────────────────
  function handleRequestBill() {
    if (!tabId) return;
    const ok = requestBill(tabId);
    if (ok) {
      setBillMsg('🧾 Bill requested! Please proceed to the counter when ready.');
      refresh();
      setTimeout(() => setBillMsg(''), 5000);
    }
  }

  // ─── Call Waiter ──────────────────────────────────────────────────────────
  function handleCallWaiter() {
    if (!tabId || !tab || callCooldown > 0) return;
    addWaiterCall(tableId, tabId, customerName);
    setCallCooldown(60);
  }

  // ─── Food receipt confirmation ────────────────────────────────────────────
  function handleFoodConfirm(received: boolean) {
    if (!disputeOrder || !tabId) return;
    if (!received) {
      addFoodReceiptDispute(disputeOrder.id, tabId, tableId, customerName);
    }
    confirmedRef.current.add(disputeOrder.id);
    addConfirmedOrderId(tableId, disputeOrder.id);
    setDisputeOrder(null);
  }

  // ─── Cart helpers ─────────────────────────────────────────────────────────
  const cartTotal = Object.entries(cart).reduce((s, [id, qty]) => {
    const m = menu.find(x => x.id === id);
    return s + (m ? m.price * qty : 0);
  }, 0);
  const cartCount = Object.values(cart).reduce((s, q) => s + q, 0);

  function setQty(id: string, delta: number) {
    setCart(prev => {
      const next = { ...prev, [id]: Math.max(0, (prev[id] || 0) + delta) };
      if (next[id] === 0) delete next[id];
      return next;
    });
  }

  // ─── Derived tab data ─────────────────────────────────────────────────────
  const tabOrders = tab
    ? orders.filter(o => tab.orderIds.includes(o.id))
    : [];

  const activeTabOrders = tabOrders.filter(
    o => !['cancelled', 'void'].includes(o.status),
  );

  const hasUnservedOrders = activeTabOrders.some(
    o => ['awaiting_waiter', 'pending', 'preparing', 'prepared'].includes(o.status),
  );

  const aggregatedItems: { name: string; qty: number; price: number; status: string }[] = (() => {
    const map: Record<string, { qty: number; price: number; statuses: string[] }> = {};
    activeTabOrders.forEach(order => {
      (order.items || []).forEach(item => {
        if (!map[item.name]) map[item.name] = { qty: 0, price: item.price, statuses: [] };
        map[item.name].qty += item.qty;
        map[item.name].statuses.push(order.status);
      });
    });
    return Object.entries(map).map(([name, v]) => ({
      name,
      qty:    v.qty,
      price:  v.price,
      status: v.statuses.includes('awaiting_waiter') ? 'awaiting_waiter'
            : v.statuses.includes('pending')         ? 'pending'
            : v.statuses.includes('preparing')       ? 'preparing'
            : v.statuses.includes('prepared')        ? 'prepared'
            : v.statuses.includes('served')          ? 'served'
            : 'completed',
    }));
  })();

  const tabTotal    = tab ? (tab.totalAmount || 0) : 0;
  const tabDiscount = tab ? (tab.discount || 0) : 0;
  const billTotal   = Math.max(0, tabTotal - tabDiscount);

  const STATUS_ICON: Record<string, string> = {
    awaiting_waiter: '⏳', pending: '⏱️', preparing: '🔥',
    prepared: '✅', served: '🍽️', completed: '💳',
    cancelled: '❌', void: '🚫',
  };
  const STATUS_LABEL: Record<string, string> = {
    awaiting_waiter: 'Waiting for waiter', pending: 'Queued in kitchen',
    preparing: 'Being prepared', prepared: 'Ready — being brought to you',
    served: 'Served', completed: 'Completed',
    cancelled: 'Cancelled', void: 'Voided',
  };
  const STATUS_COLOR: Record<string, string> = {
    awaiting_waiter: '#f59e0b', pending: '#f59e0b', preparing: '#3b82f6',
    prepared: '#8b5cf6', served: '#06b6d4', completed: '#16a34a',
    cancelled: '#ef4444', void: '#9ca3af',
  };

  // ─── Landing view ─────────────────────────────────────────────────────────
  if (view === 'landing') {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#1A0800,#3D1C00)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', fontFamily: 'Poppins,sans-serif' }}>
        <div style={{ background: 'white', borderRadius: 20, padding: '2rem 1.75rem', width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.4rem' }}>🍽️</div>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.6rem', fontWeight: 900, color: '#1A0800' }}>Foodie Lover</div>
            <div style={{ color: '#888', fontSize: '0.82rem', marginTop: '0.2rem' }}>Table {tableId}</div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#555', display: 'block', marginBottom: '0.35rem' }}>Your Name *</label>
            <input
              value={nameInput}
              onChange={e => { setNameInput(e.target.value); setNameError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleStartSession()}
              placeholder="e.g. Rahul Sharma"
              autoFocus
              style={{ width: '100%', boxSizing: 'border-box', padding: '0.7rem 0.9rem', border: `2px solid ${nameError ? '#ef4444' : '#e5e7eb'}`, borderRadius: 10, fontFamily: 'Poppins,sans-serif', fontSize: '0.95rem', outline: 'none' }}
            />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#555', display: 'block', marginBottom: '0.35rem' }}>Party Size</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {[1, 2, 3, 4, 5, 6].map(n => (
                <button
                  key={n}
                  onClick={() => setPartyInput(String(n))}
                  style={{
                    flex: 1, padding: '0.5rem 0', borderRadius: 8,
                    border: `2px solid ${partyInput === String(n) ? '#E65C00' : '#e5e7eb'}`,
                    background: partyInput === String(n) ? '#fff5ee' : 'white',
                    color: partyInput === String(n) ? '#E65C00' : '#555',
                    fontWeight: 700, cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontSize: '0.9rem',
                  }}
                >{n}</button>
              ))}
            </div>
          </div>

          {nameError && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '0.6rem 0.8rem', fontSize: '0.78rem', color: '#ef4444', marginBottom: '1rem' }}>
              {nameError}
            </div>
          )}

          <button
            onClick={handleStartSession}
            style={{ ...btn(), width: '100%', padding: '0.85rem', fontSize: '1rem', borderRadius: 12 }}
          >
            🚀 Start Ordering
          </button>

          <p style={{ textAlign: 'center', fontSize: '0.72rem', color: '#aaa', marginTop: '0.75rem' }}>
            Scan QR at your table to begin. Returning customers — enter the same name.
          </p>
        </div>
      </div>
    );
  }

  // ─── Menu view ────────────────────────────────────────────────────────────
  if (view === 'menu') {
    const filtered = catFilter === 'All' ? menu : menu.filter(m => m.category === catFilter);

    return (
      <div style={{ minHeight: '100vh', background: '#faf8f3', fontFamily: 'Poppins,sans-serif', paddingBottom: cartCount > 0 ? '100px' : 0 }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#1A0800,#3D1C00)', color: 'white', padding: '0.9rem 1rem', position: 'sticky', top: 0, zIndex: 50 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.1rem', fontWeight: 900 }}>🍽️ Foodie Lover</div>
              <div style={{ fontSize: '0.68rem', color: '#F9A826' }}>Table {tableId} · {customerName}</div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {tab && tab.orderIds.length > 0 && (
                <button onClick={() => setView('tracking')} style={{ ...btn('#ffffff20', 'white'), fontSize: '0.75rem', border: '1px solid #ffffff40' }}>
                  📋 My Tab
                </button>
              )}
            </div>
          </div>
          {/* Category filter */}
          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.6rem', overflowX: 'auto', paddingBottom: '0.1rem' }}>
            {CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => setCatFilter(c)}
                style={{
                  padding: '0.25rem 0.7rem', borderRadius: 20, whiteSpace: 'nowrap',
                  border: `1.5px solid ${catFilter === c ? '#F9A826' : '#ffffff30'}`,
                  background: catFilter === c ? '#F9A826' : 'transparent',
                  color: catFilter === c ? '#1A0800' : 'white',
                  fontWeight: catFilter === c ? 700 : 400, cursor: 'pointer',
                  fontFamily: 'Poppins,sans-serif', fontSize: '0.75rem',
                }}
              >{c}</button>
            ))}
          </div>
        </div>

        {/* Menu items */}
        <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: '0.75rem' }}>
          {filtered.map(item => {
            const qty = cart[item.id] || 0;
            return (
              <div key={item.id} style={{ background: 'white', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', border: qty > 0 ? '2px solid #E65C00' : '2px solid transparent' }}>
                <div style={{ fontSize: '2.5rem', textAlign: 'center', padding: '0.75rem 0 0.4rem', background: '#faf5ee' }}>{item.img}</div>
                {item.badge && (
                  <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#E65C00', textAlign: 'center', marginBottom: '0.2rem' }}>
                    {BADGE_LABEL[item.badge] || item.badge}
                  </div>
                )}
                <div style={{ padding: '0.4rem 0.6rem 0.6rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#1A0800', marginBottom: '0.15rem' }}>{item.name}</div>
                  <div style={{ fontSize: '0.68rem', color: '#888', marginBottom: '0.35rem', lineHeight: 1.3 }}>{item.desc}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 900, color: '#E65C00', fontSize: '0.9rem' }}>₹{item.price}</span>
                    {qty === 0 ? (
                      <button onClick={() => setQty(item.id, 1)} style={{ ...btn(), fontSize: '0.75rem', padding: '0.3rem 0.7rem', borderRadius: 20 }}>+ Add</button>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <button onClick={() => setQty(item.id, -1)} style={{ width: 26, height: 26, borderRadius: '50%', border: '2px solid #E65C00', background: 'white', color: '#E65C00', fontWeight: 900, cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                        <span style={{ fontWeight: 700, color: '#1A0800', fontSize: '0.85rem', minWidth: 16, textAlign: 'center' }}>{qty}</span>
                        <button onClick={() => setQty(item.id, 1)} style={{ width: 26, height: 26, borderRadius: '50%', border: 'none', background: '#E65C00', color: 'white', fontWeight: 900, cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Floating cart bar */}
        {cartCount > 0 && (
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '0.75rem 1rem', background: 'white', boxShadow: '0 -4px 20px rgba(0,0,0,0.12)', zIndex: 100 }}>
            <button onClick={() => setView('cart')} style={{ ...btn(), width: '100%', padding: '0.8rem', fontSize: '0.95rem', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>🛒 {cartCount} item{cartCount !== 1 ? 's' : ''}</span>
              <span>₹{cartTotal} →</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // ─── Cart view ────────────────────────────────────────────────────────────
  if (view === 'cart') {
    const cartItems = Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => {
        const m = menu.find(x => x.id === id)!;
        return { ...m, qty };
      });

    return (
      <div style={{ minHeight: '100vh', background: '#faf8f3', fontFamily: 'Poppins,sans-serif', paddingBottom: '100px' }}>
        <div style={{ background: 'linear-gradient(135deg,#1A0800,#3D1C00)', color: 'white', padding: '0.9rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={() => setView('menu')} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.4rem', cursor: 'pointer', lineHeight: 1 }}>←</button>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem' }}>🛒 Your Cart</div>
            <div style={{ fontSize: '0.68rem', color: '#F9A826' }}>Table {tableId} · {customerName}</div>
          </div>
        </div>

        <div style={{ padding: '1rem' }}>
          {cartItems.map(item => (
            <div key={item.id} style={{ background: 'white', borderRadius: 12, padding: '0.75rem 1rem', marginBottom: '0.6rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '1.6rem' }}>{item.img}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1A0800' }}>{item.name}</div>
                  <div style={{ fontSize: '0.72rem', color: '#888' }}>₹{item.price} each</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button onClick={() => setQty(item.id, -1)} style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid #E65C00', background: 'white', color: '#E65C00', fontWeight: 900, cursor: 'pointer', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', minWidth: 20, textAlign: 'center' }}>{item.qty}</span>
                <button onClick={() => setQty(item.id, 1)} style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: '#E65C00', color: 'white', fontWeight: 900, cursor: 'pointer', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                <span style={{ fontWeight: 800, color: '#1A0800', fontSize: '0.9rem', minWidth: 50, textAlign: 'right' }}>₹{item.price * item.qty}</span>
              </div>
            </div>
          ))}

          <div style={{ margin: '0.75rem 0' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#555', display: 'block', marginBottom: '0.35rem' }}>Special Instructions (optional)</label>
            <textarea
              value={specialNote}
              onChange={e => setSpecialNote(e.target.value)}
              placeholder="e.g. Less spicy, no onions..."
              rows={2}
              style={{ width: '100%', boxSizing: 'border-box', padding: '0.6rem 0.75rem', border: '2px solid #e5e7eb', borderRadius: 10, fontFamily: 'Poppins,sans-serif', fontSize: '0.85rem', resize: 'none' }}
            />
          </div>

          <div style={{ background: 'white', borderRadius: 12, padding: '0.85rem 1rem', marginBottom: '0.75rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#666', marginBottom: '0.25rem' }}>
              <span>{cartCount} item{cartCount !== 1 ? 's' : ''}</span>
              <span>₹{cartTotal}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '1rem', color: '#1A0800', borderTop: '2px solid #f5f0e8', paddingTop: '0.4rem', marginTop: '0.25rem' }}>
              <span>Order Total</span>
              <span>₹{cartTotal}</span>
            </div>
          </div>
        </div>

        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '0.75rem 1rem', background: 'white', boxShadow: '0 -4px 20px rgba(0,0,0,0.12)', zIndex: 100 }}>
          <button
            onClick={handlePlaceOrder}
            style={{ ...btn('#16a34a'), width: '100%', padding: '0.85rem', fontSize: '1rem', borderRadius: 12 }}
          >
            ✅ Place Order — ₹{cartTotal}
          </button>
        </div>
      </div>
    );
  }

  // ─── Tracking view ────────────────────────────────────────────────────────

  // ── Closed tab → Thank You screen ────────────────────────────────────────
  if (tab?.tabStatus === 'closed') {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#064e3b,#065f46)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Poppins,sans-serif', padding: '2rem' }}>
        <div style={{ textAlign: 'center', color: 'white', maxWidth: 360 }}>
          <div style={{ fontSize: '4rem', marginBottom: '0.75rem' }}>🙏</div>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '2rem', fontWeight: 900, color: '#6ee7b7', marginBottom: '0.4rem' }}>
            Thank You!
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.3rem' }}>
            Payment Received ✅
          </div>
          <div style={{ fontSize: '0.85rem', color: '#a7f3d0', marginBottom: '1rem', lineHeight: 1.5 }}>
            Hope you enjoyed your meal at Foodie Lover! We look forward to seeing you again.
          </div>
          {tabDiscount > 0 && (
            <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '0.6rem 1rem', marginBottom: '0.75rem', fontSize: '0.82rem', color: '#d1fae5' }}>
              🏷️ Discount applied: −₹{tabDiscount}
            </div>
          )}
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#6ee7b7', background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '0.5rem 1rem', display: 'inline-block' }}>
            Bill Paid: ₹{billTotal} · Table {tableId}
          </div>
          <div style={{ marginTop: '1.5rem', fontSize: '1.5rem' }}>⭐⭐⭐⭐⭐</div>
          <div style={{ fontSize: '0.72rem', color: '#6ee7b7', marginTop: '0.4rem' }}>Scan QR again to start a new order</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#faf8f3', fontFamily: 'Poppins,sans-serif', paddingBottom: '80px' }}>

      {/* Food receipt confirmation modal */}
      {disputeOrder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: 20, padding: '1.75rem 1.5rem', width: '100%', maxWidth: 360, textAlign: 'center', boxShadow: '0 24px 60px rgba(0,0,0,0.4)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.6rem' }}>🍽️</div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#1A0800', marginBottom: '0.4rem' }}>
              Did you receive your food?
            </div>
            <div style={{ fontSize: '0.82rem', color: '#888', marginBottom: '0.25rem' }}>
              Order #{disputeOrder.orderNum || disputeOrder.id.slice(-4)} has been marked as delivered to your table.
            </div>
            <div style={{ fontSize: '0.75rem', color: '#bbb', marginBottom: '1.5rem' }}>
              If you didn&apos;t get it, we&apos;ll alert your waiter immediately.
            </div>
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button
                onClick={() => handleFoodConfirm(false)}
                style={{ flex: 1, padding: '0.85rem', borderRadius: 12, background: '#fef2f2', border: '2px solid #ef4444', color: '#ef4444', fontWeight: 800, cursor: 'pointer', fontSize: '0.88rem', fontFamily: 'Poppins,sans-serif' }}
              >
                ❌ Not received
              </button>
              <button
                onClick={() => handleFoodConfirm(true)}
                style={{ flex: 1, padding: '0.85rem', borderRadius: 12, background: '#16a34a', border: 'none', color: 'white', fontWeight: 800, cursor: 'pointer', fontSize: '0.88rem', fontFamily: 'Poppins,sans-serif' }}
              >
                ✅ Yes, got it!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#1A0800,#3D1C00)', color: 'white', padding: '0.9rem 1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.1rem', fontWeight: 900 }}>🍽️ My Tab</div>
            <div style={{ fontSize: '0.68rem', color: '#F9A826' }}>Table {tableId} · {customerName}</div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {tab?.tabStatus === 'open' && (
              <button onClick={() => setView('menu')} style={{ ...btn('#F9A826', '#1A0800'), fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}>
                + Add More
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Order success message */}
      {orderMsg && (
        <div style={{ background: '#dcfce7', borderBottom: '2px solid #16a34a', padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 700, fontSize: '0.85rem', color: '#16a34a' }}>
          {orderMsg}
        </div>
      )}

      {/* Bill message */}
      {billMsg && (
        <div style={{ background: '#fef9c3', borderBottom: '2px solid #f59e0b', padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 700, fontSize: '0.85rem', color: '#854d0e' }}>
          {billMsg}
        </div>
      )}

      {/* Tab status banner */}
      {tab?.tabStatus === 'awaiting_payment' && (
        <div style={{ background: '#fffbeb', borderBottom: '2px solid #f59e0b', padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.85rem', color: '#854d0e', fontWeight: 700 }}>
          💳 Bill Requested — Please proceed to the counter to pay
        </div>
      )}

      <div style={{ padding: '1rem' }}>
        {/* Empty state */}
        {activeTabOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#999' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🍽️</div>
            <div style={{ fontWeight: 700, marginBottom: '0.4rem' }}>No orders yet</div>
            <div style={{ fontSize: '0.82rem', marginBottom: '1.25rem' }}>Browse our menu and place your first order!</div>
            {tab?.tabStatus === 'open' && (
              <button onClick={() => setView('menu')} style={{ ...btn(), padding: '0.7rem 1.5rem', borderRadius: 12 }}>
                🍛 Browse Menu
              </button>
            )}
          </div>
        ) : (
          <>
            {/* View toggle */}
            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem' }}>
              {(['aggregated', 'individual'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setTrackingView(v)}
                  style={{
                    padding: '0.3rem 0.8rem', borderRadius: 20, cursor: 'pointer',
                    fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: '0.75rem',
                    border: `2px solid ${trackingView === v ? '#E65C00' : '#ddd'}`,
                    background: trackingView === v ? '#E65C00' : 'white',
                    color: trackingView === v ? 'white' : '#666',
                  }}
                >
                  {v === 'aggregated' ? '📋 Summary' : '🗃️ By Order'}
                </button>
              ))}
            </div>

            {/* Aggregated view */}
            {trackingView === 'aggregated' && (
              <div style={{ background: 'white', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', marginBottom: '0.75rem' }}>
                {aggregatedItems.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 1rem', borderBottom: '1px solid #f5f0e8' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1A0800' }}>{item.name} <span style={{ color: '#aaa', fontWeight: 400 }}>×{item.qty}</span></div>
                      <div style={{ fontSize: '0.7rem', marginTop: '0.1rem' }}>
                        <span style={{ color: STATUS_COLOR[item.status] || '#888' }}>{STATUS_ICON[item.status]} {STATUS_LABEL[item.status]}</span>
                      </div>
                    </div>
                    <span style={{ fontWeight: 800, color: '#E65C00', fontSize: '0.88rem' }}>₹{item.price * item.qty}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Individual orders view */}
            {trackingView === 'individual' && activeTabOrders.map(order => (
              <div key={order.id} style={{ background: 'white', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', marginBottom: '0.75rem', borderLeft: `4px solid ${STATUS_COLOR[order.status] || '#ddd'}` }}>
                <div style={{ padding: '0.65rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f5f0e8' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#1A0800' }}>Order #{order.orderNum || order.id.slice(-4)}</div>
                    <div style={{ fontSize: '0.7rem', color: STATUS_COLOR[order.status] || '#888', marginTop: '0.1rem' }}>{STATUS_ICON[order.status]} {STATUS_LABEL[order.status]}</div>
                  </div>
                  <span style={{ fontWeight: 800, color: '#E65C00' }}>₹{order.total}</span>
                </div>
                {(order.items || []).map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 1rem', fontSize: '0.8rem', color: '#555' }}>
                    <span>{item.name} <span style={{ color: '#aaa' }}>×{item.qty}</span></span>
                    <span>₹{item.subtotal}</span>
                  </div>
                ))}
              </div>
            ))}

            {/* Bill summary */}
            <div style={{ background: 'white', borderRadius: 14, padding: '0.85rem 1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#666', marginBottom: '0.2rem' }}>
                <span>Subtotal</span>
                <span>₹{tabTotal}</span>
              </div>
              {tabDiscount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#16a34a', marginBottom: '0.2rem' }}>
                  <span>Discount</span>
                  <span>−₹{tabDiscount}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '1rem', color: '#1A0800', borderTop: '2px solid #f5f0e8', paddingTop: '0.4rem', marginTop: '0.2rem' }}>
                <span>Total</span>
                <span>₹{billTotal}</span>
              </div>
            </div>

            {/* Request Bill section */}
            {tab?.tabStatus === 'open' && (
              <div style={{ marginBottom: '0.75rem' }}>
                {hasUnservedOrders && (
                  <div style={{
                    background: 'rgba(249,168,38,0.12)', border: '1px solid #F9A826',
                    borderRadius: 8, padding: '0.65rem 0.9rem', fontSize: '0.78rem',
                    color: '#92400e', textAlign: 'center', lineHeight: 1.5, marginBottom: '0.5rem',
                  }}>
                    ⏳ Your food is still being prepared. You can request the bill once everything is served.
                  </div>
                )}
                <button
                  onClick={hasUnservedOrders ? undefined : handleRequestBill}
                  disabled={hasUnservedOrders}
                  style={{
                    ...btn(hasUnservedOrders ? '#e5e7eb' : '#1A0800', hasUnservedOrders ? '#9ca3af' : 'white'),
                    width: '100%', padding: '0.8rem', fontSize: '0.95rem', borderRadius: 12,
                    cursor: hasUnservedOrders ? 'not-allowed' : 'pointer',
                    opacity: hasUnservedOrders ? 0.7 : 1,
                  }}
                >
                  🧾 Request Bill
                </button>
              </div>
            )}

            {tab?.tabStatus === 'awaiting_payment' && (
              <div style={{ background: '#fef9c3', border: '2px solid #f59e0b', borderRadius: 12, padding: '1rem', textAlign: 'center', marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>💳</div>
                <div style={{ fontWeight: 800, color: '#854d0e', marginBottom: '0.2rem' }}>Bill Requested!</div>
                <div style={{ fontSize: '0.8rem', color: '#713f12' }}>Please proceed to the counter to complete payment of ₹{billTotal}</div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom navigation */}
      {tab && tab.tabStatus !== 'closed' && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'white', boxShadow: '0 -4px 20px rgba(0,0,0,0.1)', padding: '0.6rem 1rem', display: 'flex', gap: '0.5rem', zIndex: 100 }}>
          {tab.tabStatus === 'open' && (
            <button onClick={() => setView('menu')} style={{ ...btn('#E65C00'), flex: 1, padding: '0.7rem', borderRadius: 10, fontSize: '0.85rem' }}>
              🍛 Order More
            </button>
          )}
          <button
            onClick={handleCallWaiter}
            disabled={callCooldown > 0}
            style={{
              ...btn(callCooldown > 0 ? '#9ca3af' : '#1A0800'),
              flex: 1, padding: '0.7rem', borderRadius: 10, fontSize: '0.82rem',
              cursor: callCooldown > 0 ? 'not-allowed' : 'pointer',
              opacity: callCooldown > 0 ? 0.8 : 1,
            }}
          >
            {callCooldown > 0 ? `🔔 Wait ${callCooldown}s` : '🔔 Call Waiter'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Export with Suspense ─────────────────────────────────────────────────────
export default function TablePage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#1A0800,#3D1C00)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'white', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🍽️</div>
          <div style={{ fontFamily: 'Poppins,sans-serif' }}>Loading…</div>
        </div>
      </div>
    }>
      <TablePageInner />
    </Suspense>
  );
}
