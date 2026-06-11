'use client';

export const dynamic = 'force-dynamic';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSession, clearSession, AuthSession } from '@/lib/auth';

// ─── Kitchen Display — RETIRED ───────────────────────────────────────────────
// The live kitchen order display has been replaced by the Waiter
// Confirmation + Printing workflow (see /waiter). When a waiter taps
// "Confirm & Print", a Kitchen Order Ticket (KOT) is printed directly on the
// kitchen's thermal printer via the companion print agent — no screen needed.
//
// This route is kept (rather than removed) so existing bookmarks/links and
// the kitchen PIN login still resolve to something useful instead of a 404.
export default function KitchenRetiredPage() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    const s = getSession('kitchen');
    if (!s) { router.replace('/kitchen/login'); return; }
    setSession(s);
  }, [router]);

  function logout() {
    clearSession('kitchen');
    router.replace('/kitchen/login');
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg,#fff8f3,#fff0e8)', fontFamily: 'Poppins,sans-serif',
      padding: '1.5rem',
    }}>
      <div style={{
        background: 'white', borderRadius: 16, padding: '2rem', maxWidth: 480, width: '100%',
        textAlign: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🖨️</div>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.4rem', fontWeight: 800, color: '#1A0800', margin: '0 0 0.5rem' }}>
          Kitchen Display Retired
        </h1>
        <p style={{ color: '#666', fontSize: '0.9rem', lineHeight: 1.6, margin: '0 0 1.25rem' }}>
          New orders are now confirmed by waiters and printed directly on the
          kitchen ticket printer — there&apos;s no screen to watch anymore.
          {session?.name ? ` Welcome, ${session.name}.` : ''}
        </p>
        <p style={{ color: '#999', fontSize: '0.8rem', lineHeight: 1.6, margin: '0 0 1.5rem' }}>
          If the printer runs out of paper or jams, ask a waiter to tap
          <strong> 🖨️ Reprint KOT</strong> on the order in the Waiter Station.
        </p>
        <Link href="/waiter" style={{
          display: 'inline-block', background: 'linear-gradient(135deg,#7c3aed,#5b21b6)',
          color: 'white', textDecoration: 'none', fontWeight: 700, fontSize: '0.9rem',
          padding: '0.7rem 1.5rem', borderRadius: 10, marginBottom: '0.75rem',
        }}>
          🛎️ Go to Waiter Station
        </Link>
        <div>
          <button onClick={logout} style={{
            background: 'none', border: 'none', color: '#999', fontSize: '0.78rem',
            cursor: 'pointer', textDecoration: 'underline', fontFamily: 'Poppins,sans-serif',
          }}>
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}
