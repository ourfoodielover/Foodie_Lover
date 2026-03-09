'use client';
import { useState, useEffect, useRef } from 'react';
import { getMenu, addOrder, MenuItem, Order, OrderItem } from '@/lib/storage';

const CATEGORIES = ['All','Biryani','Starters','Mains','Breads','Desserts','Drinks'];
const BADGE_LABELS: Record<string,string> = {
  bestseller:'⭐ Bestseller', popular:'🔥 Popular',
  chef:"👨‍🍳 Chef's Special", famous:'🏆 Famous', new:'✨ New',
};
const MAX_QTY = 20;

export default function CustomerPage() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<{item: MenuItem; qty: number}[]>([]);
  const [filter, setFilter] = useState('All');
  const [cartOpen, setCartOpen] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [lastOrderId, setLastOrderId] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', type: 'pickup', payment: 'cod', tableNo: '' });
  const [showCheckout, setShowCheckout] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Ref prevents double-submit even before React re-renders
  const submittingRef = useRef(false);

  useEffect(() => { setMenu(getMenu()); }, []);

  // Close modals on Escape key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (!isSubmitting) {
          setCartOpen(false);
          setShowCheckout(false);
        }
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isSubmitting]);

  const filtered   = filter === 'All' ? menu.filter(m => m.available !== false) : menu.filter(m => m.category === filter && m.available !== false);
  const cartTotal  = cart.reduce((s, c) => s + c.item.price * c.qty, 0);
  const cartCount  = cart.reduce((s, c) => s + c.qty, 0);

  function addToCart(item: MenuItem) {
    setCart(prev => {
      const ex = prev.find(c => c.item.id === item.id);
      if (ex) {
        if (ex.qty >= MAX_QTY) return prev; // cap quantity
        return prev.map(c => c.item.id === item.id ? {...c, qty: c.qty + 1} : c);
      }
      return [...prev, {item, qty: 1}];
    });
  }

  function changeQty(id: string, delta: number) {
    setCart(prev =>
      prev
        .map(c => c.item.id === id ? {...c, qty: Math.min(c.qty + delta, MAX_QTY)} : c)
        .filter(c => c.qty > 0),
    );
  }

  function placeOrder() {
    if (submittingRef.current || isSubmitting) return;
    if (!form.name.trim()) { alert('Please enter your name'); return; }
    if (form.type === 'dine-in' && !form.tableNo.trim()) { alert('Please enter your table number'); return; }
    if (!cart.length) { alert('Cart is empty'); return; }

    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const ts  = new Date().toISOString();
      // Add random suffix to prevent timestamp collisions on rapid clicks
      const id  = `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

      const items: OrderItem[] = cart.map(c => ({
        name: c.item.name,
        price: c.item.price, qty: c.qty, subtotal: c.item.price * c.qty,
      }));

      const tableId = form.type === 'dine-in' ? form.tableNo.trim().toUpperCase() || undefined : undefined;

      const order: Order = {
        id,
        type: form.type as 'pickup' | 'dine-in',
        tableId,
        customerName: form.name.trim(),
        phone: form.phone.trim() || undefined,
        items,
        subtotal: cartTotal,
        discount: 0,
        discountReason: '',
        total: cartTotal,
        payment: form.payment,
        status: 'pending',
        timeline: [{ status: 'pending', at: ts }],
        timestamp: ts,
      };

      addOrder(order);
      setLastOrderId(id);
      setCart([]);
      setShowCheckout(false);
      setOrderPlaced(true);
      setTimeout(() => setOrderPlaced(false), 6000);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#faf8f3,#f5f0e8)' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#1A0800,#2D0F00)', color: 'white', padding: '1.25rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 }}>
        <div>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.4rem', fontWeight: 900 }}>🍽️ Foodie Lover</div>
          <div style={{ fontSize: '0.8rem', color: '#F9A826' }}>Pickup & Dine-In Ordering</div>
        </div>
        <button
          onClick={() => setCartOpen(true)}
          style={{ background: '#E65C00', border: 'none', color: 'white', padding: '0.6rem 1.2rem', borderRadius: '20px', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          🛒 Cart
          {cartCount > 0 && (
            <span style={{ background: 'white', color: '#E65C00', borderRadius: '50%', width: '20px', height: '20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 900 }}>
              {cartCount}
            </span>
          )}
        </button>
      </div>

      {/* Success notification */}
      {orderPlaced && (
        <div style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#15803d', padding: '1rem 2rem', textAlign: 'center', fontWeight: 700 }}>
          ✅ Order placed successfully! Order ID: <strong>{lastOrderId}</strong> — We&apos;ll prepare it shortly.
        </div>
      )}

      {/* Category Filter */}
      <div style={{ padding: '1rem 1.5rem', display: 'flex', gap: '0.5rem', overflowX: 'auto' }}>
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setFilter(cat)}
            style={{ padding: '0.4rem 1rem', borderRadius: '20px', border: '2px solid', borderColor: filter===cat ? '#E65C00' : '#ddd', background: filter===cat ? '#E65C00' : 'white', color: filter===cat ? 'white' : '#666', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '0.82rem', fontFamily: 'Poppins,sans-serif' }}>
            {cat}
          </button>
        ))}
      </div>

      {/* Menu Grid */}
      <div style={{ padding: '0 1.5rem 6rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '1rem' }}>
        {filtered.map(item => {
          const inCart = cart.find(c => c.item.id === item.id);
          const atMax  = inCart && inCart.qty >= MAX_QTY;
          return (
            <div key={item.id} style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
              {item.img && <img src={item.img} alt={item.name} style={{ width: '100%', height: '160px', objectFit: 'cover' }} />}
              <div style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.3rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1A0800' }}>{item.name}</div>
                  {item.badge && (
                    <span style={{ fontSize: '0.65rem', background: '#FFF5EB', color: '#E65C00', padding: '0.15rem 0.4rem', borderRadius: '8px', fontWeight: 700, whiteSpace: 'nowrap', marginLeft: '0.5rem' }}>
                      {BADGE_LABELS[item.badge]||item.badge}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#888', marginBottom: '0.75rem', lineHeight: '1.4' }}>{item.desc}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 900, color: '#E65C00', fontSize: '1.05rem' }}>₹{item.price}</span>
                  {inCart ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button onClick={() => changeQty(item.id, -1)} style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px solid #E65C00', background: 'white', color: '#E65C00', fontWeight: 900, cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                      <span style={{ fontWeight: 800, minWidth: '20px', textAlign: 'center' }}>{inCart.qty}</span>
                      <button
                        onClick={() => changeQty(item.id, 1)}
                        disabled={!!atMax}
                        style={{ width: '28px', height: '28px', borderRadius: '50%', background: atMax ? '#ddd' : '#E65C00', border: 'none', color: 'white', fontWeight: 900, cursor: atMax ? 'not-allowed' : 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >+</button>
                    </div>
                  ) : (
                    <button onClick={() => addToCart(item)} style={{ background: '#E65C00', color: 'white', border: 'none', padding: '0.4rem 1rem', borderRadius: '20px', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem', fontFamily: 'Poppins,sans-serif' }}>+ Add</button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cart Drawer */}
      {cartOpen && (
        <div className="modal-overlay show" onClick={() => { if (!isSubmitting) setCartOpen(false); }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '440px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ background: 'linear-gradient(135deg,#1A0800,#E65C00)', color: 'white', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: "'Playfair Display',serif", fontWeight: 900, fontSize: '1.1rem' }}>🛒 Your Cart</span>
              <button onClick={() => setCartOpen(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem' }}>
              {!cart.length
                ? <p style={{ color: '#999', textAlign: 'center', padding: '2rem 0' }}>Your cart is empty</p>
                : cart.map(c => (
                  <div key={c.item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid #f5f0e8' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{c.item.name}</div>
                      <div style={{ fontSize: '0.78rem', color: '#888' }}>₹{c.item.price} × {c.qty} = <strong>₹{c.item.price*c.qty}</strong></div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <button onClick={() => changeQty(c.item.id,-1)} style={{ width:'26px',height:'26px',borderRadius:'50%',border:'2px solid #E65C00',background:'white',color:'#E65C00',fontWeight:900,cursor:'pointer' }}>−</button>
                      <span style={{ fontWeight:800,minWidth:'18px',textAlign:'center' }}>{c.qty}</span>
                      <button onClick={() => changeQty(c.item.id,1)} disabled={c.qty >= MAX_QTY} style={{ width:'26px',height:'26px',borderRadius:'50%',background:c.qty>=MAX_QTY?'#ddd':'#E65C00',border:'none',color:'white',fontWeight:900,cursor:c.qty>=MAX_QTY?'not-allowed':'pointer' }}>+</button>
                    </div>
                  </div>
                ))
              }
            </div>
            {cart.length > 0 && (
              <div style={{ padding: '1rem 1.5rem', borderTop: '2px solid #f5f0e8' }}>
                <div style={{ display:'flex',justifyContent:'space-between',fontWeight:900,fontSize:'1.05rem',marginBottom:'1rem',color:'#1A0800' }}>
                  <span>Total</span><span style={{ color:'#E65C00' }}>₹{cartTotal}</span>
                </div>
                <button onClick={() => { setCartOpen(false); setShowCheckout(true); }} style={{ width:'100%',background:'#E65C00',color:'white',border:'none',padding:'0.75rem',borderRadius:'10px',fontWeight:700,fontSize:'1rem',cursor:'pointer',fontFamily:'Poppins,sans-serif' }}>
                  Proceed to Checkout →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="modal-overlay show" onClick={() => { if (!isSubmitting) setShowCheckout(false); }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'white',borderRadius:'16px',width:'100%',maxWidth:'440px',maxHeight:'90vh',overflow:'auto' }}>
            <div style={{ background:'linear-gradient(135deg,#1A0800,#E65C00)',color:'white',padding:'1.25rem 1.5rem',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
              <span style={{ fontFamily:"'Playfair Display',serif",fontWeight:900,fontSize:'1.1rem' }}>Checkout</span>
              {!isSubmitting && (
                <button onClick={() => setShowCheckout(false)} style={{ background:'none',border:'none',color:'white',fontSize:'1.5rem',cursor:'pointer' }}>×</button>
              )}
            </div>
            <div style={{ padding:'1.5rem' }}>
              <div style={{ marginBottom:'1rem' }}>
                <label style={{ fontSize:'0.8rem',fontWeight:700,color:'#555',display:'block',marginBottom:'0.3rem' }}>Your Name *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f=>({...f,name:e.target.value}))}
                  placeholder="Enter your name"
                  disabled={isSubmitting}
                  style={{ width:'100%',padding:'0.6rem',border:'2px solid #ddd',borderRadius:'8px',fontFamily:'Poppins,sans-serif',fontSize:'0.9rem' }}
                />
              </div>
              <div style={{ marginBottom:'1rem' }}>
                <label style={{ fontSize:'0.8rem',fontWeight:700,color:'#555',display:'block',marginBottom:'0.3rem' }}>Phone (optional)</label>
                <input
                  value={form.phone}
                  onChange={e => setForm(f=>({...f,phone:e.target.value}))}
                  placeholder="+91 XXXXX XXXXX"
                  disabled={isSubmitting}
                  style={{ width:'100%',padding:'0.6rem',border:'2px solid #ddd',borderRadius:'8px',fontFamily:'Poppins,sans-serif',fontSize:'0.9rem' }}
                />
              </div>
              <div style={{ marginBottom:'1rem' }}>
                <label style={{ fontSize:'0.8rem',fontWeight:700,color:'#555',display:'block',marginBottom:'0.5rem' }}>Order Type</label>
                <div style={{ display:'flex',gap:'0.5rem' }}>
                  {['pickup','dine-in'].map(t => (
                    <button key={t} onClick={() => !isSubmitting && setForm(f=>({...f,type:t}))}
                      style={{ flex:1,padding:'0.5rem',border:`2px solid ${form.type===t?'#E65C00':'#ddd'}`,borderRadius:'8px',background:form.type===t?'#FFF5EB':'white',color:form.type===t?'#E65C00':'#666',fontWeight:700,cursor:isSubmitting?'not-allowed':'pointer',fontFamily:'Poppins,sans-serif',textTransform:'capitalize' }}>
                      {t === 'pickup' ? '🛍️ Pickup' : '🪑 Dine-In'}
                    </button>
                  ))}
                </div>
              </div>
              {form.type === 'dine-in' && (
                <div style={{ marginBottom:'1rem' }}>
                  <label style={{ fontSize:'0.8rem',fontWeight:700,color:'#555',display:'block',marginBottom:'0.3rem' }}>Table Number *</label>
                  <input
                    type="number"
                    value={form.tableNo}
                    onChange={e => setForm(f=>({...f,tableNo:e.target.value}))}
                    placeholder="e.g. 5"
                    disabled={isSubmitting}
                    min={1}
                    style={{ width:'100%',padding:'0.6rem',border:'2px solid #ddd',borderRadius:'8px',fontFamily:'Poppins,sans-serif',fontSize:'0.9rem' }}
                  />
                </div>
              )}
              <div style={{ marginBottom:'1.5rem' }}>
                <label style={{ fontSize:'0.8rem',fontWeight:700,color:'#555',display:'block',marginBottom:'0.5rem' }}>Payment Method</label>
                <select
                  value={form.payment}
                  onChange={e => setForm(f=>({...f,payment:e.target.value}))}
                  disabled={isSubmitting}
                  style={{ width:'100%',padding:'0.6rem',border:'2px solid #ddd',borderRadius:'8px',fontFamily:'Poppins,sans-serif',fontSize:'0.9rem' }}
                >
                  <option value="cod">Cash on Delivery</option>
                  <option value="gpay">Google Pay</option>
                  <option value="phonepe">PhonePe</option>
                  <option value="paytm">Paytm</option>
                </select>
              </div>
              <div style={{ background:'#FFF5EB',borderRadius:'8px',padding:'0.75rem',marginBottom:'1rem' }}>
                {cart.map(c => (
                  <div key={c.item.id} style={{ display:'flex',justifyContent:'space-between',fontSize:'0.85rem',padding:'0.2rem 0' }}>
                    <span>{c.item.name} × {c.qty}</span><span>₹{c.item.price*c.qty}</span>
                  </div>
                ))}
                <div style={{ borderTop:'2px solid #E65C00',marginTop:'0.5rem',paddingTop:'0.5rem',display:'flex',justifyContent:'space-between',fontWeight:900,color:'#E65C00' }}>
                  <span>Total</span><span>₹{cartTotal}</span>
                </div>
              </div>
              <button
                onClick={placeOrder}
                disabled={isSubmitting}
                style={{ width:'100%',background:isSubmitting?'#bbb':'#E65C00',color:'white',border:'none',padding:'0.85rem',borderRadius:'10px',fontWeight:700,fontSize:'1rem',cursor:isSubmitting?'not-allowed':'pointer',fontFamily:'Poppins,sans-serif',transition:'background 0.2s' }}
              >
                {isSubmitting ? '⏳ Placing Order...' : '✅ Place Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
