'use client';
import { useRouter } from 'next/navigation';

const ROLES = [
  {
    icon: '🔧',
    label: 'Admin',
    desc: 'Full control & analytics',
    href: '/admin/login',
    color: '#E65C00',
  },
  {
    icon: '🔥',
    label: 'Kitchen',
    desc: 'Order display & cooking',
    href: '/kitchen/login',
    color: '#3b82f6',
  },
  {
    icon: '🧑‍🍳',
    label: 'Waiter',
    desc: 'Serve & manage tables',
    href: '/waiter/login',
    color: '#8b5cf6',
  },
  {
    icon: '💳',
    label: 'Manager',
    desc: 'Counter payment & billing',
    href: '/manager/login',
    color: '#16a34a',
  },
];

export default function LoginPage() {
  const router = useRouter();

  return (
    <div className="login-page" style={{ flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ textAlign: 'center', color: 'white', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}>🍽️</div>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: '2rem', fontWeight: 900, margin: '0 0 0.25rem', color: 'white' }}>
          Foodie Lover
        </h1>
        <p style={{ color: '#F9A826', fontSize: '0.9rem', margin: 0 }}>Restaurant Management System</p>
      </div>

      <div style={{ background: 'white', borderRadius: '20px', padding: '2rem', width: '100%', maxWidth: '420px', boxShadow: '0 30px 80px rgba(0,0,0,0.4)' }}>
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.1rem', fontWeight: 900, color: '#1A0800', marginBottom: '1.25rem', textAlign: 'center' }}>
          Select Your Role
        </h2>

        <div className="role-grid">
          {ROLES.map(r => (
            <button
              key={r.href}
              onClick={() => router.push(r.href)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem',
                padding: '1.25rem 0.75rem', borderRadius: '14px', border: `2px solid #e5e7eb`,
                background: 'white', cursor: 'pointer', transition: 'all 0.2s',
                fontFamily: 'Poppins,sans-serif',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = r.color;
                (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 4px 16px ${r.color}30`;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#e5e7eb';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
              }}
            >
              <span style={{ fontSize: '2rem' }}>{r.icon}</span>
              <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1A0800' }}>{r.label}</span>
              <span style={{ fontSize: '0.7rem', color: '#888', textAlign: 'center', lineHeight: 1.3 }}>{r.desc}</span>
            </button>
          ))}
        </div>

        <div style={{ borderTop: '1px solid #f5f0e8', paddingTop: '1rem', marginTop: '0.5rem', textAlign: 'center' }}>
          <button
            onClick={() => router.push('/online')}
            style={{ background: '#f5f0e8', color: '#666', border: 'none', borderRadius: '8px', padding: '0.6rem 1.2rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'Poppins,sans-serif', width: '100%' }}
          >
            📦 Online Order (Pickup / Delivery)
          </button>
          <button
            onClick={() => router.push('/')}
            style={{ background: 'transparent', color: '#aaa', border: 'none', padding: '0.5rem', cursor: 'pointer', fontSize: '0.78rem', fontFamily: 'Poppins,sans-serif', marginTop: '0.4rem' }}
          >
            🪑 Dine-In Menu →
          </button>
        </div>
      </div>
    </div>
  );
}
