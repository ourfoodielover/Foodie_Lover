'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { loginKitchen, getSession } from '@/lib/auth';

export default function KitchenLoginPage() {
  const router  = useRouter();
  const [pin,   setPin]   = useState('');
  const [error, setError] = useState('');
  const [busy,  setBusy]  = useState(false);

  useEffect(() => {
    if (getSession('kitchen')) router.replace('/kitchen');
  }, [router]);

  function handleLogin() {
    if (busy || !pin.trim()) return;
    setBusy(true);
    setError('');
    const session = loginKitchen(pin);
    if (session) {
      router.replace('/kitchen');
    } else {
      setError('Incorrect kitchen PIN. Ask your admin for the PIN.');
      setPin('');
    }
    setBusy(false);
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-icon">🔥</div>
        <h1 className="login-title">Kitchen Login</h1>
        <p className="login-subtitle">Enter the shared kitchen PIN to access the display</p>

        {error && <div className="login-error">{error}</div>}

        <input
          className="login-input"
          type="password"
          inputMode="numeric"
          maxLength={8}
          placeholder="• • • •"
          value={pin}
          onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          autoFocus
        />

        <button className="login-btn" style={{ background: '#3b82f6' }} onClick={handleLogin} disabled={busy || !pin.trim()}>
          {busy ? '⏳ Signing In…' : '🔓 Enter Kitchen'}
        </button>

        <div style={{ fontSize: '0.72rem', color: '#bbb', marginBottom: '0.75rem' }}>
          Default PIN: <strong>0000</strong> (Admin can change under Staff Settings)
        </div>

        <button className="login-back" onClick={() => router.push('/login')}>
          ← Back to role selector
        </button>
      </div>
    </div>
  );
}
