'use client';

export const dynamic = 'force-dynamic';
import { useState, useEffect, useRef } from 'react';
import { getMenu, createOrder, lookupOrderByContact, MenuItem } from '@/lib/api';
import { safeApiCall } from '@/lib/safe-api';

const CATEGORIES = ['All', 'Biryani', 'Starters', 'Mains', 'Breads', 'Desserts', 'Drinks'];
const BADGE_LABELS: Record<string, string> = {
  bestseller: '⭐ Bestseller', popular: '🔥 Popular',
  chef: "👨‍🍳 Chef's Special", famous: '🏆 Famous', new: '✨ New',
};
const MAX_QTY = 20;

export default function OnlineOrderPage() {
  const [menu, setMenu]                 = useState<MenuItem[]>([]);
  const [cart, setCart]                 = useState<{ item: MenuItem; qty: number }[]>([]);
  const [filter, setFilter]             = useState('All');
  const [cartOpen, setCartOpen]         = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [orderPlaced, setOrderPlaced]   = useState(false);
  const [lastOrderId, setLastOrderId]   = useState('');
  const [lastTrackUrl, setLastTrackUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError]   = useState('');

  // Track order modal
  const [showTrackModal,  setShowTrackModal]  = useState(false);
  const [trackName,       setTrackName]       = useState('');
  const [trackPhone,      setTrackPhone]      = useState('');
  const [trackError,      setTrackError]      = useState('');
  const [trackLoading,    setTrackLoading]    = useState(false);

  const [form, setForm] = useState({
    name:    '',
    phone:   '',
    email:   '',
    type:    'pickup' as 'pickup' | 'delivery',
    address: '',
    payment: 'cod',
  });

  const submittingRef = useRef(false);

  useEffect(() => {
    getMenu().then(setMenu).catch(() => setMenu([]));
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      if (!isSubmitting) { setCartOpen(false); setShowCheckout(false); }
      if (!trackLoading)  { setShowTrackModal(false); }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isSubmitting, trackLoading]);

  const filtered  = filter === 'All'
    ? menu.filter(m => m.available !== false)
    : menu.filter(m => m.category === filter && m.available !== false);
  const cartTotal = cart.reduce((s, c) => s + c.item.price * c.qty, 0);
  const cartCount = cart.reduce((s, c) => s + c.qty, 0);

  function addToCart(item: MenuItem) {
    setCart(prev => {
      const ex = prev.find(c => c.item.id === item.id);
      if (ex) {
        if (ex.qty >= MAX_QTY) return prev;
        return prev.map(c => c.item.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      }
      return [...prev, { item, qty: 1 }];
    });
  }

  function changeQty(id: string, delta: number) {
    setCart(prev =>
      prev
        .map(c => c.item.id === id ? { ...c, qty: Math.min(c.qty + delta, MAX_QTY) } : c)
        .filter(c => c.qty > 0),
    );
  }

  async function placeOrder() {
    if (submittingRef.current || isSubmitting) return;
    if (!form.name.trim())  { alert('Please enter your name'); return; }
    if (!form.phone.trim()) { alert('Please enter your phone number'); return; }
    if (form.type === 'delivery' && !form.address.trim()) { alert('Please enter delivery address'); return; }
    if (!cart.length) { alert('Cart is empty'); return; }

    submittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const items = cart.map(c => ({
        name:       c.item.name,
        price:      c.item.price,
        qty:        c.qty,
        subtotal:   c.item.price * c.qty,
        menuItemId: c.item.id,
      }));

      const orderData = {
        type:            form.type,
        customerName:    form.name.trim(),
        customerEmail:   form.email.trim() || undefined,
        phone:           form.phone.trim(),
        items,
        subtotal:        cartTotal,
        total:           cartTotal,
        deliveryAddress: form.type === 'delivery' ? form.address.trim() : undefined,
        source:          'online',
      };

      const idempotencyKey = `order_${form.phone}_${Date.now()}`;
      const result = await safeApiCall(
        'create_order',
        () => createOrder(orderData),
        orderData,
        idempotencyKey,
      );

      if (result.queued) {
        // Order queued offline — show success but with offline indicator
        setLastOrderId('offline-pending');
        setLastTrackUrl('');
        setCart([]);
        setShowCheckout(false);
        setOrderPlaced(true);
        setForm({ name: '', phone: '', email: '', type: 'pickup', address: '', payment: 'cod' });
      } else if (result.data) {
        // Normal success flow
        const savedOrder = result.data;
        const trackUrl = savedOrder.trackingToken
          ? `/track?id=${savedOrder.id}&token=${savedOrder.trackingToken}`
          : '';

        setLastOrderId(savedOrder.id);
        setLastTrackUrl(trackUrl);
        setCart([]);
        setShowCheckout(false);
        setOrderPlaced(true);
        setForm({ name: '', phone: '', email: '', type: 'pickup', address: '', payment: 'cod' });
      } else {
        setSubmitError(result.error ?? 'Failed to place order');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to place order. Please try again.';
      setSubmitError(msg);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  async function handleTrackLookup() {
    if (!trackName.trim())  { setTrackError('Please enter your name');         return; }
    if (!trackPhone.trim()) { setTrackError('Please enter your phone number'); return; }
    setTrackLoading(true);
    setTrackError('');
    try {
      const found = await lookupOrderByContact(trackName.trim(), trackPhone.trim());
      if (!found || !found.trackingToken) {
        setTrackError('No order found with that name and number. Check your details and try again.');
        return;
      }
      // Redirect to the full tracking page
      window.location.href = `/track?id=${found.id}&token=${found.trackingToken}`;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[online] lookupOrder failed:', err);
      setTrackError(`Something went wrong: ${msg}. Please try again.`);
    } finally {
      setTrackLoading(false);
    }
  }

  const O = '#2563eb'; // Online blue accent

  return (
    <div style={{ minHeight: '100vh', background: '#f0f9ff' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#1e3a5f,#2563eb)', color: 'white', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 }}>
        <div>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.3rem', fontWeight: 900 }}>🍽️ Foodie Lover</div>
          <div style={{ fontSize: '0.75rem', color: '#93c5fd' }}>📦 Online Ordering — Pickup & Delivery</div>
        </div>
        <button
          onClick={() => setCartOpen(true)}
          style={{ background: O, border: '2px solid #93c5fd', color: 'white', padding: '0.5rem 1.1rem', borderRadius: 20, fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          🛒 Cart
          {cartCount > 0 && (
            <span style={{ background: 'white', color: O, borderRadius: '50%', width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 900 }}>
              {cartCount}
            </span>
          )}
        </button>
      </div>

      {/* Info banner */}
      <div style={{ background: '#eff6ff', borderBottom: '2px solid #bfdbfe', padding: '0.65rem 1.5rem', display: 'flex', gap: '1.5rem', fontSize: '0.78rem', color: '#1d4ed8', overflowX: 'auto' }}>
        <span>🚗 Free delivery (local area)</span>
        <span>⏱ Pickup ready in 20–30 min</span>
        <button
          onClick={() => { setShowTrackModal(true); setTrackError(''); setTrackName(''); setTrackPhone(''); }}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#1d4ed8', fontFamily: 'Poppins,sans-serif', fontSize: '0.78rem', fontWeight: 700, textDecoration: 'underline', textDecorationStyle: 'dotted' }}
        >
          📱 Track your order in real time
        </button>
      </div>

      {/* Order placed confirmation */}
      {orderPlaced && (
        <div style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#15803d', padding: '1rem 1.5rem' }}>
          <div style={{ fontWeight: 700, marginBottom: '0.4rem' }}>
            ✅ Order placed! ID: <strong>{lastOrderId}</strong>
            <button onClick={() => setOrderPlaced(false)} style={{ marginLeft: '0.75rem', background: 'none', border: 'none', color: '#15803d', cursor: 'pointer', fontWeight: 700, fontFamily: 'Poppins,sans-serif', fontSize: '0.85rem' }}>×</button>
          </div>
          {/* Tracking link */}
          {lastTrackUrl && (
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '0.55rem 0.85rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', color: '#166534', fontWeight: 700 }}>🔗 Track your order:</span>
              <a href={lastTrackUrl} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: '0.78rem', color: '#15803d', fontWeight: 800, textDecoration: 'underline', wordBreak: 'break-all' }}>
                {typeof window !== 'undefined' ? `${window.location.origin}${lastTrackUrl}` : lastTrackUrl}
              </a>
            </div>
          )}
        </div>
      )}

      {/* Category filter */}
      <div style={{ padding: '0.85rem 1.5rem', display: 'flex', gap: '0.4rem', overflowX: 'auto' }}>
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setFilter(cat)} style={{
            padding: '0.35rem 0.9rem', borderRadius: 20, border: '2px solid',
            borderColor: filter === cat ? O : '#ddd',
            background: filter === cat ? O : 'white',
            color: filter === cat ? 'white' : '#666',
            fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
            fontSize: '0.8rem', fontFamily: 'Poppins,sans-serif',
          }}>
            {cat}
          </button>
        ))}
      </div>

      {/* Menu grid */}
      <div style={{ padding: '0 1.5rem 6rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(270px,1fr))', gap: '1rem' }}>
        {filtered.map(item => {
          const inCart = cart.find(c => c.item.id === item.id);
          const atMax  = inCart && inCart.qty >= MAX_QTY;
          return (
            <div key={item.id} style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', border: '1px solid #e0f2fe' }}>
              {item.img && <img src={item.img} alt={item.name} style={{ width: '100%', height: '150px', objectFit: 'cover' }} />}
              <div style={{ padding: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#1e3a5f' }}>{item.name}</div>
                  {item.badge && (
                    <span style={{ fontSize: '0.63rem', background: '#eff6ff', color: O, padding: '0.12rem 0.4rem', borderRadius: 8, fontWeight: 700, whiteSpace: 'nowrap', marginLeft: '0.4rem' }}>
                      {BADGE_LABELS[item.badge] || item.badge}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.7rem', lineHeight: 1.4 }}>{item.desc}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 900, color: O, fontSize: '1rem' }}>₹{item.price}</span>
                  {inCart ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <button onClick={() => changeQty(item.id, -1)} style={{ width: 28, height: 28, borderRadius: '50%', border: `2px solid ${O}`, background: 'white', color: O, fontWeight: 900, cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                      <span style={{ fontWeight: 800, minWidth: 20, textAlign: 'center' }}>{inCart.qty}</span>
                      <button onClick={() => changeQty(item.id, 1)} disabled={!!atMax} style={{ width: 28, height: 28, borderRadius: '50%', background: atMax ? '#ddd' : O, border: 'none', color: 'white', fontWeight: 900, cursor: atMax ? 'not-allowed' : 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                    </div>
                  ) : (
                    <button onClick={() => addToCart(item)} style={{ background: O, color: 'white', border: 'none', padding: '0.38rem 0.95rem', borderRadius: 20, fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Poppins,sans-serif' }}>+ Add</button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Track Order modal */}
      {showTrackModal && (
        <div className="modal-overlay show" onClick={() => { if (!trackLoading) setShowTrackModal(false); }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 20, width: '100%', maxWidth: 400, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            {/* Modal header */}
            <div style={{ background: `linear-gradient(135deg,#1e3a5f,${O})`, color: 'white', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 900, fontSize: '1.05rem' }}>📍 Track Your Order</div>
                <div style={{ fontSize: '0.72rem', opacity: 0.85, marginTop: '0.15rem' }}>Enter the details you used when ordering</div>
              </div>
              {!trackLoading && (
                <button onClick={() => setShowTrackModal(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1 }}>×</button>
              )}
            </div>

            <div style={{ padding: '1.5rem' }}>
              {/* Name */}
              <div style={{ marginBottom: '0.9rem' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#555', display: 'block', marginBottom: '0.35rem' }}>Your Name</label>
                <input
                  value={trackName}
                  onChange={e => { setTrackName(e.target.value); setTrackError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleTrackLookup()}
                  placeholder="e.g. Ravi Kumar"
                  autoFocus
                  disabled={trackLoading}
                  style={{ width: '100%', padding: '0.65rem 0.9rem', border: '2px solid #e2e8f0', borderRadius: 10, fontFamily: 'Poppins,sans-serif', fontSize: '0.9rem', boxSizing: 'border-box', outline: 'none' }}
                />
              </div>

              {/* Phone */}
              <div style={{ marginBottom: '1.1rem' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#555', display: 'block', marginBottom: '0.35rem' }}>Mobile Number</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={trackPhone}
                  onChange={e => { setTrackPhone(e.target.value); setTrackError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleTrackLookup()}
                  placeholder="e.g. 9876543210"
                  disabled={trackLoading}
                  style={{ width: '100%', padding: '0.65rem 0.9rem', border: '2px solid #e2e8f0', borderRadius: 10, fontFamily: 'Poppins,sans-serif', fontSize: '0.9rem', boxSizing: 'border-box', outline: 'none' }}
                />
              </div>

              {/* Error */}
              {trackError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '0.6rem 0.85rem', fontSize: '0.8rem', color: '#dc2626', fontWeight: 600, marginBottom: '1rem', lineHeight: 1.5 }}>
                  {trackError}
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleTrackLookup}
                disabled={trackLoading}
                style={{ width: '100%', background: trackLoading ? '#94a3b8' : O, color: 'white', border: 'none', padding: '0.8rem', borderRadius: 12, fontWeight: 700, fontSize: '0.95rem', cursor: trackLoading ? 'not-allowed' : 'pointer', fontFamily: 'Poppins,sans-serif' }}
              >
                {trackLoading ? '⏳ Looking up…' : '🔍 Find My Order'}
              </button>

              <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.73rem', color: '#94a3b8' }}>
                Only orders placed online with a phone number can be tracked here
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cart drawer */}
      {cartOpen && (
        <div className="modal-overlay show" onClick={() => { if (!isSubmitting) setCartOpen(false); }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 440, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ background: `linear-gradient(135deg,#1e3a5f,${O})`, color: 'white', padding: '1.1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: "'Playfair Display',serif", fontWeight: 900, fontSize: '1.05rem' }}>🛒 Your Cart</span>
              <button onClick={() => setCartOpen(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem' }}>
              {!cart.length
                ? <p style={{ color: '#999', textAlign: 'center', padding: '2rem 0' }}>Your cart is empty</p>
                : cart.map(c => (
                  <div key={c.item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.7rem 0', borderBottom: '1px solid #f0f9ff' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{c.item.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#888' }}>₹{c.item.price} × {c.qty} = <strong>₹{c.item.price * c.qty}</strong></div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <button onClick={() => changeQty(c.item.id, -1)} style={{ width: 26, height: 26, borderRadius: '50%', border: `2px solid ${O}`, background: 'white', color: O, fontWeight: 900, cursor: 'pointer' }}>−</button>
                      <span style={{ fontWeight: 800, minWidth: 18, textAlign: 'center' }}>{c.qty}</span>
                      <button onClick={() => changeQty(c.item.id, 1)} disabled={c.qty >= MAX_QTY} style={{ width: 26, height: 26, borderRadius: '50%', background: c.qty >= MAX_QTY ? '#ddd' : O, border: 'none', color: 'white', fontWeight: 900, cursor: c.qty >= MAX_QTY ? 'not-allowed' : 'pointer' }}>+</button>
                    </div>
                  </div>
                ))
              }
            </div>
            {cart.length > 0 && (
              <div style={{ padding: '1rem 1.5rem', borderTop: '2px solid #f0f9ff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '1rem', marginBottom: '0.85rem', color: '#1e3a5f' }}>
                  <span>Total</span><span style={{ color: O }}>₹{cartTotal}</span>
                </div>
                <button onClick={() => { setCartOpen(false); setShowCheckout(true); }} style={{ width: '100%', background: O, color: 'white', border: 'none', padding: '0.75rem', borderRadius: 10, fontWeight: 700, fontSize: '1rem', cursor: 'pointer', fontFamily: 'Poppins,sans-serif' }}>
                  Proceed to Checkout →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout modal */}
      {showCheckout && (
        <div className="modal-overlay show" onClick={() => { if (!isSubmitting) setShowCheckout(false); }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 440, maxHeight: '92vh', overflow: 'auto' }}>
            <div style={{ background: `linear-gradient(135deg,#1e3a5f,${O})`, color: 'white', padding: '1.1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: "'Playfair Display',serif", fontWeight: 900, fontSize: '1.05rem' }}>📦 Checkout</span>
              {!isSubmitting && (
                <button onClick={() => setShowCheckout(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
              )}
            </div>
            <div style={{ padding: '1.4rem' }}>

              {/* Error message */}
              {submitError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', padding: '0.65rem 0.85rem', borderRadius: 8, marginBottom: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>
                  ⚠️ {submitError}
                </div>
              )}

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#555', display: 'block', marginBottom: '0.3rem' }}>Your Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" disabled={isSubmitting} style={{ width: '100%', padding: '0.6rem', border: '2px solid #ddd', borderRadius: 8, fontFamily: 'Poppins,sans-serif', fontSize: '0.9rem', boxSizing: 'border-box' }} />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#555', display: 'block', marginBottom: '0.3rem' }}>Phone Number *</label>
                <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91 XXXXX XXXXX" disabled={isSubmitting} style={{ width: '100%', padding: '0.6rem', border: '2px solid #ddd', borderRadius: 8, fontFamily: 'Poppins,sans-serif', fontSize: '0.9rem', boxSizing: 'border-box' }} />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#555', display: 'block', marginBottom: '0.3rem' }}>
                  Email Address <span style={{ color: '#999', fontWeight: 500 }}>(optional — for receipt)</span>
                </label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="you@example.com" disabled={isSubmitting} style={{ width: '100%', padding: '0.6rem', border: '2px solid #ddd', borderRadius: 8, fontFamily: 'Poppins,sans-serif', fontSize: '0.9rem', boxSizing: 'border-box' }} />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#555', display: 'block', marginBottom: '0.4rem' }}>Order Type</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {[
                    { k: 'pickup',   l: '🏪 Pickup'   },
                    { k: 'delivery', l: '🚗 Delivery'  },
                  ].map(t => (
                    <button key={t.k} onClick={() => !isSubmitting && setForm(f => ({ ...f, type: t.k as 'pickup' | 'delivery' }))} style={{
                      flex: 1, padding: '0.5rem', border: `2px solid ${form.type === t.k ? O : '#ddd'}`,
                      borderRadius: 8, background: form.type === t.k ? '#eff6ff' : 'white',
                      color: form.type === t.k ? O : '#666',
                      fontWeight: 700, cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      fontFamily: 'Poppins,sans-serif',
                    }}>
                      {t.l}
                    </button>
                  ))}
                </div>
              </div>

              {form.type === 'delivery' && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#555', display: 'block', marginBottom: '0.3rem' }}>Delivery Address *</label>
                  <textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Full address including landmark" rows={3} disabled={isSubmitting} style={{ width: '100%', padding: '0.6rem', border: '2px solid #ddd', borderRadius: 8, fontFamily: 'Poppins,sans-serif', fontSize: '0.9rem', resize: 'vertical', boxSizing: 'border-box' }} />
                </div>
              )}

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#555', display: 'block', marginBottom: '0.4rem' }}>Payment</label>
                <select value={form.payment} onChange={e => setForm(f => ({ ...f, payment: e.target.value }))} disabled={isSubmitting} style={{ width: '100%', padding: '0.6rem', border: '2px solid #ddd', borderRadius: 8, fontFamily: 'Poppins,sans-serif', fontSize: '0.9rem' }}>
                  <option value="cod">Cash on Delivery/Pickup</option>
                  <option value="gpay">Google Pay</option>
                  <option value="phonepe">PhonePe</option>
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
                </select>
              </div>

              {/* Order summary */}
              <div style={{ background: '#eff6ff', borderRadius: 8, padding: '0.75rem', marginBottom: '1rem' }}>
                {cart.map(c => (
                  <div key={c.item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.83rem', padding: '0.18rem 0' }}>
                    <span>{c.item.name} × {c.qty}</span><span>₹{c.item.price * c.qty}</span>
                  </div>
                ))}
                <div style={{ borderTop: `2px solid ${O}`, marginTop: '0.4rem', paddingTop: '0.4rem', display: 'flex', justifyContent: 'space-between', fontWeight: 900, color: O }}>
                  <span>Total</span><span>₹{cartTotal}</span>
                </div>
              </div>

              <button onClick={placeOrder} disabled={isSubmitting} style={{ width: '100%', background: isSubmitting ? '#bbb' : O, color: 'white', border: 'none', padding: '0.85rem', borderRadius: 10, fontWeight: 700, fontSize: '1rem', cursor: isSubmitting ? 'not-allowed' : 'pointer', fontFamily: 'Poppins,sans-serif' }}>
                {isSubmitting ? '⏳ Placing Order…' : `✅ Place Order — ₹${cartTotal}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
