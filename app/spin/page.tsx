'use client';

/**
 * /spin — Dedicated Spin & Win page for email-link access.
 *
 * URL params:
 *   ?orderId=XXX&token=YYY   (pickup / delivery orders)
 *   ?tabId=XXX&token=YYY     (dine-in tabs)
 *
 * Flow:
 *   1. On mount: call GET /api/rewards/spin-verify to check token + eligibility.
 *   2. If alreadySpun: show existing result — NO second spin ever allowed.
 *   3. If eligible:    show spin wheel. On click call POST /api/rewards/spin with spinToken.
 *   4. If invalid/ineligible: show appropriate message.
 *
 * Security: spin entitlement is enforced by UNIQUE(order_id) / UNIQUE(tab_id) on
 * spin_results table. The token validates identity but the DB is the final guard.
 */

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

// Restaurant name is resolved server-side (ENV RESTAURANT_NAME > Admin
// restaurant_settings.restaurant_name > 'Foodie Lover') and fetched from
// /api/admin/restaurant-config below — NOT read from a NEXT_PUBLIC_* env var.
// A NEXT_PUBLIC_RESTAURANT_NAME value would be baked into the client bundle at
// build time and could never reflect an Admin-panel change without a redeploy;
// fetching the already-resolved value keeps this page in sync with the same
// priority rule every other consumer uses. See lib/config-server.ts.
const DEFAULT_RESTAURANT_NAME = 'Foodie Lover';

// ── Types ──────────────────────────────────────────────────────────────────────

type SpinState =
  | 'loading'
  | 'invalid'
  | 'ineligible'
  | 'ready'
  | 'spinning'
  | 'result'
  | 'alreadySpun'
  | 'error';

interface SpinResult {
  isWinner:     boolean;
  rewardLabel?: string;
  rewardType?:  string;
  rewardValue?: number;
  couponCode?:  string;
  couponId?:    string;
  expiresAt?:   string;
  minNextOrder?: number;
  maxDiscount?:  number;
}

interface WheelReward {
  id:          string;
  label:       string;
  reward_type: string;
  sort_order:  number;
}

// ── Spin wheel colours (matches track page) ────────────────────────────────────
const WHEEL_COLORS = ['#7c3aed','#a855f7','#6d28d9','#8b5cf6','#4f46e5','#9333ea','#7c3aed'];
const toRad = (deg: number) => (deg * Math.PI) / 180;

// ── Main component (wrapped in Suspense below for useSearchParams) ─────────────

function SpinPageInner() {
  const params   = useSearchParams();
  const orderId  = params.get('orderId');
  const tabId    = params.get('tabId');
  const token    = params.get('token');

  const [state,       setState]      = useState<SpinState>('loading');
  const [reason,      setReason]     = useState<string>('');
  const [spinResult,  setSpinResult] = useState<SpinResult | null>(null);
  const [customerName, setCustomerName] = useState<string>('');
  const [restaurantName, setRestaurantName] = useState<string>(DEFAULT_RESTAURANT_NAME);

  // Wheel state
  const [wheelRewards, setWheelRewards] = useState<WheelReward[]>([]);
  const [spinDeg,      setSpinDeg]      = useState(0);
  const [animating,    setAnimating]    = useState(false);

  // ── On mount: resolve the effective restaurant name (ENV > Admin > default) ──
  // Independent of the spin-verify flow below so a slow/failed fetch here never
  // blocks spin eligibility from loading — worst case this page just keeps
  // showing the safe 'Foodie Lover' default a moment longer.
  useEffect(() => {
    fetch('/api/admin/restaurant-config')
      .then(r => r.json())
      .then((d: { restaurant_name?: string }) => {
        if (d.restaurant_name) setRestaurantName(d.restaurant_name);
      })
      .catch(() => { /* keep default */ });
  }, []);

  // ── On mount: verify token + load wheel rewards ───────────────────────────
  useEffect(() => {
    if (!token || (!orderId && !tabId)) {
      setState('invalid');
      setReason('Missing spin link parameters. Please check the email link.');
      return;
    }

    const entityParam = orderId ? `orderId=${encodeURIComponent(orderId)}` : `tabId=${encodeURIComponent(tabId!)}`;

    // Load spin-verify and wheel rewards in parallel
    Promise.all([
      fetch(`/api/rewards/spin-verify?${entityParam}&token=${encodeURIComponent(token)}`).then(r => r.json()),
      fetch('/api/rewards/wheel-rewards').then(r => r.json()).catch(() => []),
    ]).then(([verify, rewards]) => {
      if (Array.isArray(rewards)) setWheelRewards(rewards);

      if (!verify.valid) {
        setState('invalid');
        setReason(verify.reason ?? 'This spin link is invalid or has expired.');
        return;
      }

      setCustomerName(verify.customerName ?? '');

      if (verify.alreadySpun) {
        setState('alreadySpun');
        setSpinResult(verify.spinResult ?? null);
        return;
      }

      if (!verify.eligible) {
        setState('ineligible');
        setReason(verify.reason ?? 'This order is not eligible for Spin & Win.');
        return;
      }

      setState('ready');
    }).catch(err => {
      console.error('[spin page] verify error:', err);
      setState('error');
      setReason('Could not load spin status. Please try again.');
    });
  }, [orderId, tabId, token]);

  // ── Spin handler ──────────────────────────────────────────────────────────
  const handleSpin = useCallback(async () => {
    if (animating || state !== 'ready') return;
    setAnimating(true);
    setState('spinning');

    // Start wheel animation immediately (optimistic)
    // Choose a random "landing" offset — the server will pick the real reward.
    // We will correct the final angle after the API returns.
    const preSpinExtraDeg = 5 * 360 + Math.random() * 360;
    setSpinDeg(d => d + preSpinExtraDeg);

    try {
      const body: Record<string, unknown> = { spinToken: token };
      if (orderId) body.orderId = orderId;
      else body.tabId = tabId;

      const res  = await fetch('/api/rewards/spin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json() as {
        alreadySpun?:  boolean;
        isWinner?:     boolean;
        rewardId?:     string;
        rewardLabel?:  string;
        rewardType?:   string;
        rewardValue?:  number;
        couponCode?:   string;
        couponId?:     string;
        expiresAt?:    string;
        spinId?:       string;
        error?:        string;
        minNextOrder?: number;
        maxDiscount?:  number;
      };

      if (data.error && !data.alreadySpun) {
        setAnimating(false);
        setState('error');
        setReason(data.error);
        return;
      }

      // Calculate precise final rotation based on the server-chosen reward
      if (wheelRewards.length > 0 && data.rewardId) {
        const idx     = wheelRewards.findIndex(r => r.id === data.rewardId);
        const total   = wheelRewards.length;
        const segDeg  = 360 / total;
        // Target: chosen segment lands under top pointer (12 o'clock)
        // Segment idx starts at -90° (top), segment centre = idx * segDeg + segDeg/2
        // We want pointer (top=0°) to point at it, so we need to rotate by -(segIdx * segDeg + segDeg/2)
        // plus extra full spins for drama
        const targetOffset = idx >= 0
          ? -(idx * segDeg + segDeg / 2)
          : 0;
        const extraSpins   = 5 * 360;
        // Snap to a "clean" angle that puts the segment under the pointer
        setSpinDeg(_prev => extraSpins + (360 - ((idx * segDeg + segDeg / 2) % 360)));
      }

      // Wait for animation to finish (4s CSS transition + small buffer)
      setTimeout(() => {
        setAnimating(false);
        const result: SpinResult = {
          isWinner:     data.isWinner ?? false,
          rewardLabel:  data.rewardLabel,
          rewardType:   data.rewardType,
          rewardValue:  data.rewardValue,
          couponCode:   data.couponCode,
          couponId:     data.couponId,
          expiresAt:    data.expiresAt,
          minNextOrder: data.minNextOrder,
          maxDiscount:  data.maxDiscount,
        };
        setSpinResult(result);
        setState(data.alreadySpun ? 'alreadySpun' : 'result');
      }, 4200);

    } catch (err) {
      console.error('[spin page] spin error:', err);
      setAnimating(false);
      setState('error');
      setReason('Network error. Please try again.');
    }
  }, [animating, state, orderId, tabId, token, wheelRewards]);

  // ── Copy coupon code helper ───────────────────────────────────────────────
  const [copied, setCopied] = useState(false);
  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  // ── Shared styles ─────────────────────────────────────────────────────────
  const card: React.CSSProperties = {
    maxWidth: 480,
    margin: '0 auto',
    fontFamily: '"Segoe UI", Arial, sans-serif',
    padding: '0 16px 32px',
  };

  const header: React.CSSProperties = {
    background: 'linear-gradient(135deg,#7c3aed,#4f46e5,#6d28d9)',
    borderRadius: '20px 20px 0 0',
    padding: '32px 24px',
    textAlign: 'center',
  };

  const body: React.CSSProperties = {
    background: 'white',
    borderRadius: '0 0 20px 20px',
    padding: '28px 24px',
    boxShadow: '0 8px 32px rgba(109,40,217,0.1)',
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (state === 'loading') {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={card}>
          <div style={header}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🎡</div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: 'white' }}>Spin &amp; Win</h1>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>{restaurantName}</p>
          </div>
          <div style={{ ...body, textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
            <p style={{ color: '#6b7280', fontSize: 15 }}>Loading your spin…</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Invalid / error state ─────────────────────────────────────────────────
  if (state === 'invalid' || state === 'error') {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={card}>
          <div style={{ ...header, background: '#1e293b' }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🔗</div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: 'white' }}>Link Problem</h1>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>{restaurantName}</p>
          </div>
          <div style={{ ...body, textAlign: 'center' }}>
            <p style={{ fontSize: 15, color: '#374151', marginBottom: 8 }}>{reason}</p>
            <p style={{ fontSize: 13, color: '#94a3b8' }}>
              If you believe this is an error, please contact {restaurantName} for assistance.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Ineligible state ──────────────────────────────────────────────────────
  if (state === 'ineligible') {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={card}>
          <div style={header}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🎡</div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: 'white' }}>Spin &amp; Win</h1>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>{restaurantName}</p>
          </div>
          <div style={{ ...body, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>ℹ️</div>
            <p style={{ fontSize: 15, color: '#374151', marginBottom: 8 }}>{reason}</p>
            <p style={{ fontSize: 13, color: '#94a3b8' }}>Thank you for visiting {restaurantName}!</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Already spun state ────────────────────────────────────────────────────
  if (state === 'alreadySpun' && spinResult) {
    const expiry = spinResult.expiresAt
      ? new Date(spinResult.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
      : null;

    return (
      <div style={{ minHeight: '100vh', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={card}>
          <div style={header}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>{spinResult.isWinner ? '🎉' : '🎡'}</div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: 'white' }}>
              {spinResult.isWinner ? 'You Already Won!' : 'Spin Already Used'}
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>{restaurantName}</p>
          </div>
          <div style={body}>
            {customerName && (
              <p style={{ fontSize: 15, color: '#374151', marginBottom: 12 }}>
                Hi <strong>{customerName}</strong>! You&apos;ve already used your Spin for this order.
              </p>
            )}

            {spinResult.isWinner && spinResult.couponCode ? (
              <>
                <div style={{ background: '#f5f3ff', borderRadius: 12, padding: 20, textAlign: 'center', marginBottom: 16 }}>
                  <p style={{ color: '#6b7280', fontSize: 11, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
                    YOUR REWARD
                  </p>
                  {spinResult.rewardLabel && (
                    <p style={{ fontSize: 16, fontWeight: 800, color: '#7c3aed', margin: '0 0 12px' }}>
                      {spinResult.rewardLabel}
                    </p>
                  )}
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 6px' }}>Coupon Code</p>
                  <p style={{ fontFamily: 'monospace', fontSize: 28, fontWeight: 900, color: '#4f46e5', letterSpacing: 5, margin: 0 }}>
                    {spinResult.couponCode}
                  </p>
                  <button
                    onClick={() => copyCode(spinResult.couponCode!)}
                    style={{ marginTop: 12, padding: '8px 20px', background: copied ? '#16a34a' : '#7c3aed', color: 'white',
                      border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    {copied ? '✅ Copied!' : '📋 Copy Code'}
                  </button>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
                  {expiry && (
                    <tr>
                      <td style={{ color: '#6b7280', padding: '4px 0', fontSize: 13 }}>Valid Until</td>
                      <td style={{ fontWeight: 600, padding: '4px 0', fontSize: 13, textAlign: 'right' }}>{expiry}</td>
                    </tr>
                  )}
                  {spinResult.minNextOrder != null && spinResult.minNextOrder > 0 && (
                    <tr>
                      <td style={{ color: '#6b7280', padding: '4px 0', fontSize: 13 }}>Min. Purchase</td>
                      <td style={{ fontWeight: 600, padding: '4px 0', fontSize: 13, textAlign: 'right' }}>₹{spinResult.minNextOrder}</td>
                    </tr>
                  )}
                  {spinResult.rewardType === 'percent' && spinResult.maxDiscount != null && spinResult.maxDiscount > 0 && (
                    <tr>
                      <td style={{ color: '#6b7280', padding: '4px 0', fontSize: 13 }}>Max. Discount</td>
                      <td style={{ fontWeight: 600, padding: '4px 0', fontSize: 13, textAlign: 'right' }}>₹{spinResult.maxDiscount}</td>
                    </tr>
                  )}
                </table>
              </>
            ) : (
              <div style={{ background: '#f8fafc', borderRadius: 12, padding: '20px', textAlign: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 36 }}>😅</div>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#475569', margin: '8px 0 4px' }}>
                  {spinResult.rewardLabel ?? 'Better Luck Next Time'}
                </p>
                <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
                  You&apos;ve used your spin for this order.
                </p>
              </div>
            )}

            <div style={{ background: '#f5f3ff', borderRadius: 10, padding: '12px 14px', fontSize: 12, color: '#6b7280', border: '1px solid #ede9fe' }}>
              Each qualifying order gives you <strong>one spin</strong>. Thank you for visiting {restaurantName}!
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Ready / spinning / result state ──────────────────────────────────────
  const segs   = wheelRewards;
  const total  = segs.length;
  const cx     = 120;
  const cy     = 120;
  const r      = 110;
  const segDeg = total > 0 ? 360 / total : 360;

  const showResult = state === 'result' && spinResult;

  return (
    <div style={{ minHeight: '100vh', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={card}>
        {/* Header */}
        <div style={header}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🎡</div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: 'white', letterSpacing: -0.5 }}>
            {showResult ? (spinResult?.isWinner ? 'You Won! 🎉' : 'Better Luck Next Time') : 'Spin & Win!'}
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>{restaurantName}</p>
        </div>

        {/* Body */}
        <div style={body}>

          {/* Pre-spin message */}
          {(state === 'ready' || state === 'spinning') && (
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              {customerName && (
                <p style={{ fontSize: 15, fontWeight: 700, color: '#374151', margin: '0 0 4px' }}>
                  Hi {customerName}! 🎉
                </p>
              )}
              <p style={{ fontSize: 13, color: '#6b7280', margin: 0, lineHeight: 1.5 }}>
                Your order qualifies for a reward. Give the wheel a spin!
              </p>
            </div>
          )}

          {/* Spin wheel (shown while ready or spinning) */}
          {(state === 'ready' || state === 'spinning') && segs.length > 0 && (
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ position: 'relative', display: 'inline-block', marginBottom: 16 }}>
                {/* Pointer */}
                <div style={{
                  position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)', zIndex: 2,
                  width: 0, height: 0,
                  borderLeft: '10px solid transparent',
                  borderRight: '10px solid transparent',
                  borderTop: '20px solid #6b21a8',
                }} />
                <svg
                  width={240} height={240}
                  viewBox="0 0 240 240"
                  style={{
                    borderRadius: '50%',
                    boxShadow: '0 8px 32px rgba(124,58,237,0.3)',
                    transform: `rotate(${spinDeg}deg)`,
                    transition: animating ? 'transform 4s cubic-bezier(0.17,0.67,0.12,0.99)' : 'none',
                    display: 'block',
                  }}
                >
                  {segs.map((seg, idx) => {
                    const startDeg = idx * segDeg - 90;
                    const endDeg   = startDeg + segDeg;
                    const x1 = cx + r * Math.cos(toRad(startDeg));
                    const y1 = cy + r * Math.sin(toRad(startDeg));
                    const x2 = cx + r * Math.cos(toRad(endDeg));
                    const y2 = cy + r * Math.sin(toRad(endDeg));
                    const large  = segDeg > 180 ? 1 : 0;
                    const path   = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
                    const color  = WHEEL_COLORS[idx % WHEEL_COLORS.length];
                    const midDeg = startDeg + segDeg / 2;
                    const textR  = r * 0.62;
                    const textX  = cx + textR * Math.cos(toRad(midDeg));
                    const textY  = cy + textR * Math.sin(toRad(midDeg));
                    const maxLen = 10;
                    const label  = seg.label.length > maxLen ? seg.label.slice(0, maxLen - 1) + '…' : seg.label;
                    return (
                      <g key={seg.id}>
                        <path d={path} fill={color} stroke="white" strokeWidth={1.5} />
                        <text
                          x={textX} y={textY}
                          textAnchor="middle" dominantBaseline="middle"
                          transform={`rotate(${midDeg + 90}, ${textX}, ${textY})`}
                          fill="white"
                          fontSize={total > 6 ? 8 : 10}
                          fontWeight="bold"
                          fontFamily="Poppins,sans-serif"
                          style={{ pointerEvents: 'none', userSelect: 'none' }}
                        >
                          {label}
                        </text>
                      </g>
                    );
                  })}
                  <circle cx={cx} cy={cy} r={16} fill="white" stroke="#7c3aed" strokeWidth={3} />
                  <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize={14}>🎡</text>
                </svg>
              </div>

              <button
                onClick={() => void handleSpin()}
                disabled={animating || state !== 'ready'}
                style={{
                  padding: '0.75rem 2.5rem',
                  borderRadius: 9999,
                  color: 'white',
                  fontWeight: 800,
                  fontSize: '1rem',
                  border: 'none',
                  cursor: animating ? 'wait' : 'pointer',
                  background: animating ? '#c4b5fd' : 'linear-gradient(135deg,#7c3aed,#a855f7)',
                  boxShadow: animating ? 'none' : '0 4px 16px rgba(124,58,237,0.4)',
                  fontFamily: 'Poppins, sans-serif',
                  transition: 'all 0.2s',
                }}
              >
                {animating ? '🎡 Spinning…' : '🎡 SPIN NOW'}
              </button>
            </div>
          )}

          {/* No wheel rewards loaded yet but ready */}
          {(state === 'ready' || state === 'spinning') && segs.length === 0 && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <button
                onClick={() => void handleSpin()}
                disabled={animating}
                style={{
                  padding: '0.75rem 2.5rem', borderRadius: 9999, color: 'white',
                  fontWeight: 800, fontSize: '1.1rem', border: 'none',
                  cursor: animating ? 'wait' : 'pointer',
                  background: animating ? '#c4b5fd' : 'linear-gradient(135deg,#7c3aed,#a855f7)',
                  boxShadow: '0 4px 16px rgba(124,58,237,0.4)',
                  fontFamily: 'Poppins, sans-serif',
                }}
              >
                {animating ? '⏳ Spinning…' : '🎡 SPIN NOW'}
              </button>
            </div>
          )}

          {/* Result panel */}
          {showResult && (
            <div style={{
              borderRadius: 14,
              textAlign: 'center',
              padding: '24px 20px',
              border: spinResult.isWinner ? '2px solid #86efac' : '1px solid #e5e7eb',
              background: spinResult.isWinner ? 'linear-gradient(135deg,#fefce8,#f0fdf4)' : '#f9fafb',
            }}>
              {spinResult.isWinner ? (
                <>
                  <div style={{ fontSize: 44, marginBottom: 8 }}>🎉</div>
                  <h2 style={{ fontWeight: 900, color: '#166534', fontSize: 20, margin: '0 0 6px' }}>You Won!</h2>
                  {spinResult.rewardLabel && (
                    <p style={{ fontWeight: 800, color: '#15803d', fontSize: 16, margin: '0 0 16px' }}>
                      {spinResult.rewardLabel}
                    </p>
                  )}
                  {spinResult.couponCode && (
                    <div style={{ background: 'white', border: '2px dashed #86efac', borderRadius: 12, padding: '16px', display: 'inline-block', marginBottom: 12, width: '100%', boxSizing: 'border-box' }}>
                      <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 4px' }}>Your Reward Coupon</p>
                      <p style={{ fontFamily: 'monospace', fontSize: 26, fontWeight: 900, color: '#166534', margin: '0 0 4px', letterSpacing: '0.15em' }}>
                        {spinResult.couponCode}
                      </p>
                      <button
                        onClick={() => copyCode(spinResult.couponCode!)}
                        style={{ marginTop: 8, padding: '6px 16px', background: copied ? '#16a34a' : '#7c3aed',
                          color: 'white', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 12,
                          cursor: 'pointer', fontFamily: 'inherit' }}
                      >
                        {copied ? '✅ Copied!' : '📋 Copy Code'}
                      </button>
                      {spinResult.expiresAt && (
                        <p style={{ fontSize: 11, color: '#94a3b8', margin: '8px 0 0' }}>
                          Valid until {new Date(spinResult.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                  )}
                  {(spinResult.minNextOrder != null && spinResult.minNextOrder > 0) && (
                    <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0' }}>
                      Min. purchase: ₹{spinResult.minNextOrder}
                      {spinResult.rewardType === 'percent' && spinResult.maxDiscount != null && spinResult.maxDiscount > 0
                        ? ` · Max discount: ₹${spinResult.maxDiscount}` : ''}
                    </p>
                  )}
                  <p style={{ fontSize: 13, color: '#64748b', margin: '12px 0 0' }}>
                    Use this coupon on your next order at {restaurantName}!
                  </p>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 44, marginBottom: 8 }}>😅</div>
                  <h2 style={{ fontWeight: 800, color: '#374151', fontSize: 18, margin: '0 0 6px' }}>
                    {spinResult.rewardLabel ?? 'Better Luck Next Time!'}
                  </h2>
                  <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
                    Every order is a new chance to win. See you next time!
                  </p>
                </>
              )}
            </div>
          )}

          {/* Terms note */}
          {(state === 'ready' || state === 'spinning') && (
            <div style={{ marginTop: 16, background: '#f5f3ff', borderRadius: 10, padding: '12px 14px', fontSize: 12, color: '#6b7280', border: '1px solid #ede9fe' }}>
              Each qualifying order gives you <strong>one spin</strong>. This link is unique to your order.
            </div>
          )}

        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '16px', fontSize: 11, color: '#9ca3af' }}>
          Thank you for choosing <strong style={{ color: '#7c3aed' }}>{restaurantName}</strong>! 🙏
        </div>
      </div>
    </div>
  );
}

// ── Export with Suspense wrapper (required for useSearchParams in Next.js 15) ─

export default function SpinPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48 }}>🎡</div>
          <p style={{ color: '#6b7280', fontFamily: 'sans-serif' }}>Loading…</p>
        </div>
      </div>
    }>
      <SpinPageInner />
    </Suspense>
  );
}
