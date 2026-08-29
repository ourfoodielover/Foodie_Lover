// GET  /api/finance/vendor-payments?restaurantId=&vendorPurchaseId=&vendorId=
// POST /api/finance/vendor-payments  — record a payment against a vendor_purchase
//
// Each payment here (1) updates the parent vendor_purchases.amount_paid/status,
// and (2) posts exactly one linked finance_transactions row (source=
// 'vendor_payment', source_id=this payment's id) so Admin never has to
// separately create a matching expense.
//
// Remediation (master-prompt finding #12): these three writes used to be
// issued sequentially with no transaction and no idempotency key, so a
// mid-sequence failure could leave a payment recorded with no ledger entry,
// and a client retry after a timeout could double-post. POST now delegates
// the whole read-validate-write sequence to the atomic
// create_vendor_payment() Postgres function (migration_023_finance_atomicity
// .sql), which takes a row lock on the parent purchase and accepts an
// optional idempotency key so a retried request returns the original result
// instead of creating a second payment. This route still does the
// non-authoritative lookups (vendor name, category id, current purchase for
// a fast 404) beforehand purely to build the description string and give a
// quick not-found response — the RPC re-validates everything itself under
// lock and is the actual source of truth.
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient, newId } from '@/lib/supabase-server';
import { requireAdminPin, errMsg, restaurantId, logFinanceAudit } from '@/lib/finance-server';
import { requireRole } from '@/lib/session-server';

export const dynamic = 'force-dynamic';

function rowToPayment(r: Record<string, unknown>) {
  return {
    id:               r.id as string,
    vendorPurchaseId: r.vendor_purchase_id as string,
    vendorId:         r.vendor_id as string,
    accountId:        r.account_id as string,
    amount:           Number(r.amount) || 0,
    paidAt:           r.paid_at as string,
    note:             (r.note as string | null) ?? undefined,
    createdBy:        (r.created_by as string | null) ?? undefined,
    isVoided:         !!r.is_voided,
  };
}

export async function GET(req: NextRequest) {
  const roleAuth = requireRole(req, ['admin']);
  if (!roleAuth.ok) return roleAuth.response;
  const auth = await requireAdminPin(req);
  if (!auth.ok) return auth.response;
  try {
    const sb  = getServerClient();
    const url = new URL(req.url);
    const rid = restaurantId(null, url);
    const vendorPurchaseId = url.searchParams.get('vendorPurchaseId');
    const vendorId         = url.searchParams.get('vendorId');

    let query = sb.from('vendor_payments').select('*').eq('restaurant_id', rid).eq('is_voided', false);
    if (vendorPurchaseId) query = query.eq('vendor_purchase_id', vendorPurchaseId);
    if (vendorId)         query = query.eq('vendor_id', vendorId);
    const { data, error } = await query.order('paid_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json((data ?? []).map(r => rowToPayment(r as Record<string, unknown>)));
  } catch (err) {
    console.error('[GET /api/finance/vendor-payments]', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const roleAuth = requireRole(req, ['admin']);
  if (!roleAuth.ok) return roleAuth.response;
  const auth = await requireAdminPin(req);
  if (!auth.ok) return auth.response;
  try {
    const sb   = getServerClient();
    const body = await req.json() as Record<string, unknown>;
    const rid  = restaurantId(body);

    const purchaseId = String(body.vendorPurchaseId ?? '');
    if (!purchaseId) return NextResponse.json({ error: 'vendorPurchaseId is required' }, { status: 400 });
    const accountId = String(body.accountId ?? '');
    if (!accountId) return NextResponse.json({ error: 'accountId is required' }, { status: 400 });
    const amount = Number(body.amount);
    if (!isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 });
    }

    const { data: purchase, error: pErr } = await sb.from('vendor_purchases').select('*').eq('id', purchaseId).maybeSingle();
    if (pErr) throw pErr;
    if (!purchase || purchase.is_voided) return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });

    const paymentId = newId('VPAY');
    const roundedAmt = Math.round(amount * 100) / 100;
    const paidAt = (body.paidAt as string) ?? new Date().toISOString();
    const createdBy = (body.by as string) ?? 'Admin';
    const idempotencyKey = (body.idempotencyKey as string) || null;

    const { data: vendor } = await sb.from('vendors').select('name').eq('id', purchase.vendor_id).maybeSingle();
    const { data: vendorCat } = await sb.from('finance_categories')
      .select('id').eq('restaurant_id', rid).eq('kind', 'expense').eq('name', 'Vendor Payment').maybeSingle();
    const description = `Vendor payment — ${(vendor?.name as string) ?? purchase.vendor_id}: ${purchase.description}`;

    const { data: rpcData, error: rpcErr } = await sb.rpc('create_vendor_payment', {
      p_payment_id: paymentId,
      p_restaurant_id: rid,
      p_vendor_purchase_id: purchaseId,
      p_vendor_id: purchase.vendor_id,
      p_account_id: accountId,
      p_amount: roundedAmt,
      p_paid_at: paidAt,
      p_note: (body.note as string) ?? null,
      p_created_by: createdBy,
      p_category_id: vendorCat?.id ?? null,
      p_description: description,
      p_idempotency_key: idempotencyKey,
    });
    if (rpcErr) throw rpcErr;

    const result = rpcData as {
      ok: boolean; error?: string; dueBefore?: number;
      id?: string; purchaseStatus?: string; amountPaid?: number; already_exists?: boolean;
    };
    if (!result.ok) {
      if (result.error === 'purchase_not_found') {
        return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
      }
      if (result.error === 'exceeds_balance') {
        const dueBefore = Number(result.dueBefore ?? 0);
        return NextResponse.json(
          { error: `Payment (₹${amount}) exceeds the remaining balance due (₹${dueBefore.toFixed(2)}).` },
          { status: 400 },
        );
      }
      throw new Error(`create_vendor_payment RPC failed: ${result.error ?? 'unknown'}`);
    }

    const resultId = result.id ?? paymentId;
    if (!result.already_exists) {
      await logFinanceAudit(sb, {
        restaurantId: rid, entityType: 'vendor_payment', entityId: resultId, action: 'create',
        changedBy: createdBy, after: { purchaseId, amount: roundedAmt, accountId },
      });
    }

    return NextResponse.json(
      { id: resultId, purchaseStatus: result.purchaseStatus, amountPaid: result.amountPaid },
      { status: 201 },
    );
  } catch (err) {
    console.error('[POST /api/finance/vendor-payments]', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}
