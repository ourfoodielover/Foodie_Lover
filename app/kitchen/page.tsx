'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  getOrders, updateOrderStatus, updateItemStatus,
  getTabs, CustomerTab,
  Order, ItemStatus,
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
  const [tick, setTick]               = useState(0); // increments every second for live timers
  const [filter, setFilter]           = useState<'all' | 'queued' | 'cooking' | 'ready'>('all');

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
    const t2 = setInterval(() => {
      setClock(new Date().toLocaleTimeString());
      setTick(n => n + 1); // forces re-render for live MM:SS timers
    }, 1000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, [refresh, authChecked]);

  void tick; // referenced to prevent lint warnings about unused state

  function logout() { clearSession('kitchen'); router.replace('/kitchen/login'); }

  // ── Actions ───────────────────────────────────────────────────────────────
  function advanceOrder(order: Order) {
    const next =
      order.status === 'pending'   ? 'preparing' :
      order.status === 'preparing' ? 'prepared'  : null;
    if (!next) return;
    updateOrderStatus(order.id, next, session?.name || 'Kitchen');
    refresh();
  }

  function advanceItem(orderId: string, itemIndex: number) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const item = order.items?.[itemIndex];
    if (!item) return;

    const currentStatus = item.itemStatus || 'queued';
    const nextStatus: ItemStatus =
      currentStatus === 'queued' ? 'preparing' :
      currentStatus === 'preparing' ? 'prepared' : 'prepared';

    updateItemStatus(orderId, itemIndex, nextStatus, session?.name || 'Kitchen');
    refresh();
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const kitchenOrders = orders.filter(o =>
    ['pending', 'preparing', 'prepared'].includes(o.status),
  ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const shown = filter === 'all' ? kitchenOrders :
    filter === 'queued' ? kitchenOrders.filter(o => o.status === 'pending') :
    filter === 'cooking' ? kitchenOrders.filter(o => o.status === 'preparing') :
    kitchenOrders.filter(o => o.status === 'prepared');

  const queuedCount   = kitchenOrders.filter(o => o.status === 'pending').length;
  const cookingCount  = kitchenOrders.filter(o => o.status === 'preparing').length;
  const readyCount    = kitchenOrders.filter(o => o.status === 'prepared').length;

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
            { count: queuedCount,  color: '#f59e0b', label: 'Queued'  },
            { count: cookingCount, color: '#3b82f6', label: 'Cooking' },
            { count: readyCount,   color: '#8b5cf6', label: 'Ready'   },
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
          { key: 'all',     label: `🍳 All (${kitchenOrders.length})` },
          { key: 'queued',  label: `⏱ Queued (${queuedCount})`        },
          { key: 'cooking', label: `🔥 Cooking (${cookingCount})`     },
          { key: 'ready',   label: `✅ Ready (${readyCount})`         },
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
          const totalSecs    = Math.floor((Date.now() - new Date(order.timestamp).getTime()) / 1000);
          const mins         = Math.floor(totalSecs / 60);
          const secs         = totalSecs % 60;
          const timerLabel   = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
          const isUrgent     = mins > 25;
          const isHighPriority = mins > 15 && !isUrgent;
          const isDelivery   = order.type === 'delivery';

          // Check if this order's tab has requested the bill
          const billRequested = tabs.some(
            t => t.orderIds.includes(order.id) && t.tabStatus === 'awaiting_payment',
          );

          // Check total item quantity
          const totalItems = (order.items || []).reduce((sum, item) => sum + item.qty, 0);
          const isLargeOrder = totalItems > 4;

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
                  💳 BILL REQUESTED — Rush!
                </div>
              )}

              {/* Urgency badges */}
              {isUrgent && (
                <div style={{
                  background: '#ef4444', color: 'white',
                  padding: '0.2rem 0.75rem', fontSize: '0.7rem', fontWeight: 800, textAlign: 'center',
                }}>
                  🔥 URGENT — {mins}m waiting
                </div>
              )}
              {isHighPriority && !isUrgent && (
                <div style={{
                  background: '#f59e0b', color: 'white',
                  padding: '0.2rem 0.75rem', fontSize: '0.7rem', fontWeight: 800, textAlign: 'center',
                }}>
                  ⚠️ 15+ MIN — {mins}m waiting
                </div>
              )}

              {/* Large order badge */}
              {isLargeOrder && (
                <div style={{
                  background: '#06b6d4', color: 'white',
                  padding: '0.2rem 0.75rem', fontSize: '0.7rem', fontWeight: 800, textAlign: 'center',
                }}>
                  📦 LARGE ORDER
                </div>
              )}
              {/* Delivery badge */}
              {isDelivery && (
                <div style={{
                  background: '#2563eb', color: 'white',
                  padding: '0.2rem 0.75rem', fontSize: '0.7rem', fontWeight: 800, textAlign: 'center',
                }}>
                  🛵 DELIVERY — {order.deliveryAddress ? order.deliveryAddress.slice(0, 30) + (order.deliveryAddress.length > 30 ? '…' : '') : 'Address on file'}
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
                    <div style={{
                      fontSize: '0.75rem', marginTop: '0.2rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums',
                      color: isUrgent ? '#ef4444' : isHighPriority ? '#f59e0b' : '#888',
                    }}>
                      ⏱ {timerLabel}
                    </div>
                  </div>
                </div>

                {/* Items with item-level status */}
                <div style={{ borderTop: '1px solid #2a2a2a', paddingTop: '0.5rem', marginBottom: '0.6rem' }}>
                  {(order.items || []).map((item, i) => {
                    const itemStatus = item.itemStatus || 'queued';
                    const isItemPrepared = itemStatus === 'prepared';

                    return (
                      <div key={i} style={{ marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1 }}>
                            <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#ccc' }}>{item.name}</span>
                            <span style={{ color: '#F9A826', fontWeight: 800, fontSize: '0.75rem' }}>×{item.qty}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                            {itemStatus === 'queued' && (
                              <>
                                <div style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: 6, background: '#66666640', color: '#999' }}>
                                  Queued
                                </div>
                                <button
                                  onClick={() => advanceItem(order.id, i)}
                                  style={{ ...btn('#3b82f6'), fontSize: '0.65rem', padding: '0.25rem 0.5rem', borderRadius: 6 }}
                                >
                                  ▶ Start
                                </button>
                              </>
                            )}
                            {itemStatus === 'preparing' && (
                              <>
                                <div style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: 6, background: '#3b82f640', color: '#60a5fa' }}>
                                  Cooking
                                </div>
                                <button
                                  onClick={() => advanceItem(order.id, i)}
                                  style={{ ...btn('#10b981'), fontSize: '0.65rem', padding: '0.25rem 0.5rem', borderRadius: 6 }}
                                >
                                  ✅ Done
                                </button>
                              </>
                            )}
                            {itemStatus === 'prepared' && (
                              <div style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: 6, background: '#8b5cf640', color: '#a78bfa' }}>
                                Ready
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Order-level action button */}
                {nextAction && (
                  <button
                    onClick={() => advanceOrder(order)}
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
