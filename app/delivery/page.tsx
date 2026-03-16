'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  getDeliveryQueue, markOrderPickedUp, markOrderDelivered, claimDeliveryOrder,
  getEventsForOrder, getTrackingUrl, Order,
} from '@/lib/storage';
import { getSession, clearSession, AuthSession } from '@/lib/auth';

const STATUS_LABEL: Record<string, string> = {
  prepared:         '✅ Ready for Pickup',
  out_for_delivery: '🛵 Out for Delivery',
  delivered:        '📦 Delivered',
};
const STATUS_COLOR: Record<string, string> = {
  prepared:         '#16a34a',
  out_for_delivery: '#2563eb',
  delivered:        '#8b5cf6',
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}
function elapsedMins(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
}

export default function DeliveryPage() {
  const router = useRouter();
  const [session, setSession]         = useState<AuthSession | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [orders, setOrders]           = useState<Order[]>([]);
  const [tick, setTick]               = useState(0);
  const [filter, setFilter]           = useState<'all' | 'ready' | 'enroute' | 'done'>('all');
  const [confirmPick,   setConfirmPick]   = useState<string | null>(null);
  const [confirmDeliv,  setConfirmDeliv]  = useState<string | null>(null);
  const [actionMsg, setActionMsg]     = useState('');
  const [expandedId, setExpandedId]   = useState<string | null>(null);

  useEffect(() => {
    const s = getSession('delivery');
    if (!s) { router.replace('/delivery/login'); return; }
    setSession(s);
    setAuthChecked(true);
  }, [router]);

  const refresh = useCallback(() => setOrders(getDeliveryQueue()), []);

  useEffect(() => {
    if (!authChecked) return;
    refresh();
    const t1 = setInterval(refresh, 3000);
    const t2 = setInterval(() => setTick(n => n + 1), 1000); // live timers
    return () => { clearInterval(t1); clearInterval(t2); };
  }, [refresh, authChecked]);

  void tick; // used to force re-render for live timers

  function doPickup(orderId: string) {
    const deliveryName = session?.name || 'Delivery';
    // Atomic claim prevents two delivery users picking the same order simultaneously
    const claimed = claimDeliveryOrder(orderId, deliveryName);
    if (!claimed) {
      // Another delivery person already claimed this order
      setActionMsg('⚠️ This order was just picked up by another delivery person. Please take the next one.');
      setTimeout(() => setActionMsg(''), 4000);
      setConfirmPick(null);
      refresh();
      return;
    }
    const ok = markOrderPickedUp(orderId, deliveryName);
    if (ok) {
      setActionMsg('✅ Order picked up — head to customer!');
      setTimeout(() => setActionMsg(''), 3000);
      setConfirmPick(null);
      refresh();
    }
  }

  function doDelivered(orderId: string) {
    const ok = markOrderDelivered(orderId, session?.name || 'Delivery');
    if (ok) {
      setActionMsg('📦 Marked as delivered — customer will confirm.');
      setTimeout(() => setActionMsg(''), 3000);
      setConfirmDeliv(null);
      refresh();
    }
  }

  const ready   = orders.filter(o => o.status === 'prepared');
  const enroute = orders.filter(o => o.status === 'out_for_delivery');
  const done    = orders.filter(o => o.status === 'delivered');

  const shown =
    filter === 'ready'  ? ready   :
    filter === 'enroute'? enroute :
    filter === 'done'   ? done    : orders;

  const btn = (bg = '#0f172a', c = 'white'): React.CSSProperties => ({
    background: bg, color: c, border: 'none', borderRadius: 8, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'Poppins,sans-serif', padding: '0.45rem 0.9rem', fontSize: '0.8rem',
  });

  if (!authChecked) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontFamily: 'Poppins,sans-serif' }}>
        <div style={{ textAlign: 'center' }}><div style={{ fontSize: '2.5rem' }}>🛵</div><div style={{ marginTop: '0.5rem' }}>Loading…</div></div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#f0f9ff,#e0f2fe)', fontFamily: 'Poppins,sans-serif' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#0f172a,#1e293b)', color: 'white', padding: '0.9rem 1.25rem', position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span style={{ fontSize: '1.6rem' }}>🛵</span>
            <div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.1rem', fontWeight: 900 }}>Delivery Dashboard</div>
              <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{session?.name} • Foodie Lover</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {[
              { label: 'Ready',    count: ready.length,   color: '#16a34a' },
              { label: 'En Route', count: enroute.length, color: '#2563eb' },
              { label: 'Delivered',count: done.length,    color: '#8b5cf6' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center', minWidth: 38 }}>
                <div style={{ fontSize: '1rem', fontWeight: 900, color: s.color }}>{s.count}</div>
                <div style={{ fontSize: '0.55rem', color: '#64748b' }}>{s.label}</div>
              </div>
            ))}
            <button onClick={() => { clearSession('delivery'); router.replace('/delivery/login'); }} style={{ ...btn('#ffffff15', '#aaa'), border: '1px solid #334155', fontSize: '0.72rem' }}>
              🚪 End Shift
            </button>
          </div>
        </div>
      </div>

      {/* Action message */}
      {actionMsg && (
        <div style={{ background: '#dcfce7', borderBottom: '2px solid #16a34a', padding: '0.6rem 1.25rem', fontWeight: 700, fontSize: '0.82rem', color: '#16a34a' }}>
          {actionMsg}
        </div>
      )}

      {/* Filter row */}
      <div style={{ padding: '0.6rem 1.25rem', display: 'flex', gap: '0.4rem', overflowX: 'auto' }}>
        {[
          { key: 'all',     label: `🛵 All (${orders.length})`         },
          { key: 'ready',   label: `✅ Ready (${ready.length})`        },
          { key: 'enroute', label: `🏃 En Route (${enroute.length})`   },
          { key: 'done',    label: `📦 Delivered (${done.length})`     },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as typeof filter)}
            style={{
              padding: '0.28rem 0.8rem', borderRadius: 20, cursor: 'pointer', whiteSpace: 'nowrap',
              fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: '0.75rem',
              border: `2px solid ${filter === f.key ? '#0f172a' : '#ddd'}`,
              background: filter === f.key ? '#0f172a' : 'white',
              color: filter === f.key ? 'white' : '#666',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {!shown.length && (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#64748b' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎉</div>
          <div style={{ fontWeight: 700, fontSize: '1rem' }}>
            {filter === 'ready' ? 'No orders ready for pickup yet.' :
             filter === 'enroute' ? 'No orders currently en route.' :
             filter === 'done'    ? 'No deliveries completed yet today.' :
             'No delivery orders right now.'}
          </div>
        </div>
      )}

      {/* Order cards */}
      <div style={{ padding: '0.5rem 1rem 5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: '0.85rem' }}>
        {shown.map(order => {
          const elapsed  = elapsedMins(order.timestamp);
          const isUrgent = order.status === 'prepared' && elapsed > 15;
          const events   = getEventsForOrder(order.id);
          const latestEv = events[events.length - 1];
          const trackUrl = getTrackingUrl(order);
          // Race condition: another delivery person already claimed this order
          const claimedByOther = order.status === 'prepared' &&
            order.pickedByDeliveryId &&
            order.pickedByDeliveryId !== (session?.name || 'Delivery');

          return (
            <div
              key={order.id}
              style={{
                background: 'white', borderRadius: 14, overflow: 'hidden',
                boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
                border: `2px solid ${isUrgent ? '#ef4444' : (STATUS_COLOR[order.status] || '#e2e8f0')}`,
              }}
            >
              {/* Claimed-by-other banner */}
              {claimedByOther && (
                <div style={{ background: '#7c3aed', color: 'white', padding: '0.2rem 1rem', fontSize: '0.7rem', fontWeight: 800, textAlign: 'center' }}>
                  🔒 Claimed by {order.pickedByDeliveryId} — picking up now
                </div>
              )}
              {/* Urgent banner */}
              {isUrgent && !claimedByOther && (
                <div style={{ background: '#ef4444', color: 'white', padding: '0.2rem 1rem', fontSize: '0.7rem', fontWeight: 800, textAlign: 'center' }}>
                  ⚡ WAITING {elapsed}m — PICK UP NOW
                </div>
              )}

              <div style={{ padding: '0.9rem 1rem' }}>
                {/* Header row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: '1rem', color: '#0f172a' }}>
                      #{order.id.slice(-6)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.1rem' }}>
                      {order.customerName}
                      {order.phone && <span> · 📱 {order.phone}</span>}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '0.05rem' }}>
                      ⏱ {elapsed}m ago · Placed {fmtTime(order.timestamp)}
                    </div>
                  </div>
                  <span style={{
                    fontSize: '0.68rem', fontWeight: 700, padding: '0.18rem 0.55rem', borderRadius: 20,
                    background: (STATUS_COLOR[order.status] || '#e2e8f0') + '20',
                    color: STATUS_COLOR[order.status] || '#64748b',
                    border: `1px solid ${(STATUS_COLOR[order.status] || '#e2e8f0')}50`,
                  }}>
                    {STATUS_LABEL[order.status] || order.status}
                  </span>
                </div>

                {/* Delivery address */}
                {order.deliveryAddress && (
                  <div style={{ background: '#f0f9ff', borderRadius: 8, padding: '0.5rem 0.75rem', marginBottom: '0.6rem', fontSize: '0.78rem', color: '#0369a1' }}>
                    📍 <strong>Deliver to:</strong> {order.deliveryAddress}
                  </div>
                )}

                {/* Items */}
                <div
                  style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.5rem', marginBottom: '0.6rem', cursor: 'pointer' }}
                  onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                >
                  {expandedId === order.id ? (
                    <>
                      {(order.items || []).map((item, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '0.18rem 0', color: '#334155' }}>
                          <span>{item.name} <span style={{ color: '#0f172a', fontWeight: 700 }}>×{item.qty}</span></span>
                          <span style={{ color: '#16a34a', fontWeight: 700 }}>₹{item.subtotal}</span>
                        </div>
                      ))}
                      <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '0.35rem', paddingTop: '0.35rem', display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '0.88rem', color: '#0f172a' }}>
                        <span>Total</span><span style={{ color: '#16a34a' }}>₹{order.total}</span>
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{(order.items || []).reduce((s, i) => s + i.qty, 0)} items · ₹{order.total}</span>
                      <span style={{ color: '#94a3b8' }}>tap to expand ▾</span>
                    </div>
                  )}
                </div>

                {/* Payment info */}
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '0.7rem' }}>
                  💳 Payment: <strong>{order.payment?.toUpperCase() || 'COD'}</strong>
                  {order.deliveryPerson && order.status !== 'prepared' && (
                    <span> · 🛵 {order.deliveryPerson}</span>
                  )}
                </div>

                {/* Latest event */}
                {latestEv && (
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginBottom: '0.7rem' }}>
                    Last: <strong>{latestEv.eventType}</strong> by {latestEv.actor} · {fmtTime(latestEv.createdAt)}
                  </div>
                )}

                {/* Tracking link */}
                {trackUrl && (
                  <div style={{ fontSize: '0.7rem', marginBottom: '0.75rem' }}>
                    <a href={trackUrl} target="_blank" rel="noopener noreferrer"
                      style={{ color: '#2563eb', fontWeight: 700, textDecoration: 'none' }}>
                      🔗 Customer Tracking Page →
                    </a>
                  </div>
                )}

                {/* Action buttons */}
                {order.status === 'prepared' && (
                  claimedByOther ? (
                    <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 10, padding: '0.6rem', textAlign: 'center', fontSize: '0.78rem', color: '#7c3aed', fontWeight: 700 }}>
                      🔒 Being picked up by {order.pickedByDeliveryId}
                    </div>
                  ) : confirmPick === order.id ? (
                    <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '0.65rem', border: '1px solid #86efac' }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#15803d', marginBottom: '0.4rem' }}>
                        Confirm pickup from kitchen?
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button onClick={() => doPickup(order.id)} style={{ ...btn('#16a34a'), flex: 1 }}>✅ Yes, Picked Up</button>
                        <button onClick={() => setConfirmPick(null)} style={{ ...btn('#e5e7eb', '#555'), flex: 1 }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmPick(order.id)} style={{ ...btn('#16a34a'), width: '100%', padding: '0.65rem', borderRadius: 10, fontSize: '0.88rem' }}>
                      📦 Pick Up Order
                    </button>
                  )
                )}

                {order.status === 'out_for_delivery' && (
                  confirmDeliv === order.id ? (
                    <div style={{ background: '#eff6ff', borderRadius: 10, padding: '0.65rem', border: '1px solid #bfdbfe' }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1d4ed8', marginBottom: '0.4rem' }}>
                        Confirm delivery to customer?
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button onClick={() => doDelivered(order.id)} style={{ ...btn('#2563eb'), flex: 1 }}>✅ Yes, Delivered</button>
                        <button onClick={() => setConfirmDeliv(null)} style={{ ...btn('#e5e7eb', '#555'), flex: 1 }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDeliv(order.id)} style={{ ...btn('#2563eb'), width: '100%', padding: '0.65rem', borderRadius: 10, fontSize: '0.88rem' }}>
                      🏠 Mark as Delivered
                    </button>
                  )
                )}

                {order.status === 'delivered' && (
                  <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 10, padding: '0.6rem', textAlign: 'center', fontSize: '0.78rem', color: '#7c3aed', fontWeight: 700 }}>
                    📦 Delivered — Waiting for customer confirmation on tracking page
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
