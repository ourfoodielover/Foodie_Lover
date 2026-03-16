'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, AuthSession } from '@/lib/auth';
import {
  getTables, getRestaurantOccupancyStats,
  Table, RestaurantOccupancyStats,
} from '@/lib/storage';

// ─── Style helpers ─────────────────────────────────────────────────────────────
const btn = (bg = '#E65C00', c = 'white'): React.CSSProperties => ({
  background: bg, color: c, border: 'none', borderRadius: 8,
  fontWeight: 700, cursor: 'pointer', fontFamily: 'Poppins,sans-serif',
  padding: '0.5rem 1rem', fontSize: '0.85rem',
});

// ─── Table status helpers ──────────────────────────────────────────────────────
function getTableColor(table: Table): { bg: string; border: string; badge: string; badgeBg: string } {
  if (table.status === 'available') return { bg: '#f0fdf4', border: '#16a34a', badge: '✅ Available', badgeBg: '#dcfce7' };
  if (table.occupiedSeats >= table.capacity)
    return { bg: '#fff1f2', border: '#ef4444', badge: '🔴 Full',      badgeBg: '#fee2e2' };
  return { bg: '#fffbeb', border: '#f59e0b', badge: '🟡 Occupied',  badgeBg: '#fef3c7' };
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ icon, value, label, color }: { icon: string; value: string | number; label: string; color: string }) {
  // Guard: NaN or undefined values must not reach React children — cast to safe string
  const safeValue = typeof value === 'number'
    ? (isNaN(value) || !isFinite(value) ? '0' : value.toLocaleString('en-IN'))
    : (value ?? '0');
  return (
    <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '0.85rem 1.1rem', textAlign: 'center', minWidth: '110px' }}>
      <div style={{ fontSize: '1.4rem', marginBottom: '0.2rem' }}>{icon}</div>
      <div style={{ fontSize: '1.35rem', fontWeight: 900, color }}>{safeValue}</div>
      <div style={{ fontSize: '0.65rem', color: '#d1fae5', marginTop: '0.1rem' }}>{label}</div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ManagerTablesPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [session, setSession]         = useState<AuthSession | null>(null);

  const [tables, setTables]           = useState<Table[]>([]);
  const [stats, setStats]             = useState<RestaurantOccupancyStats>({
    totalTables: 0, totalSeats: 0,
    occupiedSeats: 0, freeSeats: 0,
    occupiedTables: 0, freeTables: 0,
  });

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const s = getSession('manager');
    if (!s) { router.replace('/manager/login'); return; }
    setSession(s);
    setAuthChecked(true);
  }, [router]);

  // ── Data refresh ──────────────────────────────────────────────────────────
  const refresh = useCallback(() => {
    setTables(getTables());
    setStats(getRestaurantOccupancyStats());
  }, []);

  useEffect(() => {
    if (!authChecked) return;
    refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [refresh, authChecked]);

  if (!authChecked) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#064e3b,#065f46)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: 'Poppins,sans-serif' }}>
        Checking auth…
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#faf8f3,#f5f0e8)', fontFamily: 'Poppins,sans-serif' }}>

      {/* ── Header ── */}
      <div style={{ background: 'linear-gradient(135deg,#064e3b,#065f46)', color: 'white', padding: '0.9rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.5rem' }}>🪑</span>
          <div>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.2rem', fontWeight: 900 }}>Table Occupancy Map</div>
            <div style={{ fontSize: '0.7rem', color: '#6ee7b7' }}>Live seat availability — auto-refreshes every 5 s</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <button
            onClick={refresh}
            style={{ ...btn('#065f46', '#6ee7b7'), border: '1px solid #6ee7b7', fontSize: '0.72rem' }}
          >
            🔄 Refresh
          </button>
          <button
            onClick={() => router.push('/manager')}
            style={{ ...btn('#ef444430', '#ef4444'), border: '1px solid #ef444440', fontSize: '0.72rem' }}
          >
            ← Counter
          </button>
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div style={{ background: '#065f46', color: 'white', padding: '0.8rem 1.5rem', display: 'flex', gap: '0.75rem', overflowX: 'auto' }}>
        <StatCard icon="🍽️" value={stats.totalTables}    label="Total Tables"    color="white"    />
        <StatCard icon="🪑" value={stats.totalSeats}     label="Total Seats"     color="white"    />
        <StatCard icon="👥" value={stats.occupiedSeats}  label="Occupied Seats"  color="#fbbf24"  />
        <StatCard icon="✅" value={stats.freeSeats}      label="Free Seats"      color="#6ee7b7"  />
        <StatCard icon="🔴" value={stats.occupiedTables} label="Occupied Tables" color="#fca5a5"  />
        <StatCard icon="🟢" value={stats.freeTables}     label="Free Tables"     color="#6ee7b7"  />
      </div>

      {/* ── Table Grid ── */}
      <div style={{ padding: '1.25rem 1.5rem' }}>
        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1rem', fontWeight: 900, color: '#1A0800', marginBottom: '0.75rem' }}>
          All Tables ({tables.length})
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem' }}>
          {tables.map(table => {
            const { bg, border, badge, badgeBg } = getTableColor(table);
            const cap          = table.capacity || 0;
            const occupied     = table.occupiedSeats || 0;
            const freeSeats    = Math.max(0, cap - occupied);
            const fillPct      = cap > 0 ? Math.min(100, Math.round((occupied / cap) * 100)) : 0;

            return (
              <div
                key={table.id}
                style={{
                  background: bg,
                  border: `2px solid ${border}`,
                  borderRadius: 14,
                  padding: '0.9rem',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem',
                }}
              >
                {/* Table name + ID */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    {/* name may be absent in old localStorage data — fall back to id */}
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1A0800' }}>{table.name || table.id}</div>
                    <div style={{ fontSize: '0.65rem', color: '#888' }}>{table.id}</div>
                  </div>
                  <span style={{ background: badgeBg, color: border, fontSize: '0.62rem', fontWeight: 700, padding: '0.18rem 0.5rem', borderRadius: 8, whiteSpace: 'nowrap' }}>
                    {badge}
                  </span>
                </div>

                {/* Seat usage bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#555', marginBottom: '0.2rem' }}>
                    <span>🪑 Seats</span>
                    <span style={{ fontWeight: 800 }}>{occupied} / {cap}</span>
                  </div>
                  <div style={{ background: '#e5e7eb', borderRadius: 6, height: 7, overflow: 'hidden' }}>
                    <div style={{
                      width: `${fillPct}%`,
                      height: '100%',
                      borderRadius: 6,
                      background: fillPct >= 100 ? '#ef4444' : fillPct >= 60 ? '#f59e0b' : '#16a34a',
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                </div>

                {/* Free seats */}
                <div style={{ fontSize: '0.7rem', color: freeSeats === 0 ? '#ef4444' : '#16a34a', fontWeight: 700 }}>
                  {freeSeats === 0 ? '🔴 No seats available' : `✅ ${freeSeats} free seat${freeSeats !== 1 ? 's' : ''}`}
                </div>

                {/* Session ID if occupied */}
                {table.activeSessionId && (
                  <div style={{ fontSize: '0.6rem', color: '#888', marginTop: '0.1rem', wordBreak: 'break-all' }}>
                    Session: …{table.activeSessionId.slice(-6)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Zone legend ── */}
      <div style={{ padding: '0 1.5rem 1.5rem' }}>
        <div style={{ background: 'white', borderRadius: 12, padding: '0.9rem 1.1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.75rem' }}>
          <div style={{ fontWeight: 700, color: '#1A0800' }}>Legend:</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <div style={{ width: 14, height: 14, borderRadius: 4, background: '#dcfce7', border: '2px solid #16a34a' }} />
            <span>Available</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <div style={{ width: 14, height: 14, borderRadius: 4, background: '#fef3c7', border: '2px solid #f59e0b' }} />
            <span>Partially occupied</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <div style={{ width: 14, height: 14, borderRadius: 4, background: '#fee2e2', border: '2px solid #ef4444' }} />
            <span>Full</span>
          </div>
        </div>
      </div>
    </div>
  );
}
