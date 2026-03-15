'use client';
import { useState, useEffect } from 'react';

// ─── Config ────────────────────────────────────────────────────────────────────
const TOTAL_TABLES = 20;
const TABLE_IDS = Array.from({ length: TOTAL_TABLES }, (_, i) =>
  `T${String(i + 1).padStart(2, '0')}`,
);

// ─── QR Code generator using qrserver.com free API ───────────────────────────
function qrUrl(data: string, size = 200): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&color=1A0800&bgcolor=FFFDF7&qzone=2&format=svg`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function QRPage() {
  const [baseUrl, setBaseUrl] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set(TABLE_IDS));
  const [size, setSize] = useState<200 | 250 | 300>(200);
  const [showGrid, setShowGrid] = useState(true);

  useEffect(() => {
    // Use the current origin so QR codes always point to the right server
    setBaseUrl(window.location.origin);
  }, []);

  function toggleTable(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAll() { setSelected(new Set(TABLE_IDS)); }
  function selectNone() { setSelected(new Set()); }

  function handlePrint() {
    window.print();
  }

  const visibleTables = TABLE_IDS.filter(id => selected.has(id));

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
              onClick={handlePrint}
              style={{ padding: '0.5rem 1.1rem', background: '#F9A826', color: '#1A0800', border: 'none', borderRadius: 8, fontWeight: 800, cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontSize: '0.85rem' }}
            >
              🖨️ Print QR Codes
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="no-print" style={{ background: 'white', borderBottom: '1px solid #f0e4d7', padding: '0.9rem 1.5rem', display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Table selector */}
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#888', marginBottom: '0.35rem', textTransform: 'uppercase' }}>Select Tables</div>
            <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', maxWidth: 560 }}>
              {TABLE_IDS.map(id => (
                <button
                  key={id}
                  onClick={() => toggleTable(id)}
                  style={{
                    width: 38, height: 30, borderRadius: 6, fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer',
                    border: `2px solid ${selected.has(id) ? '#E65C00' : '#e5e7eb'}`,
                    background: selected.has(id) ? '#fff5ee' : 'white',
                    color: selected.has(id) ? '#E65C00' : '#9ca3af',
                    fontFamily: 'Poppins,sans-serif',
                  }}
                >
                  {id}
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
          {baseUrl && (
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#888', marginBottom: '0.3rem', textTransform: 'uppercase' }}>QR Destination</div>
              <div style={{ fontSize: '0.73rem', color: '#555', background: '#f9f9f9', padding: '0.35rem 0.6rem', borderRadius: 6, border: '1px solid #e5e7eb', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                {baseUrl}/table?table=T01 … T20
              </div>
            </div>
          )}
        </div>

        {/* Instructions banner */}
        <div className="no-print" style={{ background: '#fffbeb', borderBottom: '1px solid #fde68a', padding: '0.6rem 1.5rem', fontSize: '0.8rem', color: '#854d0e' }}>
          💡 <strong>How to use:</strong> Print this page and place QR codes on each table. Customers scan to open the ordering page. Each QR links to <code style={{ background: '#fef3c7', padding: '0.1rem 0.3rem', borderRadius: 4 }}>/table?table=T##</code>
        </div>

        {/* QR Grid */}
        {!baseUrl ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#999' }}>Loading…</div>
        ) : !visibleTables.length ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#999' }}>No tables selected. Click tables above to select them.</div>
        ) : (
          <div
            className="qr-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: showGrid
                ? 'repeat(auto-fill, minmax(200px, 1fr))'
                : '1fr',
              gap: '1.25rem',
              padding: '1.5rem',
            }}
          >
            {visibleTables.map(tableId => {
              const url = `${baseUrl}/table?table=${tableId}`;
              return (
                <div
                  key={tableId}
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
                      Table {tableId}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#aaa', marginBottom: showGrid ? '0.1rem' : 0 }}>
                      Scan to order
                    </div>
                    {!showGrid && (
                      <div style={{ fontSize: '0.65rem', color: '#ccc', fontFamily: 'monospace', marginTop: '0.25rem', wordBreak: 'break-all' }}>{url}</div>
                    )}
                  </div>

                  {/* QR Code */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrUrl(url, size)}
                    alt={`QR code for Table ${tableId}`}
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
