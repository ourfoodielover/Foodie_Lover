'use client';

export const dynamic = 'force-dynamic';
import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  getOrders, updateOrderStatus, getTabs, getTables, closeShift,
  getActiveWaiterCalls, acknowledgeWaiterCallById, createOrderEvent,
  getActiveIssues, startReserving,
  CustomerTab, Order, Table, OrderIssue,
} from '@/lib/api';
import { useRealtime } from '@/lib/realtime-client';
import { getSession, clearSession, AuthSession } from '@/lib/auth';
import { formatTableName } from '@/lib/format';
import { fmtTime } from '@/lib/date';

const STATUS_FLOW: Record<string, string> = {
  awaiting_waiter: 'pending',
  prepared:        'served',
};
const STATUS_COLOR: Record<string, string> = {
  awaiting_waiter:  '#f59e0b', pending: '#f59e0b', preparing: '#3b82f6',
  prepared:         '#8b5cf6', served: '#06b6d4', completed: '#16a34a',
  re_serve_required:'#dc2626',  // urgent red — customer didn't receive food
  cancelled:        '#ef4444', void: '#9ca3af',
};
const STATUS_LABEL: Record<string, string> = {
  awaiting_waiter:  'Awaiting Waiter', pending: 'In Queue',
  preparing:        'Preparing',       prepared: 'Ready to Serve',
  served:           'Served',          completed: 'Completed',
  re_serve_required:'🚨 Re-Serve Required',  // visible in order cards
  cancelled:        'Cancelled',       void: 'Void',
};

// ── Web Audio alert (matches kitchen portal beep) ─────────────────────────────
function playOrderAlert() {
  try {
    const ctx  = new AudioContext();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    // Slightly different tone from kitchen so staff can tell portals apart
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.6);
  } catch { /* AudioContext unavailable (SSR / blocked by browser) */ }
}

function WaiterPageInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [session, setSession]         = useState<AuthSession | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [orders, setOrders]           = useState<Order[]>([]);
  const [tabs, setTabs]               = useState<CustomerTab[]>([]);
  const [tables, setTables]           = useState<Table[]>([]);
  const [disputes,    setDisputes]    = useState<{ id: string; tableId?: string; customerName?: string }[]>([]);
  const [waiterCalls, setWaiterCalls] = useState<{ id: string; tableId?: string; customerName?: string; at: string }[]>([]);
  // ── "Not received" re-serve issues ──────────────────────────────────────────
  // Orders in re_serve_required state — waiter must physically re-serve them
  const [reServeIssues, setReServeIssues] = useState<OrderIssue[]>([]);
  const [filter, setFilter]           = useState<'active' | 'served' | 'all'>('active');
  const [selOrder, setSelOrder]       = useState<Order | null>(null);
  const [actionMsg, setActionMsg]     = useState('');
  const [actionBusy, setActionBusy]   = useState(false);   // prevents double-click on Accept/Serve/Cancel
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelFor, setShowCancelFor] = useState<string | null>(null);
  const [fetchError, setFetchError]     = useState('');
  const [flashIds, setFlashIds]         = useState<Set<string>>(new Set());
  // "Party seated" banners — disappear after 8 s automatically
  const [seatedBanners, setSeatedBanners] = useState<
    { id: string; tableId?: string | null; customerName: string; partySize: number }[]
  >([]);
  // Shift ID stored in React state instead of localStorage
  const [currentShiftId, setCurrentShiftId] = useState<string | null>(null);

  // Track order IDs we've already alerted about so we don't re-alert on re-renders
  const seenOrderIds = useRef<Set<string>>(new Set());

  // ── Auth + shift ID hydration ─────────────────────────────────────────────
  useEffect(() => {
    const s = getSession('waiter');
    if (!s) { router.replace('/waiter/login'); return; }
    setSession(s);
    setAuthChecked(true);
    // Read shift ID from URL param (set by waiter/login after openShift).
    // Falls back to any legacy localStorage value so existing sessions survive.
    const urlShiftId = searchParams.get('shiftId');
    if (urlShiftId) {
      setCurrentShiftId(urlShiftId);
    } else if (typeof window !== 'undefined') {
      // One-time migration shim: consume any value left from an older login.
      const stored = localStorage.getItem('fl_current_shift_id');
      if (stored) {
        setCurrentShiftId(stored);
        localStorage.removeItem('fl_current_shift_id');
      }
    }
  }, [router, searchParams]);

  // ── Data refresh ──────────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    try {
      setFetchError('');
      const [allOrders, allTabs, allTables, callsData, issues] = await Promise.all([
        // ── Performance: activeOnly skips completed/cancelled/void orders ──────
        // This reduces the payload by excluding historical terminal-state orders.
        // The "all" filter tab in the UI will show fewer historical records but
        // the waiter portal is never used to browse historical orders anyway.
        getOrders({ activeOnly: true, limit: 100 }),
        getTabs(),
        getTables(),
        // Load active waiter calls from Supabase (last 2 hrs)
        getActiveWaiterCalls().catch(() => []),
        // Load active "not received" issues needing re-service
        getActiveIssues().catch(() => [] as OrderIssue[]),
      ]);
      setOrders(allOrders);
      setTabs(allTabs);
      setTables(allTables);
      // Normalize null → undefined so the state type matches
      setWaiterCalls(callsData.map(c => ({
        id:           c.id,
        tableId:      c.tableId      ?? undefined,
        customerName: c.customerName ?? undefined,
        at:           c.at,
      })));

      // ── Active re-serve issues (order_issues table, status open/escalated) ──
      // 'reserving' is intentionally excluded: the waiter already clicked Re-Serve
      // and is physically bringing the food. Nothing more to do until the customer
      // confirms receipt or re-disputes — at that point the status changes and the
      // banner either disappears (resolved) or re-appears (open again after retry).
      setReServeIssues(issues.filter(i => i.status !== 'reserving'));

      // ── Derive legacy food disputes from order timeline events ────────────
      // (kept for backward compat — new flow uses order_issues table)
      const activeDisputes = allOrders
        .filter(o =>
          o.timeline?.some(e => e.eventType === 'FoodDisputed') &&
          !o.timeline?.some(e => e.eventType === 'DisputeResolved'),
        )
        .map(o => ({ id: o.id, tableId: o.tableId, customerName: o.customerName }));
      setDisputes(activeDisputes);
      setSelOrder(prev => {
        if (!prev) return null;
        return allOrders.find(o => o.id === prev.id) ?? null;
      });

      // ── Detect new awaiting_waiter orders → sound + flash ─────────────────
      // Only orders that need the waiter's attention trigger an alert.
      // On the very first load we populate seenOrderIds silently (size === 0
      // before this call, so the guard `size > newIds.length` prevents the
      // alert from firing immediately on page-open).
      const incomingOrders = allOrders.filter(o => o.status === 'awaiting_waiter');
      const newIds: string[] = [];
      for (const o of incomingOrders) {
        if (!seenOrderIds.current.has(o.id)) {
          seenOrderIds.current.add(o.id);
          newIds.push(o.id);
        }
      }
      // seenOrderIds.current.size > newIds.length means we already had orders
      // in the set before this batch, so this isn't just the first-load seed.
      if (newIds.length > 0 && seenOrderIds.current.size > newIds.length) {
        playOrderAlert();
        setFlashIds(prev => {
          const next = new Set(prev);
          newIds.forEach(id => next.add(id));
          return next;
        });
        setTimeout(() => {
          setFlashIds(prev => {
            const next = new Set(prev);
            newIds.forEach(id => next.delete(id));
            return next;
          });
        }, 2500);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load data';
      setFetchError(msg);
      console.error('[waiter] refresh error:', e);
    }
  }, []);

  // Realtime: refresh on any order or payment event.
  // table_session_started — fired by POST /api/tabs when a party sits down.
  //   Shows a "🪑 Party seated" banner even BEFORE an order is placed.
  // order_served / payment_completed — keep board in sync across devices.
  useRealtime(
    process.env.NEXT_PUBLIC_RESTAURANT_ID ?? 'rest_default',
    {
      order_created:          () => { void refresh(); },
      order_ready:            () => { void refresh(); },
      order_served:           () => { void refresh(); },
      order_status_changed:   () => { void refresh(); },
      payment_completed:      () => { void refresh(); },
      // ── "Not received" alerts — play urgent beep + refresh immediately ───────
      order_issue_reported:   () => { playOrderAlert(); void refresh(); },
      order_issue_escalated:  () => { playOrderAlert(); void refresh(); },
      // ── Waiter call: new call arrives — refresh to show banner ───────────────
      waiter_called:          () => { void refresh(); },
      // ── Waiter call acknowledged on another device — dismiss from this device ─
      waiter_call_acknowledged: (payload) => {
        const p = payload as { callId?: string };
        if (p.callId) {
          setWaiterCalls(prev => prev.filter(c => c.id !== p.callId));
        }
      },
      // ── New: party seated notification ──────────────────────────────────────
      table_session_started: (payload) => {
        const p = payload as { tabId?: string; tableId?: string | null; customerName?: string; partySize?: number };
        const banner = {
          id:           p.tabId ?? Math.random().toString(36).slice(2),
          tableId:      p.tableId ?? null,
          customerName: p.customerName ?? 'Guest',
          partySize:    p.partySize ?? 1,
        };
        setSeatedBanners(prev => [banner, ...prev.slice(0, 4)]); // keep max 5
        playOrderAlert(); // same gentle beep — party has arrived
        // Auto-dismiss after 8 seconds
        setTimeout(() => {
          setSeatedBanners(prev => prev.filter(b => b.id !== banner.id));
        }, 8000);
        void refresh(); // also refresh tabs list so table shows occupied
      },
    },
  );

  useEffect(() => {
    if (!authChecked) return;
    refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [refresh, authChecked]);

  async function logout() {
    try {
      // ── Shift close: use React state (not localStorage) ────────────────────
      // currentShiftId was hydrated from localStorage once at startup then
      // stored in component state — no more direct localStorage.getItem calls.
      if (currentShiftId) {
        const served  = orders.filter(o => ['served', 'completed'].includes(o.status)).length;
        const revenue = orders
          .filter(o => ['served', 'completed'].includes(o.status))
          .reduce((s, o) => s + (o.total || 0), 0);
        await closeShift(currentShiftId, served, revenue);
        setCurrentShiftId(null);
      }
    } catch (e) { console.warn('[shift close]', e); }
    clearSession('waiter');
    router.replace('/waiter/login');
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  async function accept(order: Order) {
    if (actionBusy) return;
    setActionBusy(true);
    try {
      await updateOrderStatus(order.id, 'pending', session?.name || 'Waiter');
      setActionMsg('✅ Order accepted and sent to kitchen');
      setTimeout(() => setActionMsg(''), 2500);
      await refresh();
    } catch (e) { console.error(e); }
    finally { setActionBusy(false); }
  }

  async function markServed(order: Order) {
    if (actionBusy) return;
    setActionBusy(true);
    try {
      if (order.type === 'delivery') {
        // ── Delivery: hand off to delivery person ──────────────────────────────
        // Sets status=out_for_delivery, broadcasts order_out_for_delivery,
        // delivery portal picks this up instantly.
        await updateOrderStatus(order.id, 'out_for_delivery', session?.name || 'Waiter', {
          deliveryPerson: session?.name || 'Waiter',
        });
        setActionMsg('🛵 Delivery order handed off — delivery person notified!');
      } else if (order.type === 'pickup') {
        // ── Pickup: customer collects at counter ───────────────────────────────
        // Mark served — customer picks up from counter directly.
        // Pickup does NOT go through the delivery portal.
        // Manager/counter completes payment to move to 'completed'.
        await updateOrderStatus(order.id, 'served', session?.name || 'Waiter');
        setActionMsg('🏪 Pickup order ready — customer can collect from counter!');
      } else {
        // ── Dine-in: standard table service ────────────────────────────────────
        await updateOrderStatus(order.id, 'served', session?.name || 'Waiter');
        setActionMsg('✅ Order marked as served');
      }
      setTimeout(() => setActionMsg(''), 3000);
      setSelOrder(null);
      await refresh();
    } catch (e) { console.error(e); }
    finally { setActionBusy(false); }
  }

  async function handleCancel(order: Order) {
    if (!cancelReason.trim() || actionBusy) return;
    setActionBusy(true);
    try {
      await updateOrderStatus(order.id, 'cancelled', session?.name || 'Waiter', { cancelReason });
      setActionMsg('Order cancelled');
      setTimeout(() => setActionMsg(''), 2500);
      setShowCancelFor(null);
      setCancelReason('');
      setSelOrder(null);
      await refresh();
    } catch (e) { console.error(e); }
    finally { setActionBusy(false); }
  }

  async function handleResolveDispute(orderId: string) {
    try {
      // Record DisputeResolved event in Supabase so it persists across devices
      await createOrderEvent(orderId, 'DisputeResolved', session?.name || 'Waiter', 'Dispute resolved by waiter');
      // Optimistic: remove from list immediately
      setDisputes(prev => prev.filter(d => d.id !== orderId));
    } catch (e) {
      console.error('[waiter] resolveDispute failed:', e);
      await refresh();
    }
  }

  // ── Re-serve: waiter confirms they're re-serving after "not received" ────────
  // Moves issue to 'reserving' and order back to 'served'.
  // Customer will then get the food receipt dialog again for re-confirmation.
  async function handleReServe(issue: OrderIssue) {
    try {
      // Mark issue as 'reserving' in Supabase — triggers order → served + broadcast
      await startReserving(issue.id, session?.name || 'Waiter');
      // Optimistic: remove from re-serve list immediately (will come back if fails)
      setReServeIssues(prev => prev.filter(i => i.id !== issue.id));
      setActionMsg(`✅ Re-serving order for ${issue.reportedBy || 'customer'} — they'll confirm receipt shortly.`);
      setTimeout(() => setActionMsg(''), 4000);
      await refresh();
    } catch (e) {
      console.error('[waiter] handleReServe failed:', e);
      setActionMsg('❌ Could not update re-serve status. Please try again.');
      setTimeout(() => setActionMsg(''), 3000);
      await refresh();
    }
  }

  async function handleAcknowledgeWaiterCall(callId: string) {
    // Optimistic remove — waiter clicked Go, no need to keep the notification
    setWaiterCalls(prev => prev.filter(c => c.id !== callId));
    try {
      // Pass staff name so the audit trail records who acknowledged this call
      await acknowledgeWaiterCallById(callId, session?.name ?? undefined);
    } catch (e) {
      console.warn('[waiter] acknowledge call failed:', e);
      // Non-fatal: call will reappear on next refresh if PATCH failed
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const active = orders.filter(o =>
    // Include re_serve_required in 'active' so waiter sees it at the top
    ['awaiting_waiter', 'pending', 'preparing', 'prepared', 're_serve_required'].includes(o.status),
  );
  const served = orders.filter(o => o.status === 'served');
  const shown = filter === 'active' ? active
              : filter === 'served' ? served
              : orders.slice(-80).reverse();

  // Delivery-only orders that are prepared — ready for delivery person to pick up
  // (Pickup orders are NOT shown here — they go to counter, not delivery portal)
  const deliveryReadyOrders = orders.filter(o => o.type === 'delivery' && o.status === 'prepared');
  const deliveryEnRoute     = orders.filter(o => o.type === 'delivery' && o.status === 'out_for_delivery');
  // Pickup orders ready for collection at counter
  const pickupReadyOrders   = orders.filter(o => o.type === 'pickup' && o.status === 'prepared');

  // For bill-requested smart banner
  const awaitingPaymentTabs = tabs.filter(t => t.status === 'awaiting_payment');
  const tabsWithPendingFood = awaitingPaymentTabs.filter(tab =>
    orders.some(o => o.tabId === tab.id && o.status === 'prepared'),
  );
  const tabsReadyForCounter = awaitingPaymentTabs.filter(tab =>
    !orders.some(o => o.tabId === tab.id && o.status === 'prepared'),
  );

  // Waiter-specific stats are not tracked per-order in Supabase yet.
  // myStats is null so the stats subtitle is hidden — this is acceptable.
  const myStats = null as { ordersAccepted: number; ordersCancelled: number; ordersServed: number } | null;

  // ── Styles ────────────────────────────────────────────────────────────────
  const btn = (bg = '#E65C00', c = 'white'): React.CSSProperties => ({
    background: bg, color: c, border: 'none', borderRadius: 8,
    fontWeight: 700, cursor: 'pointer', fontFamily: 'Poppins,sans-serif',
    padding: '0.45rem 0.9rem', fontSize: '0.8rem',
  });

  if (!authChecked) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#fff8f3,#fff0e8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#888' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🛎️</div>
          <div>Loading Waiter Portal…</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#fff8f3,#fff0e8)', fontFamily: 'Poppins,sans-serif' }}>

      {/* Flash keyframe animation for new orders */}
      <style>{`
        @keyframes waiterFlash {
          0%,100% { box-shadow: 0 0 0 rgba(245,158,11,0); }
          25%,75%  { box-shadow: 0 0 22px rgba(245,158,11,0.85); border-color: #f59e0b !important; }
        }
        .waiter-new-order { animation: waiterFlash 0.55s ease-in-out 3; }
      `}</style>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#7c3aed,#5b21b6)', color: 'white', padding: '0.75rem 1rem', paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))', position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0, flexShrink: 1 }}>
            <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>🛎️</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.05rem', fontWeight: 900, whiteSpace: 'nowrap' }}>Waiter Station</div>
              <div style={{ fontSize: '0.65rem', color: '#c4b5fd', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {session?.name} {myStats && `· ${myStats.ordersAccepted} acc · ${myStats.ordersServed} served`}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexShrink: 0, overflow: 'hidden' }}>
            {active.length > 0 && (
              <div style={{ background: '#f59e0b', color: '#1A0800', padding: '0.2rem 0.55rem', borderRadius: 20, fontSize: '0.72rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
                {active.length} Active
              </div>
            )}
            <button onClick={logout} style={{ ...btn('#ffffff20', 'white'), border: '1px solid #ffffff30', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
              🚪 Logout
            </button>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {fetchError && (
        <div style={{
          background: '#fef2f2', border: '2px solid #fecaca',
          borderRadius: 10, padding: '0.75rem 1.25rem',
          margin: '0.5rem 1.25rem', display: 'flex',
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

      {/* ── 🚨 "Not Received" Re-Serve Banner (new Supabase-backed flow) ── */}
      {reServeIssues.length > 0 && (
        <div style={{ background: reServeIssues.some(i => i.escalated) ? '#450a0a' : '#7f1d1d', borderBottom: '3px solid #dc2626', padding: '0.65rem 1.25rem' }}>
          <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#fca5a5', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span>🚨</span>
            <span>
              {reServeIssues.some(i => i.escalated)
                ? `ESCALATED — Manager required for ${reServeIssues.filter(i => i.escalated).length} order(s)`
                : `Re-Serve Required — ${reServeIssues.length} customer${reServeIssues.length > 1 ? 's' : ''} didn't receive food`}
            </span>
          </div>
          {reServeIssues.map(issue => {
            const order = orders.find(o => o.id === issue.orderId);
            return (
              <div key={issue.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.35rem 0', fontSize: '0.78rem', color: '#fca5a5', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <div>
                  <span style={{ fontWeight: 700 }}>
                    {issue.escalated ? '🔴' : '🟡'} {issue.reportedBy || 'Customer'}
                  </span>
                  <span style={{ color: '#fda4af', marginLeft: '0.4rem' }}>
                    Order #{order?.orderNum ?? issue.orderId.slice(-4)}
                    {order?.type === 'pickup'   ? ' · 🏪 Pickup at counter' :
                     order?.type === 'delivery' ? ' · 🛵 Delivery' :
                     order?.tableId             ? ` · ${formatTableName(order.tableId)}` : ''}
                    {' — '}
                    Attempt {issue.retryCount}/{3}
                  </span>
                  {issue.escalated && (
                    <span style={{ marginLeft: '0.4rem', background: '#dc2626', color: 'white', fontSize: '0.62rem', padding: '0.1rem 0.3rem', borderRadius: 4, fontWeight: 800 }}>
                      ESCALATED
                    </span>
                  )}
                </div>
                <button
                  onClick={() => void handleReServe(issue)}
                  style={{ ...btn('#16a34a'), fontSize: '0.7rem', padding: '0.25rem 0.6rem', whiteSpace: 'nowrap' as const }}
                >
                  ✓ Re-Serving Now
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Legacy Food Dispute Banner (FoodDisputed events from old flow) ── */}
      {disputes.length > 0 && (
        <div style={{ background: '#7f1d1d', borderBottom: '2px solid #dc2626', padding: '0.65rem 1.25rem' }}>
          <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#fca5a5', marginBottom: '0.35rem' }}>
            ⚠️ Food Disputes — Legacy Reports
          </div>
          {disputes.map(d => (
            <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.25rem 0', fontSize: '0.78rem', color: '#fca5a5' }}>
              <span>{formatTableName(d.tableId)} · {d.customerName} — Order dispute</span>
              <button
                onClick={() => handleResolveDispute(d.id)}
                style={{ ...btn('#10b981'), fontSize: '0.65rem', padding: '0.2rem 0.5rem' }}
              >
                ✓ Resolved
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Waiter Calls Banner ── */}
      {waiterCalls.length > 0 && (
        <div style={{ background: '#b45309', borderBottom: '2px solid #f59e0b', padding: '0.65rem 1.25rem' }}>
          <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#fef3c7', marginBottom: '0.35rem' }}>
            🔔 Waiter Calls
          </div>
          {waiterCalls.map(call => {
            const callMinutesAgo = Math.floor((Date.now() - new Date(call.at).getTime()) / 60000);
            return (
              <div key={call.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.25rem 0', fontSize: '0.78rem', color: '#78350f' }}>
                <span>{formatTableName(call.tableId)} · {call.customerName} ({callMinutesAgo}m ago)</span>
                <button
                  onClick={() => handleAcknowledgeWaiterCall(call.id)}
                  style={{ ...btn('#f59e0b', '#1A0800'), fontSize: '0.65rem', padding: '0.2rem 0.5rem' }}
                >
                  ✓ Go
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Delivery Ready Banner ── */}
      {deliveryReadyOrders.length > 0 && (
        <div style={{ background: '#eff6ff', borderBottom: '2px solid #2563eb', padding: '0.65rem 1.25rem' }}>
          <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#1e40af', marginBottom: '0.35rem' }}>
            🛵 Delivery Orders Ready — Notify delivery person
          </div>
          {deliveryReadyOrders.map(o => (
            <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.2rem 0', fontSize: '0.78rem', color: '#1e40af' }}>
              <span>#{o.id.slice(-6)} · {o.customerName} · ₹{o.total}</span>
              {o.deliveryAddress && <span style={{ color: '#3b82f6', fontSize: '0.7rem' }}>📍 {o.deliveryAddress.slice(0, 25)}{o.deliveryAddress.length > 25 ? '…' : ''}</span>}
            </div>
          ))}
        </div>
      )}
      {deliveryEnRoute.length > 0 && (
        <div style={{ background: '#f0f9ff', borderBottom: '1px solid #bae6fd', padding: '0.5rem 1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#0369a1', fontWeight: 700 }}>
            🛵 {deliveryEnRoute.length} order{deliveryEnRoute.length > 1 ? 's' : ''} currently out for delivery
          </div>
        </div>
      )}

      {/* ── Pickup Ready Banner (counter pickup — NOT delivery portal) ── */}
      {pickupReadyOrders.length > 0 && (
        <div style={{ background: '#f0fdf4', borderBottom: '2px solid #16a34a', padding: '0.65rem 1.25rem' }}>
          <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#15803d', marginBottom: '0.35rem' }}>
            🏪 Pickup Orders Ready — Notify customer to collect from counter
          </div>
          {pickupReadyOrders.map(o => (
            <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.2rem 0', fontSize: '0.78rem', color: '#15803d' }}>
              <span>#{o.id.slice(-6)} · {o.customerName} · ₹{o.total}</span>
              <span style={{ background: '#dcfce7', color: '#15803d', padding: '0.12rem 0.4rem', borderRadius: 8, fontSize: '0.68rem', fontWeight: 700 }}>Counter Pickup</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Smart Bill-Requested Banner ── */}
      {awaitingPaymentTabs.length > 0 && (
        <div style={{ borderBottom: '2px solid #f59e0b' }}>
          {/* Section 1: Tabs with food still being served */}
          {tabsWithPendingFood.length > 0 && (
            <div style={{ background: '#fff7ed', padding: '0.65rem 1.25rem' }}>
              <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#9a3412', marginBottom: '0.35rem' }}>
                🍽️ Bill Requested — Serve food first, then direct to counter
              </div>
              {tabsWithPendingFood.map(tab => {
                const readyOrders = orders.filter(
                  o => o.tabId === tab.id && o.status === 'prepared',
                );
                return (
                  <div key={tab.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.25rem 0', fontSize: '0.78rem', color: '#7c2d12' }}>
                    <span>{tab.tableId ? formatTableName(tab.tableId) : '—'} — {tab.customerName || 'Guest'}</span>
                    <span style={{ background: '#fed7aa', color: '#9a3412', padding: '0.15rem 0.5rem', borderRadius: 10, fontSize: '0.7rem', fontWeight: 700 }}>
                      ⚡ {readyOrders.length} ready — serve now
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          {/* Section 2: Tabs ready to pay */}
          {tabsReadyForCounter.length > 0 && (
            <div style={{ background: '#fef9c3', padding: '0.65rem 1.25rem' }}>
              <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#713f12', marginBottom: '0.2rem' }}>
                💳 Bill Ready — Please direct customer(s) to the counter
              </div>
              {tabsReadyForCounter.map(tab => {
                // tab.total is 0 until close — compute live from orders
                const liveSubtotal = orders
                  .filter(o => o.tabId === tab.id && !['cancelled', 'void'].includes(o.status))
                  .reduce((s, o) => s + (o.total || 0), 0);
                const billAmt = Math.max(0, liveSubtotal - (tab.discount || 0));
                return (
                  <div key={tab.id} style={{ fontSize: '0.78rem', color: '#713f12', padding: '0.15rem 0' }}>
                    {tab.tableId ? formatTableName(tab.tableId) : '—'} — {tab.customerName || 'Guest'} · ₹{billAmt}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── "Party seated" banners — fired by table_session_started realtime event */}
      {seatedBanners.map(b => (
        <div
          key={b.id}
          style={{ background: '#fef3c7', borderBottom: '2px solid #f59e0b', padding: '0.55rem 1.25rem', fontWeight: 700, fontSize: '0.82rem', color: '#92400e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <span>
            🪑 New party seated{b.tableId ? ` at ${formatTableName(b.tableId)}` : ''} — <strong>{b.customerName}</strong>, party of {b.partySize}. Take their order!
          </span>
          <button
            onClick={() => setSeatedBanners(prev => prev.filter(x => x.id !== b.id))}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 900, fontSize: '1rem', color: '#92400e', lineHeight: 1 }}
            title="Dismiss"
          >✕</button>
        </div>
      ))}

      {/* Action message */}
      {actionMsg && (
        <div style={{ background: '#dcfce7', borderBottom: '2px solid #16a34a', padding: '0.6rem 1.25rem', fontWeight: 700, fontSize: '0.82rem', color: '#16a34a' }}>
          {actionMsg}
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ padding: '0.65rem 1.25rem', display: 'flex', gap: '0.4rem', overflowX: 'auto' }}>
        {[
          { key: 'active', label: `🟡 Active (${active.length})` },
          { key: 'served', label: `🟢 Served (${served.length})` },
          { key: 'all',    label: '📋 All Orders' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as typeof filter)}
            style={{
              padding: '0.3rem 0.8rem', borderRadius: 20, cursor: 'pointer', whiteSpace: 'nowrap',
              fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: '0.75rem',
              border: `2px solid ${filter === f.key ? '#7c3aed' : '#ddd'}`,
              background: filter === f.key ? '#7c3aed' : 'white',
              color: filter === f.key ? 'white' : '#666',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Order list */}
      <div style={{ padding: '0 1rem 5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))', gap: '0.75rem' }}>
        {!shown.length ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: '#999' }}>
            {filter === 'active' ? '🎉 All caught up! No active orders.' : 'No orders found.'}
          </div>
        ) : shown.map(order => {
          const mins = Math.floor((Date.now() - new Date(order.timestamp).getTime()) / 60000);
          const canAccept = order.status === 'awaiting_waiter';
          const canServe  = order.status === 'prepared';

          // Table capacity badge for dine-in orders
          const tableRow  = order.tableId ? tables.find(t => t.id === order.tableId) : null;
          const seatBadge = tableRow ? `🪑 ${tableRow.name} · Capacity: ${tableRow.capacity ?? '?'}` : null;

          const isFlashing = flashIds.has(order.id);
          return (
            <div
              key={order.id}
              className={isFlashing ? 'waiter-new-order' : undefined}
              onClick={() => { setSelOrder(order); setShowCancelFor(null); setCancelReason(''); }}
              style={{
                background: 'white', borderRadius: 12, overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
                borderLeft: `4px solid ${STATUS_COLOR[order.status] || '#ddd'}`,
                cursor: 'pointer',
              }}
            >
              {isFlashing && (
                <div style={{ background: '#f59e0b', color: '#1A0800', padding: '0.18rem 0.75rem', fontSize: '0.7rem', fontWeight: 800, textAlign: 'center' }}>
                  🔔 NEW ORDER — Action required!
                </div>
              )}
              <div style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#1A0800' }}>
                    #{order.orderNum || order.id.slice(-4)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#888', marginTop: '0.1rem' }}>
                    {order.customerName}{order.tableId ? ` · ${formatTableName(order.tableId)}` : ''}
                  </div>
                  {seatBadge && (
                    <div style={{ fontSize: '0.66rem', color: '#E65C00', fontWeight: 700, marginTop: '0.1rem' }}>
                      {seatBadge}
                    </div>
                  )}
                  <div style={{ fontSize: '0.68rem', color: '#aaa', marginTop: '0.08rem' }}>⏱ {mins}m ago</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.12rem 0.5rem', borderRadius: 10, background: (STATUS_COLOR[order.status] || '#ddd') + '25', color: STATUS_COLOR[order.status] || '#555' }}>
                    {STATUS_LABEL[order.status] || order.status}
                  </span>
                  <span style={{ fontWeight: 800, color: '#16a34a', fontSize: '0.9rem' }}>₹{order.total}</span>
                </div>
              </div>
              <div style={{ padding: '0.35rem 1rem 0.5rem', fontSize: '0.75rem', color: '#666', borderTop: '1px solid #f5f0e8', display: 'flex', justifyContent: 'space-between' }}>
                <span>{(order.items || []).reduce((s, i) => s + i.qty, 0)} item(s)</span>
                {(canAccept || canServe) && (
                  <span style={{
                    color: canServe
                      ? (order.type === 'delivery' ? '#2563eb' : order.type === 'pickup' ? '#16a34a' : '#8b5cf6')
                      : '#f59e0b',
                    fontWeight: 700,
                  }}>
                    {canAccept ? '⚡ Action needed'
                      : order.type === 'delivery' ? '📦 Ready for delivery!'
                      : order.type === 'pickup'   ? '🏪 Ready for counter pickup!'
                      : '✅ Ready to serve!'}
                  </span>
                )}
              </div>
              {/* Quick action buttons on card */}
              {(canAccept || canServe) && (
                <div style={{ padding: '0 0.75rem 0.6rem', display: 'flex', gap: '0.4rem' }} onClick={e => e.stopPropagation()}>
                  {canAccept && (
                    <button disabled={actionBusy} onClick={() => accept(order)} style={{ ...btn('#f59e0b', '#1A0800'), flex: 1, fontSize: '0.76rem', padding: '0.4rem 0.5rem', opacity: actionBusy ? 0.6 : 1 }}>
                      ✅ Accept
                    </button>
                  )}
                  {canServe && (
                    <button
                      disabled={actionBusy}
                      onClick={() => markServed(order)}
                      style={{ ...btn(order.type === 'delivery' ? '#2563eb' : order.type === 'pickup' ? '#16a34a' : '#8b5cf6'), flex: 1, fontSize: '0.76rem', padding: '0.4rem 0.5rem', opacity: actionBusy ? 0.6 : 1 }}
                    >
                      {order.type === 'delivery' ? '📦 Hand to Delivery'
                       : order.type === 'pickup'   ? '🏪 Ready for Pickup'
                       : '🍽️ Mark Served'}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Order detail modal ── */}
      {selOrder && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200 }}
          onClick={() => { setSelOrder(null); setShowCancelFor(null); setCancelReason(''); }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: 'white', width: '100%', maxWidth: '520px', maxHeight: '88vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', borderRadius: '16px 16px 0 0', boxShadow: '0 -16px 40px rgba(0,0,0,0.25)' }}
          >
            <div style={{ background: `linear-gradient(135deg,${STATUS_COLOR[selOrder.status] || '#7c3aed'},${STATUS_COLOR[selOrder.status] || '#5b21b6'})`, color: 'white', padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: '1rem' }}>Order #{selOrder.orderNum || selOrder.id.slice(-4)}</div>
                <div style={{ fontSize: '0.72rem', opacity: 0.85 }}>{selOrder.customerName}{selOrder.tableId ? ` · ${formatTableName(selOrder.tableId)}` : ''} · {STATUS_LABEL[selOrder.status]}</div>
              </div>
              <button onClick={() => { setSelOrder(null); setShowCancelFor(null); }} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.4rem', cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem' }}>
              {/* Items */}
              {(selOrder.items || []).map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid #f5f0e8', fontSize: '0.85rem' }}>
                  <span>{item.name} <span style={{ color: '#aaa' }}>×{item.qty}</span></span>
                  <span style={{ fontWeight: 700 }}>₹{item.subtotal ?? item.price * item.qty}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '0.95rem', paddingTop: '0.5rem', color: '#1A0800' }}>
                <span>Total</span>
                <span>₹{selOrder.total}</span>
              </div>

              {/* Timeline */}
              {(selOrder.timeline || []).length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#888', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Timeline</div>
                  {selOrder.timeline!.map((t, i) => (
                    <div key={i} style={{ fontSize: '0.75rem', color: '#666', padding: '0.2rem 0', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <span style={{ color: STATUS_COLOR[t.eventType] || '#888', fontWeight: 700 }}>{STATUS_LABEL[t.eventType] || t.eventType}</span>
                      <span style={{ color: '#aaa' }}>· {t.by} · {fmtTime(t.at || '')}</span>
                      {t.note && <span style={{ color: '#888', fontStyle: 'italic' }}>{t.note}</span>}
                    </div>
                  ))}
                </div>
              )}

              {/* Cancel section */}
              {['awaiting_waiter', 'pending'].includes(selOrder.status) && (
                <div style={{ marginTop: '1rem' }}>
                  {showCancelFor !== selOrder.id ? (
                    <button onClick={() => setShowCancelFor(selOrder.id)} style={{ ...btn('#fef2f2', '#ef4444'), width: '100%', border: '1px solid #fecaca', fontSize: '0.8rem' }}>
                      ❌ Cancel Order
                    </button>
                  ) : (
                    <div style={{ background: '#fef2f2', borderRadius: 10, padding: '0.75rem', border: '1px solid #fecaca' }}>
                      <input
                        value={cancelReason}
                        onChange={e => setCancelReason(e.target.value)}
                        placeholder="Reason for cancellation..."
                        style={{ width: '100%', boxSizing: 'border-box', padding: '0.5rem 0.7rem', border: '2px solid #fecaca', borderRadius: 8, fontFamily: 'Poppins,sans-serif', fontSize: '0.82rem', marginBottom: '0.5rem' }}
                      />
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button disabled={actionBusy} onClick={() => handleCancel(selOrder)} style={{ ...btn('#ef4444'), flex: 1, fontSize: '0.8rem', opacity: actionBusy ? 0.6 : 1 }}>Confirm Cancel</button>
                        <button onClick={() => { setShowCancelFor(null); setCancelReason(''); }} style={{ ...btn('#e5e7eb', '#555'), flex: 1, fontSize: '0.8rem' }}>Keep Order</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action footer */}
            {(selOrder.status === 'awaiting_waiter' || selOrder.status === 'prepared') && (
              <div style={{ padding: '0.85rem 1.25rem', borderTop: '2px solid #f5f0e8', background: 'white' }}>
                {selOrder.status === 'awaiting_waiter' && (
                  <button disabled={actionBusy} onClick={() => { accept(selOrder); setSelOrder(null); }} style={{ ...btn('#f59e0b', '#1A0800'), width: '100%', padding: '0.75rem', fontSize: '0.95rem', borderRadius: 12, opacity: actionBusy ? 0.6 : 1 }}>
                    {actionBusy ? '⏳ Processing…' : '✅ Accept & Send to Kitchen'}
                  </button>
                )}
                {selOrder.status === 'prepared' && (
                  <button
                    disabled={actionBusy}
                    onClick={() => markServed(selOrder)}
                    style={{ ...btn(selOrder.type === 'delivery' ? '#2563eb' : selOrder.type === 'pickup' ? '#16a34a' : '#8b5cf6'), width: '100%', padding: '0.75rem', fontSize: '0.95rem', borderRadius: 12, opacity: actionBusy ? 0.6 : 1 }}
                  >
                    {selOrder.type === 'delivery' ? '📦 Hand to Delivery Person'
                     : selOrder.type === 'pickup'   ? '🏪 Ready — Customer to Counter'
                     : '🍽️ Mark as Served'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Wrap in Suspense so useSearchParams() works correctly in Next.js 14 App Router.
export default function WaiterPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Poppins,sans-serif', color: '#888' }}>Loading…</div>}>
      <WaiterPageInner />
    </Suspense>
  );
}
