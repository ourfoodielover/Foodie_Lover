'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginDelivery } from '@/lib/auth';

export default function DeliveryLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [pin,      setPin]      = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  function handleLogin() {
    if (!username.trim()) { setError('Please enter your username'); return; }
    if (!pin.trim())      { setError('Please enter your PIN');      return; }
    setLoading(true);
    const session = loginDelivery(username.trim(), pin.trim());
    setLoading(false);
    if (!session) {
      setError('Invalid username or PIN. Ask admin to create / check your account.');
      return;
    }
    router.replace('/delivery');
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '0.7rem 0.9rem',
    border: '2px solid #e5e7eb', borderRadius: 10,
    fontFamily: 'Poppins,sans-serif', fontSize: '0.92rem',
    outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg,#0f172a,#1e293b)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Poppins,sans-serif', padding: '1rem',
    }}>
      <div style={{ background: 'white', borderRadius: 20, padding: '2.5rem 2rem', width: '100%', maxWidth: 360, boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🛵</div>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.4rem', fontWeight: 900, color: '#0f172a' }}>
            Delivery Portal
          </div>
          <div style={{ fontSize: '0.78rem', color: '#888', marginTop: '0.25rem' }}>
            Foodie Lover — Delivery Staff
          </div>
        </div>

        {/* Username */}
        <div style={{ marginBottom: '0.85rem' }}>
          <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#555', display: 'block', marginBottom: '0.4rem' }}>
            Username
          </label>
          <input
            value={username}
            onChange={e => { setUsername(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="e.g. ravi"
            autoFocus
            autoComplete="username"
            style={inp}
          />
        </div>

        {/* PIN */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#555', display: 'block', marginBottom: '0.4rem' }}>
            PIN
          </label>
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="••••"
            maxLength={6}
            autoComplete="current-password"
            style={{ ...inp, letterSpacing: '0.4em', textAlign: 'center' }}
          />
        </div>

        {error && (
          <div style={{ fontSize: '0.78rem', color: '#ef4444', marginBottom: '0.75rem', fontWeight: 600, lineHeight: 1.4 }}>
            {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: '100%', background: loading ? '#94a3b8' : '#0f172a', color: 'white', border: 'none',
            padding: '0.8rem', borderRadius: 12, fontWeight: 700, fontSize: '0.95rem',
            cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'Poppins,sans-serif',
          }}
        >
          {loading ? '⏳ Checking…' : '🛵 Start Delivery Shift'}
        </button>

        <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
          <a href="/" style={{ fontSize: '0.75rem', color: '#888', textDecoration: 'none' }}>← Back to home</a>
        </div>
      </div>
    </div>
  );
}
