'use client';

export const dynamic = 'force-dynamic';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, clearSession, AuthSession } from '@/lib/auth';
import {
  getTabs, getOrders, closeTab, applyTabDiscount,
  updateOrderStatus,
  CustomerTab, Order,
  sendEmailReceipt,
  getSettings,
  getSplitBillForTabApi, createSplitBillApi, markSplitEntryPaidApi, SplitBillData,
  getActiveIssues, escalateIssue, resolveIssue, OrderIssue,
} from '@/lib/api';
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
  // Admin discount PIN loaded from Supabase — replaces getPin() localStorage call
  const [adminDiscountPin, setAdminDiscountPin] = useState('1234');
  const [showDiscForm, setShowDiscForm]       = useState(false);
  const [tabBillMsg, setTabBillMsg]           = useState('');
  const [tabCloseConfirm, setTabCloseConfirm] = useState(false);

  // Email receipt
  const [receiptEmail, setReceiptEmail] = useState('');
  const [receiptMsg,   setReceiptMsg]   = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  // Split billing
  const [splitBill, setSplitBill]             = useState<SplitBillData | null>(null);
  const [showSplitModal, setShowSplitModal]   = useState(false);
  const [splitCount, setSplitCount]           = useState('2');
  const [splitPayEntry, setSplitPayEntry]     = useState<string | null>(null);
  const [splitPayMethod, setSplitPayMethod]   = useState('cod');

  // End-of-day report
  const [showEOD, setShowEOD]                 = useState(false);

  // Expenses
  const [todayExpenses, setTodayExpenses]     = useState(0);

  // Issues
  const [escalatedIssues, setEscalatedIssues] = useState<OrderIssue[]>([]);

  // Errors
  const [fetchError, setFetchError]           = useState('');

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const s = getSession('manager');
    if (!s) { router.replace('/manager/login'); return; }
    setSession(s);
    setAuthChecked(true);
  }, [router]);

  // ── Data refresh ──────────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    try {
      setFetchError('');
      // Fetch ALL of today's orders (active + completed + cancelled) so the
      // EOD report has access to completed-order revenue and void counts.
      // Bounded by midnight-today to avoid loading unbounded history.
      const todayMidnight = new Date();
      todayMidnight.setHours(0, 0, 0, 0);
      const [allTabs, allOrders, settings, issues] = await Promise.all([
        getTabs(),
        getOrders({ since: todayMidnight.toISOString(), limit: 200 }),
        getSettings(),
        getActiveIssues(),
      ]);
      setTabs(allTabs);
      setOrders(allOrders);
      setAdminDiscountPin(settings.admin_pin ?? '1234');
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
    const t2 = setInterval(() => {
      const n = new Date();
      setClock({
        date: n.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        time: n.toLocaleTimeString(),
      });
    }, 1000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, [refresh, authChecked]);

  function logout() { clearSession('manager'); router.replace('/manager/login'); }

  // ── Discount action ───────────────────────────────────────────────────────
  async function applyDiscount() {
    if (!selTab) return;
    const amt = parseInt(tabDiscAmt, 10);
    if (isNaN(amt) || amt <= 0) { setPinMsg('❌ Enter a valid amount'); return; }
    if (amt > selTab.total) { setPinMsg(`❌ Discount cannot exceed ₹${selTab.total}`); return; }
    if (pinInput !== adminDiscountPin) { setPinMsg('❌ Wrong admin PIN'); return; }
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
    try {
      await closeTab(selTab.id, tabPayMethod, selTab.discount || 0, selTab.discountReason);
      setTabBillMsg('✅ Payment collected! Tab closed.');
      await refresh();
      setTimeout(() => {
        setTabBillMsg('');
        setSelTab(null);
        setTabCloseConfirm(false);
        setSplitBill(null);
        setShowSplitModal(false);
      }, 1800);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[manager] closeTab failed:', err);
      setTabBillMsg(`❌ Could not close tab: ${msg}. Please try again.`);
      setTimeout(() => setTabBillMsg(''), 5000);
    }
  }

  // ── Complete a pickup order at the counter ────────────────────────────────
  // Pickup orders land at 'served' when kitchen is done and waiter notifies the
  // customer. The counter/manager collects payment here and marks it 'completed',
  // which fires the PaymentCompleted event — lighting up the final tracker step.
  async function completePickupOrder(orderId: string) {
    try {
      await updateOrderStatus(orderId, 'completed', session?.name || 'Counter');
      await refresh();
    } catch (e) { console.error('[completePickupOrder]', e); }
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
  const closedTabs   = tabs.filter(t => t.status === 'closed' &&
    !!t.closedAt && new Date(t.closedAt).toDateString() === new Date().toDateString(),
  );
  // todayRevenue from orders state (already fetched from API)
  const todayRevenue  = orders
    .filter(o => { try { const d = new Date(o.timestamp); return d.toDateString() === new Date().toDateString(); } catch { return false; } })
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
  const todayStr2 = new Date().toDateString();
  const todayOrds = orders.filter(o => new Date(o.timestamp).toDateString() === todayStr2);
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
    date:           new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    totalOrders:    completedOrds.length,
    totalRevenue:   Math.round(todayOrds.filter(o => !['cancelled', 'void'].includes(o.status)).reduce((s, o) => s + (o.total || 0), 0)),
    avgOrderValue:  avgVal,
    completedTabs:  tabs.filter(t => t.status === 'closed' && new Date(t.createdAt).toDateString() === todayStr2).length,
    discountsTotal: Math.round(todayOrds.reduce((s, o) => s + (o.discount || 0), 0)),
    voidedOrders:   todayOrds.filter(o => o.status === 'void').length,
    topItems: Array.from(itemQtyMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, qty]) => ({ name, qty })),
  };

  // ── Pickup & Delivery visibility ──────────────────────────────────────────
  const isToday = (ts: string) => {
    try { return new Date(ts).toDateString() === new Date().toDateString(); }
    catch { return false; }
  };
  const activePickup    = orders.filter(o => o.type === 'pickup'   && !['cancelled','void','completed'].includes(o.status));
  const activeDelivery  = orders.filter(o => o.type === 'delivery' && !['cancelled','void','completed'].includes(o.status));
  const todayPickup     = orders.filter(o => o.type === 'pickup'   && isToday(o.timestamp));
  const todayDelivery   = orders.filter(o => o.type === 'delivery' && isToday(o.timestamp));
  const revenuePickup   = todayPickup.filter(o => o.status === 'completed').reduce((s, o) => s + (o.total || 0), 0);
  const revenueDelivery = todayDelivery.filter(o => o.status === 'completed').reduce((s, o) => s + (o.total || 0), 0);
  const hasNonDineIn    = activePickup.length > 0 || activeDelivery.length > 0 || todayPickup.length > 0 || todayDelivery.length > 0;

  // ── Styles ────────────────────────────────────────────────────────────────
  const btn = (bg = '#E65C00', c = 'white'): React.CSSProperties => ({
    background: bg, color: c, border: 'none', borderRadius: 8,
    fontWeight: 700, cursor: 'pointer', fontFamily: 'Poppins,sans-serif',
    padding: '0.5rem 1rem', fontSize: '0.82rem',
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
      <div style={{ background: 'linear-gradient(135deg,#064e3b,#065f46)', color: 'white', padding: '0.9rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.5rem' }}>💳</span>
          <div>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.2rem', fontWeight: 900 }}>Manager — Counter</div>
            <div style={{ fontSize: '0.7rem', color: '#6ee7b7' }}>Billing & Payment Portal</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {awaitingTabs.length > 0 && (
            <div style={{ background: '#f59e0b', color: 'white', padding: '0.25rem 0.75rem', borderRadius: 20, fontSize: '0.75rem', fontWeight: 800 }}>
              💰 {awaitingTabs.length} Awaiting Payment
            </div>
          )}
          <button onClick={() => router.push('/manager/tables')} style={{ ...btn('#065f46', '#6ee7b7'), border: '1px solid #6ee7b7', fontSize: '0.72rem' }}>
            🪑 Table Map
          </button>
          <button onClick={() => router.push('/manager/expenses')} style={{ ...btn('#065f46', '#6ee7b7'), border: '1px solid #6ee7b7', fontSize: '0.72rem' }}>
            💸 Expenses
          </button>
          <button onClick={() => setShowEOD(!showEOD)} style={{ ...btn('#065f46', '#6ee7b7'), border: '1px solid #6ee7b7', fontSize: '0.72rem' }}>
            📊 EOD Report
          </button>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700 }}>{clock.date}</div>
            <div style={{ fontSize: '0.7rem', color: '#6ee7b7' }}>{clock.time}</div>
          </div>
          <button onClick={logout} style={{ ...btn('#ef444430', '#ef4444'), border: '1px solid #ef444440', fontSize: '0.72rem' }}>
            🚪 Logout
          </button>
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
                      Reported by: {issue.reportedBy} · Attempt #{issue.retryCount} · {new Date(issue.reportedAt).toLocaleTimeString()}
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

      {/* ── Pickup & Delivery Panel ── */}
      {(hasNonDineIn || true) && (
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
                          onClick={() => completePickupOrder(o.id)}
                          style={{ background: '#16a34a', color: 'white', border: 'none', borderRadius: 6, padding: '0.2rem 0.5rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontSize: '0.68rem', whiteSpace: 'nowrap' }}
                        >
                          ✅ Collected & Paid
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
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1A0800' }}>Table {tab.tableId}</div>
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
          onClick={() => { setSelTab(null); setTabCloseConfirm(false); setSplitBill(null); setShowSplitModal(false); }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: 'white', width: '100%', maxWidth: '540px', maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', borderRadius: '16px 16px 0 0', boxShadow: '0 -20px 60px rgba(0,0,0,0.3)' }}
          >
            {/* Modal header */}
            <div style={{ background: 'linear-gradient(135deg,#064e3b,#16a34a)', color: 'white', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 900, fontSize: '1.05rem' }}>
                  🪑 Table {selTab.tableId} — {selTab.customerName}
                </div>
                <div style={{ fontSize: '0.73rem', opacity: 0.8 }}>
                  {selTab.partySize} guest{selTab.partySize !== 1 ? 's' : ''} ·{' '}
                  {selTab.status === 'awaiting_payment' ? '💳 Bill Requested' : selTab.status === 'open' ? '🟢 Open Tab' : '✅ Closed'}
                </div>
              </div>
              <button onClick={() => { setSelTab(null); setTabCloseConfirm(false); setSplitBill(null); setShowSplitModal(false); }} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
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
                  {!splitBill ? (
                    !showSplitModal ? (
                      <button
                        onClick={() => setShowSplitModal(true)}
                        style={{ ...btn('#f0fdf4', '#16a34a'), fontSize: '0.78rem', width: '100%', border: '1px solid #86efac' }}
                      >
                        ✂️ Split Bill
                      </button>
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
                  ) : (
                    /* Split bill UI */
                    <div style={{ background: '#f0fdf4', borderRadius: 10, border: '1px solid #86efac', padding: '1rem', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <div style={{ fontWeight: 700, color: '#064e3b', fontSize: '0.85rem' }}>✂️ Split Bill ({splitBill.entries.length} persons)</div>
                        <button onClick={() => setSplitBill(null)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '0.75rem' }}>Reset</button>
                      </div>
                      {splitBill.entries.map((entry, i) => (
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
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {[
                      { k: 'cod',     l: '💵 Cash'       },
                      { k: 'gpay',    l: '📱 Google Pay'  },
                      { k: 'phonepe', l: '📱 PhonePe'     },
                      { k: 'card',    l: '💳 Card'        },
                      { k: 'upi',     l: '📲 UPI'         },
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
                      >
                        {p.l}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Discount section */}
              {selTab.status !== 'closed' && (
                <div style={{ marginBottom: '1rem' }}>
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
                              setReceiptMsg('❌ Resend free tier only allows sending to ourfoodielover@gmail.com. To send to any address, verify a domain at resend.com/domains then update EMAIL_FROM in .env.local');
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
    </div>
  );
}
