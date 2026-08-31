'use client';
// ─── Foodie Lover — Staff-Assisted Ordering / "Take Order" ────────────────────
// Self-contained component, lazy-loaded from app/waiter/page.tsx as a
// full-screen overlay (see the small edits made there: one lazy import, one
// state flag, one big "+ Take Order" button, one conditional render block —
// same low-risk pattern used for the Admin Finance feature).
//
// Solves: not every dine-in customer can/wants to use the table QR. A waiter
// (or counter staff) can place an order on the customer's behalf using the
// SAME menu, pricing, variants, order lifecycle, kitchen routing, and
// customer-tab architecture the QR flow already uses — see
// docs/staff-ordering-implementation-report.md for the full write-up.
//
// Staff mental model (kept deliberately shallow):
//   Dine-In:  Order Type → Table → Customer/Guest → Food → Send
//   Pickup:   Order Type → Guest (optional) → Food → Send
//
// No tab IDs, order IDs, or database terms are ever shown to staff.
//
// Data model recap:
//   • Dine-in "existing customer, add items" and "new guest at this table"
//     both use the EXISTING customer_tabs architecture (createTab / the tab
//     already fetched) — never a separate "staff bill". A new guest with no
//     name becomes "Guest 1" / "Guest 2" / ... local to that table, exactly
//     as the spec asks — never a raw tab ID.
//   • Pickup does not use a tab at all — same as the existing online/pickup
//     flow already doesn't.
//   • Every order this screen creates goes through the EXACT SAME
//     POST /api/orders → (awaiting_waiter) → confirm_and_print /
//     confirm_and_kitchen pipeline any other order uses. The only difference
//     is this component performs the confirm step itself right after
//     creation (using the authenticated waiter's own name) instead of
//     leaving the order in the waiter's queue for the SAME waiter to
//     re-confirm — see handleSend() below.
//   • orders.source records where the order came from ('waiter' | 'counter')
//     purely as metadata — it never changes pricing, totals, or how Finance
//     computes System Sales (which reads completed orders/tabs live,
//     regardless of source).

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  getTables, getTabs, createTab, getMenu, createOrder, getOrders,
  confirmAndPrintOrder, confirmAndKitchenOrder, getKitchenRoutingMode,
  orderMoreOnPickup, genIdempotencyKey,
  Table, CustomerTab, MenuItem, Order,
} from '@/lib/api';
import type { AuthSession } from '@/lib/auth';
import { formatTableName } from '@/lib/format';
import { MENU_CATEGORIES_WITH_ALL } from '@/lib/categories';

// ─── Props ──────────────────────────────────────────────────────────────────
interface Props {
  session: AuthSession;
  onClose: () => void;   // returns to the main Waiter Station queue (and refreshes it)
}

// ─── Local types ────────────────────────────────────────────────────────────
type Step = 'type' | 'table' | 'tableGuests' | 'newGuestForm' | 'pickupGuest' | 'pickupActive' | 'menu' | 'cart' | 'success';
type OrderTypeChoice = 'dine-in' | 'pickup';

interface CartEntry {
  key: string; itemId: string; itemName: string; variantName: string; variantPrice: number; qty: number;
}

interface OrderContext {
  type: OrderTypeChoice;
  tableId?: string;
  tableLabel?: string;
  tabId?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  // Set ONLY for a Pickup "Order More" flow — when present, Send appends
  // the cart's items to this already-confirmed order instead of creating a
  // new order/customer (task spec Part A6-A9).
  orderMoreTargetId?:  string;
  orderMoreTargetNum?: number;
}

interface SuccessInfo {
  ctx: OrderContext;
  itemCount: number;
  total: number;
  orderNum?: number;
  routedLabel: string;
  routedOk: boolean;
}

// ─── Style tokens (mirrors app/waiter/page.tsx's purple header + the orange
//     "add to cart" accents used across table/page.tsx and online/page.tsx,
//     so this reads as part of the same product) ──────────────────────────
const PURPLE = '#7c3aed';
const ORANGE = '#E65C00';
const INK    = '#1A0800';
const btn = (bg = ORANGE, c = 'white'): React.CSSProperties => ({
  background: bg, color: c, border: 'none', borderRadius: 12,
  fontWeight: 800, cursor: 'pointer', fontFamily: 'Poppins,sans-serif',
  padding: '0.9rem 1.2rem', fontSize: '1rem',
});
const smallBtn = (bg = ORANGE, c = 'white'): React.CSSProperties => ({
  background: bg, color: c, border: 'none', borderRadius: 8,
  fontWeight: 700, cursor: 'pointer', fontFamily: 'Poppins,sans-serif',
  padding: '0.5rem 0.9rem', fontSize: '0.82rem',
});
const inp: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '0.75rem 0.9rem',
  border: '2px solid #e5e7eb', borderRadius: 12, fontFamily: 'Poppins,sans-serif',
  fontSize: '1rem', outline: 'none',
};
const fieldLabel: React.CSSProperties = {
  fontSize: '0.75rem', fontWeight: 700, color: '#555', display: 'block', marginBottom: '0.3rem',
};
const screenWrap: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 300, background: 'linear-gradient(135deg,#fff8f3,#fff0e8)',
  fontFamily: 'Poppins,sans-serif', display: 'flex', flexDirection: 'column', overflow: 'hidden',
};
const topBar: React.CSSProperties = {
  background: 'linear-gradient(135deg,#7c3aed,#5b21b6)', color: 'white',
  padding: '0.85rem 1rem', paddingTop: 'max(0.85rem, env(safe-area-inset-top, 0px))',
  display: 'flex', alignItems: 'center', gap: '0.6rem', boxShadow: '0 4px 16px rgba(0,0,0,0.2)', flexShrink: 0,
};
const backBtnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', color: 'white',
  borderRadius: 10, padding: '0.5rem 0.8rem', fontWeight: 700, cursor: 'pointer',
  fontFamily: 'Poppins,sans-serif', fontSize: '0.85rem', flexShrink: 0,
};

function money(n: number) { return `₹${(isFinite(n) ? n : 0).toLocaleString('en-IN')}`; }
// "Started 7:15 PM" — used to tell same-named active customers apart (task
// spec §4) without exposing anything more sensitive than a clock time.
// Never throws on a bad/missing timestamp — falls back to '' so a broken
// date can never render as "Invalid Date" on the guest card.
function formatStartedTime(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
}
function qtyCircleBtn(bg: string, c: string): React.CSSProperties {
  return { width: 26, height: 26, borderRadius: '50%', border: 'none', background: bg, color: c, fontWeight: 900, cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' };
}

// ════════════════════════════════════════════════════════════════════════════
// Main component
// ════════════════════════════════════════════════════════════════════════════

export default function WaiterTakeOrder({ session, onClose }: Props) {
  const [step, setStep] = useState<Step>('type');
  const [orderType, setOrderType] = useState<OrderTypeChoice | null>(null);

  // ── Dine-in: table + existing-guest selection ─────────────────────────────
  const [tables, setTables] = useState<Table[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [tablesError, setTablesError] = useState('');
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [tableTabs, setTableTabs] = useState<CustomerTab[]>([]);
  const [loadingTabs, setLoadingTabs] = useState(false);
  // Existing-orders count per open tab at the selected table — shown as
  // "Existing Orders: N" on each guest card (task spec §A2/§A3 example format).
  const [tabOrderCounts, setTabOrderCounts] = useState<Record<string, number>>({});

  // ── Pickup: active (in-kitchen) pickup orders eligible for Order More ─────
  const [activePickupOrders, setActivePickupOrders] = useState<Order[]>([]);
  const [loadingPickupOrders, setLoadingPickupOrders] = useState(false);
  const [pickupOrdersError, setPickupOrdersError] = useState('');

  // ── New guest / pickup guest form ─────────────────────────────────────────
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestParty, setGuestParty] = useState('2');
  const [guestBusy, setGuestBusy] = useState(false);
  const [guestError, setGuestError] = useState('');

  // ── Order context — set once table/customer (or pickup guest) is decided ──
  const [ctx, setCtx] = useState<OrderContext | null>(null);

  // ── Menu / cart ────────────────────────────────────────────────────────────
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [menuLoaded, setMenuLoaded] = useState(false);
  const [menuError, setMenuError] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<Record<string, CartEntry>>({});
  const [notes, setNotes] = useState('');
  const [variantModal, setVariantModal] = useState<{ open: boolean; item: MenuItem | null; selected: string }>({ open: false, item: null, selected: '' });

  // ── Kitchen routing mode (fetched once — used to decide the Send flow) ────
  const [routingMode, setRoutingMode] = useState<'ask' | 'printer' | 'kitchen_display'>('ask');

  // ── Send flow ──────────────────────────────────────────────────────────────
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [successInfo, setSuccessInfo] = useState<SuccessInfo | null>(null);

  // Load menu + routing mode once, in the background, as soon as the screen opens
  // (not gated on any earlier step) so the Menu screen never has to wait later.
  useEffect(() => {
    let cancelled = false;
    getMenu()
      .then(items => { if (!cancelled) { setMenu(items); setMenuLoaded(true); } })
      .catch(e => { if (!cancelled) setMenuError(e instanceof Error ? e.message : 'Could not load menu'); });
    getKitchenRoutingMode().then(m => { if (!cancelled) setRoutingMode(m); });
    return () => { cancelled = true; };
  }, []);

  // ── Step: Order Type ───────────────────────────────────────────────────────
  async function chooseDineIn() {
    setOrderType('dine-in');
    setStep('table');
    if (tables.length === 0) {
      setLoadingTables(true); setTablesError('');
      try { setTables(await getTables()); }
      catch (e) { setTablesError(e instanceof Error ? e.message : 'Could not load tables'); }
      finally { setLoadingTables(false); }
    }
  }
  // Pickup now opens on an "Active Pickup Orders" list (task spec §A6) —
  // never straight into a blank guest form — so a second round for a
  // customer already in the kitchen pipeline becomes Order More instead of
  // a brand-new, disconnected order.
  async function choosePickup() {
    setOrderType('pickup');
    setStep('pickupActive');
    setLoadingPickupOrders(true); setPickupOrdersError('');
    try {
      const all = await getOrders({ type: 'pickup', activeOnly: true, limit: 100 });
      // Eligible for Order More only while still actively in the kitchen
      // pipeline — not yet confirmed ('awaiting_waiter') is excluded because
      // that round hasn't even reached the kitchen yet (§A7).
      setActivePickupOrders(all.filter(o => ['pending', 'preparing', 'prepared'].includes(o.status)));
    } catch (e) {
      setPickupOrdersError(e instanceof Error ? e.message : 'Could not load active pickup orders');
    } finally {
      setLoadingPickupOrders(false);
    }
  }

  function startNewPickupOrder() {
    setGuestName(''); setGuestPhone(''); setGuestEmail(''); setGuestError('');
    setStep('pickupGuest');
  }

  // "Order More" on an existing pickup order — jumps straight to the menu
  // using that order's own customer info, skipping the guest form entirely
  // (there's nothing new to ask — the customer already exists).
  function selectPickupOrderMore(order: Order) {
    setCtx({
      type:               'pickup',
      customerName:       order.customerName || 'Walk-in Guest',
      customerEmail:      order.customerEmail || undefined,
      customerPhone:      order.phone || undefined,
      orderMoreTargetId:  order.id,
      orderMoreTargetNum: order.orderNum,
    });
    setCart({}); setNotes('');
    setStep('menu');
  }

  // ── Step: Select Table → load ACTIVE CUSTOMER SESSIONS for that table ─────
  // "Active" here means any open customer_tab at this table, regardless of
  // which channel created it — a session a customer started themselves by
  // scanning the table QR code is exactly as eligible for waiter Order More
  // as one the waiter opened. There is no separate "waiter tab" concept —
  // customer_tabs has no source/channel column at all, so nothing here needs
  // to special-case or filter by how the session began (task spec §1/§13).
  // Scoped server-side by tableId (GET /api/tabs?tableId=...) instead of
  // fetching every open tab restaurant-wide and filtering in the browser —
  // the server also returns each tab's live orderCount in the same query
  // (task spec §27 — avoid N+1).
  async function selectTable(table: Table) {
    setSelectedTable(table);
    setLoadingTabs(true);
    setTableTabs([]);
    setTabOrderCounts({});
    try {
      // Only 'open' tabs are ever returned here — a tab that's already
      // 'awaiting_payment' (billing in progress) or 'closed' never appears
      // as an Order More option (task spec §11/§12).
      const atThisTable = await getTabs('open', undefined, table.id);
      setTableTabs(atThisTable);
      setTabOrderCounts(Object.fromEntries(atThisTable.map(t => [t.id, t.orderCount ?? 0])));
      setStep('tableGuests');
    } catch (e) {
      setTablesError(e instanceof Error ? e.message : 'Could not load this table’s active customers');
      setStep('tableGuests'); // still let staff retry or start a new customer
    } finally {
      setLoadingTabs(false);
    }
  }

  // ── Existing customer session selected (QR- or waiter-opened — doesn't
  //    matter which) — Order More adds items to THIS EXACT customer_tab.id,
  //    never by table+name (task spec §26: name is display-only, the tab id
  //    is the real identity; two customers can share a name safely). ───────
  function selectExistingTab(tab: CustomerTab) {
    setCtx({
      type: 'dine-in',
      tableId: selectedTable?.id,
      tableLabel: formatTableName(selectedTable?.id) || selectedTable?.name,
      tabId: tab.id,
      customerName: tab.customerName || 'Guest',
      customerEmail: tab.email || undefined,
      customerPhone: tab.phone || undefined,
    });
    setCart({}); setNotes('');
    setStep('menu');
  }

  // ── "+ New Guest" — create a normal customer_tabs row, exactly like the
  //    QR flow does, so Manager billing / table occupancy / Finance all just
  //    work with zero special-casing. ─────────────────────────────────────
  async function createNewGuestAndProceed() {
    if (!selectedTable || guestBusy) return;
    setGuestBusy(true); setGuestError('');
    try {
      const autoName = `Guest ${tableTabs.length + 1}`;
      const tab = await createTab({
        tableId: selectedTable.id,
        customerName: guestName.trim() || autoName,
        partySize: Math.max(1, parseInt(guestParty, 10) || 1),
        email: guestEmail.trim() || undefined,
        phone: guestPhone.trim() || undefined,
        waiterId: session.accountId,
        waiterName: session.name,
      });
      setCtx({
        type: 'dine-in',
        tableId: selectedTable.id,
        tableLabel: formatTableName(selectedTable.id) || selectedTable.name,
        tabId: tab.id,
        customerName: tab.customerName || autoName,
        customerEmail: tab.email || undefined,
        customerPhone: tab.phone || undefined,
      });
      setCart({}); setNotes('');
      setStep('menu');
    } catch (e) {
      setGuestError(e instanceof Error ? e.message : 'Could not seat this guest. Please try again.');
    } finally {
      setGuestBusy(false);
    }
  }

  // ── Pickup guest info — no tab, no table; proceeds straight to the menu ───
  function proceedPickupGuest() {
    setCtx({
      type: 'pickup',
      customerName: guestName.trim() || 'Walk-in Guest',
      customerEmail: guestEmail.trim() || undefined,
      customerPhone: guestPhone.trim() || undefined,
    });
    setCart({}); setNotes('');
    setStep('menu');
  }

  // ── Cart mutation helpers (mirror app/table/page.tsx exactly — same cart
  //    entry shape, same variant-picker flow — so behaviour is identical to
  //    what customers already experience) ────────────────────────────────
  function updateCartQty(key: string, delta: number) {
    setCart(prev => {
      const entry = prev[key];
      if (!entry) return prev;
      const newQty = Math.max(0, entry.qty + delta);
      if (newQty === 0) { const next = { ...prev }; delete next[key]; return next; }
      return { ...prev, [key]: { ...entry, qty: newQty } };
    });
  }
  function removeCartEntry(key: string) {
    setCart(prev => { const next = { ...prev }; delete next[key]; return next; });
  }
  function addToCartDirect(item: MenuItem) {
    const key = `${item.id}__`;
    setCart(prev => ({ ...prev, [key]: { key, itemId: item.id, itemName: item.name, variantName: '', variantPrice: item.price, qty: (prev[key]?.qty ?? 0) + 1 } }));
  }
  function openVariantPicker(item: MenuItem) {
    setVariantModal({ open: true, item, selected: item.variants?.[0]?.name ?? '' });
  }
  function confirmVariantAdd() {
    const { item, selected } = variantModal;
    if (!item || !selected) return;
    const variant = item.variants?.find(v => v.name === selected);
    if (!variant) return;
    const key = `${item.id}__${selected}`;
    setCart(prev => ({ ...prev, [key]: { key, itemId: item.id, itemName: item.name, variantName: selected, variantPrice: variant.price, qty: (prev[key]?.qty ?? 0) + 1 } }));
    setVariantModal({ open: false, item: null, selected: '' });
  }
  function itemCartQty(itemId: string): number {
    return Object.values(cart).filter(e => e.itemId === itemId).reduce((s, e) => s + e.qty, 0);
  }

  const cartEntries = useMemo(() => Object.values(cart).filter(e => e.qty > 0), [cart]);
  const cartCount = cartEntries.reduce((s, e) => s + e.qty, 0);
  const cartTotal = cartEntries.reduce((s, e) => s + e.qty * e.variantPrice, 0);

  const categories = useMemo(() => MENU_CATEGORIES_WITH_ALL.filter(c => c === 'All' || menu.some(m => m.category === c)), [menu]);
  const filteredMenu = useMemo(() => {
    const q = search.trim().toLowerCase();
    return menu.filter(m =>
      (catFilter === 'All' || m.category === catFilter) &&
      (!q || m.name.toLowerCase().includes(q) || (m.desc || '').toLowerCase().includes(q)),
    );
  }, [menu, catFilter, search]);

  // ── Send Order — creates the order, then performs the SAME confirmation
  //    action a waiter would otherwise take from their queue, so a staff-
  //    entered order never sits waiting for that same waiter to confirm it
  //    a second time (spec §15). If routing is 'ask', the caller passes the
  //    waiter's explicit choice; otherwise the restaurant's configured
  //    default is used. ─────────────────────────────────────────────────
  const sendingRef = useRef(false); // belt-and-braces guard against double-tap beyond the disabled button
  async function handleSend(routingChoice?: 'printer' | 'kitchen_display') {
    if (sending || sendingRef.current || !ctx || cartEntries.length === 0) return;
    sendingRef.current = true;
    setSending(true); setSendError('');

    const items = cartEntries.map(e => ({
      name:       e.variantName ? `${e.itemName} (${e.variantName})` : e.itemName,
      qty:        e.qty,
      price:      e.variantPrice,
      subtotal:   e.variantPrice * e.qty,
      menuItemId: e.itemId,
    }));
    const subtotal = items.reduce((s, i) => s + i.subtotal, 0);

    // ── Pickup "Order More" — append to the existing order, don't create a
    //    new one. Kitchen routing is decided server-side from that order's
    //    own kitchen_route (already set when it was first confirmed), so
    //    there's no printer/kitchen-display choice to make here. ───────────
    if (ctx.orderMoreTargetId) {
      try {
        const res = await orderMoreOnPickup(ctx.orderMoreTargetId, {
          items, subtotal, total: subtotal,
          notes: notes.trim() || undefined,
          by: session.name,
          idempotencyKey: genIdempotencyKey('wtr_more'),
        });
        const routedLabel = res.alreadyExists
          ? '✅ Already sent (duplicate tap ignored)'
          : res.printJobId ? '🖨️ New items sent to kitchen printer' : '🖥️ New items sent to Kitchen Display';
        setSuccessInfo({ ctx, itemCount: cartCount, total: subtotal, orderNum: ctx.orderMoreTargetNum, routedLabel, routedOk: true });
        setCart({}); setNotes('');
        setStep('success');
      } catch (e) {
        setSendError(e instanceof Error ? e.message : 'Could not add items to this order. Please try again.');
      } finally {
        setSending(false);
        sendingRef.current = false;
      }
      return;
    }

    let created: Order | null = null;
    try {
      created = await createOrder({
        type:            ctx.type,
        customerName:    ctx.customerName,
        customerEmail:   ctx.customerEmail,
        phone:           ctx.customerPhone,
        tableId:         ctx.tableId,
        tabId:           ctx.tabId,
        items, subtotal, total: subtotal,
        source:          ctx.type === 'dine-in' ? 'waiter' : 'counter',
        notes:           notes.trim() || undefined,
        createdByStaffId:   session.accountId,
        createdByStaffName: session.name,
        // Stable per-submission key — a double-tap or a network retry of
        // this exact click returns the original order instead of creating
        // a duplicate (task spec §A18).
        idempotencyKey:  genIdempotencyKey('wtr'),
      });
    } catch (e) {
      // Nothing was persisted — safe to let the waiter retry freely. Cart is
      // intentionally NOT cleared so no items are lost.
      setSendError(e instanceof Error ? e.message : 'Order could not be sent. Please try again.');
      setSending(false);
      sendingRef.current = false;
      return;
    }

    // Order now exists in the database (awaiting_waiter). From this point on
    // we never retry the create step (that would risk a duplicate order) —
    // any failure below is surfaced but still treated as "sent".
    const mode = routingChoice ?? (routingMode === 'ask' ? 'printer' : routingMode);
    let routedLabel = '';
    let routedOk = true;
    try {
      if (mode === 'printer') {
        const res = await confirmAndPrintOrder(created.id, session.name);
        routedLabel = res.printJobId ? '🖨️ KOT sent to kitchen printer' : '✅ Sent to kitchen';
      } else {
        await confirmAndKitchenOrder(created.id, session.name);
        routedLabel = '🖥️ Sent to Kitchen Display';
      }
    } catch (e) {
      routedOk = false;
      routedLabel = `⚠️ Order was saved but could not be auto-confirmed (${e instanceof Error ? e.message : 'unknown error'}). It is waiting in your order queue — please confirm it from there.`;
    }

    setSuccessInfo({ ctx, itemCount: cartCount, total: subtotal, orderNum: created.orderNum, routedLabel, routedOk });
    setCart({}); setNotes('');
    setStep('success');
    setSending(false);
    sendingRef.current = false;
  }

  function takeAnotherOrder() {
    setStep('type'); setOrderType(null);
    setSelectedTable(null); setTableTabs([]); setTabOrderCounts({});
    setActivePickupOrders([]); setPickupOrdersError('');
    setCtx(null); setCart({}); setNotes('');
    setGuestName(''); setGuestPhone(''); setGuestEmail(''); setGuestParty('2'); setGuestError('');
    setSuccessInfo(null); setSendError('');
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Render
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div style={screenWrap}>
      {/* ── Top bar — present on every step except the celebratory success screen ── */}
      {step !== 'success' && (
        <div style={topBar}>
          {step !== 'type' && (
            <button
              onClick={() => {
                if (step === 'table') setStep('type');
                else if (step === 'tableGuests') setStep('table');
                else if (step === 'newGuestForm') setStep('tableGuests');
                else if (step === 'pickupActive') setStep('type');
                else if (step === 'pickupGuest') setStep('pickupActive');
                else if (step === 'cart') setStep('menu');
                // 'menu' has no back — the tab/order context already exists; exiting uses ✕ below.
              }}
              style={backBtnStyle}
            >
              ← Back
            </button>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 900, fontSize: '1.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {step === 'type'         ? '📝 New Order' :
               step === 'table'        ? '🍽 Select Table' :
               step === 'tableGuests'  ? formatTableName(selectedTable?.id) || selectedTable?.name || 'Table' :
               step === 'newGuestForm' ? `New Guest — ${formatTableName(selectedTable?.id) || selectedTable?.name || ''}` :
               step === 'pickupActive' ? '🛍 Pickup Orders' :
               step === 'pickupGuest'  ? '🛍 New Pickup Order' :
               step === 'menu'         ? (ctx?.orderMoreTargetId ? `Order More — ${ctx.customerName}` : ctx?.tableLabel ? `${ctx.tableLabel} — ${ctx.customerName}` : ctx?.customerName || 'Menu') :
               step === 'cart'         ? '🧾 Your Order' : ''}
            </div>
          </div>
          {cartCount > 0 && step === 'menu' && (
            <div style={{ background: '#f59e0b', color: '#1A0800', padding: '0.3rem 0.6rem', borderRadius: 20, fontSize: '0.78rem', fontWeight: 900, flexShrink: 0 }}>
              🛒 {cartCount}
            </div>
          )}
          <button onClick={onClose} style={{ ...backBtnStyle, background: 'rgba(255,255,255,0.1)' }} title="Exit Take Order">✕</button>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>

        {/* ═══════════ STEP: Order Type ═══════════ */}
        {step === 'type' && (
          <div style={{ padding: '1.5rem 1.25rem', maxWidth: 480, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', color: '#888', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              How is this customer ordering?
            </div>
            <button onClick={chooseDineIn} style={{ ...btn(PURPLE), width: '100%', display: 'flex', alignItems: 'center', gap: '0.9rem', padding: '1.4rem', borderRadius: 18, marginBottom: '1rem', fontSize: '1.15rem' }}>
              <span style={{ fontSize: '2.2rem' }}>🍽</span>
              <span style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 900 }}>Dine-In</div>
                <div style={{ fontWeight: 500, fontSize: '0.78rem', opacity: 0.85 }}>Customer is seated at a table</div>
              </span>
            </button>
            <button onClick={choosePickup} style={{ ...btn(ORANGE), width: '100%', display: 'flex', alignItems: 'center', gap: '0.9rem', padding: '1.4rem', borderRadius: 18, fontSize: '1.15rem' }}>
              <span style={{ fontSize: '2.2rem' }}>🛍</span>
              <span style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 900 }}>Pickup</div>
                <div style={{ fontWeight: 500, fontSize: '0.78rem', opacity: 0.85 }}>Customer is ordering at the counter</div>
              </span>
            </button>
          </div>
        )}

        {/* ═══════════ STEP: Select Table ═══════════ */}
        {step === 'table' && (
          <div style={{ padding: '1.25rem' }}>
            {loadingTables && <div style={{ textAlign: 'center', color: '#999', padding: '2rem' }}>Loading tables…</div>}
            {tablesError && <div style={{ color: '#ef4444', fontWeight: 700, padding: '1rem', textAlign: 'center' }}>⚠️ {tablesError}</div>}
            {!loadingTables && !tablesError && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: '0.85rem' }}>
                {tables.map(t => {
                  const occupied = t.status === 'occupied';
                  return (
                    <button
                      key={t.id}
                      onClick={() => selectTable(t)}
                      style={{
                        background: occupied ? '#fff7ed' : '#f0fdf4',
                        border: `2.5px solid ${occupied ? '#f59e0b' : '#16a34a'}`,
                        borderRadius: 16, padding: '1.1rem 0.6rem', cursor: 'pointer',
                        fontFamily: 'Poppins,sans-serif', textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: '1.7rem', marginBottom: '0.2rem' }}>{occupied ? '🟠' : '🟢'}</div>
                      <div style={{ fontWeight: 900, fontSize: '1.05rem', color: INK }}>{formatTableName(t.id) || t.name}</div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: occupied ? '#b45309' : '#15803d', marginTop: '0.15rem' }}>
                        {occupied ? 'Occupied' : 'Available'}
                      </div>
                      <div style={{ fontSize: '0.66rem', color: '#999', marginTop: '0.1rem' }}>Seats {t.capacity ?? '?'}</div>
                    </button>
                  );
                })}
              </div>
            )}
            <div style={{ textAlign: 'center', color: '#aaa', fontSize: '0.72rem', marginTop: '1.25rem' }}>
              Tip: you can still select an occupied table — customers often order more food.
            </div>
          </div>
        )}

        {/* ═══════════ STEP: Active Customer Sessions at this table ═══════════
             Every open customer_tab at this table, regardless of whether it
             was started by the customer's own QR scan or a waiter — there is
             no "waiter-only" view of this table's sessions (task spec §1-3).
             Selection always uses the tab's own id, never table+name (§26). */}
        {step === 'tableGuests' && (
          <div style={{ padding: '1.25rem', maxWidth: 520, margin: '0 auto' }}>
            {loadingTabs && <div style={{ textAlign: 'center', color: '#999', padding: '2rem' }}>Loading…</div>}
            {tablesError && <div style={{ color: '#ef4444', fontWeight: 700, padding: '0.75rem', textAlign: 'center' }}>⚠️ {tablesError}</div>}
            {!loadingTabs && (
              <>
                <div style={{ fontSize: '0.78rem', color: '#888', fontWeight: 700, marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                  {formatTableName(selectedTable?.id) || selectedTable?.name || 'Table'} — Active Customers
                </div>
                {tableTabs.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#aaa', fontSize: '0.85rem', padding: '1.5rem 0.5rem' }}>
                    No active customers at this table right now.
                  </div>
                )}
                {tableTabs.map((tab) => {
                  // Same display name can legitimately appear twice (two
                  // separate QR scans, or a QR guest and a walk-in both
                  // called "Guest") — the started-time line is what lets the
                  // waiter tell them apart; the tab's own id (never the name)
                  // is what's actually sent to the server on selection (§4/§26).
                  const displayName = tab.customerName || 'Guest';
                  const started = formatStartedTime(tab.createdAt);
                  return (
                    <button
                      key={tab.id}
                      onClick={() => selectExistingTab(tab)}
                      style={{
                        width: '100%', textAlign: 'left', background: 'white', border: '2px solid #f0e4d7',
                        borderRadius: 14, padding: '1rem 1.1rem', marginBottom: '0.7rem', cursor: 'pointer',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'Poppins,sans-serif',
                      }}
                    >
                      <span>
                        <div style={{ fontWeight: 800, fontSize: '1rem', color: INK }}>👤 {displayName}</div>
                        <div style={{ fontSize: '0.72rem', color: '#999', marginTop: '0.1rem' }}>
                          {started ? `Started ${started} · ` : ''}Party of {tab.partySize} · Orders: {tabOrderCounts[tab.id] ?? tab.orderCount ?? '…'}
                        </div>
                      </span>
                      <span style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 900, color: ORANGE, fontSize: '1.05rem' }}>{money(tab.total)}</div>
                        <div style={{ fontSize: '0.66rem', color: '#aaa' }}>Current Bill</div>
                        <div style={{ fontSize: '0.68rem', fontWeight: 900, color: PURPLE, marginTop: '0.25rem' }}>Order More →</div>
                      </span>
                    </button>
                  );
                })}
                <button
                  onClick={() => { setGuestName(''); setGuestPhone(''); setGuestEmail(''); setGuestParty('2'); setGuestError(''); setStep('newGuestForm'); }}
                  style={{ ...btn('white', ORANGE), width: '100%', border: `2.5px dashed ${ORANGE}`, marginTop: '0.4rem' }}
                >
                  {tableTabs.length === 0 ? '＋ Start New Order' : '＋ Start New Customer / New Order'}
                </button>
              </>
            )}
          </div>
        )}

        {/* ═══════════ STEP: New Guest form (dine-in) ═══════════ */}
        {step === 'newGuestForm' && (
          <div style={{ padding: '1.25rem', maxWidth: 480, margin: '0 auto' }}>
            <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 12, padding: '0.75rem 1rem', fontSize: '0.78rem', color: '#1e40af', marginBottom: '1.1rem' }}>
              💡 Everything below is optional. If the customer doesn&apos;t want to give their name, just tap Continue — we&apos;ll call them
              {' '}<b>Guest {tableTabs.length + 1}</b>.
            </div>
            <label style={fieldLabel}>Customer Name (optional)</label>
            <input value={guestName} onChange={e => setGuestName(e.target.value)} placeholder={`Guest ${tableTabs.length + 1}`} style={{ ...inp, marginBottom: '0.8rem' }} autoFocus />
            <div style={{ display: 'flex', gap: '0.7rem', marginBottom: '0.8rem' }}>
              <div style={{ flex: 1 }}>
                <label style={fieldLabel}>Party Size</label>
                <input type="number" min="1" value={guestParty} onChange={e => setGuestParty(e.target.value)} style={inp} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={fieldLabel}>Phone (optional)</label>
                <input value={guestPhone} onChange={e => setGuestPhone(e.target.value)} placeholder="Not required" style={inp} />
              </div>
            </div>
            <label style={fieldLabel}>Email (optional)</label>
            <input value={guestEmail} onChange={e => setGuestEmail(e.target.value)} placeholder="Not required" style={{ ...inp, marginBottom: '1.1rem' }} />
            {guestError && <div style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.8rem' }}>⚠️ {guestError}</div>}
            <button onClick={createNewGuestAndProceed} disabled={guestBusy} style={{ ...btn(PURPLE), width: '100%', opacity: guestBusy ? 0.6 : 1 }}>
              {guestBusy ? '⏳ Seating…' : '✅ Continue to Menu'}
            </button>
          </div>
        )}

        {/* ═══════════ STEP: Active Pickup Orders (New vs Order More) ═══════════ */}
        {step === 'pickupActive' && (
          <div style={{ padding: '1.25rem', maxWidth: 520, margin: '0 auto' }}>
            <button
              onClick={startNewPickupOrder}
              style={{ ...btn(ORANGE), width: '100%', border: `2.5px dashed ${ORANGE}`, background: 'white', color: ORANGE, marginBottom: '1.1rem' }}
            >
              ＋ New Pickup Order
            </button>

            <div style={{ fontSize: '0.78rem', color: '#888', fontWeight: 700, marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
              Active Pickup Orders
            </div>
            {loadingPickupOrders && <div style={{ textAlign: 'center', color: '#999', padding: '1.5rem' }}>Loading…</div>}
            {pickupOrdersError && <div style={{ color: '#ef4444', fontWeight: 700, padding: '0.75rem', textAlign: 'center' }}>⚠️ {pickupOrdersError}</div>}
            {!loadingPickupOrders && !pickupOrdersError && activePickupOrders.length === 0 && (
              <div style={{ textAlign: 'center', color: '#aaa', fontSize: '0.85rem', padding: '1.5rem' }}>No active pickup orders right now.</div>
            )}
            {!loadingPickupOrders && activePickupOrders.map(o => (
              <button
                key={o.id}
                onClick={() => selectPickupOrderMore(o)}
                style={{
                  width: '100%', textAlign: 'left', background: 'white', border: '2px solid #f0e4d7',
                  borderRadius: 14, padding: '1rem 1.1rem', marginBottom: '0.7rem', cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'Poppins,sans-serif',
                }}
              >
                <span>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: INK }}>
                    #{o.orderNum ?? o.id} — {o.customerName || 'Walk-in Guest'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#999', marginTop: '0.1rem' }}>
                    {o.phone ? `📞 ${o.phone} · ` : ''}{o.status === 'pending' ? 'In Queue' : o.status === 'preparing' ? 'Preparing' : 'Ready'}
                  </div>
                </span>
                <span style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 900, color: ORANGE, fontSize: '1.05rem' }}>{money(o.total)}</div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 900, color: PURPLE, marginTop: '0.25rem' }}>Order More →</div>
                </span>
              </button>
            ))}
          </div>
        )}

        {/* ═══════════ STEP: Pickup guest info (New Pickup Order only) ═══════════ */}
        {step === 'pickupGuest' && (
          <div style={{ padding: '1.25rem', maxWidth: 480, margin: '0 auto' }}>
            <div style={{ background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: 12, padding: '0.75rem 1rem', fontSize: '0.78rem', color: '#9a3412', marginBottom: '1.1rem' }}>
              💡 All fields are optional — tap Continue to skip straight to the menu.
            </div>
            <label style={fieldLabel}>Customer Name (optional)</label>
            <input value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Walk-in Guest" style={{ ...inp, marginBottom: '0.8rem' }} autoFocus />
            <label style={fieldLabel}>Phone (optional)</label>
            <input value={guestPhone} onChange={e => setGuestPhone(e.target.value)} placeholder="Not required" style={{ ...inp, marginBottom: '0.8rem' }} />
            <label style={fieldLabel}>Email (optional)</label>
            <input value={guestEmail} onChange={e => setGuestEmail(e.target.value)} placeholder="Not required" style={{ ...inp, marginBottom: '1.1rem' }} />
            <button onClick={proceedPickupGuest} style={{ ...btn(ORANGE), width: '100%' }}>✅ Continue to Menu</button>
          </div>
        )}

        {/* ═══════════ STEP: Menu ═══════════ */}
        {step === 'menu' && (
          <div style={{ paddingBottom: cartCount > 0 ? '5.5rem' : '1rem' }}>
            {/* Search */}
            <div style={{ padding: '1rem 1.1rem 0.5rem', position: 'sticky', top: 0, background: '#fff8f3', zIndex: 5 }}>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1rem' }}>🔍</span>
                <input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search Chicken, Biryani, Mandi…"
                  style={{ ...inp, paddingLeft: '2.4rem', paddingRight: search ? '2.2rem' : '0.9rem' }}
                />
                {search && (
                  <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '0.7rem', top: '50%', transform: 'translateY(-50%)', background: '#e5e7eb', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', fontWeight: 900, color: '#666' }}>×</button>
                )}
              </div>
              {/* Category chips */}
              <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', marginTop: '0.7rem', paddingBottom: '0.2rem' }}>
                {categories.map(c => (
                  <button
                    key={c} onClick={() => setCatFilter(c)}
                    style={{
                      padding: '0.4rem 0.9rem', borderRadius: 20, whiteSpace: 'nowrap', cursor: 'pointer',
                      fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: '0.78rem',
                      border: `2px solid ${catFilter === c ? ORANGE : '#eee'}`,
                      background: catFilter === c ? ORANGE : 'white',
                      color: catFilter === c ? 'white' : '#666',
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {menuError && <div style={{ color: '#ef4444', fontWeight: 700, padding: '1rem', textAlign: 'center' }}>⚠️ {menuError}</div>}
            {!menuLoaded && !menuError && <div style={{ textAlign: 'center', color: '#999', padding: '2rem' }}>Loading menu…</div>}

            {menuLoaded && (
              <div style={{ padding: '0.5rem 1rem 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: '0.8rem' }}>
                {filteredMenu.length === 0 && (
                  <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#999', padding: '2rem' }}>No dishes match.</div>
                )}
                {filteredMenu.map(item => {
                  const hasVariants = item.variants && item.variants.length > 1;
                  const qty = itemCartQty(item.id);
                  const unavailable = item.available === false;
                  return (
                    <div key={item.id} style={{ background: 'white', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', opacity: unavailable ? 0.5 : 1, position: 'relative' }}>
                      {item.img && (
                        <div style={{ height: 90, background: `center/cover url(${item.img})`, position: 'relative' }}>
                          {qty > 0 && (
                            <div style={{ position: 'absolute', top: 6, right: 6, background: ORANGE, color: 'white', borderRadius: 20, minWidth: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.75rem', padding: '0 0.3rem' }}>
                              {qty}
                            </div>
                          )}
                        </div>
                      )}
                      <div style={{ padding: '0.6rem 0.7rem' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.85rem', color: INK, lineHeight: 1.25 }}>{item.name}</div>
                        <div style={{ fontSize: '0.7rem', color: '#999', margin: '0.15rem 0 0.4rem' }}>
                          {hasVariants
                            ? `${money(Math.min(...item.variants.map(v => v.price)))} – ${money(Math.max(...item.variants.map(v => v.price)))}`
                            : money(item.price)}
                        </div>
                        {unavailable ? (
                          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#ef4444' }}>Unavailable</div>
                        ) : hasVariants ? (
                          <button onClick={() => openVariantPicker(item)} style={{ ...smallBtn(qty > 0 ? '#fff5ee' : ORANGE, qty > 0 ? ORANGE : 'white'), width: '100%', border: qty > 0 ? `1.5px solid ${ORANGE}` : 'none' }}>
                            {qty > 0 ? `＋ Add (${qty} in cart)` : '＋ Choose'}
                          </button>
                        ) : qty === 0 ? (
                          <button onClick={() => addToCartDirect(item)} style={{ ...smallBtn(ORANGE), width: '100%' }}>＋ Add</button>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff5ee', borderRadius: 10, padding: '0.15rem 0.3rem' }}>
                            <button onClick={() => updateCartQty(`${item.id}__`, -1)} style={qtyCircleBtn(ORANGE, 'white')}>−</button>
                            <span style={{ fontWeight: 800, color: INK }}>{qty}</span>
                            <button onClick={() => addToCartDirect(item)} style={qtyCircleBtn(ORANGE, 'white')}>+</button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Sticky "view cart" bar */}
            {cartCount > 0 && (
              <button
                onClick={() => setStep('cart')}
                style={{
                  position: 'fixed', left: '1rem', right: '1rem', bottom: 'max(1rem, env(safe-area-inset-bottom,0px))',
                  background: PURPLE, color: 'white', border: 'none', borderRadius: 16,
                  padding: '1rem 1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  fontFamily: 'Poppins,sans-serif', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer',
                  boxShadow: '0 6px 20px rgba(124,58,237,0.4)', zIndex: 40,
                }}
              >
                <span>🛒 View Order ({cartCount} item{cartCount > 1 ? 's' : ''})</span>
                <span>{money(cartTotal)} →</span>
              </button>
            )}
          </div>
        )}

        {/* ═══════════ STEP: Cart ═══════════ */}
        {step === 'cart' && ctx && (
          <div style={{ padding: '1.1rem', maxWidth: 560, margin: '0 auto', paddingBottom: '2rem' }}>
            <div style={{ background: 'white', borderRadius: 12, padding: '0.85rem 1rem', marginBottom: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ fontWeight: 800, color: INK }}>
                {ctx.tableLabel ? `${ctx.tableLabel} — ${ctx.customerName}` : ctx.customerName}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#999' }}>
                {ctx.type === 'dine-in' ? '🍽 Dine-In' : '🛍 Pickup'}{ctx.orderMoreTargetId ? ` · Order More (#${ctx.orderMoreTargetNum ?? ''})` : ''}
              </div>
            </div>

            {cartEntries.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#999', padding: '2.5rem 1rem' }}>
                Your cart is empty.
                <div style={{ marginTop: '1rem' }}>
                  <button onClick={() => setStep('menu')} style={{ ...btn(ORANGE) }}>← Add Food</button>
                </div>
              </div>
            ) : (
              <>
                {cartEntries.map(e => (
                  <div key={e.key} style={{ background: 'white', borderRadius: 12, padding: '0.75rem 1rem', marginBottom: '0.6rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: INK }}>
                        {e.itemName}{e.variantName ? <span style={{ color: ORANGE, fontWeight: 600 }}> ({e.variantName})</span> : ''}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#888' }}>{money(e.variantPrice)} each</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button onClick={() => updateCartQty(e.key, -1)} style={{ ...qtyCircleBtn('white', ORANGE), border: `2px solid ${ORANGE}`, width: 28, height: 28 }}>−</button>
                      <span style={{ fontWeight: 700, minWidth: 18, textAlign: 'center' }}>{e.qty}</span>
                      <button onClick={() => updateCartQty(e.key, 1)} style={{ ...qtyCircleBtn(ORANGE, 'white'), width: 28, height: 28 }}>+</button>
                      <span style={{ fontWeight: 800, color: INK, minWidth: 55, textAlign: 'right' }}>{money(e.variantPrice * e.qty)}</span>
                      <button onClick={() => removeCartEntry(e.key)} title="Remove" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem', padding: '0 0.2rem' }}>🗑</button>
                    </div>
                  </div>
                ))}

                <div style={{ margin: '0.9rem 0' }}>
                  <label style={fieldLabel}>Special Instructions (optional)</label>
                  <textarea
                    value={notes} onChange={e => setNotes(e.target.value)}
                    placeholder="e.g. Less spicy, no onions, kids portion…" rows={2}
                    style={{ ...inp, resize: 'none' }}
                  />
                </div>

                <div style={{ background: 'white', borderRadius: 12, padding: '0.9rem 1.1rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                  <span style={{ fontWeight: 700, color: '#555' }}>Total</span>
                  <span style={{ fontWeight: 900, fontSize: '1.3rem', color: ORANGE }}>{money(cartTotal)}</span>
                </div>

                {sendError && (
                  <div style={{ background: '#fef2f2', border: '2px solid #fecaca', color: '#dc2626', borderRadius: 10, padding: '0.7rem 0.9rem', fontWeight: 700, fontSize: '0.85rem', marginBottom: '1rem' }}>
                    ⚠️ {sendError}
                  </div>
                )}

                <button onClick={() => setStep('menu')} disabled={sending} style={{ ...btn('white', ORANGE), width: '100%', border: `2px solid ${ORANGE}`, marginBottom: '0.7rem', opacity: sending ? 0.5 : 1 }}>
                  ← Continue Adding
                </button>

                {ctx.orderMoreTargetId ? (
                  // Order More reuses the routing this order was already
                  // confirmed with (decided server-side) — no choice to make here.
                  <button disabled={sending} onClick={() => handleSend()} style={{ ...btn('#16a34a'), width: '100%', fontSize: '1.1rem', padding: '1.1rem', opacity: sending ? 0.6 : 1 }}>
                    {sending ? '⏳ Sending…' : '✅ SEND ORDER MORE'}
                  </button>
                ) : routingMode === 'ask' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <div style={{ textAlign: 'center', fontSize: '0.75rem', color: PURPLE, fontWeight: 700 }}>How should this go to the kitchen?</div>
                    <button disabled={sending} onClick={() => handleSend('printer')} style={{ ...btn('#f59e0b', '#1A0800'), width: '100%', opacity: sending ? 0.6 : 1 }}>
                      {sending ? '⏳ Sending…' : '🖨️ Send to Kitchen Printer'}
                    </button>
                    <button disabled={sending} onClick={() => handleSend('kitchen_display')} style={{ ...btn(PURPLE), width: '100%', opacity: sending ? 0.6 : 1 }}>
                      {sending ? '⏳ Sending…' : '🖥️ Send to Kitchen Display'}
                    </button>
                  </div>
                ) : (
                  <button disabled={sending} onClick={() => handleSend()} style={{ ...btn('#16a34a'), width: '100%', fontSize: '1.1rem', padding: '1.1rem', opacity: sending ? 0.6 : 1 }}>
                    {sending ? '⏳ Sending…' : '✅ SEND ORDER'}
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* ═══════════ STEP: Success ═══════════ */}
        {step === 'success' && successInfo && (
          <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: '0.5rem' }}>✅</div>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.5rem', fontWeight: 900, color: INK, marginBottom: '0.4rem' }}>
              Order Sent!
            </div>
            <div style={{ fontSize: '1rem', color: '#555', marginBottom: '0.2rem' }}>
              {successInfo.ctx.tableLabel ? `${successInfo.ctx.tableLabel} — ${successInfo.ctx.customerName}` : successInfo.ctx.customerName}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#999', marginBottom: '1rem' }}>
              {successInfo.itemCount} item{successInfo.itemCount > 1 ? 's' : ''} · {money(successInfo.total)}
              {successInfo.orderNum ? ` · Order #${successInfo.orderNum}` : ''}
            </div>
            <div style={{
              background: successInfo.routedOk ? '#f0fdf4' : '#fffbeb',
              border: `2px solid ${successInfo.routedOk ? '#86efac' : '#fde68a'}`,
              borderRadius: 12, padding: '0.8rem 1.1rem', fontWeight: 700,
              color: successInfo.routedOk ? '#15803d' : '#92400e', fontSize: '0.88rem',
              maxWidth: 380, marginBottom: '2rem',
            }}>
              {successInfo.routedLabel}
            </div>
            <button onClick={takeAnotherOrder} style={{ ...btn(PURPLE), width: '100%', maxWidth: 340, marginBottom: '0.8rem' }}>
              ＋ Take Another Order
            </button>
            <button onClick={onClose} style={{ ...btn('white', '#666'), width: '100%', maxWidth: 340, border: '2px solid #ddd' }}>
              ← Back to Waiter Dashboard
            </button>
          </div>
        )}
      </div>

      {/* ═══════════ Variant Picker Modal ═══════════ */}
      {variantModal.open && variantModal.item && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: 16, padding: '1.5rem', width: 380, maxWidth: '92vw' }}>
            <div style={{ fontWeight: 900, fontSize: '1.05rem', color: INK, marginBottom: '0.2rem' }}>{variantModal.item.name}</div>
            <div style={{ fontSize: '0.78rem', color: '#999', marginBottom: '1rem' }}>Choose an option</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', marginBottom: '1.2rem' }}>
              {variantModal.item.variants.map(v => (
                <button
                  key={v.name}
                  onClick={() => setVariantModal(m => ({ ...m, selected: v.name }))}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.8rem 1rem', borderRadius: 12, cursor: 'pointer', fontFamily: 'Poppins,sans-serif',
                    border: `2px solid ${variantModal.selected === v.name ? ORANGE : '#eee'}`,
                    background: variantModal.selected === v.name ? '#fff5ee' : 'white',
                  }}
                >
                  <span style={{ fontWeight: 700, color: INK }}>{v.name}</span>
                  <span style={{ fontWeight: 800, color: ORANGE }}>{money(v.price)}</span>
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button onClick={confirmVariantAdd} style={{ ...btn(ORANGE), flex: 1 }}>＋ Add to Order</button>
              <button onClick={() => setVariantModal({ open: false, item: null, selected: '' })} style={{ ...btn('white', '#666'), flex: 1, border: '2px solid #ddd' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
