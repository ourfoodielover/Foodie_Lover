// GET    /api/finance/employees/[id]  — single employee
// PATCH  /api/finance/employees/[id]  — edit / activate / deactivate
// DELETE /api/finance/employees/[id]  — hard-delete, ONLY when zero salary
//                                        history exists (rate configs and
//                                        payments both checked); otherwise
//                                        the caller must deactivate instead.
//
// Same double auth gate as every other app/api/finance/** route (admin
// session + Finance/Admin PIN) — see route.ts's header comment.
//
// IMPORTANT: this route never touches the `staff` table. Deactivating or
// deleting an employee/payroll record has zero effect on any linked staff
// login account — application access and payroll identity are deliberately
// separate (master-prompt requirement #8).
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { requireAdminPin, errMsg, restaurantId, logFinanceAudit } from '@/lib/finance-server';
import { requireRole } from '@/lib/session-server';

export const dynamic = 'force-dynamic';
type Ctx = { params: Promise<{ id: string }> };

const EMPLOYMENT_TYPES = ['full_time', 'part_time', 'contract', 'temporary'] as const;

export async function GET(req: NextRequest, ctx: Ctx) {
  const roleAuth = requireRole(req, ['admin']);
  if (!roleAuth.ok) return roleAuth.response;
  const auth = await requireAdminPin(req);
  if (!auth.ok) return auth.response;
  try {
    const { id } = await ctx.params;
    const sb = getServerClient();
    const { data, error } = await sb.from('employees').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(data);
  } catch (err) {
    console.error('[GET /api/finance/employees/[id]]', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const roleAuth = requireRole(req, ['admin']);
  if (!roleAuth.ok) return roleAuth.response;
  const auth = await requireAdminPin(req);
  if (!auth.ok) return auth.response;
  try {
    const { id } = await ctx.params;
    const sb   = getServerClient();
    const body = await req.json() as Record<string, unknown>;
    const rid  = restaurantId(body);
    const by   = (body.by as string) ?? 'Admin';

    const { data: existing, error: fetchErr } = await sb.from('employees').select('*').eq('id', id).maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!existing) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 });
      updates.name = name;
    }
    if (body.role !== undefined) {
      const role = String(body.role).trim();
      if (!role) return NextResponse.json({ error: 'role cannot be empty' }, { status: 400 });
      if (role.length > 60) return NextResponse.json({ error: 'role must be 60 characters or fewer' }, { status: 400 });
      updates.role = role;
    }
    if (body.phone !== undefined) updates.phone = (body.phone as string)?.trim() || null;
    if (body.email !== undefined) updates.email = (body.email as string)?.trim() || null;
    if (body.joiningDate !== undefined) updates.joining_date = (body.joiningDate as string) || null;
    if (body.notes !== undefined) updates.notes = (body.notes as string)?.trim() || null;
    if (body.isActive !== undefined) updates.is_active = !!body.isActive;

    if (body.employmentType !== undefined) {
      const employmentType = String(body.employmentType);
      if (!EMPLOYMENT_TYPES.includes(employmentType as typeof EMPLOYMENT_TYPES[number])) {
        return NextResponse.json({ error: `employmentType must be one of: ${EMPLOYMENT_TYPES.join(', ')}` }, { status: 400 });
      }
      updates.employment_type = employmentType;
    }

    if (body.linkedStaffId !== undefined) {
      const linkedStaffId = body.linkedStaffId ? String(body.linkedStaffId) : null;
      if (linkedStaffId) {
        const { data: staffRow } = await sb.from('staff').select('id').eq('id', linkedStaffId).eq('restaurant_id', rid).maybeSingle();
        if (!staffRow) return NextResponse.json({ error: 'Linked staff account not found' }, { status: 400 });
        const { data: already } = await sb.from('employees').select('id, name').eq('linked_staff_id', linkedStaffId).neq('id', id).maybeSingle();
        if (already) return NextResponse.json({ error: `That staff account is already linked to employee "${already.name}"` }, { status: 409 });
      }
      updates.linked_staff_id = linkedStaffId;
    }

    const { error } = await sb.from('employees').update(updates).eq('id', id);
    if (error) throw error;

    // Distinguish activate/deactivate in the audit trail from a plain edit.
    let action = 'update';
    if (body.isActive !== undefined && !!body.isActive !== !!existing.is_active) {
      action = body.isActive ? 'activate' : 'deactivate';
    }
    await logFinanceAudit(sb, {
      restaurantId: rid, entityType: 'employee', entityId: id, action,
      changedBy: by, before: existing, after: updates,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[PATCH /api/finance/employees/[id]]', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const roleAuth = requireRole(req, ['admin']);
  if (!roleAuth.ok) return roleAuth.response;
  const auth = await requireAdminPin(req);
  if (!auth.ok) return auth.response;
  try {
    const { id } = await ctx.params;
    const sb  = getServerClient();
    const url = new URL(req.url);
    const rid = restaurantId(null, url);
    const by  = url.searchParams.get('by') ?? 'Admin';

    const { data: existing, error: fetchErr } = await sb.from('employees').select('*').eq('id', id).maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!existing) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    // History guard: block destructive deletion if ANY salary rate was ever
    // configured or ANY payment was ever recorded for this employee — either
    // via employee_id directly, or (belt-and-suspenders, for rows that
    // predate migration_025's backfill) via the linked staff_id. Deactivate
    // is always available regardless — this check only gates hard DELETE.
    const linkedStaffId = existing.linked_staff_id as string | null;
    const [{ count: configCount }, { count: paymentCount }] = await Promise.all([
      sb.from('staff_salary_config').select('id', { count: 'exact', head: true })
        .or(linkedStaffId ? `employee_id.eq.${id},staff_id.eq.${linkedStaffId}` : `employee_id.eq.${id}`),
      sb.from('salary_payments').select('id', { count: 'exact', head: true })
        .or(linkedStaffId ? `employee_id.eq.${id},staff_id.eq.${linkedStaffId}` : `employee_id.eq.${id}`),
    ]);
    if ((configCount ?? 0) > 0 || (paymentCount ?? 0) > 0) {
      return NextResponse.json({
        error: 'This employee has salary rate history and/or recorded payments and cannot be deleted. Deactivate the employee instead — their records will be preserved.',
      }, { status: 409 });
    }

    const { error } = await sb.from('employees').delete().eq('id', id);
    if (error) throw error;

    await logFinanceAudit(sb, {
      restaurantId: rid, entityType: 'employee', entityId: id, action: 'delete',
      changedBy: by, before: existing,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/finance/employees/[id]]', err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}
