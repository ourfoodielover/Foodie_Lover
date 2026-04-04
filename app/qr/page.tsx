'use client';
import { useState, useEffect } from 'react';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface TableRow {
  id:       string; // DB primary key, e.g. "tbl_01"
  name:     string; // display name, e.g. "T1"
  capacity: number;
  status:   string;
}

// ─── QR Code generator using qrserver.com free API ───────────────────────────
function qrUrl(data: string, size = 200): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&color=1A0800&bgcolor=FFFDF7&qzone=2&format=svg`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function QRPage() {
  const [baseUrl,  setBaseUrl]  = useState('');
  const [tables,   setTables]   = useState<TableRow[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [fetchErr, setFetchErr] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [size,     setSize]     = useState<200 | 250 | 300>(200);
  const [showGrid, setShowGrid] = useState(true);

  useEffect(() => {
    setBaseUrl(window.location.origin);

    // Fetch real tables from Supabase via the API so QR codes always match DB ids.
    const rid = process.env.NEXT_PUBLIC_RESTAURANT_ID ?? 'rest_default';
    fetch(`/api/tables?restaurantId=${encodeURIComponent(rid)}`)
      .then(async r => {
        if (!r.ok) {
          const body = await r.text();
          let msg = `HTTP ${r.status}`;
          try { msg = (JSON.parse(body) as { error?: string }).error ?? msg; } catch {}
          throw new Error(msg);
        }
        return r.json() as Promise<TableRow[]>;
      })
      .then(rows => {
        // Sort by natural table order (T1, T2, … T10 not T1, T10, T2)
        const sorted = [...rows].sort((a, b) => {
          const na = parseInt(a.name.replace(/\D/g, ''), 10) || 0;
          const nb = parseInt(b.name.replace(/\D/g, ''), 10) || 0;
          return na !== nb ? na - nb : a.name.localeCompare(b.name);
        });
        setTables(sorted);
        setSelected(new Set(sorted.map(t => t.id)));
        setFetchErr('');
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        console.error('[QR page] failed to load tables:', msg);
        setFetchErr(msg);
      })
      .finally(() => setLoading(false));
  }, []);

  function toggleTable(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAll()  { setSelected(new Set(tables.map(t => t.id))); }
  function selectNone() { setSelected(new Set()); }

  const visibleTables = tables.filter(t => selected.has(t.id));

  return (
    <>
      {/* ── Print styles: hide controls, show cards full-page ── */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .qr-grid  { grid-template-columns: repeat(4, 1fr) !important; gap: 8px !important; padding: 0 !important; }
          .qr-card  { break-inside: avoid; box-shadow: none !important; border: 1.5px solid #ccc !important; }
          body      { background: white !important; }
        }
        @page { margin: 1cm; size: A4; }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#faf8f3', fontFamily: 'Poppins,sans-serif' }}>

        {/* Header */}
        <div className="no-print" style={{ background: 'linear-gradient(135deg,#1A0800,#3D1C00)', color: 'white', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.75rem' }}>📱</span>
            <div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.2rem', fontWeight: 900 }}>QR Code Generator</div>
              <div style={{ fontSize: '0.7rem', color: '#F9A826' }}>Foodie Lover — Table QR Codes</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <a href="/admin" style={{ padding: '0.4rem 0.9rem', background: 'rgba(255,255,255,0.1)', color: 'white', borderRadius: 8, fontSize: '0.78rem', textDecoration: 'none', fontWeight: 600, border: '1px solid rgba(255,255,255,0.2)' }}>
              ← Admin
            </a>
            <button
              onClick={() => window.print()}
              style={{ padding: '0.5rem 1.1rem', background: '#F9A826', color: '#1A0800', border: 'none', borderRadius: 8, fontWeight: 800, cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontSize: '0.85rem' }}
            >
              🖨️ Print QR Codes
            </button>
          </div>
        </div>

        {/* Controls */}
        {!loading && !fetchErr && tables.length > 0 && (
          <div className="no-print" style={{ background: 'white', borderBottom: '1px solid #f0e4d7', padding: '0.9rem 1.5rem', display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Table selector */}
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#888', marginBottom: '0.35rem', textTransform: 'uppercase' }}>Select Tables</div>
              <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', maxWidth: 560 }}>
                {tables.map(t => (
                  <button
                    key={t.id}
                    onClick={() => toggleTable(t.id)}
                    title={`Capacity: ${t.capacity} — Status: ${t.status}`}
                    style={{
                      width: 42, height: 30, borderRadius: 6, fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer',
                      border: `2px solid ${selected.has(t.id) ? '#E65C00' : '#e5e7eb'}`,
                      background: selected.has(t.id) ? '#fff5ee' : 'white',
                      color: selected.has(t.id) ? '#E65C00' : '#9ca3af',
                      fontFamily: 'Poppins,sans-serif',
                    }}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem' }}>
                <button onClick={selectAll} style={{ fontSize: '0.7rem', color: '#E65C00', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontFamily: 'Poppins,sans-serif' }}>Select All</button>
                <span style={{ color: '#ccc' }}>|</span>
                <button onClick={selectNone} style={{ fontSize: '0.7rem', color: '#888', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Poppins,sans-serif' }}>Clear</button>
                <span style={{ fontSize: '0.7rem', color: '#aaa' }}>({selected.size} selected)</span>
              </div>
            </div>

            {/* QR size */}
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#888', marginBottom: '0.35rem', textTransform: 'uppercase' }}>QR Size</div>
              <div style={{ display: 'flex', gap: '0.3rem' }}>
                {([200, 250, 300] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    style={{
                      padding: '0.25rem 0.65rem', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                      border: `2px solid ${size === s ? '#E65C00' : '#e5e7eb'}`,
                      background: size === s ? '#fff5ee' : 'white',
                      color: size === s ? '#E65C00' : '#888',
                      fontFamily: 'Poppins,sans-serif',
                    }}
                  >
                    {s}px
                  </button>
                ))}
              </div>
            </div>

            {/* Grid toggle */}
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#888', marginBottom: '0.35rem', textTransform: 'uppercase' }}>Layout</div>
              <div style={{ display: 'flex', gap: '0.3rem' }}>
                {[true, false].map(g => (
                  <button
                    key={String(g)}
                    onClick={() => setShowGrid(g)}
                    style={{
                      padding: '0.25rem 0.65rem', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                      border: `2px solid ${showGrid === g ? '#E65C00' : '#e5e7eb'}`,
                      background: showGrid === g ? '#fff5ee' : 'white',
                      color: showGrid === g ? '#E65C00' : '#888',
                      fontFamily: 'Poppins,sans-serif',
                    }}
                  >
                    {g ? '⊞ Grid' : '☰ List'}
                  </button>
                ))}
              </div>
            </div>

            {/* Live URL preview */}
            {baseUrl && tables.length > 0 && (
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#888', marginBottom: '0.3rem', textTransform: 'uppercase' }}>QR Destination (example)</div>
                <div style={{ fontSize: '0.73rem', color: '#555', background: '#f9f9f9', padding: '0.35rem 0.6rem', borderRadius: 6, border: '1px solid #e5e7eb', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {baseUrl}/table?table={tables[0]?.id}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Instructions banner */}
        <div className="no-print" style={{ background: '#fffbeb', borderBottom: '1px solid #fde68a', padding: '0.6rem 1.5rem', fontSize: '0.8rem', color: '#854d0e' }}>
          💡 <strong>How to use:</strong> Print this page and place QR codes on each table. Customers scan to open the ordering page. Each QR links to <code style={{ background: '#fef3c7', padding: '0.1rem 0.3rem', borderRadius: 4 }}>/table?table=&lt;table-id&gt;</code>
        </div>

        {/* Body */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#999' }}>Loading tables…</div>
        ) : fetchErr ? (
          <div style={{ textAlign: 'center', padding: '4rem' }}>
            <div style={{ color: '#ef4444', fontWeight: 700, marginBottom: '0.5rem' }}>Failed to load tables</div>
            <div style={{ color: '#888', fontSize: '0.85rem' }}>{fetchErr}</div>
            <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#aaa' }}>
              Make sure <code>/api/init</code> has been called to seed the database, then refresh.
            </div>
          </div>
        ) : !baseUrl || !visibleTables.length ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#999' }}>
            {tables.length === 0
              ? 'No tables found. Run /api/init to seed the database.'
              : 'No tables selected. Click tables above to select them.'}
          </div>
        ) : (
          <div
            className="qr-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: showGrid ? 'repeat(auto-fill, minmax(200px, 1fr))' : '1fr',
              gap: '1.25rem',
              padding: '1.5rem',
            }}
          >
            {visibleTables.map(table => {
              // URL uses the DB id (e.g. "tbl_01") — matches FK in customer_tabs
              const url = `${baseUrl}/table?table=${encodeURIComponent(table.id)}`;
              return (
                <div
                  key={table.id}
                  className="qr-card"
                  style={{
                    background: 'white',
                    borderRadius: 14,
                    padding: showGrid ? '1.25rem' : '1rem 1.5rem',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                    border: '2px solid #f5ede4',
                    display: 'flex',
                    flexDirection: showGrid ? 'column' : 'row',
                    alignItems: 'center',
                    gap: showGrid ? '0.75rem' : '1.5rem',
                    textAlign: showGrid ? 'center' : 'left',
                  }}
                >
                  {/* Restaurant header */}
                  <div style={{ order: showGrid ? 0 : 1, flex: showGrid ? undefined : 1 }}>
                    <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '0.9rem', fontWeight: 900, color: '#1A0800', marginBottom: '0.15rem' }}>
                      🍽️ Foodie Lover
                    </div>
                    <div style={{
                      fontSize: showGrid ? '1.5rem' : '1.2rem',
                      fontWeight: 900,
                      color: '#E65C00',
                      lineHeight: 1.1,
                      marginBottom: '0.15rem',
                    }}>
                      Table {table.name}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#aaa', marginBottom: '0.1rem' }}>
                      Capacity: {table.capacity} · Scan to order
                    </div>
                    {!showGrid && (
                      <div style={{ fontSize: '0.65rem', color: '#ccc', fontFamily: 'monospace', marginTop: '0.25rem', wordBreak: 'break-all' }}>{url}</div>
                    )}
                  </div>

                  {/* QR Code */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrUrl(url, size)}
                    alt={`QR code for Table ${table.name}`}
                    width={showGrid ? 160 : 130}
                    height={showGrid ? 160 : 130}
                    style={{ borderRadius: 8, border: '2px solid #f5ede4', order: showGrid ? 1 : 0, flexShrink: 0 }}
                  />

                  {/* URL caption (grid only) */}
                  {showGrid && (
                    <div style={{ fontSize: '0.6rem', color: '#ccc', fontFamily: 'monospace', wordBreak: 'break-all', order: 2 }}>
                      {url}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer hint */}
        <div className="no-print" style={{ textAlign: 'center', padding: '1.5rem', color: '#ccc', fontSize: '0.75rem' }}>
          QR codes are generated via qrserver.com · Internet connection required to render
        </div>
      </div>
    </>
  );
}
