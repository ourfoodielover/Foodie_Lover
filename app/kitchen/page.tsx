'use client';

export const dynamic = 'force-dynamic';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  getOrders, updateOrderStatus, updateItemStatus, Order,
} from '@/lib/api';
import { useRealtime } from '@/lib/realtime-client';
import { getSession, clearSession, AuthSession } from '@/lib/auth';

const STATUS_COLOR: Record<string, string> = {
  pending: '#f59e0b', preparing: '#3b82f6', prepared: '#8b5cf6',
};
const STATUS_LABEL: Record<string, string> = {
  pending: 'Queued', preparing: 'Preparing', prepared: 'Ready',
};

// ── Web Audio alert (no external file needed) ─────────────────────────────────
function playOrderAlert() {
  try {
    const ctx  = new AudioContext();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    // Two-tone beep
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch { /* AudioContext not available (SSR) */ }
}

export default function KitchenPage() {
  const router = useRouter();
  const [session, setSession]         = useState<AuthSession | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [orders, setOrders]           = useState<Order[]>([]);
  const [clock, setClock]             = useState('');
  const [tick, setTick]               = useState(0);
  const [filter, setFilter]           = useState<'all' | 'queued' | 'cooking' | 'ready'>('all');
  const [flashIds, setFlashIds]       = useState<Set<string>>(new Set());
  const [fetchError, setFetchError]   = useState('');

  // Track which order IDs we've already alerted about
  const seenOrderIds = useRef<Set<string>>(new Set());

  // ── Auth ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const s = getSession('kitchen');
    if (!s) { router.replace('/kitchen/login'); return; }
    setSession(s);
    setAuthChecked(true);
  }, [router]);

  // ── Data refresh ────────────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    try {
      setFetchError('');
      // Only fetch active kitchen-relevant orders — never pull completed/cancelled history
      const all = await getOrders({ activeOnly: true, limit: 100 });
      setOrders(all);

      // Detect new orders → play sound + flash
      const kitchenOrders = all.filter(o => ['pending','preparing','prepared'].includes(o.status));
      const newIds: string[] = [];
      for (const o of kitchenOrders) {
        if (!seenOrderIds.current.has(o.id)) {
          seenOrderIds.current.add(o.id);
          newIds.push(o.id);
        }
      }
      if (newIds.length > 0 && seenOrderIds.current.size > newIds.length) {
        // Only alert after first load (seenIds already had some)
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
        }, 2000);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load orders';
      setFetchError(msg);
      console.error('[kitchen] refresh error:', e);
    }
  }, []);

  useEffect(() => {
    if (!authChecked) return;
    // Initial load — populate seenIds without alerting
    getOrders({ activeOnly: true, limit: 100 }).then(all => {
      const kitchenOrders = all.filter(o => ['pending','preparing','prepared'].includes(o.status));
      kitchenOrders.forEach(o => seenOrderIds.current.add(o.id));
      setOrders(all);
    });
    const t1 = setInterval(refresh, 5000);
    const t2 = setInterval(() => {
      setClock(new Date().toLocaleTimeString());
      setTick(n => n + 1);
    }, 1000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, [refresh, authChecked]);

  void tick;

  // ── Socket.io real-time ─────────────────────────────────────────────────────
  useRealtime(
    process.env.NEXT_PUBLIC_RESTAURANT_ID ?? 'rest_default',
    {
      order_created: () => { refresh(); },
      order_status_changed: () => { refresh(); },
    },
  );

  function logout() { clearSession('kitchen'); router.replace('/kitchen/login'); }

  // ── Actions ─────────────────────────────────────────────────────────────────
  async function advanceOrder(order: Order) {
    const next =
      order.status === 'pending'   ? 'preparing' :
      order.status === 'preparing' ? 'prepared'  : null;
    if (!next) return;
    try {
      await updateOrderStatus(order.id, next, session?.name || 'Kitchen');
      await refresh();
    } catch (e) { console.error(e); }
  }

  async function advanceItem(orderId: string, itemIndex: number) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const item = order.items?.[itemIndex];
    if (!item) return;
    const cur   = item.itemStatus || 'queued';
    const next  = cur === 'queued' ? 'preparing' : 'prepared';
    try {
      await updateItemStatus(orderId, itemIndex, next);
      await refresh();
    } catch (e) { console.error(e); }
  }

  // ── Derived ─────────────────────────────────────────────────────────────────
  const kitchenOrders = orders
    .filter(o => ['pending', 'preparing', 'prepared'].includes(o.status))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const shown =
    filter === 'all'     ? kitchenOrders :
    filter === 'queued'  ? kitchenOrders.filter(o => o.status === 'pending') :
    filter === 'cooking' ? kitchenOrders.filter(o => o.status === 'preparing') :
    kitchenOrders.filter(o => o.status === 'prepared');

  const queuedCount  = kitchenOrders.filter(o => o.status === 'pending').length;
  const cookingCount = kitchenOrders.filter(o => o.status === 'preparing').length;
  const readyCount   = kitchenOrders.filter(o => o.status === 'prepared').length;

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

      {/* Keyframe animation for flash — injected via style tag */}
      <style>{`
        @keyframes kitchenFlash {
          0%,100% { box-shadow: 0 0 0 rgba(249,168,38,0); }
          25%,75%  { box-shadow: 0 0 24px rgba(249,168,38,0.8); border-color: #F9A826 !important; }
        }
        .new-order-flash { animation: kitchenFlash 0.5s ease-in-out 3; }
      `}</style>

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

      {/* Error banner */}
      {fetchError && (
        <div style={{
          background: '#fef2f2', border: '2px solid #fecaca',
          borderRadius: 10, padding: '0.75rem 1.25rem',
          margin: '0.5rem 1rem', display: 'flex',
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
          >{f.label}</button>
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
          const elapsed    = Date.now() - new Date(order.timestamp).getTime();
          const totalSecs  = Math.floor(elapsed / 1000);
          const mins       = Math.floor(totalSecs / 60);
          const secs       = totalSecs % 60;
          const timerLabel = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;

          // Timer color: 0–5 min → green, 5–10 min → yellow, 10+ → red
          const timerColor  = mins >= 10 ? '#ef4444' : mins >= 5 ? '#f59e0b' : '#22c55e';
          const isUrgent    = mins >= 10;
          const isWarning   = mins >= 5 && !isUrgent;
          const isFlashing  = flashIds.has(order.id);
          const isDelivery  = order.type === 'delivery';
          const isPickup    = order.type === 'pickup';
          const totalItems  = (order.items || []).reduce((s, i) => s + i.qty, 0);

          const nextAction =
            order.status === 'pending'   ? { label: '🔥 Start Cooking', bg: '#3b82f6' } :
            order.status === 'preparing' ? { label: '✅ Mark Ready',     bg: '#8b5cf6' } :
            null;

          return (
            <div
              key={order.id}
              className={isFlashing ? 'new-order-flash' : undefined}
              style={{
                background:   '#1e1e1e',
                borderRadius: 14,
                overflow:     'hidden',
                border:       `2px solid ${isUrgent ? '#ef4444' : STATUS_COLOR[order.status] || '#333'}`,
                boxShadow:    isUrgent ? '0 0 16px rgba(239,68,68,0.3)' : '0 2px 8px rgba(0,0,0,0.3)',
                transition:   'border-color 0.3s',
              }}
            >
              {/* Urgency strip */}
              {isUrgent && (
                <div style={{ background: '#ef4444', color: 'white', padding: '0.2rem 0.75rem', fontSize: '0.7rem', fontWeight: 800, textAlign: 'center' }}>
                  🔥 URGENT — {mins}m elapsed
                </div>
              )}
              {isWarning && (
                <div style={{ background: '#f59e0b', color: 'white', padding: '0.2rem 0.75rem', fontSize: '0.7rem', fontWeight: 800, textAlign: 'center' }}>
                  ⚠️ {mins}m elapsed — Please hurry!
                </div>
              )}
              {isDelivery && (
                <div style={{ background: '#2563eb', color: 'white', padding: '0.2rem 0.75rem', fontSize: '0.7rem', fontWeight: 800, textAlign: 'center' }}>
                  🛵 DELIVERY — Goes out with delivery person
                </div>
              )}
              {isPickup && (
                <div style={{ background: '#16a34a', color: 'white', padding: '0.2rem 0.75rem', fontSize: '0.7rem', fontWeight: 800, textAlign: 'center' }}>
                  🏪 PICKUP — Customer collects at counter
                </div>
              )}
              {totalItems > 4 && (
                <div style={{ background: '#06b6d4', color: 'white', padding: '0.2rem 0.75rem', fontSize: '0.7rem', fontWeight: 800, textAlign: 'center' }}>
                  📦 LARGE ORDER ({totalItems} items)
                </div>
              )}
              {isFlashing && (
                <div style={{ background: '#F9A826', color: '#1A0800', padding: '0.2rem 0.75rem', fontSize: '0.7rem', fontWeight: 800, textAlign: 'center' }}>
                  🆕 NEW ORDER ARRIVED!
                </div>
              )}

              <div style={{ padding: '0.75rem 1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: '1rem', color: '#F9A826' }}>
                      #{order.orderNum || order.id.slice(-4)}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#888', marginTop: '0.1rem' }}>
                      {order.customerName}{order.tableId ? ` · ${order.tableId}` : ''}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.55rem', borderRadius: 10, background: (STATUS_COLOR[order.status] || '#333') + '30', color: STATUS_COLOR[order.status] || '#888' }}>
                      {STATUS_LABEL[order.status] || order.status}
                    </div>
                    <div style={{ fontSize: '0.75rem', marginTop: '0.2rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: timerColor }}>
                      ⏱ {timerLabel}
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div style={{ borderTop: '1px solid #2a2a2a', paddingTop: '0.5rem', marginBottom: '0.6rem' }}>
                  {(order.items || []).map((item, i) => {
                    const iStatus  = item.itemStatus || 'queued';
                    return (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1 }}>
                          <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#ccc' }}>{item.name}</span>
                          <span style={{ color: '#F9A826', fontWeight: 800, fontSize: '0.75rem' }}>×{item.qty}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                          {iStatus === 'queued' && (<>
                            <span style={{ fontSize: '0.62rem', padding: '0.1rem 0.4rem', borderRadius: 6, background: '#66666640', color: '#999' }}>Queued</span>
                            <button onClick={() => advanceItem(order.id, i)} style={{ ...btn('#3b82f6'), fontSize: '0.62rem', padding: '0.2rem 0.5rem', borderRadius: 6 }}>▶</button>
                          </>)}
                          {iStatus === 'preparing' && (<>
                            <span style={{ fontSize: '0.62rem', padding: '0.1rem 0.4rem', borderRadius: 6, background: '#3b82f640', color: '#60a5fa' }}>Cooking</span>
                            <button onClick={() => advanceItem(order.id, i)} style={{ ...btn('#10b981'), fontSize: '0.62rem', padding: '0.2rem 0.5rem', borderRadius: 6 }}>✅</button>
                          </>)}
                          {iStatus === 'prepared' && (
                            <span style={{ fontSize: '0.62rem', padding: '0.1rem 0.4rem', borderRadius: 6, background: '#8b5cf640', color: '#a78bfa' }}>Ready</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Action button */}
                {nextAction && (
                  <button onClick={() => advanceOrder(order)} style={{ ...btn(nextAction.bg), width: '100%', padding: '0.55rem', borderRadius: 10, fontSize: '0.82rem' }}>
                    {nextAction.label}
                  </button>
                )}
                {order.status === 'prepared' && (
                  <div style={{
                    background: isDelivery ? '#2563eb20' : isPickup ? '#16a34a20' : '#8b5cf620',
                    border: `1px solid ${isDelivery ? '#2563eb40' : isPickup ? '#16a34a40' : '#8b5cf640'}`,
                    borderRadius: 10, padding: '0.45rem', textAlign: 'center', fontSize: '0.78rem',
                    color: isDelivery ? '#2563eb' : isPickup ? '#16a34a' : '#a78bfa', fontWeight: 700,
                  }}>
                    {isDelivery ? '🛵 Ready — Waiter: tap Hand to Delivery'
                     : isPickup  ? '🏪 Ready — Notify customer to collect at counter'
                     : '✅ Ready — Waiting for waiter to serve'}
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
