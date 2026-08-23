// GET  /api/finance/transactions?restaurantId=&from=&to=&type=&accountId=&categoryId=&includeVoided=
// POST /api/finance/transactions   — create a manual income/expense/transfer/adjustment entry
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient, newId } from '@/lib/supabase-server';
import { requireAdminPin, errMsg, restaurantId, logFinanceAudit } from '@/lib/finance-server';

export const dynamic = 'force-dynamic';

function rowToTx(r: Record<string, unknown>) {
  return {
    id:                 r.id as string,
    type:               r.type as string,
    accountId:          r.account_id as string,
    transferToAccountId:(r.transfer_to_account_id as string | null) ?? undefined,
    categoryId:         (r.category_id as string | null) ?? undefined,
    amount:             Number(r.amount) || 0,
    description:        (r.description as string | null) ?? '',
    occurredAt:         r.occurred_at as string,
    source:             r.source as string,
    sourceId:           (r.source_id as string | null) ?? undefined,
    createdBy:           (r.created_by as string | null) ?? undefined,
    createdAt:          r.created_at as string,
    updatedAt:          r.updated_at as string,
    isVoided:           !!r.is_voided,
    voidedAt:           (r.voided_at as string | null) ?? undefined,
    voidedBy:           (r.voided_by as string | null) ?? undefined,
    voidedReason:       (r.voided_reason as string | null) ?? undefined,
  };
}

export async function GET(req: NextRequest) {
  const auth = await requireAdminPin(req);
  if (!auth.ok) return auth.response;
  try {
    const sb  = getServerClient();
    const url = new URL(req.url);
    const rid = restaurantId(null, url);
    const from          = url.searchParams.get('from');
    const to             = url.searchParams.get('to');
    const type           = url.searchParams.get('type');
    const accountId      = url.searchParams.get('accountId');
    const categoryId     = url.searchParams.get('categoryId');
    const includeVoided  = url.searchParams.get('includeVoided') === '1';
    const limit          = Math.min(parseInt(url.searchParams.get('limit') ?? '500'), 2000);

    let query = sb.from('finance_transactions').select('*').eq('restaurant_id', rid)
      .order('occurred_at', { ascending: false }).limit(limit);
    if (from)       query = query.gte('occurred_at', from);
    if (to)          query = query.lt('occurred_at', to);
    if (type)        query = query.eq('type', type);
    if (accountId)   query = query.or(`account_id.eq.${accountId},transfer_to_account_id.eq.${accountId}`);
    if (categoryId)  query = query.eq('category_id', categoryId);
    if (!includeVoided) query = query.eq('is_voided', false);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json((data ?? []).map(r => rowToTx(r as Record<string, unknown>)));
  } catch (err) {
    console.error('[GET /api/finance/transactions]', err);
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

    const type = String(body.type ?? '');
    if (!['income', 'expense', 'transfer', 'adjustment'].includes(type)) {
      return NextResponse.json({ error: 'type must be income, expense, transfer or adjustment' }, { status: 400 });
    }
    const accountId = String(body.accountId ?? '');
    if (!accountId) return NextResponse.json({ error: 'accountId is required' }, { status: 400 });
    const amount = Number(body.amount);
    if (!isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 });
    }
    if (type === 'transfer' && !body.transferToAccountId) {
      return NextResponse.json({ error: 'transferToAccountId is required for transfers' }, { status: 400 });
    }

    const id = newId('FTXN');
    const row = {
      id,
      restaurant_id:          rid,
      type,
      account_id:              accountId,
      transfer_to_account_id:  (body.transferToAccountId as string) ?? null,
      category_id:             (body.categoryId as string) ?? null,
      amount:                  Math.round(amount * 100) / 100,
      description:              (body.description as string) ?? null,
      occurred_at:             (body.occurredAt as string) ?? new Date().toISOString(),
      source:                  'manual',
      created_by:              (body.by as string) ?? 'Admin',
    };
    const { error } = await sb.from('finance_transactions').insert(row);
    if (error) throw error;

    await logFinanceAudit(sb, {
      restaurantId: rid, entityType: 'transaction', entityId: id, action: 'create',
      changedBy: row.created_by, after: row,
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/finance/transactions]', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}
