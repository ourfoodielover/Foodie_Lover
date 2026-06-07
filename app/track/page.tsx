'use client';

export const dynamic = 'force-dynamic';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  verifyTrackingToken, lookupOrderByContact, customerConfirmDelivery,
  reportNotReceived, getIssueForOrder, ISSUE_MAX_RETRIES,
  submitFeedback,
  Order, OrderIssue,
} from '@/lib/api';

// ─── Step definitions ─────────────────────────────────────────────────────────
// Each order type has its OWN explicit step array.
// Steps match EXACTLY what statusToEvent() writes into order_events.
//
// Real event sequence (what the backend actually writes):
//   POST /api/orders          → 'OrderPlaced'
//   status → preparing        → 'Preparing'
//   status → prepared         → 'Prepared'
//   status → served           → 'Served'           (pickup & dine-in)
//   status → out_for_delivery → 'OutForDelivery'   (delivery only)
//   status → delivered        → 'Delivered'        (delivery only)
//   status → completed        → 'PaymentCompleted' (pickup & dine-in)
//   action → customer_confirm → 'CustomerConfirmed'(delivery only, sets completed)
//
// NOTE: 'KitchenAccepted' was REMOVED — there is no 'accepted' status in any
// flow, so that event is never written and must not appear in the tracker.

interface TrackStep {
  eventType: string;
  label:     string;
  icon:      string;
}

interface TimelineEvent {
  eventType: string;
  by?:       string;
  at?:       string;
  note?:     string;
}

// ── PICKUP: pending→preparing→prepared→served→completed ───────────────────────
// Customer collects order at counter (NOT a delivery portal step)
const STEPS_PICKUP: TrackStep[] = [
  { eventType: 'OrderPlaced',      label: 'Order Received',           icon: '📋' },
  { eventType: 'Preparing',        label: 'Being Prepared',           icon: '🔥' },
  { eventType: 'Prepared',         label: 'Ready',                    icon: '✅' },
  { eventType: 'Served',           label: 'Ready at Counter 🏪',     icon: '🏪' },
  { eventType: 'PaymentCompleted', label: 'Order Completed',          icon: '🎉' },
];

// ── DELIVERY: pending→preparing→prepared→out_for_delivery→delivered→confirmed ─
const STEPS_DELIVERY: TrackStep[] = [
  { eventType: 'OrderPlaced',       label: 'Order Received',          icon: '📋' },
  { eventType: 'Preparing',         label: 'Being Prepared',          icon: '🔥' },
  { eventType: 'Prepared',          label: 'Ready for Dispatch',      icon: '✅' },
  { eventType: 'OutForDelivery',    label: 'Out for Delivery',        icon: '🛵' },
  { eventType: 'Delivered',         label: 'Delivered to Your Door',  icon: '🏠' },
  { eventType: 'CustomerConfirmed', label: 'Delivery Confirmed',      icon: '🎉' },
];

// ── DINE-IN: awaiting_waiter→pending→preparing→prepared→served→completed ──────
const STEPS_DINE_IN: TrackStep[] = [
  { eventType: 'OrderPlaced',      label: 'Order Received',           icon: '📋' },
  { eventType: 'Preparing',        label: 'Being Prepared',           icon: '🔥' },
  { eventType: 'Prepared',         label: 'Ready',                    icon: '✅' },
  { eventType: 'Served',           label: 'Served to Table',          icon: '🍽️' },
  { eventType: 'PaymentCompleted', label: 'Completed',                icon: '🎉' },
];

function getStepsForType(type: string): TrackStep[] {
  if (type === 'delivery') return STEPS_DELIVERY;
  if (type === 'pickup')   return STEPS_PICKUP;
  return STEPS_DINE_IN;
}

function fmtTime(iso?: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });
}

// ─── Shared input style ───────────────────────────────────────────────────────

const inp: React.CSSProperties = {
  width: '100%', padding: '0.7rem 0.9rem',
  border: '2px solid #e2e8f0', borderRadius: 10,
  fontFamily: 'Poppins,sans-serif', fontSize: '0.92rem',
  outline: 'none', boxSizing: 'border-box',
};

// ─── Inner component (uses useSearchParams — must be inside Suspense) ─────────

function TrackInner() {
  const params     = useSearchParams();
  const urlOrderId = params.get('id')    || '';
  const urlToken   = params.get('token') || '';

  // ── Resolved tracking IDs (from URL or from contact lookup) ──
  const [trackOrderId, setTrackOrderId] = useState(urlOrderId);
  const [trackToken,   setTrackToken]   = useState(urlToken);

  // ── Contact lookup form (shown when no URL params) ──
  const [lookupName,    setLookupName]    = useState('');
  const [lookupPhone,   setLookupPhone]   = useState('');
  const [lookupError,   setLookupError]   = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);

  // ── Tracking state ──
  const [order,     setOrder]     = useState<Order | null>(null);
  const [notFound,  setNotFound]  = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [reportMsg, setReportMsg] = useState('');
  const [tick,      setTick]      = useState(0);
  // ── "Not received" issue tracking (delivery) ──
  const [activeIssue,   setActiveIssue]   = useState<OrderIssue | null>(null);
  const [notRecvBusy,   setNotRecvBusy]   = useState(false);
  const [notRecvMsg,    setNotRecvMsg]    = useState('');

  // ── Post-completion rating ──
  // null = no star selected yet (required before submit)
  const [rating,            setRating]            = useState<1|2|3|4|5|null>(null);
  const [ratingComment,     setRatingComment]     = useState('');
  const [ratingBusy,        setRatingBusy]        = useState(false);
  const [ratingSubmitted,   setRatingSubmitted]   = useState(false);
  const [ratingMsg,         setRatingMsg]         = useState('');

  const showLookupForm = !trackOrderId && !trackToken;

  // ── Contact lookup submit ──────────────────────────────────────────────────
  async function handleLookup() {
    if (!lookupName.trim())  { setLookupError('Please enter your name');         return; }
    if (!lookupPhone.trim()) { setLookupError('Please enter your phone number'); return; }
    setLookupLoading(true);
    setLookupError('');
    try {
      const found = await lookupOrderByContact(lookupName, lookupPhone);
      if (!found || !found.trackingToken) {
        setLookupError('No order found with that name and number. Check your details and try again.');
        return;
      }
      setTrackOrderId(found.id);
      setTrackToken(found.trackingToken);
    } catch {
      setLookupError('Something went wrong. Please try again.');
    } finally {
      setLookupLoading(false);
    }
  }

  // ── Rating submit ──────────────────────────────────────────────────────────
  async function handleRatingSubmit() {
    if (!order || rating === null) return;
    setRatingBusy(true);
    setRatingMsg('');
    try {
      const res = await submitFeedback({
        orderId: order.id,
        rating,
        comment: ratingComment.trim() || undefined,
      });
      if (res.ok) {
        setRatingSubmitted(true);
        setRatingMsg('✅ Thank you for your feedback!');
      } else {
        setRatingMsg('❌ Could not save feedback. Please try again.');
      }
    } catch {
      setRatingMsg('❌ Something went wrong. Please try again.');
    } finally {
      setRatingBusy(false);
    }
  }

  // ── Load / poll order data ─────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!trackOrderId || !trackToken) return;
    const o = await verifyTrackingToken(trackOrderId, trackToken);
    if (!o) { setNotFound(true); return; }
    setOrder(o);

    // Also load the active issue so retry attempt count survives page refresh.
    // Relevant for delivery orders (out_for_delivery / delivered / re_serve_required)
    // AND pickup orders (served / re_serve_required — staff must bring to counter again).
    if (
      (o.type === 'delivery' &&
        (o.status === 're_serve_required' || o.status === 'out_for_delivery' || o.status === 'delivered')) ||
      (o.type === 'pickup' &&
        (o.status === 're_serve_required' || o.status === 'served'))
    ) {
      const issue = await getIssueForOrder(o.id).catch(() => null);
      if (issue && issue.status !== 'resolved') {
        setActiveIssue(issue);
      }
    }
  }, [trackOrderId, trackToken]);

  useEffect(() => {
    if (showLookupForm) return;
    loadData();
    const t1 = setInterval(loadData, 4000);
    const t2 = setInterval(() => setTick(n => n + 1), 1000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, [loadData, showLookupForm]);

  void tick;

  async function handleConfirm() {
    if (!trackOrderId || !trackToken) return;
    try {
      await customerConfirmDelivery(trackOrderId);
      setConfirmed(true);
      setActiveIssue(null);
      setNotRecvMsg('');
      loadData();
    } catch {
      // silently ignore — the poll will catch the state update
    }
  }

  // ── "Not received" for delivery tracking ─────────────────────────────────
  async function handleDeliveryNotReceived() {
    if (!trackOrderId || !order || notRecvBusy) return;
    setNotRecvBusy(true);
    setNotRecvMsg('');
    try {
      const existingIssue = await getIssueForOrder(trackOrderId);
      const currentCount  = existingIssue ? existingIssue.retryCount : 0;

      if (currentCount >= ISSUE_MAX_RETRIES) {
        setNotRecvMsg(
          `⚠️ This order has been reported ${currentCount} times. ` +
          `The manager has been alerted and will contact you shortly.`,
        );
        return;
      }

      const issue = await reportNotReceived(
        trackOrderId,
        order.customerName || 'Customer',
        'not_received',
      );
      setActiveIssue(issue);

      if (issue.escalated) {
        setNotRecvMsg(
          `🚨 Escalated to manager after ${issue.retryCount} reports. ` +
          `A manager will contact you to resolve this.`,
        );
      } else {
        setNotRecvMsg(
          `⚠️ Your delivery person has been notified and will re-deliver your order shortly. ` +
          `(Report ${issue.retryCount}/${ISSUE_MAX_RETRIES})`,
        );
      }
      loadData();
    } catch (err) {
      console.error('[track] handleDeliveryNotReceived failed:', err);
      setNotRecvMsg(`⚠️ Your issue has been logged. Please contact the restaurant directly if not resolved.`);
    } finally {
      setNotRecvBusy(false);
    }
  }

  // ── "Not received" for pickup tracking ──────────────────────────
  async function handlePickupNotReceived() {
    if (!trackOrderId || !order || notRecvBusy) return;
    setNotRecvBusy(true);
    setNotRecvMsg('');
    try {
      const existingIssue = await getIssueForOrder(trackOrderId);
      const currentCount  = existingIssue ? existingIssue.retryCount : 0;

      if (currentCount >= ISSUE_MAX_RETRIES) {
        setNotRecvMsg(
          `⚠️ This order has been reported ${currentCount} times. ` +
          `The manager has been alerted and will contact you shortly.`,
        );
        return;
      }

      const issue = await reportNotReceived(
        trackOrderId,
        order.customerName || 'Customer',
        'not_received',
      );
      setActiveIssue(issue);

      if (issue.escalated) {
        setNotRecvMsg(
          `🚨 Escalated to manager after ${issue.retryCount} reports. ` +
          `A manager will contact you to resolve this.`,
        );
      } else {
        setNotRecvMsg(
          `⚠️ Our staff has been notified and will bring your order to the counter shortly. ` +
          `(Report ${issue.retryCount}/${ISSUE_MAX_RETRIES})`,
        );
      }
      loadData();
    } catch (err) {
      console.error('[track] handlePickupNotReceived failed:', err);
      setNotRecvMsg(`⚠️ Your issue has been logged. Please contact the restaurant directly if not resolved.`);
    } finally {
      setNotRecvBusy(false);
    }
  }

  // ════════════════════════════════════════════════════════════════
  // ── LOOKUP FORM ──────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════
  if (showLookupForm) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg,#1A0800 0%,#2D0F00 50%,#1A0800 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Poppins,sans-serif', padding: '1.5rem',
      }}>
        <div style={{ background: 'white', borderRadius: 20, padding: '2.5rem 2rem', width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📍</div>
            <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.3rem' }}>
              Track Your Order
            </h1>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
              Enter the name and phone number you used when placing your online order
            </p>
          </div>

          {/* Name input */}
          <div style={{ marginBottom: '0.85rem' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#555', display: 'block', marginBottom: '0.4rem' }}>
              Your Name
            </label>
            <input
              value={lookupName}
              onChange={e => { setLookupName(e.target.value); setLookupError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleLookup()}
              placeholder="e.g. Ravi Kumar"
              autoFocus
              style={inp}
            />
          </div>

          {/* Phone input */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#555', display: 'block', marginBottom: '0.4rem' }}>
              Mobile Number
            </label>
            <input
              type="tel"
              inputMode="numeric"
              value={lookupPhone}
              onChange={e => { setLookupPhone(e.target.value); setLookupError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleLookup()}
              placeholder="e.g. 9876543210"
              style={inp}
            />
          </div>

          {/* Error */}
          {lookupError && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '0.6rem 0.85rem', fontSize: '0.78rem', color: '#ef4444', fontWeight: 600, marginBottom: '1rem', lineHeight: 1.5 }}>
              {lookupError}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleLookup}
            disabled={lookupLoading}
            style={{
              width: '100%', background: lookupLoading ? '#94a3b8' : '#E65C00', color: 'white',
              border: 'none', padding: '0.8rem', borderRadius: 12, fontWeight: 700,
              fontSize: '0.95rem', cursor: lookupLoading ? 'not-allowed' : 'pointer',
              fontFamily: 'Poppins,sans-serif',
            }}
          >
            {lookupLoading ? '⏳ Looking up…' : '🔍 Find My Order'}
          </button>

          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <a href="/online" style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 700, textDecoration: 'none' }}>
              📦 Place a New Order →
            </a>
          </div>

          <div style={{ textAlign: 'center', marginTop: '0.75rem' }}>
            <Link href="/" style={{ fontSize: '0.73rem', color: '#94a3b8', textDecoration: 'none' }}>← Back to Home</Link>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // ── LOADING / NOT FOUND ──────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════
  if (notFound) {
    return (
      <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#f0f9ff,#eff6ff)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Poppins,sans-serif' }}>
        <div style={{ textAlign: 'center', padding: '2rem 1.5rem', color: '#64748b', maxWidth: 400 }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.5rem', color: '#0f172a' }}>Order not found</div>
          <div style={{ fontSize: '0.85rem', marginBottom: '1.5rem' }}>The tracking link may be invalid or expired.</div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => { setTrackOrderId(''); setTrackToken(''); setNotFound(false); }}
              style={{ background: '#E65C00', color: 'white', border: 'none', padding: '0.6rem 1.2rem', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontSize: '0.85rem' }}
            >
              🔍 Try Again
            </button>
            <a href="/online" style={{ display:'inline-flex', alignItems:'center', background:'#eff6ff', color:'#2563eb', border:'1px solid #bfdbfe', padding:'0.6rem 1.2rem', borderRadius:10, fontWeight:700, textDecoration:'none', fontSize:'0.85rem' }}>
              📦 Order Again
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#f0f9ff,#eff6ff)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Poppins,sans-serif', color:'#94a3b8' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem' }}>⏳</div>
          <div style={{ marginTop: '0.5rem' }}>Loading your order…</div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // ── TRACKING VIEW ────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════

  const timeline: TimelineEvent[] = order.timeline ?? [];
  const eventTypes    = new Set(timeline.map(e => e.eventType));
  const orderType     = order.type as 'dine-in' | 'pickup' | 'delivery';

  // Select the EXACT flow for this order type — no shared/merged steps
  const relevantSteps = getStepsForType(orderType);

  // Find the index of the LAST completed step (last step with a matching timeline event).
  // activeStepIdx = lastDoneIdx + 1 (the step CURRENTLY IN PROGRESS).
  let lastDoneIdx = -1;
  for (let i = relevantSteps.length - 1; i >= 0; i--) {
    if (eventTypes.has(relevantSteps[i].eventType)) { lastDoneIdx = i; break; }
  }
  const activeStepIdx = lastDoneIdx + 1; // next step is "in progress"

  const isDelivered   = order.status === 'delivered';
  const isCompleted   = order.status === 'completed';
  const isCancelled   = order.status === 'cancelled';
  const isOutForDeliv = order.status === 'out_for_delivery';
  const elapsedMins   = Math.floor((Date.now() - new Date(order.timestamp).getTime()) / 60000);

  // Type-specific status message — no "Delivery confirmed" for pickup orders
  const estMsg =
    (order.status === 'pending' || order.status === 'preparing') ? 'Est. 20–30 min remaining' :
    order.status === 'prepared' && orderType === 'pickup'         ? 'Ready! Please collect from counter 🏪' :
    order.status === 'prepared' && orderType === 'delivery'       ? 'Being dispatched shortly…' :
    order.status === 'served'   && orderType === 'pickup'         ? 'Your order is at the counter — please collect! 🏪' :
    isOutForDeliv                                                  ? 'On the way! Arriving soon…' :
    isDelivered                                                    ? 'Your order has been delivered! 🎉' :
    isCompleted && orderType === 'delivery'                        ? 'Delivery confirmed — thank you! 🎉' :
    isCompleted                                                    ? 'Order completed — thank you for dining with us! 🎉' :
    '';

  const accentColor = orderType === 'delivery' ? '#2563eb' : orderType === 'pickup' ? '#16a34a' : '#E65C00';
  const headerGrad  = orderType === 'delivery'
    ? 'linear-gradient(135deg,#2563eb,#1d4ed8)'
    : orderType === 'pickup'
    ? 'linear-gradient(135deg,#16a34a,#15803d)'
    : 'linear-gradient(135deg,#E65C00,#c44d00)';

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#f0f9ff,#eff6ff)', fontFamily: 'Poppins,sans-serif' }}>

      {/* Header */}
      <div style={{ background: headerGrad, color: 'white', padding: '1.25rem 1.5rem' }}>
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
                {orderType === 'delivery' ? 'Delivery Confirmed!' :
                 orderType === 'pickup'   ? 'Order Completed — Thank You!' :
                 'Order Completed!'}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.25rem' }}>Thank you for choosing Foodie Lover</div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem' }}>
                  {orderType === 'delivery' ? '🛵 Delivery Order' :
                   orderType === 'pickup'   ? '🏪 Pickup Order'   : '🍽️ Dine-In Order'}
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
              <div style={{ position: 'absolute', left: 16, top: 0, bottom: 0, width: 2, background: '#e2e8f0', zIndex: 0 }} />
              {relevantSteps.map((step, idx) => {
                const isDone    = eventTypes.has(step.eventType);
                // isActive = this is the NEXT step not yet done (currently in progress)
                const isActive  = idx === activeStepIdx && !isDone && !isCompleted;
                const evForStep = timeline.find(e => e.eventType === step.eventType);
                return (
                  // Use composite key: eventType + idx to guarantee uniqueness
                  <div key={`${step.eventType}-${idx}`} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1rem', position: 'relative', zIndex: 1 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: isDone || isCompleted ? accentColor : isActive ? '#fef3c7' : '#f1f5f9',
                      border: `2px solid ${isDone || isCompleted ? accentColor : isActive ? '#f59e0b' : '#e2e8f0'}`,
                      fontSize: '0.9rem',
                    }}>
                      {isDone || isCompleted ? '✓' : step.icon}
                    </div>
                    <div style={{ flex: 1, paddingTop: '0.35rem' }}>
                      <div style={{
                        fontWeight: isDone || isCompleted ? 700 : isActive ? 700 : 500,
                        color:      isDone || isCompleted ? '#0f172a' : isActive ? '#92400e' : '#94a3b8',
                        fontSize: '0.85rem',
                      }}>
                        {step.label}
                        {isActive && <span style={{ marginLeft: '0.4rem', fontSize: '0.7rem', background: '#fef3c7', color: '#92400e', padding: '0.1rem 0.4rem', borderRadius: 20, fontWeight: 700 }}>In Progress…</span>}
                      </div>
                      {evForStep && (
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '0.1rem' }}>
                          {fmtTime(evForStep.at)}{evForStep.by ? ` · ${evForStep.by}` : ''}
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
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: '0.75rem' }}>Your Order</div>
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
          {orderType === 'delivery' && order.deliveryAddress && (
            <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: '#64748b' }}>
              📍 Delivery to: <strong>{order.deliveryAddress}</strong>
            </div>
          )}
          {orderType === 'pickup' && (
            <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: '#16a34a', fontWeight: 700 }}>
              🏪 Pickup at counter — no delivery required
            </div>
          )}
          {orderType === 'delivery' && order.deliveryPerson && (
            <div style={{ marginTop: '0.3rem', fontSize: '0.78rem', color: '#64748b' }}>
              🛵 Delivery by: <strong>{order.deliveryPerson}</strong>
            </div>
          )}
          <div style={{ marginTop: '0.3rem', fontSize: '0.78rem', color: '#64748b' }}>
            💳 Payment: <strong>{(order.paymentMethod || order.payment || 'COD').toUpperCase()}</strong>
          </div>
        </div>

        {/* Customer confirmation removed — delivery partner now confirms delivery + payment */}

        {/* Re-delivery in progress banner — shown while issue is being actioned */}
        {/* re_serve_required = waiter hasn't clicked Re-Serve yet             */}
        {/* out_for_delivery (after a re-serve) = delivery person is on the way */}
        {orderType === 'delivery' && (order.status === 're_serve_required' || (isOutForDeliv && activeIssue)) && !confirmed && (
          <div style={{ background: '#fef3c7', border: '2px solid #f59e0b', borderRadius: 16, padding: '1.25rem', marginBottom: '1.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.35rem' }}>
              {order.status === 're_serve_required' ? '⏳' : '🛵'}
            </div>
            <div style={{ fontWeight: 800, color: '#92400e', fontSize: '1rem', marginBottom: '0.25rem' }}>
              {order.status === 're_serve_required' ? 'Re-delivery being arranged…' : 'Re-delivery on the way!'}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#b45309' }}>
              {order.status === 're_serve_required'
                ? 'Your delivery person has been notified. They will re-deliver your order shortly.'
                : 'Your delivery person is heading back to you. Please confirm receipt when they arrive.'}
            </div>
            {activeIssue && (
              <div style={{ fontSize: '0.72rem', color: '#92400e', marginTop: '0.4rem' }}>
                Re-delivery attempt {activeIssue.retryCount}/{ISSUE_MAX_RETRIES}
              </div>
            )}
          </div>
        )}

        {/* ── PICKUP: "Not received at counter?" button ─────────────────────── */}
        {/* Shown when order is at the counter (served) but customer didn't get it */}
        {orderType === 'pickup' && order.status === 'served' && !isCompleted && (
          <div style={{ background: 'white', borderRadius: 16, padding: '1.25rem', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', marginBottom: '1.25rem', border: `2px solid ${accentColor}` }}>
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.35rem' }}>
                {activeIssue ? '🔄' : '🏪'}
              </div>
              <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem' }}>
                {activeIssue ? 'Your order has been re-prepared!' : 'Your order is ready at the counter!'}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>
                {activeIssue
                  ? 'Please check the counter again — our staff has fixed your order.'
                  : 'Please collect your order from the counter. Is it not there?'}
              </div>
              {activeIssue && (
                <div style={{ fontSize: '0.72rem', background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 8, padding: '0.35rem 0.6rem', marginTop: '0.5rem', color: '#92400e' }}>
                  Re-serve attempt #{activeIssue.retryCount} of {ISSUE_MAX_RETRIES}
                </div>
              )}
            </div>
            <button
              onClick={() => void handlePickupNotReceived()}
              disabled={notRecvBusy}
              style={{
                width: '100%', background: notRecvBusy ? '#f3f4f6' : '#fef2f2',
                color: '#ef4444', border: '2px solid #fecaca', padding: '0.75rem',
                borderRadius: 12, fontWeight: 700, fontSize: '0.9rem',
                cursor: notRecvBusy ? 'not-allowed' : 'pointer',
                fontFamily: 'Poppins,sans-serif', opacity: notRecvBusy ? 0.6 : 1,
              }}
            >
              {notRecvBusy ? '⏳…' : '❌ Not received at counter'}
            </button>
            {notRecvMsg && (
              <div style={{ marginTop: '0.75rem', background: notRecvMsg.startsWith('🚨') ? '#fef2f2' : '#fef3c7', borderRadius: 8, padding: '0.6rem', fontSize: '0.78rem', color: notRecvMsg.startsWith('🚨') ? '#ef4444' : '#92400e', fontWeight: 600 }}>
                {notRecvMsg}
              </div>
            )}
          </div>
        )}

        {/* ── PICKUP: "Being re-prepared" banner ───────────────────────────── */}
        {/* Shown after customer reports not received — waiter is fixing it     */}
        {orderType === 'pickup' && order.status === 're_serve_required' && (
          <div style={{ background: '#fef3c7', border: '2px solid #f59e0b', borderRadius: 16, padding: '1.25rem', marginBottom: '1.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.35rem' }}>⏳</div>
            <div style={{ fontWeight: 800, color: '#92400e', fontSize: '1rem', marginBottom: '0.25rem' }}>
              Re-serve being arranged…
            </div>
            <div style={{ fontSize: '0.8rem', color: '#b45309' }}>
              Our staff has been notified. Your order will be brought to the counter again shortly.
            </div>
            {activeIssue && (
              <div style={{ fontSize: '0.72rem', color: '#92400e', marginTop: '0.4rem' }}>
                Re-serve attempt {activeIssue.retryCount}/{ISSUE_MAX_RETRIES}
              </div>
            )}
          </div>
        )}

        {/* Confirmed banner */}
        {confirmed && (
          <div style={{ background: '#f0fdf4', border: '2px solid #86efac', borderRadius: 16, padding: '1.25rem', textAlign: 'center', marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.35rem' }}>🎉</div>
            <div style={{ fontWeight: 800, color: '#16a34a', fontSize: '1rem' }}>Thank you for confirming!</div>
            <div style={{ fontSize: '0.8rem', color: '#15803d', marginTop: '0.25rem' }}>We hope you enjoyed your meal. See you again! 🍽️</div>
          </div>
        )}

        {/* ── Post-completion rating card ────────────────────────────── */}
        {/* Show after payment completed (pickup/dine-in) OR delivery confirmed */}
        {(isCompleted || confirmed) && !ratingSubmitted && (
          <div style={{ background: 'white', borderRadius: 16, padding: '1.25rem', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', marginBottom: '1.25rem', border: '2px solid #fde68a' }}>
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <div style={{ fontSize: '1.75rem', marginBottom: '0.3rem' }}>⭐</div>
              <div style={{ fontWeight: 800, color: '#1A0800', fontSize: '0.95rem' }}>How was your experience?</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>Tap a star to rate</div>
            </div>

            {/* Star buttons — no default, explicit click required */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              {([1, 2, 3, 4, 5] as const).map(n => (
                <button
                  key={n}
                  onClick={() => setRating(n)}
                  style={{
                    background: 'none',
                    border:     'none',
                    cursor:     'pointer',
                    fontSize:   rating !== null && n <= rating ? '2.25rem' : '1.9rem',
                    opacity:    rating !== null && n <= rating ? 1 : 0.35,
                    transition: 'all 0.1s ease',
                    lineHeight: 1,
                    padding:    '0 0.1rem',
                  }}
                  aria-label={`Rate ${n} star${n !== 1 ? 's' : ''}`}
                >
                  ⭐
                </button>
              ))}
            </div>

            {/* Selected rating label */}
            {rating !== null && (
              <div style={{ textAlign: 'center', fontSize: '0.78rem', fontWeight: 700, color: '#E65C00', marginBottom: '0.75rem' }}>
                {rating === 1 ? 'Poor' : rating === 2 ? 'Fair' : rating === 3 ? 'Good' : rating === 4 ? 'Great' : 'Excellent!'} ({rating}/5)
              </div>
            )}

            {/* Optional comment */}
            <textarea
              value={ratingComment}
              onChange={e => setRatingComment(e.target.value)}
              placeholder="Any comments? (optional)"
              maxLength={500}
              rows={2}
              style={{ width: '100%', boxSizing: 'border-box', padding: '0.6rem 0.75rem', border: '2px solid #e5e7eb', borderRadius: 10, fontFamily: 'Poppins,sans-serif', fontSize: '0.85rem', outline: 'none', resize: 'vertical', marginBottom: '0.75rem' }}
            />

            <button
              onClick={() => void handleRatingSubmit()}
              disabled={rating === null || ratingBusy}
              style={{
                width: '100%', padding: '0.75rem', borderRadius: 12,
                background: rating === null ? '#e5e7eb' : '#E65C00',
                color:      rating === null ? '#9ca3af' : 'white',
                border:     'none', fontWeight: 800, fontSize: '0.92rem',
                cursor:     rating === null || ratingBusy ? 'not-allowed' : 'pointer',
                fontFamily: 'Poppins,sans-serif',
                transition: 'background 0.15s',
              }}
            >
              {ratingBusy ? '⏳ Saving…' : rating === null ? 'Select a rating to submit' : '📤 Submit Rating'}
            </button>

            {ratingMsg && (
              <div style={{ marginTop: '0.5rem', textAlign: 'center', fontSize: '0.8rem', fontWeight: 600, color: ratingMsg.includes('✅') ? '#16a34a' : '#dc2626' }}>
                {ratingMsg}
              </div>
            )}
          </div>
        )}

        {/* Submitted thank-you */}
        {ratingSubmitted && (
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 16, padding: '1rem', textAlign: 'center', marginBottom: '1.25rem', fontSize: '0.85rem', color: '#15803d', fontWeight: 700 }}>
            ⭐ {rating}/5 — {ratingMsg}
          </div>
        )}

        {/* Event log (collapsible) */}
        {timeline.length > 0 && (
          <details style={{ background: 'white', borderRadius: 16, padding: '1rem 1.25rem', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <summary style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 1 }}>
              📋 Full Event Log ({timeline.length})
            </summary>
            <div style={{ marginTop: '0.75rem' }}>
              {timeline.map((ev, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.75rem', color: '#64748b' }}>
                  <span><strong style={{ color: '#0f172a' }}>{ev.eventType}</strong>{ev.by ? ` · ${ev.by}` : ''}{ev.note ? ` — ${ev.note}` : ''}</span>
                  <span>{fmtTime(ev.at)}</span>
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

// ─── Export with Suspense boundary ────────────────────────────────────────────

export default function TrackPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#1A0800,#2D0F00)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Poppins,sans-serif', color: '#94a3b8' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
          <div>Loading…</div>
        </div>
      </div>
    }>
      <TrackInner />
    </Suspense>
  );
}
