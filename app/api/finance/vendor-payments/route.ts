// GET  /api/finance/vendor-payments?restaurantId=&vendorPurchaseId=&vendorId=
// POST /api/finance/vendor-payments  — record a payment against a vendor_purchase
//
// Each payment here (1) updates the parent vendor_purchases.amount_paid/status,
// and (2) posts exactly one linked finance_transactions row (source=
// 'vendor_payment', source_id=this payment's id) so Admin never has to
// separately create a matching expense. Supabase's REST client has no
// multi-statement transaction API, so the three writes below are issued
// sequentially in an order chosen so a mid-failure never overstates a paid
// amount: the payment row is written first (source of truth for "did this
// payment happen"), then the purchase total, then the mirrored ledger entry.
// If a later step fails, the operation returns an error and nothing is
// silently double-counted — the payment row + updated purchase are enough on
// their own to reconstruct the ledger entry if the last step needs a retry.
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient, newId } from '@/lib/supabase-server';
import { requireAdminPin, errMsg, restaurantId, logFinanceAudit } from '@/lib/finance-server';

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

    const dueBefore = Number(purchase.amount) - Number(purchase.amount_paid);
    if (amount > dueBefore + 0.01) {
      return NextResponse.json(
        { error: `Payment (₹${amount}) exceeds the remaining balance due (₹${dueBefore.toFixed(2)}).` },
        { status: 400 },
      );
    }

    const paymentId = newId('VPAY');
    const roundedAmt = Math.round(amount * 100) / 100;
    const paidAt = (body.paidAt as string) ?? new Date().toISOString();
    const createdBy = (body.by as string) ?? 'Admin';

    const { error: payErr } = await sb.from('vendor_payments').insert({
      id: paymentId, restaurant_id: rid, vendor_purchase_id: purchaseId,
      vendor_id: purchase.vendor_id, account_id: accountId, amount: roundedAmt,
      paid_at: paidAt, note: (body.note as string) ?? null, created_by: createdBy,
    });
    if (payErr) throw payErr;

    const newAmountPaid = Math.round((Number(purchase.amount_paid) + roundedAmt) * 100) / 100;
    const newStatus = newAmountPaid >= Number(purchase.amount) - 0.01 ? 'paid' : 'partially_paid';
    const { error: updErr } = await sb.from('vendor_purchases').update({
      amount_paid: newAmountPaid, status: newStatus, updated_at: new Date().toISOString(),
    }).eq('id', purchaseId);
    if (updErr) throw updErr;

    const { data: vendor } = await sb.from('vendors').select('name').eq('id', purchase.vendor_id).maybeSingle();
    const { data: vendorCat } = await sb.from('finance_categories')
      .select('id').eq('restaurant_id', rid).eq('kind', 'expense').eq('name', 'Vendor Payment').maybeSingle();

    const { error: txErr } = await sb.from('finance_transactions').insert({
      id: newId('FTXN'), restaurant_id: rid, type: 'expense', account_id: accountId,
      category_id: vendorCat?.id ?? null,
      amount: roundedAmt,
      description: `Vendor payment — ${(vendor?.name as string) ?? purchase.vendor_id}: ${purchase.description}`,
      occurred_at: paidAt, source: 'vendor_payment', source_id: paymentId, created_by: createdBy,
    });
    if (txErr) throw txErr;

    await logFinanceAudit(sb, {
      restaurantId: rid, entityType: 'vendor_payment', entityId: paymentId, action: 'create',
      changedBy: createdBy, after: { purchaseId, amount: roundedAmt, accountId },
    });

    return NextResponse.json({ id: paymentId, purchaseStatus: newStatus, amountPaid: newAmountPaid }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/finance/vendor-payments]', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}
