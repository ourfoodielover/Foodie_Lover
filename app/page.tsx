'use client';
import { useRouter } from 'next/navigation';

const STAFF_LINKS = [
  { href: '/admin/login',    icon: '🔧', label: 'Admin',    desc: 'Dashboard & analytics',    color: '#E65C00' },
  { href: '/kitchen/login',  icon: '🔥', label: 'Kitchen',  desc: 'Order display & cooking',  color: '#3b82f6' },
  { href: '/waiter/login',   icon: '🧑‍🍳', label: 'Waiter',   desc: 'Serve & manage tables',    color: '#8b5cf6' },
  { href: '/manager/login',  icon: '💳', label: 'Manager',  desc: 'Counter billing & payment', color: '#16a34a' },
  { href: '/delivery/login', icon: '🛵', label: 'Delivery', desc: 'Order pickup & delivery',   color: '#0f172a' },
];

export default function HomePage() {
  const router = useRouter();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg,#1A0800 0%,#2D0F00 50%,#1A0800 100%)',
      fontFamily: 'Poppins,sans-serif',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '2rem 1rem 4rem',
    }}>

      {/* ── Brand header ── */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem', marginTop: '1rem' }}>
        <div style={{ fontSize: '4rem', lineHeight: 1, marginBottom: '0.5rem' }}>🍽️</div>
        <h1 style={{
          fontFamily: "'Playfair Display',serif", fontSize: '2.2rem', fontWeight: 900,
          color: 'white', margin: '0 0 0.3rem',
        }}>
          Foodie Lover
        </h1>
        <p style={{ color: '#F9A826', fontSize: '0.88rem', margin: 0, letterSpacing: '0.05em' }}>
          Restaurant Management System
        </p>
      </div>

      {/* ── Customer ordering cards ── */}
      <div style={{ width: '100%', maxWidth: 600, marginBottom: '2rem' }}>
        <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, marginBottom: '0.65rem' }}>
          Customers
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>

          {/* Online order */}
          <button
            onClick={() => router.push('/online')}
            style={customerCard('#2563eb')}
          >
            <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.4rem' }}>📦</span>
            <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#1e3a5f', display: 'block' }}>Order Online</span>
            <span style={{ fontSize: '0.7rem', color: '#6b7280', lineHeight: 1.3 }}>Pickup or Delivery</span>
          </button>

          {/* Dine-In */}
          <div style={{ ...customerCard('#E65C00'), cursor: 'default' }}>
            <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.4rem' }}>🪑</span>
            <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#1A0800', display: 'block' }}>Dine-In</span>
            <span style={{ fontSize: '0.7rem', color: '#6b7280', lineHeight: 1.3 }}>Scan table QR code</span>
          </div>

          {/* Track order */}
          <button
            onClick={() => router.push('/track')}
            style={customerCard('#16a34a')}
          >
            <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.4rem' }}>📍</span>
            <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#14532d', display: 'block' }}>Track Order</span>
            <span style={{ fontSize: '0.7rem', color: '#6b7280', lineHeight: 1.3 }}>Check your status</span>
          </button>

        </div>
      </div>

      {/* ── Staff portal ── */}
      <div style={{ width: '100%', maxWidth: 600 }}>
        <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, marginBottom: '0.65rem' }}>
          Staff Portal
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))', gap: '0.6rem' }}>
          {STAFF_LINKS.map(link => (
            <button
              key={link.href}
              onClick={() => router.push(link.href)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.7rem',
                padding: '0.9rem 1rem', borderRadius: 12,
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                cursor: 'pointer', fontFamily: 'Poppins,sans-serif', textAlign: 'left',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `${link.color}22`; (e.currentTarget as HTMLButtonElement).style.borderColor = `${link.color}88`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.12)'; }}
            >
              <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>{link.icon}</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'white' }}>{link.label}</div>
                <div style={{ fontSize: '0.67rem', color: '#94a3b8', lineHeight: 1.3 }}>{link.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Footer note ── */}
      <p style={{ marginTop: '2.5rem', fontSize: '0.7rem', color: '#475569', textAlign: 'center' }}>
        Powered by Foodie Lover POS • Scan your table QR for dine-in ordering
      </p>
    </div>
  );
}

function customerCard(accent: string): React.CSSProperties {
  return {
    background: 'white', borderRadius: 14, padding: '1.2rem 0.75rem',
    border: `2px solid ${accent}22`, textAlign: 'center',
    cursor: 'pointer', fontFamily: 'Poppins,sans-serif',
    boxShadow: '0 4px 20px rgba(0,0,0,0.12)', transition: 'transform 0.15s, box-shadow 0.15s',
  };
}
