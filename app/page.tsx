'use client';
import { useRouter } from 'next/navigation';

const STAFF_LINKS = [
  { href: '/admin/login',    icon: '🔧', label: 'Admin',    desc: 'Dashboard & analytics',    from: '#E65C00', to: '#F9A826' },
  { href: '/kitchen/login',  icon: '🔥', label: 'Kitchen',  desc: 'Order display & cooking',  from: '#2563eb', to: '#3b82f6' },
  { href: '/waiter/login',   icon: '🛎️', label: 'Waiter',   desc: 'Serve & manage tables',    from: '#7c3aed', to: '#8b5cf6' },
  { href: '/manager/login',  icon: '💳', label: 'Manager',  desc: 'Counter billing & payment', from: '#16a34a', to: '#22c55e' },
  { href: '/delivery/login', icon: '🛵', label: 'Delivery', desc: 'Order pickup & delivery',   from: '#0f172a', to: '#1e293b' },
];

const CUSTOMER_CARDS = [
  { href: '/online',  icon: '📦', label: 'Order Online', desc: 'Pickup or Delivery', from: '#2563eb', to: '#3b82f6', textColor: '#1e3a5f' },
  { href: null,       icon: '🪑', label: 'Dine-In',      desc: 'Scan table QR code', from: '#E65C00', to: '#F9A826', textColor: '#1A0800' },
  { href: '/track',   icon: '📍', label: 'Track Order',  desc: 'Check your status',  from: '#16a34a', to: '#22c55e', textColor: '#14532d' },
];

export default function HomePage() {
  const router = useRouter();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg,#1A0800 0%,#2D0F00 40%,#3D1C00 70%,#1A0800 100%)',
      fontFamily: 'Poppins,sans-serif',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '2.5rem 1rem 4rem',
    }}>
      <style>{`
        @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.06)} }
        @keyframes shimmer { from{background-position:-200% center} to{background-position:200% center} }
        .hero-icon { animation: pulse 3s ease-in-out infinite; }
        .customer-card:hover { transform: translateY(-4px) !important; box-shadow: 0 12px 32px rgba(0,0,0,0.25) !important; }
        .staff-btn:hover { transform: translateX(4px) !important; }
      `}</style>

      {/* ── Brand header ── */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div className="hero-icon" style={{ fontSize: '4.5rem', lineHeight: 1, marginBottom: '0.6rem' }}>🍽️</div>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: '2.4rem', fontWeight: 900, color: 'white', margin: '0 0 0.3rem', letterSpacing: '-0.02em' }}>
          Foodie Lover
        </h1>
        <p style={{ background: 'linear-gradient(135deg,#F9A826,#E65C00)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', fontSize: '0.88rem', margin: 0, letterSpacing: '0.06em', fontWeight: 700 }}>
          Restaurant Management System
        </p>
      </div>

      {/* ── Customer ordering cards ── */}
      <div style={{ width: '100%', maxWidth: 620, marginBottom: '2.5rem' }}>
        <div style={{ fontSize: '0.62rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700, marginBottom: '0.75rem', paddingLeft: '0.1rem' }}>
          For Customers
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.85rem' }}>
          {CUSTOMER_CARDS.map(card => (
            <div
              key={card.label}
              className="customer-card"
              onClick={() => card.href && router.push(card.href)}
              style={{
                background: 'white', borderRadius: 18, padding: '1.3rem 0.75rem',
                border: `2px solid transparent`,
                backgroundImage: `linear-gradient(white,white), linear-gradient(135deg,${card.from}33,${card.to}33)`,
                backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box',
                textAlign: 'center', cursor: card.href ? 'pointer' : 'default',
                boxShadow: '0 4px 20px rgba(0,0,0,0.18)', transition: 'transform 0.2s, box-shadow 0.2s',
              }}
            >
              <span style={{ fontSize: '2.2rem', display: 'block', marginBottom: '0.45rem' }}>{card.icon}</span>
              <span style={{ fontWeight: 800, fontSize: '0.85rem', color: card.textColor, display: 'block', marginBottom: '0.2rem' }}>{card.label}</span>
              <span style={{ fontSize: '0.68rem', color: '#9ca3af', lineHeight: 1.4 }}>{card.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Staff portal ── */}
      <div style={{ width: '100%', maxWidth: 620 }}>
        <div style={{ fontSize: '0.62rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700, marginBottom: '0.75rem', paddingLeft: '0.1rem' }}>
          Staff Portal
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
          {STAFF_LINKS.map(link => (
            <button
              key={link.href}
              className="staff-btn"
              onClick={() => router.push(link.href)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.85rem',
                padding: '0.85rem 1rem', borderRadius: 14,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                cursor: 'pointer', fontFamily: 'Poppins,sans-serif', textAlign: 'left',
                transition: 'transform 0.18s, background 0.18s, border-color 0.18s',
              }}
              onMouseEnter={e => {
                const b = e.currentTarget as HTMLButtonElement;
                b.style.background = `linear-gradient(135deg,${link.from}22,${link.to}15)`;
                b.style.borderColor = `${link.from}66`;
              }}
              onMouseLeave={e => {
                const b = e.currentTarget as HTMLButtonElement;
                b.style.background = 'rgba(255,255,255,0.06)';
                b.style.borderColor = 'rgba(255,255,255,0.1)';
              }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `linear-gradient(135deg,${link.from},${link.to})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0, boxShadow: `0 4px 12px ${link.from}44` }}>
                {link.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'white' }}>{link.label}</div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', lineHeight: 1.3 }}>{link.desc}</div>
              </div>
              <div style={{ color: '#475569', fontSize: '1.1rem' }}>›</div>
            </button>
          ))}
        </div>
      </div>

      <p style={{ marginTop: '2.5rem', fontSize: '0.7rem', color: '#334155', textAlign: 'center' }}>
        Powered by Foodie Lover POS • Scan your table QR for dine-in ordering
      </p>
    </div>
  );
}
