// GET  /api/finance/vendor-purchases?restaurantId=&vendorId=&status=
// POST /api/finance/vendor-purchases   — record goods/services received (a payable)
//
// Recording a purchase does NOT record a payment. amount_paid starts at 0 and
// status starts 'unpaid' — see /api/finance/vendor-payments for recording
// money actually paid against this purchase (supports multiple partial
// payments over time, keeping the payable open until fully paid).
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient, newId } from '@/lib/supabase-server';
import { requireAdminPin, errMsg, restaurantId, logFinanceAudit } from '@/lib/finance-server';

export const dynamic = 'force-dynamic';

function rowToPurchase(r: Record<string, unknown>) {
  return {
    id:            r.id as string,
    vendorId:      r.vendor_id as string,
    description:    r.description as string,
    amount:        Number(r.amount) || 0,
    amountPaid:    Number(r.amount_paid) || 0,
    amountDue:     Math.max(0, (Number(r.amount) || 0) - (Number(r.amount_paid) || 0)),
    purchaseDate:  r.purchase_date as string,
    status:        r.status as string,
    createdBy:     (r.created_by as string | null) ?? undefined,
    createdAt:     r.created_at as string,
    isVoided:      !!r.is_voided,
  };
}

export async function GET(req: NextRequest) {
  const auth = await requireAdminPin(req);
  if (!auth.ok) return auth.response;
  try {
    const sb  = getServerClient();
    const url = new URL(req.url);
    const rid = restaurantId(null, url);
    const vendorId = url.searchParams.get('vendorId');
    const status   = url.searchParams.get('status');

    let query = sb.from('vendor_purchases').select('*').eq('restaurant_id', rid).eq('is_voided', false);
    if (vendorId) query = query.eq('vendor_id', vendorId);
    if (status)   query = query.eq('status', status);
    const { data, error } = await query.order('purchase_date', { ascending: false });
    if (error) throw error;
    return NextResponse.json((data ?? []).map(r => rowToPurchase(r as Record<string, unknown>)));
  } catch (err) {
    console.error('[GET /api/finance/vendor-purchases]', err);
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

    const vendorId = String(body.vendorId ?? '');
    if (!vendorId) return NextResponse.json({ error: 'vendorId is required' }, { status: 400 });
    const description = String(body.description ?? '').trim();
    if (!description) return NextResponse.json({ error: 'description is required' }, { status: 400 });
    const amount = Number(body.amount);
    if (!isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 });
    }

    const id = newId('VPUR');
    const { error } = await sb.from('vendor_purchases').insert({
      id, restaurant_id: rid, vendor_id: vendorId, description,
      amount: Math.round(amount * 100) / 100,
      purchase_date: (body.purchaseDate as string) ?? new Date().toISOString(),
      status: 'unpaid',
      created_by: (body.by as string) ?? 'Admin',
    });
    if (error) throw error;

    await logFinanceAudit(sb, {
      restaurantId: rid, entityType: 'vendor_purchase', entityId: id, action: 'create',
      changedBy: (body.by as string) ?? 'Admin', after: { vendorId, description, amount },
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/finance/vendor-purchases]', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}
