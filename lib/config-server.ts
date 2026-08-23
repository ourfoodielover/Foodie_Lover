// ─── Foodie Lover — Centralized Configuration Resolver ──────────────────────
// SERVER-SIDE ONLY. Never import this in a 'use client' file.
//
// Single source of truth for the priority rule used everywhere a setting can
// come from more than one place:
//
//     1. Environment variable   (highest priority — wins whenever configured)
//     2. Admin Dashboard / restaurant_settings DB   (second priority)
//     3. Application default    (final fallback)
//
// An ENV var only "counts" as configured when it is non-empty after trimming
// whitespace — an accidental `RESTAURANT_NAME=""` in Vercel must NOT blank out
// a real Admin-configured value; it should behave as if the var were unset.
//
// This module intentionally does NOT cache Admin DB reads. Every resolve*()
// call queries Supabase fresh. That is a deliberate trade-off: it guarantees
// an Admin change is reflected on the very next call (no stale-cache bugs to
// chase), matching the already-correct behaviour of `restaurants.kitchen_mode`
// elsewhere in this app. Callers that need many settings in one request should
// use `getAllAdminSettings()` once and reuse the result rather than calling a
// resolver per field.
//
// See docs/configuration-report.md for the full audit this module implements.

import { getServerClient } from './supabase-server';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ConfigSource = 'env' | 'admin' | 'default';

export interface ResolvedConfig<T> {
  value:      T;
  source:     ConfigSource;
  /** ENV var name this setting can be overridden by, for diagnostics display. */
  envVar?:    string;
  /** restaurant_settings.key (or table.column) this setting reads from Admin, for diagnostics. */
  adminKey?:  string;
  /** Raw Admin DB value, even when ENV is what's actually effective — so Admin UI
   *  can show "Admin Value: X (not active — Environment Variable is controlling this)". */
  adminValue?: T | null;
  /** Set when an ENV or Admin value existed but was invalid/unusable and was ignored. */
  warning?:   string;
}

// ─── Low-level parsing helpers (pure — no I/O, safe to unit test) ───────────

/** Treats undefined AND whitespace-only strings as "not configured". Trims the result. */
export function parseEnvString(raw: string | undefined): string | null {
  if (raw === undefined) return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

const TRUE_VALUES  = new Set(['true', '1', 'yes', 'on']);
const FALSE_VALUES = new Set(['false', '0', 'no', 'off']);

/**
 * Explicit boolean parser — NEVER use `if (process.env.X)` for a boolean-flavoured
 * setting, because the string `"false"` is truthy in JS. Supported spellings:
 * true/false, 1/0, yes/no, on/off (case-insensitive). Returns null (not configured
 * / not parseable) rather than throwing — callers fall through to the next
 * priority level and may log a warning via `warnLabel`.
 */
export function parseBoolean(raw: string | null | undefined, warnLabel?: string): boolean | null {
  if (raw === null || raw === undefined) return null;
  const v = raw.trim().toLowerCase();
  if (v.length === 0) return null;
  if (TRUE_VALUES.has(v))  return true;
  if (FALSE_VALUES.has(v)) return false;
  if (warnLabel) {
    console.warn(
      `[config] ${warnLabel}: unrecognized boolean value "${raw}" ` +
      `(expected true/false/1/0/yes/no/on/off) — ignoring and falling back.`,
    );
  }
  return null;
}

/**
 * Safe numeric parser. An invalid value (e.g. "abc") NEVER propagates as NaN —
 * it returns null and logs a warning via `warnLabel`, so callers fall back to
 * the next priority level instead of silently breaking downstream comparisons
 * (a `total < NaN` check is always false, which would have been a silent
 * "everyone qualifies" bug for a minimum-order-amount setting, for example).
 */
export function parseNumber(raw: string | null | undefined, warnLabel?: string): number | null {
  if (raw === null || raw === undefined) return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) {
    if (warnLabel) {
      console.warn(`[config] ${warnLabel}: invalid numeric value "${raw}" — ignoring and falling back.`);
    }
    return null;
  }
  return n;
}

// ─── Admin DB access (restaurant_settings) ───────────────────────────────────

const DEFAULT_RESTAURANT_ID = () => parseEnvString(process.env.NEXT_PUBLIC_RESTAURANT_ID) ?? 'rest_default';

/** Reads every restaurant_settings row for one restaurant as a flat { key: value } map. */
export async function getAllAdminSettings(restaurantId?: string): Promise<Record<string, string>> {
  const rid = restaurantId ?? DEFAULT_RESTAURANT_ID();
  try {
    const sb = getServerClient();
    const { data, error } = await sb
      .from('restaurant_settings')
      .select('key, value')
      .eq('restaurant_id', rid);
    if (error) throw error;
    const map: Record<string, string> = {};
    (data ?? []).forEach(r => { map[r.key as string] = r.value as string; });
    return map;
  } catch (err) {
    console.error('[config] getAllAdminSettings failed — treating Admin DB as empty for this call:', err);
    return {};
  }
}

/** Reads a single restaurant_settings row. Returns null if absent or on DB error. */
export async function getAdminSetting(key: string, restaurantId?: string): Promise<string | null> {
  const rid = restaurantId ?? DEFAULT_RESTAURANT_ID();
  try {
    const sb = getServerClient();
    const { data, error } = await sb
      .from('restaurant_settings')
      .select('value')
      .eq('restaurant_id', rid)
      .eq('key', key)
      .maybeSingle();
    if (error) throw error;
    return (data?.value as string | undefined) ?? null;
  } catch (err) {
    console.error(`[config] getAdminSetting(${key}) failed — treating as not configured:`, err);
    return null;
  }
}

// ─── Generic resolvers (ENV > Admin > Default) ───────────────────────────────
// Building blocks used by the setting-specific resolvers below. Exported in
// case a future Category-A setting needs the same shape without a bespoke
// function — but prefer adding a named resolver (like resolveRestaurantName)
// for anything with real consumers, so the envVar/adminKey names are documented
// in one place instead of re-typed at every call site.

export function resolveStringFromEnvAndValue(opts: {
  envVar:       string;
  adminValue:   string | null;
  defaultValue: string;
  adminKey?:    string;
}): ResolvedConfig<string> {
  const envRaw = parseEnvString(process.env[opts.envVar]);
  if (envRaw !== null) {
    return {
      value: envRaw, source: 'env', envVar: opts.envVar, adminKey: opts.adminKey,
      adminValue: opts.adminValue,
    };
  }
  if (opts.adminValue !== null && opts.adminValue.trim() !== '') {
    return {
      value: opts.adminValue, source: 'admin', envVar: opts.envVar, adminKey: opts.adminKey,
      adminValue: opts.adminValue,
    };
  }
  return {
    value: opts.defaultValue, source: 'default', envVar: opts.envVar, adminKey: opts.adminKey,
    adminValue: opts.adminValue,
  };
}

// ─── Setting-specific resolvers ───────────────────────────────────────────────
// These are what the rest of the app should call. Each documents the exact
// ENV var + Admin key it reads, matching docs/configuration-report.md.

/**
 * Restaurant display name — shown in AI chat replies, transactional emails,
 * Spin & Win invites, and the /spin customer page.
 *   ENV:     RESTAURANT_NAME
 *   Admin:   restaurant_settings.restaurant_name
 *   Default: 'Foodie Lover'
 */
export async function resolveRestaurantName(restaurantId?: string): Promise<ResolvedConfig<string>> {
  const adminValue = await getAdminSetting('restaurant_name', restaurantId);
  return resolveStringFromEnvAndValue({
    envVar: 'RESTAURANT_NAME', adminValue, defaultValue: 'Foodie Lover', adminKey: 'restaurant_name',
  });
}

/**
 * Restaurant tenant ID — selects which `restaurants` row (and therefore which
 * realtime channel) this deployment talks to. Deliberately ENV + Default only:
 * changing which tenant a deployment serves is an infrastructure decision, not
 * an Admin-editable business setting, and it must also be readable from client
 * components for realtime channel identity — so it stays NEXT_PUBLIC_* and is
 * read directly via `process.env.NEXT_PUBLIC_RESTAURANT_ID` at call sites
 * (client and server) rather than through this server-only resolver.
 *   ENV:     NEXT_PUBLIC_RESTAURANT_ID
 *   Admin:   none (not applicable)
 *   Default: 'rest_default'
 */
export function resolveRestaurantId(): ResolvedConfig<string> {
  const envRaw = parseEnvString(process.env.NEXT_PUBLIC_RESTAURANT_ID);
  return envRaw !== null
    ? { value: envRaw, source: 'env', envVar: 'NEXT_PUBLIC_RESTAURANT_ID' }
    : { value: 'rest_default', source: 'default', envVar: 'NEXT_PUBLIC_RESTAURANT_ID' };
}

/**
 * Kitchen routing mode — 'ask' | 'printer' | 'kitchen_display'. Already lived
 * correctly in `restaurants.kitchen_mode` with no ENV involved (an operational
 * setting per the "don't add unnecessary ENV overrides" rule); exposed here
 * only so Admin diagnostics has one place to read every setting's source from.
 *   ENV:     none
 *   Admin:   restaurants.kitchen_mode
 *   Default: 'ask'
 */
export async function resolveKitchenMode(restaurantId?: string): Promise<ResolvedConfig<string>> {
  const rid = restaurantId ?? DEFAULT_RESTAURANT_ID();
  try {
    const sb = getServerClient();
    const { data } = await sb.from('restaurants').select('kitchen_mode').eq('id', rid).single();
    const adminValue = (data?.kitchen_mode as string | undefined) ?? null;
    return adminValue
      ? { value: adminValue, source: 'admin', adminKey: 'restaurants.kitchen_mode', adminValue }
      : { value: 'ask', source: 'default', adminKey: 'restaurants.kitchen_mode', adminValue: null };
  } catch (err) {
    console.error('[config] resolveKitchenMode failed — using default:', err);
    return { value: 'ask', source: 'default', adminKey: 'restaurants.kitchen_mode', adminValue: null };
  }
}

// ─── Secret presence checks (Category C) ─────────────────────────────────────
// Diagnostics must NEVER show a secret's value — only whether it's configured.

export const SECRET_ENV_VARS = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'RESEND_API_KEY',
  'GEMINI_API_KEY',
  'CRON_SECRET',
  'PRINT_AGENT_KEY',
  'ADMIN_PIN',    // first-run seed only — see resolveAdminPinSeedStatus doc below
  'KITCHEN_PIN',
  'MANAGER_PIN',
] as const;

export function isSecretConfigured(envVar: string): boolean {
  return parseEnvString(process.env[envVar]) !== null;
}

// ─── Diagnostics aggregate ────────────────────────────────────────────────────
// Powers GET /api/admin/config-diagnostics. Never includes a secret's value.

export interface ConfigDiagnosticEntry {
  label:      string;
  value:      string;
  source:     ConfigSource;
  envVar?:    string;
  adminKey?:  string;
  /** Present + non-null only when source !== 'admin', so the UI can show the
   *  "shadowed" Admin value alongside the note that ENV is what's active. */
  adminValueShadowed?: string | null;
}

export interface SecretDiagnosticEntry {
  label:      string;
  envVar:     string;
  configured: boolean;
}

export async function getConfigDiagnostics(restaurantId?: string): Promise<{
  settings: ConfigDiagnosticEntry[];
  secrets:  SecretDiagnosticEntry[];
}> {
  const rid = restaurantId ?? DEFAULT_RESTAURANT_ID();

  const [nameResolved, kitchenResolved] = await Promise.all([
    resolveRestaurantName(rid),
    resolveKitchenMode(rid),
  ]);
  const idResolved = resolveRestaurantId();

  function toEntry(label: string, r: ResolvedConfig<string>): ConfigDiagnosticEntry {
    return {
      label, value: r.value, source: r.source, envVar: r.envVar, adminKey: r.adminKey,
      adminValueShadowed: r.source !== 'admin' ? (r.adminValue ?? null) : null,
    };
  }

  const settings: ConfigDiagnosticEntry[] = [
    toEntry('Restaurant Name', nameResolved),
    toEntry('Kitchen Routing Mode', kitchenResolved),
    toEntry('Restaurant / Tenant ID', idResolved),
  ];

  const secrets: SecretDiagnosticEntry[] = [
    { label: 'Supabase Service Role Key', envVar: 'SUPABASE_SERVICE_ROLE_KEY', configured: isSecretConfigured('SUPABASE_SERVICE_ROLE_KEY') },
    { label: 'Resend API Key',            envVar: 'RESEND_API_KEY',           configured: isSecretConfigured('RESEND_API_KEY') },
    { label: 'Gemini AI API Key',         envVar: 'GEMINI_API_KEY',           configured: isSecretConfigured('GEMINI_API_KEY') },
    { label: 'Cron Secret',               envVar: 'CRON_SECRET',              configured: isSecretConfigured('CRON_SECRET') },
    { label: 'Print Agent Key',           envVar: 'PRINT_AGENT_KEY',          configured: isSecretConfigured('PRINT_AGENT_KEY') },
    { label: 'From Email (sender address)', envVar: 'FROM_EMAIL',             configured: isSecretConfigured('FROM_EMAIL') },
  ];

  return { settings, secrets };
}
