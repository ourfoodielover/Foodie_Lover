/**
 * POST /api/admin/spin-rewards/import
 *
 * Two-phase CSV bulk import:
 *
 * Phase 1 — Preview  (confirm: false)
 *   Body: { rows: Record<string,string>[], confirm: false }
 *   Validates all rows, returns a preview with per-row actions (CREATE / UPDATE / NO CHANGE / ERROR).
 *   No DB writes. Returns preview even when errors exist so admin can review them.
 *
 * Phase 2 — Execute  (confirm: true)
 *   Body: { rows: Record<string,string>[], confirm: true }
 *   Re-validates every row. Aborts entirely if any row has an error.
 *   Otherwise executes all inserts/updates (best-effort — pre-validation rules out most races).
 *
 * CSV format (header row required):
 *   id,label,type,value,weight,max_discount,daily_win_limit,min_next_order,expires_days,active
 *
 * Notes:
 *   - id: leave blank to create new; supply existing id to update
 *   - daily_win_limit = 0 means unlimited (stored as NULL in DB)
 *   - max_discount is required for type=percent
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient, newId } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
const RID = process.env.NEXT_PUBLIC_RESTAURANT_ID ?? 'rest_default';

type CsvRow = Record<string, string>;

interface SpinRewardDb {
  id: string;
  label: string;
  reward_type: string;
  reward_value: number;
  weight: number;
  max_discount: number | null;
  daily_win_limit: number | null;
  min_next_order: number;
  expires_days: number;
  active: boolean;
}

interface PreviewRow {
  action: 'CREATE' | 'UPDATE' | 'NO CHANGE' | 'ERROR';
  id?: string;            // existing DB id (for UPDATE)
  label: string;
  type: string;
  value: number;
  max_discount: number | null;
  daily_win_limit: number | null;
  weight: number;
  chance: string;         // "12.5%" — computed from total weight
  min_next_order: number;
  expires_days: number;
  active: boolean;
  error?: string;
}

function parseNum(s: string | undefined, fallback: number): number {
  if (s === undefined || s === '') return fallback;
  const n = Number(s);
  return isNaN(n) ? fallback : n;
}

function parseBool(s: string | undefined, fallback: boolean): boolean {
  if (s === undefined || s === '') return fallback;
  const lower = s.trim().toLowerCase();
  return lower === 'true' || lower === '1' || lower === 'yes';
}

function validateAndParse(
  row: CsvRow,
  rowNum: number,
): { ok: true; parsed: Omit<PreviewRow, 'chance' | 'action' | 'id'> & { rawId: string } } | { ok: false; parsed: Omit<PreviewRow, 'chance' | 'action' | 'id'> & { rawId: string }; errors: string[] } {
  const label = (row['label'] ?? '').trim();
  const type  = (row['type']  ?? '').trim();
  const rawId = (row['id']    ?? '').trim();

  const value          = parseNum(row['value'],          0);
  const weight         = parseNum(row['weight'],         1);
  const min_next_order = parseNum(row['min_next_order'], 0);
  const expires_days   = parseNum(row['expires_days'],   30) || 30;
  const active         = parseBool(row['active'],        true);

  // max_discount: empty or '0' → null (no cap)
  const rawMD = (row['max_discount'] ?? '').trim();
  const max_discount = (rawMD === '' || rawMD === '0') ? null : parseNum(rawMD, 0);

  // daily_win_limit: '0' or empty → null (unlimited)
  const rawDL = (row['daily_win_limit'] ?? '').trim();
  const dailyRaw = parseNum(rawDL, 0);
  const daily_win_limit = dailyRaw === 0 ? null : dailyRaw;

  const parsed = { rawId, label, type, value, max_discount, daily_win_limit, weight, min_next_order, expires_days, active };

  const errs: string[] = [];
  if (!label)        errs.push(`Row ${rowNum}: label is required`);

  const VALID_TYPES = ['percent', 'fixed', 'free_item', 'no_reward'];
  if (!VALID_TYPES.includes(type)) errs.push(`Row ${rowNum}: type must be one of: ${VALID_TYPES.join(', ')}`);

  if (type === 'percent') {
    if (value <= 0 || value > 100) errs.push(`Row ${rowNum}: percent value must be 1–100, got ${value}`);
    if (!max_discount)              errs.push(`Row ${rowNum}: max_discount (₹) is required for percent rewards`);
  }
  if (type === 'fixed' && value <= 0) errs.push(`Row ${rowNum}: fixed amount must be > 0, got ${value}`);
  if (weight < 0) errs.push(`Row ${rowNum}: weight cannot be negative`);

  if (errs.length > 0) return { ok: false, parsed, errors: errs };
  return { ok: true, parsed };
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { rows: CsvRow[]; confirm: boolean };
  const { rows, confirm } = body;

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'No rows provided' }, { status: 400 });
  }

  const sb = getServerClient();

  // Load existing non-archived rewards for action classification
  const { data: existing } = await sb
    .from('spin_rewards')
    .select('id,label,reward_type,reward_value,weight,max_discount,daily_win_limit,min_next_order,expires_days,active')
    .eq('restaurant_id', RID)
    .neq('archived', true);

  const byId    = new Map<string, SpinRewardDb>((existing ?? []).map((r: SpinRewardDb) => [r.id, r]));
  const byLabel = new Map<string, SpinRewardDb>((existing ?? []).map((r: SpinRewardDb) => [r.label.toLowerCase().trim(), r]));

  // ── Parse & validate ─────────────────────────────────────────────────────────
  const allErrors: string[] = [];
  const preview: PreviewRow[] = [];
  let totalValidWeight = 0;

  for (let i = 0; i < rows.length; i++) {
    const result = validateAndParse(rows[i], i + 2); // +2: 1-indexed + header row
    const { parsed } = result;

    if (!result.ok) {
      allErrors.push(...result.errors);
      preview.push({
        action: 'ERROR',
        label: parsed.label || `Row ${i + 2}`,
        type: parsed.type,
        value: parsed.value,
        max_discount: parsed.max_discount,
        daily_win_limit: parsed.daily_win_limit,
        weight: parsed.weight,
        chance: '—',
        min_next_order: parsed.min_next_order,
        expires_days: parsed.expires_days,
        active: parsed.active,
        error: result.errors.join('; '),
      });
      continue;
    }

    // Classify action
    let matched: SpinRewardDb | undefined;
    if (parsed.rawId && byId.has(parsed.rawId)) {
      matched = byId.get(parsed.rawId);
    } else if (!parsed.rawId) {
      matched = byLabel.get(parsed.label.toLowerCase());
    }

    let action: 'CREATE' | 'UPDATE' | 'NO CHANGE';
    if (!matched) {
      action = 'CREATE';
    } else {
      const changed = (
        matched.label               !== parsed.label  ||
        matched.reward_type         !== parsed.type   ||
        Number(matched.reward_value) !== parsed.value ||
        matched.weight              !== parsed.weight ||
        (matched.max_discount != null ? Number(matched.max_discount) : null) !== parsed.max_discount ||
        matched.daily_win_limit     !== parsed.daily_win_limit ||
        matched.min_next_order      !== parsed.min_next_order ||
        matched.expires_days        !== parsed.expires_days ||
        matched.active              !== parsed.active
      );
      action = changed ? 'UPDATE' : 'NO CHANGE';
    }

    totalValidWeight += parsed.weight;
    preview.push({
      action,
      id:     matched?.id,
      label:  parsed.label,
      type:   parsed.type,
      value:  parsed.value,
      max_discount:    parsed.max_discount,
      daily_win_limit: parsed.daily_win_limit,
      weight: parsed.weight,
      chance: '—',   // filled in below
      min_next_order: parsed.min_next_order,
      expires_days:   parsed.expires_days,
      active: parsed.active,
    });
  }

  // Compute probability percentages for valid rows
  if (totalValidWeight > 0) {
    for (const row of preview) {
      if (row.action !== 'ERROR') {
        row.chance = `${((row.weight / totalValidWeight) * 100).toFixed(1)}%`;
      }
    }
  }

  const newCount      = preview.filter(r => r.action === 'CREATE').length;
  const updateCount   = preview.filter(r => r.action === 'UPDATE').length;
  const noChangeCount = preview.filter(r => r.action === 'NO CHANGE').length;
  const errorCount    = allErrors.length;

  // ── Phase 1: preview-only ────────────────────────────────────────────────────
  if (!confirm || errorCount > 0) {
    return NextResponse.json({
      totalRows:    rows.length,
      newCount,
      updateCount,
      noChangeCount,
      errorCount,
      errors: allErrors,
      rows: preview,
    });
  }

  // ── Phase 2: execute ─────────────────────────────────────────────────────────
  // Re-validate passed (no errors above). Execute all creates and updates.
  let created = 0;
  let updated = 0;
  const execErrors: string[] = [];

  for (const row of preview) {
    if (row.action === 'NO CHANGE' || row.action === 'ERROR') continue;

    const payload = {
      label:           row.label,
      reward_type:     row.type,
      reward_value:    row.value,
      weight:          row.weight,
      max_discount:    row.max_discount,
      daily_win_limit: row.daily_win_limit,
      min_next_order:  row.min_next_order,
      expires_days:    row.expires_days,
      active:          row.active,
    };

    if (row.action === 'CREATE') {
      const { error } = await sb.from('spin_rewards').insert({
        id:                       newId('RWD'),
        restaurant_id:            RID,
        archived:                 false,
        sort_order:               0,
        monthly_win_limit:        null,
        bogo_eligible_items:      [],
        bogo_eligible_categories: [],
        max_free_item_value:      null,
        ...payload,
      });
      if (error) { execErrors.push(`Failed to create "${row.label}": ${error.message}`); }
      else { created++; }
    } else if (row.action === 'UPDATE' && row.id) {
      const { error } = await sb
        .from('spin_rewards')
        .update(payload)
        .eq('id', row.id);
      if (error) { execErrors.push(`Failed to update "${row.label}": ${error.message}`); }
      else { updated++; }
    }
  }

  if (execErrors.length > 0) {
    return NextResponse.json(
      { error: `Import partially failed: ${execErrors.join('; ')}`, created, updated },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, created, updated });
}
