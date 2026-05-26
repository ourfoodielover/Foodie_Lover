'use client';

export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { saveSession, getSession, AuthSession, SESSION_TTL_MS } from '@/lib/auth';

export default function KitchenLoginPage() {
  const router  = useRouter();
  const [pin,   setPin]   = useState('');
  const [error, setError] = useState('');
  const [busy,  setBusy]  = useState(false);

  useEffect(() => {
    if (getSession('kitchen')) router.replace('/kitchen');
  }, [router]);

  async function handleLogin() {
    if (busy || !pin.trim()) return;
    setBusy(true);
    setError('');
    try {
      // PIN is verified server-side — never sent back to the browser
      const res    = await fetch('/api/auth/verify-pin', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ role: 'kitchen', pin: pin.trim() }),
      });
      const result = await res.json() as { ok: boolean; error?: string };

      if (!result.ok) {
        setError(result.error ?? 'Incorrect kitchen PIN. Ask your admin for the PIN.');
        setPin('');
      } else {
        const s: AuthSession = {
          role: 'kitchen', name: 'Kitchen Staff', username: 'kitchen',
          loginAt:   new Date().toISOString(),
          expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
        };
        saveSession(s);
        router.replace('/kitchen');
      }
    } catch {
      setError('Could not connect to server. Please try again.');
    } finally {
      setBusy(false);
    }
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
          Contact your admin if you don&apos;t have the PIN.
        </div>
        <button className="login-back" onClick={() => router.push('/')}>
          ← Back to role selector
        </button>
      </div>
    </div>
  );
}
