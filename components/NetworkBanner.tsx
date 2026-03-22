'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { getQueueCount } from '@/lib/offline-queue';
import { syncQueue } from '@/lib/sync-engine';

export function NetworkBanner() {
  const [online, setOnline]       = useState(true);
  const [pending, setPending]     = useState(0);
  const [syncing, setSyncing]     = useState(false);
  const [syncMsg, setSyncMsg]     = useState('');
  const mounted = useRef(false);

  const refresh = useCallback(() => { setPending(getQueueCount()); }, []);

  const doSync = useCallback(async () => {
    if (syncing || !navigator.onLine) return;
    setSyncing(true);
    setSyncMsg('');
    try {
      const { synced } = await syncQueue();
      if (synced > 0) {
        setSyncMsg(`✅ Synced ${synced} pending action${synced > 1 ? 's' : ''}`);
        setTimeout(() => setSyncMsg(''), 4000);
      }
    } catch { /* ignore */ } finally {
      setSyncing(false);
      refresh();
    }
  }, [syncing, refresh]);

  useEffect(() => {
    mounted.current = true;
    setOnline(navigator.onLine);
    refresh();

    const onOnline  = () => { setOnline(true);  doSync(); refresh(); };
    const onOffline = () => { setOnline(false);  refresh(); };

    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);

    // Auto-sync on mount and every 30s
    if (navigator.onLine) doSync();
    const interval = setInterval(() => { refresh(); if (navigator.onLine) doSync(); }, 30000);

    return () => {
      mounted.current = false;
      window.removeEventListener('online',  onOnline);
      window.removeEventListener('offline', onOffline);
      clearInterval(interval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hide banner when online, no queue, no sync message
  if (online && pending === 0 && !syncMsg && !syncing) return null;

  const bg = online ? (pending > 0 ? '#d97706' : '#16a34a') : '#dc2626';

  return (
    <div role="status" aria-live="polite" style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
      background: bg, color: 'white',
      padding: '0.55rem 1rem',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.65rem',
      fontSize: '0.82rem', fontFamily: 'Poppins,sans-serif', fontWeight: 600,
      boxShadow: '0 -2px 12px rgba(0,0,0,0.25)',
      transition: 'background 0.4s',
    }}>
      <span>{online ? (pending > 0 ? '🟡' : '🟢') : '🔴'}</span>
      <span>
        {!online
          ? `Offline Mode${pending > 0 ? ` — ${pending} action${pending > 1 ? 's' : ''} queued` : ' — Orders saved locally, will sync when back online'}`
          : syncing ? 'Syncing offline data…'
          : syncMsg  ? syncMsg
          : pending > 0 ? `${pending} offline action${pending > 1 ? 's' : ''} pending sync`
          : 'All data synced ✓'}
      </span>
      {online && pending > 0 && !syncing && (
        <button
          onClick={doSync}
          style={{
            background: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.5)',
            color: 'white', borderRadius: 6, padding: '0.2rem 0.65rem',
            cursor: 'pointer', fontFamily: 'Poppins,sans-serif',
            fontWeight: 700, fontSize: '0.75rem',
          }}
        >
          Sync Now
        </button>
      )}
      {syncing && <span style={{ opacity: 0.8 }}>⏳</span>}
    </div>
  );
}
