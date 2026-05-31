'use client';

export const dynamic = 'force-dynamic';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  getDeliveryQueue, markOrderPickedUp, markOrderDelivered, Order,
  getActiveIssues, startReserving, OrderIssue,
} from '@/lib/api';
import { useRealtime } from '@/lib/realtime-client';
import { getSession, clearSession, AuthSession } from '@/lib/auth';

const STATUS_LABEL: Record<string, string> = {
  prepared:           '✅ Ready for Pickup',
  served:             '🔄 Re-Dispatch Ready',  // re-serve scenario: food ready, dispatch again
  out_for_delivery:   '🛵 Out for Delivery',
  delivered:          '📦 Delivered',
  re_serve_required:  '🚨 Re-Delivery Required',
};
const STATUS_COLOR: Record<string, string> = {
  prepared:           '#16a34a',
  served:             '#16a34a',               // same green — ready state
  out_for_delivery:   '#2563eb',
  delivered:          '#8b5cf6',
  re_serve_required:  '#dc2626',
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });
}
function elapsedMins(iso: string, nowMs: number) {
  return Math.floor((nowMs - new Date(iso).getTime()) / 60000);
}

export default function DeliveryPage() {
  const router = useRouter();
  const [session, setSession]         = useState<AuthSession | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [orders, setOrders]               = useState<Order[]>([]);
  const [reDeliveryIssues, setReDeliveryIssues] = useState<OrderIssue[]>([]);
  const [nowMs, setNowMs]                 = useState(() => Date.now());
  const [filter, setFilter]               = useState<'all' | 'ready' | 'enroute' | 'done' | 'redeliver'>('all');
  const [confirmPick,   setConfirmPick]   = useState<string | null>(null);
  const [confirmDeliv,  setConfirmDeliv]  = useState<string | null>(null);
  const [confirmRedeliv, setConfirmRedeliv] = useState<string | null>(null);  // issueId
  const [actionMsg, setActionMsg]         = useState('');
  const [expandedId, setExpandedId]       = useState<string | null>(null);
  const [fetchError, setFetchError]       = useState('');

  useEffect(() => {
    const s = getSession('delivery');
    if (!s) { router.replace('/delivery/login'); return; }
    setSession(s);
    setAuthChecked(true);
  }, [router]);

  const refresh = useCallback(async () => {
    try {
      setFetchError('');
      const [deliveryOrders, issues] = await Promise.all([
        getDeliveryQueue(),
        getActiveIssues(),
      ]);
      setOrders(deliveryOrders);
      // Only delivery-related issues (orders that are in re_serve_required for delivery orders)
      setReDeliveryIssues(issues);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load delivery orders';
      setFetchError(msg);
      console.error('[delivery] refresh error:', e);
    }
  }, []);

  useRealtime(
    process.env.NEXT_PUBLIC_RESTAURANT_ID ?? 'rest_default',
    {
      order_ready:              () => { refresh(); }, // kitchen marked prepared — show in ready list
      order_served:             () => { refresh(); }, // backward compat (old flow)
      order_out_for_delivery:   () => { refresh(); }, // waiter handed off — show in en route
      order_delivered:          () => { refresh(); }, // delivery person marked delivered
      order_status_changed:     () => { refresh(); }, // catch-all (fired on every status change)
      order_issue_reported:     () => { refresh(); }, // customer reported not received → re_serve_required
      order_issue_escalated:    () => { refresh(); }, // issue auto-escalated to manager
      order_issue_resolved:     () => { refresh(); }, // issue resolved after re-delivery
      // ── Re-delivery dispatched (waiter OR delivery portal clicked Re-Deliver) ──
      // Fires when startReserving() moves the order to out_for_delivery.
      // Without this listener, the "Re-Deliver" card disappears from the UI
      // (optimistic filter) but the "En Route" card only appears after next poll.
      order_issue_reserving:    () => { refresh(); },
    },
  );

  useEffect(() => {
    if (!authChecked) return;
    refresh();
    const t1 = setInterval(refresh, 5000);
    const t2 = setInterval(() => setNowMs(Date.now()), 1000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, [refresh, authChecked]);

  void nowMs; // used indirectly via elapsedMins(iso, nowMs)

  async function doPickup(orderId: string) {
    const deliveryName = session?.name || 'Delivery';
    try {
      await markOrderPickedUp(orderId, deliveryName);
      setActionMsg('✅ Order picked up — head to customer!');
      setTimeout(() => setActionMsg(''), 3000);
      setConfirmPick(null);
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[delivery] markPickedUp failed:', err);
      setActionMsg(`⚠️ Could not pick up order: ${msg}. Please try again.`);
      setTimeout(() => setActionMsg(''), 5000);
      setConfirmPick(null);
    }
  }

  async function doDelivered(orderId: string) {
    try {
      await markOrderDelivered(orderId, session?.name || 'Delivery');
      setActionMsg('📦 Marked as delivered — customer will confirm.');
      setTimeout(() => setActionMsg(''), 3000);
      setConfirmDeliv(null);
      await refresh();
    } catch (e) { console.error(e); }
  }

  async function doReDeliver(issueId: string) {
    try {
      await startReserving(issueId, session?.name || 'Delivery');
      setReDeliveryIssues(prev => prev.filter(i => i.id !== issueId));
      setConfirmRedeliv(null);
      setActionMsg('🛵 Re-delivery dispatched — order is now En Route. Go deliver it and mark as Delivered!');
      setTimeout(() => setActionMsg(''), 5000);
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setActionMsg(`⚠️ Could not start re-delivery: ${msg}`);
      setTimeout(() => setActionMsg(''), 5000);
      setConfirmRedeliv(null);
    }
  }

  // 'served' = waiter handed it to delivery person (same pickup action as 'prepared')
  const ready      = orders.filter(o => o.status === 'prepared' || o.status === 'served');
  const enroute    = orders.filter(o => o.status === 'out_for_delivery');
  const done       = orders.filter(o => o.status === 'delivered');
  const reDeliver  = orders.filter(o => o.status === 're_serve_required');

  const shown =
    filter === 'ready'     ? ready     :
    filter === 'enroute'   ? enroute   :
    filter === 'done'      ? done      :
    filter === 'redeliver' ? reDeliver :
    orders;

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
              { label: 'Ready',      count: ready.length,     color: '#16a34a' },
              { label: 'En Route',   count: enroute.length,   color: '#2563eb' },
              { label: 'Delivered',  count: done.length,      color: '#8b5cf6' },
              { label: 'Re-Deliver', count: reDeliver.length, color: '#dc2626' },
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

      {/* Action message */}
      {actionMsg && (
        <div style={{ background: '#dcfce7', borderBottom: '2px solid #16a34a', padding: '0.6rem 1.25rem', fontWeight: 700, fontSize: '0.82rem', color: '#16a34a' }}>
          {actionMsg}
        </div>
      )}

      {/* Re-delivery alert banner */}
      {reDeliver.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg,#dc2626,#b91c1c)', color: 'white',
          padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem',
        }}>
          <div style={{ fontWeight: 800, fontSize: '0.92rem' }}>
            🚨 {reDeliver.length} ORDER{reDeliver.length > 1 ? 'S' : ''} NEED RE-DELIVERY!
          </div>
          <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
            Customer reported not received — re-deliver immediately
          </div>
          <button
            onClick={() => setFilter('redeliver')}
            style={{ background: 'white', color: '#dc2626', border: 'none', borderRadius: 8, padding: '0.3rem 0.85rem', cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem', fontFamily: 'Poppins,sans-serif' }}
          >
            View Orders →
          </button>
        </div>
      )}

      {/* Filter row */}
      <div style={{ padding: '0.6rem 1.25rem', display: 'flex', gap: '0.4rem', overflowX: 'auto' }}>
        {[
          { key: 'all',       label: `🛵 All (${orders.length})`                },
          { key: 'ready',     label: `✅ Ready (${ready.length})`               },
          { key: 'enroute',   label: `🏃 En Route (${enroute.length})`          },
          { key: 'done',      label: `📦 Delivered (${done.length})`            },
          { key: 'redeliver', label: `🚨 Re-Deliver (${reDeliver.length})`      },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as typeof filter)}
            style={{
              padding: '0.28rem 0.8rem', borderRadius: 20, cursor: 'pointer', whiteSpace: 'nowrap',
              fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: '0.75rem',
              border: `2px solid ${filter === f.key ? (f.key === 'redeliver' ? '#dc2626' : '#0f172a') : '#ddd'}`,
              background: filter === f.key ? (f.key === 'redeliver' ? '#dc2626' : '#0f172a') : 'white',
              color: filter === f.key ? 'white' : (f.key === 'redeliver' && reDeliver.length > 0 ? '#dc2626' : '#666'),
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
            {filter === 'ready'     ? 'No orders ready for pickup yet.' :
             filter === 'enroute'   ? 'No orders currently en route.' :
             filter === 'done'      ? 'No deliveries completed yet today.' :
             filter === 'redeliver' ? 'No re-delivery orders right now.' :
             'No delivery orders right now.'}
          </div>
        </div>
      )}

      {/* Order cards */}
      <div style={{ padding: '0.5rem 1rem 5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: '0.85rem' }}>
        {shown.map(order => {
          const elapsed      = elapsedMins(order.timestamp, nowMs);
          const isUrgent     = (order.status === 'prepared' || order.status === 'served') && elapsed > 15;
          const isReDeliver  = order.status === 're_serve_required';
          const events       = (order.timeline ?? []) as { eventType: string; by?: string; at?: string }[];
          const latestEv     = events[events.length - 1];
          const trackUrl     = order.trackingToken ? `/track?id=${order.id}&token=${order.trackingToken}` : '';
          const claimedByOther = false; // field not in Supabase schema

          // Find matching issue for re-delivery orders
          const matchingIssue = reDeliveryIssues.find(i => i.orderId === order.id);

          return (
            <div
              key={order.id}
              style={{
                background: 'white', borderRadius: 14, overflow: 'hidden',
                boxShadow: isReDeliver ? '0 4px 20px rgba(220,38,38,0.25)' : '0 2px 10px rgba(0,0,0,0.08)',
                border: `2px solid ${isReDeliver ? '#dc2626' : isUrgent ? '#ef4444' : (STATUS_COLOR[order.status] || '#e2e8f0')}`,
              }}
            >
              {/* Re-delivery banner — highest priority */}
              {isReDeliver && (
                <div style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)', color: 'white', padding: '0.35rem 1rem', fontSize: '0.75rem', fontWeight: 800, textAlign: 'center' }}>
                  🚨 CUSTOMER REPORTED NOT RECEIVED — RE-DELIVER NOW
                  {matchingIssue?.escalated && <span style={{ marginLeft: '0.5rem', background: '#7f1d1d', borderRadius: 4, padding: '0.1rem 0.4rem', fontSize: '0.65rem' }}>⬆ ESCALATED</span>}
                </div>
              )}
              {/* Claimed-by-other banner */}
              {claimedByOther && !isReDeliver && (
                <div style={{ background: '#7c3aed', color: 'white', padding: '0.2rem 1rem', fontSize: '0.7rem', fontWeight: 800, textAlign: 'center' }}>
                  🔒 Claimed by another delivery person
                </div>
              )}
              {/* Urgent banner */}
              {isUrgent && !claimedByOther && !isReDeliver && (
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

                {/* Payment info + delivery tracking */}
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '0.7rem' }}>
                  💳 Payment: <strong>{order.payment?.toUpperCase() || 'COD'}</strong>
                  {order.deliveryPerson && (
                    <span> · 🛵 {order.deliveryPerson}</span>
                  )}
                  {order.assignedAt && (
                    <span> · 📌 Assigned {fmtTime(order.assignedAt)}</span>
                  )}
                  {order.deliveredAt && (
                    <span> · ✅ Delivered {fmtTime(order.deliveredAt)}</span>
                  )}
                </div>

                {/* Latest event */}
                {latestEv && (
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginBottom: '0.7rem' }}>
                    Last: <strong>{latestEv.eventType}</strong>{latestEv.by ? ` by ${latestEv.by}` : ''}{latestEv.at ? ` · ${fmtTime(latestEv.at)}` : ''}
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
                {(order.status === 'prepared' || order.status === 'served') && (
                  claimedByOther ? (
                    <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 10, padding: '0.6rem', textAlign: 'center', fontSize: '0.78rem', color: '#7c3aed', fontWeight: 700 }}>
                      🔒 Being picked up
                    </div>
                  ) : confirmPick === order.id ? (
                    <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '0.65rem', border: '1px solid #86efac' }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#15803d', marginBottom: '0.4rem' }}>
                        {order.status === 'served'
                          ? 'Re-dispatch this order to customer?'
                          : 'Confirm pickup from kitchen?'}
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button onClick={() => doPickup(order.id)} style={{ ...btn('#16a34a'), flex: 1 }}>
                          {order.status === 'served' ? '🛵 Yes, Re-Dispatching' : '✅ Yes, Picked Up'}
                        </button>
                        <button onClick={() => setConfirmPick(null)} style={{ ...btn('#e5e7eb', '#555'), flex: 1 }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmPick(order.id)} style={{ ...btn(order.status === 'served' ? '#2563eb' : '#16a34a'), width: '100%', padding: '0.65rem', borderRadius: 10, fontSize: '0.88rem' }}>
                      {order.status === 'served' ? '🛵 Re-Dispatch Order' : '📦 Pick Up Order'}
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

                {/* Re-delivery action */}
                {isReDeliver && matchingIssue && (
                  confirmRedeliv === matchingIssue.id ? (
                    <div style={{ background: '#fef2f2', borderRadius: 10, padding: '0.65rem', border: '2px solid #fecaca' }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#dc2626', marginBottom: '0.3rem' }}>
                        🚨 Confirm re-delivery to customer?
                      </div>
                      {matchingIssue.retryCount > 1 && (
                        <div style={{ fontSize: '0.7rem', color: '#7f1d1d', marginBottom: '0.4rem' }}>
                          ⚠️ This is attempt #{matchingIssue.retryCount} for this order
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button onClick={() => doReDeliver(matchingIssue.id)} style={{ ...btn('#dc2626'), flex: 1 }}>🛵 Yes, Re-Delivering</button>
                        <button onClick={() => setConfirmRedeliv(null)} style={{ ...btn('#e5e7eb', '#555'), flex: 1 }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#7f1d1d', marginBottom: '0.4rem', fontWeight: 600 }}>
                        Reported by: {matchingIssue.reportedBy} · Attempt #{matchingIssue.retryCount}
                        {matchingIssue.escalated && <span style={{ marginLeft: '0.4rem', color: '#dc2626', fontWeight: 800 }}>⬆ ESCALATED TO MANAGER</span>}
                      </div>
                      <button
                        onClick={() => setConfirmRedeliv(matchingIssue.id)}
                        style={{ ...btn('#dc2626'), width: '100%', padding: '0.65rem', borderRadius: 10, fontSize: '0.88rem' }}
                      >
                        🛵 Re-Deliver Now
                      </button>
                    </div>
                  )
                )}

                {/* Re-delivery order with no matching issue (issue may be in 'reserving' state) */}
                {isReDeliver && !matchingIssue && (
                  <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: '0.6rem', textAlign: 'center', fontSize: '0.78rem', color: '#c2410c', fontWeight: 700 }}>
                    🔄 Re-delivery in progress by another team member
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
