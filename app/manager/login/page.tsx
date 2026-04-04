'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { saveSession, getSession, AuthSession, SESSION_TTL_MS } from '@/lib/auth';
import { getSettings } from '@/lib/api';

export default function ManagerLoginPage() {
  const router  = useRouter();
  const [pin,   setPin]   = useState('');
  const [error, setError] = useState('');
  const [busy,  setBusy]  = useState(false);

  useEffect(() => {
    if (getSession('manager')) router.replace('/manager');
  }, [router]);

  async function handleLogin() {
    if (busy || !pin.trim()) return;
    setBusy(true);
    setError('');
    try {
      const settings  = await getSettings();
      const storedPin = settings.manager_pin ?? '9999';
      if (pin !== storedPin) {
        setError('Incorrect manager PIN. Contact your admin.');
        setPin('');
      } else {
        const s: AuthSession = {
          role: 'manager', name: 'Manager', username: 'manager',
          loginAt:   new Date().toISOString(),
          expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
        };
        saveSession(s);
        router.replace('/manager');
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
        <div className="login-icon">💳</div>
        <h1 className="login-title">Manager Login</h1>
        <p className="login-subtitle">Counter billing &amp; payment management</p>
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
        <button className="login-btn" style={{ background: '#16a34a' }} onClick={handleLogin} disabled={busy || !pin.trim()}>
          {busy ? '⏳ Signing In…' : '🔓 Open Counter'}
        </button>
        <div style={{ fontSize: '0.72rem', color: '#bbb', marginBottom: '0.75rem' }}>
          Default PIN: <strong>9999</strong> (Admin can change under Staff Settings)
        </div>
        <button className="login-back" onClick={() => router.push('/login')}>
          ← Back to role selector
        </button>
      </div>
    </div>
  );
}
