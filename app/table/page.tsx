'use client';

export const dynamic = 'force-dynamic';
import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
// ── API (Supabase) ─ all business data lives in the database ──────────────────
import {
  getMenu           as getMenuApi,
  createOrder       as createOrderApi,
  getTables         as getTablesApi,
  getTabs           as getTabsApi,
  createTab         as createTabApi,
  updateTab         as updateTabApi,
  getOrders         as getOrdersApi,
  registerTabDevice,
  getTabDevices,
  getDeviceTabRecord,
  removeTabDevice,
  recordWaiterCall,
  getLastWaiterCallAt,
  verifyTabPin,
  createOrderEvent,
  reportNotReceived,
  resolveIssue,
  getIssueForOrder,
  ISSUE_MAX_RETRIES,
  OrderIssue,
  MenuItem          as ApiMenuItem,
  Order             as ApiOrder,
  Table             as ApiTable,
} from '@/lib/api';
// ── localStorage ─ ONLY device identity (not business data) ──────────────────
import { getOrCreateDeviceId } from '@/lib/storage';

// ─── TabUI — normalised tab shape used throughout this component ───────────────
type TabStatus = 'open' | 'awaiting_payment' | 'closed';
interface TabUI {
  id:              string;
  tableId?:        string;
  customerName:    string;
  partySize:       number;
  status:          TabStatus;
  tabStatus:       TabStatus;  // alias for status — referenced heavily in JSX
  total:           number;
  totalAmount:     number;     // alias for total
  discount:        number;
  discountReason?: string;
  tableSessionPin: string;     // PIN from Supabase customer_tabs.pin (not localStorage)
  createdAt:       string;
}
function toTabUI(
  t: { id: string; tableId?: string | null; customerName: string; partySize: number;
       status: string; total: number; discount: number; discountReason?: string | null;
       pin?: string | null; createdAt: string },
): TabUI {
  const s = (t.status || 'open') as TabStatus;
  return {
    id: t.id, tableId: t.tableId ?? undefined, customerName: t.customerName,
    partySize: t.partySize, status: s, tabStatus: s,
    total: t.total, totalAmount: t.total,
    discount: t.discount, discountReason: t.discountReason ?? undefined,
    tableSessionPin: t.pin ?? '',   // PIN comes from Supabase, no localStorage needed
    createdAt: t.createdAt,
  };
}
// Local type aliases
type MenuItem    = ApiMenuItem;
type Order       = ApiOrder;

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES = ['All', 'Biryani', 'Starters', 'Mains', 'Breads', 'Desserts', 'Drinks'];
const BADGE_LABEL: Record<string, string> = {
  bestseller: '⭐ Bestseller', popular: '🔥 Popular',
  chef: "👨‍🍳 Chef's Special", famous: '🏆 Famous', new: '✨ New',
};
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

// ─── Style helpers ─────────────────────────────────────────────────────────────
const btn = (bg = '#E65C00', c = 'white'): React.CSSProperties => ({
  background: bg, color: c, border: 'none', borderRadius: 8,
  fontWeight: 700, cursor: 'pointer', fontFamily: 'Poppins,sans-serif',
  padding: '0.5rem 1rem', fontSize: '0.85rem',
});

// ─── Table ID comparison helper ───────────────────────────────────────────────
// Table identifiers come in multiple formats depending on the source:
//   URL param (old QR): "T04"   DB id: "tbl_04"   DB name: "T4"
// All three refer to the same physical table.  sameTable() extracts the trailing
// integer from any format so "T04", "T4", and "tbl_04" all compare as equal.
function tableNum(raw: string | undefined | null): number {
  if (!raw) return -1;
  const m = raw.match(/(\d+)$/);
  return m ? parseInt(m[1], 10) : -1;
}
function sameTable(a: string | undefined | null, b: string | undefined | null): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  const n = tableNum(a);
  return n !== -1 && n === tableNum(b);
}

// ─── Confirmed-orders tracking (in-memory only) ────────────────────────────────
// confirmedRef (useRef<Set<string>>) tracks which food-receipt dialogs have been
// dismissed during this session. No localStorage/sessionStorage needed — if the
// page is hard-refreshed the dialog re-appears for any still-served orders, which
// is acceptable UX and prevents silent misses.

// ─── Inner component ──────────────────────────────────────────────────────────
function TablePageInner() {
  const searchParams = useSearchParams();
  const tableId = (searchParams.get('table') || searchParams.get('tableId') || 'T01').toUpperCase();

  // ── View ──
  // 'loading'  = checking device ID / active sessions (brief spinner)
  // 'landing'  = no active session — first customer at table
  // 'join'     = table already has active session — new device joining
  // 'menu'     = browsing menu
  // 'cart'     = reviewing cart
  // 'tracking' = order tracking / my tab
  type View = 'loading' | 'landing' | 'join' | 'menu' | 'cart' | 'tracking';
  const [view, setView]                   = useState<View>('loading');

  // ── Device & identity ──
  const [deviceId, setDeviceId]           = useState('');
  const [customerName, setCustomerName]   = useState('');
  const [nameInput, setNameInput]         = useState('');
  const [partyInput, setPartyInput]       = useState('2');
  const [nameError, setNameError]         = useState('');

  // ── Welcome-back overlay ──
  const [welcomeBack, setWelcomeBack]     = useState(false);
  const [existingTabForJoin, setExistingTabForJoin] = useState<TabUI | null>(null);

  // ── PIN security ──
  const [pinInput, setPinInput]           = useState('');
  const [pinError, setPinError]           = useState('');

  // ── Joiner party size ──
  const [joinerPartyInput, setJoinerPartyInput] = useState('1');
  const [joinerPartyError, setJoinerPartyError] = useState('');

  // ── Tab ──
  const [tabId, setTabId]                 = useState<string | null>(null);
  const [tab, setTab]                     = useState<TabUI | null>(null);

  // ── Co-diners at this table (from Supabase tab_devices) ──
  const [codiners, setCodiners]           = useState<{ customerName: string; joinedAt: string }[]>([]);
  // ── Table capacity (fetched once at init from Supabase tables) ──
  const [tableCapacity, setTableCapacity] = useState<number>(8); // default 8 until fetched

  // ── Menu & cart ──
  const [menu, setMenu]                   = useState<MenuItem[]>([]);
  const [catFilter, setCatFilter]         = useState('All');
  const [cart, setCart]                   = useState<Record<string, number>>({});
  const [specialNote, setSpecialNote]     = useState('');

  // ── Orders ──
  const [orders, setOrders]               = useState<Order[]>([]);

  // ── UI ──
  const [orderMsg, setOrderMsg]           = useState('');
  const [billMsg, setBillMsg]             = useState('');
  const [trackingView, setTrackingView]   = useState<'aggregated' | 'individual'>('aggregated');

  // ── Waiter call cooldown ──
  const [callCooldown, setCallCooldown]   = useState(0);

  // ── Food receipt confirmation + "not received" issue tracking ──
  const [disputeOrder, setDisputeOrder]   = useState<Order | null>(null);
  const [activeIssue, setActiveIssue]     = useState<OrderIssue | null>(null);
  const [issueMsg, setIssueMsg]           = useState('');
  const [issueBusy, setIssueBusy]         = useState(false);
  // confirmedRef: tracks which orders the customer already confirmed ✅ this session
  // NOT added for "not received" — dialog must re-appear after re-service
  const confirmedRef = useRef<Set<string>>(new Set<string>());

  // ─── Init — device detection + async session lookup ──────────────────────
  useEffect(() => {
    const did = getOrCreateDeviceId();  // device identity — only localStorage usage
    setDeviceId(did);

    void (async () => {
      // Load menu + table capacity concurrently
      try {
        const [menuItems, allTables] = await Promise.all([
          getMenuApi(),
          getTablesApi(),
        ]);
        setMenu(menuItems.filter(m => m.available));
        // Find this table's capacity (match by DB id or name/number)
        const match = allTables.find(
          (t: ApiTable) => sameTable(t.id, tableId) || sameTable(t.name, tableId),
        );
        if (match) setTableCapacity(match.capacity);
      } catch { setMenu([]); }

      // ── STEP 1: Does THIS device already have an active Supabase session? ──
      // Check tab_devices in Supabase — no localStorage needed.
      try {
        const deviceRecord = await getDeviceTabRecord(did);
        if (deviceRecord && sameTable(deviceRecord.tableId, tableId)) {
          const tabs   = await getTabsApi();
          const apiTab = tabs.find(t => t.id === deviceRecord.tabId && t.status !== 'closed');
          if (apiTab) {
            setTabId(apiTab.id);
            setCustomerName(deviceRecord.customerName);
            setTab(toTabUI(apiTab));
            // Restore waiter-call cooldown from Supabase
            const lastCallAt = await getLastWaiterCallAt(apiTab.id).catch(() => null);
            if (lastCallAt) {
              const elapsed = Math.floor((Date.now() - new Date(lastCallAt).getTime()) / 1000);
              setCallCooldown(Math.max(0, 60 - elapsed));
            }
            setWelcomeBack(true);
            setView('tracking');
            setTimeout(() => setWelcomeBack(false), 3500);
            return;
          }
        }
      } catch { /* treat as no existing session */ }

      // ── STEP 2: Is there already an OPEN session at this table? ────────────
      try {
        const tabs    = await getTabsApi();
        // sameTable() handles id/name format mismatches: "T04" ≡ "T4" ≡ "tbl_04"
        const openTab = tabs.find(t => sameTable(t.tableId, tableId) && t.status === 'open');
        if (openTab) {
          setExistingTabForJoin(toTabUI(openTab));
          setView('join');
          return;
        }
      } catch {}

      // ── STEP 3: No session exists — show landing form ────────────────────
      setView('landing');
    })();
  }, [tableId]);

  // ─── Cooldown ticker ──────────────────────────────────────────────────────
  useEffect(() => {
    if (callCooldown <= 0) return;
    const t = setInterval(() => setCallCooldown(p => Math.max(0, p - 1)), 1000);
    return () => clearInterval(t);
  }, [callCooldown]);

  // ─── Load co-diners from Supabase tab_devices ────────────────────────────
  const refreshCodiners = useCallback(async (tid: string) => {
    try {
      const devs = await getTabDevices(tid);
      setCodiners(devs.map(d => ({ customerName: d.customerName, joinedAt: d.joinedAt })));
    } catch { /* co-diners are non-critical — silently ignore */ }
  }, []);

  // ─── Periodic refresh (reads from Supabase) ───────────────────────────────
  const refresh = useCallback(async () => {
    if (!tabId) return;
    try {
      const [tabs, myOrders] = await Promise.all([
        getTabsApi(),
        getOrdersApi({ tabId, activeOnly: true, limit: 50 }),
      ]);
      const apiTab = tabs.find(t => t.id === tabId);
      if (apiTab) setTab(toTabUI(apiTab));  // PIN comes from apiTab.pin (Supabase)
      setOrders(myOrders);
      void refreshCodiners(tabId);

      // ── Check for newly served orders needing food confirmation ──────────────
      // Also re-show dialog when order is re-served after a "not received" report.
      // Only skip if customer already confirmed (confirmedRef) — NOT if they reported an issue.
      if (apiTab && apiTab.status !== 'closed') {
        // Served orders not yet confirmed → show food receipt dialog
        const servedUnconfirmed = myOrders.find(
          (o: Order) => o.status === 'served' && !confirmedRef.current.has(o.id),
        );
        if (servedUnconfirmed) {
          setDisputeOrder(servedUnconfirmed);
          setActiveIssue(null); // fresh serve — clear stale issue state
          setIssueMsg('');
        }
        // If order returned to served after re_serve_required (staff re-served it)
        // and we had an active issue, clear the issue banner — dialog handles it
        if (activeIssue && myOrders.some(o => o.id === activeIssue.orderId && o.status === 'served')) {
          setIssueMsg('');
        }
      }
    } catch (e) { console.error('[table] refresh error:', e); }
  }, [tabId, refreshCodiners]);

  useEffect(() => {
    if (!tabId) return;
    void refresh();
    const t = setInterval(() => void refresh(), 3000);
    return () => clearInterval(t);
  }, [refresh, tabId]);

  // ─── HANDLER: Create new session (first customer at empty table) ───────────
  async function handleStartSession() {
    const name = nameInput.trim();
    if (!name) { setNameError('Please enter your name'); return; }
    if (name.length < 2) { setNameError('Name must be at least 2 characters'); return; }

    const pin = pinInput.trim();
    if (!pin) { setPinError('Please set a 4-digit PIN to protect your table'); return; }
    if (!/^\d{4}$/.test(pin)) { setPinError('PIN must be exactly 4 digits'); return; }

    const party = Math.max(1, parseInt(partyInput) || 1);

    try {
      // Re-check Supabase: race condition — another device may have just opened
      const tabs    = await getTabsApi();
      const raceTab = tabs.find(t => sameTable(t.tableId, tableId) && t.status === 'open');
      if (raceTab) {
        setExistingTabForJoin(toTabUI(raceTab));
        setPinInput(''); setPinError('');
        setView('join'); return;
      }

      // Create the tab in Supabase — PIN stored server-side in customer_tabs.pin
      const apiTab = await createTabApi({ tableId, customerName: name, partySize: party, pin });
      // Register this device in Supabase tab_devices (replaces localStorage)
      await registerTabDevice({ tabId: apiTab.id, deviceId, customerName: name, tableId });
      setTabId(apiTab.id);
      setCustomerName(name);
      // toTabUI reads PIN from apiTab.pin (returned by server) — no localStorage
      setTab(toTabUI({ ...apiTab, pin }));
      confirmedRef.current = new Set<string>();
      setNameError(''); setPinError('');
      setView('menu');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[handleStartSession] failed:', err);
      setNameError(`Could not create session: ${msg}. Please try again.`);
    }
  }

  // ─── HANDLER: Join existing session (new device at occupied table) ─────────
  async function handleJoinSession() {
    const name = nameInput.trim();
    if (!name) { setNameError('Please enter your name'); return; }
    if (name.length < 2) { setNameError('Name must be at least 2 characters'); return; }

    if (!existingTabForJoin) { setView('landing'); return; }
    const joinTab = existingTabForJoin;

    try {
      // Re-validate the session is still open in Supabase
      const tabs   = await getTabsApi();
      const apiTab = tabs.find(t => t.id === joinTab.id && t.status === 'open');
      if (!apiTab) {
        // Session closed between page load and join attempt — restart
        setExistingTabForJoin(null);
        setNameInput(name);
        setView('landing');
        return;
      }

      // Verify PIN via Supabase — no localStorage needed.
      // If the tab has a PIN set, the joiner must enter it.
      if (apiTab.pin) {
        const pin = pinInput.trim();
        if (!pin) { setPinError('Enter the table PIN (ask the person who started the session)'); return; }
        const valid = await verifyTabPin(joinTab.id, pin);
        if (!valid) {
          setPinError('Incorrect PIN — ask the table host for the 4-digit PIN');
          return;
        }
      }

      // Validate joiner's party size against table capacity from Supabase
      const joinerParty = Math.max(1, parseInt(joinerPartyInput) || 1);
      const remaining   = Math.max(0, tableCapacity - (apiTab.partySize ?? 0));
      if (joinerParty > remaining) {
        setJoinerPartyError(
          remaining === 0
            ? 'This table is full — no more seats available'
            : `Only ${remaining} seat${remaining !== 1 ? 's' : ''} remaining at this table`,
        );
        return;
      }
      // Update party_size in Supabase (replaces addPartyToTab localStorage)
      await updateTabApi(joinTab.id, { partySize: (apiTab.partySize ?? 0) + joinerParty });

      // Register device in Supabase tab_devices (replaces registerDevice localStorage)
      await registerTabDevice({ tabId: joinTab.id, deviceId, customerName: name, tableId });
      setTabId(joinTab.id);
      setCustomerName(name);
      setTab(toTabUI(apiTab));
      confirmedRef.current = new Set<string>();
      setNameError('');
      setPinError('');
      setJoinerPartyError('');
      setView('menu');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[handleJoinSession] failed:', err);
      setNameError(`Could not join session: ${msg}. Please try again.`);
    }
  }

  // ─── HANDLER: Place order ──────────────────────────────────────────────────
  async function handlePlaceOrder() {
    if (!tabId || !customerName) return;
    // Block new orders after bill has been requested
    if (tab && tab.tabStatus === 'awaiting_payment') {
      setOrderMsg('🚫 Bill has been requested — no new orders can be added.');
      setTimeout(() => setOrderMsg(''), 4000);
      return;
    }
    const entries = Object.entries(cart).filter(([, qty]) => qty > 0);
    if (!entries.length) return;

    const menuMap = Object.fromEntries(menu.map(m => [m.id, m]));
    const items   = entries.map(([id, qty]) => {
      const m = menuMap[id];
      return { name: m.name, qty, price: m.price, subtotal: m.price * qty };
    });
    const subtotal = items.reduce((s, i) => s + i.subtotal, 0);

    try {
      // Create order in Supabase — visible immediately to waiter/kitchen/manager
      const order = await createOrderApi({
        type:         'dine-in',
        customerName,
        tableId,
        tabId,
        items,
        subtotal,
        total: subtotal,
        source: 'table-qr',
      });
      setCart({});
      setSpecialNote('');
      setOrderMsg(`✅ Order #${order.orderNum ?? order.id.slice(-4)} placed! Your waiter will confirm shortly.`);
      setTimeout(() => setOrderMsg(''), 4000);
      setView('tracking');
      void refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[handlePlaceOrder] failed:', err);
      setOrderMsg(`❌ Could not place order: ${msg}. Please try again.`);
      setTimeout(() => setOrderMsg(''), 6000);
    }
  }

  // ─── HANDLER: Request bill ─────────────────────────────────────────────────
  async function handleRequestBill() {
    if (!tabId) return;

    // ── Block billing if any order has an unresolved issue ─────────────────
    const unresolved = tabOrders.filter(o => o.status === 're_serve_required');
    if (unresolved.length > 0) {
      setBillMsg(
        `🚫 Cannot request bill — ${unresolved.length} order${unresolved.length > 1 ? 's have' : ' has'} an unresolved ` +
        `"not received" issue. Please wait for re-service and confirm receipt first.`,
      );
      setTimeout(() => setBillMsg(''), 6000);
      return;
    }

    try {
      // Update tab status → awaiting_payment — waiter/counter portals see this immediately
      const updated = await updateTabApi(tabId, { status: 'awaiting_payment' });
      setTab(toTabUI(updated));
      setBillMsg('🧾 Bill requested! Please proceed to the counter when ready.');
      setTimeout(() => setBillMsg(''), 5000);
      void refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[handleRequestBill] failed:', err);
      setBillMsg(`❌ Could not request bill: ${msg}. Please try again.`);
      setTimeout(() => setBillMsg(''), 6000);
    }
  }

  // ─── HANDLER: Call waiter ──────────────────────────────────────────────────
  async function handleCallWaiter() {
    if (!tabId || !tab || callCooldown > 0) return;
    // Persist in Supabase + broadcast to waiter portal (replaces addWaiterCall localStorage)
    try { await recordWaiterCall({ tabId, tableId, customerName }); } catch { /* non-critical */ }
    setCallCooldown(60);
  }

  // ─── HANDLER: Food receipt confirmation ────────────────────────────────────
  async function handleFoodConfirm(received: boolean) {
    if (!disputeOrder || !tabId || issueBusy) return;

    if (received) {
      // ── Customer confirmed ✅ ──────────────────────────────────────────────
      // Mark in confirmedRef so dialog won't re-appear for this order
      confirmedRef.current.add(disputeOrder.id);
      setDisputeOrder(null);
      setIssueMsg('');
      setActiveIssue(null);

      // If there was an active issue for this order, resolve it now
      if (activeIssue && activeIssue.orderId === disputeOrder.id) {
        try {
          await resolveIssue(activeIssue.id, customerName || 'Customer');
        } catch { /* non-critical — issue resolves server-side */ }
      }
      // Log the confirmation event
      void createOrderEvent(
        disputeOrder.id, 'CustomerConfirmed', customerName,
        'Customer confirmed food received',
      ).catch(() => {});
      await refresh();
    } else {
      // ── Customer clicked "Not received" ❌ ────────────────────────────────
      setIssueBusy(true);
      setIssueMsg('');
      try {
        // Check current retry count before reporting
        const existingIssue = await getIssueForOrder(disputeOrder.id);
        const currentCount  = existingIssue ? existingIssue.retryCount : 0;

        if (currentCount >= ISSUE_MAX_RETRIES) {
          // Abuse limit reached — show escalation message, do NOT re-report
          setDisputeOrder(null);
          setIssueMsg(
            `⚠️ This order has been reported ${currentCount} times. ` +
            `The manager has been notified and will assist you shortly.`,
          );
          return;
        }

        // Report the issue → moves order to re_serve_required, notifies waiter
        const issue = await reportNotReceived(
          disputeOrder.id,
          customerName || 'Customer',
          'not_received',
        );
        setActiveIssue(issue);

        // DO NOT add to confirmedRef — dialog must re-appear after re-service
        setDisputeOrder(null);

        if (issue.escalated) {
          setIssueMsg(
            `🚨 Issue escalated to manager after ${issue.retryCount} reports. ` +
            `A manager will resolve this personally.`,
          );
        } else {
          setIssueMsg(
            `⚠️ We've alerted your waiter — they'll re-serve your order shortly. ` +
            `You'll be asked to confirm once re-served. ` +
            `(Report ${issue.retryCount}/${ISSUE_MAX_RETRIES})`,
          );
        }
        void refresh();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        console.error('[handleFoodConfirm] reportNotReceived failed:', err);
        // Never throw a visible error to customer — show a friendly message
        setDisputeOrder(null);
        setIssueMsg(`⚠️ Your waiter has been notified. If you don't receive your food shortly, please call for assistance.`);
        // Still log the event as a fallback
        void createOrderEvent(
          disputeOrder.id, 'FoodDisputed', customerName || 'Customer',
          `Customer reported food not received — API error: ${msg}`,
        ).catch(() => {});
      } finally {
        setIssueBusy(false);
      }
    }
  }

  // ─── Cart helpers ──────────────────────────────────────────────────────────
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

  // ─── Derived tab data ──────────────────────────────────────────────────────
  // Filter orders that belong to this tab — use tabId field (Supabase FK), NOT orderIds array
  const tabOrders = tab ? orders.filter(o => o.tabId === tab.id) : [];
  const activeTabOrders = tabOrders.filter(o => !['cancelled', 'void'].includes(o.status));
  const hasUnservedOrders = activeTabOrders.some(
    o => ['awaiting_waiter', 'pending', 'preparing', 'prepared'].includes(o.status),
  );

  // Aggregated: group items across all orders, worst status wins
  const aggregatedItems = (() => {
    const map: Record<string, { qty: number; price: number; statuses: string[] }> = {};
    activeTabOrders.forEach(order => {
      (order.items || []).forEach(item => {
        if (!map[item.name]) map[item.name] = { qty: 0, price: item.price, statuses: [] };
        map[item.name].qty += item.qty;
        map[item.name].statuses.push(order.status);
      });
    });
    return Object.entries(map).map(([name, v]) => ({
      name, qty: v.qty, price: v.price,
      status: v.statuses.includes('awaiting_waiter') ? 'awaiting_waiter'
            : v.statuses.includes('pending')         ? 'pending'
            : v.statuses.includes('preparing')       ? 'preparing'
            : v.statuses.includes('prepared')        ? 'prepared'
            : v.statuses.includes('served')          ? 'served'
            : 'completed',
    }));
  })();

  // Tab total — now kept live by the server (updated on every order change)
  const tabTotal    = tab ? (tab.totalAmount || 0) : 0;
  const tabDiscount = tab ? (tab.discount || 0) : 0;
  const billTotal   = Math.max(0, tabTotal - tabDiscount);

  // Per-customer breakdown — MY orders vs the full table total
  const myOrders    = activeTabOrders.filter(o => o.customerName === customerName);
  const myTotal     = myOrders.reduce((s, o) => s + (o.total || 0), 0);
  const othersExist = activeTabOrders.some(o => o.customerName !== customerName);

  // Proportion-based discount share: if admin applied a discount to the tab,
  // split it pro-rata by how much each customer spent.
  const myDiscountShare = (tabTotal > 0 && tabDiscount > 0)
    ? Math.round((myTotal / tabTotal) * tabDiscount)
    : 0;
  const myBillTotal = Math.max(0, myTotal - myDiscountShare);

  // ══════════════════════════════════════════════════════════════════════════════
  // ─── VIEW: Loading ───────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  if (view === 'loading') {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#1A0800,#3D1C00)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Poppins,sans-serif' }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🍽️</div>
          <div style={{ fontSize: '0.9rem', color: '#F9A826' }}>Checking your session…</div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // ─── VIEW: Landing (first customer, empty table) ──────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
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
            {nameError && <div style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: '0.25rem' }}>{nameError}</div>}
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#555', display: 'block', marginBottom: '0.35rem' }}>
              🔐 Set Table PIN <span style={{ fontWeight: 400, color: '#888' }}>(4 digits — share with your group)</span>
            </label>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={4}
              value={pinInput}
              onChange={e => { setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4)); setPinError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleStartSession()}
              placeholder="e.g. 1234"
              style={{ width: '100%', boxSizing: 'border-box', padding: '0.7rem 0.9rem', border: `2px solid ${pinError ? '#ef4444' : '#e5e7eb'}`, borderRadius: 10, fontFamily: 'Poppins,sans-serif', fontSize: '1.1rem', outline: 'none', letterSpacing: '0.3rem', fontWeight: 700 }}
            />
            {pinError && <div style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: '0.25rem' }}>{pinError}</div>}
            <div style={{ fontSize: '0.68rem', color: '#aaa', marginTop: '0.2rem' }}>
              This PIN prevents others from adding to your bill without permission.
            </div>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#555', display: 'block', marginBottom: '0.35rem' }}>How many people?</label>
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

          <button onClick={handleStartSession} style={{ ...btn(), width: '100%', padding: '0.85rem', fontSize: '1rem', borderRadius: 12 }}>
            🚀 Start Ordering
          </button>

          <p style={{ textAlign: 'center', fontSize: '0.72rem', color: '#aaa', marginTop: '0.75rem' }}>
            Your device will be remembered — you&apos;ll reconnect automatically next time.
          </p>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // ─── VIEW: Join (new device joining an existing session) ──────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  if (view === 'join') {
    const existingCustomerName = existingTabForJoin?.customerName || 'someone';
    const guestCount = existingTabForJoin
      ? codiners.length   // fetched from Supabase tab_devices via refreshCodiners
      : 0;

    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#1A0800,#3D1C00)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', fontFamily: 'Poppins,sans-serif' }}>
        <div style={{ background: 'white', borderRadius: 20, padding: '2rem 1.75rem', width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.4rem' }}>🤝</div>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.4rem', fontWeight: 900, color: '#1A0800' }}>Join Table {tableId}</div>
            <div style={{ color: '#888', fontSize: '0.82rem', marginTop: '0.35rem', lineHeight: 1.5 }}>
              <span style={{ fontWeight: 700, color: '#E65C00' }}>{existingCustomerName}</span> already has an open session here.
              {guestCount > 1 && <span> ({guestCount} people at this table)</span>}
            </div>
            <div style={{ marginTop: '0.5rem', background: '#fff5ee', borderRadius: 8, padding: '0.5rem 0.75rem', fontSize: '0.75rem', color: '#E65C00', fontWeight: 600 }}>
              ✅ Your order will be added to the same table bill
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#555', display: 'block', marginBottom: '0.35rem' }}>Your Name *</label>
            <input
              value={nameInput}
              onChange={e => { setNameInput(e.target.value); setNameError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleJoinSession()}
              placeholder="e.g. Priya Sharma"
              autoFocus
              style={{ width: '100%', boxSizing: 'border-box', padding: '0.7rem 0.9rem', border: `2px solid ${nameError ? '#ef4444' : '#e5e7eb'}`, borderRadius: 10, fontFamily: 'Poppins,sans-serif', fontSize: '0.95rem', outline: 'none' }}
            />
            {nameError && <div style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: '0.25rem' }}>{nameError}</div>}
          </div>

          {/* Joiner party size */}
          {(() => {
            const remaining = existingTabForJoin
              ? Math.max(0, tableCapacity - (existingTabForJoin.partySize ?? 0))
              : 0;
            return (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#555', display: 'block', marginBottom: '0.35rem' }}>
                  👥 Party Size <span style={{ fontWeight: 400, color: '#888' }}>(how many people joining with you?)</span>
                </label>
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <input
                    type="number"
                    min={1}
                    max={remaining > 0 ? remaining : 1}
                    value={joinerPartyInput}
                    onChange={e => { setJoinerPartyInput(e.target.value); setJoinerPartyError(''); }}
                    style={{ width: '80px', padding: '0.7rem 0.9rem', border: `2px solid ${joinerPartyError ? '#ef4444' : '#e5e7eb'}`, borderRadius: 10, fontFamily: 'Poppins,sans-serif', fontSize: '0.95rem', outline: 'none', fontWeight: 700, textAlign: 'center' }}
                  />
                  {remaining > 0 && (
                    <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>
                      🪑 {remaining} seat{remaining !== 1 ? 's' : ''} available
                    </span>
                  )}
                  {remaining === 0 && (
                    <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600 }}>
                      🔴 Table is full
                    </span>
                  )}
                </div>
                {joinerPartyError && <div style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: '0.25rem' }}>{joinerPartyError}</div>}
              </div>
            );
          })()}

          {existingTabForJoin?.tableSessionPin && (
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#555', display: 'block', marginBottom: '0.35rem' }}>
                🔐 Table PIN <span style={{ fontWeight: 400, color: '#888' }}>(ask the table host)</span>
              </label>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={4}
                value={pinInput}
                onChange={e => { setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4)); setPinError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleJoinSession()}
                placeholder="••••"
                style={{ width: '100%', boxSizing: 'border-box', padding: '0.7rem 0.9rem', border: `2px solid ${pinError ? '#ef4444' : '#e5e7eb'}`, borderRadius: 10, fontFamily: 'Poppins,sans-serif', fontSize: '1.1rem', outline: 'none', letterSpacing: '0.3rem', fontWeight: 700 }}
              />
              {pinError && <div style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: '0.25rem' }}>{pinError}</div>}
            </div>
          )}

          <button onClick={handleJoinSession} style={{ ...btn('#16a34a'), width: '100%', padding: '0.85rem', fontSize: '1rem', borderRadius: 12 }}>
            🤝 Join & Start Ordering
          </button>

          <p style={{ textAlign: 'center', fontSize: '0.72rem', color: '#aaa', marginTop: '0.75rem' }}>
            Each person orders independently — all items appear on one bill.
          </p>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // ─── VIEW: Menu ───────────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  if (view === 'menu') {
    // If bill has been requested, block further ordering
    const billRequested = tab?.tabStatus === 'awaiting_payment';
    const filtered = catFilter === 'All' ? menu : menu.filter(m => m.category === catFilter);

    return (
      <div style={{ minHeight: '100vh', background: '#faf8f3', fontFamily: 'Poppins,sans-serif', paddingBottom: cartCount > 0 ? '100px' : 0 }}>
        <div style={{ background: 'linear-gradient(135deg,#1A0800,#3D1C00)', color: 'white', padding: '0.9rem 1rem', position: 'sticky', top: 0, zIndex: 50 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.1rem', fontWeight: 900 }}>🍽️ Foodie Lover</div>
              <div style={{ fontSize: '0.68rem', color: '#F9A826' }}>Table {tableId} · {customerName}</div>
            </div>
            {tab && tabOrders.length > 0 && (
              <button onClick={() => setView('tracking')} style={{ ...btn('#ffffff20', 'white'), fontSize: '0.75rem', border: '1px solid #ffffff40' }}>
                📋 My Tab
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.6rem', overflowX: 'auto', paddingBottom: '0.1rem' }}>
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setCatFilter(c)} style={{
                padding: '0.25rem 0.7rem', borderRadius: 20, whiteSpace: 'nowrap',
                border: `1.5px solid ${catFilter === c ? '#F9A826' : '#ffffff30'}`,
                background: catFilter === c ? '#F9A826' : 'transparent',
                color: catFilter === c ? '#1A0800' : 'white',
                fontWeight: catFilter === c ? 700 : 400, cursor: 'pointer',
                fontFamily: 'Poppins,sans-serif', fontSize: '0.75rem',
              }}>{c}</button>
            ))}
          </div>
        </div>

        {/* Bill-requested lock banner */}
        {billRequested && (
          <div style={{ background: '#fef3c7', border: '2px solid #f59e0b', margin: '0.75rem 1rem 0', borderRadius: 12, padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.2rem' }}>🚫</span>
            <div>
              <div style={{ fontWeight: 800, color: '#92400e', fontSize: '0.85rem' }}>Bill has been requested</div>
              <div style={{ fontSize: '0.72rem', color: '#78350f' }}>No new orders can be added. Please proceed to payment.</div>
            </div>
            <button onClick={() => setView('tracking')} style={{ ...btn('#f59e0b', '#1A0800'), fontSize: '0.72rem', padding: '0.35rem 0.75rem', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
              View Bill →
            </button>
          </div>
        )}

        <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: '0.75rem' }}>
          {filtered.map(item => {
            const qty = cart[item.id] || 0;
            return (
              <div key={item.id} style={{ background: 'white', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', border: qty > 0 ? '2px solid #E65C00' : '2px solid transparent', opacity: billRequested ? 0.6 : 1 }}>
                <div style={{ fontSize: '2.5rem', textAlign: 'center', padding: '0.75rem 0 0.4rem', background: '#faf5ee' }}>{item.img}</div>
                {item.badge && <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#E65C00', textAlign: 'center', marginBottom: '0.2rem' }}>{BADGE_LABEL[item.badge] || item.badge}</div>}
                <div style={{ padding: '0.4rem 0.6rem 0.6rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#1A0800', marginBottom: '0.15rem' }}>{item.name}</div>
                  <div style={{ fontSize: '0.68rem', color: '#888', marginBottom: '0.35rem', lineHeight: 1.3 }}>{item.desc}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 900, color: '#E65C00', fontSize: '0.9rem' }}>₹{item.price}</span>
                    {billRequested ? (
                      <span style={{ fontSize: '0.65rem', color: '#f59e0b', fontWeight: 700 }}>🚫 Locked</span>
                    ) : qty === 0
                      ? <button onClick={() => setQty(item.id, 1)} style={{ ...btn(), fontSize: '0.75rem', padding: '0.3rem 0.7rem', borderRadius: 20 }}>+ Add</button>
                      : <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <button onClick={() => setQty(item.id, -1)} style={{ width: 26, height: 26, borderRadius: '50%', border: '2px solid #E65C00', background: 'white', color: '#E65C00', fontWeight: 900, cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                          <span style={{ fontWeight: 700, color: '#1A0800', fontSize: '0.85rem', minWidth: 16, textAlign: 'center' }}>{qty}</span>
                          <button onClick={() => setQty(item.id, 1)} style={{ width: 26, height: 26, borderRadius: '50%', border: 'none', background: '#E65C00', color: 'white', fontWeight: 900, cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                        </div>
                    }
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {cartCount > 0 && !billRequested && (
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

  // ══════════════════════════════════════════════════════════════════════════════
  // ─── VIEW: Cart ───────────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  if (view === 'cart') {
    const cartItems = Object.entries(cart).filter(([, qty]) => qty > 0).map(([id, qty]) => {
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
            <textarea value={specialNote} onChange={e => setSpecialNote(e.target.value)} placeholder="e.g. Less spicy, no onions..." rows={2}
              style={{ width: '100%', boxSizing: 'border-box', padding: '0.6rem 0.75rem', border: '2px solid #e5e7eb', borderRadius: 10, fontFamily: 'Poppins,sans-serif', fontSize: '0.85rem', resize: 'none' }} />
          </div>

          <div style={{ background: 'white', borderRadius: 12, padding: '0.85rem 1rem', marginBottom: '0.75rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#666', marginBottom: '0.25rem' }}>
              <span>{cartCount} item{cartCount !== 1 ? 's' : ''}</span><span>₹{cartTotal}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '1rem', color: '#1A0800', borderTop: '2px solid #f5f0e8', paddingTop: '0.4rem', marginTop: '0.25rem' }}>
              <span>Order Total</span><span>₹{cartTotal}</span>
            </div>
          </div>
        </div>

        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '0.75rem 1rem', background: 'white', boxShadow: '0 -4px 20px rgba(0,0,0,0.12)', zIndex: 100 }}>
          <button onClick={handlePlaceOrder} style={{ ...btn('#16a34a'), width: '100%', padding: '0.85rem', fontSize: '1rem', borderRadius: 12 }}>
            ✅ Place Order — ₹{cartTotal}
          </button>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // ─── VIEW: Tracking — also handles 'closed' thank-you screen ─────────────────
  // ══════════════════════════════════════════════════════════════════════════════

  // Closed tab → Thank You
  if (tab?.tabStatus === 'closed') {
    // Remove device record from Supabase so next scan shows a fresh landing
    if (deviceId && tabId) {
      void removeTabDevice(deviceId, tabId).catch(() => { /* non-critical */ });
    }
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#064e3b,#065f46)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Poppins,sans-serif', padding: '2rem' }}>
        <div style={{ textAlign: 'center', color: 'white', maxWidth: 360 }}>
          <div style={{ fontSize: '4rem', marginBottom: '0.75rem' }}>🙏</div>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '2rem', fontWeight: 900, color: '#6ee7b7', marginBottom: '0.4rem' }}>Thank You!</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.3rem' }}>Payment Received ✅</div>
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

      {/* ── Welcome Back overlay ── */}
      {welcomeBack && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(6,78,59,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, fontFamily: 'Poppins,sans-serif' }}>
          <div style={{ textAlign: 'center', color: 'white', padding: '2rem' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '0.75rem' }}>👋</div>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.6rem', fontWeight: 900, color: '#6ee7b7', marginBottom: '0.35rem' }}>
              Welcome back, {customerName}!
            </div>
            <div style={{ fontSize: '0.88rem', color: '#a7f3d0' }}>Reconnecting to your order at Table {tableId}…</div>
          </div>
        </div>
      )}

      {/* ── Food receipt confirmation modal ── */}
      {disputeOrder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: 20, padding: '1.75rem 1.5rem', width: '100%', maxWidth: 360, textAlign: 'center', boxShadow: '0 24px 60px rgba(0,0,0,0.4)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.6rem' }}>
              {activeIssue ? '🔄' : '🍽️'}
            </div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#1A0800', marginBottom: '0.4rem' }}>
              {activeIssue ? 'Did you receive it this time?' : 'Did you receive your food?'}
            </div>
            <div style={{ fontSize: '0.82rem', color: '#888', marginBottom: '0.25rem' }}>
              Order #{disputeOrder.orderNum || disputeOrder.id.slice(-4)} has been marked as delivered to your table.
            </div>
            {activeIssue && (
              <div style={{ fontSize: '0.75rem', background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 8, padding: '0.4rem 0.6rem', marginBottom: '0.5rem', color: '#92400e' }}>
                Re-service attempt #{activeIssue.retryCount} of {ISSUE_MAX_RETRIES}
              </div>
            )}
            <div style={{ fontSize: '0.75rem', color: '#bbb', marginBottom: '1.5rem' }}>
              {activeIssue
                ? 'Your waiter has re-served this order. Please confirm if received.'
                : 'If you didn\'t get it, we\'ll alert your waiter immediately.'}
            </div>
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button
                onClick={() => void handleFoodConfirm(false)}
                disabled={issueBusy}
                style={{ flex: 1, padding: '0.85rem', borderRadius: 12, background: issueBusy ? '#f3f4f6' : '#fef2f2', border: '2px solid #ef4444', color: '#ef4444', fontWeight: 800, cursor: issueBusy ? 'not-allowed' : 'pointer', fontFamily: 'Poppins,sans-serif', opacity: issueBusy ? 0.6 : 1 }}
              >
                {issueBusy ? '⏳ Reporting…' : '❌ Not received'}
              </button>
              <button
                onClick={() => void handleFoodConfirm(true)}
                disabled={issueBusy}
                style={{ flex: 1, padding: '0.85rem', borderRadius: 12, background: '#16a34a', border: 'none', color: 'white', fontWeight: 800, cursor: issueBusy ? 'not-allowed' : 'pointer', fontFamily: 'Poppins,sans-serif', opacity: issueBusy ? 0.6 : 1 }}
              >
                ✅ Yes, got it!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Issue status banner (shown after reporting "not received") ── */}
      {issueMsg && !disputeOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 290, background: issueMsg.startsWith('🚨') ? '#7f1d1d' : '#854d0e', color: 'white', padding: '0.85rem 1rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontFamily: 'Poppins,sans-serif' }}>
          <div style={{ flex: 1, fontSize: '0.82rem', fontWeight: 600, lineHeight: 1.4 }}>{issueMsg}</div>
          <button onClick={() => setIssueMsg('')} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1rem', padding: '0 0.25rem', flexShrink: 0 }}>✕</button>
        </div>
      )}

      {/* ── Re-serve pending indicator (order in re_serve_required state) ── */}
      {tabOrders.some(o => o.status === 're_serve_required') && !disputeOrder && (
        <div style={{ background: '#fef3c7', borderBottom: '2px solid #f59e0b', padding: '0.65rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'Poppins,sans-serif' }}>
          <span style={{ fontSize: '1.1rem' }}>⏳</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#92400e' }}>Re-service in progress</div>
            <div style={{ fontSize: '0.72rem', color: '#b45309' }}>
              Your waiter is on the way. You&apos;ll be asked to confirm receipt once re-served.
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
          {tab?.tabStatus === 'open' && (
            <button onClick={() => setView('menu')} style={{ ...btn('#F9A826', '#1A0800'), fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}>
              + Add More
            </button>
          )}
        </div>

        {/* Co-diners strip */}
        {codiners.length > 1 && (
          <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
            {codiners.map((d, i) => (
              <span key={i} style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.12)', borderRadius: 20, padding: '0.15rem 0.5rem', color: d.customerName === customerName ? '#F9A826' : '#ddd', fontWeight: d.customerName === customerName ? 700 : 400 }}>
                {d.customerName === customerName ? `👤 ${d.customerName} (you)` : `👤 ${d.customerName}`}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Order success */}
      {orderMsg && (
        <div style={{ background: '#dcfce7', borderBottom: '2px solid #16a34a', padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 700, fontSize: '0.85rem', color: '#16a34a' }}>
          {orderMsg}
        </div>
      )}

      {/* Bill msg */}
      {billMsg && (
        <div style={{ background: '#fef9c3', borderBottom: '2px solid #f59e0b', padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 700, fontSize: '0.85rem', color: '#854d0e' }}>
          {billMsg}
        </div>
      )}

      {/* Awaiting payment banner */}
      {tab?.tabStatus === 'awaiting_payment' && (
        <div style={{ background: '#fffbeb', borderBottom: '2px solid #f59e0b', padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.85rem', color: '#854d0e', fontWeight: 700 }}>
          💳 Bill Requested — Please proceed to the counter to pay
        </div>
      )}

      <div style={{ padding: '1rem' }}>
        {activeTabOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#999' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🍽️</div>
            <div style={{ fontWeight: 700, marginBottom: '0.4rem' }}>No orders yet</div>
            <div style={{ fontSize: '0.82rem', marginBottom: '1.25rem' }}>Browse the menu and place your first order!</div>
            {tab?.tabStatus === 'open' && (
              <button onClick={() => setView('menu')} style={{ ...btn(), padding: '0.7rem 1.5rem', borderRadius: 12 }}>🍛 Browse Menu</button>
            )}
          </div>
        ) : (
          <>
            {/* View toggle */}
            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem' }}>
              {(['aggregated', 'individual'] as const).map(v => (
                <button key={v} onClick={() => setTrackingView(v)} style={{
                  padding: '0.3rem 0.8rem', borderRadius: 20, cursor: 'pointer',
                  fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: '0.75rem',
                  border: `2px solid ${trackingView === v ? '#E65C00' : '#ddd'}`,
                  background: trackingView === v ? '#E65C00' : 'white',
                  color: trackingView === v ? 'white' : '#666',
                }}>
                  {v === 'aggregated' ? '📋 Summary' : '🗃️ By Order'}
                </button>
              ))}
            </div>

            {/* Aggregated */}
            {trackingView === 'aggregated' && (
              <div style={{ background: 'white', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', marginBottom: '0.75rem' }}>
                {aggregatedItems.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 1rem', borderBottom: '1px solid #f5f0e8' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1A0800' }}>{item.name} <span style={{ color: '#aaa', fontWeight: 400 }}>×{item.qty}</span></div>
                      <div style={{ fontSize: '0.7rem', marginTop: '0.1rem', color: STATUS_COLOR[item.status] || '#888' }}>
                        {STATUS_ICON[item.status]} {STATUS_LABEL[item.status]}
                      </div>
                    </div>
                    <span style={{ fontWeight: 800, color: '#E65C00', fontSize: '0.88rem' }}>₹{item.price * item.qty}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Individual by order — grouped per customer */}
            {trackingView === 'individual' && (() => {
              // Group orders by customerName for cleaner multi-customer display
              const byCustomer: Record<string, Order[]> = {};
              activeTabOrders.forEach(o => {
                if (!byCustomer[o.customerName]) byCustomer[o.customerName] = [];
                byCustomer[o.customerName].push(o);
              });
              return Object.entries(byCustomer).map(([cName, cOrders]) => (
                <div key={cName} style={{ marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#888', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    👤 {cName}{cName === customerName ? ' (you)' : ''}
                  </div>
                  {cOrders.map(order => (
                    <div key={order.id} style={{ background: 'white', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', marginBottom: '0.5rem', borderLeft: `4px solid ${STATUS_COLOR[order.status] || '#ddd'}` }}>
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
                </div>
              ));
            })()}

            {/* Bill summary */}
            <div style={{ background: 'white', borderRadius: 14, padding: '0.85rem 1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', marginBottom: '0.75rem' }}>
              {/* Per-customer breakdown when multiple people are at the table */}
              {othersExist && (
                <div style={{ background: '#fff5ee', borderRadius: 10, padding: '0.6rem 0.75rem', marginBottom: '0.65rem', border: '1px solid #fed7aa' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#92400e', marginBottom: '0.3rem' }}>👤 Your share ({customerName})</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', color: '#555', marginBottom: '0.15rem' }}>
                    <span>Your orders ({myOrders.length})</span>
                    <span style={{ fontWeight: 700, color: '#E65C00' }}>₹{myTotal}</span>
                  </div>
                  {myDiscountShare > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#16a34a' }}>
                      <span>Your discount share</span><span>−₹{myDiscountShare}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '0.9rem', color: '#1A0800', borderTop: '1px solid #fed7aa', paddingTop: '0.3rem', marginTop: '0.25rem' }}>
                    <span>Your total</span><span style={{ color: '#E65C00' }}>₹{myBillTotal}</span>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#666', marginBottom: '0.2rem' }}>
                <span>Table subtotal ({activeTabOrders.length} order{activeTabOrders.length !== 1 ? 's' : ''})</span>
                <span>₹{tabTotal}</span>
              </div>
              {tabDiscount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#16a34a', marginBottom: '0.2rem' }}>
                  <span>Discount</span><span>−₹{tabDiscount}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '1rem', color: '#1A0800', borderTop: '2px solid #f5f0e8', paddingTop: '0.4rem', marginTop: '0.2rem' }}>
                <span>{othersExist ? 'Table Total' : 'Total'}</span><span>₹{billTotal}</span>
              </div>
            </div>

            {/* Request Bill */}
            {tab?.tabStatus === 'open' && (
              <div style={{ marginBottom: '0.75rem' }}>
                {hasUnservedOrders && (
                  <div style={{ background: 'rgba(249,168,38,0.12)', border: '1px solid #F9A826', borderRadius: 8, padding: '0.65rem 0.9rem', fontSize: '0.78rem', color: '#92400e', textAlign: 'center', lineHeight: 1.5, marginBottom: '0.5rem' }}>
                    ⏳ Your food is still being prepared. You can request the bill once everything is served.
                  </div>
                )}
                <button
                  onClick={hasUnservedOrders ? undefined : handleRequestBill}
                  disabled={hasUnservedOrders}
                  style={{ ...btn(hasUnservedOrders ? '#e5e7eb' : '#1A0800', hasUnservedOrders ? '#9ca3af' : 'white'), width: '100%', padding: '0.8rem', fontSize: '0.95rem', borderRadius: 12, cursor: hasUnservedOrders ? 'not-allowed' : 'pointer', opacity: hasUnservedOrders ? 0.7 : 1 }}
                >
                  🧾 Request Bill
                </button>
              </div>
            )}

            {tab?.tabStatus === 'awaiting_payment' && (
              <div style={{ background: '#fef9c3', border: '2px solid #f59e0b', borderRadius: 12, padding: '1rem', textAlign: 'center', marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>💳</div>
                <div style={{ fontWeight: 800, color: '#854d0e', marginBottom: '0.2rem' }}>Bill Requested!</div>
                <div style={{ fontSize: '0.8rem', color: '#713f12' }}>Please proceed to the counter to pay ₹{billTotal}</div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom nav */}
      {tab && (tab.tabStatus === 'open' || tab.tabStatus === 'awaiting_payment') && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'white', boxShadow: '0 -4px 20px rgba(0,0,0,0.1)', padding: '0.6rem 1rem', display: 'flex', gap: '0.5rem', zIndex: 100 }}>
          {tab.tabStatus === 'open' && (
            <button onClick={() => setView('menu')} style={{ ...btn('#E65C00'), flex: 1, padding: '0.7rem', borderRadius: 10, fontSize: '0.85rem' }}>
              🍛 Order More
            </button>
          )}
          <button
            onClick={handleCallWaiter}
            disabled={callCooldown > 0}
            style={{ ...btn(callCooldown > 0 ? '#9ca3af' : '#1A0800'), flex: 1, padding: '0.7rem', borderRadius: 10, fontSize: '0.82rem', cursor: callCooldown > 0 ? 'not-allowed' : 'pointer' }}
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
        <div style={{ color: 'white', textAlign: 'center', fontFamily: 'Poppins,sans-serif' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🍽️</div>
          <div>Loading…</div>
        </div>
      </div>
    }>
      <TablePageInner />
    </Suspense>
  );
}
