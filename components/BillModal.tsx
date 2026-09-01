'use client';

// ─── BillModal — shared Bill/Receipt viewer + print trigger ──────────────────
// Used by Waiter (Request-Bill banner + per-customer Active Customers screen),
// Manager (dine-in tab panel + Pickup payment panel), and Delivery (receipt).
//
// Always fetches the SAME server-authoritative computation shown here AND
// used to build the physical print payload (GET /api/billing/tab|order →
// lib/billing-server.ts's computeDineInBill/computeOrderBill) — the preview
// can never disagree with what actually prints. "Print" here means queueing
// a real print_jobs row through the existing print-agent pipeline, never
// window.print()/browser printing.
import { useEffect, useState } from 'react';
import { getDineInBill, getOrderBill, printBill, genIdempotencyKey, type BillData } from '@/lib/api';

interface BillModalProps {
  kind:      'dine-in' | 'pickup' | 'delivery';
  tabId?:    string;
  orderId?:  string;
  staffName: string;
  onClose:   () => void;
}

const money = (n: number) => `₹${(Math.round(n * 100) / 100).toLocaleString('en-IN')}`;

export default function BillModal({ kind, tabId, orderId, staffName, onClose }: BillModalProps) {
  const [bill, setBill]       = useState<BillData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [printBusy, setPrintBusy] = useState<'' | 'bill' | 'receipt'>('');
  const [printMsg, setPrintMsg]   = useState('');
  const [lastPrinted, setLastPrinted] = useState<'CUSTOMER_BILL' | 'CUSTOMER_RECEIPT' | null>(null);

  async function load() {
    setLoading(true); setError('');
    try {
      const data = kind === 'dine-in'
        ? await getDineInBill(tabId!)
        : await getOrderBill(orderId!);
      setBill(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bill');
    } finally {
      setLoading(false);
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only when identity changes, not on every load() re-creation
  useEffect(() => { void load(); }, [kind, tabId, orderId]);

  async function doPrint(docType: 'CUSTOMER_BILL' | 'CUSTOMER_RECEIPT', isReprint: boolean) {
    setPrintBusy(docType === 'CUSTOMER_BILL' ? 'bill' : 'receipt');
    setPrintMsg('');
    try {
      const res = await printBill({
        kind, tabId, orderId, docType, by: staffName, isReprint,
        idempotencyKey: isReprint ? genIdempotencyKey('RPRT') : genIdempotencyKey('PRINT'),
      });
      setBill(res.bill);
      setLastPrinted(docType);
      setPrintMsg(res.alreadyExists
        ? '✅ Already queued — no duplicate job created.'
        : `✅ ${isReprint ? 'Reprint' : 'Print'} job queued (#${res.printJobId.slice(-6)}) — will print at the printer station.`);
    } catch (err) {
      setPrintMsg(`❌ ${err instanceof Error ? err.message : 'Print failed'}`);
    } finally {
      setPrintBusy('');
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: 'white', borderRadius: 20, width: '100%', maxWidth: 'min(95vw, 440px)', maxHeight: '92dvh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.35)', fontFamily: 'Poppins,sans-serif' }}>
        <div style={{ background: 'linear-gradient(135deg,#7c3aed,#5b21b6)', color: 'white', padding: '1.1rem 1.4rem', borderRadius: '20px 20px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: '1.05rem' }}>
              🧾 {kind === 'dine-in' ? 'Dine-In Bill' : kind === 'pickup' ? 'Pickup Bill' : 'Delivery Receipt'}
            </div>
            {bill && <div style={{ fontSize: '0.82rem', opacity: 0.9 }}>{bill.customerName}{bill.tableLabel ? ` · ${bill.tableLabel}` : ''}</div>}
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', fontSize: '1.4rem', cursor: 'pointer', borderRadius: 8, lineHeight: 1, padding: '0.15rem 0.4rem' }}>×</button>
        </div>

        <div style={{ padding: '1.2rem 1.4rem' }}>
          {loading && <div style={{ textAlign: 'center', padding: '2rem 0', color: '#6b7280' }}>⏳ Loading bill…</div>}

          {!loading && error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '0.85rem', color: '#dc2626', fontSize: '0.85rem', fontWeight: 600 }}>
              ❌ {error}
            </div>
          )}

          {!loading && bill && (
            <>
              {/* Payment status banner — never falsely says PAID */}
              <div style={{
                marginBottom: '0.9rem', borderRadius: 10, padding: '0.7rem 0.9rem', fontWeight: 800, fontSize: '0.85rem',
                background: bill.isPaid ? '#f0fdf4' : '#fffbeb',
                border: `1px solid ${bill.isPaid ? '#86efac' : '#fde68a'}`,
                color: bill.isPaid ? '#16a34a' : '#b45309',
              }}>
                {bill.isPaid ? `✅ PAID · ${bill.paymentMethod ?? ''}` : `⏳ PAYMENT STATUS: PENDING`}
                {!bill.isPaid && kind === 'delivery' && (
                  <div style={{ marginTop: '0.35rem', fontSize: '0.9rem', color: '#dc2626' }}>
                    💰 AMOUNT TO COLLECT: {money(bill.amountDue)}
                  </div>
                )}
              </div>

              {/* Customer / order info */}
              <div style={{ fontSize: '0.78rem', color: '#6b7280', marginBottom: '0.75rem', lineHeight: 1.6 }}>
                {bill.orderNumber != null && <div>Order #{bill.orderNumber}</div>}
                {bill.phone && <div>📞 {bill.phone}</div>}
                {bill.deliveryAddress && <div>📍 {bill.deliveryAddress}</div>}
              </div>

              {/* Items — grouped by round for dine-in, flat otherwise */}
              <div style={{ marginBottom: '0.85rem' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6B5246', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>
                  Items
                </div>
                {kind === 'dine-in' && bill.rounds ? (
                  bill.rounds.map((r, ri) => (
                    <div key={r.orderId} style={{ marginBottom: '0.5rem' }}>
                      {bill.rounds!.length > 1 && (
                        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#7c3aed', marginBottom: '0.15rem' }}>
                          {ri === 0 ? 'Round 1' : `Round ${ri + 1} (Order More)`}{r.orderNumber != null ? ` · #${r.orderNumber}` : ''}
                        </div>
                      )}
                      {r.items.map((item, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', borderBottom: '1px solid #f3f4f6', fontSize: '0.82rem' }}>
                          <span>{item.name} × {item.qty}</span>
                          <span style={{ fontWeight: 700 }}>{money(item.subtotal)}</span>
                        </div>
                      ))}
                    </div>
                  ))
                ) : (
                  bill.items.map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', borderBottom: '1px solid #f3f4f6', fontSize: '0.82rem' }}>
                      <span>{item.name} × {item.qty}</span>
                      <span style={{ fontWeight: 700 }}>{money(item.subtotal)}</span>
                    </div>
                  ))
                )}
              </div>

              {/* Money breakdown — discount/coupon always shown when present */}
              <div style={{ background: '#f9fafb', borderRadius: 10, padding: '0.75rem 0.9rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                  <span>Subtotal</span><span style={{ fontWeight: 600 }}>{money(bill.subtotal)}</span>
                </div>
                {bill.discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', color: '#dc2626' }}>
                    <span>Discount{bill.discountReason ? ` (${bill.discountReason})` : ''}</span>
                    <span style={{ fontWeight: 700 }}>−{money(bill.discount)}</span>
                  </div>
                )}
                {bill.couponDiscount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', color: '#7c3aed' }}>
                    <span>Coupon{bill.couponCode ? ` (${bill.couponCode})` : ''}</span>
                    <span style={{ fontWeight: 700 }}>−{money(bill.couponDiscount)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.45rem', paddingTop: '0.45rem', borderTop: '1.5px dashed #d1d5db', fontWeight: 900, fontSize: '1rem' }}>
                  <span>{bill.isPaid ? 'TOTAL PAID' : 'TOTAL DUE'}</span><span>{money(bill.total)}</span>
                </div>
              </div>

              {printMsg && (
                <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', fontWeight: 600, color: printMsg.startsWith('✅') ? '#16a34a' : '#dc2626' }}>
                  {printMsg}
                </div>
              )}

              {/* Print actions */}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button
                  onClick={() => void doPrint('CUSTOMER_BILL', lastPrinted === 'CUSTOMER_BILL')}
                  disabled={!!printBusy}
                  style={{ flex: 1, padding: '0.65rem', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontWeight: 800, fontSize: '0.82rem', background: '#7c3aed', color: 'white', opacity: printBusy ? 0.6 : 1 }}
                >
                  {printBusy === 'bill' ? '⏳' : lastPrinted === 'CUSTOMER_BILL' ? '🔁 Reprint Bill' : '🖨️ Print Bill'}
                </button>
                <button
                  onClick={() => void doPrint('CUSTOMER_RECEIPT', lastPrinted === 'CUSTOMER_RECEIPT')}
                  disabled={!!printBusy || !bill.isPaid}
                  title={!bill.isPaid ? 'Available once payment is completed' : undefined}
                  style={{ flex: 1, padding: '0.65rem', borderRadius: 10, border: 'none', cursor: bill.isPaid ? 'pointer' : 'not-allowed', fontFamily: 'Poppins,sans-serif', fontWeight: 800, fontSize: '0.82rem', background: bill.isPaid ? '#16a34a' : '#e5e7eb', color: bill.isPaid ? 'white' : '#9ca3af', opacity: printBusy ? 0.6 : 1 }}
                >
                  {printBusy === 'receipt' ? '⏳' : lastPrinted === 'CUSTOMER_RECEIPT' ? '🔁 Reprint Receipt' : '🖨️ Print Receipt'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
