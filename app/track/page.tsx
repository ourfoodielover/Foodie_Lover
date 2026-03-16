'use client';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  verifyTrackingToken, getEventsForOrder, customerConfirmDelivery,
  Order, OrderEvent, OrderEventType,
} from '@/lib/storage';

// ─── Step definitions for each order type ────────────────────────────────────

interface TrackStep {
  eventType:  OrderEventType | 'OrderPlaced';
  label:      string;
  icon:       string;
  forTypes:   ('dine-in' | 'pickup' | 'delivery')[];
}

const STEPS: TrackStep[] = [
  { eventType: 'OrderPlaced',      label: 'Order Received',    icon: '📋', forTypes: ['dine-in','pickup','delivery'] },
  { eventType: 'KitchenAccepted',  label: 'Accepted by Kitchen', icon: '👨‍🍳', forTypes: ['dine-in','pickup','delivery'] },
  { eventType: 'Preparing',        label: 'Being Prepared',    icon: '🔥', forTypes: ['dine-in','pickup','delivery'] },
  { eventType: 'Prepared',         label: 'Ready',             icon: '✅', forTypes: ['dine-in','pickup','delivery'] },
  { eventType: 'Served',           label: 'Served to Table',   icon: '🍽️', forTypes: ['dine-in'] },
  { eventType: 'OrderPickedUp',    label: 'Picked Up',         icon: '📦', forTypes: ['pickup','delivery'] },
  { eventType: 'OutForDelivery',   label: 'Out for Delivery',  icon: '🛵', forTypes: ['delivery'] },
  { eventType: 'Delivered',        label: 'Delivered',         icon: '🏠', forTypes: ['delivery'] },
  { eventType: 'CustomerConfirmed',label: 'Order Confirmed',   icon: '🎉', forTypes: ['dine-in','pickup','delivery'] },
];

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

// ─── Inner component (uses useSearchParams — must be inside Suspense) ─────────

function TrackInner() {
  const params  = useSearchParams();
  const orderId = params.get('id')   || '';
  const token   = params.get('token')|| '';

  const [order, setOrder]           = useState<Order | null>(null);
  const [events, setEvents]         = useState<OrderEvent[]>([]);
  const [notFound, setNotFound]     = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed]   = useState(false);
  const [reportMsg, setReportMsg]   = useState('');
  const [tick, setTick]             = useState(0);

  const loadData = useCallback(() => {
    const o = verifyTrackingToken(orderId, token);
    if (!o) { setNotFound(true); return; }
    setOrder(o);
    setEvents(getEventsForOrder(orderId));
  }, [orderId, token]);

  useEffect(() => {
    if (!orderId || !token) { setNotFound(true); return; }
    loadData();
    const t1 = setInterval(loadData, 4000);
    const t2 = setInterval(() => setTick(n => n + 1), 1000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, [loadData, orderId, token]);

  void tick;

  function handleConfirm() {
    if (!orderId || !token) return;
    const ok = customerConfirmDelivery(orderId, token);
    if (ok) {
      setConfirmed(true);
      loadData();
    }
  }

  // ── Not found ──────────────────────────────────────────────────────────────
  if (notFound) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1.5rem', color: '#64748b' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
        <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.5rem' }}>Order not found</div>
        <div style={{ fontSize: '0.85rem' }}>The tracking link may be invalid or expired.</div>
        <a href="/online" style={{ display: 'inline-block', marginTop: '1.5rem', color: '#2563eb', fontWeight: 700, textDecoration: 'none' }}>
          ← Order Again
        </a>
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
        <div style={{ fontSize: '2rem' }}>⏳</div>
        <div style={{ marginTop: '0.5rem' }}>Loading your order…</div>
      </div>
    );
  }

  // ── Derive step completion from events ─────────────────────────────────────
  const eventTypes   = new Set(events.map(e => e.eventType));
  const orderType    = order.type as 'dine-in' | 'pickup' | 'delivery';
  const relevantSteps = STEPS.filter(s => s.forTypes.includes(orderType));

  // Current active step index
  let activeStepIdx = 0;
  for (let i = relevantSteps.length - 1; i >= 0; i--) {
    if (eventTypes.has(relevantSteps[i].eventType)) {
      activeStepIdx = i;
      break;
    }
  }

  const isDelivered   = order.status === 'delivered';
  const isCompleted   = order.status === 'completed';
  const isCancelled   = order.status === 'cancelled';
  const isOutForDeliv = order.status === 'out_for_delivery';

  const elapsedMins = Math.floor((Date.now() - new Date(order.timestamp).getTime()) / 60000);

  // Estimate remaining time
  const estMsg =
    order.status === 'pending' || order.status === 'preparing'
      ? 'Est. 20–30 min remaining'
      : order.status === 'prepared' && order.type !== 'delivery'
      ? 'Ready! Pickup from counter'
      : isOutForDeliv
      ? 'On the way! Arriving soon…'
      : isDelivered
      ? 'Arrived at your door!'
      : isCompleted
      ? 'Delivery confirmed ✓'
      : '';

  const accentColor = order.type === 'delivery' ? '#2563eb' : '#16a34a';

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#f0f9ff,#eff6ff)', fontFamily: 'Poppins,sans-serif' }}>

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg,${accentColor},${order.type === 'delivery' ? '#1d4ed8' : '#15803d'})`, color: 'white', padding: '1.25rem 1.5rem' }}>
        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.2rem', fontWeight: 900, marginBottom: '0.15rem' }}>
          🍽️ Foodie Lover — Order Tracking
        </div>
        <div style={{ fontSize: '0.78rem', opacity: 0.85 }}>
          Order #{order.id.slice(-6)} · {order.customerName}
        </div>
      </div>

      <div style={{ maxWidth: 500, margin: '0 auto', padding: '1.25rem' }}>

        {/* Status card */}
        <div style={{ background: 'white', borderRadius: 16, padding: '1.25rem', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', marginBottom: '1.25rem', borderTop: `4px solid ${isCancelled ? '#ef4444' : accentColor}` }}>
          {isCancelled ? (
            <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.4rem' }}>❌</div>
              <div style={{ fontWeight: 800, color: '#ef4444', fontSize: '1.1rem' }}>Order Cancelled</div>
              {order.cancelReason && <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.25rem' }}>Reason: {order.cancelReason}</div>}
            </div>
          ) : isCompleted ? (
            <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.4rem' }}>🎉</div>
              <div style={{ fontWeight: 800, color: accentColor, fontSize: '1.1rem' }}>
                {order.type === 'delivery' ? 'Delivery Confirmed!' : 'Order Completed!'}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.25rem' }}>Thank you for choosing Foodie Lover</div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem' }}>
                  {order.type === 'delivery' ? '🛵 Delivery Order' :
                   order.type === 'pickup'   ? '🏪 Pickup Order' : '🍽️ Dine-In Order'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>⏱ {elapsedMins}m ago</div>
              </div>
              {estMsg && (
                <div style={{ background: accentColor + '15', border: `1px solid ${accentColor}30`, borderRadius: 10, padding: '0.6rem 0.9rem', fontSize: '0.82rem', fontWeight: 700, color: accentColor, marginBottom: '0.5rem' }}>
                  {estMsg}
                </div>
              )}
            </>
          )}
        </div>

        {/* Progress tracker */}
        {!isCancelled && (
          <div style={{ background: 'white', borderRadius: 16, padding: '1.25rem', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: '1rem' }}>
              Order Progress
            </div>
            <div style={{ position: 'relative' }}>
              {/* Vertical line */}
              <div style={{ position: 'absolute', left: 16, top: 0, bottom: 0, width: 2, background: '#e2e8f0', zIndex: 0 }} />

              {relevantSteps.map((step, idx) => {
                const isDone    = eventTypes.has(step.eventType);
                const isActive  = idx === activeStepIdx && !isDone && !isCompleted;
                const isNext    = idx === activeStepIdx + 1 && !isDone;
                const evForStep = events.find(e => e.eventType === step.eventType);

                return (
                  <div key={step.eventType} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1rem', position: 'relative', zIndex: 1 }}>
                    {/* Circle */}
                    <div style={{
                      width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: isDone || isCompleted ? accentColor : isActive ? '#fef3c7' : '#f1f5f9',
                      border: `2px solid ${isDone || isCompleted ? accentColor : isActive ? '#f59e0b' : isNext ? '#cbd5e1' : '#e2e8f0'}`,
                      fontSize: '0.9rem',
                    }}>
                      {isDone || isCompleted ? '✓' : step.icon}
                    </div>

                    {/* Label */}
                    <div style={{ flex: 1, paddingTop: '0.35rem' }}>
                      <div style={{
                        fontWeight: isDone || isCompleted ? 700 : isActive ? 700 : 500,
                        color:      isDone || isCompleted ? '#0f172a' : isActive ? '#92400e' : '#94a3b8',
                        fontSize:   '0.85rem',
                      }}>
                        {step.label}
                        {isActive && <span style={{ marginLeft: '0.4rem', fontSize: '0.7rem', background: '#fef3c7', color: '#92400e', padding: '0.1rem 0.4rem', borderRadius: 20, fontWeight: 700 }}>In Progress…</span>}
                      </div>
                      {evForStep && (
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '0.1rem' }}>
                          {fmtTime(evForStep.createdAt)} · {evForStep.actor}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Order summary */}
        <div style={{ background: 'white', borderRadius: 16, padding: '1.25rem', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: '0.75rem' }}>
            Your Order
          </div>
          {(order.items || []).map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.85rem', color: '#334155' }}>
              <span>{item.name} <span style={{ color: '#94a3b8' }}>×{item.qty}</span></span>
              <span style={{ fontWeight: 700 }}>₹{item.subtotal}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '0.95rem', paddingTop: '0.5rem', color: '#0f172a' }}>
            <span>Total</span>
            <span style={{ color: accentColor }}>₹{order.total}</span>
          </div>
          {order.deliveryAddress && (
            <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: '#64748b' }}>
              📍 Delivery to: <strong>{order.deliveryAddress}</strong>
            </div>
          )}
          {order.type === 'delivery' && order.deliveryPerson && (
            <div style={{ marginTop: '0.3rem', fontSize: '0.78rem', color: '#64748b' }}>
              🛵 Delivery by: <strong>{order.deliveryPerson}</strong>
            </div>
          )}
          <div style={{ marginTop: '0.3rem', fontSize: '0.78rem', color: '#64748b' }}>
            💳 Payment: <strong>{order.payment?.toUpperCase() || 'COD'}</strong>
          </div>
        </div>

        {/* Customer confirmation (shown when delivered) */}
        {isDelivered && !confirmed && (
          <div style={{ background: 'white', borderRadius: 16, padding: '1.25rem', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', marginBottom: '1.25rem', border: `2px solid ${accentColor}` }}>
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.35rem' }}>🏠</div>
              <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem' }}>Your order has been delivered!</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>
                Did you receive your order correctly?
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.65rem' }}>
              <button
                onClick={handleConfirm}
                style={{ flex: 1, background: accentColor, color: 'white', border: 'none', padding: '0.75rem', borderRadius: 12, fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'Poppins,sans-serif' }}
              >
                ✅ Confirm Delivery
              </button>
              <button
                onClick={() => setReportMsg('Please contact us: 📞 Call the restaurant to report any issue.')}
                style={{ flex: 1, background: '#fef2f2', color: '#ef4444', border: '2px solid #fecaca', padding: '0.75rem', borderRadius: 12, fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'Poppins,sans-serif' }}
              >
                ⚠️ Report Issue
              </button>
            </div>
            {reportMsg && (
              <div style={{ marginTop: '0.75rem', background: '#fef2f2', borderRadius: 8, padding: '0.6rem', fontSize: '0.78rem', color: '#ef4444', fontWeight: 600 }}>
                {reportMsg}
              </div>
            )}
          </div>
        )}

        {/* Confirmed banner */}
        {(isCompleted && confirming) || confirmed ? (
          <div style={{ background: '#f0fdf4', border: '2px solid #86efac', borderRadius: 16, padding: '1.25rem', textAlign: 'center', marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.35rem' }}>🎉</div>
            <div style={{ fontWeight: 800, color: '#16a34a', fontSize: '1rem' }}>Thank you for confirming!</div>
            <div style={{ fontSize: '0.8rem', color: '#15803d', marginTop: '0.25rem' }}>
              We hope you enjoyed your meal. See you again! 🍽️
            </div>
          </div>
        ) : null}

        {/* Event log (collapsible) */}
        {events.length > 0 && (
          <details style={{ background: 'white', borderRadius: 16, padding: '1rem 1.25rem', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <summary style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 1 }}>
              📋 Full Event Log ({events.length})
            </summary>
            <div style={{ marginTop: '0.75rem' }}>
              {events.map(ev => (
                <div key={ev.eventId} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.75rem', color: '#64748b' }}>
                  <span><strong style={{ color: '#0f172a' }}>{ev.eventType}</strong> · {ev.actor}{ev.note ? ` — ${ev.note}` : ''}</span>
                  <span>{fmtTime(ev.createdAt)}</span>
                </div>
              ))}
            </div>
          </details>
        )}

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.75rem', color: '#94a3b8' }}>
          Powered by <strong>Foodie Lover</strong> · Auto-updates every 4 seconds
        </div>
      </div>
    </div>
  );
}

// ─── Export with Suspense boundary (required for useSearchParams in Next.js 15) ─

export default function TrackPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#f0f9ff,#eff6ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Poppins,sans-serif', color: '#64748b' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
          <div>Loading order details…</div>
        </div>
      </div>
    }>
      <TrackInner />
    </Suspense>
  );
}
