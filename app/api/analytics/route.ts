// GET /api/analytics?period=today|week|month|all&restaurantId=...
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * periodStart — returns an ISO timestamp for the start of the requested period.
 *
 * tzOffsetMins: client's UTC offset in minutes (e.g. IST = +330, EST = -300).
 * Defaults to 0 (UTC) when not provided.
 *
 * For 'today': computes midnight in the CLIENT timezone so IST restaurants see
 * correct daily counts regardless of the server's UTC offset.
 */
function periodStart(period: string, tzOffsetMins = 0): string | null {
  const now = new Date();
  if (period === 'today') {
    // Shift now to the client's local time, set to midnight, then shift back
    const localMs      = now.getTime() + tzOffsetMins * 60_000;
    const localDate    = new Date(localMs);
    localDate.setUTCHours(0, 0, 0, 0);             // midnight in client timezone
    const utcMidnight  = new Date(localDate.getTime() - tzOffsetMins * 60_000);
    return utcMidnight.toISOString();
  }
  if (period === 'week') {
    const d = new Date(now); d.setDate(d.getDate() - 7); return d.toISOString();
  }
  if (period === 'month') {
    const d = new Date(now); d.setDate(d.getDate() - 30); return d.toISOString();
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const sb          = getServerClient();
    const url         = new URL(req.url);
    const rid         = url.searchParams.get('restaurantId') ?? 'rest_default';
    const period      = url.searchParams.get('period') ?? 'today';
    // tzOffset: client sends its UTC offset in minutes (new Date().getTimezoneOffset() * -1)
    const tzOffsetMins = Number(url.searchParams.get('tz') ?? '0');
    const since       = periodStart(period, tzOffsetMins);

    let query = sb
      .from('orders')
      .select('*, order_items(*)')
      .eq('restaurant_id', rid)
      .not('status', 'eq', 'cancelled');

    if (since) query = query.gte('created_at', since);
    const { data: orders, error } = await query;
    if (error) throw error;

    const rows = orders ?? [];

    // ── Top items ─────────────────────────────────────────────────────────────
    const itemCounts: Record<string, { name: string; qty: number; revenue: number }> = {};
    for (const o of rows) {
      for (const it of (o.order_items ?? [])) {
        if (!itemCounts[it.name]) itemCounts[it.name] = { name: it.name, qty: 0, revenue: 0 };
        itemCounts[it.name].qty     += Number(it.qty);
        itemCounts[it.name].revenue += Number(it.subtotal);
      }
    }
    const topItems = Object.values(itemCounts)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);

    // ── Peak hours ────────────────────────────────────────────────────────────
    const hourCounts: number[] = Array(24).fill(0);
    for (const o of rows) {
      try {
        const h = new Date(o.created_at ?? '').getHours();
        if (!isNaN(h)) hourCounts[h]++;
      } catch { /* skip invalid dates */ }
    }
    const peakHours = hourCounts.map((count, hour) => ({ hour, count }));

    // ── Revenue by day (last 30 days) ─────────────────────────────────────────
    const dayMap: Record<string, { revenue: number; orders: number }> = {};
    for (const o of rows) {
      const day = (o.created_at ?? '').slice(0, 10);
      if (!day) continue;
      if (!dayMap[day]) dayMap[day] = { revenue: 0, orders: 0 };
      dayMap[day].revenue += Number(o.total);
      dayMap[day].orders += 1;
    }
    const revenueByDay = Object.entries(dayMap)
      .map(([day, val]) => ({ day, revenue: val.revenue, orders: val.orders }))
      .sort((a, b) => a.day.localeCompare(b.day))
      .slice(-30);

    // ── Summary ───────────────────────────────────────────────────────────────
    const totalRevenue   = rows.reduce((s, o) => s + Number(o.total), 0);
    const totalOrders    = rows.length;
    const avgOrderValue  = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    // Per-type counts for admin dashboard KPIs
    const countDineIn    = rows.filter(o => o.type === 'dine-in').length;
    const countPickup    = rows.filter(o => o.type === 'pickup').length;
    const countDelivery  = rows.filter(o => o.type === 'delivery').length;
    const countOnline    = rows.filter(o => o.source === 'online').length;

    // ── Category breakdown ────────────────────────────────────────────────────
    // Groups item counts by category. Since order_items may lack a category field,
    // we fall back to a single "All Items" bucket.
    const catMap: Record<string, { orders: Set<string>; items: number }> = {};
    for (const o of rows) {
      for (const it of (o.order_items ?? [])) {
        const cat: string = (it.category as string) || 'All Items';
        if (!catMap[cat]) catMap[cat] = { orders: new Set(), items: 0 };
        catMap[cat].orders.add(o.id as string);
        catMap[cat].items += Number(it.qty ?? 1);
      }
    }

    // ── Waiter performance ────────────────────────────────────────────────────
    // Aggregate ALL shift_logs rows per staff_id so a waiter with multiple
    // shifts (e.g. morning + evening) appears as ONE row with combined totals.
    // Fixes: "Encountered two children with the same key STAFF-xxxx" React error.
    const { data: shifts } = await sb
      .from('shift_logs')
      .select('*')
      .eq('restaurant_id', rid);

    type StaffAgg = {
      staffId:        string;
      name:           string;
      ordersServed:   number;
      revenueHandled: number;
      shiftHours:     number;
      hasActiveShift: boolean;
      shiftStart:     string | undefined;
      shiftEnd:       string | null;
    };
    const staffMap: Record<string, StaffAgg> = {};

    for (const s of (shifts ?? [])) {
      const sid   = s.staff_id as string;
      const hours = s.shift_end
        ? Math.round(
            (new Date(s.shift_end as string).getTime() - new Date(s.shift_start as string).getTime()) / 36e5 * 10,
          ) / 10
        : 0;
      const isActive = !s.shift_end;

      if (!staffMap[sid]) {
        staffMap[sid] = {
          staffId:        sid,
          name:           (s.staff_name ?? s.staff_id) as string,
          ordersServed:   0,
          revenueHandled: 0,
          shiftHours:     0,
          hasActiveShift: false,
          shiftStart:     s.shift_start as string | undefined,
          shiftEnd:       (s.shift_end ?? null) as string | null,
        };
      }
      staffMap[sid].ordersServed   += Number(s.orders_served ?? 0);
      staffMap[sid].revenueHandled += Number(s.revenue_handled ?? 0);
      staffMap[sid].shiftHours     += hours;
      if (isActive) {
        staffMap[sid].hasActiveShift = true;
        staffMap[sid].shiftEnd = null; // still on shift — override
      }
    }

    const waiterPerf = Object.values(staffMap).map(s => ({
      staffId:        s.staffId,
      name:           s.name,
      ordersServed:   s.ordersServed,
      revenueHandled: s.revenueHandled,
      shiftHours:     Math.round(s.shiftHours * 10) / 10,
      shiftStart:     s.shiftStart,
      shiftEnd:       s.hasActiveShift ? null : s.shiftEnd,
    }));

    return NextResponse.json({
      period,
      topItems,
      peakHours,
      revenueByDay,
      summary: {
        totalRevenue:   Math.round(totalRevenue * 100) / 100,
        totalOrders,
        avgOrderValue:  Math.round(avgOrderValue * 100) / 100,
        countDineIn,
        countPickup,
        countDelivery,
        countOnline,
      },
      byCategory: Object.entries(catMap).map(([category, val]) => ({
        category,
        orders: val.orders.size,
        items:  val.items,
      })),
      waiterPerformance: waiterPerf,
      tableStats: [],
    });
  } catch (err) {
    console.error('[GET /api/analytics] unexpected error:', err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
