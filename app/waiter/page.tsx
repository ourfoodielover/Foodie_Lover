'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  getOrders, updateOrderStatus, cancelOrder,
  getTabs, getPendingDisputes, resolveDispute, getPendingWaiterCalls, acknowledgeWaiterCall,
  getWaiterStats,
  CustomerTab, Order, FoodReceiptDispute, WaiterCall,
} from '@/lib/storage';
import { getSession, clearSession, AuthSession } from '@/lib/auth';

const STATUS_FLOW: Record<string, string> = {
  awaiting_waiter: 'pending',
  prepared:        'served',
};
const STATUS_COLOR: Record<string, string> = {
  awaiting_waiter: '#f59e0b', pending: '#f59e0b', preparing: '#3b82f6',
  prepared: '#8b5cf6', served: '#06b6d4', completed: '#16a34a',
  cancelled: '#ef4444', void: '#9ca3af',
};
const STATUS_LABEL: Record<string, string> = {
  awaiting_waiter: 'Awaiting Waiter', pending: 'In Queue',
  preparing: 'Preparing', prepared: 'Ready to Serve',
  served: 'Served', completed: 'Completed',
  cancelled: 'Cancelled', void: 'Void',
};

export default function WaiterPage() {
  const router = useRouter();
  const [session, setSession]         = useState<AuthSession | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [orders, setOrders]           = useState<Order[]>([]);
  const [tabs, setTabs]               = useState<CustomerTab[]>([]);
  const [disputes, setDisputes]       = useState<FoodReceiptDispute[]>([]);
  const [waiterCalls, setWaiterCalls] = useState<WaiterCall[]>([]);
  const [filter, setFilter]           = useState<'active' | 'served' | 'all'>('active');
  const [selOrder, setSelOrder]       = useState<Order | null>(null);
  const [actionMsg, setActionMsg]     = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelFor, setShowCancelFor] = useState<string | null>(null);

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const s = getSession('waiter');
    if (!s) { router.replace('/waiter/login'); return; }
    setSession(s);
    setAuthChecked(true);
  }, [router]);

  // ── Data refresh ──────────────────────────────────────────────────────────
  const refresh = useCallback(() => {
    setOrders(getOrders());
    setTabs(getTabs());
    setDisputes(getPendingDisputes());
    setWaiterCalls(getPendingWaiterCalls());
    setSelOrder(prev => {
      if (!prev) return null;
      return getOrders().find(o => o.id === prev.id) ?? null;
    });
  }, []);

  useEffect(() => {
    if (!authChecked) return;
    refresh();
    const t = setInterval(refresh, 3000);
    return () => clearInterval(t);
  }, [refresh, authChecked]);

  function logout() { clearSession('waiter'); router.replace('/waiter/login'); }

  // ── Actions ───────────────────────────────────────────────────────────────
  function accept(order: Order) {
    const ok = updateOrderStatus(order.id, 'pending', session?.name || 'Waiter');
    if (ok) {
      setActionMsg('✅ Order accepted and sent to kitchen');
      setTimeout(() => setActionMsg(''), 2500);
      refresh();
    }
  }

  function markServed(order: Order) {
    const ok = updateOrderStatus(order.id, 'served', session?.name || 'Waiter');
    if (ok) {
      setActionMsg('✅ Order marked as served');
      setTimeout(() => setActionMsg(''), 2500);
      setSelOrder(null);
      refresh();
    }
  }

  function handleCancel(order: Order) {
    if (!cancelReason.trim()) return;
    const ok = cancelOrder(order.id, cancelReason, session?.name || 'Waiter');
    if (ok) {
      setActionMsg('Order cancelled');
      setTimeout(() => setActionMsg(''), 2500);
      setShowCancelFor(null);
      setCancelReason('');
      setSelOrder(null);
      refresh();
    }
  }

  function handleResolveDispute(disputeId: string) {
    const ok = resolveDispute(disputeId, session?.name || 'Waiter');
    if (ok) {
      refresh();
    }
  }

  function handleAcknowledgeWaiterCall(callId: string) {
    const ok = acknowledgeWaiterCall(callId, session?.name || 'Waiter');
    if (ok) {
      refresh();
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const active = orders.filter(o =>
    ['awaiting_waiter', 'pending', 'preparing', 'prepared'].includes(o.status),
  );
  const served = orders.filter(o => o.status === 'served');
  const shown = filter === 'active' ? active
              : filter === 'served' ? served
              : orders.slice(-80).reverse();

  // Delivery orders that are prepared — ready for delivery pickup
  const deliveryReadyOrders = orders.filter(o => o.type === 'delivery' && o.status === 'prepared');
  const deliveryEnRoute     = orders.filter(o => o.type === 'delivery' && o.status === 'out_for_delivery');

  // For bill-requested smart banner
  const awaitingPaymentTabs = tabs.filter(t => t.tabStatus === 'awaiting_payment');
  const tabsWithPendingFood = awaitingPaymentTabs.filter(tab =>
    orders.some(o => tab.orderIds.includes(o.id) && o.status === 'prepared'),
  );
  const tabsReadyForCounter = awaitingPaymentTabs.filter(tab =>
    !orders.some(o => tab.orderIds.includes(o.id) && o.status === 'prepared'),
  );

  // Get waiter stats for today
  const waiterStats = getWaiterStats();
  const myStats = waiterStats.find(s => s.name === session?.name);

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

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#7c3aed,#5b21b6)', color: 'white', padding: '0.9rem 1.25rem', position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🛎️</span>
            <div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.15rem', fontWeight: 900 }}>Waiter Station</div>
              <div style={{ fontSize: '0.68rem', color: '#c4b5fd' }}>
                {session?.name} {myStats && `· ${myStats.ordersAccepted} accepted · ${myStats.ordersCancelled} cancelled · ${myStats.ordersServed} served`}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {active.length > 0 && (
              <div style={{ background: '#f59e0b', color: '#1A0800', padding: '0.2rem 0.6rem', borderRadius: 20, fontSize: '0.72rem', fontWeight: 800 }}>
                {active.length} Active
              </div>
            )}
            <button onClick={logout} style={{ ...btn('#ffffff20', 'white'), border: '1px solid #ffffff30', fontSize: '0.72rem' }}>
              🚪 Logout
            </button>
          </div>
        </div>
      </div>

      {/* ── Food Dispute Banner ── */}
      {disputes.length > 0 && (
        <div style={{ background: '#7f1d1d', borderBottom: '2px solid #dc2626', padding: '0.65rem 1.25rem' }}>
          <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#fca5a5', marginBottom: '0.35rem' }}>
            🚨 Food Disputes — Customers denied receiving food
          </div>
          {disputes.map(d => (
            <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.25rem 0', fontSize: '0.78rem', color: '#fca5a5' }}>
              <span>Table {d.tableId} · {d.customerName} — Order dispute</span>
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
                <span>Table {call.tableId} · {call.customerName} ({callMinutesAgo}m ago)</span>
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
                  o => tab.orderIds.includes(o.id) && o.status === 'prepared',
                );
                return (
                  <div key={tab.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.25rem 0', fontSize: '0.78rem', color: '#7c2d12' }}>
                    <span>Table {tab.tableId} — {tab.customerName}</span>
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
              {tabsReadyForCounter.map(tab => (
                <div key={tab.id} style={{ fontSize: '0.78rem', color: '#713f12', padding: '0.15rem 0' }}>
                  Table {tab.tableId} — {tab.customerName} · ₹{tab.totalAmount - tab.discount}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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

          return (
            <div
              key={order.id}
              onClick={() => { setSelOrder(order); setShowCancelFor(null); setCancelReason(''); }}
              style={{
                background: 'white', borderRadius: 12, overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
                borderLeft: `4px solid ${STATUS_COLOR[order.status] || '#ddd'}`,
                cursor: 'pointer',
              }}
            >
              <div style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#1A0800' }}>
                    #{order.orderNum || order.id.slice(-4)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#888', marginTop: '0.1rem' }}>
                    {order.customerName}{order.tableId ? ` · Table ${order.tableId}` : ''}
                  </div>
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
                  <span style={{ color: canServe ? '#8b5cf6' : '#f59e0b', fontWeight: 700 }}>
                    {canAccept ? '⚡ Action needed' : '✅ Ready to serve!'}
                  </span>
                )}
              </div>
              {/* Quick action buttons on card */}
              {(canAccept || canServe) && (
                <div style={{ padding: '0 0.75rem 0.6rem', display: 'flex', gap: '0.4rem' }} onClick={e => e.stopPropagation()}>
                  {canAccept && (
                    <button onClick={() => accept(order)} style={{ ...btn('#f59e0b', '#1A0800'), flex: 1, fontSize: '0.76rem', padding: '0.4rem 0.5rem' }}>
                      ✅ Accept
                    </button>
                  )}
                  {canServe && (
                    <button onClick={() => markServed(order)} style={{ ...btn('#8b5cf6'), flex: 1, fontSize: '0.76rem', padding: '0.4rem 0.5rem' }}>
                      🍽️ Mark Served
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
                <div style={{ fontSize: '0.72rem', opacity: 0.85 }}>{selOrder.customerName}{selOrder.tableId ? ` · Table ${selOrder.tableId}` : ''} · {STATUS_LABEL[selOrder.status]}</div>
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
                      <span style={{ color: STATUS_COLOR[t.status] || '#888', fontWeight: 700 }}>{STATUS_LABEL[t.status] || t.status}</span>
                      <span style={{ color: '#aaa' }}>· {t.by} · {new Date(t.at || t.timestamp || '').toLocaleTimeString()}</span>
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
                        <button onClick={() => handleCancel(selOrder)} style={{ ...btn('#ef4444'), flex: 1, fontSize: '0.8rem' }}>Confirm Cancel</button>
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
                  <button onClick={() => { accept(selOrder); setSelOrder(null); }} style={{ ...btn('#f59e0b', '#1A0800'), width: '100%', padding: '0.75rem', fontSize: '0.95rem', borderRadius: 12 }}>
                    ✅ Accept & Send to Kitchen
                  </button>
                )}
                {selOrder.status === 'prepared' && (
                  <button onClick={() => markServed(selOrder)} style={{ ...btn('#8b5cf6'), width: '100%', padding: '0.75rem', fontSize: '0.95rem', borderRadius: 12 }}>
                    🍽️ Mark as Served
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
