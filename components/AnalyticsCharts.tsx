// ─── Foodie Lover — Analytics Charts Component ───────────────────────────────
// Uses Recharts (already installed) to display production analytics data
// Fetches from /api/analytics
'use client';

import { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { getAnalytics, type AnalyticsData } from '@/lib/api';

const ORANGE  = '#E65C00';
const COLORS  = ['#E65C00','#3b82f6','#16a34a','#8b5cf6','#f59e0b','#06b6d4','#ef4444','#ec4899'];

interface Props {
  period: 'today' | 'week' | 'month' | 'all';
}

export default function AnalyticsCharts({ period }: Props) {
  const [data,    setData]    = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    getAnalytics(period)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setError('Could not load analytics'); setLoading(false); });
  }, [period]);

  const card: React.CSSProperties = {
    background: 'white', borderRadius: 14, padding: '1.25rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '1.25rem',
    borderLeft: `4px solid ${ORANGE}`,
  };
  const h3: React.CSSProperties = {
    fontFamily: "'Playfair Display',serif", fontSize: '0.98rem', fontWeight: 700,
    marginBottom: '1rem', color: '#1A0800',
  };

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
      Loading analytics…
    </div>
  );
  if (error || !data) return (
    <div style={{ ...card, borderLeft: '4px solid #ef4444', color: '#dc2626', fontSize: '0.85rem' }}>
      ⚠️ {error || 'No analytics data'} — Make sure the backend is running.
    </div>
  );

  const peakData = Array.from({ length: 24 }, (_, i) => {
    const found = data.peakHours.find(h => h.hour === i);
    return { hour: `${String(i).padStart(2,'0')}:00`, count: found?.count ?? 0 };
  });

  return (
    <div>
      {/* ── Summary cards ─────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Orders',   value: data.summary.totalOrders,           color: '#3b82f6', icon: '📦' },
          { label: 'Total Revenue',  value: `₹${data.summary.totalRevenue}`,    color: ORANGE,    icon: '💰' },
          { label: 'Avg Order Value',value: `₹${data.summary.avgOrderValue}`,   color: '#16a34a', icon: '📊' },
        ].map(c => (
          <div key={c.label} style={{ background: 'white', borderRadius: 12, padding: '1rem', textAlign: 'center', boxShadow: '0 1px 6px rgba(0,0,0,0.07)', borderTop: `3px solid ${c.color}` }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>{c.icon}</div>
            <div style={{ fontWeight: 900, fontSize: '1.1rem', color: c.color }}>{c.value}</div>
            <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* ── Top selling items ─────────────────────────────────────────────── */}
      {data.topItems.length > 0 && (
        <div style={card}>
          <h3 style={h3}>🏆 Top Selling Items</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.topItems.slice(0, 10)} margin={{ top: 0, right: 10, left: 0, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(v: number, name: string) => [name === 'qty' ? `${v} sold` : `₹${v}`, name === 'qty' ? 'Qty' : 'Revenue']}
                labelStyle={{ fontWeight: 700, color: '#1e293b' }}
              />
              <Bar dataKey="qty" fill={ORANGE} radius={[4,4,0,0]} name="qty">
                {data.topItems.slice(0,10).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Revenue by day ────────────────────────────────────────────────── */}
      {data.revenueByDay.length > 0 && (
        <div style={card}>
          <h3 style={h3}>📈 Revenue Over Time</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.revenueByDay} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [`₹${v}`, 'Revenue']} />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke={ORANGE} strokeWidth={2} dot={{ r: 4 }} name="Revenue (₹)" />
              <Line type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} name="Orders" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Peak hours ────────────────────────────────────────────────────── */}
      <div style={card}>
        <h3 style={h3}>⏰ Peak Hours (Orders by Hour)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={peakData.filter(d => d.count > 0 || (peakData.some(x => x.count > 0)))} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={1} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => [`${v} orders`, 'Orders']} />
            <Bar dataKey="count" fill="#3b82f6" radius={[4,4,0,0]} name="Orders" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Category breakdown ────────────────────────────────────────────── */}
      {data.byCategory.length > 0 && (
        <div style={{ ...card, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'center' }}>
          <div>
            <h3 style={h3}>🍽️ Orders by Category</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={data.byCategory} dataKey="items" nameKey="category" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent*100).toFixed(0)}%`}>
                  {data.byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => [`${v} items sold`, '']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div>
            {data.byCategory.map((c, i) => (
              <div key={c.category} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                  <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{c.category}</span>
                </div>
                <span style={{ fontSize: '0.82rem', color: '#64748b' }}>{c.items} items</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Waiter performance ────────────────────────────────────────────── */}
      {data.waiterPerformance.length > 0 && (
        <div style={card}>
          <h3 style={h3}>👤 Waiter Performance & Shift Hours</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: '#FFF5EE' }}>
                  {['Waiter','Shift Hours','Orders Served','Revenue Handled','Shift Status'].map(h => (
                    <th key={h} style={{ padding: '0.55rem 0.75rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: ORANGE }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.waiterPerformance.map((w, i) => (
                  <tr key={`${w.staffId ?? 'staff'}-${i}`} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 ? '#fffaf7' : 'white' }}>
                    <td style={{ padding: '0.48rem 0.75rem', fontWeight: 700 }}>{w.name}</td>
                    <td style={{ padding: '0.48rem 0.75rem', color: '#3b82f6', fontWeight: 700 }}>
                      {Number(w.shiftHours ?? 0).toFixed(1)}h
                    </td>
                    <td style={{ padding: '0.48rem 0.75rem', color: '#16a34a', fontWeight: 700 }}>{w.ordersServed ?? 0}</td>
                    <td style={{ padding: '0.48rem 0.75rem', fontWeight: 700, color: ORANGE }}>₹{Number(w.revenueHandled ?? 0).toFixed(0)}</td>
                    <td style={{ padding: '0.48rem 0.75rem' }}>
                      <span style={{
                        padding: '0.15rem 0.55rem', borderRadius: 10, fontSize: '0.7rem', fontWeight: 700,
                        background: !w.shiftEnd ? '#dcfce7' : '#f1f5f9',
                        color:      !w.shiftEnd ? '#16a34a' : '#64748b',
                      }}>
                        {!w.shiftEnd ? '🟢 On Shift' : '⚫ Off Shift'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
