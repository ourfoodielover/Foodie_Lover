'use client';
// ─── Foodie Lover — Admin Finance / Cash Flow Management ──────────────────────
// Self-contained component, lazy-loaded from app/admin/page.tsx as a new
// "finance" Section (see the four small edits made there). Kept as its own
// file rather than inline in admin/page.tsx (already 3600+ lines) to avoid
// touching that file more than a one-line import + one nav button + one
// render block.
//
// Visual language intentionally mirrors admin/page.tsx's existing style
// helpers (card/btn/inp/tabB, the same orange/near-black palette, Playfair
// Display headers + Poppins body) so this reads as part of the same product,
// not a bolted-on page.
//
// Data model recap (see docs/finance-implementation-report.md for the full
// write-up):
//   • "System Sales" (from orders/customer_tabs) is fetched live from
//     /api/finance/system-sales — never stored, never duplicated.
//   • Manager-logged operating expenses are read live from the EXISTING
//     `expenses` table via the existing listExpenses()/computeExpenseStats()
//     — shown here read-only so Admin gets visibility without a second,
//     divergent edit path for the same rows the Manager portal already owns.
//   • Everything else (manual ledger entries, vendors/payables, salaries,
//     accounts, daily closings) is new, additive Finance-only data.
//
// Every /api/finance/** call requires the admin PIN. It is kept ONLY in this
// component's React state for the lifetime of the Finance view (re-entering
// Finance after navigating away, or reloading the page, requires the PIN
// again) — it is never written to localStorage or any other persistent
// storage, matching the "don't weaken existing security" requirement while
// avoiding a PIN prompt on every single click.

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  verifyFinancePin,
  listFinanceAccounts, createFinanceAccount, updateFinanceAccount,
  listFinanceCategories, createFinanceCategory,
  listFinanceTransactions, createFinanceTransaction, updateFinanceTransaction, voidFinanceTransaction,
  getSystemSales, getFinanceSummary,
  listVendors, createVendor, updateVendor,
  listVendorPurchases, createVendorPurchase, voidVendorPurchase,
  listVendorPayments, createVendorPayment, voidVendorPayment,
  listSalaryConfig, setSalaryConfig, listSalaryPayments, createSalaryPayment, voidSalaryPayment,
  getDailyClosing, listDailyClosings, closeDay, reopenDay,
  getFinanceAuditLog,
  listStaff,
  listExpenses, computeExpenseStats,
  type FinanceAccount, type FinanceCategory, type FinanceTransaction, type SystemSalesResponse, type FinanceSummary,
  type Vendor, type VendorPurchase, type VendorPayment, type SalaryConfig, type SalaryPayment, type DailyClosing, type FinanceAuditEntry,
  type StaffMember, type Expense, type ExpenseStats,
} from '@/lib/api';
import { todayIST, fmtDateLong, fmtDate, fmtTime, fmtDateTime } from '@/lib/date';

// ─── Shared style tokens (mirrors app/admin/page.tsx) ─────────────────────────
const ORANGE = '#E65C00';
const INK    = '#1A0800';
const card   = (color = ORANGE): React.CSSProperties => ({ background: 'white', borderRadius: 12, padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '1.25rem', borderLeft: `4px solid ${color}` });
const tabB   = (active: boolean): React.CSSProperties => ({ padding: '0.42rem 1rem', border: `2px solid ${active ? ORANGE : '#ddd'}`, borderRadius: 20, background: active ? ORANGE : 'white', color: active ? 'white' : '#666', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Poppins,sans-serif' });
const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '0.6rem 0.75rem', border: '2px solid #e5e7eb', borderRadius: 8, fontFamily: 'Poppins,sans-serif', fontSize: '0.88rem', outline: 'none' };
const btn    = (bg = ORANGE, c = 'white'): React.CSSProperties => ({ background: bg, color: c, border: 'none', padding: '0.55rem 1.1rem', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontSize: '0.84rem' });
const h3     : React.CSSProperties = { fontFamily: "'Playfair Display',serif", fontSize: '0.98rem', fontWeight: 700, marginBottom: '0.75rem', color: INK };
const label  : React.CSSProperties = { fontSize: '0.72rem', fontWeight: 700, color: '#555', display: 'block', marginBottom: '0.25rem' };
const money  = (n: number) => `₹${(isFinite(n) ? n : 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

function istMidnightISO(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00+05:30`).toISOString();
}
function periodRange(period: 'today'|'week'|'month'|'custom', from?: string, to?: string): { from: string; to: string } {
  const nowISO = new Date().toISOString();
  if (period === 'today') return { from: istMidnightISO(todayIST()), to: nowISO };
  if (period === 'week')  { const d = new Date(); d.setDate(d.getDate() - 7);  return { from: d.toISOString(), to: nowISO }; }
  if (period === 'month') { const d = new Date(); d.setDate(d.getDate() - 30); return { from: d.toISOString(), to: nowISO }; }
  const f = from || todayIST();
  const t = to   || todayIST();
  return { from: istMidnightISO(f), to: new Date(new Date(istMidnightISO(t)).getTime() + 24 * 3600 * 1000).toISOString() };
}
function downloadCsv(filename: string, header: string[], rows: (string | number)[][]) {
  const csv = [header, ...rows].map(r => r.map(v => JSON.stringify(v ?? '')).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ════════════════════════════════════════════════════════════════════════════
// Entry point — PIN gate, then the real app
// ════════════════════════════════════════════════════════════════════════════

export default function AdminFinance({ adminName }: { adminName: string }) {
  const [pin, setPin]           = useState<string | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [unlocking, setUnlocking] = useState(false);

  async function unlock() {
    if (!pinInput) return;
    setUnlocking(true); setPinError('');
    try {
      const ok = await verifyFinancePin(pinInput);
      if (ok) setPin(pinInput);
      else setPinError('❌ Incorrect admin PIN');
    } catch {
      setPinError('❌ Could not verify PIN — check your connection');
    } finally {
      setUnlocking(false);
    }
  }

  if (!pin) {
    return (
      <div style={{ maxWidth: 420, margin: '3rem auto', textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>💰</div>
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.3rem', color: INK, marginBottom: '0.4rem' }}>Finance & Cash Flow</h2>
        <p style={{ fontSize: '0.82rem', color: '#888', marginBottom: '1.25rem' }}>
          Owner-level financial data. Re-enter your admin PIN to continue — this keeps Finance protected
          even if someone else is using this device while logged in as Admin.
        </p>
        <input
          type="password" inputMode="numeric" placeholder="Admin PIN" value={pinInput}
          onChange={e => { setPinInput(e.target.value); setPinError(''); }}
          onKeyDown={e => e.key === 'Enter' && unlock()}
          style={{ ...inp, textAlign: 'center', fontSize: '1.1rem', letterSpacing: '0.3em', marginBottom: '0.75rem' }}
          autoFocus
        />
        {pinError && <div style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.75rem' }}>{pinError}</div>}
        <button onClick={unlock} disabled={unlocking || !pinInput} style={{ ...btn(), width: '100%', opacity: unlocking || !pinInput ? 0.6 : 1 }}>
          {unlocking ? '⏳ Verifying…' : '🔓 Unlock Finance'}
        </button>
      </div>
    );
  }

  return <FinanceApp pin={pin} adminName={adminName} onLock={() => { setPin(null); setPinInput(''); }} />;
}

// ════════════════════════════════════════════════════════════════════════════
// Main Finance app (unlocked)
// ════════════════════════════════════════════════════════════════════════════

type FinTab = 'overview' | 'daily' | 'transactions' | 'expenses' | 'vendors' | 'salaries' | 'accounts' | 'reports';

function FinanceApp({ pin, adminName, onLock }: { pin: string; adminName: string; onLock: () => void }) {
  const [tab, setTab] = useState<FinTab>('overview');
  const [period, setPeriod] = useState<'today'|'week'|'month'|'custom'>('today');
  const [customFrom, setCustomFrom] = useState(todayIST());
  const [customTo, setCustomTo]     = useState(todayIST());
  const range = useMemo(() => periodRange(period, customFrom, customTo), [period, customFrom, customTo]);

  // ── Shared reference data, loaded once ──────────────────────────────────
  const [accounts,   setAccounts]   = useState<FinanceAccount[]>([]);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [staff,      setStaff]      = useState<StaffMember[]>([]);
  const [refDataError, setRefDataError] = useState('');

  const loadRefData = useCallback(async () => {
    try {
      const [acc, cats, stf] = await Promise.all([
        listFinanceAccounts(pin), listFinanceCategories(pin), listStaff(),
      ]);
      setAccounts(acc); setCategories(cats); setStaff(stf);
      setRefDataError('');
    } catch (e) {
      setRefDataError(e instanceof Error ? e.message : 'Failed to load Finance reference data');
    }
  }, [pin]);

  useEffect(() => { void loadRefData(); }, [loadRefData]);

  // ── "+ Add Transaction" modal — shared across tabs ──────────────────────
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [txRefreshKey, setTxRefreshKey] = useState(0);
  const bumpRefresh = () => setTxRefreshKey(k => k + 1);

  // ── Audit trail modal ────────────────────────────────────────────────────
  const [auditOpen, setAuditOpen] = useState(false);

  const accountName = (id: string) => accounts.find(a => a.id === id)?.name ?? id;
  const categoryName = (id?: string) => id ? (categories.find(c => c.id === id)?.name ?? id) : '—';

  return (
    <div>
      {/* ── Header row: period selector + actions ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {(['today', 'week', 'month', 'custom'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={tabB(period === p)}>
              {p === 'today' ? '📅 Today' : p === 'week' ? '📆 This Week' : p === 'month' ? '🗓️ This Month' : '🎯 Custom'}
            </button>
          ))}
          {period === 'custom' && (
            <>
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={{ ...inp, width: 'auto', padding: '0.35rem 0.5rem', fontSize: '0.78rem' }} />
              <span style={{ color: '#999', fontSize: '0.8rem' }}>to</span>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} style={{ ...inp, width: 'auto', padding: '0.35rem 0.5rem', fontSize: '0.78rem' }} />
            </>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setAuditOpen(true)} style={{ ...btn('#374151'), fontSize: '0.76rem' }}>🕵️ Audit Trail</button>
          <button onClick={() => setTxModalOpen(true)} style={{ ...btn(), fontSize: '0.76rem' }}>＋ Add Transaction</button>
          <button onClick={onLock} style={{ ...btn('#6b7280'), fontSize: '0.76rem' }}>🔒 Lock</button>
        </div>
      </div>

      {refDataError && (
        <div style={{ padding: '0.6rem 0.85rem', borderRadius: 8, background: '#fef2f2', color: '#ef4444', fontWeight: 700, fontSize: '0.82rem', marginBottom: '1rem' }}>
          {refDataError}
        </div>
      )}

      {/* ── Sub-nav ── */}
      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '1.25rem', background: '#faf8f3', padding: '0.4rem', borderRadius: 10, border: '1px solid #f0e4d7' }}>
        {([
          ['overview', '📋 Overview'], ['daily', '🌙 Daily Closing'], ['transactions', '📒 Transactions'],
          ['expenses', '💸 Expenses'], ['vendors', '🏭 Vendors'], ['salaries', '👥 Salaries'],
          ['accounts', '🏦 Accounts'], ['reports', '📈 Reports'],
        ] as [FinTab, string][]).map(([id, lbl]) => (
          <button key={id} onClick={() => setTab(id)} style={{ padding: '0.4rem 0.85rem', border: 'none', borderRadius: 8, background: tab === id ? ORANGE : 'transparent', color: tab === id ? 'white' : '#666', fontWeight: 700, cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontSize: '0.78rem' }}>
            {lbl}
          </button>
        ))}
      </div>

      {tab === 'overview'     && <OverviewTab pin={pin} range={range} accounts={accounts} onAddTransaction={() => setTxModalOpen(true)} refreshKey={txRefreshKey} />}
      {tab === 'daily'        && <DailyTab pin={pin} adminName={adminName} />}
      {tab === 'transactions' && <TransactionsTab pin={pin} adminName={adminName} accounts={accounts} categories={categories} range={range} accountName={accountName} categoryName={categoryName} refreshKey={txRefreshKey} onChanged={bumpRefresh} />}
      {tab === 'expenses'     && <ExpensesTab range={range} />}
      {tab === 'vendors'      && <VendorsTab pin={pin} adminName={adminName} accounts={accounts} accountName={accountName} onLedgerChanged={bumpRefresh} />}
      {tab === 'salaries'     && <SalariesTab pin={pin} adminName={adminName} staff={staff} accounts={accounts} accountName={accountName} onLedgerChanged={bumpRefresh} />}
      {tab === 'accounts'     && <AccountsTab pin={pin} accounts={accounts} onChanged={loadRefData} />}
      {tab === 'reports'      && <ReportsTab pin={pin} range={range} accountName={accountName} categoryName={categoryName} />}

      {txModalOpen && (
        <AddTransactionModal
          pin={pin} adminName={adminName} accounts={accounts} categories={categories}
          onClose={() => setTxModalOpen(false)}
          onSaved={() => { setTxModalOpen(false); bumpRefresh(); }}
        />
      )}
      {auditOpen && <AuditModal pin={pin} onClose={() => setAuditOpen(false)} />}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Overview tab
// ════════════════════════════════════════════════════════════════════════════

function OverviewTab({ pin, range, accounts, onAddTransaction, refreshKey }: {
  pin: string; range: { from: string; to: string }; accounts: FinanceAccount[];
  onAddTransaction: () => void; refreshKey: number;
}) {
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [sales, setSales]     = useState<SystemSalesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [drill, setDrill]     = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [s, sy] = await Promise.all([
        getFinanceSummary(pin, range.from, range.to),
        getSystemSales(pin, range.from, range.to),
      ]);
      setSummary(s); setSales(sy);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load Finance overview');
    } finally {
      setLoading(false);
    }
  }, [pin, range.from, range.to]);

  useEffect(() => { void refresh(); }, [refresh, refreshKey]);

  if (loading && !summary) return <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>Loading…</div>;
  if (error) return <div style={{ padding: '1rem', color: '#ef4444', fontWeight: 700 }}>{error}</div>;
  if (!summary) return null;

  const kpis = [
    { label: 'System Sales (Net)', val: money(summary.systemSales.net), sub: `${summary.systemSales.count} completed orders/tabs`, color: '#16a34a' },
    { label: 'Manager Expenses',   val: money(summary.managerExpenses.total), sub: `${summary.managerExpenses.count} entries`, color: '#ef4444' },
    { label: 'Vendor Payments',    val: money(summary.ledger.vendorPaid), sub: 'Paid to suppliers', color: '#8b5cf6' },
    { label: 'Salary Payments',    val: money(summary.ledger.salaryPaid), sub: 'Paid to staff', color: '#7c3aed' },
    { label: 'Other Ledger Income',val: money(summary.ledger.income), sub: 'Manual income entries', color: '#0ea5e9' },
    { label: 'Net Cash Flow',      val: `${summary.netCashFlow >= 0 ? '+' : '−'}${money(Math.abs(summary.netCashFlow))}`, sub: 'Sales + Income − Expenses', color: summary.netCashFlow >= 0 ? '#16a34a' : '#ef4444' },
  ];

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
        {kpis.map(k => (
          <div key={k.label} style={{ background: 'white', border: '1px solid #f0e4d7', borderRadius: 10, padding: '0.85rem', borderLeft: `4px solid ${k.color}` }}>
            <div style={{ fontSize: '1.15rem', fontWeight: 900, color: k.color }}>{k.val}</div>
            <div style={{ fontSize: '0.72rem', color: '#666', fontWeight: 700, marginTop: '0.15rem' }}>{k.label}</div>
            {k.sub && <div style={{ fontSize: '0.65rem', color: '#aaa', marginTop: '0.1rem' }}>{k.sub}</div>}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button onClick={onAddTransaction} style={btn()}>＋ Add Transaction</button>
        <button onClick={() => setDrill(d => !d)} style={btn('#374151')}>{drill ? '🔽 Hide' : '🔍'} Drill Into System Sales</button>
      </div>

      {sales && (
        <div style={card('#16a34a')}>
          <h3 style={h3}>💳 System Sales — By Order Type & Account</h3>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#888', marginBottom: '0.4rem', textTransform: 'uppercase' }}>By Order Type</div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {Object.entries(sales.byType).map(([type, v]) => (
                  <div key={type} style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '0.5rem 0.75rem', minWidth: 110 }}>
                    <div style={{ fontWeight: 800, color: '#16a34a' }}>{money(v.net)}</div>
                    <div style={{ fontSize: '0.68rem', color: '#888', textTransform: 'capitalize' }}>{type} ({v.count})</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#888', marginBottom: '0.4rem', textTransform: 'uppercase' }}>By Account (auto-matched from payment method)</div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {sales.byAccount.map(a => (
                  <div key={a.accountId} style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '0.5rem 0.75rem', minWidth: 110 }}>
                    <div style={{ fontWeight: 800, color: '#2563eb' }}>{money(a.net)}</div>
                    <div style={{ fontSize: '0.68rem', color: '#888' }}>{a.name}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {drill && (
            <div style={{ marginTop: '1rem', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                <thead><tr style={{ background: '#f9fafb' }}>
                  {['Date', 'Source', 'Type', 'Customer', 'Gross', 'Discount', 'Net', 'Payment'].map(h => (
                    <th key={h} style={{ padding: '0.4rem 0.6rem', textAlign: 'left', fontSize: '0.68rem', color: '#888', fontWeight: 700 }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {sales.rows.slice(0, 100).map(r => (
                    <tr key={r.sourceId} style={{ borderTop: '1px solid #f5f0e8' }}>
                      <td style={{ padding: '0.4rem 0.6rem' }}>{fmtDateTime(r.occurredAt)}</td>
                      <td style={{ padding: '0.4rem 0.6rem' }}>{r.sourceType === 'dine-in-tab' ? 'Tab' : 'Order'}</td>
                      <td style={{ padding: '0.4rem 0.6rem', textTransform: 'capitalize' }}>{r.orderType}</td>
                      <td style={{ padding: '0.4rem 0.6rem' }}>{r.customerName || '—'}</td>
                      <td style={{ padding: '0.4rem 0.6rem' }}>{money(r.gross)}</td>
                      <td style={{ padding: '0.4rem 0.6rem', color: r.discount > 0 ? '#ef4444' : '#ccc' }}>{r.discount > 0 ? `-${money(r.discount)}` : '—'}</td>
                      <td style={{ padding: '0.4rem 0.6rem', fontWeight: 700, color: '#16a34a' }}>{money(r.net)}</td>
                      <td style={{ padding: '0.4rem 0.6rem' }}>{r.paymentMethod || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {sales.truncated && <div style={{ fontSize: '0.72rem', color: '#999', marginTop: '0.5rem' }}>Showing first 500 of {sales.summary.count} — narrow the period for the full list.</div>}
            </div>
          )}
        </div>
      )}

      {summary.managerExpenses.byCategory.length > 0 && (
        <div style={card('#ef4444')}>
          <h3 style={h3}>💸 Manager Expenses — By Category</h3>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {summary.managerExpenses.byCategory.map(c => (
              <div key={c.category} style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '0.5rem 0.75rem' }}>
                <span style={{ fontWeight: 800, color: '#ef4444' }}>{money(c.total)}</span>
                <span style={{ fontSize: '0.7rem', color: '#888', marginLeft: '0.4rem' }}>{c.category}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Salaries tab — reuses the existing `staff` table (via listStaff()); adds a
// rate history (staff_salary_config) and payment log (salary_payments) on top.
// ════════════════════════════════════════════════════════════════════════════

function SalariesTab({ pin, adminName, staff, accounts, accountName, onLedgerChanged }: {
  pin: string; adminName: string; staff: StaffMember[]; accounts: FinanceAccount[]; accountName: (id: string) => string; onLedgerChanged: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [configs, setConfigs] = useState<SalaryConfig[]>([]);
  const [payments, setPayments] = useState<SalaryPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const [rateType, setRateType] = useState<'monthly'|'daily'|'hourly'>('monthly');
  const [rateAmount, setRateAmount] = useState('');

  const [payAmount, setPayAmount] = useState('');
  const [payAccount, setPayAccount] = useState('');
  const [payPeriod, setPayPeriod] = useState('');
  const [payNote, setPayNote] = useState('');

  const loadStaffFinance = useCallback(async (staffId: string) => {
    setLoading(true);
    try {
      const [c, p] = await Promise.all([listSalaryConfig(pin, staffId), listSalaryPayments(pin, staffId)]);
      setConfigs(c); setPayments(p);
      const active = c.find(x => x.isActive);
      if (active) { setRateType(active.salaryType); setRateAmount(String(active.amount)); }
    } finally {
      setLoading(false);
    }
  }, [pin]);

  useEffect(() => {
    if (selected) void loadStaffFinance(selected);
  }, [selected, loadStaffFinance]);

  async function saveRate() {
    if (!selected || !rateAmount) return;
    const amt = parseFloat(rateAmount);
    if (!isFinite(amt) || amt < 0) { setMsg('❌ Enter a valid amount'); return; }
    setBusy(true); setMsg('');
    try {
      await setSalaryConfig(pin, { staffId: selected, salaryType: rateType, amount: amt, by: adminName });
      setMsg('✅ Rate saved');
      void loadStaffFinance(selected);
    } catch (e) { setMsg(`❌ ${e instanceof Error ? e.message : 'Failed'}`); } finally { setBusy(false); }
  }

  async function payNow() {
    if (!selected || !payAmount || !payAccount || !payPeriod) { setMsg('❌ Fill in period, amount and account'); return; }
    const amt = parseFloat(payAmount);
    if (!isFinite(amt) || amt <= 0) { setMsg('❌ Enter a valid amount'); return; }
    setBusy(true); setMsg('');
    try {
      const active = configs.find(c => c.isActive);
      await createSalaryPayment(pin, { staffId: selected, salaryConfigId: active?.id, accountId: payAccount, periodLabel: payPeriod, amount: amt, note: payNote || undefined, by: adminName });
      setMsg('✅ Salary payment recorded');
      setPayAmount(''); setPayPeriod(''); setPayNote('');
      void loadStaffFinance(selected); onLedgerChanged();
    } catch (e) { setMsg(`❌ ${e instanceof Error ? e.message : 'Failed'}`); } finally { setBusy(false); }
  }

  async function voidPay(id: string) {
    if (!confirm('Void this salary payment?')) return;
    try {
      await voidSalaryPayment(pin, id, adminName, 'Voided by admin');
      if (selected) void loadStaffFinance(selected);
      onLedgerChanged();
    } catch (e) { alert(e instanceof Error ? e.message : 'Failed'); }
  }

  return (
    <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
      <div style={{ width: 240, flexShrink: 0 }}>
        <div style={card()}>
          <h3 style={{ ...h3, marginBottom: '0.6rem' }}>👥 Staff</h3>
          {staff.length === 0 && <div style={{ color: '#999', fontSize: '0.78rem' }}>No staff members found.</div>}
          {staff.map(s => (
            <button key={s.id} onClick={() => setSelected(s.id)} style={{ display: 'flex', justifyContent: 'space-between', width: '100%', textAlign: 'left', padding: '0.4rem 0.5rem', borderRadius: 6, border: 'none', background: selected === s.id ? '#fff5eb' : 'transparent', color: selected === s.id ? ORANGE : '#333', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' }}>
              <span>{s.name}</span>
              <span style={{ fontSize: '0.65rem', color: '#999', textTransform: 'capitalize' }}>{s.role}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 300 }}>
        {!selected ? (
          <div style={{ ...card(), textAlign: 'center', color: '#999' }}>Select a staff member to manage salary.</div>
        ) : loading ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: '#999' }}>Loading…</div>
        ) : (
          <>
            <div style={card('#7c3aed')}>
              <h3 style={h3}>💼 Salary Rate — {staff.find(s => s.id === selected)?.name}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr auto', gap: '0.6rem', alignItems: 'flex-end' }}>
                <div>
                  <label style={label}>Type</label>
                  <select value={rateType} onChange={e => setRateType(e.target.value as 'monthly'|'daily'|'hourly')} style={inp}>
                    <option value="monthly">Monthly</option>
                    <option value="daily">Daily</option>
                    <option value="hourly">Hourly</option>
                  </select>
                </div>
                <div>
                  <label style={label}>Amount (₹)</label>
                  <input type="number" min="0" step="0.01" value={rateAmount} onChange={e => setRateAmount(e.target.value)} style={inp} />
                </div>
                <button onClick={saveRate} disabled={busy} style={{ ...btn(), height: 38 }}>Save Rate</button>
              </div>
              {configs.length > 0 && (
                <div style={{ marginTop: '0.75rem', fontSize: '0.72rem', color: '#888' }}>
                  Rate history: {configs.map(c => `${c.isActive ? '● ' : ''}${money(c.amount)}/${c.salaryType} from ${fmtDate(c.effectiveFrom)}`).join('  ·  ')}
                </div>
              )}
            </div>

            <div style={card('#16a34a')}>
              <h3 style={h3}>💵 Pay Salary</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 1fr', gap: '0.6rem', marginBottom: '0.6rem' }}>
                <div>
                  <label style={label}>Period (e.g. &quot;August 2026&quot;)</label>
                  <input value={payPeriod} onChange={e => setPayPeriod(e.target.value)} style={inp} />
                </div>
                <div>
                  <label style={label}>Amount (₹)</label>
                  <input type="number" min="0.01" step="0.01" value={payAmount} onChange={e => setPayAmount(e.target.value)} style={inp} />
                </div>
                <div>
                  <label style={label}>Paid From</label>
                  <select value={payAccount} onChange={e => setPayAccount(e.target.value)} style={inp}>
                    <option value="">Select…</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              </div>
              <input value={payNote} onChange={e => setPayNote(e.target.value)} placeholder="Note (optional)" style={{ ...inp, marginBottom: '0.6rem' }} />
              {msg && <div style={{ fontSize: '0.78rem', fontWeight: 700, color: msg.startsWith('✅') ? '#16a34a' : '#ef4444', marginBottom: '0.5rem' }}>{msg}</div>}
              <button onClick={payNow} disabled={busy} style={{ ...btn(), opacity: busy ? 0.6 : 1 }}>{busy ? 'Saving…' : '💵 Record Salary Payment'}</button>
              <div style={{ fontSize: '0.7rem', color: '#999', marginTop: '0.4rem' }}>
                Posts one linked expense entry automatically — no need to also log this in Transactions.
              </div>
            </div>

            <div style={card('#6b7280')}>
              <h3 style={h3}>📜 Payment History</h3>
              {payments.length === 0 ? (
                <div style={{ color: '#999', fontSize: '0.8rem' }}>No payments recorded yet.</div>
              ) : payments.map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderTop: '1px solid #f0f0f0', fontSize: '0.8rem' }}>
                  <span>{p.periodLabel} · {fmtDate(p.paidAt)} · {accountName(p.accountId)}{p.note ? ` · ${p.note}` : ''}</span>
                  <span style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                    <b>{money(p.amount)}</b>
                    <button onClick={() => voidPay(p.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.72rem' }}>void</button>
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Accounts tab — cash/bank "buckets" and their live running balance
// ════════════════════════════════════════════════════════════════════════════

function AccountsTab({ pin, accounts, onChanged }: { pin: string; accounts: FinanceAccount[]; onChanged: () => void }) {
  const [balances, setBalances] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<'cash'|'bank'|'digital'|'other'>('cash');
  const [opening, setOpening] = useState('0');
  const [keywords, setKeywords] = useState('');
  const [busy, setBusy] = useState(false);

  const computeBalances = useCallback(async () => {
    setLoading(true); setError('');
    try {
      // "All time" window — earliest plausible order date through now.
      const from = new Date('2020-01-01').toISOString();
      const to   = new Date().toISOString();
      const [sales, txns] = await Promise.all([
        getSystemSales(pin, from, to),
        listFinanceTransactions(pin, { from, to, limit: 2000 }),
      ]);
      const bal: Record<string, number> = {};
      accounts.forEach(a => { bal[a.id] = a.openingBalance; });
      sales.byAccount.forEach(a => { if (bal[a.accountId] !== undefined) bal[a.accountId] += a.net; });
      txns.forEach(t => {
        if (t.type === 'income' && bal[t.accountId] !== undefined) bal[t.accountId] += t.amount;
        if (t.type === 'expense' && bal[t.accountId] !== undefined) bal[t.accountId] -= t.amount;
        if (t.type === 'adjustment' && bal[t.accountId] !== undefined) bal[t.accountId] += t.amount;
        if (t.type === 'transfer') {
          if (bal[t.accountId] !== undefined) bal[t.accountId] -= t.amount;
          if (t.transferToAccountId && bal[t.transferToAccountId] !== undefined) bal[t.transferToAccountId] += t.amount;
        }
      });
      Object.keys(bal).forEach(k => { bal[k] = Math.round(bal[k] * 100) / 100; });
      setBalances(bal);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to compute balances');
    } finally {
      setLoading(false);
    }
  }, [pin, accounts]);

  useEffect(() => { if (accounts.length) void computeBalances(); else setLoading(false); }, [accounts, computeBalances]);

  async function addAccount() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await createFinanceAccount(pin, {
        name: name.trim(), type, openingBalance: parseFloat(opening) || 0,
        paymentMethodKeywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
      });
      setName(''); setOpening('0'); setKeywords(''); setShowAdd(false);
      onChanged();
    } catch (e) { alert(e instanceof Error ? e.message : 'Failed'); } finally { setBusy(false); }
  }

  async function toggleActive(a: FinanceAccount) {
    if (a.isActive && !confirm(`Deactivate "${a.name}"? Its history is kept — it just won't accept new entries.`)) return;
    try {
      await updateFinanceAccount(pin, a.id, { isActive: !a.isActive });
      onChanged();
    } catch (e) { alert(e instanceof Error ? e.message : 'Failed'); }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
        <button onClick={() => setShowAdd(v => !v)} style={{ ...btn(), fontSize: '0.78rem' }}>＋ Add Account</button>
      </div>

      {showAdd && (
        <div style={card('#0ea5e9')}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 130px', gap: '0.6rem', marginBottom: '0.6rem' }}>
            <div><label style={label}>Name</label><input value={name} onChange={e => setName(e.target.value)} style={inp} /></div>
            <div><label style={label}>Type</label>
              <select value={type} onChange={e => setType(e.target.value as typeof type)} style={inp}>
                <option value="cash">Cash</option><option value="bank">Bank</option>
                <option value="digital">Digital</option><option value="other">Other</option>
              </select>
            </div>
            <div><label style={label}>Opening Balance</label><input type="number" value={opening} onChange={e => setOpening(e.target.value)} style={inp} /></div>
          </div>
          <label style={label}>Payment-method keywords (comma-separated — matches order/tab payment methods to auto-attribute sales here, e.g. &quot;upi, gpay, phonepe&quot;)</label>
          <input value={keywords} onChange={e => setKeywords(e.target.value)} style={{ ...inp, marginBottom: '0.6rem' }} />
          <button onClick={addAccount} disabled={busy} style={btn()}>Save Account</button>
        </div>
      )}

      {loading && <div style={{ padding: '1.5rem', textAlign: 'center', color: '#999' }}>Computing balances…</div>}
      {error && <div style={{ color: '#ef4444', fontWeight: 700 }}>{error}</div>}

      {!loading && !error && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: '0.85rem' }}>
          {accounts.map(a => (
            <div key={a.id} style={{ ...card(a.isActive ? ORANGE : '#9ca3af'), opacity: a.isActive ? 1 : 0.6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 800, color: INK }}>{a.name}</div>
                  <div style={{ fontSize: '0.68rem', color: '#999', textTransform: 'capitalize' }}>{a.type}{a.isDefault ? ' · default' : ''}</div>
                </div>
                <button onClick={() => toggleActive(a)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }} title={a.isActive ? 'Deactivate' : 'Reactivate'}>
                  {a.isActive ? '⏸' : '▶️'}
                </button>
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: (balances?.[a.id] ?? 0) >= 0 ? '#16a34a' : '#ef4444', marginTop: '0.5rem' }}>
                {money(balances?.[a.id] ?? a.openingBalance)}
              </div>
              <div style={{ fontSize: '0.68rem', color: '#999' }}>Opening: {money(a.openingBalance)}</div>
              {a.paymentMethodKeywords.length > 0 && (
                <div style={{ fontSize: '0.65rem', color: '#aaa', marginTop: '0.35rem' }}>Matches: {a.paymentMethodKeywords.join(', ')}</div>
              )}
            </div>
          ))}
        </div>
      )}
      <div style={{ fontSize: '0.7rem', color: '#999', marginTop: '1rem' }}>
        Balances = opening balance + system sales auto-matched by payment method + manual ledger entries against
        this account. This is a computed estimate for cash-flow visibility, not a bank reconciliation — use the
        Transactions tab&apos;s &quot;adjustment&quot; type to correct an account after a physical cash count.
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Reports tab — CSV exports for the selected period
// ════════════════════════════════════════════════════════════════════════════

function ReportsTab({ pin, range, accountName, categoryName }: {
  pin: string; range: { from: string; to: string }; accountName: (id: string) => string; categoryName: (id?: string) => string;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  async function exportSystemSales() {
    setBusy('sales');
    try {
      const data = await getSystemSales(pin, range.from, range.to);
      downloadCsv(`system-sales-${todayIST()}.csv`,
        ['Date', 'Source', 'Order Type', 'Customer', 'Gross', 'Discount', 'Net', 'Payment Method'],
        data.rows.map(r => [fmtDateTime(r.occurredAt), r.sourceType, r.orderType || '', r.customerName || '', r.gross, r.discount, r.net, r.paymentMethod || '']));
    } catch (e) { alert(e instanceof Error ? e.message : 'Export failed'); } finally { setBusy(null); }
  }

  async function exportTransactions() {
    setBusy('tx');
    try {
      const rows = await listFinanceTransactions(pin, { from: range.from, to: range.to, limit: 2000, includeVoided: true });
      downloadCsv(`finance-transactions-full-${todayIST()}.csv`,
        ['Date', 'Type', 'Account', 'Category', 'Amount', 'Description', 'Source', 'Created By', 'Voided'],
        rows.map(t => [fmtDateTime(t.occurredAt), t.type, accountName(t.accountId), categoryName(t.categoryId), t.amount, t.description, t.source, t.createdBy || '', t.isVoided ? 'Yes' : 'No']));
    } catch (e) { alert(e instanceof Error ? e.message : 'Export failed'); } finally { setBusy(null); }
  }

  async function exportSummary() {
    setBusy('summary');
    try {
      const s = await getFinanceSummary(pin, range.from, range.to);
      downloadCsv(`finance-summary-${todayIST()}.csv`,
        ['Metric', 'Value'],
        [
          ['System Sales — Gross', s.systemSales.gross], ['System Sales — Discount', s.systemSales.discount], ['System Sales — Net', s.systemSales.net],
          ['Manager Expenses', s.managerExpenses.total], ['Ledger Income', s.ledger.income], ['Ledger Expense', s.ledger.expense],
          ['Vendor Payments', s.ledger.vendorPaid], ['Salary Payments', s.ledger.salaryPaid], ['Net Cash Flow', s.netCashFlow],
        ]);
    } catch (e) { alert(e instanceof Error ? e.message : 'Export failed'); } finally { setBusy(null); }
  }

  return (
    <div style={card()}>
      <h3 style={h3}>📈 Reports — Export for Selected Period</h3>
      <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '1rem' }}>
        Every figure Finance shows is traceable to source rows — these exports give you the same underlying data
        as CSV for the period currently selected above.
      </p>
      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
        <button onClick={exportSummary} disabled={!!busy} style={{ ...btn(), opacity: busy ? 0.6 : 1 }}>{busy === 'summary' ? '⏳' : '📁'} Summary CSV</button>
        <button onClick={exportSystemSales} disabled={!!busy} style={{ ...btn('#16a34a'), opacity: busy ? 0.6 : 1 }}>{busy === 'sales' ? '⏳' : '📁'} System Sales CSV</button>
        <button onClick={exportTransactions} disabled={!!busy} style={{ ...btn('#8b5cf6'), opacity: busy ? 0.6 : 1 }}>{busy === 'tx' ? '⏳' : '📁'} All Transactions CSV</button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Daily Closing tab
// ════════════════════════════════════════════════════════════════════════════

function DailyTab({ pin, adminName }: { pin: string; adminName: string }) {
  const [date, setDate] = useState(todayIST());
  const [closing, setClosing] = useState<DailyClosing | null | undefined>(undefined); // undefined = loading
  const [recent, setRecent] = useState<DailyClosing[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [notes, setNotes] = useState('');

  const refresh = useCallback(async () => {
    setClosing(undefined);
    try {
      const [c, list] = await Promise.all([getDailyClosing(pin, date), listDailyClosings(pin, 14)]);
      setClosing(c); setRecent(list);
    } catch (e) {
      setMsg(`❌ ${e instanceof Error ? e.message : 'Failed to load'}`);
      setClosing(null);
    }
  }, [pin, date]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function doClose() {
    setBusy(true); setMsg('');
    try {
      const res = await closeDay(pin, date, adminName, notes || undefined);
      setMsg(res.reClosed ? '✅ Day re-closed — snapshot updated' : '✅ Day closed');
      setNotes('');
      void refresh();
    } catch (e) {
      setMsg(`❌ ${e instanceof Error ? e.message : 'Failed to close day'}`);
    } finally {
      setBusy(false);
    }
  }

  async function doReopen() {
    if (!confirm(`Reopen ${fmtDateLong(date)}? This only clears the "closed" badge — nothing is deleted, and you can re-close later.`)) return;
    setBusy(true); setMsg('');
    try {
      await reopenDay(pin, date, adminName, 'Reopened by admin');
      setMsg('✅ Day reopened');
      void refresh();
    } catch (e) {
      setMsg(`❌ ${e instanceof Error ? e.message : 'Failed to reopen'}`);
    } finally {
      setBusy(false);
    }
  }

  const modified = closing && closing.live && closing.snapshot &&
    JSON.stringify(closing.live) !== JSON.stringify(closing.snapshot);

  return (
    <div>
      <div style={card()}>
        <h3 style={h3}>🌙 End-of-Day Closing</h3>
        <p style={{ fontSize: '0.78rem', color: '#666', marginBottom: '1rem' }}>
          Closing a day freezes a snapshot of that day&apos;s totals for reference. It does <b>not</b> lock any
          record — you can still edit historical entries afterwards. If the live totals for a closed day change
          (an order was edited, an expense added, etc.), this screen will flag it below so you can re-close with
          the corrected numbers whenever you&apos;re ready.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          <div>
            <label style={label}>Business Date (IST)</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...inp, width: 'auto' }} />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={label}>Closing Notes (optional)</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Cash counted and matched" style={inp} />
          </div>
        </div>

        {closing === undefined && <div style={{ color: '#999', padding: '1rem' }}>Loading…</div>}

        {closing === null && (
          <div style={{ padding: '0.75rem', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontSize: '0.82rem', color: '#92400e', marginBottom: '0.75rem' }}>
            No closing recorded yet for {fmtDateLong(date)}.
          </div>
        )}

        {closing && (
          <div style={{ padding: '0.85rem', background: closing.isClosed ? '#f0fdf4' : '#fef2f2', border: `1px solid ${closing.isClosed ? '#bbf7d0' : '#fecaca'}`, borderRadius: 8, marginBottom: '0.75rem' }}>
            <div style={{ fontWeight: 800, color: closing.isClosed ? '#16a34a' : '#ef4444', fontSize: '0.85rem' }}>
              {closing.isClosed ? '✅ Closed' : '🔓 Reopened'} — {fmtDateLong(closing.businessDate)}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#888', marginTop: '0.2rem' }}>
              By {closing.closedBy} at {fmtDateTime(closing.closedAt)}
              {closing.reopenedAt && ` · reopened by ${closing.reopenedBy} at ${fmtDateTime(closing.reopenedAt)}`}
            </div>
            {modified && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: '#b45309', fontWeight: 700 }}>
                ⚠️ Modified after closing — live totals no longer match the closed snapshot. Re-close to update it.
              </div>
            )}
            {closing.snapshot && (
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.6rem', fontSize: '0.78rem' }}>
                <span>Snapshot Net Sales: <b>{money(closing.snapshot.systemSales.net)}</b></span>
                <span>Snapshot Net Cash Flow: <b>{money(closing.snapshot.netCashFlow)}</b></span>
                {closing.live && <span style={{ color: '#2563eb' }}>Live Net Cash Flow: <b>{money(closing.live.netCashFlow)}</b></span>}
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={doClose} disabled={busy} style={{ ...btn(), opacity: busy ? 0.6 : 1 }}>
            {busy ? '⏳ Working…' : closing?.isClosed ? '🔁 Re-Close With Current Totals' : '🔒 Close Day'}
          </button>
          {closing?.isClosed && (
            <button onClick={doReopen} disabled={busy} style={{ ...btn('#6b7280'), opacity: busy ? 0.6 : 1 }}>🔓 Reopen</button>
          )}
        </div>
        {msg && <div style={{ marginTop: '0.6rem', fontSize: '0.8rem', fontWeight: 700, color: msg.startsWith('✅') ? '#16a34a' : '#ef4444' }}>{msg}</div>}
      </div>

      <div style={card('#6b7280')}>
        <h3 style={h3}>📜 Recent Closings</h3>
        {recent.length === 0 ? (
          <div style={{ color: '#999', fontSize: '0.82rem' }}>No closings recorded yet.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead><tr style={{ background: '#f9fafb' }}>
                {['Date', 'Status', 'Net Sales', 'Net Cash Flow', 'Closed By'].map(h => (
                  <th key={h} style={{ padding: '0.4rem 0.6rem', textAlign: 'left', fontSize: '0.68rem', color: '#888', fontWeight: 700 }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {recent.map(c => (
                  <tr key={c.id} style={{ borderTop: '1px solid #f5f0e8', cursor: 'pointer' }} onClick={() => setDate(c.businessDate)}>
                    <td style={{ padding: '0.4rem 0.6rem', fontWeight: 700 }}>{fmtDateLong(c.businessDate)}</td>
                    <td style={{ padding: '0.4rem 0.6rem', color: c.isClosed ? '#16a34a' : '#ef4444' }}>{c.isClosed ? 'Closed' : 'Reopened'}</td>
                    <td style={{ padding: '0.4rem 0.6rem' }}>{money(c.snapshot.systemSales.net)}</td>
                    <td style={{ padding: '0.4rem 0.6rem' }}>{money(c.snapshot.netCashFlow)}</td>
                    <td style={{ padding: '0.4rem 0.6rem' }}>{c.closedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Transactions tab — the manual ledger (income/expense/transfer/adjustment)
// ════════════════════════════════════════════════════════════════════════════

function TransactionsTab({ pin, adminName, accounts, categories, range, accountName, categoryName, refreshKey, onChanged }: {
  pin: string; adminName: string; accounts: FinanceAccount[]; categories: FinanceCategory[];
  range: { from: string; to: string }; accountName: (id: string) => string; categoryName: (id?: string) => string;
  refreshKey: number; onChanged: () => void;
}) {
  const [rows, setRows] = useState<FinanceTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [editing, setEditing] = useState<FinanceTransaction | null>(null);
  const [voidTarget, setVoidTarget] = useState<FinanceTransaction | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await listFinanceTransactions(pin, { from: range.from, to: range.to, limit: 1000 });
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [pin, range.from, range.to]);

  useEffect(() => { void refresh(); }, [refresh, refreshKey]);

  const filtered = typeFilter === 'all' ? rows : rows.filter(r => r.type === typeFilter);
  const totalIn  = filtered.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0);
  const totalOut = filtered.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0);

  async function doVoid() {
    if (!voidTarget) return;
    setBusy(true);
    try {
      await voidFinanceTransaction(pin, voidTarget.id, adminName, voidReason || undefined);
      setVoidTarget(null); setVoidReason('');
      void refresh(); onChanged();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to void transaction');
    } finally {
      setBusy(false);
    }
  }

  function exportCsv() {
    downloadCsv(
      `finance-transactions-${todayIST()}.csv`,
      ['Date', 'Type', 'Account', 'Category', 'Amount', 'Description', 'Source', 'Created By', 'Voided'],
      filtered.map(r => [fmtDateTime(r.occurredAt), r.type, accountName(r.accountId), categoryName(r.categoryId), r.amount, r.description, r.source, r.createdBy || '', r.isVoided ? 'Yes' : 'No']),
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '0.85rem' }}>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {['all', 'income', 'expense', 'transfer', 'adjustment'].map(t => (
            <button key={t} onClick={() => setTypeFilter(t)} style={tabB(typeFilter === t)}>{t === 'all' ? 'All' : t[0].toUpperCase() + t.slice(1)}</button>
          ))}
        </div>
        <button onClick={exportCsv} style={{ ...btn('#16a34a'), fontSize: '0.78rem' }}>📁 Export CSV</button>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
        <div style={{ ...card('#0ea5e9'), flex: 1, marginBottom: 0 }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0ea5e9' }}>{money(totalIn)}</div>
          <div style={{ fontSize: '0.7rem', color: '#888' }}>Total Income (this filter)</div>
        </div>
        <div style={{ ...card('#ef4444'), flex: 1, marginBottom: 0 }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#ef4444' }}>{money(totalOut)}</div>
          <div style={{ fontSize: '0.7rem', color: '#888' }}>Total Expense (this filter)</div>
        </div>
      </div>

      {loading && <div style={{ padding: '1.5rem', textAlign: 'center', color: '#999' }}>Loading…</div>}
      {error && <div style={{ color: '#ef4444', fontWeight: 700, padding: '0.75rem' }}>{error}</div>}

      {!loading && !error && (
        <div style={card()}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#999', padding: '2rem' }}>No transactions in this period.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead><tr style={{ background: '#f9fafb' }}>
                  {['Date', 'Type', 'Account', 'Category', 'Description', 'Amount', 'Source', ''].map(hd => (
                    <th key={hd} style={{ padding: '0.45rem 0.6rem', textAlign: 'left', fontSize: '0.68rem', color: '#888', fontWeight: 700 }}>{hd}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {filtered.map(t => (
                    <tr key={t.id} style={{ borderTop: '1px solid #f5f0e8', opacity: t.isVoided ? 0.5 : 1, background: t.isVoided ? '#fafafa' : 'white' }}>
                      <td style={{ padding: '0.45rem 0.6rem' }}>{fmtDateTime(t.occurredAt)}</td>
                      <td style={{ padding: '0.45rem 0.6rem', textTransform: 'capitalize' }}>{t.type}</td>
                      <td style={{ padding: '0.45rem 0.6rem' }}>{accountName(t.accountId)}{t.transferToAccountId ? ` → ${accountName(t.transferToAccountId)}` : ''}</td>
                      <td style={{ padding: '0.45rem 0.6rem' }}>{categoryName(t.categoryId)}</td>
                      <td style={{ padding: '0.45rem 0.6rem' }}>{t.description || '—'}{t.isVoided && <span style={{ color: '#ef4444', fontWeight: 700 }}> (voided)</span>}</td>
                      <td style={{ padding: '0.45rem 0.6rem', fontWeight: 800, color: t.type === 'income' ? '#16a34a' : t.type === 'expense' ? '#ef4444' : '#374151' }}>{money(t.amount)}</td>
                      <td style={{ padding: '0.45rem 0.6rem', fontSize: '0.68rem', color: '#999' }}>{t.source === 'manual' ? 'Manual' : t.source === 'vendor_payment' ? 'Vendor Pmt' : 'Salary Pmt'}</td>
                      <td style={{ padding: '0.45rem 0.6rem' }}>
                        {!t.isVoided && t.source === 'manual' && (
                          <div style={{ display: 'flex', gap: '0.3rem' }}>
                            <button onClick={() => setEditing(t)} style={{ ...btn('#3b82f6'), padding: '0.25rem 0.5rem', fontSize: '0.68rem' }}>✏️</button>
                            <button onClick={() => setVoidTarget(t)} style={{ ...btn('#ef4444'), padding: '0.25rem 0.5rem', fontSize: '0.68rem' }}>🗑</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {editing && (
        <EditTransactionModal
          pin={pin} adminName={adminName} tx={editing} accounts={accounts} categories={categories}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); void refresh(); onChanged(); }}
        />
      )}

      {voidTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: 'white', borderRadius: 12, padding: '1.5rem', width: 380, maxWidth: '90vw' }}>
            <h3 style={h3}>🗑 Void Transaction</h3>
            <p style={{ fontSize: '0.82rem', color: '#666', marginBottom: '0.75rem' }}>
              This keeps the record (for the audit trail) but excludes it from all totals. This cannot be silently
              undone from here — it stays visible as &quot;voided&quot;.
            </p>
            <div style={{ marginBottom: '0.75rem' }}>{money(voidTarget.amount)} · {voidTarget.description}</div>
            <label style={label}>Reason (optional)</label>
            <input value={voidReason} onChange={e => setVoidReason(e.target.value)} style={{ ...inp, marginBottom: '1rem' }} placeholder="e.g. entered by mistake" />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={doVoid} disabled={busy} style={{ ...btn('#ef4444'), flex: 1, opacity: busy ? 0.6 : 1 }}>{busy ? 'Voiding…' : 'Confirm Void'}</button>
              <button onClick={() => setVoidTarget(null)} style={{ ...btn('#6b7280'), flex: 1 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Expenses tab — read-only view of the EXISTING Manager Expenses table.
// Deliberately not editable here: creating/deleting stays owned by
// app/manager/expenses/page.tsx (the existing feature) so there is exactly
// one edit path for these rows and the two UIs can never race each other.
// ════════════════════════════════════════════════════════════════════════════

function ExpensesTab({ range }: { range: { from: string; to: string } }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stats, setStats] = useState<ExpenseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError('');
      try {
        const all = await listExpenses(range.from);
        const inRange = all.filter(e => new Date(e.createdAt) < new Date(range.to));
        if (!cancelled) { setExpenses(inRange); setStats(computeExpenseStats(inRange)); }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load expenses');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [range.from, range.to]);

  function exportCsv() {
    downloadCsv(
      `manager-expenses-${todayIST()}.csv`,
      ['Date', 'Category', 'Description', 'Amount', 'Added By'],
      expenses.map(e => [fmtDate(e.createdAt), e.category, e.description, e.amount, e.addedBy]),
    );
  }

  return (
    <div>
      <div style={{ padding: '0.7rem 0.9rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: '0.78rem', color: '#1d4ed8', marginBottom: '1rem' }}>
        ℹ️ This is a read-only view of the existing Manager Expenses log — the same data Managers add and delete
        from the Manager portal. Add or remove entries there; this view exists so Admin has visibility without a
        second edit path for the same records.
      </div>

      {loading && <div style={{ padding: '1.5rem', textAlign: 'center', color: '#999' }}>Loading…</div>}
      {error && <div style={{ color: '#ef4444', fontWeight: 700 }}>{error}</div>}

      {!loading && !error && stats && (
        <>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {stats.byCategory.map(c => (
              <div key={c.category} style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '0.5rem 0.75rem' }}>
                <span style={{ fontWeight: 800, color: '#ef4444' }}>{money(c.total)}</span>
                <span style={{ fontSize: '0.7rem', color: '#888', marginLeft: '0.4rem' }}>{c.category}</span>
              </div>
            ))}
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <button onClick={exportCsv} style={{ ...btn('#16a34a'), fontSize: '0.78rem' }}>📁 Export CSV</button>
          </div>
          <div style={card()}>
            {expenses.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#999', padding: '2rem' }}>No Manager expenses in this period.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead><tr style={{ background: '#f9fafb' }}>
                    {['Date', 'Category', 'Description', 'Amount', 'Added By'].map(hd => (
                      <th key={hd} style={{ padding: '0.45rem 0.6rem', textAlign: 'left', fontSize: '0.68rem', color: '#888', fontWeight: 700 }}>{hd}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {expenses.map(e => (
                      <tr key={e.id} style={{ borderTop: '1px solid #f5f0e8' }}>
                        <td style={{ padding: '0.45rem 0.6rem' }}>{fmtDateLong(e.createdAt)}</td>
                        <td style={{ padding: '0.45rem 0.6rem' }}>{e.category}</td>
                        <td style={{ padding: '0.45rem 0.6rem' }}>{e.description}</td>
                        <td style={{ padding: '0.45rem 0.6rem', fontWeight: 800, color: '#ef4444' }}>{money(e.amount)}</td>
                        <td style={{ padding: '0.45rem 0.6rem' }}>{e.addedBy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Vendors tab — vendors, payables (vendor_purchases), payments
// ════════════════════════════════════════════════════════════════════════════

function VendorsTab({ pin, adminName, accounts, accountName, onLedgerChanged }: {
  pin: string; adminName: string; accounts: FinanceAccount[]; accountName: (id: string) => string; onLedgerChanged: () => void;
}) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);
  const [purchases, setPurchases] = useState<VendorPurchase[]>([]);
  const [payments, setPayments] = useState<Record<string, VendorPayment[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showAddVendor, setShowAddVendor] = useState(false);
  const [newVendorName, setNewVendorName] = useState('');
  const [newVendorPhone, setNewVendorPhone] = useState('');

  const [showAddPurchase, setShowAddPurchase] = useState(false);
  const [purDesc, setPurDesc] = useState('');
  const [purAmount, setPurAmount] = useState('');

  const [payTarget, setPayTarget] = useState<VendorPurchase | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payAccount, setPayAccount] = useState('');
  const [payNote, setPayNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [v, p] = await Promise.all([listVendors(pin), listVendorPurchases(pin)]);
      setVendors(v); setPurchases(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load vendors');
    } finally {
      setLoading(false);
    }
  }, [pin]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function loadPayments(purchaseId: string) {
    if (payments[purchaseId]) return;
    const list = await listVendorPayments(pin, { vendorPurchaseId: purchaseId });
    setPayments(p => ({ ...p, [purchaseId]: list }));
  }

  async function addVendor() {
    if (!newVendorName.trim()) return;
    setBusy(true);
    try {
      await createVendor(pin, { name: newVendorName.trim(), phone: newVendorPhone.trim() || undefined });
      setNewVendorName(''); setNewVendorPhone(''); setShowAddVendor(false);
      void refresh();
    } catch (e) { alert(e instanceof Error ? e.message : 'Failed'); } finally { setBusy(false); }
  }

  async function addPurchase() {
    if (!selectedVendor || !purDesc.trim() || !purAmount) return;
    const amt = parseFloat(purAmount);
    if (!isFinite(amt) || amt <= 0) { alert('Enter a valid amount'); return; }
    setBusy(true);
    try {
      await createVendorPurchase(pin, { vendorId: selectedVendor, description: purDesc.trim(), amount: amt, by: adminName });
      setPurDesc(''); setPurAmount(''); setShowAddPurchase(false);
      void refresh();
    } catch (e) { alert(e instanceof Error ? e.message : 'Failed'); } finally { setBusy(false); }
  }

  async function recordPayment() {
    if (!payTarget || !payAccount || !payAmount) return;
    const amt = parseFloat(payAmount);
    if (!isFinite(amt) || amt <= 0) { setMsg('❌ Enter a valid amount'); return; }
    setBusy(true); setMsg('');
    try {
      await createVendorPayment(pin, { vendorPurchaseId: payTarget.id, accountId: payAccount, amount: amt, note: payNote || undefined, by: adminName });
      setPayTarget(null); setPayAmount(''); setPayNote(''); setPayAccount('');
      void refresh(); onLedgerChanged();
      setPayments(p => { const cp = { ...p }; delete cp[payTarget.id]; return cp; });
    } catch (e) {
      setMsg(`❌ ${e instanceof Error ? e.message : 'Payment failed'}`);
    } finally {
      setBusy(false);
    }
  }

  async function voidPayment(purchaseId: string, paymentId: string) {
    if (!confirm('Void this payment? The payable balance will increase back by this amount.')) return;
    try {
      await voidVendorPayment(pin, paymentId, adminName, 'Voided by admin');
      setPayments(p => { const cp = { ...p }; delete cp[purchaseId]; return cp; });
      void refresh(); onLedgerChanged();
    } catch (e) { alert(e instanceof Error ? e.message : 'Failed'); }
  }

  const vendorPurchases = purchases.filter(p => !selectedVendor || p.vendorId === selectedVendor);
  const statusColor: Record<string, string> = { unpaid: '#ef4444', partially_paid: '#f59e0b', paid: '#16a34a' };

  if (loading) return <div style={{ padding: '1.5rem', textAlign: 'center', color: '#999' }}>Loading…</div>;
  if (error) return <div style={{ color: '#ef4444', fontWeight: 700 }}>{error}</div>;

  return (
    <div>
      <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
        {/* Vendor list */}
        <div style={{ width: 260, flexShrink: 0 }}>
          <div style={card()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
              <h3 style={{ ...h3, marginBottom: 0 }}>🏭 Vendors</h3>
              <button onClick={() => setShowAddVendor(v => !v)} style={{ ...btn(), padding: '0.25rem 0.55rem', fontSize: '0.7rem' }}>＋</button>
            </div>
            {showAddVendor && (
              <div style={{ marginBottom: '0.75rem', padding: '0.6rem', background: '#faf8f3', borderRadius: 8 }}>
                <input value={newVendorName} onChange={e => setNewVendorName(e.target.value)} placeholder="Vendor name" style={{ ...inp, marginBottom: '0.4rem', fontSize: '0.8rem' }} />
                <input value={newVendorPhone} onChange={e => setNewVendorPhone(e.target.value)} placeholder="Phone (optional)" style={{ ...inp, marginBottom: '0.4rem', fontSize: '0.8rem' }} />
                <button onClick={addVendor} disabled={busy} style={{ ...btn(), width: '100%', fontSize: '0.75rem' }}>Save Vendor</button>
              </div>
            )}
            <button onClick={() => setSelectedVendor(null)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.4rem 0.5rem', borderRadius: 6, border: 'none', background: !selectedVendor ? '#fff5eb' : 'transparent', color: !selectedVendor ? ORANGE : '#666', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem', marginBottom: '0.2rem' }}>
              All Vendors
            </button>
            {vendors.map(v => (
              <button key={v.id} onClick={() => setSelectedVendor(v.id)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.4rem 0.5rem', borderRadius: 6, border: 'none', background: selectedVendor === v.id ? '#fff5eb' : 'transparent', color: selectedVendor === v.id ? ORANGE : '#333', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' }}>
                {v.name}
              </button>
            ))}
            {vendors.length === 0 && <div style={{ color: '#999', fontSize: '0.78rem' }}>No vendors yet.</div>}
          </div>
        </div>

        {/* Purchases / payables */}
        <div style={{ flex: 1, minWidth: 300 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ ...h3, marginBottom: 0 }}>📦 Payables {selectedVendor ? `— ${vendors.find(v => v.id === selectedVendor)?.name}` : '(All Vendors)'}</h3>
            <button onClick={() => setShowAddPurchase(v => !v)} disabled={!selectedVendor} style={{ ...btn(), fontSize: '0.76rem', opacity: selectedVendor ? 1 : 0.5 }}>＋ Record Purchase</button>
          </div>
          {!selectedVendor && <div style={{ fontSize: '0.75rem', color: '#999', marginBottom: '0.75rem' }}>Select a vendor on the left to record a new purchase.</div>}

          {showAddPurchase && selectedVendor && (
            <div style={{ ...card('#8b5cf6') }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 150px', gap: '0.6rem' }}>
                <div>
                  <label style={label}>What was received</label>
                  <input value={purDesc} onChange={e => setPurDesc(e.target.value)} placeholder="e.g. 20kg rice, 10L oil" style={inp} />
                </div>
                <div>
                  <label style={label}>Amount (₹)</label>
                  <input type="number" min="0.01" step="0.01" value={purAmount} onChange={e => setPurAmount(e.target.value)} style={inp} />
                </div>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#888', margin: '0.5rem 0' }}>
                This records that goods were received — it does not mean they were paid for. Record payment(s) separately below.
              </div>
              <button onClick={addPurchase} disabled={busy} style={{ ...btn(), fontSize: '0.78rem' }}>Save Purchase</button>
            </div>
          )}

          {vendorPurchases.length === 0 ? (
            <div style={{ ...card(), textAlign: 'center', color: '#999' }}>No purchases recorded.</div>
          ) : vendorPurchases.map(p => (
            <div key={p.id} style={card(statusColor[p.status])}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <div style={{ fontWeight: 700, color: INK }}>{p.description}</div>
                  <div style={{ fontSize: '0.72rem', color: '#888' }}>{!selectedVendor && `${vendors.find(v => v.id === p.vendorId)?.name ?? p.vendorId} · `}{fmtDateLong(p.purchaseDate)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 900, color: statusColor[p.status] }}>{money(p.amount)}</div>
                  <div style={{ fontSize: '0.68rem', color: '#888', textTransform: 'uppercase', fontWeight: 700 }}>{p.status.replace('_', ' ')}</div>
                </div>
              </div>
              {p.amountPaid > 0 && (
                <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.4rem' }}>
                  Paid {money(p.amountPaid)} · Due <b style={{ color: p.amountDue > 0 ? '#ef4444' : '#16a34a' }}>{money(p.amountDue)}</b>
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem', alignItems: 'center' }}>
                {p.status !== 'paid' && (
                  <button onClick={() => { setPayTarget(p); setPayAmount(String(p.amountDue)); setPayAccount(accounts.find(a => a.isDefault)?.id ?? accounts[0]?.id ?? ''); }} style={{ ...btn('#16a34a'), fontSize: '0.72rem', padding: '0.3rem 0.7rem' }}>💵 Record Payment</button>
                )}
                <button onClick={() => loadPayments(p.id)} style={{ ...btn('#6b7280'), fontSize: '0.72rem', padding: '0.3rem 0.7rem' }}>📜 History</button>
              </div>
              {payments[p.id] && (
                <div style={{ marginTop: '0.6rem', borderTop: '1px solid #f0f0f0', paddingTop: '0.5rem' }}>
                  {payments[p.id].length === 0 ? (
                    <div style={{ fontSize: '0.72rem', color: '#999' }}>No payments yet.</div>
                  ) : payments[p.id].map(pay => (
                    <div key={pay.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', padding: '0.25rem 0' }}>
                      <span>{fmtDateTime(pay.paidAt)} · {accountName(pay.accountId)}{pay.note ? ` · ${pay.note}` : ''}</span>
                      <span style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <b>{money(pay.amount)}</b>
                        <button onClick={() => voidPayment(p.id, pay.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.7rem' }}>void</button>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {payTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: 'white', borderRadius: 12, padding: '1.5rem', width: 380, maxWidth: '90vw' }}>
            <h3 style={h3}>💵 Record Payment</h3>
            <div style={{ fontSize: '0.82rem', color: '#666', marginBottom: '0.75rem' }}>{payTarget.description} — due {money(payTarget.amountDue)}</div>
            <label style={label}>Amount (₹)</label>
            <input type="number" min="0.01" step="0.01" value={payAmount} onChange={e => setPayAmount(e.target.value)} style={{ ...inp, marginBottom: '0.6rem' }} />
            <label style={label}>Paid From</label>
            <select value={payAccount} onChange={e => setPayAccount(e.target.value)} style={{ ...inp, marginBottom: '0.6rem' }}>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <label style={label}>Note (optional)</label>
            <input value={payNote} onChange={e => setPayNote(e.target.value)} style={{ ...inp, marginBottom: '1rem' }} />
            {msg && <div style={{ color: '#ef4444', fontSize: '0.78rem', marginBottom: '0.5rem' }}>{msg}</div>}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={recordPayment} disabled={busy} style={{ ...btn('#16a34a'), flex: 1, opacity: busy ? 0.6 : 1 }}>{busy ? 'Saving…' : 'Save Payment'}</button>
              <button onClick={() => setPayTarget(null)} style={{ ...btn('#6b7280'), flex: 1 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Shared modal helpers — local ISO <-> <input type="datetime-local"> conversion.
// Kept local to this file (not exported) since no equivalent exists in
// lib/date.ts yet and this is the only place that needs an editable timestamp.
// ════════════════════════════════════════════════════════════════════════════

function isoToLocalInput(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function localInputToIso(v: string): string | undefined {
  if (!v) return undefined;
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d.toISOString();
}

// ════════════════════════════════════════════════════════════════════════════
// Add Transaction modal — manual income/expense/transfer/adjustment entry.
// This is the ONLY way to create a manual finance_transactions row; vendor
// payments and salary payments create their own linked rows automatically
// (see VendorsTab/SalariesTab) and are intentionally not editable here.
// ════════════════════════════════════════════════════════════════════════════

function AddTransactionModal({ pin, adminName, accounts, categories, onClose, onSaved }: {
  pin: string; adminName: string; accounts: FinanceAccount[]; categories: FinanceCategory[];
  onClose: () => void; onSaved: () => void;
}) {
  const [type, setType] = useState<'income' | 'expense' | 'transfer' | 'adjustment'>('expense');
  const [accountId, setAccountId] = useState(accounts.find(a => a.isDefault)?.id ?? accounts[0]?.id ?? '');
  const [transferToAccountId, setTransferToAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [occurredAt, setOccurredAt] = useState(isoToLocalInput());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const relevantCategories = categories.filter(c => c.kind === (type === 'income' ? 'income' : 'expense'));

  async function save() {
    setMsg('');
    const amt = Number(amount);
    if (!accountId) { setMsg('Choose an account.'); return; }
    if (!isFinite(amt) || amt <= 0) { setMsg('Enter a valid amount greater than 0.'); return; }
    if (type === 'transfer' && (!transferToAccountId || transferToAccountId === accountId)) {
      setMsg('Choose a different destination account for the transfer.'); return;
    }
    setBusy(true);
    try {
      await createFinanceTransaction(pin, {
        type, accountId,
        transferToAccountId: type === 'transfer' ? transferToAccountId : undefined,
        categoryId: (type === 'income' || type === 'expense') ? (categoryId || undefined) : undefined,
        amount: amt, description: description || undefined,
        occurredAt: localInputToIso(occurredAt), by: adminName,
      });
      onSaved();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed to save transaction');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1rem' }}>
      <div style={{ background: 'white', borderRadius: 12, padding: '1.5rem', width: 440, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={h3}>＋ Add Transaction</h3>

        <label style={label}>Type</label>
        <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
          {(['expense', 'income', 'transfer', 'adjustment'] as const).map(t => (
            <button key={t} onClick={() => { setType(t); setCategoryId(''); }} style={tabB(type === t)}>{t[0].toUpperCase() + t.slice(1)}</button>
          ))}
        </div>

        <label style={label}>Account {type === 'transfer' ? '(from)' : ''}</label>
        <select value={accountId} onChange={e => setAccountId(e.target.value)} style={{ ...inp, marginBottom: '0.6rem' }}>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>

        {type === 'transfer' && (
          <>
            <label style={label}>Account (to)</label>
            <select value={transferToAccountId} onChange={e => setTransferToAccountId(e.target.value)} style={{ ...inp, marginBottom: '0.6rem' }}>
              <option value="">Select destination account…</option>
              {accounts.filter(a => a.id !== accountId).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </>
        )}

        {(type === 'income' || type === 'expense') && (
          <>
            <label style={label}>Category (optional)</label>
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)} style={{ ...inp, marginBottom: '0.6rem' }}>
              <option value="">Uncategorized</option>
              {relevantCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </>
        )}

        <label style={label}>Amount (₹)</label>
        <input type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} style={{ ...inp, marginBottom: '0.6rem' }} autoFocus />

        <label style={label}>Description (optional)</label>
        <input value={description} onChange={e => setDescription(e.target.value)} style={{ ...inp, marginBottom: '0.6rem' }} placeholder="e.g. Diwali decoration, owner drawing, bank fee…" />

        <label style={label}>Date &amp; time</label>
        <input type="datetime-local" value={occurredAt} onChange={e => setOccurredAt(e.target.value)} style={{ ...inp, marginBottom: '0.75rem' }} />

        {msg && <div style={{ color: '#ef4444', fontSize: '0.78rem', marginBottom: '0.5rem', fontWeight: 600 }}>{msg}</div>}

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={save} disabled={busy} style={{ ...btn(), flex: 1, opacity: busy ? 0.6 : 1 }}>{busy ? 'Saving…' : 'Save Transaction'}</button>
          <button onClick={onClose} style={{ ...btn('#6b7280'), flex: 1 }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Edit Transaction modal — only ever shown for source==='manual' rows
// (TransactionsTab only renders the ✏️ button for those). Editing never
// silently rewrites history: the API records a before/after audit-log entry
// on every PATCH, and the original creation record is never deleted.
// ════════════════════════════════════════════════════════════════════════════

function EditTransactionModal({ pin, adminName, tx, accounts, categories, onClose, onSaved }: {
  pin: string; adminName: string; tx: FinanceTransaction; accounts: FinanceAccount[]; categories: FinanceCategory[];
  onClose: () => void; onSaved: () => void;
}) {
  const [accountId, setAccountId] = useState(tx.accountId);
  const [categoryId, setCategoryId] = useState(tx.categoryId ?? '');
  const [amount, setAmount] = useState(String(tx.amount));
  const [description, setDescription] = useState(tx.description ?? '');
  const [occurredAt, setOccurredAt] = useState(isoToLocalInput(tx.occurredAt));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const relevantCategories = categories.filter(c => c.kind === (tx.type === 'income' ? 'income' : 'expense'));

  async function save() {
    setMsg('');
    const amt = Number(amount);
    if (!isFinite(amt) || amt <= 0) { setMsg('Enter a valid amount greater than 0.'); return; }
    setBusy(true);
    try {
      await updateFinanceTransaction(pin, tx.id, {
        amount: amt, description: description || undefined,
        categoryId: (tx.type === 'income' || tx.type === 'expense') ? (categoryId || undefined) : undefined,
        accountId, occurredAt: localInputToIso(occurredAt), by: adminName,
      });
      onSaved();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed to update transaction');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1rem' }}>
      <div style={{ background: 'white', borderRadius: 12, padding: '1.5rem', width: 440, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={h3}>✏️ Edit Transaction</h3>
        <div style={{ fontSize: '0.72rem', color: '#888', marginBottom: '0.75rem', textTransform: 'capitalize' }}>{tx.type} · every change is recorded in the audit trail</div>

        <label style={label}>Account</label>
        <select value={accountId} onChange={e => setAccountId(e.target.value)} style={{ ...inp, marginBottom: '0.6rem' }}>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>

        {(tx.type === 'income' || tx.type === 'expense') && (
          <>
            <label style={label}>Category (optional)</label>
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)} style={{ ...inp, marginBottom: '0.6rem' }}>
              <option value="">Uncategorized</option>
              {relevantCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </>
        )}

        <label style={label}>Amount (₹)</label>
        <input type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} style={{ ...inp, marginBottom: '0.6rem' }} autoFocus />

        <label style={label}>Description</label>
        <input value={description} onChange={e => setDescription(e.target.value)} style={{ ...inp, marginBottom: '0.6rem' }} />

        <label style={label}>Date &amp; time</label>
        <input type="datetime-local" value={occurredAt} onChange={e => setOccurredAt(e.target.value)} style={{ ...inp, marginBottom: '0.75rem' }} />

        {msg && <div style={{ color: '#ef4444', fontSize: '0.78rem', marginBottom: '0.5rem', fontWeight: 600 }}>{msg}</div>}

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={save} disabled={busy} style={{ ...btn(), flex: 1, opacity: busy ? 0.6 : 1 }}>{busy ? 'Saving…' : 'Save Changes'}</button>
          <button onClick={onClose} style={{ ...btn('#6b7280'), flex: 1 }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Audit Trail modal — read-only view over finance_audit_log. Every create /
// update / void / close / reopen across every Finance entity type lands here,
// each with the full before/after snapshot, satisfying "do not silently
// rewrite historical financial information without an audit trail."
// ════════════════════════════════════════════════════════════════════════════

function AuditModal({ pin, onClose }: { pin: string; onClose: () => void }) {
  const [entries, setEntries] = useState<FinanceAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError('');
      try {
        const data = await getFinanceAuditLog(pin, { limit: 300 });
        if (!cancelled) setEntries(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load audit trail');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [pin]);

  const entityTypes = useMemo(() => Array.from(new Set(entries.map(e => e.entityType))).sort(), [entries]);
  const filtered = entityFilter === 'all' ? entries : entries.filter(e => e.entityType === entityFilter);

  const actionColor: Record<string, string> = {
    create: '#16a34a', update: '#3b82f6', void: '#ef4444', close: '#8b5cf6', reopen: '#f59e0b',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1rem' }}>
      <div style={{ background: 'white', borderRadius: 12, padding: '1.5rem', width: 680, maxWidth: '95vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <h3 style={{ ...h3, marginBottom: 0 }}>🕵️ Finance Audit Trail</h3>
          <button onClick={onClose} style={{ ...btn('#6b7280'), fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}>Close</button>
        </div>
        <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.75rem' }}>
          Every create, edit, void, closing and reopening across Finance — most recent first. Nothing shown here is ever deleted.
        </div>

        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          <button onClick={() => setEntityFilter('all')} style={tabB(entityFilter === 'all')}>All</button>
          {entityTypes.map(t => (
            <button key={t} onClick={() => setEntityFilter(t)} style={tabB(entityFilter === t)}>{t.replace(/_/g, ' ')}</button>
          ))}
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading && <div style={{ padding: '1.5rem', textAlign: 'center', color: '#999' }}>Loading…</div>}
          {error && <div style={{ color: '#ef4444', fontWeight: 700, padding: '0.75rem' }}>{error}</div>}
          {!loading && !error && filtered.length === 0 && (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: '#999' }}>No audit entries yet.</div>
          )}
          {!loading && !error && filtered.map(e => (
            <div key={e.id} style={{ borderBottom: '1px solid #f0f0f0', padding: '0.55rem 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setExpanded(expanded === e.id ? null : e.id)}>
                <div>
                  <span style={{ fontWeight: 800, color: actionColor[e.action] ?? INK, textTransform: 'uppercase', fontSize: '0.68rem' }}>{e.action}</span>
                  <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: INK, textTransform: 'capitalize' }}>{e.entityType.replace(/_/g, ' ')}</span>
                  {e.note && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#888' }}>— {e.note}</span>}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#999', textAlign: 'right' }}>
                  {fmtDateTime(e.changedAt)}<br />{e.changedBy || '—'}
                </div>
              </div>
              {expanded === e.id && (
                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  {e.before !== undefined && (
                    <pre style={{ background: '#fef2f2', padding: '0.5rem', borderRadius: 6, fontSize: '0.68rem', flex: 1, minWidth: 200, overflowX: 'auto' }}>
                      <div style={{ fontWeight: 700, marginBottom: '0.25rem', color: '#ef4444' }}>Before</div>
                      {JSON.stringify(e.before, null, 2)}
                    </pre>
                  )}
                  {e.after !== undefined && (
                    <pre style={{ background: '#f0fdf4', padding: '0.5rem', borderRadius: 6, fontSize: '0.68rem', flex: 1, minWidth: 200, overflowX: 'auto' }}>
                      <div style={{ fontWeight: 700, marginBottom: '0.25rem', color: '#16a34a' }}>After</div>
                      {JSON.stringify(e.after, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
