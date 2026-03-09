'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  getOrders, updateOrderStatus,
  getTabs, CustomerTab,
  Order,
} from '@/lib/storage';
import { getSession, clearSession, AuthSession } from '@/lib/auth';

const STATUS_COLOR: Record<string, string> = {
  pending: '#f59e0b', preparing: '#3b82f6', prepared: '#8b5cf6',
};
const STATUS_LABEL: Record<string, string> = {
  pending: 'Queued', preparing: 'Preparing', prepared: 'Ready',
};

export default function KitchenPage() {
  const router = useRouter();
  const [session, setSession]         = useState<AuthSession | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [orders, setOrders]           = useState<Order[]>([]);
  const [tabs, setTabs]               = useState<CustomerTab[]>([]);
  const [clock, setClock]             = useState('');
  const [filter, setFilter]           = useState<'all' | 'pending' | 'preparing' | 'prepared'>('all');

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const s = getSession('kitchen');
    if (!s) { router.replace('/kitchen/login'); return; }
    setSession(s);
    setAuthChecked(true);
  }, [router]);

  // ── Data refresh ──────────────────────────────────────────────────────────
  const refresh = useCallback(() => {
    setOrders(getOrders());
    setTabs(getTabs());
  }, []);

  useEffect(() => {
    if (!authChecked) return;
    refresh();
    const t1 = setInterval(refresh, 3000);
    const t2 = setInterval(() => setClock(new Date().toLocaleTimeString()), 1000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, [refresh, authChecked]);

  function logout() { clearSession('kitchen'); router.replace('/kitchen/login'); }

  // ── Actions ───────────────────────────────────────────────────────────────
  function advance(order: Order) {
    const next =
      order.status === 'pending'   ? 'preparing' :
      order.status === 'preparing' ? 'prepared'  : null;
    if (!next) return;
    updateOrderStatus(order.id, next, session?.name || 'Kitchen');
    refresh();
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const kitchenOrders = orders.filter(o =>
    ['pending', 'preparing', 'prepared'].includes(o.status),
  );

  const shown = filter === 'all'
    ? kitchenOrders
    : kitchenOrders.filter(o => o.status === filter);

  const pendingCount   = kitchenOrders.filter(o => o.status === 'pending').length;
  const preparingCount = kitchenOrders.filter(o => o.status === 'preparing').length;
  const preparedCount  = kitchenOrders.filter(o => o.status === 'prepared').length;

  // ── Styles ────────────────────────────────────────────────────────────────
  const btn = (bg = '#E65C00', c = 'white'): React.CSSProperties => ({
    background: bg, color: c, border: 'none', borderRadius: 8,
    fontWeight: 700, cursor: 'pointer', fontFamily: 'Poppins,sans-serif',
    padding: '0.45rem 1rem', fontSize: '0.8rem',
  });

  if (!authChecked) {
    return (
      <div style={{ minHeight: '100vh', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#888', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👨‍🍳</div>
          <div>Loading Kitchen Display…</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#111', color: 'white', fontFamily: 'Poppins,sans-serif' }}>

      {/* Header */}
      <div style={{ background: '#1a1a1a', borderBottom: '2px solid #333', padding: '0.8rem 1.25rem', position: 'sticky', top: 0, zIndex: 50, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <span style={{ fontSize: '1.6rem' }}>👨‍🍳</span>
          <div>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.15rem', fontWeight: 900, color: '#F9A826' }}>Kitchen Display</div>
            <div style={{ fontSize: '0.65rem', color: '#666' }}>{clock}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {/* Status counters */}
          {[
            { count: pendingCount,   color: '#f59e0b', label: 'Queued'    },
            { count: preparingCount, color: '#3b82f6', label: 'Cooking'   },
            { count: preparedCount,  color: '#8b5cf6', label: 'Ready'     },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1rem', fontWeight: 900, color: s.color }}>{s.count}</div>
              <div style={{ fontSize: '0.6rem', color: '#666' }}>{s.label}</div>
            </div>
          ))}
          <button onClick={logout} style={{ ...btn('#ffffff15', '#aaa'), border: '1px solid #333', fontSize: '0.72rem' }}>
            🚪 Logout
          </button>
        </div>
      </div>

      {/* Filter row */}
      <div style={{ padding: '0.6rem 1.25rem', display: 'flex', gap: '0.4rem', background: '#1a1a1a', borderBottom: '1px solid #2a2a2a', overflowX: 'auto' }}>
        {[
          { key: 'all',      label: `🍳 All (${kitchenOrders.length})` },
          { key: 'pending',  label: `⏱ Queued (${pendingCount})`       },
          { key: 'preparing',label: `🔥 Cooking (${preparingCount})`   },
          { key: 'prepared', label: `✅ Ready (${preparedCount})`       },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as typeof filter)}
            style={{
              padding: '0.28rem 0.8rem', borderRadius: 20, whiteSpace: 'nowrap',
              fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer',
              border: `2px solid ${filter === f.key ? '#F9A826' : '#333'}`,
              background: filter === f.key ? '#F9A826' : '#222',
              color: filter === f.key ? '#1A0800' : '#999',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {!shown.length && (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#444' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎉</div>
          <div style={{ fontWeight: 700 }}>All clear! No orders in kitchen.</div>
        </div>
      )}

      {/* Order cards */}
      <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '0.85rem' }}>
        {shown.map(order => {
          const mins = Math.floor((Date.now() - new Date(order.timestamp).getTime()) / 60000);
          const isUrgent = mins >= 20 && order.status !== 'prepared';

          // Check if this order's tab has requested the bill
          const billRequested = tabs.some(
            t => t.orderIds.includes(order.id) && t.tabStatus === 'awaiting_payment',
          );

          const nextAction =
            order.status === 'pending'   ? { label: '🔥 Start Cooking', bg: '#3b82f6' } :
            order.status === 'preparing' ? { label: '✅ Mark Ready',     bg: '#8b5cf6' } :
            null;

          return (
            <div
              key={order.id}
              style={{
                background: '#1e1e1e',
                borderRadius: 14,
                overflow: 'hidden',
                border: `2px solid ${isUrgent ? '#ef4444' : STATUS_COLOR[order.status] || '#333'}`,
                boxShadow: isUrgent ? '0 0 16px rgba(239,68,68,0.3)' : '0 2px 8px rgba(0,0,0,0.3)',
              }}
            >
              {/* Bill requested badge */}
              {billRequested && (
                <div style={{
                  background: '#f59e0b', color: 'white',
                  padding: '0.22rem 1rem', fontSize: '0.72rem',
                  fontWeight: 800, textAlign: 'center', letterSpacing: '0.03em',
                }}>
                  💳 BILL REQUESTED — Rush this order!
                </div>
              )}

              {/* Urgent badge */}
              {isUrgent && (
                <div style={{
                  background: '#ef4444', color: 'white',
                  padding: '0.2rem 0.75rem', fontSize: '0.7rem', fontWeight: 800, textAlign: 'center',
                }}>
                  ⚠️ URGENT — {mins}m waiting
                </div>
              )}

              <div style={{ padding: '0.75rem 1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: '1rem', color: '#F9A826' }}>
                      #{order.orderNum || order.id.slice(-4)}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#888', marginTop: '0.1rem' }}>
                      {order.customerName}{order.tableId ? ` · Table ${order.tableId}` : ''}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.55rem', borderRadius: 10, background: (STATUS_COLOR[order.status] || '#333') + '30', color: STATUS_COLOR[order.status] || '#888' }}>
                      {STATUS_LABEL[order.status] || order.status}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: '#555', marginTop: '0.2rem' }}>⏱ {mins}m</div>
                  </div>
                </div>

                {/* Items */}
                <div style={{ borderTop: '1px solid #2a2a2a', paddingTop: '0.5rem', marginBottom: '0.6rem' }}>
                  {(order.items || []).map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', padding: '0.2rem 0', color: '#ccc' }}>
                      <span style={{ fontWeight: 700 }}>{item.name}</span>
                      <span style={{ color: '#F9A826', fontWeight: 800 }}>×{item.qty}</span>
                    </div>
                  ))}
                </div>

                {/* Action button */}
                {nextAction && (
                  <button
                    onClick={() => advance(order)}
                    style={{ ...btn(nextAction.bg), width: '100%', padding: '0.55rem', borderRadius: 10, fontSize: '0.82rem' }}
                  >
                    {nextAction.label}
                  </button>
                )}
                {order.status === 'prepared' && (
                  <div style={{ background: '#8b5cf620', border: '1px solid #8b5cf640', borderRadius: 10, padding: '0.45rem', textAlign: 'center', fontSize: '0.78rem', color: '#a78bfa', fontWeight: 700 }}>
                    ✅ Ready — Waiting for waiter
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
