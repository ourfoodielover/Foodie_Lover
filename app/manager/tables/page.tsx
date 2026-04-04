'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, AuthSession } from '@/lib/auth';
// ── SUPABASE (not localStorage) ─────────────────────────────────────────────
// Migrated from lib/storage getTables / getRestaurantOccupancyStats to live
// Supabase API data so that sessions created via the QR table portal are
// reflected here immediately instead of showing stale localStorage snapshots.
import { getTables, getTabs, Table, CustomerTab } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────
// Extended Table: base Table fields + occupancy derived from active Supabase tabs
interface TableWithOccupancy extends Table {
  occupiedSeats:    number;
  activeSessionId?: string;
}

interface OccupancyStats {
  totalTables:    number;
  totalSeats:     number;
  occupiedSeats:  number;
  freeSeats:      number;
  occupiedTables: number;
  freeTables:     number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Derive real-time occupancy for each table from live Supabase tabs.
 * A table is 'occupied' if it has at least one non-closed tab referencing it.
 * This replaces the stale localStorage syncTableOccupancy() approach.
 */
function enrichTables(
  rawTables: Table[],
  allTabs:   CustomerTab[],
): TableWithOccupancy[] {
  const openTabs = allTabs.filter(t => t.status !== 'closed');
  return rawTables.map(table => {
    // Match by tableId — customer_tabs.table_id stores the table's ID string
    const activeTabs    = openTabs.filter(t => t.tableId === table.id);
    const occupiedSeats = activeTabs.reduce((s, t) => s + (t.partySize || 0), 0);
    const isOccupied    = activeTabs.length > 0;
    return {
      ...table,
      // Preserve 'reserved' status; otherwise derive from active tabs
      status:          isOccupied ? 'occupied'
                     : table.status === 'reserved' ? 'reserved'
                     : 'available',
      occupiedSeats,
      activeSessionId: activeTabs.length > 0 ? activeTabs[0].id : undefined,
    };
  });
}

function computeStats(tables: TableWithOccupancy[]): OccupancyStats {
  const totalTables   = tables.length;
  const totalSeats    = tables.reduce((s, t) => s + (t.capacity    || 0), 0);
  const occupiedSeats = tables.reduce((s, t) => s + (t.occupiedSeats || 0), 0);
  const occupiedTables = tables.filter(t => t.status !== 'available').length;
  return {
    totalTables,
    totalSeats,
    occupiedSeats,
    freeSeats:     Math.max(0, totalSeats - occupiedSeats),
    occupiedTables,
    freeTables:    Math.max(0, totalTables - occupiedTables),
  };
}

// ─── Style helpers ─────────────────────────────────────────────────────────────
const btn = (bg = '#E65C00', c = 'white'): React.CSSProperties => ({
  background: bg, color: c, border: 'none', borderRadius: 8,
  fontWeight: 700, cursor: 'pointer', fontFamily: 'Poppins,sans-serif',
  padding: '0.5rem 1rem', fontSize: '0.85rem',
});

// ─── Table colour badge ────────────────────────────────────────────────────────
function getTableColor(table: TableWithOccupancy): {
  bg: string; border: string; badge: string; badgeBg: string;
} {
  if (table.status === 'available')
    return { bg: '#f0fdf4', border: '#16a34a', badge: '✅ Available', badgeBg: '#dcfce7' };
  if (table.occupiedSeats >= table.capacity)
    return { bg: '#fff1f2', border: '#ef4444', badge: '🔴 Full',      badgeBg: '#fee2e2' };
  return   { bg: '#fffbeb', border: '#f59e0b', badge: '🟡 Occupied',  badgeBg: '#fef3c7' };
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({
  icon, value, label, color,
}: { icon: string; value: string | number; label: string; color: string }) {
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

  const [tables, setTables]           = useState<TableWithOccupancy[]>([]);
  const [stats,  setStats]            = useState<OccupancyStats>({
    totalTables: 0, totalSeats: 0,
    occupiedSeats: 0, freeSeats: 0,
    occupiedTables: 0, freeTables: 0,
  });
  const [fetchError, setFetchError]   = useState('');

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const s = getSession('manager');
    if (!s) { router.replace('/manager/login'); return; }
    setSession(s);
    setAuthChecked(true);
  }, [router]);

  // ── Data refresh (Supabase) ────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    try {
      setFetchError('');
      // Fetch both tables and tabs from Supabase in parallel
      const [rawTables, allTabs] = await Promise.all([getTables(), getTabs()]);
      const enriched = enrichTables(rawTables, allTabs);
      setTables(enriched);
      setStats(computeStats(enriched));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load data';
      setFetchError(msg);
      console.error('[manager/tables] refresh error:', e);
    }
  }, []);

  useEffect(() => {
    if (!authChecked) return;
    void refresh();
    const t = setInterval(() => void refresh(), 5000);
    return () => clearInterval(t);
  }, [refresh, authChecked]);

  void session; // referenced to satisfy linter — session used for auth gate only

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
            onClick={() => void refresh()}
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

      {/* Error banner */}
      {fetchError && (
        <div style={{ background: '#fef2f2', border: '2px solid #fecaca', borderRadius: 10, padding: '0.75rem 1.5rem', margin: '0.75rem 1.5rem', fontSize: '0.82rem', color: '#dc2626', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>⚠️ {fetchError}</span>
          <button onClick={() => void refresh()} style={{ background: '#dc2626', color: 'white', border: 'none', borderRadius: 6, padding: '0.3rem 0.75rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem', fontFamily: 'Poppins,sans-serif' }}>
            Retry
          </button>
        </div>
      )}

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

        {tables.length === 0 && !fetchError && (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🪑</div>
            <div>No tables configured yet.</div>
            <div style={{ fontSize: '0.78rem', marginTop: '0.4rem' }}>Add tables in the admin settings.</div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem' }}>
          {tables.map(table => {
            const { bg, border, badge, badgeBg } = getTableColor(table);
            const cap       = table.capacity || 0;
            const occupied  = table.occupiedSeats || 0;
            const freeSeats = Math.max(0, cap - occupied);
            const fillPct   = cap > 0 ? Math.min(100, Math.round((occupied / cap) * 100)) : 0;

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

                {/* Active session reference */}
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
