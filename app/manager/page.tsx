'use client';

export const dynamic = 'force-dynamic';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, clearSession, AuthSession } from '@/lib/auth';
import { formatTableName } from '@/lib/format';
import { todayMidnightIST, isToday, clockIST, fmtTime } from '@/lib/date';
import { MENU_CATEGORIES } from '@/lib/categories';
import {
  getTabs, getOrders, closeTab, applyTabDiscount,
  updateOrderStatus,
  CustomerTab, Order, MenuItem,
  sendEmailReceipt,
  getSplitBillForTabApi, createSplitBillApi, markSplitEntryPaidApi, SplitBillData,
  getActiveIssues, resolveIssue, OrderIssue,
  getMenu as getMenuApi, saveMenuItem as saveMenuItemApi, deleteMenuItem as deleteMenuItemApi,
} from '@/lib/api';

interface OfferRule {
  id: string;
  name: string;
  type: 'percent' | 'flat';
  value: number;
  minOrder: number;
  maxDiscount: number;
  applyTo: 'all' | 'dine-in' | 'pickup' | 'delivery';
  active: boolean;
}
// lib/storage only used for: (none — all data is now Supabase-backed)
// Keeping this comment to clarify the migration is complete.
import { useRealtime } from '@/lib/realtime-client';

const PAY_LABELS: Record<string, string> = {
  cod: 'Cash', gpay: 'Google Pay', phonepe: 'PhonePe',
  paytm: 'Paytm', card: 'Card', upi: 'UPI',
};
const STATUS_COLOR: Record<string, string> = {
  awaiting_waiter:   '#f59e0b', pending: '#f59e0b', preparing: '#3b82f6',
  prepared:          '#8b5cf6', served:  '#06b6d4', completed: '#16a34a',
  out_for_delivery:  '#2563eb', delivered: '#7c3aed',
  re_serve_required: '#dc2626',
  cancelled: '#ef4444', void: '#9ca3af',
};
const STATUS_LABEL: Record<string, string> = {
  awaiting_waiter:   'Awaiting Waiter', pending: 'In Kitchen', preparing: 'Preparing',
  prepared:          'Ready',           served:  'Served',     completed: 'Completed',
  out_for_delivery:  '🛵 Out for Delivery', delivered: '📦 Delivered',
  re_serve_required: '🚨 Re-Serve Required',
  cancelled: 'Cancelled', void: 'Void',
};

const CATEGORIES = MENU_CATEGORIES;
const BADGE_LABEL: Record<string,string> = { bestseller:'⭐ Bestseller', popular:'🔥 Popular', chef:"👨‍🍳 Chef's Special", famous:'🏆 Famous', new:'✨ New' };
const emptyItem = (): Partial<MenuItem> => ({ category: CATEGORIES[0], name: '', desc: '', price: 0, img: '', badge: '', available: true, variants: [] });

export default function ManagerPage() {
  const router = useRouter();
  const [session, setSession]         = useState<AuthSession | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [tabs, setTabs]               = useState<CustomerTab[]>([]);
  const [orders, setOrders]           = useState<Order[]>([]);
  const [selTab, setSelTab]           = useState<CustomerTab | null>(null);
  const [tabFilter, setTabFilter]     = useState<'awaiting' | 'open' | 'closed'>('awaiting');
  const [clock, setClock]             = useState({ date: '', time: '' });

  // Billing flow
  const [tabPayMethod, setTabPayMethod]       = useState('cod');
  const [tabDiscAmt, setTabDiscAmt]           = useState('');
  const [tabDiscNote, setTabDiscNote]         = useState('');
  const [pinInput, setPinInput]               = useState('');
  const [pinMsg, setPinMsg]                   = useState('');
  // PIN is verified server-side — never stored in client state
  const [showDiscForm, setShowDiscForm]       = useState(false);
  const [tabBillMsg, setTabBillMsg]           = useState('');
  const [tabCloseConfirm, setTabCloseConfirm] = useState(false);

  // Email receipt (post-close manual send — shown after tab is already closed)
  const [receiptEmail, setReceiptEmail] = useState('');
  const [receiptMsg,   setReceiptMsg]   = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  // Pre-close email modal (intercepts "Collect & Close Tab" button)
  const [showPreCloseModal, setShowPreCloseModal] = useState(false);
  const [preCloseEmail,     setPreCloseEmail]     = useState('');
  const [preCloseSending,   setPreCloseSending]   = useState(false);
  const [preCloseMsg,       setPreCloseMsg]       = useState('');

  // Split billing — by person
  const [splitBill, setSplitBill]             = useState<SplitBillData | null>(null);
  const [showSplitModal, setShowSplitModal]   = useState(false);
  const [splitCount, setSplitCount]           = useState('2');
  const [splitPayEntry, setSplitPayEntry]     = useState<string | null>(null);
  const [splitPayMethod, setSplitPayMethod]   = useState('cod');
  // Split billing — by method (used inside split-bill modal)
  const [showSplitMethod, setShowSplitMethod] = useState(false);
  const [splitMethodRows, setSplitMethodRows] = useState<{ method: string; amount: string }[]>([
    { method: 'cod', amount: '' }, { method: 'upi', amount: '' },
  ]);
  // Inline split payment — table billing panel
  const [showTabPaySplit, setShowTabPaySplit] = useState(false);
  const [tabPaySplitRows, setTabPaySplitRows] = useState<{ method: string; amount: string }[]>([
    { method: 'cod', amount: '' }, { method: 'upi', amount: '' },
  ]);
  // Inline split payment — pickup order modal
  const [showPickupSplit, setShowPickupSplit] = useState(false);
  const [pickupSplitRows, setPickupSplitRows] = useState<{ method: string; amount: string }[]>([
    { method: 'cod', amount: '' }, { method: 'upi', amount: '' },
  ]);

  // End-of-day report
  const [showEOD, setShowEOD]                 = useState(false);

  // Expenses
  const [todayExpenses, setTodayExpenses]     = useState(0);

  // Issues
  const [escalatedIssues, setEscalatedIssues] = useState<OrderIssue[]>([]);

  // Errors
  const [fetchError, setFetchError]           = useState('');

  // Offer rules (loaded from /api/offers)
  const [offerRules, setOfferRules]           = useState<OfferRule[]>([]);

  // Pickup payment modal
  const [pickupPayOrder, setPickupPayOrder]   = useState<Order | null>(null);
  const [pickupPayMethod, setPickupPayMethod] = useState('cod');
  const [pickupDiscAmt, setPickupDiscAmt]     = useState('');
  const [pickupDiscNote, setPickupDiscNote]   = useState('');
  const [pickupDiscPin, setPickupDiscPin]     = useState('');
  const [pickupPayMsg, setPickupPayMsg]       = useState('');
  const [pickupPayBusy, setPickupPayBusy]     = useState(false);
  const [pickupDiscApplied, setPickupDiscApplied] = useState<{ amount: number; reason: string } | null>(null);
  const [showPickupDiscForm, setShowPickupDiscForm] = useState(false);

  // Section navigation
  type ManagerSection = 'billing' | 'menu';
  const [managerSection, setManagerSection]   = useState<ManagerSection>('billing');

  // Menu management
  const [menu,           setMenu]             = useState<MenuItem[]>([]);
  const [menuFilter,     setMenuFilter]       = useState('All');
  const [menuModal,      setMenuModal]        = useState<{open:boolean;item:Partial<MenuItem>;isEdit:boolean}>({open:false,item:emptyItem(),isEdit:false});
  const [modalVariants,  setModalVariants]    = useState<{name:string;price:string}[]>([{name:'',price:''}]);
  const [imgUploading,   setImgUploading]     = useState(false);
  const [seedingMenu,    setSeedingMenu]      = useState(false);
  const [seedMsg,        setSeedMsg]          = useState('');
  const [csvImportMsg,   setCsvImportMsg]     = useState('');

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const s = getSession('manager');
    if (!s) { router.replace('/manager/login'); return; }
    setSession(s);
    setAuthChecked(true);
    // Load offer rules once on mount
    fetch('/api/offers')
      .then(r => r.json())
      .then((data: OfferRule[] | { error: string }) => {
        if (Array.isArray(data)) setOfferRules(data);
      })
      .catch(e => console.error('[manager] failed to load offers:', e));
  }, [router]);

  // ── Data refresh ──────────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    try {
      setFetchError('');
      // Fetch ALL of today's orders (active + completed + cancelled) so the
      // EOD report has access to completed-order revenue and void counts.
      // Bounded by midnight-today to avoid loading unbounded history.
      const [allTabs, allOrders, issues, menuItems] = await Promise.all([
        getTabs(),
        getOrders({ since: todayMidnightIST().toISOString(), limit: 200 }),
        getActiveIssues(),
        getMenuApi(),
      ]);
      setTabs(allTabs);
      setOrders(allOrders);
      setMenu(menuItems as MenuItem[]);
      // Admin PIN is NOT loaded into client state — verified server-side only.
      // Only escalated issues go to manager (open ones are waiter/delivery responsibility)
      setEscalatedIssues(issues.filter(i => i.escalated || i.status === 'escalated'));
      setSelTab(prev => {
        if (!prev) return null;
        return allTabs.find(t => t.id === prev.id) ?? null;
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load data';
      setFetchError(msg);
      console.error('[manager] refresh error:', e);
    }
  }, []);

  // Socket.io real-time updates
  useRealtime(
    process.env.NEXT_PUBLIC_RESTAURANT_ID ?? 'rest_default',
    {
      order_created:          () => { refresh(); },
      order_status_changed:   () => { refresh(); },
      order_ready:            () => { refresh(); },
      order_served:           () => { refresh(); },
      order_out_for_delivery: () => { refresh(); },
      order_delivered:        () => { refresh(); },
      payment_completed:      () => { refresh(); },
      order_issue_escalated:  () => { refresh(); },
      order_issue_reported:   () => { refresh(); },
      order_issue_resolved:   () => { refresh(); },
    },
  );

  useEffect(() => {
    if (!authChecked) return;
    refresh();
    const t1 = setInterval(refresh, 5000);
    const t2 = setInterval(() => { setClock(clockIST()); }, 1000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, [refresh, authChecked]);

  function logout() { clearSession('manager'); router.replace('/manager/login'); }

  // ── Discount action ───────────────────────────────────────────────────────
  async function applyDiscount() {
    if (!selTab) return;
    const amt = parseInt(tabDiscAmt, 10);
    if (isNaN(amt) || amt <= 0) { setPinMsg('❌ Enter a valid amount'); return; }
    if (amt > selTab.total) { setPinMsg(`❌ Discount cannot exceed ₹${selTab.total}`); return; }
    // Verify admin PIN server-side — never stored in client state
    setPinMsg('⏳ Verifying…');
    try {
      const verifyRes = await fetch('/api/auth/verify-pin', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ role: 'admin', pin: pinInput }),
      });
      const verifyResult = await verifyRes.json() as { ok: boolean; error?: string };
      if (!verifyResult.ok) { setPinMsg(`❌ ${verifyResult.error ?? 'Wrong admin PIN'}`); return; }
    } catch {
      setPinMsg('❌ Could not verify PIN. Try again.');
      return;
    }
    try {
      await applyTabDiscount(selTab.id, amt, tabDiscNote || 'Manager discount');
      setTabDiscAmt(''); setTabDiscNote(''); setPinInput(''); setPinMsg('');
      setShowDiscForm(false);
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[manager] applyTabDiscount failed:', err);
      setPinMsg(`❌ Could not apply discount: ${msg}`);
    }
  }

  // ── Close tab action ──────────────────────────────────────────────────────
  async function handleCloseTab() {
    if (!selTab) return;

    // HARD BLOCK: cannot close tab if any order has an unresolved "not received" issue
    const unresolvedIssueOrders = orders
      .filter(o => o.tabId === selTab.id)
      .filter(o => o.status === 're_serve_required');
    if (unresolvedIssueOrders.length > 0) {
      setTabBillMsg(`🚫 Cannot close tab — ${unresolvedIssueOrders.length} order${unresolvedIssueOrders.length !== 1 ? 's' : ''} ha${unresolvedIssueOrders.length !== 1 ? 've' : 's'} an unresolved "not received" issue. Resolve the issue first.`);
      setTimeout(() => setTabBillMsg(''), 6000);
      return;
    }

    if (!tabCloseConfirm) {
      const inProgress = orders.filter(o => o.tabId === selTab.id).filter(o =>
        ['awaiting_waiter', 'pending', 'preparing', 'prepared'].includes(o.status),
      );
      if (inProgress.length > 0) {
        setTabCloseConfirm(true);
        return;
      }
    }
    setTabCloseConfirm(false);

    // Show email modal before actually closing tab.
    // Pre-fill with stored email if available (captured at tab open).
    setPreCloseEmail(selTab.email ?? '');
    setPreCloseMsg('');
    setShowPreCloseModal(true);
  }

  // ── Actually perform the tab close (called from pre-close modal) ──────────
  async function doCloseTab(emailToSend: string | null) {
    if (!selTab) return;
    setPreCloseSending(true);
    setPreCloseMsg('');
    try {
      await closeTab(selTab.id, tabPayMethod, selTab.discount || 0, selTab.discountReason);

      // If an email was provided, attempt to send receipt (fire-and-forget; never blocks close)
      if (emailToSend && emailToSend.includes('@')) {
        try {
          const result = await sendEmailReceipt({ tabId: selTab.id }, emailToSend);
          if (result.sent) {
            console.info('[manager] pre-close receipt sent to', emailToSend);
          } else {
            console.warn('[manager] pre-close receipt not sent:', result.reason);
          }
        } catch (emailErr) {
          // Non-fatal: tab is already closed; log and continue
          console.error('[manager] pre-close receipt error:', emailErr);
        }
      }

      setShowPreCloseModal(false);
      setTabBillMsg('✅ Payment collected! Tab closed.');
      await refresh();
      setTimeout(() => {
        setTabBillMsg('');
        setSelTab(null);
        setTabCloseConfirm(false);
        setSplitBill(null);
        setShowSplitModal(false);
        setShowSplitMethod(false);
        setShowTabPaySplit(false);
        setTabPaySplitRows([{ method: 'cod', amount: '' }, { method: 'upi', amount: '' }]);
        setTabPayMethod('cod');
      }, 1800);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[manager] closeTab failed:', err);
      setPreCloseMsg(`❌ Could not close tab: ${msg}. Please try again.`);
    } finally {
      setPreCloseSending(false);
    }
  }

  // ── Offer rule helpers ────────────────────────────────────────────────────
  function getApplicableOffers(total: number, orderType: 'all' | 'dine-in' | 'pickup' | 'delivery'): Array<{ offer: OfferRule; discountAmount: number }> {
    return offerRules
      .filter(o => o.active && total >= o.minOrder && (o.applyTo === 'all' || o.applyTo === orderType))
      .map(offer => {
        let discountAmount = 0;
        if (offer.type === 'percent') {
          discountAmount = Math.round((total * offer.value) / 100);
          if (offer.maxDiscount > 0) discountAmount = Math.min(discountAmount, offer.maxDiscount);
        } else {
          discountAmount = offer.value;
        }
        discountAmount = Math.min(discountAmount, total);
        return { offer, discountAmount };
      });
  }

  // ── Complete a pickup order at the counter ────────────────────────────────
  // Opens the pickup payment modal instead of immediately completing.
  function completePickupOrder(order: Order) {
    setPickupPayOrder(order);
    setPickupPayMethod('cod');
    setPickupDiscAmt('');
    setPickupDiscNote('');
    setPickupDiscPin('');
    setPickupPayMsg('');
    setPickupDiscApplied(null);
    setShowPickupDiscForm(false);
  }

  // ── Actually complete the pickup order (called from modal) ────────────────
  async function doCompletePickup() {
    if (!pickupPayOrder) return;
    setPickupPayBusy(true);
    setPickupPayMsg('');
    try {
      // If manual discount is being applied, verify manager PIN
      if (showPickupDiscForm && pickupDiscAmt && parseFloat(pickupDiscAmt) > 0 && !pickupDiscApplied) {
        const verifyRes = await fetch('/api/auth/verify-pin', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ role: 'manager', pin: pickupDiscPin }),
        });
        const verifyResult = await verifyRes.json() as { ok: boolean; error?: string };
        if (!verifyResult.ok) {
          setPickupPayMsg(`❌ ${verifyResult.error ?? 'Wrong manager PIN'}`);
          setPickupPayBusy(false);
          return;
        }
        const amt = parseFloat(pickupDiscAmt);
        if (!isNaN(amt) && amt > 0) {
          setPickupDiscApplied({ amount: Math.min(amt, pickupPayOrder.total), reason: pickupDiscNote || 'Manager discount' });
        }
      }
      const discAmt    = pickupDiscApplied?.amount ?? 0;
      const discReason = pickupDiscApplied?.reason ?? '';
      await updateOrderStatus(
        pickupPayOrder.id, 'completed', session?.name || 'Counter',
        { paymentMethod: pickupPayMethod, discount: discAmt, discountReason: discReason },
      );
      setPickupPayOrder(null);
      setPickupPayMsg('');
      setShowPickupSplit(false);
      setPickupSplitRows([{ method: 'cod', amount: '' }, { method: 'upi', amount: '' }]);
      setPickupPayMethod('cod');
      setPickupDiscApplied(null);
      setPickupDiscAmt('');
      setPickupDiscNote('');
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      console.error('[doCompletePickup]', e);
      setPickupPayMsg(`❌ Could not complete order: ${msg}`);
    } finally {
      setPickupPayBusy(false);
    }
  }

  // ── Split bill actions (all Supabase-backed) ─────────────────────────────
  async function handleCreateSplit() {
    if (!selTab) return;
    const count = Math.max(2, Math.min(10, parseInt(splitCount) || 2));
    // Use the same DB-authoritative total used for the bill display (Math.max with mem fallback)
    const splitMemSubtotal = tabOrders
      .filter(o => !['cancelled', 'void'].includes(o.status))
      .reduce((s, o) => s + (o.total || 0), 0);
    const computedSubtotal = Math.max(selTab.total || 0, splitMemSubtotal);
    const total  = Math.max(0, computedSubtotal - (selTab.discount || 0));
    const share  = Math.ceil((total / count) * 100) / 100;
    const entries = Array.from({ length: count }, (_, i) => ({
      label:  `Person ${i + 1}`,
      amount: i === count - 1 ? Math.round((total - share * (count - 1)) * 100) / 100 : share,
      paid:   false,
    }));
    try {
      const split = await createSplitBillApi(selTab.id, 'equal', entries);
      setSplitBill(split);
    } catch (e) { console.error('[split] create error:', e); }
    setShowSplitModal(false);
  }

  async function handleMarkSplitPaid(personLabel: string) {
    if (!selTab || !splitBill) return;
    try {
      const updated = await markSplitEntryPaidApi(splitBill, personLabel, splitPayMethod, session?.name);
      setSplitBill(updated);
    } catch (e) { console.error('[split] markPaid error:', e); }
    setSplitPayEntry(null);
  }

  async function loadSplitForTab(tabId: string) {
    try {
      const existing = await getSplitBillForTabApi(tabId);
      setSplitBill(existing);
    } catch { setSplitBill(null); }
  }

  // ── Derived data ──────────────────────────────────────────────────────────
  const awaitingTabs = tabs.filter(t => t.status === 'awaiting_payment');
  const openTabs     = tabs.filter(t => t.status === 'open');
  const closedTabs   = tabs.filter(t => t.status === 'closed' && !!t.closedAt && isToday(t.closedAt));
  // todayRevenue from orders state (already fetched from API)
  const todayRevenue  = orders
    .filter(o => { try { return isToday(o.timestamp); } catch { return false; } })
    .reduce((s, o) => s + (o.total || 0), 0);
  const todayNetProfit = todayRevenue - todayExpenses;

  const shown =
    tabFilter === 'awaiting' ? awaitingTabs :
    tabFilter === 'open'     ? openTabs     :
                               closedTabs;

  const tabOrders    = selTab ? orders.filter(o => o.tabId === selTab.id) : [];
  // customer_tabs.total is kept in sync by the order POST handler (on create) and the
  // order PATCH handler (on cancel / void / discount). It is the authoritative pre-discount
  // subtotal for ALL orders on this tab — including any placed before today's midnight.
  //
  // Do NOT recompute from tabOrders: getOrders() is bounded to todayMidnight so any order
  // placed earlier in a long-running session would be absent → bill would show ₹0.
  //
  // We take Math.max(dbTotal, memSum) as a safety net: if DB total is somehow stale (e.g.
  // old tab created before the order-sync code was deployed), the in-memory sum wins.
  const tabMemSubtotal = tabOrders
    .filter(o => !['cancelled', 'void'].includes(o.status))
    .reduce((s, o) => s + (o.total || 0), 0);
  const tabComputedSubtotal = selTab
    ? Math.max(selTab.total || 0, tabMemSubtotal)
    : 0;
  const tabBillTotal = Math.max(0, tabComputedSubtotal - (selTab?.discount || 0));

  const inProgressOrders = selTab
    ? tabOrders.filter(o => ['awaiting_waiter', 'pending', 'preparing', 'prepared', 're_serve_required'].includes(o.status))
    : [];

  // EOD report — derived from live Supabase orders (replaces localStorage getEndOfDayReport)
  const todayOrds = orders.filter(o => isToday(o.timestamp));
  const completedOrds = todayOrds.filter(o => o.status === 'completed');
  const avgVal = completedOrds.length > 0
    ? Math.round(completedOrds.reduce((s, o) => s + (o.total || 0), 0) / completedOrds.length)
    : 0;
  const itemQtyMap = new Map<string, number>();
  todayOrds.filter(o => !['cancelled', 'void'].includes(o.status)).forEach(o => {
    (o.items || []).forEach(it => {
      itemQtyMap.set(it.name, (itemQtyMap.get(it.name) || 0) + (it.qty || 1));
    });
  });
  const eodReport = {
    date:           new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' }),
    totalOrders:    completedOrds.length,
    totalRevenue:   Math.round(todayOrds.filter(o => !['cancelled', 'void'].includes(o.status)).reduce((s, o) => s + (o.total || 0), 0)),
    avgOrderValue:  avgVal,
    completedTabs:  tabs.filter(t => t.status === 'closed' && isToday(t.createdAt)).length,
    discountsTotal: Math.round(todayOrds.reduce((s, o) => s + (o.discount || 0), 0)),
    voidedOrders:   todayOrds.filter(o => o.status === 'void').length,
    topItems: Array.from(itemQtyMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, qty]) => ({ name, qty })),
  };

  // ── Pickup & Delivery visibility ──────────────────────────────────────────
  // isToday is imported from lib/date — uses IST, not UTC
  const activePickup    = orders.filter(o => o.type === 'pickup'   && !['cancelled','void','completed'].includes(o.status));
  const activeDelivery  = orders.filter(o => o.type === 'delivery' && !['cancelled','void','completed'].includes(o.status));
  const todayPickup     = orders.filter(o => o.type === 'pickup'   && isToday(o.timestamp));
  const todayDelivery   = orders.filter(o => o.type === 'delivery' && isToday(o.timestamp));
  const revenuePickup   = todayPickup.filter(o => o.status === 'completed').reduce((s, o) => s + (o.total || 0), 0);
  const revenueDelivery = todayDelivery.filter(o => o.status === 'completed').reduce((s, o) => s + (o.total || 0), 0);
  const hasNonDineIn    = activePickup.length > 0 || activeDelivery.length > 0 || todayPickup.length > 0 || todayDelivery.length > 0;

  // ── Menu CRUD ─────────────────────────────────────────────────────────────
  function addVariantRow() { setModalVariants(v => [...v, {name:'',price:''}]); }
  function removeVariantRow(idx: number) { setModalVariants(v => v.filter((_,i)=>i!==idx)); }
  function updateVariantRow(idx: number, field: 'name'|'price', val: string) {
    setModalVariants(v => v.map((r,i)=>i===idx?{...r,[field]:val}:r));
  }

  async function saveItem() {
    const it = menuModal.item;
    if (!it.name?.trim()) { alert('Item name required'); return; }
    const filled = modalVariants.filter(v=>v.name.trim()||v.price.trim());
    if (!filled.length) { alert('Add at least one pricing variant'); return; }
    for (const v of filled) {
      if (!v.name.trim()) { alert('Each variant needs a name (e.g. Half, Full, Regular)'); return; }
      const p = parseFloat(v.price);
      if (isNaN(p)||p<=0) { alert(`Invalid price for variant "${v.name}"`); return; }
    }
    const variants = filled.map(v=>({ name:v.name.trim(), price:parseFloat(v.price) }));
    try {
      await saveMenuItemApi({
        id:        menuModal.isEdit ? it.id : undefined,
        name:      it.name     || '',
        category:  it.category || CATEGORIES[0],
        price:     variants[0].price,
        variants,
        desc:      it.desc     || '',
        img:       it.img      || '',
        badge:     it.badge    || '',
        available: it.available !== false,
      });
      setMenuModal({open:false,item:emptyItem(),isEdit:false});
      setModalVariants([{name:'',price:''}]);
      void refresh();
    } catch (e) { alert('Failed to save: ' + (e instanceof Error ? e.message : String(e))); }
  }

  async function uploadMenuImage(file: File) {
    if (file.size > 5*1024*1024) { alert('Image must be under 5 MB'); return; }
    setImgUploading(true);
    try {
      const form = new FormData(); form.append('file', file);
      const res  = await fetch('/api/menu/upload', { method:'POST', body:form });
      const data = await res.json() as { ok:boolean; url?:string; error?:string };
      if (!res.ok||!data.url) throw new Error(data.error ?? 'Upload failed');
      setMenuModal(m=>({...m,item:{...m.item,img:data.url}}));
    } catch (e) { alert('Upload failed: ' + (e instanceof Error ? e.message : String(e))); }
    finally { setImgUploading(false); }
  }

  async function importMenuCatalog() {
    if (!confirm('Add all missing menu items from the complete catalog?\n\nExisting items will NOT be changed.')) return;
    setSeedingMenu(true); setSeedMsg('');
    try {
      const res  = await fetch('/api/menu/seed');
      const data = await res.json() as { ok:boolean; inserted?:number; skipped?:number; error?:string };
      if (!res.ok||!data.ok) throw new Error(data.error ?? 'Seed failed');
      setSeedMsg(`✅ ${data.inserted} items added, ${data.skipped} already existed.`);
      void refresh();
    } catch (e) { setSeedMsg('❌ ' + (e instanceof Error ? e.message : String(e))); }
    finally { setSeedingMenu(false); }
  }

  function downloadCsvTemplate() {
    const rows = [
      'name,category,description,badge,available,variants,image_url',
      '"Chicken Dum Biryani","Non Veg Biryani","Authentic Hyderabadi Dum Biryani","bestseller","true","Half:140|Full:260","https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=400"',
      '"Roti","Indian Breads","Soft whole wheat flatbread","","true","Regular:10",""',
    ];
    const blob = new Blob([rows.join('\n')], {type:'text/csv'});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'menu-import-template.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  async function importMenuFromCsv(file: File) {
    setCsvImportMsg('⏳ Importing…');
    try {
      const text  = await file.text();
      const lines = text.trim().split('\n').filter(l=>l.trim());
      if (lines.length < 2) { setCsvImportMsg('❌ CSV must have at least a header row and one data row'); return; }
      const header = lines[0].split(',').map(h=>h.trim().toLowerCase().replace(/^"|"$/g,''));
      const idx    = (n: string) => header.indexOf(n);
      let inserted = 0, failed = 0;
      for (const line of lines.slice(1)) {
        const c = line.match(/("(?:[^"]|"")*"|[^,]*)/g)?.map(v=>v.replace(/^"|"$/g,'').replace(/""/g,'"')) ?? [];
        const name = c[idx('name')]?.trim() ?? '';
        if (!name) continue;
        const category = c[idx('category')]?.trim() || CATEGORIES[0];
        let variants: {name:string;price:number}[] = [];
        const vStr = c[idx('variants')]?.trim() ?? '';
        if (vStr) {
          variants = vStr.split('|').map(v=>{const [n,p]=v.split(':');return{name:(n??'').trim(),price:parseFloat(p??'0')};}).filter(v=>v.name&&!isNaN(v.price)&&v.price>0);
        }
        if (!variants.length) variants = [{name:'Regular',price:0}];
        try {
          await saveMenuItemApi({ name, category, desc:c[idx('description')]??'', badge:c[idx('badge')]??'', img:c[idx('image_url')]??'', available:(c[idx('available')]??'true').toLowerCase()!=='false', variants, price:variants[0].price });
          inserted++;
        } catch { failed++; }
      }
      setCsvImportMsg(`✅ Imported ${inserted} items${failed?`, ${failed} failed`:''}.`);
      void refresh();
    } catch (e) { setCsvImportMsg('❌ ' + (e instanceof Error ? e.message : String(e))); }
  }

  const menuItems = menuFilter==='All' ? menu : menu.filter(m=>m.category===menuFilter);

  // ── Styles ────────────────────────────────────────────────────────────────
  const btn = (bg = '#E65C00', c = 'white'): React.CSSProperties => ({
    background: bg, color: c, border: 'none', borderRadius: 8,
    fontWeight: 700, cursor: 'pointer', fontFamily: 'Poppins,sans-serif',
    padding: '0.5rem 1rem', fontSize: '0.82rem',
  });
  const tabB = (active: boolean): React.CSSProperties => ({
    background: active ? '#E65C00' : '#f5f0e8', color: active ? 'white' : '#6B5246',
    border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer',
    fontFamily: 'Poppins,sans-serif', padding: '0.4rem 0.85rem', fontSize: '0.8rem',
  });
  const inp: React.CSSProperties = {
    width: '100%', padding: '0.6rem 0.75rem',
    border: '2px solid #e5e7eb', borderRadius: 8,
    fontFamily: 'Poppins,sans-serif', fontSize: '0.88rem',
  };

  if (!authChecked) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#faf8f3,#f5f0e8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#888' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💳</div>
          <div>Loading Manager Portal…</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#faf8f3,#f5f0e8)', fontFamily: 'Poppins,sans-serif' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#064e3b,#065f46)', color: 'white', padding: '0.75rem 1rem', paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))', position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0, flexShrink: 1 }}>
            <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>💳</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.05rem', fontWeight: 900, whiteSpace: 'nowrap' }}>Manager — Counter</div>
              <div style={{ fontSize: '0.68rem', color: '#6ee7b7', whiteSpace: 'nowrap' }}>Billing & Payment Portal</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', flexShrink: 0, maxWidth: 'calc(100vw - 170px)', paddingBottom: 2 }}>
            {awaitingTabs.length > 0 && (
              <div style={{ background: '#f59e0b', color: 'white', padding: '0.2rem 0.55rem', borderRadius: 20, fontSize: '0.7rem', fontWeight: 800, whiteSpace: 'nowrap', flexShrink: 0 }}>
                💰 {awaitingTabs.length}
              </div>
            )}
            <button onClick={()=>setManagerSection('billing')} style={{...btn(managerSection==='billing'?'#059669':'#065f46','#6ee7b7'),border:`1px solid ${managerSection==='billing'?'#34d399':'#6ee7b7'}`,fontSize:'0.72rem',whiteSpace:'nowrap',flexShrink:0}}>
              💳 Billing
            </button>
            <button onClick={()=>setManagerSection('menu')} style={{...btn(managerSection==='menu'?'#d97706':'#065f46','#fde68a'),border:`1px solid ${managerSection==='menu'?'#fbbf24':'#6ee7b7'}`,fontSize:'0.72rem',whiteSpace:'nowrap',flexShrink:0}}>
              🍽️ Menu
            </button>
            <button onClick={() => router.push('/manager/tables')} style={{ ...btn('#065f46', '#6ee7b7'), border: '1px solid #6ee7b7', fontSize: '0.72rem', whiteSpace: 'nowrap', flexShrink: 0 }}>
              🪑 Tables
            </button>
            <button onClick={() => router.push('/manager/expenses')} style={{ ...btn('#065f46', '#6ee7b7'), border: '1px solid #6ee7b7', fontSize: '0.72rem', whiteSpace: 'nowrap', flexShrink: 0 }}>
              💸 Expenses
            </button>
            <button onClick={() => setShowEOD(!showEOD)} style={{ ...btn('#065f46', '#6ee7b7'), border: '1px solid #6ee7b7', fontSize: '0.72rem', whiteSpace: 'nowrap', flexShrink: 0 }}>
              📊 EOD
            </button>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{clock.date}</div>
              <div style={{ fontSize: '0.68rem', color: '#6ee7b7', whiteSpace: 'nowrap' }}>{clock.time}</div>
            </div>
            <button onClick={logout} style={{ ...btn('#ef444430', '#ef4444'), border: '1px solid #ef444440', fontSize: '0.72rem', whiteSpace: 'nowrap', flexShrink: 0 }}>
              🚪
            </button>
          </div>
        </div>
      </div>

      {/* EOD Report Panel */}
      {showEOD && (
        <div style={{ background: '#064e3b', color: 'white', padding: '1.25rem 1.5rem', borderBottom: '3px solid #059669' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1rem', fontWeight: 900, color: '#6ee7b7' }}>
              📊 End-of-Day Report — {eodReport.date}
            </div>
            <button onClick={() => setShowEOD(false)} style={{ background: 'none', border: 'none', color: '#6ee7b7', fontSize: '1.25rem', cursor: 'pointer' }}>×</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
            {[
              { icon: '🧾', val: eodReport.totalOrders,  label: 'Orders Completed', color: '#6ee7b7' },
              { icon: '💰', val: `₹${eodReport.totalRevenue}`, label: 'Total Revenue', color: '#fbbf24' },
              { icon: '📊', val: `₹${eodReport.avgOrderValue}`, label: 'Avg Order Value', color: '#a78bfa' },
              { icon: '✅', val: eodReport.completedTabs, label: 'Closed Tabs', color: '#34d399' },
              { icon: '🏷️', val: `₹${eodReport.discountsTotal}`, label: 'Discounts Given', color: '#f87171' },
              { icon: '🚫', val: eodReport.voidedOrders,  label: 'Voided Orders', color: '#fb923c' },
            ].map(s => (
              <div key={s.label} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '0.75rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.2rem', marginBottom: '0.2rem' }}>{s.icon}</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: s.color }}>{s.val}</div>
                <div style={{ fontSize: '0.62rem', color: '#9ca3af' }}>{s.label}</div>
              </div>
            ))}
          </div>
          {eodReport.topItems.length > 0 && (
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#6ee7b7', marginBottom: '0.4rem' }}>🏆 Top Items Today</div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {eodReport.topItems.map((item, i) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 20, padding: '0.2rem 0.7rem', fontSize: '0.75rem', color: 'white' }}>
                    {item.name} <span style={{ color: '#fbbf24', fontWeight: 700 }}>×{item.qty}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats bar */}
      {(() => {
        const fmt  = (n: number) => (isFinite(n) ? n : 0).toLocaleString('en-IN');
        const safe = (n: number) => isFinite(n) ? n : 0;
        const profit = safe(todayNetProfit);
        return (
          <div style={{ background: '#065f46', color: 'white', padding: '0.6rem 1.5rem', display: 'flex', gap: '2rem', overflowX: 'auto' }}>
            {[
              { icon: '💰', val: `₹${fmt(todayRevenue)}`,                              label: 'Revenue Today',   color: '#6ee7b7' },
              { icon: '💸', val: `₹${fmt(todayExpenses)}`,                             label: 'Expenses Today',  color: '#fca5a5' },
              { icon: profit >= 0 ? '📈' : '📉',
                val: `${profit >= 0 ? '+' : '−'}₹${fmt(Math.abs(profit))}`,            label: 'Net Profit Today',color: profit >= 0 ? '#6ee7b7' : '#fca5a5' },
              { icon: '🧾', val: awaitingTabs.length,                                   label: 'Awaiting Payment',color: '#fde68a' },
              { icon: '🟢', val: openTabs.length,                                       label: 'Open Tabs',       color: '#6ee7b7' },
              { icon: '✅', val: closedTabs.length,                                     label: 'Closed Today',    color: '#a7f3d0' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: s.color }}>{s.icon} {s.val}</div>
                <div style={{ fontSize: '0.62rem', color: '#a7f3d0' }}>{s.label}</div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* ── Escalated Issues Banner ── */}
      {escalatedIssues.length > 0 && (
        <div style={{ margin: '0.75rem 1.5rem 0', background: 'linear-gradient(135deg,#7f1d1d,#dc2626)', borderRadius: 12, color: 'white', padding: '1rem 1.25rem', boxShadow: '0 4px 20px rgba(220,38,38,0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div style={{ fontWeight: 900, fontSize: '0.95rem' }}>
              🚨 {escalatedIssues.length} ESCALATED ISSUE{escalatedIssues.length > 1 ? 'S' : ''} — MANAGER ACTION REQUIRED
            </div>
            <div style={{ fontSize: '0.7rem', opacity: 0.85 }}>Customer reported not received 3+ times</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {escalatedIssues.map(issue => {
              const relOrder = orders.find(o => o.id === issue.orderId);
              return (
                <div key={issue.id} style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 8, padding: '0.6rem 0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.82rem' }}>
                      Order #{relOrder?.orderNum || issue.orderId.slice(-6)}
                      {relOrder?.customerName && <span style={{ fontWeight: 400, marginLeft: '0.4rem', opacity: 0.85 }}>— {relOrder.customerName}</span>}
                    </div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.85, marginTop: '0.1rem' }}>
                      Reported by: {issue.reportedBy} · Attempt #{issue.retryCount} · {fmtTime(issue.reportedAt)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      onClick={async () => {
                        try {
                          await resolveIssue(issue.id, session?.name || 'Manager');
                          await refresh();
                        } catch (e) { console.error('[manager] resolveIssue error:', e); }
                      }}
                      style={{ background: '#16a34a', color: 'white', border: 'none', borderRadius: 6, padding: '0.3rem 0.7rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.72rem', fontFamily: 'Poppins,sans-serif' }}
                    >
                      ✅ Mark Resolved
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          // Force-resolve with refund note — manager makes the call
                          await resolveIssue(issue.id, session?.name || 'Manager');
                          await refresh();
                        } catch (e) { console.error('[manager] refund issue error:', e); }
                      }}
                      style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 6, padding: '0.3rem 0.7rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.72rem', fontFamily: 'Poppins,sans-serif' }}
                    >
                      💸 Resolve + Refund
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════════ MENU MANAGEMENT SECTION ═══════════════════════ */}
      {managerSection === 'menu' && (
        <div style={{ padding: '1rem 1.5rem' }}>
          {/* Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.6rem' }}>
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              {['All', ...CATEGORIES].map(c => (
                <button key={c} onClick={() => setMenuFilter(c)} style={tabB(menuFilter === c)}>{c}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' as const }}>
              <button onClick={() => { setMenuModal({ open: true, item: emptyItem(), isEdit: false }); setModalVariants([{ name: '', price: '' }]); }} style={{ ...btn(), display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>＋</span> Add Item
              </button>
            </div>
          </div>

          {/* Import messages */}
          {(seedMsg || csvImportMsg) && (() => {
            const message = seedMsg || csvImportMsg;
            const bg  = message.startsWith('✅') ? '#dcfce7' : message.startsWith('⏳') ? '#eff6ff' : '#fef2f2';
            const clr = message.startsWith('✅') ? '#16a34a' : message.startsWith('⏳') ? '#2563eb' : '#ef4444';
            return (
              <div style={{ padding: '0.6rem 0.85rem', borderRadius: 8, background: bg, color: clr, fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{message}</span>
                <button onClick={() => { setSeedMsg(''); setCsvImportMsg(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '1.1rem', lineHeight: 1 }}>×</button>
              </div>
            );
          })()}

          {/* Menu grid */}
          {!menuItems.length
            ? <div style={{ textAlign: 'center', color: '#999', padding: '3rem', background: 'white', borderRadius: 12 }}>No items in this category</div>
            : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(255px,1fr))', gap: '1rem' }}>
                {menuItems.map(item => (
                  <div key={item.id} style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', opacity: item.available === false ? 0.55 : 1, transition: 'opacity .2s' }}>
                    <div style={{ position: 'relative', height: '145px', background: '#f5f0e8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem' }}>
                      {item.img && <img src={item.img} alt={item.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
                      {!item.img && '🍽️'}
                      {item.badge && <span style={{ position: 'absolute', top: 8, left: 8, background: '#E65C00', color: 'white', fontSize: '0.6rem', padding: '0.18rem 0.45rem', borderRadius: 8, fontWeight: 700, zIndex: 1 }}>{BADGE_LABEL[item.badge] || item.badge}</span>}
                      {item.available === false && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.82rem', zIndex: 1 }}>UNAVAILABLE</div>}
                    </div>
                    <div style={{ padding: '0.85rem' }}>
                      <div style={{ fontSize: '0.62rem', color: '#888', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.category}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.4rem', margin: '0.2rem 0 0.25rem' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1A0800' }}>{item.name}</div>
                        <div style={{ fontWeight: 900, color: '#E65C00', fontSize: '0.88rem', whiteSpace: 'nowrap' }}>
                          {item.variants && item.variants.length > 0
                            ? item.variants.length === 1
                              ? `₹${item.variants[0].price}`
                              : `₹${item.variants[0].price}–₹${item.variants[item.variants.length - 1].price}`
                            : `₹${item.price}`}
                        </div>
                      </div>
                      <div style={{ fontSize: '0.73rem', color: '#888', marginBottom: '0.75rem', lineHeight: '1.4' }}>{item.desc}</div>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button onClick={() => { setMenuModal({ open: true, item: { ...item }, isEdit: true }); setModalVariants(item.variants && item.variants.length > 0 ? item.variants.map(v => ({ name: v.name, price: String(v.price) })) : [{ name: 'Regular', price: String(item.price) }]); }} style={{ ...btn('#3b82f6'), padding: '0.3rem 0.75rem', fontSize: '0.75rem', flex: 1 }}>✏️ Edit</button>
                        <button onClick={() => { saveMenuItemApi({ id: item.id, available: item.available === false }).then(() => refresh()).catch(e => alert(String(e))); }} style={{ ...btn(item.available === false ? '#16a34a' : '#6b7280'), padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}>{item.available === false ? '✅' : '⏸'}</button>
                        <button onClick={() => { if (confirm(`Delete "${item.name}"?`)) { deleteMenuItemApi(item.id).then(() => refresh()).catch(e => alert(String(e))); } }} style={{ ...btn('#ef4444'), padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>🗑</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>
      )}

      {/* ══════════════════════════ BILLING SECTION ══════════════════════════ */}

      {/* ── Pickup & Delivery Panel ── */}
      {managerSection === 'billing' && (hasNonDineIn || true) && (
        <div style={{ padding: '0.75rem 1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          {/* Pickup Orders */}
          <div style={{ background: 'white', borderRadius: 12, border: '2px solid #16a34a', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ background: '#16a34a', color: 'white', padding: '0.5rem 0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>🏪 Pickup Orders</span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {activePickup.length > 0 && (
                  <span style={{ background: '#fff', color: '#16a34a', borderRadius: 20, padding: '0.1rem 0.5rem', fontWeight: 800, fontSize: '0.72rem' }}>
                    {activePickup.length} Active
                  </span>
                )}
              </div>
            </div>
            <div style={{ padding: '0.6rem 0.9rem' }}>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 900, color: '#16a34a', fontSize: '1.15rem' }}>{todayPickup.length}</div>
                  <div style={{ fontSize: '0.62rem', color: '#64748b' }}>Today Total</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 900, color: '#3b82f6', fontSize: '1.15rem' }}>{activePickup.length}</div>
                  <div style={{ fontSize: '0.62rem', color: '#64748b' }}>Active</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 900, color: '#E65C00', fontSize: '1.15rem' }}>₹{Math.round(revenuePickup)}</div>
                  <div style={{ fontSize: '0.62rem', color: '#64748b' }}>Revenue</div>
                </div>
              </div>
              {activePickup.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: 200, overflowY: 'auto' }}>
                  {activePickup.map(o => (
                    <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.3rem 0.5rem', background: '#f0fdf4', borderRadius: 6, fontSize: '0.75rem', gap: '0.4rem' }}>
                      <span style={{ fontWeight: 700 }}>#{o.orderNum || o.id.slice(-4)}</span>
                      <span style={{ color: STATUS_COLOR[o.status] || '#888', fontWeight: 700 }}>{STATUS_LABEL[o.status] || o.status}</span>
                      <span style={{ fontWeight: 800, color: '#16a34a' }}>₹{o.total}</span>
                      {/* 'served' = customer at counter — counter collects payment and marks completed */}
                      {o.status === 'served' && (
                        <button
                          onClick={() => completePickupOrder(o)}
                          style={{ background: '#16a34a', color: 'white', border: 'none', borderRadius: 6, padding: '0.2rem 0.5rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontSize: '0.68rem', whiteSpace: 'nowrap' }}
                        >
                          💳 Collect Payment
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {activePickup.length === 0 && (
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center', padding: '0.5rem 0' }}>No active pickup orders</div>
              )}
            </div>
          </div>

          {/* Delivery Orders */}
          <div style={{ background: 'white', borderRadius: 12, border: '2px solid #2563eb', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ background: '#2563eb', color: 'white', padding: '0.5rem 0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>🛵 Delivery Orders</span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {activeDelivery.length > 0 && (
                  <span style={{ background: '#fff', color: '#2563eb', borderRadius: 20, padding: '0.1rem 0.5rem', fontWeight: 800, fontSize: '0.72rem' }}>
                    {activeDelivery.length} Active
                  </span>
                )}
              </div>
            </div>
            <div style={{ padding: '0.6rem 0.9rem' }}>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 900, color: '#2563eb', fontSize: '1.15rem' }}>{todayDelivery.length}</div>
                  <div style={{ fontSize: '0.62rem', color: '#64748b' }}>Today Total</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 900, color: '#3b82f6', fontSize: '1.15rem' }}>{activeDelivery.length}</div>
                  <div style={{ fontSize: '0.62rem', color: '#64748b' }}>Active</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 900, color: '#E65C00', fontSize: '1.15rem' }}>₹{Math.round(revenueDelivery)}</div>
                  <div style={{ fontSize: '0.62rem', color: '#64748b' }}>Revenue</div>
                </div>
              </div>
              {activeDelivery.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: 140, overflowY: 'auto' }}>
                  {activeDelivery.map(o => (
                    <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.25rem 0.5rem', background: '#eff6ff', borderRadius: 6, fontSize: '0.75rem' }}>
                      <span style={{ fontWeight: 700 }}>#{o.orderNum || o.id.slice(-4)}</span>
                      <span style={{ color: STATUS_COLOR[o.status] || '#888', fontWeight: 700 }}>{STATUS_LABEL[o.status] || o.status}</span>
                      <span style={{ fontWeight: 800, color: '#2563eb' }}>₹{o.total}</span>
                    </div>
                  ))}
                </div>
              )}
              {activeDelivery.length === 0 && (
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center', padding: '0.5rem 0' }}>No active delivery orders</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error banner */}
      {fetchError && (
        <div style={{
          background: '#fef2f2', border: '2px solid #fecaca',
          borderRadius: 10, padding: '0.75rem 1.25rem',
          margin: '0.5rem 1.5rem', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center',
          fontSize: '0.82rem', color: '#dc2626', fontWeight: 600,
        }}>
          <span>⚠️ {fetchError}</span>
          <button
            onClick={refresh}
            style={{ background: '#dc2626', color: 'white', border: 'none', borderRadius: 6, padding: '0.3rem 0.75rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem', fontFamily: 'Poppins,sans-serif' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* ─────────────── BILLING CONTENT ─────────────── */}
      {managerSection === 'billing' && <>

      {/* Filter tabs */}
      <div style={{ padding: '0.75rem 1.5rem', display: 'flex', gap: '0.5rem', overflowX: 'auto' }}>
        {[
          { key: 'awaiting', label: `💰 Awaiting Payment (${awaitingTabs.length})` },
          { key: 'open',     label: `🟢 Open Tabs (${openTabs.length})`             },
          { key: 'closed',   label: `✅ Closed Today (${closedTabs.length})`        },
        ].map(f => (
          <button key={f.key} onClick={() => setTabFilter(f.key as typeof tabFilter)} style={{
            padding: '0.35rem 0.9rem', borderRadius: 20, cursor: 'pointer', whiteSpace: 'nowrap',
            fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: '0.78rem',
            border: `2px solid ${tabFilter === f.key ? '#16a34a' : '#ddd'}`,
            background: tabFilter === f.key ? '#16a34a' : 'white',
            color: tabFilter === f.key ? 'white' : '#666',
          }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Tab list */}
      <div style={{ padding: '0 1.5rem 2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: '1rem' }}>
        {!shown.length ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#999', padding: '3rem' }}>
            {tabFilter === 'awaiting' ? '🎉 No pending payments right now!' : 'No tabs found.'}
          </div>
        ) : shown.map(tab => {
          const tabOrdrs = orders.filter(o => o.tabId === tab.id);
          const activeOrdrs = tabOrdrs.filter(o => !['cancelled', 'void', 'completed'].includes(o.status));
          // customer_tabs.total is kept in sync on every order POST (create) and PATCH
          // (cancel / void / discount) — it is ALWAYS the authoritative pre-discount subtotal.
          // Do NOT recompute from tabOrders: getOrders() is bounded to today's midnight, so
          // orders placed before midnight on a still-open tab would be missing → shows ₹0.
          const dbSubtotal  = tab.total || 0;
          // Fallback: sum in-memory orders if DB total is somehow 0 but orders exist today
          const memSubtotal = tabOrdrs
            .filter(o => !['cancelled', 'void'].includes(o.status))
            .reduce((s, o) => s + (o.total || 0), 0);
          const computedSubtotal = Math.max(dbSubtotal, memSubtotal);
          const billAmt = Math.max(0, computedSubtotal - (tab.discount || 0));
          const sinceMin = Math.floor((Date.now() - new Date(tab.createdAt).getTime()) / 60000);

          return (
            <div
              key={tab.id}
              onClick={() => {
                setSelTab(tab);
                setShowDiscForm(false);
                setTabDiscAmt(''); setTabDiscNote('');
                setPinInput(''); setPinMsg('');
                setTabBillMsg('');
                setTabCloseConfirm(false);
                setShowSplitModal(false);
                setShowSplitMethod(false);
                setSplitPayEntry(null);
                loadSplitForTab(tab.id);
              }}
              style={{
                background: 'white', borderRadius: 12, overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                borderLeft: `4px solid ${tab.status === 'awaiting_payment' ? '#f59e0b' : tab.status === 'open' ? '#16a34a' : '#9ca3af'}`,
                cursor: 'pointer',
              }}
            >
              <div style={{ padding: '0.8rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1A0800' }}>{formatTableName(tab.tableId)}</div>
                  <div style={{ fontSize: '0.73rem', color: '#888', marginTop: '0.1rem' }}>
                    {tab.customerName} · {tab.partySize} guest{tab.partySize !== 1 ? 's' : ''}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#aaa', marginTop: '0.05rem' }}>⏱ {sinceMin}m seated</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem' }}>
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 10,
                    background: tab.status === 'awaiting_payment' ? '#fef9c3' : tab.status === 'open' ? '#dcfce7' : '#f3f4f6',
                    color: tab.status === 'awaiting_payment' ? '#854d0e' : tab.status === 'open' ? '#166534' : '#6b7280',
                  }}>
                    {tab.status === 'awaiting_payment' ? '💳 Bill Requested' : tab.status === 'open' ? '🟢 Open' : '✅ Closed'}
                  </span>
                  <span style={{ fontWeight: 900, color: '#16a34a', fontSize: '1rem' }}>₹{billAmt}</span>
                </div>
              </div>
              <div style={{ padding: '0.4rem 1rem', borderTop: '1px solid #f5f0e8', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#888' }}>
                <span>{activeOrdrs.length} active order{activeOrdrs.length !== 1 ? 's' : ''}</span>
                {tab.discount > 0 && <span style={{ color: '#16a34a' }}>−₹{tab.discount} disc.</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Tab Detail Modal ── */}
      {selTab && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200 }}
          onClick={() => { setSelTab(null); setTabCloseConfirm(false); setSplitBill(null); setShowSplitModal(false); setShowSplitMethod(false); setShowTabPaySplit(false); setTabPaySplitRows([{ method: 'cod', amount: '' }, { method: 'upi', amount: '' }]); }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: 'white', width: '100%', maxWidth: 'min(95vw,540px)', maxHeight: '92dvh', overflow: 'hidden', display: 'flex', flexDirection: 'column', borderRadius: '16px 16px 0 0', boxShadow: '0 -20px 60px rgba(0,0,0,0.3)' }}
          >
            {/* Modal header */}
            <div style={{ background: 'linear-gradient(135deg,#064e3b,#16a34a)', color: 'white', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 900, fontSize: '1.05rem' }}>
                  🪑 {formatTableName(selTab.tableId)} — {selTab.customerName}
                </div>
                <div style={{ fontSize: '0.73rem', opacity: 0.8 }}>
                  {selTab.partySize} guest{selTab.partySize !== 1 ? 's' : ''} ·{' '}
                  {selTab.status === 'awaiting_payment' ? '💳 Bill Requested' : selTab.status === 'open' ? '🟢 Open Tab' : '✅ Closed'}
                </div>
              </div>
              <button onClick={() => { setSelTab(null); setTabCloseConfirm(false); setSplitBill(null); setShowSplitModal(false); setShowSplitMethod(false); setShowTabPaySplit(false); setTabPaySplitRows([{ method: 'cod', amount: '' }, { method: 'upi', amount: '' }]); }} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem' }}>

              {/* Unresolved issue warning inside modal */}
              {tabOrders.some(o => o.status === 're_serve_required') && (
                <div style={{ background: '#fef2f2', border: '2px solid #fecaca', borderRadius: 10, padding: '0.65rem 0.85rem', marginBottom: '0.75rem' }}>
                  <div style={{ fontWeight: 800, color: '#dc2626', fontSize: '0.85rem', marginBottom: '0.2rem' }}>
                    🚫 Tab closure blocked
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#7f1d1d' }}>
                    One or more orders have an unresolved &quot;not received&quot; issue. Staff must re-serve and customer must confirm before you can close this tab.
                  </div>
                </div>
              )}

              {/* Orders list */}
              {tabOrders.filter(o => !['cancelled', 'void'].includes(o.status)).map(order => (
                <div key={order.id} style={{ marginBottom: '0.75rem', background: '#fafafa', borderRadius: 10, overflow: 'hidden', border: `2px solid ${order.status === 're_serve_required' ? '#dc2626' : (STATUS_COLOR[order.status] || '#e5e7eb') + '30'}` }}>
                  {order.status === 're_serve_required' && (
                    <div style={{ background: '#dc2626', color: 'white', padding: '0.18rem 0.85rem', fontSize: '0.68rem', fontWeight: 800 }}>
                      🚨 Re-serve required — blocking tab closure
                    </div>
                  )}
                  <div style={{ padding: '0.5rem 0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: (STATUS_COLOR[order.status] || '#e5e7eb') + '12', borderBottom: '1px solid #f0f0f0' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#1A0800' }}>
                      #{order.orderNum || order.id.slice(-4)}
                    </span>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: STATUS_COLOR[order.status] || '#888' }}>
                        {STATUS_LABEL[order.status] || order.status}
                      </span>
                      <span style={{ fontWeight: 800, color: '#16a34a', fontSize: '0.85rem' }}>₹{order.total}</span>
                    </div>
                  </div>
                  {(order.items || []).map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0.85rem', fontSize: '0.8rem', color: '#555', borderBottom: i < order.items.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                      <span>{item.name} <span style={{ color: '#aaa' }}>×{item.qty}</span></span>
                      <span>₹{item.subtotal ?? item.price * item.qty}</span>
                    </div>
                  ))}
                </div>
              ))}

              {/* Bill summary */}
              <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '0.85rem 1rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem', color: '#555' }}>
                  <span>Subtotal</span>
                  {/* tabComputedSubtotal: DB-authoritative tab.total (synced on every order event) */}
                  <span style={{ fontWeight: 600 }}>₹{tabComputedSubtotal}</span>
                </div>
                {(selTab.discount || 0) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem', color: '#16a34a' }}>
                    <span>Discount ({selTab.discountReason})</span>
                    <span style={{ fontWeight: 700 }}>−₹{selTab.discount}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 900, borderTop: '2px solid #16a34a', paddingTop: '0.4rem', marginTop: '0.25rem', color: '#064e3b' }}>
                  <span>TOTAL</span>
                  <span>₹{tabBillTotal}</span>
                </div>
              </div>

              {/* ── Split Billing Section ── */}
              {selTab.status !== 'closed' && (
                <div style={{ marginBottom: '1rem' }}>
                  {!splitBill && !showSplitMethod ? (
                    !showSplitModal ? (
                      /* ── Choice: Split by Person or Split by Method ── */
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          onClick={() => setShowSplitModal(true)}
                          style={{ ...btn('#f0fdf4', '#16a34a'), fontSize: '0.78rem', flex: 1, border: '1px solid #86efac' }}
                        >
                          👥 Split by Person
                        </button>
                        <button
                          onClick={() => {
                            setSplitMethodRows([{ method: 'cod', amount: '' }, { method: 'upi', amount: '' }]);
                            setShowSplitMethod(true);
                          }}
                          style={{ ...btn('#eff6ff', '#2563eb'), fontSize: '0.78rem', flex: 1, border: '1px solid #bfdbfe' }}
                        >
                          💳 Split by Method
                        </button>
                      </div>
                    ) : (
                      <div style={{ background: '#f0fdf4', borderRadius: 10, border: '1px solid #86efac', padding: '1rem', marginBottom: '0.5rem' }}>
                        <div style={{ fontWeight: 700, color: '#064e3b', fontSize: '0.85rem', marginBottom: '0.5rem' }}>✂️ Split Equally Between</div>
                        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem' }}>
                          {[2, 3, 4, 5, 6].map(n => (
                            <button
                              key={n}
                              onClick={() => setSplitCount(String(n))}
                              style={{
                                flex: 1, padding: '0.4rem', borderRadius: 8, fontWeight: 700, cursor: 'pointer',
                                border: `2px solid ${splitCount === String(n) ? '#16a34a' : '#d1fae5'}`,
                                background: splitCount === String(n) ? '#16a34a' : 'white',
                                color: splitCount === String(n) ? 'white' : '#065f46',
                                fontFamily: 'Poppins,sans-serif', fontSize: '0.85rem',
                              }}
                            >{n}</button>
                          ))}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 600, marginBottom: '0.5rem' }}>
                          ≈ ₹{Math.ceil(tabBillTotal / (parseInt(splitCount) || 2))} per person
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button onClick={handleCreateSplit} style={{ ...btn('#16a34a'), flex: 2, fontSize: '0.78rem' }}>
                            Split Now
                          </button>
                          <button onClick={() => setShowSplitModal(false)} style={{ ...btn('#9ca3af'), flex: 1, fontSize: '0.78rem' }}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    )
                  ) : showSplitMethod ? (
                    /* ── Split by Method form ── */
                    (() => {
                      const PAY_OPTS = [
                        { k: 'cod',     l: '💵 Cash'    },
                        { k: 'upi',     l: '📲 UPI'     },
                        { k: 'card',    l: '💳 Card'    },
                        { k: 'gpay',    l: '📱 GPay'    },
                        { k: 'phonepe', l: '📱 PhonePe' },
                        { k: 'paytm',   l: '📱 Paytm'  },
                      ];
                      const PAY_NAMES: Record<string, string> = {
                        cod: 'Cash', upi: 'UPI', card: 'Card', gpay: 'GPay', phonepe: 'PhonePe', paytm: 'Paytm',
                      };
                      const splitTotal = splitMethodRows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
                      const isBalanced = Math.abs(splitTotal - tabBillTotal) < 1;
                      return (
                        <div style={{ background: '#eff6ff', borderRadius: 10, border: '1px solid #bfdbfe', padding: '1rem', marginBottom: '0.5rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                            <div style={{ fontWeight: 700, color: '#1d4ed8', fontSize: '0.85rem' }}>💳 Split by Payment Method</div>
                            <button onClick={() => setShowSplitMethod(false)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '0.75rem' }}>Cancel</button>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '0.5rem' }}>
                            Enter the amount paid by each method. Total must equal ₹{tabBillTotal}.
                          </div>
                          {splitMethodRows.map((row, i) => (
                            <div key={i} style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.4rem', alignItems: 'center' }}>
                              <select
                                value={row.method}
                                onChange={e => setSplitMethodRows(prev => prev.map((r, j) => j === i ? { ...r, method: e.target.value } : r))}
                                style={{ flex: 1.3, padding: '0.35rem 0.4rem', borderRadius: 6, border: '1.5px solid #bfdbfe', fontSize: '0.78rem', fontFamily: 'Poppins,sans-serif', background: 'white' }}
                              >
                                {PAY_OPTS.map(p => <option key={p.k} value={p.k}>{p.l}</option>)}
                              </select>
                              <input
                                type="number"
                                value={row.amount}
                                onChange={e => setSplitMethodRows(prev => prev.map((r, j) => j === i ? { ...r, amount: e.target.value } : r))}
                                placeholder="₹ Amount"
                                style={{ flex: 1, padding: '0.35rem 0.4rem', borderRadius: 6, border: '1.5px solid #bfdbfe', fontSize: '0.78rem', fontFamily: 'Poppins,sans-serif', minWidth: 0 }}
                              />
                              {splitMethodRows.length > 2 && (
                                <button
                                  onClick={() => setSplitMethodRows(prev => prev.filter((_, j) => j !== i))}
                                  style={{ background: '#fef2f2', border: 'none', borderRadius: 6, padding: '0.3rem 0.5rem', cursor: 'pointer', color: '#ef4444', fontWeight: 700, fontSize: '0.8rem', fontFamily: 'Poppins,sans-serif' }}
                                >×</button>
                              )}
                            </div>
                          ))}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                            <button
                              onClick={() => setSplitMethodRows(prev => [...prev, { method: 'cod', amount: '' }])}
                              style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', borderRadius: 6, background: '#f0f9ff', border: '1px dashed #60a5fa', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', color: '#2563eb' }}
                            >+ Add method</button>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: isBalanced ? '#16a34a' : '#ef4444' }}>
                              ₹{splitTotal} / ₹{tabBillTotal} {isBalanced ? '✅' : ''}
                            </span>
                          </div>
                          <button
                            disabled={!isBalanced}
                            onClick={() => {
                              // Format combined payment string: "Cash ₹500 + UPI ₹300"
                              const combined = splitMethodRows
                                .filter(r => parseFloat(r.amount) > 0)
                                .map(r => `${PAY_NAMES[r.method] || r.method} ₹${r.amount}`)
                                .join(' + ');
                              setTabPayMethod(combined);
                              setShowSplitMethod(false);
                            }}
                            style={{ ...btn('#2563eb'), width: '100%', fontSize: '0.78rem', opacity: isBalanced ? 1 : 0.5 }}
                          >
                            ✅ Confirm — Use Combined Payment
                          </button>
                        </div>
                      );
                    })()
                  ) : (
                    /* Split bill by-person UI */
                    <div style={{ background: '#f0fdf4', borderRadius: 10, border: '1px solid #86efac', padding: '1rem', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <div style={{ fontWeight: 700, color: '#064e3b', fontSize: '0.85rem' }}>✂️ Split Bill ({splitBill!.entries.length} persons)</div>
                        <button onClick={() => setSplitBill(null)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '0.75rem' }}>Reset</button>
                      </div>
                      {splitBill!.entries.map((entry, i) => (
                        <div key={i} style={{ marginBottom: '0.5rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: entry.paid ? '#dcfce7' : 'white', borderRadius: 8, border: `1px solid ${entry.paid ? '#86efac' : '#d1d5db'}` }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.82rem', color: entry.paid ? '#16a34a' : '#1A0800' }}>
                                {entry.paid ? '✅' : '⬜'} {entry.label}
                              </div>
                              {entry.paid && entry.paymentMethod && (
                                <div style={{ fontSize: '0.68rem', color: '#16a34a' }}>
                                  Paid via {PAY_LABELS[entry.paymentMethod] || entry.paymentMethod}
                                </div>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontWeight: 800, color: '#064e3b', fontSize: '0.9rem' }}>₹{entry.amount}</span>
                              {!entry.paid && (
                                <button
                                  onClick={() => setSplitPayEntry(entry.label)}
                                  style={{ ...btn('#16a34a'), fontSize: '0.72rem', padding: '0.3rem 0.6rem' }}
                                >
                                  Mark Paid
                                </button>
                              )}
                            </div>
                          </div>
                          {/* Pay method selection for this entry */}
                          {splitPayEntry === entry.label && (
                            <div style={{ background: '#fffbeb', borderRadius: 8, padding: '0.6rem', marginTop: '0.25rem', border: '1px solid #fde68a' }}>
                              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#555', marginBottom: '0.3rem' }}>Payment Method</div>
                              <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                                {[{k:'cod',l:'💵 Cash'},{k:'gpay',l:'📱 GPay'},{k:'card',l:'💳 Card'},{k:'upi',l:'📲 UPI'}].map(p => (
                                  <button
                                    key={p.k}
                                    onClick={() => setSplitPayMethod(p.k)}
                                    style={{
                                      padding: '0.25rem 0.6rem', borderRadius: 6,
                                      border: `1.5px solid ${splitPayMethod === p.k ? '#16a34a' : '#d1d5db'}`,
                                      background: splitPayMethod === p.k ? '#f0fdf4' : 'white',
                                      color: splitPayMethod === p.k ? '#16a34a' : '#666',
                                      fontWeight: 600, cursor: 'pointer', fontSize: '0.72rem',
                                      fontFamily: 'Poppins,sans-serif',
                                    }}
                                  >{p.l}</button>
                                ))}
                              </div>
                              <div style={{ display: 'flex', gap: '0.3rem' }}>
                                <button onClick={() => handleMarkSplitPaid(entry.label)} style={{ ...btn('#16a34a'), flex: 2, fontSize: '0.72rem' }}>
                                  ✅ Confirm ₹{entry.amount} Paid
                                </button>
                                <button onClick={() => setSplitPayEntry(null)} style={{ ...btn('#9ca3af'), flex: 1, fontSize: '0.72rem' }}>
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                      {splitBill && splitBill.entries.length > 0 && splitBill.entries.every(e => e.paid) && (
                        <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: 8, padding: '0.5rem', textAlign: 'center', fontWeight: 700, color: '#16a34a', fontSize: '0.82rem', marginTop: '0.25rem' }}>
                          🎉 All portions paid! You can now close the tab.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Payment method */}
              {selTab.status !== 'closed' && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#555', display: 'block', marginBottom: '0.4rem' }}>Payment Method</label>
                  {/* Combined split badge — show when a split string has been confirmed */}
                  {tabPayMethod.includes('+') ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.75rem', background: '#eff6ff', border: '2px solid #2563eb', borderRadius: 8 }}>
                      <span style={{ flex: 1, fontWeight: 700, color: '#1d4ed8', fontSize: '0.8rem' }}>💳 {tabPayMethod}</span>
                      <button
                        onClick={() => { setTabPayMethod('cod'); setShowTabPaySplit(false); setTabPaySplitRows([{ method: 'cod', amount: '' }, { method: 'upi', amount: '' }]); }}
                        style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'Poppins,sans-serif', fontWeight: 600 }}
                      >× Reset</button>
                    </div>
                  ) : showTabPaySplit ? (
                    /* ── Inline split form ── */
                    (() => {
                      const TAB_PAY_OPTS = [
                        { k: 'cod', l: '💵 Cash' }, { k: 'upi', l: '📲 UPI' },
                        { k: 'card', l: '💳 Card' }, { k: 'gpay', l: '📱 GPay' },
                        { k: 'phonepe', l: '📱 PhonePe' }, { k: 'paytm', l: '📱 Paytm' },
                      ];
                      const TAB_PAY_NAMES: Record<string, string> = {
                        cod: 'Cash', upi: 'UPI', card: 'Card', gpay: 'GPay', phonepe: 'PhonePe', paytm: 'Paytm',
                      };
                      const splitTotal = tabPaySplitRows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
                      const isBalanced = Math.abs(splitTotal - tabBillTotal) < 1;
                      return (
                        <div style={{ background: '#eff6ff', borderRadius: 10, border: '1px solid #bfdbfe', padding: '0.85rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <div style={{ fontWeight: 700, color: '#1d4ed8', fontSize: '0.82rem' }}>✂️ Split Payment</div>
                            <button onClick={() => setShowTabPaySplit(false)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'Poppins,sans-serif' }}>Cancel</button>
                          </div>
                          <div style={{ fontSize: '0.71rem', color: '#64748b', marginBottom: '0.5rem' }}>
                            Total must equal ₹{tabBillTotal}.
                          </div>
                          {tabPaySplitRows.map((row, i) => (
                            <div key={i} style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.35rem', alignItems: 'center' }}>
                              <select
                                value={row.method}
                                onChange={e => setTabPaySplitRows(prev => prev.map((r, j) => j === i ? { ...r, method: e.target.value } : r))}
                                style={{ flex: 1.4, padding: '0.32rem 0.4rem', borderRadius: 6, border: '1.5px solid #bfdbfe', fontSize: '0.77rem', fontFamily: 'Poppins,sans-serif', background: 'white' }}
                              >
                                {TAB_PAY_OPTS.map(p => <option key={p.k} value={p.k}>{p.l}</option>)}
                              </select>
                              <input
                                type="number"
                                value={row.amount}
                                onChange={e => setTabPaySplitRows(prev => prev.map((r, j) => j === i ? { ...r, amount: e.target.value } : r))}
                                placeholder="₹ Amount"
                                style={{ flex: 1, padding: '0.32rem 0.4rem', borderRadius: 6, border: '1.5px solid #bfdbfe', fontSize: '0.77rem', fontFamily: 'Poppins,sans-serif', minWidth: 0 }}
                              />
                              {tabPaySplitRows.length > 2 && (
                                <button
                                  onClick={() => setTabPaySplitRows(prev => prev.filter((_, j) => j !== i))}
                                  style={{ background: '#fef2f2', border: 'none', borderRadius: 6, padding: '0.28rem 0.45rem', cursor: 'pointer', color: '#ef4444', fontWeight: 700, fontSize: '0.8rem', fontFamily: 'Poppins,sans-serif' }}
                                >×</button>
                              )}
                            </div>
                          ))}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.55rem' }}>
                            <button
                              onClick={() => setTabPaySplitRows(prev => [...prev, { method: 'cod', amount: '' }])}
                              style={{ fontSize: '0.71rem', padding: '0.2rem 0.5rem', borderRadius: 6, background: '#f0f9ff', border: '1px dashed #60a5fa', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', color: '#2563eb' }}
                            >+ Add method</button>
                            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: isBalanced ? '#16a34a' : '#ef4444' }}>
                              ₹{splitTotal} / ₹{tabBillTotal} {isBalanced ? '✅' : ''}
                            </span>
                          </div>
                          <button
                            disabled={!isBalanced}
                            onClick={() => {
                              const combined = tabPaySplitRows
                                .filter(r => parseFloat(r.amount) > 0)
                                .map(r => `${TAB_PAY_NAMES[r.method] || r.method} ₹${r.amount}`)
                                .join(' + ');
                              setTabPayMethod(combined);
                              setShowTabPaySplit(false);
                            }}
                            style={{ ...btn('#2563eb'), width: '100%', fontSize: '0.78rem', opacity: isBalanced ? 1 : 0.5 }}
                          >✅ Apply Split Payment</button>
                        </div>
                      );
                    })()
                  ) : (
                    /* Single method buttons + Split toggle */
                    <div>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                        {[
                          { k: 'cod',     l: '💵 Cash'      },
                          { k: 'gpay',    l: '📱 GPay'       },
                          { k: 'phonepe', l: '📱 PhonePe'    },
                          { k: 'card',    l: '💳 Card'       },
                          { k: 'upi',     l: '📲 UPI'        },
                        ].map(p => (
                          <button
                            key={p.k}
                            onClick={() => setTabPayMethod(p.k)}
                            style={{
                              padding: '0.35rem 0.75rem', borderRadius: 8,
                              border: `2px solid ${tabPayMethod === p.k ? '#16a34a' : '#e5e7eb'}`,
                              background: tabPayMethod === p.k ? '#f0fdf4' : 'white',
                              color: tabPayMethod === p.k ? '#16a34a' : '#666',
                              fontWeight: 700, cursor: 'pointer', fontSize: '0.78rem',
                              fontFamily: 'Poppins,sans-serif',
                            }}
                          >{p.l}</button>
                        ))}
                      </div>
                      <button
                        onClick={() => { setShowTabPaySplit(true); setTabPaySplitRows([{ method: 'cod', amount: '' }, { method: 'upi', amount: '' }]); }}
                        style={{ fontSize: '0.75rem', padding: '0.28rem 0.75rem', borderRadius: 8, background: '#eff6ff', border: '1.5px solid #bfdbfe', cursor: 'pointer', color: '#2563eb', fontWeight: 700, fontFamily: 'Poppins,sans-serif' }}
                      >✂️ Split Payment</button>
                    </div>
                  )}
                </div>
              )}

              {/* Discount section */}
              {selTab.status !== 'closed' && (
                <div style={{ marginBottom: '1rem' }}>
                  {/* Available Offers */}
                  {getApplicableOffers(tabBillTotal, 'dine-in').length > 0 && (
                    <div style={{ marginBottom: '0.65rem', padding: '0.75rem', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10 }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#16a34a', marginBottom: '0.4rem' }}>🎁 Available Offers</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        {getApplicableOffers(tabBillTotal, 'dine-in').map(({ offer, discountAmount }) => (
                          <div key={offer.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', borderRadius: 8, padding: '0.35rem 0.6rem', border: '1px solid #bbf7d0' }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.77rem', color: '#1A0800' }}>{offer.name}</div>
                              <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Saves ₹{discountAmount}</div>
                            </div>
                            <button
                              onClick={() => { setTabDiscAmt(String(discountAmount)); setTabDiscNote(offer.name); setShowDiscForm(true); }}
                              style={{ ...btn('#16a34a'), padding: '0.25rem 0.65rem', fontSize: '0.7rem' }}
                            >⚡ Apply</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => setShowDiscForm(!showDiscForm)}
                    style={{ ...btn('#f5f0e8', '#E65C00'), fontSize: '0.78rem', width: '100%', border: '1px solid #F9A826' }}
                  >
                    🏷️ {showDiscForm ? 'Hide' : 'Apply'} Discount
                  </button>
                  {showDiscForm && (
                    <div style={{ marginTop: '0.75rem', padding: '1rem', background: '#fffbeb', borderRadius: 10, border: '1px solid #fde68a' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <div>
                          <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#555', display: 'block', marginBottom: '0.25rem' }}>Amount (₹)</label>
                          <input type="number" value={tabDiscAmt} onChange={e => setTabDiscAmt(e.target.value)} placeholder="e.g. 50" style={{ ...inp, fontSize: '0.82rem' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#555', display: 'block', marginBottom: '0.25rem' }}>Reason</label>
                          <input value={tabDiscNote} onChange={e => setTabDiscNote(e.target.value)} placeholder="e.g. Loyalty" style={{ ...inp, fontSize: '0.82rem' }} />
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#555', display: 'block', marginBottom: '0.25rem' }}>Admin PIN</label>
                        <input type="password" value={pinInput} onChange={e => setPinInput(e.target.value)} placeholder="••••" maxLength={6}
                          style={{ ...inp, letterSpacing: '0.4em', textAlign: 'center', fontSize: '0.82rem' }} />
                      </div>
                      {pinMsg && <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.4rem' }}>{pinMsg}</div>}
                      <button onClick={applyDiscount} style={{ ...btn('#f59e0b', '#1A0800'), width: '100%', marginTop: '0.5rem', fontSize: '0.82rem' }}>
                        Apply Discount
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* In-progress warning */}
              {tabCloseConfirm && inProgressOrders.length > 0 && (
                <div style={{ background: '#fff7ed', border: '2px solid #f97316', borderRadius: 10, padding: '0.85rem 1rem', marginBottom: '1rem' }}>
                  <div style={{ fontWeight: 800, color: '#9a3412', fontSize: '0.88rem', marginBottom: '0.4rem' }}>
                    ⚠️ {inProgressOrders.length} Order{inProgressOrders.length !== 1 ? 's' : ''} Still In Progress
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#7c2d12', lineHeight: 1.5 }}>
                    {inProgressOrders.map(o =>
                      `#${o.orderNum || o.id.slice(-4)} (${STATUS_LABEL[o.status] || o.status})`
                    ).join(' · ')}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#9a3412', marginTop: '0.35rem' }}>
                    Closing this tab will mark all pending orders as completed.
                  </div>
                </div>
              )}

              {/* Bill message */}
              {tabBillMsg && (
                <div style={{ background: '#dcfce7', color: '#16a34a', borderRadius: 10, padding: '0.75rem', textAlign: 'center', fontWeight: 700, marginBottom: '0.75rem' }}>
                  {tabBillMsg}
                </div>
              )}

              {/* Close Tab button */}
              {selTab.status !== 'closed' && !tabBillMsg && (
                <button
                  onClick={handleCloseTab}
                  style={{
                    ...btn(tabCloseConfirm ? '#dc2626' : '#16a34a'),
                    width: '100%', padding: '0.85rem', fontSize: '0.95rem', borderRadius: 12,
                  }}
                >
                  {tabCloseConfirm
                    ? '⚠️ Confirm — Close Tab Anyway'
                    : `✅ Collect ₹${tabBillTotal} · Close Tab (${PAY_LABELS[tabPayMethod] || tabPayMethod})`}
                </button>
              )}

              {selTab.status === 'closed' && (
                <div>
                  <div style={{ background: '#f0fdf4', color: '#16a34a', borderRadius: 10, padding: '0.85rem', textAlign: 'center', fontWeight: 800, fontSize: '1rem', marginBottom: '0.75rem' }}>
                    ✅ Tab Closed · Paid via {PAY_LABELS[selTab.paymentMethod] || selTab.paymentMethod}
                  </div>
                  {/* Email Receipt */}
                  <div style={{ background: '#eff6ff', borderRadius: 10, padding: '0.85rem', border: '1px solid #bfdbfe' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1d4ed8', marginBottom: '0.25rem' }}>
                      📧 Send Email Receipt
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '0.5rem' }}>
                      Enter customer&apos;s email — works even for dine-in tabs with no email on file.
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="email"
                        placeholder="customer@email.com"
                        value={receiptEmail}
                        onChange={e => setReceiptEmail(e.target.value)}
                        style={{ flex: 1, padding: '0.5rem 0.75rem', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: '0.85rem', outline: 'none', fontFamily: 'Poppins,sans-serif' }}
                      />
                      <button
                        disabled={sendingEmail || !receiptEmail.includes('@')}
                        onClick={async () => {
                          if (!receiptEmail.includes('@')) return;
                          setSendingEmail(true);
                          setReceiptMsg('');
                          try {
                            // Pass tabId — the server fetches ALL tab orders directly from DB.
                            // This works regardless of whether orders are in client state
                            // (getOrders is bounded to today's midnight, so old-session orders
                            // may be absent from state; the server has no such limitation).
                            const result = await sendEmailReceipt(
                              { tabId: selTab!.id },
                              receiptEmail,
                            );
                            if (result.sent) {
                              setReceiptMsg('✅ Receipt sent!');
                            } else if (result.reason === 'Already sent') {
                              setReceiptMsg('ℹ️ Receipt was already sent for this tab');
                            } else if (result.reason === 'RESEND_API_KEY not configured') {
                              setReceiptMsg('❌ Email not configured — set RESEND_API_KEY in .env.local');
                            } else if (result.reason?.startsWith('RESEND_DOMAIN_REQUIRED')) {
                              setReceiptMsg('❌ Resend free tier only allows sending to the verified account email. To send to any address, verify a domain at resend.com/domains then update FROM_EMAIL in your environment variables.');
                            } else {
                              setReceiptMsg(`❌ Could not send: ${result.reason ?? 'Unknown error'}`);
                            }
                          } catch (err) {
                            const errDetail = err instanceof Error ? err.message : 'Unknown error';
                            console.error('[manager] sendEmailReceipt failed:', err);
                            setReceiptMsg(`❌ Failed to send: ${errDetail}`);
                          } finally {
                            setSendingEmail(false);
                          }
                        }}
                        style={{ ...btn('#2563eb'), padding: '0.5rem 0.85rem', fontSize: '0.8rem', opacity: sendingEmail ? 0.7 : 1 }}
                      >
                        {sendingEmail ? '⏳' : '📤 Send'}
                      </button>
                    </div>
                    {receiptMsg && (
                      <div style={{ marginTop: '0.4rem', fontSize: '0.78rem', color: receiptMsg.includes('✅') ? '#16a34a' : '#dc2626' }}>
                        {receiptMsg}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ PICKUP PAYMENT MODAL ══════════════════ */}
      {pickupPayOrder && (() => {
        const o = pickupPayOrder;
        const discAmt = pickupDiscApplied?.amount ?? 0;
        const finalTotal = Math.max(0, o.total - discAmt);
        const applicable = getApplicableOffers(o.total, 'pickup');
        return (
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
            onClick={e => { if (e.target === e.currentTarget && !pickupPayBusy) { setPickupPayOrder(null); setShowPickupSplit(false); setPickupSplitRows([{ method: 'cod', amount: '' }, { method: 'upi', amount: '' }]); } }}
          >
            <div style={{ background: 'white', borderRadius: 20, width: '100%', maxWidth: 'min(95vw,440px)', maxHeight: '92dvh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.35)', fontFamily: 'Poppins,sans-serif' }}>
              {/* Header */}
              <div style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)', color: 'white', padding: '1.1rem 1.4rem', borderRadius: '20px 20px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: '1.05rem' }}>🏪 Pickup Order #{o.orderNum || o.id.slice(-4)}</div>
                  <div style={{ fontSize: '0.82rem', opacity: 0.9 }}>₹{o.total} · {o.customerName}</div>
                </div>
                <button onClick={() => { if (!pickupPayBusy) setPickupPayOrder(null); }} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', fontSize: '1.4rem', cursor: 'pointer', borderRadius: 8, lineHeight: 1, padding: '0.15rem 0.4rem' }}>×</button>
              </div>
              <div style={{ padding: '1.2rem 1.4rem' }}>

                {/* Items list */}
                <div style={{ marginBottom: '0.85rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6B5246', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>Order Items</div>
                  {(o.items || []).map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', borderBottom: '1px solid #f3f4f6', fontSize: '0.82rem' }}>
                      <span>{item.name}{item.variant ? ` (${item.variant})` : ''} × {item.qty || 1}</span>
                      <span style={{ fontWeight: 700 }}>₹{(item.price || 0) * (item.qty || 1)}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem', fontWeight: 700, fontSize: '0.85rem' }}>
                    <span>Subtotal</span>
                    <span>₹{o.total}</span>
                  </div>
                </div>

                {/* Available offers */}
                {applicable.length > 0 && (
                  <div style={{ marginBottom: '0.85rem', padding: '0.75rem', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10 }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#16a34a', marginBottom: '0.4rem' }}>🎁 Available Offers</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {applicable.map(({ offer, discountAmount }) => (
                        <div key={offer.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', borderRadius: 8, padding: '0.35rem 0.6rem', border: '1px solid #bbf7d0' }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.77rem', color: '#1A0800' }}>{offer.name}</div>
                            <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Saves ₹{discountAmount}</div>
                          </div>
                          <button
                            onClick={() => setPickupDiscApplied({ amount: discountAmount, reason: offer.name })}
                            style={{ ...btn('#16a34a'), padding: '0.25rem 0.65rem', fontSize: '0.7rem' }}
                          >⚡ Apply</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Applied offer badge */}
                {pickupDiscApplied && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#dcfce7', border: '1px solid #86efac', borderRadius: 10, padding: '0.55rem 0.85rem', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#16a34a' }}>✅ Offer applied: {pickupDiscApplied.reason} — −₹{pickupDiscApplied.amount}</span>
                    <button onClick={() => setPickupDiscApplied(null)} style={{ background: 'none', border: 'none', color: '#16a34a', cursor: 'pointer', fontWeight: 900, fontSize: '1rem', lineHeight: 1 }}>×</button>
                  </div>
                )}

                {/* Manual discount toggle */}
                <div style={{ marginBottom: '0.85rem' }}>
                  <button
                    onClick={() => setShowPickupDiscForm(!showPickupDiscForm)}
                    style={{ ...btn('#f5f0e8', '#E65C00'), fontSize: '0.78rem', width: '100%', border: '1px solid #F9A826' }}
                  >
                    🏷️ {showPickupDiscForm ? 'Hide' : 'Manual'} Discount
                  </button>
                  {showPickupDiscForm && (
                    <div style={{ marginTop: '0.65rem', padding: '0.85rem', background: '#fffbeb', borderRadius: 10, border: '1px solid #fde68a' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <div>
                          <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#555', display: 'block', marginBottom: '0.25rem' }}>Amount (₹)</label>
                          <input type="number" value={pickupDiscAmt} onChange={e => setPickupDiscAmt(e.target.value)} placeholder="e.g. 50" style={{ ...inp, fontSize: '0.82rem' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#555', display: 'block', marginBottom: '0.25rem' }}>Reason</label>
                          <input value={pickupDiscNote} onChange={e => setPickupDiscNote(e.target.value)} placeholder="e.g. Loyalty" style={{ ...inp, fontSize: '0.82rem' }} />
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#555', display: 'block', marginBottom: '0.25rem' }}>Manager PIN</label>
                        <input type="password" value={pickupDiscPin} onChange={e => setPickupDiscPin(e.target.value)} placeholder="••••" maxLength={6}
                          style={{ ...inp, letterSpacing: '0.4em', textAlign: 'center', fontSize: '0.82rem' }} />
                      </div>
                      <button
                        onClick={async () => {
                          const amt = parseFloat(pickupDiscAmt);
                          if (isNaN(amt) || amt <= 0) { setPickupPayMsg('❌ Enter a valid amount'); return; }
                          setPickupPayMsg('⏳ Verifying…');
                          try {
                            const res = await fetch('/api/auth/verify-pin', {
                              method: 'POST', headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ role: 'manager', pin: pickupDiscPin }),
                            });
                            const result = await res.json() as { ok: boolean; error?: string };
                            if (!result.ok) { setPickupPayMsg(`❌ ${result.error ?? 'Wrong manager PIN'}`); return; }
                            setPickupDiscApplied({ amount: Math.min(amt, o.total), reason: pickupDiscNote || 'Manager discount' });
                            setPickupPayMsg('');
                            setShowPickupDiscForm(false);
                          } catch { setPickupPayMsg('❌ Could not verify PIN. Try again.'); }
                        }}
                        style={{ ...btn('#f59e0b', '#1A0800'), width: '100%', marginTop: '0.5rem', fontSize: '0.82rem' }}
                      >Apply Discount</button>
                    </div>
                  )}
                </div>

                {/* Payment method */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#555', display: 'block', marginBottom: '0.4rem' }}>Payment Method</label>
                  {/* Combined split badge */}
                  {pickupPayMethod.includes('+') ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.75rem', background: '#eff6ff', border: '2px solid #2563eb', borderRadius: 8 }}>
                      <span style={{ flex: 1, fontWeight: 700, color: '#1d4ed8', fontSize: '0.8rem' }}>💳 {pickupPayMethod}</span>
                      <button
                        onClick={() => { setPickupPayMethod('cod'); setShowPickupSplit(false); setPickupSplitRows([{ method: 'cod', amount: '' }, { method: 'upi', amount: '' }]); }}
                        style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'Poppins,sans-serif', fontWeight: 600 }}
                      >× Reset</button>
                    </div>
                  ) : showPickupSplit ? (
                    /* ── Inline split form for pickup ── */
                    (() => {
                      const PKP_PAY_OPTS = [
                        { k: 'cod', l: '💵 Cash' }, { k: 'upi', l: '📲 UPI' },
                        { k: 'card', l: '💳 Card' }, { k: 'gpay', l: '📱 GPay' },
                        { k: 'phonepe', l: '📱 PhonePe' }, { k: 'paytm', l: '📱 Paytm' },
                      ];
                      const PKP_PAY_NAMES: Record<string, string> = {
                        cod: 'Cash', upi: 'UPI', card: 'Card', gpay: 'GPay', phonepe: 'PhonePe', paytm: 'Paytm',
                      };
                      const pkpTotal = pickupSplitRows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
                      const pkpBalanced = Math.abs(pkpTotal - finalTotal) < 1;
                      return (
                        <div style={{ background: '#eff6ff', borderRadius: 10, border: '1px solid #bfdbfe', padding: '0.85rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <div style={{ fontWeight: 700, color: '#1d4ed8', fontSize: '0.82rem' }}>✂️ Split Payment</div>
                            <button onClick={() => setShowPickupSplit(false)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'Poppins,sans-serif' }}>Cancel</button>
                          </div>
                          <div style={{ fontSize: '0.71rem', color: '#64748b', marginBottom: '0.5rem' }}>
                            Total must equal ₹{finalTotal}.
                          </div>
                          {pickupSplitRows.map((row, i) => (
                            <div key={i} style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.35rem', alignItems: 'center' }}>
                              <select
                                value={row.method}
                                onChange={e => setPickupSplitRows(prev => prev.map((r, j) => j === i ? { ...r, method: e.target.value } : r))}
                                style={{ flex: 1.4, padding: '0.32rem 0.4rem', borderRadius: 6, border: '1.5px solid #bfdbfe', fontSize: '0.77rem', fontFamily: 'Poppins,sans-serif', background: 'white' }}
                              >
                                {PKP_PAY_OPTS.map(p => <option key={p.k} value={p.k}>{p.l}</option>)}
                              </select>
                              <input
                                type="number"
                                value={row.amount}
                                onChange={e => setPickupSplitRows(prev => prev.map((r, j) => j === i ? { ...r, amount: e.target.value } : r))}
                                placeholder="₹ Amount"
                                style={{ flex: 1, padding: '0.32rem 0.4rem', borderRadius: 6, border: '1.5px solid #bfdbfe', fontSize: '0.77rem', fontFamily: 'Poppins,sans-serif', minWidth: 0 }}
                              />
                              {pickupSplitRows.length > 2 && (
                                <button
                                  onClick={() => setPickupSplitRows(prev => prev.filter((_, j) => j !== i))}
                                  style={{ background: '#fef2f2', border: 'none', borderRadius: 6, padding: '0.28rem 0.45rem', cursor: 'pointer', color: '#ef4444', fontWeight: 700, fontSize: '0.8rem', fontFamily: 'Poppins,sans-serif' }}
                                >×</button>
                              )}
                            </div>
                          ))}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.55rem' }}>
                            <button
                              onClick={() => setPickupSplitRows(prev => [...prev, { method: 'cod', amount: '' }])}
                              style={{ fontSize: '0.71rem', padding: '0.2rem 0.5rem', borderRadius: 6, background: '#f0f9ff', border: '1px dashed #60a5fa', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', color: '#2563eb' }}
                            >+ Add method</button>
                            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: pkpBalanced ? '#16a34a' : '#ef4444' }}>
                              ₹{pkpTotal} / ₹{finalTotal} {pkpBalanced ? '✅' : ''}
                            </span>
                          </div>
                          <button
                            disabled={!pkpBalanced}
                            onClick={() => {
                              const combined = pickupSplitRows
                                .filter(r => parseFloat(r.amount) > 0)
                                .map(r => `${PKP_PAY_NAMES[r.method] || r.method} ₹${r.amount}`)
                                .join(' + ');
                              setPickupPayMethod(combined);
                              setShowPickupSplit(false);
                            }}
                            style={{ ...btn('#2563eb'), width: '100%', fontSize: '0.78rem', opacity: pkpBalanced ? 1 : 0.5 }}
                          >✅ Apply Split Payment</button>
                        </div>
                      );
                    })()
                  ) : (
                    /* Single method buttons + Split toggle */
                    <div>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                        {[
                          { k: 'cod',     l: '💵 Cash'      },
                          { k: 'gpay',    l: '📱 GPay'       },
                          { k: 'phonepe', l: '📱 PhonePe'    },
                          { k: 'card',    l: '💳 Card'       },
                          { k: 'upi',     l: '📲 UPI'        },
                        ].map(p => (
                          <button
                            key={p.k}
                            onClick={() => setPickupPayMethod(p.k)}
                            style={{
                              padding: '0.35rem 0.75rem', borderRadius: 8,
                              border: `2px solid ${pickupPayMethod === p.k ? '#16a34a' : '#e5e7eb'}`,
                              background: pickupPayMethod === p.k ? '#f0fdf4' : 'white',
                              color: pickupPayMethod === p.k ? '#16a34a' : '#666',
                              fontWeight: 700, cursor: 'pointer', fontSize: '0.78rem',
                              fontFamily: 'Poppins,sans-serif',
                            }}
                          >{p.l}</button>
                        ))}
                      </div>
                      <button
                        onClick={() => { setShowPickupSplit(true); setPickupSplitRows([{ method: 'cod', amount: '' }, { method: 'upi', amount: '' }]); }}
                        style={{ fontSize: '0.75rem', padding: '0.28rem 0.75rem', borderRadius: 8, background: '#eff6ff', border: '1.5px solid #bfdbfe', cursor: 'pointer', color: '#2563eb', fontWeight: 700, fontFamily: 'Poppins,sans-serif' }}
                      >✂️ Split Payment</button>
                    </div>
                  )}
                </div>

                {/* Final total */}
                <div style={{ background: '#f5f0e8', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1A0800' }}>Final Amount</span>
                  <span style={{ fontWeight: 900, fontSize: '1.2rem', color: '#E65C00' }}>₹{finalTotal}</span>
                </div>

                {/* Messages */}
                {pickupPayMsg && (
                  <div style={{ marginBottom: '0.75rem', fontSize: '0.82rem', fontWeight: 600, color: pickupPayMsg.includes('✅') ? '#16a34a' : '#dc2626', background: pickupPayMsg.includes('✅') ? '#f0fdf4' : '#fef2f2', borderRadius: 8, padding: '0.5rem 0.75rem' }}>
                    {pickupPayMsg}
                  </div>
                )}

                {/* Confirm button */}
                <button
                  onClick={() => void doCompletePickup()}
                  disabled={pickupPayBusy}
                  style={{ ...btn('#16a34a'), width: '100%', padding: '0.85rem', fontSize: '0.95rem', borderRadius: 12, opacity: pickupPayBusy ? 0.7 : 1 }}
                >
                  {pickupPayBusy ? '⏳ Processing…' : `✅ Confirm ₹${finalTotal} Payment`}
                </button>
                <button
                  onClick={() => { if (!pickupPayBusy) { setPickupPayOrder(null); setShowPickupSplit(false); setPickupSplitRows([{ method: 'cod', amount: '' }, { method: 'upi', amount: '' }]); } }}
                  disabled={pickupPayBusy}
                  style={{ width: '100%', marginTop: '0.5rem', padding: '0.6rem', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontSize: '0.85rem', fontWeight: 600 }}
                >✗ Cancel</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Pre-close Email Modal ─────────────────────────────────────────────── */}
      {/* Shown when manager clicks "Collect & Close Tab" — intercepts to offer   */}
      {/* sending a receipt email BEFORE the tab is actually closed.              */}
      {showPreCloseModal && selTab && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={e => { if (e.target === e.currentTarget && !preCloseSending) setShowPreCloseModal(false); }}
        >
          <div style={{ background: 'white', borderRadius: 20, padding: '1.5rem', width: '100%', maxWidth: 'min(95vw,400px)', boxShadow: '0 20px 60px rgba(0,0,0,0.35)', fontFamily: 'Poppins,sans-serif' }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '2.25rem', marginBottom: '0.35rem' }}>📧</div>
              <div style={{ fontWeight: 900, fontSize: '1.1rem', color: '#1A0800' }}>Send Receipt?</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                Optionally email a receipt before closing the tab.
              </div>
            </div>

            {/* Email input — pre-filled from tab if available */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#555', display: 'block', marginBottom: '0.3rem' }}>
                Customer Email <span style={{ fontWeight: 400, color: '#aaa' }}>(optional)</span>
              </label>
              <input
                type="email"
                placeholder="customer@email.com"
                value={preCloseEmail}
                onChange={e => setPreCloseEmail(e.target.value)}
                disabled={preCloseSending}
                style={{ width: '100%', boxSizing: 'border-box', padding: '0.65rem 0.85rem', border: '2px solid #e5e7eb', borderRadius: 10, fontFamily: 'Poppins,sans-serif', fontSize: '0.9rem', outline: 'none' }}
              />
            </div>

            {preCloseMsg && (
              <div style={{ marginBottom: '0.75rem', fontSize: '0.78rem', fontWeight: 600, color: preCloseMsg.includes('✅') ? '#16a34a' : '#dc2626', background: preCloseMsg.includes('✅') ? '#f0fdf4' : '#fef2f2', borderRadius: 8, padding: '0.5rem 0.75rem' }}>
                {preCloseMsg}
              </div>
            )}

            {/* Action buttons */}
            <button
              onClick={() => void doCloseTab(preCloseEmail.trim() || null)}
              disabled={preCloseSending}
              style={{ width: '100%', padding: '0.8rem', borderRadius: 12, background: preCloseEmail.includes('@') ? '#16a34a' : '#64748b', color: 'white', border: 'none', fontWeight: 800, fontSize: '0.92rem', cursor: preCloseSending ? 'not-allowed' : 'pointer', fontFamily: 'Poppins,sans-serif', marginBottom: '0.6rem', opacity: preCloseSending ? 0.7 : 1 }}
            >
              {preCloseSending
                ? '⏳ Processing…'
                : preCloseEmail.includes('@')
                  ? '📤 Send Receipt & Close Tab'
                  : '✅ Close Tab'}
            </button>

            <button
              onClick={() => { if (!preCloseSending) setShowPreCloseModal(false); }}
              disabled={preCloseSending}
              style={{ width: '100%', padding: '0.65rem', borderRadius: 12, background: 'none', color: '#64748b', border: '2px solid #e5e7eb', fontWeight: 700, fontSize: '0.85rem', cursor: preCloseSending ? 'not-allowed' : 'pointer', fontFamily: 'Poppins,sans-serif' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      </> /* end managerSection === 'billing' */}

      {/* ══════════════════ MENU ITEM MODAL ══════════════════ */}
      {menuModal.open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setMenuModal({ open: false, item: emptyItem(), isEdit: false })}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 'min(95vw,510px)', maxHeight: '92dvh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ background: 'linear-gradient(135deg,#1A0800,#E65C00)', color: 'white', padding: '1.1rem 1.6rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '16px 16px 0 0', position: 'sticky', top: 0, zIndex: 2 }}>
              <span style={{ fontFamily: "'Playfair Display',serif", fontWeight: 900, fontSize: '1.05rem' }}>{menuModal.isEdit ? '✏️ Edit Menu Item' : '➕ Add New Item'}</span>
              <button onClick={() => setMenuModal({ open: false, item: emptyItem(), isEdit: false })} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: '1.4rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '0.85rem' }}>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#555', display: 'block', marginBottom: '0.28rem' }}>Category *</label>
                  <select value={menuModal.item.category || CATEGORIES[0]} onChange={e => setMenuModal(m => ({ ...m, item: { ...m.item, category: e.target.value } }))} style={{ ...inp }}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#555', display: 'block', marginBottom: '0.28rem' }}>Badge</label>
                  <select value={menuModal.item.badge || ''} onChange={e => setMenuModal(m => ({ ...m, item: { ...m.item, badge: e.target.value } }))} style={{ ...inp }}>
                    <option value="">— None —</option>
                    {Object.entries(BADGE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: '0.85rem' }}>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#555', display: 'block', marginBottom: '0.28rem' }}>Item Name *</label>
                <input value={menuModal.item.name || ''} onChange={e => setMenuModal(m => ({ ...m, item: { ...m.item, name: e.target.value } }))} placeholder="e.g. Hyderabadi Chicken Biryani" style={{ ...inp }} />
              </div>
              <div style={{ marginBottom: '0.85rem' }}>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#555', display: 'block', marginBottom: '0.28rem' }}>Description</label>
                <textarea value={menuModal.item.desc || ''} onChange={e => setMenuModal(m => ({ ...m, item: { ...m.item, desc: e.target.value } }))} placeholder="Short appetizing description…" rows={2} style={{ ...inp, resize: 'vertical' as const }} />
              </div>
              <div style={{ marginBottom: '0.85rem' }}>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#555', display: 'block', marginBottom: '0.28rem' }}>Pricing Variants * <span style={{ fontWeight: 400, color: '#999' }}>(e.g. Half / Full / 1 Piece)</span></label>
                {modalVariants.map((v, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.4rem', alignItems: 'center' }}>
                    <input value={v.name} onChange={e => updateVariantRow(i, 'name', e.target.value)} placeholder="Name (e.g. Half)" style={{ ...inp, flex: 2, padding: '0.45rem 0.6rem' }} />
                    <div style={{ position: 'relative', flex: 1 }}>
                      <span style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: '#888', fontSize: '0.82rem' }}>₹</span>
                      <input type="number" value={v.price} onChange={e => updateVariantRow(i, 'price', e.target.value)} placeholder="0" min="1" style={{ ...inp, paddingLeft: '1.4rem', padding: '0.45rem 0.4rem 0.45rem 1.4rem' }} />
                    </div>
                    {modalVariants.length > 1 && <button onClick={() => removeVariantRow(i)} style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#ef4444', borderRadius: 6, cursor: 'pointer', padding: '0.35rem 0.5rem', fontSize: '0.85rem', flexShrink: 0 }}>🗑</button>}
                  </div>
                ))}
                <button onClick={addVariantRow} style={{ width: '100%', background: '#f0fdf4', border: '1px dashed #16a34a', color: '#16a34a', borderRadius: 8, cursor: 'pointer', padding: '0.4rem', fontSize: '0.8rem', fontWeight: 700, fontFamily: 'Poppins,sans-serif', marginTop: '0.2rem' }}>＋ Add Variant</button>
              </div>
              <div style={{ marginBottom: '1.1rem' }}>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#555', display: 'block', marginBottom: '0.28rem' }}>Image <span style={{ fontWeight: 400, color: '#999' }}>(paste URL or upload)</span></label>
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <input value={menuModal.item.img || ''} onChange={e => setMenuModal(m => ({ ...m, item: { ...m.item, img: e.target.value } }))} placeholder="https://images.unsplash.com/…" style={{ ...inp, flex: 1 }} />
                  <label style={{ ...btn('#8b5cf6'), cursor: 'pointer' as const, whiteSpace: 'nowrap' as const, flexShrink: 0, fontSize: '0.78rem', opacity: imgUploading ? 0.6 : 1, display: 'inline-flex', alignItems: 'center' as const }}>
                    {imgUploading ? '⏳' : '📤 Upload'}
                    <input type="file" accept="image/*" style={{ display: 'none' }} disabled={imgUploading} onChange={e => { const f = e.target.files?.[0]; if (f) { void uploadMenuImage(f); e.target.value = ''; } }} />
                  </label>
                </div>
                {menuModal.item.img && (
                  <div style={{ width: '100%', height: '130px', borderRadius: 8, overflow: 'hidden', background: '#f5f0e8' }}>
                    <img src={menuModal.item.img} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.65rem' }}>
                <button onClick={() => setMenuModal({ open: false, item: emptyItem(), isEdit: false })} style={{ ...btn('#e5e7eb', '#555'), flex: 1 }}>Cancel</button>
                <button onClick={saveItem} style={{ ...btn(), flex: 2 }}>{menuModal.isEdit ? '💾 Save Changes' : '✅ Add to Menu'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
