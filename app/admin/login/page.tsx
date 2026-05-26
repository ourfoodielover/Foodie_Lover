'use client';

export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { saveSession, getSession, AuthSession, SESSION_TTL_MS } from '@/lib/auth';
import { getSettings } from '@/lib/api';

type View = 'login' | 'forgot' | 'reset-success';

export default function AdminLoginPage() {
  const router = useRouter();
  const [view,  setView]  = useState<View>('login');

  // Login form
  const [pin,   setPin]   = useState('');
  const [error, setError] = useState('');
  const [busy,  setBusy]  = useState(false);

  // Forgot PIN form — security question loaded from Supabase on mount
  // Only the question text is fetched to the client — the answer stays server-side
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [answer,  setAnswer]  = useState('');
  const [newPin1, setNewPin1] = useState('');
  const [newPin2, setNewPin2] = useState('');
  const [recErr,  setRecErr]  = useState('');
  const [recBusy, setRecBusy] = useState(false);

  useEffect(() => {
    if (getSession('admin')) { router.replace('/admin'); return; }
    // Only fetch the question text (not the answer — that stays server-side)
    getSettings().then(s => {
      if (s.security_question) setSecurityQuestion(s.security_question);
    }).catch(() => {/* ignore */});
  }, [router]);

  // ── Normal login ─────────────────────────────────────────────────────────────
  async function handleLogin() {
    if (busy || !pin.trim()) return;
    setBusy(true);
    setError('');
    try {
      // PIN is verified server-side — never returned to the browser
      const res    = await fetch('/api/auth/verify-pin', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ role: 'admin', pin: pin.trim() }),
      });
      const result = await res.json() as { ok: boolean; error?: string };

      if (!result.ok) {
        setError(result.error ?? 'Incorrect PIN. Please try again.');
        setPin('');
      } else {
        const s: AuthSession = {
          role: 'admin', name: 'Admin', username: 'admin',
          loginAt:   new Date().toISOString(),
          expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
        };
        saveSession(s);
        router.replace('/admin');
      }
    } catch {
      setError('Could not connect to server. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  // ── Security question recovery ────────────────────────────────────────────────
  // The answer is sent to the server for comparison — it is NEVER returned.
  // If correct, the server updates the PIN and returns { ok: true }.
  async function handleRecovery() {
    if (recBusy) return;
    setRecErr('');
    if (!answer.trim()) { setRecErr('Please enter your answer.'); return; }
    if (!newPin1 || newPin1.length < 4) { setRecErr('New PIN must be at least 4 digits.'); return; }
    if (newPin1 !== newPin2) { setRecErr('PINs do not match.'); return; }
    setRecBusy(true);
    try {
      const res    = await fetch('/api/auth/recover-pin', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ answer: answer.trim(), newPin: newPin1 }),
      });
      const result = await res.json() as { ok: boolean; error?: string };
      if (!result.ok) {
        setRecErr(`❌ ${result.error ?? 'Incorrect answer. Please try again.'}`);
        return;
      }
      setView('reset-success');
    } catch {
      setRecErr('❌ Server error. Please try again.');
    } finally {
      setRecBusy(false);
    }
  }

  if (view === 'reset-success') {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-icon">✅</div>
          <h1 className="login-title">PIN Reset!</h1>
          <p className="login-subtitle">Your admin PIN has been successfully reset.</p>
          <button className="login-btn" onClick={() => { setView('login'); setPin(''); setError(''); }}>
            🔓 Back to Login
          </button>
        </div>
      </div>
    );
  }

  if (view === 'forgot') {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-icon">🔑</div>
          <h1 className="login-title">Recover Admin PIN</h1>

          {!securityQuestion ? (
            <>
              <p className="login-subtitle" style={{ color: '#dc2626' }}>
                No security question has been set up yet.
              </p>
              <div style={{ background:'#fef2f2', borderRadius:10, padding:'1rem', fontSize:'0.82rem', color:'#7f1d1d', marginBottom:'1.25rem', textAlign:'left' }}>
                <strong>To recover access:</strong> Ask your system administrator to reset the admin PIN
                in the Supabase dashboard (restaurant_settings table, key = &quot;admin_pin&quot;). Then set
                up a security question after logging in under Admin → Staff → Security Question.
              </div>
              <button className="login-back" onClick={() => setView('login')}>← Back to login</button>
            </>
          ) : (
            <>
              <p className="login-subtitle">Answer your security question to reset your PIN</p>
              <div style={{ background:'#eff6ff', borderRadius:10, padding:'0.85rem 1rem', marginBottom:'1.25rem', fontSize:'0.85rem', color:'#1d4ed8', textAlign:'left', fontWeight:600 }}>
                ❓ {securityQuestion}
              </div>
              {recErr && <div className="login-error">{recErr}</div>}
              <input className="login-input login-input-text" type="text" placeholder="Your answer"
                value={answer} onChange={e => setAnswer(e.target.value)} autoFocus
                style={{ letterSpacing:0, textAlign:'left' }} />
              <input className="login-input" type="password" inputMode="numeric"
                placeholder="New PIN (4+ digits)" maxLength={8} value={newPin1}
                onChange={e => setNewPin1(e.target.value.replace(/\D/g, ''))} />
              <input className="login-input" type="password" inputMode="numeric"
                placeholder="Confirm new PIN" maxLength={8} value={newPin2}
                onChange={e => setNewPin2(e.target.value.replace(/\D/g, ''))}
                onKeyDown={e => e.key === 'Enter' && handleRecovery()} />
              <button className="login-btn" style={{ background:'#7c3aed' }} onClick={handleRecovery} disabled={recBusy}>
                {recBusy ? '⏳ Verifying…' : '🔓 Reset PIN'}
              </button>
              <button className="login-back" onClick={() => { setView('login'); setRecErr(''); setAnswer(''); setNewPin1(''); setNewPin2(''); }}>
                ← Back to login
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-icon">🔧</div>
        <h1 className="login-title">Admin Login</h1>
        <p className="login-subtitle">Enter your owner PIN to access the admin dashboard</p>
        {error && <div className="login-error">{error}</div>}
        <input className="login-input" type="password" inputMode="numeric" maxLength={8}
          placeholder="• • • •" value={pin}
          onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
          onKeyDown={e => e.key === 'Enter' && handleLogin()} autoFocus />
        <button className="login-btn" onClick={handleLogin} disabled={busy || !pin.trim()}>
          {busy ? '⏳ Signing In…' : '🔓 Login as Admin'}
        </button>
        <button onClick={() => { setView('forgot'); setError(''); setPin(''); }}
          style={{ background:'none', border:'none', color:'#E65C00', fontSize:'0.82rem', fontWeight:600, cursor:'pointer', fontFamily:'Poppins,sans-serif', marginBottom:'0.5rem' }}>
          🔑 Forgot PIN?
        </button>
        <button className="login-back" onClick={() => router.push('/')}>
          ← Back to role selector
        </button>
      </div>
    </div>
  );
}
