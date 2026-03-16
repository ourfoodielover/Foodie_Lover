'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, clearSession, AuthSession } from '@/lib/auth';
import {
  getTabs, getTabOrders, getOrders, closeTab, applyTabDiscount, getPin,
  getOrdersInPeriod, getEndOfDayReport,
  createSplitBill, markSplitEntryPaid, isSplitFullyPaid, getSplitBillForTab,
  getExpenseStats,
  CustomerTab, Order, SplitBill,
} from '@/lib/storage';

const PAY_LABELS: Record<string, string> = {
  cod: 'Cash', gpay: 'Google Pay', phonepe: 'PhonePe',
  paytm: 'Paytm', card: 'Card', upi: 'UPI',
};
const STATUS_COLOR: Record<string, string> = {
  awaiting_waiter: '#f59e0b', pending: '#f59e0b', preparing: '#3b82f6',
  prepared: '#8b5cf6', served: '#06b6d4', completed: '#16a34a',
  cancelled: '#ef4444', void: '#9ca3af',
};
const STATUS_LABEL: Record<string, string> = {
  awaiting_waiter: 'Awaiting Waiter', pending: 'In Kitchen', preparing: 'Preparing',
  prepared: 'Ready', served: 'Served', completed: 'Completed',
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
  const [showDiscForm, setShowDiscForm]       = useState(false);
  const [tabBillMsg, setTabBillMsg]           = useState('');
  const [tabCloseConfirm, setTabCloseConfirm] = useState(false);

  // Split billing
  const [splitBill, setSplitBill]             = useState<SplitBill | null>(null);
  const [showSplitModal, setShowSplitModal]   = useState(false);
  const [splitCount, setSplitCount]           = useState('2');
  const [splitPayEntry, setSplitPayEntry]     = useState<string | null>(null);
  const [splitPayMethod, setSplitPayMethod]   = useState('cod');

  // End-of-day report
  const [showEOD, setShowEOD]                 = useState(false);

  // Expenses
  const [todayExpenses, setTodayExpenses]     = useState(0);

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const s = getSession('manager');
    if (!s) { router.replace('/manager/login'); return; }
    setSession(s);
    setAuthChecked(true);
  }, [router]);

  // ── Data refresh ──────────────────────────────────────────────────────────
  const refresh = useCallback(() => {
    const allTabs = getTabs();
    const allOrders = getOrders();
    setTabs(allTabs);
    setOrders(allOrders);
    setSelTab(prev => {
      if (!prev) return null;
      return allTabs.find(t => t.id === prev.id) ?? null;
    });
    setTodayExpenses(getExpenseStats().todayTotal);
  }, []);

  useEffect(() => {
    if (!authChecked) return;
    refresh();
    const t1 = setInterval(refresh, 3000);
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
  function applyDiscount() {
    if (!selTab) return;
    const amt = parseInt(tabDiscAmt);
    if (!amt || amt <= 0) { setPinMsg('❌ Enter a valid amount'); return; }
    if (amt > selTab.totalAmount) { setPinMsg(`❌ Discount cannot exceed ₹${selTab.totalAmount}`); return; }
    if (pinInput !== getPin()) { setPinMsg('❌ Wrong admin PIN'); return; }
    applyTabDiscount(selTab.id, amt, tabDiscNote || 'Manager discount', session?.name || 'Manager');
    setTabDiscAmt(''); setTabDiscNote(''); setPinInput(''); setPinMsg('');
    setShowDiscForm(false);
    refresh();
  }

  // ── Close tab action ──────────────────────────────────────────────────────
  function handleCloseTab() {
    if (!selTab) return;
    if (!tabCloseConfirm) {
      const inProgress = getTabOrders(selTab.id).filter(o =>
        ['awaiting_waiter', 'pending', 'preparing', 'prepared'].includes(o.status),
      );
      if (inProgress.length > 0) {
        setTabCloseConfirm(true);
        return;
      }
    }
    setTabCloseConfirm(false);
    const discount = selTab.discount || 0;
    const ok = closeTab(selTab.id, tabPayMethod, discount, selTab.discountReason, session?.name || 'Manager');
    if (ok) {
      setTabBillMsg('✅ Payment collected! Tab closed.');
      setTimeout(() => {
        setTabBillMsg('');
        setSelTab(null);
        setTabCloseConfirm(false);
        setSplitBill(null);
        setShowSplitModal(false);
      }, 1800);
      refresh();
    }
  }

  // ── Split bill actions ────────────────────────────────────────────────────
  function handleCreateSplit() {
    if (!selTab) return;
    const count = Math.max(2, Math.min(10, parseInt(splitCount) || 2));
    const total = Math.max(0, (selTab.totalAmount || 0) - (selTab.discount || 0));
    const split = createSplitBill(selTab.id, 'equal', count, total);
    setSplitBill(split);
    setShowSplitModal(false);
  }

  function handleMarkSplitPaid(personLabel: string) {
    if (!selTab) return;
    markSplitEntryPaid(selTab.id, personLabel, splitPayMethod);
    // Reload split
    const updated = getSplitBillForTab(selTab.id);
    setSplitBill(updated);
    setSplitPayEntry(null);
  }

  function loadSplitForTab(tabId: string) {
    const existing = getSplitBillForTab(tabId);
    setSplitBill(existing);
  }

  // ── Derived data ──────────────────────────────────────────────────────────
  const awaitingTabs = tabs.filter(t => t.tabStatus === 'awaiting_payment');
  const openTabs     = tabs.filter(t => t.tabStatus === 'open');
  const closedTabs   = tabs.filter(t => t.tabStatus === 'closed' &&
    t.closedAt && new Date(t.closedAt).toDateString() === new Date().toDateString(),
  );
  const todayRevenue  = getOrdersInPeriod('today').reduce((s, o) => s + (o.total || 0), 0);
  const todayNetProfit = todayRevenue - todayExpenses;

  const shown =
    tabFilter === 'awaiting' ? awaitingTabs :
    tabFilter === 'open'     ? openTabs     :
                               closedTabs;

  const tabOrders    = selTab ? getTabOrders(selTab.id) : [];
  const tabBillTotal = selTab ? Math.max(0, (selTab.totalAmount || 0) - (selTab.discount || 0)) : 0;

  const inProgressOrders = selTab
    ? tabOrders.filter(o => ['awaiting_waiter', 'pending', 'preparing', 'prepared'].includes(o.status))
    : [];

  // EOD report
  const eodReport = getEndOfDayReport();

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
      <div style={{ background: '#065f46', color: 'white', padding: '0.6rem 1.5rem', display: 'flex', gap: '2rem', overflowX: 'auto' }}>
        {[
          { icon: '💰', val: `₹${todayRevenue}`,                       label: 'Revenue Today',   color: '#6ee7b7' },
          { icon: '💸', val: `₹${todayExpenses}`,                      label: 'Expenses Today',  color: '#fca5a5' },
          { icon: todayNetProfit >= 0 ? '📈' : '📉',
            val: `${todayNetProfit >= 0 ? '+' : ''}₹${todayNetProfit}`, label: 'Net Profit Today',color: todayNetProfit >= 0 ? '#6ee7b7' : '#fca5a5' },
          { icon: '🧾', val: awaitingTabs.length,                       label: 'Awaiting Payment',color: '#fde68a' },
          { icon: '🟢', val: openTabs.length,                           label: 'Open Tabs',       color: '#6ee7b7' },
          { icon: '✅', val: closedTabs.length,                         label: 'Closed Today',    color: '#a7f3d0' },
        ].map(s => (
          <div key={s.label} style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 900, color: s.color }}>{s.icon} {s.val}</div>
            <div style={{ fontSize: '0.62rem', color: '#a7f3d0' }}>{s.label}</div>
          </div>
        ))}
      </div>

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
          const tabOrdrs = getTabOrders(tab.id);
          const activeOrdrs = tabOrdrs.filter(o => !['cancelled', 'void', 'completed'].includes(o.status));
          const billAmt = Math.max(0, (tab.totalAmount || 0) - (tab.discount || 0));
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
                borderLeft: `4px solid ${tab.tabStatus === 'awaiting_payment' ? '#f59e0b' : tab.tabStatus === 'open' ? '#16a34a' : '#9ca3af'}`,
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
                    background: tab.tabStatus === 'awaiting_payment' ? '#fef9c3' : tab.tabStatus === 'open' ? '#dcfce7' : '#f3f4f6',
                    color: tab.tabStatus === 'awaiting_payment' ? '#854d0e' : tab.tabStatus === 'open' ? '#166534' : '#6b7280',
                  }}>
                    {tab.tabStatus === 'awaiting_payment' ? '💳 Bill Requested' : tab.tabStatus === 'open' ? '🟢 Open' : '✅ Closed'}
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
                  {selTab.tabStatus === 'awaiting_payment' ? '💳 Bill Requested' : selTab.tabStatus === 'open' ? '🟢 Open Tab' : '✅ Closed'}
                </div>
              </div>
              <button onClick={() => { setSelTab(null); setTabCloseConfirm(false); setSplitBill(null); setShowSplitModal(false); }} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem' }}>

              {/* Orders list */}
              {tabOrders.filter(o => !['cancelled', 'void'].includes(o.status)).map(order => (
                <div key={order.id} style={{ marginBottom: '0.75rem', background: '#fafafa', borderRadius: 10, overflow: 'hidden', border: `1px solid ${STATUS_COLOR[order.status] || '#e5e7eb'}30` }}>
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
                  <span style={{ fontWeight: 600 }}>₹{selTab.totalAmount}</span>
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
              {selTab.tabStatus !== 'closed' && (
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
                                {entry.paid ? '✅' : '⬜'} {entry.personLabel}
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
                                  onClick={() => setSplitPayEntry(entry.personLabel)}
                                  style={{ ...btn('#16a34a'), fontSize: '0.72rem', padding: '0.3rem 0.6rem' }}
                                >
                                  Mark Paid
                                </button>
                              )}
                            </div>
                          </div>
                          {/* Pay method selection for this entry */}
                          {splitPayEntry === entry.personLabel && (
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
                                <button onClick={() => handleMarkSplitPaid(entry.personLabel)} style={{ ...btn('#16a34a'), flex: 2, fontSize: '0.72rem' }}>
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
                      {isSplitFullyPaid(selTab.id) && (
                        <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: 8, padding: '0.5rem', textAlign: 'center', fontWeight: 700, color: '#16a34a', fontSize: '0.82rem', marginTop: '0.25rem' }}>
                          🎉 All portions paid! You can now close the tab.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Payment method */}
              {selTab.tabStatus !== 'closed' && (
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
              {selTab.tabStatus !== 'closed' && (
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
              {selTab.tabStatus !== 'closed' && !tabBillMsg && (
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

              {selTab.tabStatus === 'closed' && (
                <div style={{ background: '#f0fdf4', color: '#16a34a', borderRadius: 10, padding: '0.85rem', textAlign: 'center', fontWeight: 800, fontSize: '1rem' }}>
                  ✅ Tab Closed · Paid via {PAY_LABELS[selTab.paymentMethod] || selTab.paymentMethod}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
