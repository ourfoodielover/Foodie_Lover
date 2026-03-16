'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginDelivery } from '@/lib/auth';

export default function DeliveryLoginPage() {
  const router = useRouter();
  const [name, setName]   = useState('');
  const [error, setError] = useState('');

  function handleLogin() {
    if (!name.trim()) { setError('Please enter your name'); return; }
    loginDelivery(name.trim());
    router.replace('/delivery');
  }

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

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#555', display: 'block', marginBottom: '0.4rem' }}>
            Your Name
          </label>
          <input
            value={name}
            onChange={e => { setName(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="e.g. Ravi Kumar"
            autoFocus
            style={{
              width: '100%', padding: '0.7rem 0.9rem',
              border: '2px solid #e5e7eb', borderRadius: 10,
              fontFamily: 'Poppins,sans-serif', fontSize: '0.92rem',
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        {error && (
          <div style={{ fontSize: '0.78rem', color: '#ef4444', marginBottom: '0.75rem', fontWeight: 600 }}>
            {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          style={{
            width: '100%', background: '#0f172a', color: 'white', border: 'none',
            padding: '0.8rem', borderRadius: 12, fontWeight: 700, fontSize: '0.95rem',
            cursor: 'pointer', fontFamily: 'Poppins,sans-serif',
          }}
        >
          🛵 Start Delivery Shift
        </button>

        <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
          <a href="/" style={{ fontSize: '0.75rem', color: '#888', textDecoration: 'none' }}>← Back to home</a>
        </div>
      </div>
    </div>
  );
}
