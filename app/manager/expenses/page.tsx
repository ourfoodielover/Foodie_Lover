'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, AuthSession } from '@/lib/auth';
import {
  getExpenses, addExpense, deleteExpense, getExpenseStats,
  getOrdersInPeriod,
  Expense, ExpenseStats, ExpenseCategory, EXPENSE_CATEGORIES,
} from '@/lib/storage';

// ─── Style helpers ─────────────────────────────────────────────────────────────
const btn = (bg = '#E65C00', c = 'white'): React.CSSProperties => ({
  background: bg, color: c, border: 'none', borderRadius: 8,
  fontWeight: 700, cursor: 'pointer', fontFamily: 'Poppins,sans-serif',
  padding: '0.5rem 1rem', fontSize: '0.85rem',
});
const inp: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '0.65rem 0.85rem',
  border: '2px solid #e5e7eb', borderRadius: 10,
  fontFamily: 'Poppins,sans-serif', fontSize: '0.9rem', outline: 'none',
};

// ─── Category badge colours ────────────────────────────────────────────────────
const CAT_COLOR: Record<string, { bg: string; text: string }> = {
  'Ingredients':  { bg: '#fef3c7', text: '#92400e' },
  'Utilities':    { bg: '#dbeafe', text: '#1e40af' },
  'Staff Wages':  { bg: '#f3e8ff', text: '#6b21a8' },
  'Rent':         { bg: '#fee2e2', text: '#991b1b' },
  'Equipment':    { bg: '#d1fae5', text: '#065f46' },
  'Marketing':    { bg: '#fce7f3', text: '#9d174d' },
  'Maintenance':  { bg: '#ffedd5', text: '#9a3412' },
  'Packaging':    { bg: '#e0f2fe', text: '#0c4a6e' },
  'Other':        { bg: '#f3f4f6', text: '#374151' },
};

function CategoryBadge({ cat }: { cat: string }) {
  const c = CAT_COLOR[cat] || CAT_COLOR['Other'];
  return (
    <span style={{ background: c.bg, color: c.text, padding: '0.18rem 0.6rem', borderRadius: 8, fontSize: '0.68rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
      {cat}
    </span>
  );
}

// ─── Summary card ──────────────────────────────────────────────────────────────
function SummaryCard({ icon, label, value, sub, accent }: { icon: string; label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div style={{ background: 'white', borderRadius: 14, padding: '1rem 1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', borderTop: `4px solid ${accent || '#E65C00'}`, flex: '1 1 150px', minWidth: 140 }}>
      <div style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>{icon}</div>
      <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#1A0800' }}>{value}</div>
      {sub && <div style={{ fontSize: '0.7rem', color: '#888', marginTop: '0.1rem' }}>{sub}</div>}
      <div style={{ fontSize: '0.68rem', color: '#aaa', marginTop: '0.25rem', fontWeight: 600 }}>{label}</div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ExpensesPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [session, setSession]         = useState<AuthSession | null>(null);

  // ── Data ──
  const [expenses, setExpenses]       = useState<Expense[]>([]);
  const [stats, setStats]             = useState<ExpenseStats>({
    todayTotal: 0, weekTotal: 0, monthTotal: 0,
    todayCount: 0, weekCount: 0, monthCount: 0,
    byCategory: [],
  });
  const [todayRevenue, setTodayRevenue] = useState(0);

  // ── Form ──
  const [category, setCategory]       = useState<ExpenseCategory>('Ingredients');
  const [description, setDescription] = useState('');
  const [amount, setAmount]           = useState('');
  const [formError, setFormError]     = useState('');
  const [formMsg, setFormMsg]         = useState('');
  const [showForm, setShowForm]       = useState(false);

  // ── Filters ──
  const [filterCat, setFilterCat]     = useState<string>('All');
  const [confirmDel, setConfirmDel]   = useState<string | null>(null);

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const s = getSession('manager');
    if (!s) { router.replace('/manager/login'); return; }
    setSession(s);
    setAuthChecked(true);
  }, [router]);

  // ── Data refresh ──────────────────────────────────────────────────────────
  const refresh = useCallback(() => {
    const all = getExpenses().slice().reverse(); // newest first
    setExpenses(all);
    setStats(getExpenseStats());
    const rev = getOrdersInPeriod('today').reduce((s, o) => s + (o.total || 0), 0);
    setTodayRevenue(rev);
  }, []);

  useEffect(() => {
    if (!authChecked) return;
    refresh();
  }, [refresh, authChecked]);

  // ── Add expense ───────────────────────────────────────────────────────────
  function handleAdd() {
    const amt = parseFloat(amount);
    if (!description.trim()) { setFormError('Please enter a description'); return; }
    if (!amount || isNaN(amt) || amt <= 0) { setFormError('Please enter a valid amount greater than 0'); return; }
    if (amt > 1_000_000) { setFormError('Amount seems too large — please check'); return; }

    addExpense({
      category,
      description: description.trim(),
      amount:      Math.round(amt * 100) / 100,
      date:        new Date().toISOString().slice(0, 10),
      addedBy:     session?.name || 'Manager',
    });

    setDescription('');
    setAmount('');
    setFormError('');
    setFormMsg('✅ Expense added');
    setTimeout(() => setFormMsg(''), 2500);
    setShowForm(false);
    refresh();
  }

  // ── Delete expense ────────────────────────────────────────────────────────
  function handleDelete(id: string) {
    if (confirmDel !== id) { setConfirmDel(id); return; }
    deleteExpense(id);
    setConfirmDel(null);
    refresh();
  }

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = filterCat === 'All' ? expenses : expenses.filter(e => e.category === filterCat);
  // Guard: ensure both values are finite numbers before subtraction
  const safeRevenue  = isFinite(todayRevenue)       ? todayRevenue        : 0;
  const safeExpenses = isFinite(stats.todayTotal)   ? stats.todayTotal    : 0;
  const netProfit    = safeRevenue - safeExpenses;

  if (!authChecked) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#faf8f3,#f5f0e8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#888', fontFamily: 'Poppins,sans-serif' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💸</div>
          <div>Loading Expense Tracker…</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#faf8f3,#f5f0e8)', fontFamily: 'Poppins,sans-serif', paddingBottom: '2rem' }}>

      {/* ── Header ── */}
      <div style={{ background: 'linear-gradient(135deg,#1A0800,#3D1C00)', color: 'white', padding: '0.9rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 4px 16px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.5rem' }}>💸</span>
          <div>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.2rem', fontWeight: 900 }}>Expense Tracker</div>
            <div style={{ fontSize: '0.7rem', color: '#F9A826' }}>Log & monitor operating costs</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => { setShowForm(f => !f); setFormError(''); }}
            style={{ ...btn('#E65C00'), fontSize: '0.78rem' }}
          >
            {showForm ? '✕ Cancel' : '＋ Add Expense'}
          </button>
          <button
            onClick={() => router.push('/manager')}
            style={{ ...btn('#ffffff20', 'white'), border: '1px solid #ffffff40', fontSize: '0.78rem' }}
          >
            ← Dashboard
          </button>
        </div>
      </div>

      {/* ── Add expense form ── */}
      {showForm && (
        <div style={{ background: '#fff', borderBottom: '2px solid #f5f0e8', padding: '1.25rem 1.5rem' }}>
          <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1A0800', marginBottom: '0.85rem' }}>
            New Expense
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
            {/* Category */}
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#555', display: 'block', marginBottom: '0.3rem' }}>Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as ExpenseCategory)}
                style={{ ...inp, cursor: 'pointer' }}
              >
                {EXPENSE_CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            {/* Description */}
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#555', display: 'block', marginBottom: '0.3rem' }}>Description *</label>
              <input
                value={description}
                onChange={e => { setDescription(e.target.value); setFormError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                placeholder="e.g. Tomatoes & onions restock"
                style={{ ...inp, borderColor: formError && !description.trim() ? '#ef4444' : '#e5e7eb' }}
              />
            </div>
            {/* Amount */}
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#555', display: 'block', marginBottom: '0.3rem' }}>Amount (₹) *</label>
              <input
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={e => { setAmount(e.target.value); setFormError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                placeholder="0.00"
                style={{ ...inp, borderColor: formError && !amount ? '#ef4444' : '#e5e7eb' }}
              />
            </div>
          </div>
          {formError && (
            <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.5rem' }}>{formError}</div>
          )}
          <div style={{ marginTop: '0.85rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button onClick={handleAdd} style={{ ...btn(), padding: '0.6rem 1.5rem', fontSize: '0.88rem' }}>
              ✅ Save Expense
            </button>
            {formMsg && (
              <span style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 700 }}>{formMsg}</span>
            )}
          </div>
        </div>
      )}

      <div style={{ padding: '1.25rem 1.5rem' }}>

        {/* ── Summary cards ── */}
        {/* fmt: safely format a number to Indian locale, falling back to '0' */}
        {(() => {
          const fmt = (n: number) => (isFinite(n) ? n : 0).toLocaleString('en-IN');
          return (
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
              <SummaryCard
                icon="📅"
                label="Today's Expenses"
                value={`₹${fmt(stats.todayTotal)}`}
                sub={`${stats.todayCount} entr${stats.todayCount !== 1 ? 'ies' : 'y'}`}
                accent="#ef4444"
              />
              <SummaryCard
                icon="📆"
                label="This Week"
                value={`₹${fmt(stats.weekTotal)}`}
                sub={`${stats.weekCount} entries`}
                accent="#f59e0b"
              />
              <SummaryCard
                icon="🗓️"
                label="This Month"
                value={`₹${fmt(stats.monthTotal)}`}
                sub={`${stats.monthCount} entries`}
                accent="#8b5cf6"
              />
              <SummaryCard
                icon="💰"
                label="Today Revenue"
                value={`₹${fmt(safeRevenue)}`}
                accent="#16a34a"
              />
              <SummaryCard
                icon={netProfit >= 0 ? '📈' : '📉'}
                label="Today Net Profit"
                value={`${netProfit >= 0 ? '+' : '−'}₹${fmt(Math.abs(netProfit))}`}
                sub="Revenue − Expenses"
                accent={netProfit >= 0 ? '#16a34a' : '#ef4444'}
              />
            </div>
          );
        })()}

        {/* ── Category breakdown ── */}
        {stats.byCategory.length > 0 && (
          <div style={{ background: 'white', borderRadius: 14, padding: '1rem 1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: '1.25rem' }}>
            <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#1A0800', marginBottom: '0.65rem' }}>
              📊 Spending by Category (all time)
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {stats.byCategory.map(({ category: cat, total }) => (
                <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#faf8f3', borderRadius: 8, padding: '0.35rem 0.65rem' }}>
                  <CategoryBadge cat={cat} />
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1A0800' }}>₹{total.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Filter + table ── */}
        <div style={{ background: 'white', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          {/* Filter bar */}
          <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid #f5f0e8', display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#555', marginRight: '0.25rem' }}>Filter:</span>
            {['All', ...EXPENSE_CATEGORIES].map(c => (
              <button
                key={c}
                onClick={() => setFilterCat(c)}
                style={{
                  padding: '0.22rem 0.65rem', borderRadius: 16, cursor: 'pointer',
                  fontSize: '0.7rem', fontWeight: 600, fontFamily: 'Poppins,sans-serif',
                  border: `1.5px solid ${filterCat === c ? '#E65C00' : '#e5e7eb'}`,
                  background: filterCat === c ? '#E65C00' : 'white',
                  color: filterCat === c ? 'white' : '#666',
                }}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Table header */}
          {filtered.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 130px 90px 80px', gap: '0', background: '#f9fafb', padding: '0.55rem 1.25rem', fontSize: '0.68rem', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <span>Date</span>
              <span>Description</span>
              <span>Category</span>
              <span style={{ textAlign: 'right' }}>Amount</span>
              <span style={{ textAlign: 'center' }}>Delete</span>
            </div>
          )}

          {/* Rows */}
          {filtered.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#aaa', fontSize: '0.85rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💸</div>
              {filterCat === 'All' ? 'No expenses recorded yet. Tap "＋ Add Expense" to start.' : `No ${filterCat} expenses recorded.`}
            </div>
          ) : (
            filtered.map((expense, i) => {
              const isOdd       = i % 2 === 1;
              const isDeleting  = confirmDel === expense.id;
              const dateLabel   = new Date(expense.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
              const timeLabel   = new Date(expense.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

              return (
                <div
                  key={expense.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '110px 1fr 130px 90px 80px',
                    gap: 0,
                    padding: '0.65rem 1.25rem',
                    background: isDeleting ? '#fff1f2' : isOdd ? '#fafafa' : 'white',
                    borderTop: '1px solid #f5f0e8',
                    alignItems: 'center',
                    transition: 'background 0.15s',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1A0800' }}>{dateLabel}</div>
                    <div style={{ fontSize: '0.62rem', color: '#aaa' }}>{timeLabel}</div>
                    <div style={{ fontSize: '0.6rem', color: '#ccc', marginTop: '0.08rem' }}>by {expense.addedBy}</div>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#374151', paddingRight: '0.5rem', wordBreak: 'break-word' }}>
                    {expense.description}
                  </div>
                  <div>
                    <CategoryBadge cat={expense.category} />
                  </div>
                  <div style={{ textAlign: 'right', fontWeight: 800, fontSize: '0.9rem', color: '#ef4444' }}>
                    ₹{expense.amount.toLocaleString('en-IN')}
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <button
                      onClick={() => handleDelete(expense.id)}
                      style={{
                        ...btn(isDeleting ? '#ef4444' : '#fee2e2', isDeleting ? 'white' : '#ef4444'),
                        padding: '0.3rem 0.55rem',
                        fontSize: '0.7rem',
                        borderRadius: 8,
                      }}
                    >
                      {isDeleting ? '⚠️ Confirm' : '🗑️'}
                    </button>
                  </div>
                </div>
              );
            })
          )}

          {filtered.length > 0 && (
            <div style={{ padding: '0.65rem 1.25rem', background: '#f9fafb', borderTop: '2px solid #f5f0e8', display: 'flex', justifyContent: 'flex-end', gap: '1rem', fontSize: '0.8rem' }}>
              <span style={{ color: '#888' }}>{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
              <span style={{ fontWeight: 800, color: '#ef4444' }}>
                Total: ₹{filtered.reduce((s, e) => s + (isFinite(e.amount) ? e.amount : 0), 0).toLocaleString('en-IN')}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
