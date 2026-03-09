'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { loginWaiter, getSession } from '@/lib/auth';

export default function WaiterLoginPage() {
  const router    = useRouter();
  const [username, setUsername] = useState('');
  const [pin,      setPin]      = useState('');
  const [error,    setError]    = useState('');
  const [busy,     setBusy]     = useState(false);

  useEffect(() => {
    if (getSession('waiter')) router.replace('/waiter');
  }, [router]);

  function handleLogin() {
    if (busy || !username.trim() || !pin.trim()) return;
    setBusy(true);
    setError('');
    const session = loginWaiter(username, pin);
    if (session) {
      router.replace('/waiter');
    } else {
      setError('Incorrect username or PIN. Contact your admin.');
      setPin('');
    }
    setBusy(false);
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-icon">🧑‍🍳</div>
        <h1 className="login-title">Waiter Login</h1>
        <p className="login-subtitle">Enter your staff credentials to start your shift</p>

        {error && <div className="login-error">{error}</div>}

        <input
          className="login-input login-input-text"
          type="text"
          autoCapitalize="none"
          autoCorrect="off"
          placeholder="Username (e.g. ravi)"
          value={username}
          onChange={e => setUsername(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && pin && handleLogin()}
          autoFocus
          style={{ letterSpacing: 0, textAlign: 'left' }}
        />

        <input
          className="login-input"
          type="password"
          inputMode="numeric"
          maxLength={8}
          placeholder="PIN • • • •"
          value={pin}
          onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
        />

        <button
          className="login-btn"
          style={{ background: '#8b5cf6' }}
          onClick={handleLogin}
          disabled={busy || !username.trim() || !pin.trim()}
        >
          {busy ? '⏳ Signing In…' : '🔓 Start Shift'}
        </button>

        <div style={{ fontSize: '0.72rem', color: '#bbb', marginBottom: '0.75rem' }}>
          Staff accounts are created by your Admin
        </div>

        <button className="login-back" onClick={() => router.push('/login')}>
          ← Back to role selector
        </button>
      </div>
    </div>
  );
}
