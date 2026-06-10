'use client';

export const dynamic = 'force-dynamic';
import { useState, useEffect, useRef, useCallback, FormEvent } from 'react';
import { getMenu, createOrder, lookupOrderByContact, MenuItem } from '@/lib/api';
import { safeApiCall } from '@/lib/safe-api';
import { validateIndianPhone, validateEmail, normaliseIndianPhone } from '@/lib/validation';
import { MENU_CATEGORIES_WITH_ALL } from '@/lib/categories';

interface OfferRule {
  id: string;
  name: string;
  type: 'percent' | 'flat';
  value: number;
  minOrder: number;
  maxDiscount: number;
  applyTo: 'all' | 'dine-in' | 'pickup' | 'delivery';
  active: boolean;
}

const CATEGORIES = MENU_CATEGORIES_WITH_ALL;
const BADGE_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  bestseller: { label: '⭐ Bestseller', bg: '#fef3c7', color: '#d97706' },
  popular:    { label: '🔥 Popular',    bg: '#fee2e2', color: '#dc2626' },
  chef:       { label: "👨‍🍳 Chef's Special", bg: '#f3e8ff', color: '#7c3aed' },
  famous:     { label: '🏆 Famous',     bg: '#fef3c7', color: '#b45309' },
  new:        { label: '✨ New',         bg: '#d1fae5', color: '#059669' },
};
const MAX_QTY = 20;
const PRIMARY = '#E65C00';
const PRIMARY_DARK = '#c94e00';
const GRAD = 'linear-gradient(135deg,#E65C00 0%,#F9A825 100%)';

interface CartItem {
  key:          string;
  itemId:       string;
  itemName:     string;
  variantName:  string;
  variantPrice: number;
  qty:          number;
}

// ─── AI types ─────────────────────────────────────────────────────────────────

interface AIChatMessage {
  role:    'user' | 'assistant';
  content: string;
}

interface AIAction {
  type:          string;
  itemId?:       string;
  itemName?:     string;
  variantName?:  string;
  variantPrice?: number;
  quantity?:     number;
}

interface FoodieAIChatProps {
  menu:        MenuItem[];
  cart:        CartItem[];
  onAction:    (action: AIAction) => void;
  onCheckout:  () => void;
  onClose:     () => void;
}

// ─── Foodie AI Chat component ─────────────────────────────────────────────────

function FoodieAIChat({ menu, cart, onAction, onCheckout, onClose }: FoodieAIChatProps) {
  const [messages,  setMessages]  = useState<AIChatMessage[]>([
    { role: 'assistant', content: "👋 Hi! I'm Foodie AI. Tell me what you'd like to eat — I can add items, suggest dishes, or help you find something within your budget. What sounds good?" },
  ]);
  const [input,    setInput]     = useState('');
  const [loading,  setLoading]   = useState(false);
  const bottomRef                = useRef<HTMLDivElement>(null);
  const inputRef                 = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 200);
    return () => clearTimeout(t);
  }, []);

  async function sendMessage(e?: FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: AIChatMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const historyToSend = [...messages.slice(1), userMsg];

    try {
      const res = await fetch('/api/ai/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: text, cart, menu, history: historyToSend }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { reply: string; actions: AIAction[] };

      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);

      for (const action of data.actions ?? []) {
        if (action.type === 'OPEN_CHECKOUT') {
          onClose();
          onCheckout();
        } else {
          onAction(action);
        }
      }
    } catch (err) {
      console.error('[FoodieAI]', err);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm having trouble right now. Please try again in a moment! 🙏",
      }]);
    } finally {
      setLoading(false);
    }
  }

  const PURPLE    = '#7c3aed';
  const GRAD_AI   = 'linear-gradient(135deg,#7c3aed,#a855f7)';
  const quickTips = [
    '🍗 Dinner for 2 people',
    '💰 Food under ₹500',
    '🌶 Spicy chicken dishes',
    '🛒 Show my cart',
    '✅ Checkout now',
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ background: GRAD_AI, color: 'white', padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', border: '1px solid rgba(255,255,255,0.3)' }}>💬</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>Foodie AI</div>
            <div style={{ fontSize: '0.68rem', opacity: 0.85 }}>Your personal ordering assistant</div>
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', fontWeight: 900, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem', background: '#f9fafb' }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: '0.45rem' }}>
            {m.role === 'assistant' && (
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: GRAD_AI, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', flexShrink: 0 }}>💬</div>
            )}
            <div style={{
              maxWidth: '78%', padding: '0.6rem 0.85rem',
              borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              background: m.role === 'user' ? PRIMARY : 'white',
              color: m.role === 'user' ? 'white' : '#1a1a2e',
              fontSize: '0.84rem', lineHeight: 1.55,
              boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.45rem' }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: GRAD_AI, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', flexShrink: 0 }}>💬</div>
            <div style={{ background: 'white', padding: '0.65rem 0.85rem', borderRadius: '18px 18px 18px 4px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center', height: 16 }}>
                {[0, 0.2, 0.4].map(delay => (
                  <div key={delay} style={{ width: 7, height: 7, borderRadius: '50%', background: PURPLE, animation: `fl-ai-dot 1s ${delay}s infinite ease-in-out` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick suggestion chips (only on first message) */}
      {messages.length === 1 && (
        <div style={{ padding: '0.5rem 1rem 0', background: '#f9fafb', display: 'flex', gap: '0.4rem', flexWrap: 'wrap', flexShrink: 0 }}>
          {quickTips.map(tip => (
            <button
              key={tip}
              onClick={() => { setInput(tip); setTimeout(() => { sendMessage(); }, 10); }}
              style={{ background: 'white', border: `1.5px solid ${PURPLE}44`, borderRadius: 16, padding: '0.28rem 0.65rem', fontSize: '0.72rem', cursor: 'pointer', color: PURPLE, fontWeight: 600, transition: 'all 0.12s' }}
              onMouseEnter={e => { e.currentTarget.style.background = PURPLE; e.currentTarget.style.color = 'white'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = PURPLE; }}
            >{tip}</button>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={sendMessage} style={{ padding: '0.7rem 1rem', background: 'white', borderTop: '1px solid #ede9fe', display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask me anything about the menu…"
          disabled={loading}
          maxLength={500}
          style={{ flex: 1, padding: '0.55rem 0.85rem', border: '2px solid #e5e7eb', borderRadius: 22, fontSize: '0.85rem', outline: 'none', transition: 'border-color 0.15s', fontFamily: 'Poppins,sans-serif' }}
          onFocus={e => (e.target.style.borderColor = PURPLE)}
          onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
        />
        <button type="submit" disabled={!input.trim() || loading} style={{ width: 40, height: 40, borderRadius: '50%', background: !input.trim() || loading ? '#e5e7eb' : GRAD_AI, border: 'none', color: 'white', cursor: !input.trim() || loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1rem', transition: 'all 0.15s' }}>
          {loading ? '⏳' : '➤'}
        </button>
      </form>

      <style>{`
        @keyframes fl-ai-dot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40%            { transform: scale(1);   opacity: 1;   }
        }
      `}</style>
    </div>
  );
}

export default function OnlineOrderPage() {
  const [menu, setMenu]                 = useState<MenuItem[]>([]);
  const [cart, setCart]                 = useState<CartItem[]>([]);
  const [search, setSearch]             = useState('');
  const [filter, setFilter]             = useState('All');
  const [variantModal, setVariantModal] = useState<{open:boolean;item:MenuItem|null;selected:string}>({open:false,item:null,selected:''});
  const [cartOpen, setCartOpen]         = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [orderPlaced, setOrderPlaced]   = useState(false);
  const [lastOrderId, setLastOrderId]   = useState('');
  const [lastTrackUrl, setLastTrackUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError]   = useState('');
  const [addedKey, setAddedKey]         = useState<string|null>(null); // for animation
  const [aiOpen,   setAiOpen]           = useState(false);

  const [showTrackModal,  setShowTrackModal]  = useState(false);
  const [trackName,       setTrackName]       = useState('');
  const [trackPhone,      setTrackPhone]      = useState('');
  const [trackError,      setTrackError]      = useState('');
  const [trackLoading,    setTrackLoading]    = useState(false);

  const [form, setForm] = useState({
    name: '', phone: '', email: '',
    type: 'pickup' as 'pickup' | 'delivery',
    address: '', payment: 'cod',
  });
  const [formErrors, setFormErrors] = useState({ name: '', phone: '', email: '', address: '' });

  const submittingRef  = useRef(false);
  const searchRef      = useRef<HTMLInputElement>(null);
  const categoryBarRef = useRef<HTMLDivElement>(null);

  const [offerRules, setOfferRules] = useState<OfferRule[]>([]);

  useEffect(() => {
    getMenu().then(setMenu).catch(() => setMenu([]));
    fetch('/api/offers').then(r => r.json()).then(d => { if (Array.isArray(d)) setOfferRules(d); }).catch(() => {});
  }, []);

  /** Returns all qualifying offers for the given cart total + order type. */
  function getOffers(total: number, orderType: string) {
    return offerRules
      .filter(r => r.active && (r.applyTo === 'all' || r.applyTo === orderType))
      .map(r => {
        const raw = r.type === 'percent' ? Math.round((total * r.value) / 100) : r.value;
        const discountAmount = r.maxDiscount > 0 ? Math.min(raw, r.maxDiscount) : raw;
        return { offer: r, discountAmount };
      })
      .filter(x => total >= x.offer.minOrder);
  }

  /** Returns the best (highest discount) qualifying offer. */
  function getBestOffer(total: number, orderType: string) {
    const all = getOffers(total, orderType);
    if (!all.length) return null;
    return all.reduce((best, x) => x.discountAmount > best.discountAmount ? x : best);
  }

  /** Teaser: offers that are close but not yet qualifying (within 40% of minOrder). */
  function getTeaserOffers(total: number, orderType: string) {
    return offerRules
      .filter(r => r.active && (r.applyTo === 'all' || r.applyTo === orderType))
      .filter(r => total < r.minOrder && total >= r.minOrder * 0.6)
      .map(r => ({ offer: r, needed: r.minOrder - total }));
  }

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      if (!isSubmitting)  { setCartOpen(false); setShowCheckout(false); }
      if (!trackLoading)  { setShowTrackModal(false); }
      setVariantModal({ open: false, item: null, selected: '' });
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isSubmitting, trackLoading]);

  const q = search.trim().toLowerCase();
  const filtered = menu
    .filter(m => m.available !== false)
    .filter(m => filter === 'All' || m.category === filter)
    .filter(m =>
      !q ||
      m.name.toLowerCase().includes(q) ||
      (m.desc ?? '').toLowerCase().includes(q) ||
      (m.category ?? '').toLowerCase().includes(q),
    );

  const cartTotal = cart.reduce((s, c) => s + c.variantPrice * c.qty, 0);
  const cartCount = cart.reduce((s, c) => s + c.qty, 0);
  const bestOffer  = getBestOffer(cartTotal, form.type);
  const discountAmt = bestOffer?.discountAmount ?? 0;
  const finalTotal  = Math.max(0, cartTotal - discountAmt);

  function itemCartQty(itemId: string) {
    return cart.filter(c => c.itemId === itemId).reduce((s, c) => s + c.qty, 0);
  }

  const flashAdded = useCallback((key: string) => {
    setAddedKey(key);
    setTimeout(() => setAddedKey(null), 600);
  }, []);

  // ─── AI action handler ─────────────────────────────────────────────────────
  function handleAiAction(action: AIAction) {
    switch (action.type) {
      case 'ADD_TO_CART': {
        if (!action.itemId) break;
        const key = `${action.itemId}__${action.variantName ?? ''}`;
        const qty = Math.max(1, Math.min(action.quantity ?? 1, MAX_QTY));
        setCart(prev => {
          const ex = prev.find(c => c.key === key);
          if (ex) {
            const newQty = Math.min(ex.qty + qty, MAX_QTY);
            return prev.map(c => c.key === key ? { ...c, qty: newQty } : c);
          }
          if (!action.itemName || action.variantPrice == null) return prev;
          return [...prev, {
            key,
            itemId:       action.itemId!,
            itemName:     action.itemName,
            variantName:  action.variantName ?? '',
            variantPrice: action.variantPrice,
            qty,
          }];
        });
        flashAdded(key);
        break;
      }
      case 'REMOVE_FROM_CART': {
        const key = `${action.itemId}__${action.variantName ?? ''}`;
        setCart(prev => prev.filter(c => c.key !== key));
        break;
      }
      case 'UPDATE_QUANTITY': {
        const key = `${action.itemId}__${action.variantName ?? ''}`;
        const qty = Math.max(0, Math.min(action.quantity ?? 1, MAX_QTY));
        setCart(prev => prev.map(c => c.key === key ? { ...c, qty } : c).filter(c => c.qty > 0));
        break;
      }
      case 'SHOW_CART':
        setCartOpen(true);
        break;
      case 'CLEAR_CART':
        setCart([]);
        break;
      default:
        break;
    }
  }

  function addDirectToCart(item: MenuItem) {
    const key = `${item.id}__`;
    setCart(prev => {
      const ex = prev.find(c => c.key === key);
      if (ex) {
        if (ex.qty >= MAX_QTY) return prev;
        return prev.map(c => c.key === key ? { ...c, qty: c.qty + 1 } : c);
      }
      return [...prev, { key, itemId: item.id, itemName: item.name, variantName: '', variantPrice: item.price, qty: 1 }];
    });
    flashAdded(key);
  }

  function openVariantPicker(item: MenuItem) {
    const first = item.variants?.[0]?.name ?? '';
    setVariantModal({ open: true, item, selected: first });
  }

  function confirmVariantAdd() {
    const { item, selected } = variantModal;
    if (!item || !selected) return;
    const variant = item.variants?.find(v => v.name === selected);
    if (!variant) return;
    const key = `${item.id}__${selected}`;
    setCart(prev => {
      const ex = prev.find(c => c.key === key);
      if (ex) {
        if (ex.qty >= MAX_QTY) return prev;
        return prev.map(c => c.key === key ? { ...c, qty: c.qty + 1 } : c);
      }
      return [...prev, { key, itemId: item.id, itemName: item.name, variantName: selected, variantPrice: variant.price, qty: 1 }];
    });
    flashAdded(key);
    setVariantModal({ open: false, item: null, selected: '' });
  }

  function changeQty(key: string, delta: number) {
    setCart(prev =>
      prev
        .map(c => c.key === key ? { ...c, qty: Math.min(Math.max(0, c.qty + delta), MAX_QTY) } : c)
        .filter(c => c.qty > 0),
    );
  }

  function scrollCatIntoView(cat: string) {
    const bar = categoryBarRef.current;
    if (!bar) return;
    const btn = bar.querySelector<HTMLButtonElement>(`[data-cat="${cat}"]`);
    btn?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }

  async function placeOrder() {
    if (submittingRef.current || isSubmitting) return;

    // ── Validate all fields before submitting ─────────────────────────────
    const nameErr    = form.name.trim() ? '' : 'Name is required';
    const phoneErr   = validateIndianPhone(form.phone);
    const emailErr   = validateEmail(form.email);                  // optional
    const addressErr = form.type === 'delivery' && !form.address.trim()
      ? 'Delivery address is required' : '';

    setFormErrors({ name: nameErr, phone: phoneErr, email: emailErr, address: addressErr });

    if (nameErr || phoneErr || emailErr || addressErr) return;
    if (!cart.length) { setSubmitError('Your cart is empty'); return; }

    submittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const items = cart.map(c => ({
        name:       c.variantName ? `${c.itemName} (${c.variantName})` : c.itemName,
        price:      c.variantPrice,
        qty:        c.qty,
        subtotal:   c.variantPrice * c.qty,
        menuItemId: c.itemId,
      }));

      const orderData = {
        type:            form.type,
        customerName:    form.name.trim(),
        customerEmail:   form.email.trim() || undefined,
        phone:           normaliseIndianPhone(form.phone) ?? form.phone.trim(),
        items,
        subtotal:        cartTotal,
        total:           finalTotal,
        ...(discountAmt > 0 && { discount: discountAmt, discountReason: bestOffer!.offer.name }),
        deliveryAddress: form.type === 'delivery' ? form.address.trim() : undefined,
        paymentMethod:   form.payment,
        source:          'online',
      };

      const idempotencyKey = `order_${form.phone}_${Date.now()}`;
      const result = await safeApiCall('create_order', () => createOrder(orderData), orderData, idempotencyKey);

      if (result.queued) {
        setLastOrderId('offline-pending');
        setLastTrackUrl('');
        setCart([]);
        setShowCheckout(false);
        setOrderPlaced(true);
        setForm({ name: '', phone: '', email: '', type: 'pickup', address: '', payment: 'cod' });
        setFormErrors({ name: '', phone: '', email: '', address: '' });
      } else if (result.data) {
        const savedOrder = result.data;
        const trackUrl = savedOrder.trackingToken
          ? `/track?id=${savedOrder.id}&token=${savedOrder.trackingToken}` : '';
        setLastOrderId(savedOrder.id);
        setLastTrackUrl(trackUrl);
        setCart([]);
        setShowCheckout(false);
        setOrderPlaced(true);
        setForm({ name: '', phone: '', email: '', type: 'pickup', address: '', payment: 'cod' });
        setFormErrors({ name: '', phone: '', email: '', address: '' });
      } else {
        setSubmitError(result.error ?? 'Failed to place order');
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to place order. Please try again.');
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
        setTrackError('No order found. Check your name and number and try again.');
        return;
      }
      window.location.href = `/track?id=${found.id}&token=${found.trackingToken}`;
    } catch (err) {
      setTrackError(`Something went wrong: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setTrackLoading(false);
    }
  }

  const popularItems = menu.filter(m => m.available !== false && (m.badge === 'bestseller' || m.badge === 'popular' || m.badge === 'famous')).slice(0, 6);

  return (
    <div style={{ minHeight: '100vh', background: '#fff9f5', fontFamily: "'Poppins', 'Segoe UI', sans-serif" }}>

      {/* ── Global styles ─────────────────────────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&family=Playfair+Display:wght@700;900&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { height: 4px; width: 4px; }
        ::-webkit-scrollbar-thumb { background: #E65C00; border-radius: 4px; }

        .fl-card { transition: transform 0.18s ease, box-shadow 0.18s ease; }
        .fl-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(230,92,0,0.18) !important; }

        .fl-add-btn { transition: background 0.15s, transform 0.1s; }
        .fl-add-btn:hover { background: #c94e00 !important; transform: scale(1.04); }
        .fl-add-btn:active { transform: scale(0.97); }

        .fl-cat-btn { transition: all 0.15s ease; }
        .fl-cat-btn:hover { border-color: #E65C00 !important; color: #E65C00 !important; }

        @keyframes fl-bounce {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.25); }
          70%  { transform: scale(0.92); }
          100% { transform: scale(1); }
        }
        .fl-added { animation: fl-bounce 0.55s ease; }

        @keyframes fl-fadeup {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fl-fadeup { animation: fl-fadeup 0.35s ease both; }

        @keyframes fl-pulse {
          0%, 100% { box-shadow: 0 4px 20px rgba(230,92,0,0.4); }
          50%       { box-shadow: 0 4px 32px rgba(230,92,0,0.7); }
        }
        .fl-float-cart { animation: fl-pulse 2.5s ease-in-out infinite; }

        .fl-skeleton {
          background: linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%);
          background-size: 200% 100%;
          animation: fl-shimmer 1.4s infinite;
          border-radius: 8px;
        }
        @keyframes fl-shimmer {
          from { background-position: 200% 0; }
          to   { background-position: -200% 0; }
        }

        .modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.55);
          z-index: 500; display: flex; align-items: flex-end; justify-content: center;
          padding: 0; backdrop-filter: blur(2px);
        }
        @media (min-width: 600px) {
          .modal-overlay { align-items: center; padding: 1rem; }
        }

        .fl-input {
          width: 100%; padding: 0.65rem 0.9rem;
          border: 2px solid #e5e7eb; border-radius: 10px;
          font-family: 'Poppins',sans-serif; font-size: 0.9rem;
          outline: none; transition: border-color 0.15s;
        }
        .fl-input:focus { border-color: #E65C00; }

        @media (max-width: 480px) {
          .fl-hero-cta-row { flex-direction: column !important; align-items: stretch !important; }
          .fl-hero-cta-row > button { text-align: center; }
          .fl-menu-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ── Slim top nav ─────────────────────────────────────────────────── */}
      <nav style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #f1e5dc', padding: '0.6rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 300 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.3rem' }}>🍽️</span>
          <span style={{ fontFamily: "'Playfair Display',serif", fontWeight: 900, fontSize: '1.1rem', color: PRIMARY }}>Foodie Lover</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            onClick={() => { setShowTrackModal(true); setTrackError(''); setTrackName(''); setTrackPhone(''); }}
            style={{ background: 'none', border: '1.5px solid #e5e7eb', borderRadius: 20, padding: '0.3rem 0.75rem', fontSize: '0.75rem', fontWeight: 600, color: '#555', cursor: 'pointer', fontFamily: 'Poppins,sans-serif' }}
          >📍 Track Order</button>
        </div>
      </nav>

      {/* ── Hero section ─────────────────────────────────────────────────── */}
      <section style={{ background: GRAD, color: 'white', padding: '2.5rem 1.5rem 3rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* Decorative blobs */}
        <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -30, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', maxWidth: 560, margin: '0 auto' }}>
          <div style={{ fontSize: '2.8rem', marginBottom: '0.25rem', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.15))' }}>🍽️</div>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 'clamp(1.8rem,5vw,2.6rem)', fontWeight: 900, margin: '0 0 0.4rem', textShadow: '0 1px 4px rgba(0,0,0,0.2)', lineHeight: 1.15 }}>Foodie Lover</h1>
          <p style={{ fontSize: '0.95rem', opacity: 0.92, margin: '0 0 1.4rem', fontWeight: 500 }}>Authentic flavours, delivered fresh to you</p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.6rem', fontSize: '0.82rem' }}>
            {[
              { icon: '🚚', label: 'Delivery Available' },
              { icon: '⏱', label: 'Pickup: 20–30 min' },
              { icon: '🔥', label: 'Hot & Fresh' },
              { icon: '⭐', label: 'Customer Favourites' },
            ].map(b => (
              <span key={b.label} style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: '0.3rem 0.75rem', fontWeight: 600, backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.3)' }}>
                {b.icon} {b.label}
              </span>
            ))}
          </div>

          <div className="fl-hero-cta-row" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => { const el = document.getElementById('fl-menu'); el?.scrollIntoView({ behavior: 'smooth' }); searchRef.current?.focus(); }}
              style={{ background: 'white', color: PRIMARY, border: 'none', padding: '0.75rem 2rem', borderRadius: 28, fontWeight: 800, fontSize: '1rem', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', boxShadow: '0 4px 16px rgba(0,0,0,0.2)', transition: 'transform 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.04)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              🛍️ Start Ordering
            </button>
            {popularItems.length > 0 && (
              <button
                onClick={() => { setFilter('All'); setSearch(''); const el = document.getElementById('fl-menu'); el?.scrollIntoView({ behavior: 'smooth' }); }}
                style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '2px solid rgba(255,255,255,0.6)', padding: '0.7rem 1.5rem', borderRadius: 28, fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', backdropFilter: 'blur(4px)' }}
              >
                🔥 View Menu
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── Order placed confirmation ─────────────────────────────────────── */}
      {orderPlaced && (
        <div className="fl-fadeup" style={{ background: '#dcfce7', borderBottom: '2px solid #86efac', padding: '1rem 1.5rem' }}>
          <div style={{ maxWidth: 700, margin: '0 auto' }}>
            <div style={{ fontWeight: 700, color: '#15803d', marginBottom: '0.3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>✅ Order placed! ID: <strong>{lastOrderId}</strong></span>
              <button onClick={() => setOrderPlaced(false)} style={{ background: 'none', border: 'none', color: '#15803d', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 900, lineHeight: 1 }}>×</button>
            </div>
            {lastTrackUrl && (
              <a href={lastTrackUrl} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: '0.82rem', color: '#15803d', fontWeight: 700, textDecoration: 'underline' }}>
                🔗 Track your order in real time →
              </a>
            )}
          </div>
        </div>
      )}

      {/* ── Sticky search + category bar ─────────────────────────────────── */}
      <div id="fl-menu" style={{ position: 'sticky', top: 50, zIndex: 200, background: 'rgba(255,249,245,0.97)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #f1e5dc', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        {/* Search */}
        <div style={{ padding: '0.7rem 1.25rem 0.4rem' }}>
          <div style={{ maxWidth: 700, margin: '0 auto', position: 'relative' }}>
            <span style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', pointerEvents: 'none' }}>🔍</span>
            <input
              ref={searchRef}
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search Chicken, Biryani, Mandi, Lassi, Roti…"
              style={{ width: '100%', padding: '0.65rem 0.9rem 0.65rem 2.4rem', border: '2px solid #e5e7eb', borderRadius: 28, fontFamily: 'Poppins,sans-serif', fontSize: '0.88rem', outline: 'none', background: 'white', transition: 'border-color 0.15s' }}
              onFocus={e => (e.target.style.borderColor = PRIMARY)}
              onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: '#e5e7eb', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#666' }}>×</button>
            )}
          </div>
        </div>

        {/* Category tabs */}
        <div
          ref={categoryBarRef}
          style={{ display: 'flex', gap: '0.35rem', padding: '0.3rem 1.25rem 0.6rem', overflowX: 'auto', scrollbarWidth: 'none' }}
        >
          {CATEGORIES.map(cat => {
            const active = filter === cat;
            return (
              <button
                key={cat}
                data-cat={cat}
                className="fl-cat-btn"
                onClick={() => { setFilter(cat); scrollCatIntoView(cat); }}
                style={{
                  padding: '0.32rem 0.85rem',
                  borderRadius: 20,
                  border: `2px solid ${active ? PRIMARY : '#e5e7eb'}`,
                  background: active ? PRIMARY : 'white',
                  color: active ? 'white' : '#555',
                  fontWeight: active ? 700 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  fontSize: '0.78rem',
                  fontFamily: 'Poppins,sans-serif',
                  flexShrink: 0,
                  transition: 'all 0.15s',
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Menu grid ────────────────────────────────────────────────────── */}
      <div style={{ padding: '1rem 1.25rem 7rem', maxWidth: 1100, margin: '0 auto' }}>

        {/* Results count */}
        {(search || filter !== 'All') && (
          <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.75rem', fontWeight: 500 }}>
            {filtered.length} item{filtered.length !== 1 ? 's' : ''} {search ? `for "${search}"` : `in ${filter}`}
            {filtered.length === 0 && <span style={{ color: PRIMARY, marginLeft: '0.5rem', fontWeight: 600 }}>— Try a different search</span>}
          </div>
        )}

        <div
          className="fl-menu-grid"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '1rem' }}
        >
          {/* Skeleton placeholders while loading */}
          {menu.length === 0 && [...Array(6)].map((_, i) => (
            <div key={i} style={{ background: 'white', borderRadius: 16, overflow: 'hidden', border: '1px solid #f1e5dc' }}>
              <div className="fl-skeleton" style={{ height: 160 }} />
              <div style={{ padding: '0.9rem' }}>
                <div className="fl-skeleton" style={{ height: 16, marginBottom: '0.5rem', width: '70%' }} />
                <div className="fl-skeleton" style={{ height: 12, marginBottom: '0.75rem', width: '90%' }} />
                <div className="fl-skeleton" style={{ height: 32, borderRadius: 20, width: '45%', marginLeft: 'auto' }} />
              </div>
            </div>
          ))}

          {filtered.map(item => {
            const hasVariants = item.variants && item.variants.length > 0;
            const totalQty    = itemCartQty(item.id);
            const noVarKey    = `${item.id}__`;
            const noVarEntry  = cart.find(c => c.key === noVarKey);
            const badge       = item.badge ? BADGE_CONFIG[item.badge] : null;
            const isJustAdded = addedKey?.startsWith(item.id);

            const minPrice = hasVariants ? item.variants![0].price : item.price;
            const maxPrice = hasVariants && item.variants!.length > 1 ? item.variants![item.variants!.length - 1].price : null;

            return (
              <div
                key={item.id}
                className={`fl-card fl-fadeup`}
                style={{ background: 'white', borderRadius: 16, overflow: 'hidden', border: `1.5px solid ${totalQty > 0 ? '#fbd5b5' : '#f1e5dc'}`, boxShadow: totalQty > 0 ? '0 2px 12px rgba(230,92,0,0.12)' : '0 2px 8px rgba(0,0,0,0.05)', position: 'relative' }}
              >
                {/* Image */}
                {item.img ? (
                  <div style={{ position: 'relative', height: 160, overflow: 'hidden' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.img}
                      alt={item.name}
                      loading="lazy"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.3s' }}
                    />
                    {badge && (
                      <span style={{ position: 'absolute', top: 8, left: 8, background: badge.bg, color: badge.color, fontSize: '0.65rem', fontWeight: 800, padding: '0.2rem 0.5rem', borderRadius: 20, border: `1px solid ${badge.color}22` }}>
                        {badge.label}
                      </span>
                    )}
                  </div>
                ) : (
                  <div style={{ height: 80, background: `linear-gradient(135deg,#fff5ed,#fff0e0)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.2rem', position: 'relative' }}>
                    🍽️
                    {badge && (
                      <span style={{ position: 'absolute', top: 8, left: 8, background: badge.bg, color: badge.color, fontSize: '0.65rem', fontWeight: 800, padding: '0.2rem 0.5rem', borderRadius: 20 }}>
                        {badge.label}
                      </span>
                    )}
                  </div>
                )}

                <div style={{ padding: '0.85rem 0.9rem' }}>
                  {/* Name + badge (when no image) */}
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1a1a2e', marginBottom: '0.2rem', lineHeight: 1.3 }}>
                    {item.name}
                    {!item.img && badge && null /* already shown */}
                  </div>

                  {item.desc && (
                    <div style={{ fontSize: '0.72rem', color: '#888', marginBottom: '0.55rem', lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {item.desc}
                    </div>
                  )}

                  {/* Price */}
                  <div style={{ fontWeight: 900, color: PRIMARY, fontSize: '0.95rem', marginBottom: '0.5rem' }}>
                    ₹{minPrice}{maxPrice ? <span style={{ fontWeight: 600, color: '#999', fontSize: '0.8rem' }}> – ₹{maxPrice}</span> : ''}
                  </div>

                  {/* Variant pills in cart */}
                  {hasVariants && totalQty > 0 && (
                    <div style={{ marginBottom: '0.4rem', display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                      {cart.filter(c => c.itemId === item.id).map(c => (
                        <span key={c.key} style={{ fontSize: '0.62rem', background: '#fff5ed', color: PRIMARY, fontWeight: 700, borderRadius: 10, padding: '0.12rem 0.45rem', border: '1px solid #fbd5b5' }}>
                          {c.variantName} ×{c.qty}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Add controls */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                    {hasVariants ? (
                      <button
                        className={`fl-add-btn ${isJustAdded ? 'fl-added' : ''}`}
                        onClick={() => openVariantPicker(item)}
                        style={{ background: totalQty > 0 ? PRIMARY_DARK : PRIMARY, color: 'white', border: 'none', padding: '0.38rem 1rem', borderRadius: 20, fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Poppins,sans-serif' }}
                      >
                        {totalQty > 0 ? `+ Add more (${totalQty})` : '+ Add'}
                      </button>
                    ) : noVarEntry ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <button
                          onClick={() => changeQty(noVarKey, -1)}
                          style={{ width: 30, height: 30, borderRadius: '50%', border: `2px solid ${PRIMARY}`, background: 'white', color: PRIMARY, fontWeight: 900, cursor: 'pointer', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.1s' }}
                        >−</button>
                        <span style={{ fontWeight: 800, minWidth: 22, textAlign: 'center', color: '#1a1a2e' }}>{noVarEntry.qty}</span>
                        <button
                          className={isJustAdded ? 'fl-added' : ''}
                          onClick={() => addDirectToCart(item)}
                          disabled={noVarEntry.qty >= MAX_QTY}
                          style={{ width: 30, height: 30, borderRadius: '50%', background: noVarEntry.qty >= MAX_QTY ? '#e5e7eb' : PRIMARY, border: 'none', color: 'white', fontWeight: 900, cursor: noVarEntry.qty >= MAX_QTY ? 'not-allowed' : 'pointer', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.1s' }}
                        >+</button>
                      </div>
                    ) : (
                      <button
                        className={`fl-add-btn ${isJustAdded ? 'fl-added' : ''}`}
                        onClick={() => addDirectToCart(item)}
                        style={{ background: PRIMARY, color: 'white', border: 'none', padding: '0.38rem 1.1rem', borderRadius: 20, fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Poppins,sans-serif' }}
                      >+ Add</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Floating cart bar ────────────────────────────────────────────── */}
      {cartCount > 0 && (
        <div
          className="fl-float-cart fl-fadeup"
          onClick={() => setCartOpen(true)}
          style={{ position: 'fixed', bottom: '1.25rem', left: '50%', transform: 'translateX(-50%)', zIndex: 400, background: GRAD, color: 'white', borderRadius: 28, padding: '0.85rem 1.75rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', boxShadow: '0 4px 20px rgba(230,92,0,0.4)', fontFamily: 'Poppins,sans-serif', minWidth: 240, justifyContent: 'space-between', userSelect: 'none', border: '2px solid rgba(255,255,255,0.3)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.3rem' }}>🛒</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', lineHeight: 1.1 }}>{cartCount} Item{cartCount !== 1 ? 's' : ''}</div>
              <div style={{ fontSize: '0.72rem', opacity: 0.9 }}>Tap to review</div>
            </div>
          </div>
          <div style={{ fontWeight: 900, fontSize: '1.05rem', background: 'rgba(255,255,255,0.25)', padding: '0.3rem 0.8rem', borderRadius: 20, border: '1px solid rgba(255,255,255,0.4)' }}>
            ₹{cartTotal}
          </div>
        </div>
      )}

      {/* ── Foodie AI chat panel ─────────────────────────────────────────── */}
      {aiOpen && (
        <>
          {/* Overlay for mobile (closes on tap outside) */}
          <div
            onClick={() => setAiOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 450, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)' }}
          />
          {/* Chat panel */}
          <div
            className="fl-fadeup"
            style={{ position: 'fixed', bottom: cartCount > 0 ? '5.5rem' : '1.5rem', right: '1rem', zIndex: 460, width: 'min(380px, calc(100vw - 2rem))', height: 'min(540px, 78vh)', background: 'white', borderRadius: 20, boxShadow: '0 8px 40px rgba(124,58,237,0.3)', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1.5px solid #ede9fe' }}
          >
            <FoodieAIChat
              menu={menu}
              cart={cart}
              onAction={handleAiAction}
              onCheckout={() => setShowCheckout(true)}
              onClose={() => setAiOpen(false)}
            />
          </div>
        </>
      )}

      {/* ── AI FAB button ─────────────────────────────────────────────────── */}
      <div style={{ position: 'fixed', bottom: cartCount > 0 ? '5.5rem' : '1.25rem', right: '1.25rem', zIndex: 440 }}>
        <button
          onClick={() => setAiOpen(o => !o)}
          style={{ width: 54, height: 54, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: 'white', border: 'none', cursor: 'pointer', boxShadow: '0 4px 18px rgba(124,58,237,0.5)', fontSize: '1.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.15s', position: 'relative' }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
          title="Ask Foodie AI"
        >
          {aiOpen ? '×' : '💬'}
        </button>
        {!aiOpen && (
          <div style={{ position: 'absolute', bottom: '100%', right: 0, marginBottom: 6, background: '#1a1a2e', color: 'white', fontSize: '0.65rem', fontWeight: 700, borderRadius: 8, padding: '0.28rem 0.6rem', whiteSpace: 'nowrap', pointerEvents: 'none' }}>Ask Foodie AI</div>
        )}
      </div>

      {/* ── Track order modal ────────────────────────────────────────────── */}
      {showTrackModal && (
        <div className="modal-overlay" onClick={() => { if (!trackLoading) setShowTrackModal(false); }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 420, overflow: 'hidden', boxShadow: '0 -4px 32px rgba(0,0,0,0.2)' }}>
            <div style={{ width: 40, height: 4, background: '#ddd', borderRadius: 2, margin: '0.75rem auto 0' }} />
            <div style={{ background: GRAD, color: 'white', padding: '1.1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
              <div>
                <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 900, fontSize: '1rem' }}>📍 Track Your Order</div>
                <div style={{ fontSize: '0.72rem', opacity: 0.85 }}>Enter the details you used when ordering</div>
              </div>
              {!trackLoading && (
                <button onClick={() => setShowTrackModal(false)} style={{ background: 'rgba(255,255,255,0.25)', border: 'none', color: 'white', width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', fontSize: '1rem', fontWeight: 900 }}>×</button>
              )}
            </div>
            <div style={{ padding: '1.4rem' }}>
              <div style={{ marginBottom: '0.85rem' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#555', display: 'block', marginBottom: '0.3rem' }}>Your Name</label>
                <input className="fl-input" value={trackName} onChange={e => { setTrackName(e.target.value); setTrackError(''); }} onKeyDown={e => e.key === 'Enter' && handleTrackLookup()} placeholder="e.g. Ravi Kumar" autoFocus disabled={trackLoading} />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#555', display: 'block', marginBottom: '0.3rem' }}>Mobile Number</label>
                <input className="fl-input" type="tel" inputMode="numeric" value={trackPhone} onChange={e => { setTrackPhone(e.target.value); setTrackError(''); }} onKeyDown={e => e.key === 'Enter' && handleTrackLookup()} placeholder="e.g. 9876543210" disabled={trackLoading} />
              </div>
              {trackError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '0.6rem 0.85rem', fontSize: '0.8rem', color: '#dc2626', fontWeight: 600, marginBottom: '1rem' }}>
                  {trackError}
                </div>
              )}
              <button onClick={handleTrackLookup} disabled={trackLoading} style={{ width: '100%', background: trackLoading ? '#ccc' : PRIMARY, color: 'white', border: 'none', padding: '0.8rem', borderRadius: 12, fontWeight: 700, fontSize: '0.95rem', cursor: trackLoading ? 'not-allowed' : 'pointer', fontFamily: 'Poppins,sans-serif', transition: 'background 0.15s' }}>
                {trackLoading ? '⏳ Looking up…' : '🔍 Find My Order'}
              </button>
              <div style={{ textAlign: 'center', marginTop: '0.9rem', fontSize: '0.71rem', color: '#aaa' }}>Only online orders with a phone number can be tracked here</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Cart drawer ──────────────────────────────────────────────────── */}
      {cartOpen && (
        <div className="modal-overlay" onClick={() => { if (!isSubmitting) setCartOpen(false); }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 460, maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 -4px 32px rgba(0,0,0,0.18)' }}>
            <div style={{ width: 40, height: 4, background: '#ddd', borderRadius: 2, margin: '0.75rem auto 0' }} />
            <div style={{ background: GRAD, color: 'white', padding: '1rem 1.4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
              <span style={{ fontFamily: "'Playfair Display',serif", fontWeight: 900, fontSize: '1.05rem' }}>🛒 Your Cart ({cartCount})</span>
              <button onClick={() => setCartOpen(false)} style={{ background: 'rgba(255,255,255,0.25)', border: 'none', color: 'white', width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', fontWeight: 900, fontSize: '1rem' }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1.4rem' }}>
              {!cart.length
                ? <p style={{ color: '#bbb', textAlign: 'center', padding: '2.5rem 0', fontSize: '0.9rem' }}>Your cart is empty 🛒</p>
                : cart.map(c => (
                  <div key={c.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.7rem 0', borderBottom: '1px solid #fff5ed' }}>
                    <div style={{ flex: 1, paddingRight: '0.5rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.87rem', color: '#1a1a2e' }}>
                        {c.itemName}{c.variantName ? <span style={{ color: PRIMARY, fontSize: '0.78rem' }}> ({c.variantName})</span> : ''}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#888' }}>₹{c.variantPrice} × {c.qty} = <strong style={{ color: PRIMARY }}>₹{c.variantPrice * c.qty}</strong></div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <button onClick={() => changeQty(c.key, -1)} style={{ width: 28, height: 28, borderRadius: '50%', border: `2px solid ${PRIMARY}`, background: 'white', color: PRIMARY, fontWeight: 900, cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                      <span style={{ fontWeight: 800, minWidth: 20, textAlign: 'center' }}>{c.qty}</span>
                      <button onClick={() => changeQty(c.key, 1)} disabled={c.qty >= MAX_QTY} style={{ width: 28, height: 28, borderRadius: '50%', background: c.qty >= MAX_QTY ? '#e5e7eb' : PRIMARY, border: 'none', color: 'white', fontWeight: 900, cursor: c.qty >= MAX_QTY ? 'not-allowed' : 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                    </div>
                  </div>
                ))
              }
            </div>
            {cart.length > 0 && (
              <div style={{ padding: '1rem 1.4rem', borderTop: '2px solid #fff5ed', background: '#fffaf7' }}>
                {/* Applied offer */}
                {bestOffer && (
                  <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 10, padding: '0.5rem 0.75rem', marginBottom: '0.6rem' }}>
                    <div style={{ fontWeight: 800, color: '#16a34a', fontSize: '0.8rem' }}>🎁 {bestOffer.offer.name}</div>
                    <div style={{ fontSize: '0.73rem', color: '#166534' }}>−₹{bestOffer.discountAmount} discount applied</div>
                  </div>
                )}
                {/* Teaser offers */}
                {getTeaserOffers(cartTotal, form.type).map(({ offer, needed }) => (
                  <div key={offer.id} style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 10, padding: '0.45rem 0.75rem', marginBottom: '0.5rem' }}>
                    <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#92400e' }}>
                      🛒 Add ₹{needed} more for <span style={{ color: '#d97706' }}>{offer.name}</span>
                    </div>
                  </div>
                ))}
                {/* Total */}
                {discountAmt > 0 ? (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', color: '#888', marginBottom: '0.15rem' }}>
                      <span>Subtotal</span><span>₹{cartTotal}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', color: '#16a34a', fontWeight: 700, marginBottom: '0.15rem' }}>
                      <span>Discount</span><span>−₹{discountAmt}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '1rem', color: '#1a1a2e', borderTop: '2px solid #fff5ed', paddingTop: '0.35rem', marginTop: '0.25rem' }}>
                      <span>Total</span><span style={{ color: PRIMARY }}>₹{finalTotal}</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '1rem', marginBottom: '0.75rem', color: '#1a1a2e' }}>
                    <span>Total</span>
                    <span style={{ color: PRIMARY }}>₹{cartTotal}</span>
                  </div>
                )}
                <button
                  onClick={() => { setCartOpen(false); setShowCheckout(true); }}
                  style={{ width: '100%', background: GRAD, color: 'white', border: 'none', padding: '0.8rem', borderRadius: 14, fontWeight: 800, fontSize: '1rem', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', boxShadow: '0 3px 12px rgba(230,92,0,0.3)' }}
                >
                  Proceed to Checkout →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Checkout modal ───────────────────────────────────────────────── */}
      {showCheckout && (
        <div className="modal-overlay" onClick={() => { if (!isSubmitting) setShowCheckout(false); }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 460, maxHeight: '94vh', overflow: 'auto', boxShadow: '0 -4px 32px rgba(0,0,0,0.18)' }}>
            <div style={{ width: 40, height: 4, background: '#ddd', borderRadius: 2, margin: '0.75rem auto 0' }} />
            <div style={{ background: GRAD, color: 'white', padding: '1rem 1.4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
              <span style={{ fontFamily: "'Playfair Display',serif", fontWeight: 900, fontSize: '1.05rem' }}>📦 Checkout</span>
              {!isSubmitting && (
                <button onClick={() => setShowCheckout(false)} style={{ background: 'rgba(255,255,255,0.25)', border: 'none', color: 'white', width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', fontWeight: 900, fontSize: '1rem' }}>×</button>
              )}
            </div>
            <div style={{ padding: '1.25rem 1.4rem' }}>
              {submitError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', padding: '0.65rem 0.85rem', borderRadius: 10, marginBottom: '1rem', fontSize: '0.84rem', fontWeight: 600 }}>
                  ⚠️ {submitError}
                </div>
              )}

              <div style={{ marginBottom: '0.9rem' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#555', display: 'block', marginBottom: '0.3rem' }}>Your Name *</label>
                <input
                  className="fl-input"
                  value={form.name}
                  onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setFormErrors(fe => ({ ...fe, name: '' })); }}
                  placeholder="Full name"
                  disabled={isSubmitting}
                  style={{ borderColor: formErrors.name ? '#ef4444' : undefined }}
                />
                {formErrors.name && <div style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: '0.25rem', fontWeight: 600 }}>{formErrors.name}</div>}
              </div>
              <div style={{ marginBottom: '0.9rem' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#555', display: 'block', marginBottom: '0.3rem' }}>Phone Number * <span style={{ fontWeight: 400, color: '#aaa' }}>(India +91)</span></label>
                <input
                  className="fl-input"
                  type="tel"
                  inputMode="numeric"
                  value={form.phone}
                  onChange={e => { setForm(f => ({ ...f, phone: e.target.value })); setFormErrors(fe => ({ ...fe, phone: '' })); }}
                  onBlur={e => { const err = validateIndianPhone(e.target.value); setFormErrors(fe => ({ ...fe, phone: err })); }}
                  placeholder="9876543210"
                  disabled={isSubmitting}
                  maxLength={14}
                  style={{ borderColor: formErrors.phone ? '#ef4444' : undefined }}
                />
                {formErrors.phone && <div style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: '0.25rem', fontWeight: 600 }}>{formErrors.phone}</div>}
              </div>
              <div style={{ marginBottom: '0.9rem' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#555', display: 'block', marginBottom: '0.3rem' }}>
                  Email <span style={{ color: '#aaa', fontWeight: 500 }}>(optional — for receipt)</span>
                </label>
                <input
                  className="fl-input"
                  type="email"
                  value={form.email}
                  onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setFormErrors(fe => ({ ...fe, email: '' })); }}
                  onBlur={e => { if (e.target.value.trim()) { const err = validateEmail(e.target.value); setFormErrors(fe => ({ ...fe, email: err })); } }}
                  placeholder="name@example.com"
                  disabled={isSubmitting}
                  style={{ borderColor: formErrors.email ? '#ef4444' : undefined }}
                />
                {formErrors.email && <div style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: '0.25rem', fontWeight: 600 }}>{formErrors.email}</div>}
              </div>

              {/* Order type */}
              <div style={{ marginBottom: '0.9rem' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#555', display: 'block', marginBottom: '0.4rem' }}>Order Type</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  {[{ k: 'pickup', l: '🏪', label: 'Pickup', sub: '20–30 min' }, { k: 'delivery', l: '🚚', label: 'Delivery', sub: 'Local area' }].map(t => {
                    const active = form.type === t.k;
                    return (
                      <button key={t.k} onClick={() => !isSubmitting && setForm(f => ({ ...f, type: t.k as 'pickup' | 'delivery' }))} style={{ padding: '0.65rem', border: `2px solid ${active ? PRIMARY : '#e5e7eb'}`, borderRadius: 12, background: active ? '#fff5ed' : 'white', color: active ? PRIMARY : '#555', fontWeight: active ? 700 : 500, cursor: isSubmitting ? 'not-allowed' : 'pointer', fontFamily: 'Poppins,sans-serif', textAlign: 'left', transition: 'all 0.15s' }}>
                        <div style={{ fontSize: '1.2rem', marginBottom: '0.15rem' }}>{t.l}</div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>{t.label}</div>
                        <div style={{ fontSize: '0.68rem', opacity: 0.7 }}>{t.sub}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {form.type === 'delivery' && (
                <div style={{ marginBottom: '0.9rem' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#555', display: 'block', marginBottom: '0.3rem' }}>Delivery Address *</label>
                  <textarea className="fl-input" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Full address including landmark" rows={3} disabled={isSubmitting} style={{ resize: 'vertical', padding: '0.65rem 0.9rem', border: '2px solid #e5e7eb', borderRadius: 10, fontFamily: 'Poppins,sans-serif', fontSize: '0.9rem', width: '100%', outline: 'none' }} />
                </div>
              )}

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#555', display: 'block', marginBottom: '0.4rem' }}>Payment</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.4rem' }}>
                  {[
                    { v: 'cod',     l: '💵', label: 'Cash' },
                    { v: 'gpay',    l: '🅖', label: 'GPay' },
                    { v: 'phonepe', l: '📱', label: 'PhonePe' },
                    { v: 'upi',     l: '🔗', label: 'UPI' },
                    { v: 'card',    l: '💳', label: 'Card' },
                  ].map(p => {
                    const active = form.payment === p.v;
                    return (
                      <button key={p.v} onClick={() => !isSubmitting && setForm(f => ({ ...f, payment: p.v }))} style={{ padding: '0.55rem 0.3rem', border: `2px solid ${active ? PRIMARY : '#e5e7eb'}`, borderRadius: 10, background: active ? '#fff5ed' : 'white', color: active ? PRIMARY : '#666', fontWeight: active ? 700 : 500, cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontSize: '0.75rem', textAlign: 'center', transition: 'all 0.15s' }}>
                        <div style={{ fontSize: '1rem' }}>{p.l}</div>
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Order summary */}
              <div style={{ background: '#fff9f5', border: '1px solid #fbd5b5', borderRadius: 12, padding: '0.85rem', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#888', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Order Summary</div>
                {cart.map(c => (
                  <div key={c.key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', padding: '0.2rem 0', color: '#555' }}>
                    <span>{c.itemName}{c.variantName ? ` (${c.variantName})` : ''} × {c.qty}</span>
                    <span style={{ fontWeight: 600 }}>₹{c.variantPrice * c.qty}</span>
                  </div>
                ))}
                {/* Applied offer row */}
                {bestOffer && (
                  <div style={{ marginTop: '0.4rem', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '0.4rem 0.6rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#16a34a' }}>🎁 {bestOffer.offer.name}</span>
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#16a34a' }}>−₹{bestOffer.discountAmount}</span>
                  </div>
                )}
                {/* Teaser offers */}
                {getTeaserOffers(cartTotal, form.type).map(({ offer, needed }) => (
                  <div key={offer.id} style={{ marginTop: '0.35rem', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '0.35rem 0.6rem' }}>
                    <span style={{ fontSize: '0.73rem', fontWeight: 600, color: '#92400e' }}>🛒 Add ₹{needed} more → {offer.name}</span>
                  </div>
                ))}
                <div style={{ borderTop: `2px solid ${PRIMARY}22`, marginTop: '0.5rem', paddingTop: '0.5rem' }}>
                  {discountAmt > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#888', marginBottom: '0.15rem' }}>
                      <span>Subtotal</span><span>₹{cartTotal}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, color: PRIMARY, fontSize: '1rem' }}>
                    <span>Total</span><span>₹{finalTotal}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={placeOrder}
                disabled={isSubmitting}
                style={{ width: '100%', background: isSubmitting ? '#ccc' : GRAD, color: 'white', border: 'none', padding: '0.9rem', borderRadius: 14, fontWeight: 800, fontSize: '1rem', cursor: isSubmitting ? 'not-allowed' : 'pointer', fontFamily: 'Poppins,sans-serif', boxShadow: isSubmitting ? 'none' : '0 3px 16px rgba(230,92,0,0.35)', transition: 'all 0.15s' }}
              >
                {isSubmitting ? '⏳ Placing Order…' : `✅ Place Order — ₹${finalTotal}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Variant picker modal ─────────────────────────────────────────── */}
      {variantModal.open && variantModal.item && (
        <div className="modal-overlay" onClick={() => setVariantModal({ open: false, item: null, selected: '' })}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, padding: '0.75rem 1.4rem 2.5rem', boxShadow: '0 -4px 32px rgba(0,0,0,0.18)' }}>
            <div style={{ width: 40, height: 4, background: '#ddd', borderRadius: 2, margin: '0 auto 1rem' }} />
            {variantModal.item.img && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={variantModal.item.img} alt={variantModal.item.name} style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 12, marginBottom: '0.85rem' }} />
            )}
            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1a1a2e', marginBottom: '0.15rem' }}>{variantModal.item.name}</div>
            <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '1rem' }}>Select your portion size</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
              {variantModal.item.variants?.map(v => {
                const sel = variantModal.selected === v.name;
                return (
                  <label
                    key={v.name}
                    onClick={() => setVariantModal(m => ({ ...m, selected: v.name }))}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.8rem 1rem', border: `2px solid ${sel ? PRIMARY : '#e5e7eb'}`, borderRadius: 12, cursor: 'pointer', background: sel ? '#fff5ed' : 'white', transition: 'all 0.15s' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', border: `3px solid ${sel ? PRIMARY : '#ddd'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'border-color 0.15s' }}>
                        {sel && <div style={{ width: 8, height: 8, borderRadius: '50%', background: PRIMARY }} />}
                      </div>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1a1a2e' }}>{v.name}</span>
                    </div>
                    <span style={{ fontWeight: 900, color: PRIMARY, fontSize: '1rem' }}>₹{v.price}</span>
                  </label>
                );
              })}
            </div>
            <button
              onClick={confirmVariantAdd}
              disabled={!variantModal.selected}
              style={{ width: '100%', background: variantModal.selected ? GRAD : '#e5e7eb', color: variantModal.selected ? 'white' : '#aaa', border: 'none', padding: '0.9rem', borderRadius: 14, fontWeight: 800, fontSize: '1rem', cursor: variantModal.selected ? 'pointer' : 'not-allowed', fontFamily: 'Poppins,sans-serif', transition: 'all 0.2s', boxShadow: variantModal.selected ? '0 3px 14px rgba(230,92,0,0.3)' : 'none' }}
            >
              {variantModal.selected
                ? `Add to Cart — ₹${variantModal.item.variants?.find(v => v.name === variantModal.selected)?.price ?? ''}`
                : 'Select a size'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
