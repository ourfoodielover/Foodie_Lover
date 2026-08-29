// GET  /api/admin/reset-test-data?restaurantId=   — preview what a reset would remove
// POST /api/admin/reset-test-data                 — execute the reset
//
// Pre-production "start clean" tool (Admin → Danger Zone → Reset Test Data).
// Wipes every TEST TRANSACTIONAL/OPERATIONAL table for one restaurant
// (orders, tabs, Finance transactions, vendor/salary payments, Daily
// Closings, Spin & Win results/coupons, etc.) while leaving every
// configuration table untouched (menu, staff, PINs, Finance accounts/
// categories, vendors, salary config, Spin & Win config — see
// supabase/migration_024_reset_test_data.sql for the exact, verified list).
//
// AUTHORIZATION (both GET and POST — the preview itself is gated, not just
// the destructive execute, since it reveals aggregate Finance figures):
//   1. requireRole(['admin'])   — real server-side session (lib/session-server.ts)
//   2. requireAdminPin(req)     — the Finance admin PIN (lib/finance-server.ts)
// POST additionally requires:
//   3. body.confirmText === 'RESET TEST DATA' (exact, case-sensitive)
// None of this weakens or bypasses RLS or any existing route's authorization
// — it is layered identically to every other Finance/danger-zone route.
//
// The actual deletion runs inside execute_test_data_reset(), a SECURITY
// DEFINER Postgres function executed as a SINGLE TRANSACTION (migration_024)
// — EXECUTE on that function is revoked from PUBLIC and granted only to
// service_role, so even a leaked anon key could never call it directly; only
// this route (using the service-role backend client) can. If anything inside
// the function raises, Postgres rolls back the entire transaction
// automatically — there is no code path that leaves a half-reset database.
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { requireAdminPin, errMsg, restaurantId as resolveRestaurantId } from '@/lib/finance-server';
import { requireRole } from '@/lib/session-server';
import { getTestDataResetSnapshot, crossCheckSystemSalesNet } from '@/lib/reset-server';

export const dynamic = 'force-dynamic';

const CONFIRM_PHRASE = 'RESET TEST DATA';

export async function GET(req: NextRequest) {
  const roleAuth = requireRole(req, ['admin']);
  if (!roleAuth.ok) return roleAuth.response;
  const pinAuth = await requireAdminPin(req);
  if (!pinAuth.ok) return pinAuth.response;
  try {
    const sb  = getServerClient();
    const url = new URL(req.url);
    const rid = resolveRestaurantId(null, url);
    const snapshot = await getTestDataResetSnapshot(sb, rid);
    return NextResponse.json({ preview: snapshot });
  } catch (err) {
    console.error('[GET /api/admin/reset-test-data]', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const roleAuth = requireRole(req, ['admin']);
  if (!roleAuth.ok) return roleAuth.response;
  const pinAuth = await requireAdminPin(req);
  if (!pinAuth.ok) return pinAuth.response;
  try {
    const body = await req.json() as { confirmText?: string; note?: string; restaurantId?: string };
    if ((body.confirmText ?? '').trim() !== CONFIRM_PHRASE) {
      return NextResponse.json(
        { error: `Type exactly "${CONFIRM_PHRASE}" to confirm.` },
        { status: 400 },
      );
    }

    const sb  = getServerClient();
    const rid = resolveRestaurantId(body);

    // Preview one more time, server-side, immediately before executing — the
    // Admin UI already showed this once, but re-fetching here means the
    // confirmation the Admin is acting on cannot be stale (e.g. a browser
    // tab left open for an hour with an old preview on screen).
    const before = await getTestDataResetSnapshot(sb, rid);

    const { data, error } = await sb.rpc('execute_test_data_reset', {
      p_restaurant_id:     rid,
      p_performed_by_role: roleAuth.session.role,
      p_staff_id:          roleAuth.session.staffId ?? null,
      p_note:              body.note?.trim() || null,
    });
    if (error) {
      console.error('[POST /api/admin/reset-test-data] execute_test_data_reset failed:', error);
      return NextResponse.json(
        { error: `Reset failed and was rolled back — nothing was deleted. (${errMsg(error)})` },
        { status: 500 },
      );
    }
    const result = data as { ok: true; resetId: string; counts: unknown; amounts: unknown };

    // Post-reset verification — same snapshot function used for the preview,
    // so "what was removed" and "confirm it's gone" are directly comparable.
    // A cross-check against the independent TS system-sales engine too, so a
    // genuine disagreement between the two implementations is surfaced
    // rather than silently trusted.
    const after = await getTestDataResetSnapshot(sb, rid);
    const crossCheckNet = await crossCheckSystemSalesNet(sb, rid);
    const crossCheckAgrees = crossCheckNet === 0;

    return NextResponse.json({
      ok: true,
      resetId: result.resetId,
      removed: { counts: result.counts, amounts: result.amounts },
      before,
      verification: after,
      crossCheckAgrees,
      message: after.isClean
        ? `Test data reset complete. Removed ${before.counts.orders} orders, ${before.counts.customerTabs} customer tabs, ${before.counts.financeTransactions} Finance transactions, ${before.counts.vendorPayments} vendor payments, ${before.counts.salaryPayments} salary payments, ${before.counts.dailyClosings} Daily Closing snapshot(s). System Sales, Manager Expenses, and Net Cash Flow are now ₹0; account balances are back to their configured opening balances.`
        : `Reset ran, but post-reset verification found the data is not fully clean yet — review the verification summary before going live.`,
    });
  } catch (err) {
    console.error('[POST /api/admin/reset-test-data]', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}
