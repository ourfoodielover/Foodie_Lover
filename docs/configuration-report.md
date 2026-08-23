# Configuration Resolution Audit & Fix — Implementation Report

Foodie Lover POS · 2026-08-23

---

## 1. Every ENV variable found in the repository

| Variable | Type |
|---|---|
| `RESTAURANT_NAME` | Server, non-secret |
| `NEXT_PUBLIC_RESTAURANT_NAME` | Client (build-time), **found broken/unset — fixed, see §16** |
| `NEXT_PUBLIC_RESTAURANT_ID` | Client + server (build-time for client) |
| `NEXT_PUBLIC_APP_URL` | Client + server (build-time for client) |
| `NEXT_PUBLIC_SUPABASE_URL` | Client + server (build-time for client) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client (build-time), public-by-design |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only, **secret** |
| `FROM_EMAIL` | Server-only, non-secret but infra-bound |
| `RESEND_API_KEY` | Server-only, **secret** |
| `GEMINI_API_KEY` | Server-only, **secret** |
| `CRON_SECRET` | Server-only, **secret** |
| `PRINT_AGENT_KEY` | Server-only, **secret** (also used by the separate print-agent process) |
| `ADMIN_PIN` / `KITCHEN_PIN` / `MANAGER_PIN` | Server-only, first-run seed only (see §7) |
| `APP_ENV` | Server-only, diagnostics-only (falls back to `NODE_ENV`) |
| `NODE_ENV` | Standard Next.js runtime var, unmodified |
| `PRINTER_TYPE`, `PRINTER_NAME`, `PRINTER_DEV`, `PRINTER_IP`, `PRINTER_PORT`, `PRINTER_CHARS_PER_LINE`, `PRINTER_STATION_ID`, `MAX_ATTEMPTS`, `RESTAURANT_ID`, `POLL_INTERVAL_MS`, `APP_BASE_URL` (print-agent's own copy) | **Separate standalone process** (`print-agent/index.js`), not part of this Next.js deployment — see §16 |

## 2. Where each ENV variable is currently used

- `RESTAURANT_NAME` — was scattered across `lib/email-server.ts` (module constant closed over by ~20 email templates), `app/api/ai/chat/route.ts`, `app/api/rewards/spin-invite/route.ts` (two separate declarations in one file). Now resolved once per use via `resolveRestaurantName()` in `lib/config-server.ts`.
- `NEXT_PUBLIC_RESTAURANT_NAME` — was read once in `app/spin/page.tsx`, but this variable was never actually set anywhere (only the server-side `RESTAURANT_NAME` was configured), so that page always silently fell back to `'Foodie Lover'` regardless of what `RESTAURANT_NAME` was set to. Fixed — see §16.
- `NEXT_PUBLIC_RESTAURANT_ID` — used in ~20 files (both client components for realtime channel identity, and server routes/libs for scoping every Supabase query to one restaurant). Unchanged — see §3 classification.
- `NEXT_PUBLIC_APP_URL` — used in `lib/email-server.ts` (tracking/spin links), `lib/api.ts` (server-side fetch base URL), `app/api/rewards/spin-invite/route.ts`. Unchanged.
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — `lib/supabase.ts` (browser Supabase client). Unchanged.
- `SUPABASE_SERVICE_ROLE_KEY` / `NEXT_PUBLIC_SUPABASE_URL` (server copy) — `lib/supabase-server.ts` (server Supabase client, service-role). Unchanged; never touches the browser.
- `FROM_EMAIL` — `lib/email.ts`'s `sendEmail()`, the single low-level Resend wrapper. Unchanged — deliberately ENV-only (see §16 for why).
- `RESEND_API_KEY` — `lib/email.ts`, `lib/email-server.ts` (diagnostics logging), `app/api/email/diagnostics`. Unchanged.
- `GEMINI_API_KEY` — `app/api/ai/chat/route.ts`. Unchanged.
- `CRON_SECRET` — `app/api/email/process-queue/route.ts` (bearer-token auth check). Unchanged.
- `PRINT_AGENT_KEY` — `app/api/print-jobs/route.ts`, `app/api/print-jobs/[id]/route.ts` (auth check for the companion print agent). Unchanged.
- `ADMIN_PIN` / `KITCHEN_PIN` / `MANAGER_PIN` — `app/api/init/route.ts`, first-run seed into `restaurant_settings` only. Unchanged.

## 3. Classification: ENV-only / ENV+Admin / Admin-only

**A. ENV + Admin + Default** (ENV wins when configured):
- Restaurant display name (`RESTAURANT_NAME` / `restaurant_settings.restaurant_name` / `'Foodie Lover'`) — the only setting that genuinely needed this treatment and had real, active consumers.

**B. Admin + Default only** (no ENV, per the "don't over-add ENV to operational settings" rule):
- Kitchen routing mode (`restaurants.kitchen_mode`) — already correct before this work.
- Spin & Win config (`spin_config` table: enabled, min_order_amount, eligible order types, require email/phone) — already correct; numeric parsing hardened (§9, §16).
- Offers/coupon rules (`offers` table) — already correct.
- Owner PIN, security question/answer — Admin-only, no ENV, no meaningful default for the answer.
- Tax rate, currency, currency symbol, delivery/pickup/online-ordering/table-ordering toggles, email notifications toggle, WhatsApp number, service charge, waiter call cooldown, receipt-email-from override — all exist as seeded `restaurant_settings` rows but have **zero current consumers** anywhere in the business logic (confirmed by full-repo search). Not wired to any behavior in this fix — see §16.

**C. ENV-only** (secrets/infrastructure, never Admin-editable):
- `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `GEMINI_API_KEY`, `CRON_SECRET`, `PRINT_AGENT_KEY` — true secrets.
- `NEXT_PUBLIC_RESTAURANT_ID`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — infrastructure/deployment identity, not secret, but not meaningfully Admin-editable (see §16 for why each stays this way).
- `FROM_EMAIL` — not secret, but deliberately ENV-only: `lib/email.ts` already documented (before this fix) that the sender address must never have a DB fallback, because Resend requires the address to be on a verified domain — an Admin-typed address could silently break all email delivery. Left exactly as-is.
- `ADMIN_PIN` / `KITCHEN_PIN` / `MANAGER_PIN` — special case, see §7.

## 4. Every Admin setting that participates in fallback

Only **`restaurant_settings.restaurant_name`** participates in the ENV > Admin > Default fallback chain today (Category A). `restaurants.kitchen_mode` and the `spin_config` table participate in an Admin > Default chain with no ENV layer (Category B, already correct, unchanged). Every other `restaurant_settings` key exists but has no consumer to "fall back" into yet — see §16.

## 5. Central configuration resolver files created/modified

**New:** `lib/config-server.ts` — the single centralized resolver. Exports:
- Pure parsing helpers: `parseEnvString`, `parseBoolean`, `parseNumber` (trims whitespace, treats empty ENV as "not configured", never lets an invalid boolean/number silently propagate as a wrong value — logs a warning and returns `null` so the caller falls through to the next priority level).
- DB access: `getAdminSetting(key)`, `getAllAdminSettings()` — read `restaurant_settings` fresh, no caching (see §9).
- Named resolvers: `resolveRestaurantName()` (Category A), `resolveRestaurantId()` (ENV+Default, sync), `resolveKitchenMode()` (Category B, for diagnostics).
- Secret presence checks: `isSecretConfigured()`, `SECRET_ENV_VARS`.
- `getConfigDiagnostics()` — the aggregate used by the new diagnostics API route.

**New:** `app/api/admin/config-diagnostics/route.ts` — thin GET wrapper around `getConfigDiagnostics()`.

## 6. Exact precedence implementation

```
value = parseEnvString(process.env[ENV_VAR])       // trims; "" or unset → null
     ?? (adminRow && adminRow.trim() !== '' ? adminRow : null)
     ?? APPLICATION_DEFAULT
```
Implemented once in `resolveStringFromEnvAndValue()` and reused by every Category-A resolver, so no call site hand-rolls `process.env.X || settings.x || default` anymore for restaurant name. Boolean/numeric settings (currently only the already-DB-only `spin_config.min_order_amount`) go through `parseNumber()` the same way, with a safe `?? 0` fallback and a `console.warn` on invalid input instead of propagating `NaN`.

## 7. Which variables require redeployment when changed

**All of them, on Vercel — this is a platform fact, not something this fix can change.** Vercel bakes environment variables into each deployment; changing a value in the dashboard does not affect an already-running deployment, server function or otherwise. **Every ENV var change requires triggering a new deployment** before it takes effect. Locally, `next dev` reads `.env.local` once at startup, so a local change requires restarting the dev server. This was almost certainly the actual cause of "changing an env var doesn't always take effect" — not a code bug, but the expected Vercel/Next.js redeploy requirement not being obvious. There are two ENV vars where this bites twice as hard:

- **`NEXT_PUBLIC_*` variables** (`NEXT_PUBLIC_RESTAURANT_ID`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) are additionally **inlined as literal strings into the client JavaScript bundle at build time**. They are not just "unavailable until redeploy" — the old value is physically baked into every page the browser downloads until a new build replaces those files. There is no server-side code path that can make these dynamic; if you need one of these to be Admin-changeable, it must be re-architected as a server-resolved value returned from an API (exactly what was done for restaurant name — see §16 for why `NEXT_PUBLIC_APP_URL`/`NEXT_PUBLIC_RESTAURANT_ID` specifically were *not* given this treatment).
- **`RESTAURANT_NAME`** no longer has this problem at all after this fix — since it's now resolved fresh from the DB on every use (with ENV still winning when set), you can change it via the Admin dashboard and see it reflected on the very next email/AI-chat reply/spin invite, with **zero redeploy needed**. Only changing the *ENV var itself* (to override Admin) requires a redeploy — consistent with the platform-wide rule above.

**Special note — `ADMIN_PIN` / `KITCHEN_PIN` / `MANAGER_PIN`:** these deliberately do **not** follow "ENV always wins" (see §7 below the table)... actually see the dedicated note right here since it's asked about "deployment behavior" too: these are seeded into `restaurant_settings` **once**, on the very first `/api/init` call after a fresh database. After that first seed, the Admin dashboard is authoritative forever — redeploying with a *different* `ADMIN_PIN` value in Vercel has **no effect** on an already-initialized restaurant. This is intentional (see the reasoning below) and was **not** changed by this fix.

## 8. Which Admin changes work dynamically (no redeploy)

- **Restaurant Name** — now dynamic. Change it in Supabase (`restaurant_settings.restaurant_name`) via the Admin panel (once a save UI is wired to `PATCH /api/settings` — the read/diagnostic side is done in this fix; see §16) and the very next email, AI chat reply, or Spin & Win invite uses it — no redeploy, no cache to clear. This only applies when `RESTAURANT_NAME` ENV var is *not* set; if it is set, ENV wins and Admin changes are inert until the ENV var is removed (the diagnostics panel makes this visible, see §9 below / §11).
- **Kitchen routing mode** — already dynamic before this fix (polled every 5s by waiter/kitchen/admin dashboards); unchanged.
- **Spin & Win config, offers/coupons** — already dynamic before this fix; unchanged, numeric handling hardened.
- **Everything else in `restaurant_settings`** — not yet wired to any behavior (see §16), so "dynamic" doesn't yet apply to them; they're visible in the diagnostics panel for completeness but not functionally live.

## 9. Caching changes made

**None were needed — audited and confirmed already correct:**
- Every single API route in the app already declares `export const dynamic = 'force-dynamic'` (verified across all 74 route files) — no Next.js route-level caching or ISR issue exists anywhere in this app.
- Only `app/api/menu/route.ts` sets an explicit `Cache-Control` header (60s, for menu items) — unrelated to configuration, untouched.
- The resolver (`lib/config-server.ts`) **deliberately does not cache** Admin DB reads in-process. Every `resolve*()` call queries Supabase fresh. This guarantees an Admin change is visible on the very next call — no stale in-memory cache to invalidate, no TTL to reason about. The trade-off (one extra DB round-trip per resolution) is acceptable given these resolvers are called at points like "an email is being sent" or "an AI chat reply is being generated," not on a hot per-render path.
- The client-side polling pattern that already existed for `kitchen_mode` (5s interval on waiter/kitchen/admin dashboards) and for `restaurant_settings` (5s interval inside the Admin dashboard's `refresh()`) continues to work exactly as before and now also covers the new diagnostics panel (refetched every time the Staff/Settings tab is opened).
- No `localStorage`/`sessionStorage` caches any of the settings this fix touches. (One unrelated dead `localStorage['fl_whatsapp_number']` key exists from an old code path — noted in §16, not touched.)

## 10. How client/server configuration is handled

The resolver (`lib/config-server.ts`) is explicitly server-only (matches the existing `-server.ts` naming convention used by `supabase-server.ts`, `finance-server.ts`, `email-server.ts`) and is never imported from a `'use client'` file. Where a client component needs a resolved, Admin-overridable value — today, only the restaurant name on `app/spin/page.tsx` — it fetches the already-resolved value from a server API (`GET /api/admin/restaurant-config`, extended to also return `restaurant_name` alongside its existing `kitchen_mode` field) rather than reading a `NEXT_PUBLIC_*` variable. This matches the explicit instruction not to make everything `NEXT_PUBLIC_*` to solve dynamic-config problems. `NEXT_PUBLIC_RESTAURANT_ID` and `NEXT_PUBLIC_APP_URL` remain read directly via `process.env` at their existing call sites (client and server) because they are infrastructure identifiers, not Admin-editable business settings — see §16 for the full reasoning.

## 11. How secrets are protected

- `lib/config-server.ts` exposes `isSecretConfigured(envVar)`, which returns only a boolean — it never reads or returns the actual value.
- `getConfigDiagnostics()` / `GET /api/admin/config-diagnostics` returns, for each of `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `GEMINI_API_KEY`, `CRON_SECRET`, `PRINT_AGENT_KEY`, and `FROM_EMAIL`: `{ label, envVar, configured: true|false }` — never a value.
- The Admin UI's new "Configuration" card renders secrets as "✅ Configured" / "❌ Not Set" only, exactly matching the spec's required format, with the raw env var name shown (e.g. `RESEND_API_KEY`) but never its value.
- `SUPABASE_SERVICE_ROLE_KEY` in particular was re-verified to be read only inside `lib/supabase-server.ts` (server-only module, never imported client-side) — untouched by this fix.
- This report does not, and the code does not, ever log a secret's value — the pre-existing `lib/email.ts` startup diagnostic already masked the Resend key (`re_ab***xyz`-style) before this fix, and that logic is untouched.

## 12. Existing files modified

- `lib/email-server.ts` — removed the module-level `RESTAURANT_NAME` constant (which was fixed at server-cold-start time and could never see an Admin change); the five internal `buildXHtml()` helpers now take a `restaurantName` parameter instead, and each of the seven public `sendXEmail`/`triggerXFor` functions resolves it fresh via `resolveRestaurantName()` before use. `APP_BASE_URL` untouched (correctly ENV-only — see §16). No external function signatures changed.
- `app/api/ai/chat/route.ts` — `buildSystemPrompt()` now takes `restaurantName` as a parameter instead of reading `process.env.RESTAURANT_NAME` directly; the route handler resolves it via `resolveRestaurantName()`.
- `app/api/rewards/spin-invite/route.ts` — both the module's own `buildResultSummaryHtml()` helper and the main POST handler now resolve restaurant name via the centralized resolver instead of two separate `process.env.RESTAURANT_NAME ?? 'Foodie Lover'` literals; `min_order_amount` now goes through the safe numeric parser.
- `app/api/rewards/eligibility/route.ts` — `min_order_amount` now goes through the safe numeric parser (both the tab-based and order-based eligibility checks) instead of an unchecked `Number()` that could silently resolve to `NaN` and bypass the minimum-order gate entirely on corrupted data.
- `app/api/rewards/spin-verify/route.ts` — same numeric hardening, both code paths.
- `app/spin/page.tsx` — removed the module-level `NEXT_PUBLIC_RESTAURANT_NAME` read (which was always falling back to `'Foodie Lover'` since that env var was never actually set anywhere); now fetches the resolved name from `GET /api/admin/restaurant-config` on mount and stores it in React state, matching the "resolve server-side, expose via API" pattern instead of a broken client env var.
- `app/api/admin/restaurant-config/route.ts` — GET now also returns `restaurant_name` (resolved) alongside the existing `kitchen_mode`; fully additive, existing consumers (waiter/kitchen/admin dashboards reading `d.kitchen_mode`) are unaffected.
- `app/api/init/route.ts` — normalized the seed key names for delivery/pickup toggles to match `migration_008.sql`'s already-established names (`delivery_enabled`/`pickup_enabled` instead of the divergent `allow_delivery`/`allow_pickup` this route was seeding before) — a genuine duplicated-configuration bug found during the audit (see §3/§16). Also added the missing `currency_symbol` and `online_ordering` keys so this route's seed list is a superset consistent with the migration's. This only affects rows seeded from now on; it does not touch or delete any already-existing rows on a live database (see §16 for an optional cleanup script).
- `app/admin/page.tsx` — added the "⚙️ Configuration" diagnostics card (Staff/Settings tab), its supporting state, and a fetch effect that reloads diagnostics every time that tab is opened. Purely additive; no existing state, effect, or render path was changed.

## 13. New files created

- `lib/config-server.ts` — the centralized resolver (see §5).
- `app/api/admin/config-diagnostics/route.ts` — diagnostics API (see §5).
- `docs/configuration-report.md` — this report.
- `docs/_config-audit-mapping.md` — the full internal setting-by-setting mapping table produced during the audit phase (Setting / ENV var / Admin field / consumers / current vs. expected priority / classification) — included for your own future reference; not required reading, but kept alongside this report for traceability.

## 14. Regression tests performed

No live dev server was available in this environment, so verification is: a full esbuild syntax sweep of all 121 `.ts`/`.tsx` files in `app/`, `lib/`, `components/` (zero errors), a full-project `tsc --noEmit` run on your actual machine early in this session (zero errors in any file this fix touched — see §15), and direct code-path tracing:

- **Every exported function signature touched in `lib/email-server.ts` is unchanged** — confirmed by grep that no other file imports the removed `RESTAURANT_NAME`/`APP_BASE_URL` constants directly; all external callers only use the public `sendXEmail()`/`triggerXFor()` functions, whose parameter lists and return types are identical to before.
- **`triggerSpinInviteForOrder`/`triggerSpinInviteForTab`** (called from `app/api/orders/[id]/route.ts` and `app/api/tabs/[id]/route.ts` respectively) both route through `sendSpinInviteEmail()`, confirmed untouched in external signature — so the order/tab-completion → spin-invite trigger chain is unaffected.
- **`GET /api/admin/restaurant-config`** — confirmed the response shape change is purely additive (new `restaurant_name` field alongside the existing `kitchen_mode`); grepped every consumer (`app/waiter/page.tsx`, `app/kitchen/page.tsx`, `app/admin/page.tsx`, `app/manager/page.tsx`, `app/delivery/page.tsx`) and confirmed each destructures only `{ kitchen_mode?: string }` and ignores unknown fields, so none are affected.
- **Finance** — confirmed zero files under `app/api/finance/**`, `lib/finance-server.ts`, or `components/AdminFinance.tsx` were touched. Confirmed `app/admin/page.tsx`'s Finance render block (`section === 'finance'`, `<AdminFinance .../>`) is a separate, untouched region of the file from the new Configuration diagnostics card (added under `section === 'staff'`). PIN resolution (`ADMIN_PIN` seed-once behavior, `admin_pin` verification via `/api/auth/verify-pin`) was deliberately left completely unchanged — Finance's own PIN gate reuses that same unmodified mechanism.
- **Numeric hardening regression check** — traced that `parseNumber()` returning `null` (invalid input) falls back to `0` (no minimum) rather than blocking Spin & Win entirely, matching the existing implicit behavior of `Number('') = 0`/`Number(undefined) = NaN`-then-always-false-comparison as closely as possible while removing the NaN footgun; a *valid* `min_order_amount` value behaves identically to before (`Number('500')` and `parseNumber('500')` both produce `500`).

## 15. `npm run build` result

**`npx tsc -p tsconfig.json --noEmit` was run against your full real project (via the connected device) earlier in this session and completed with zero errors in any file this fix touches** — confirmed before the configuration changes were layered in. After adding this fix's 11 files, I attempted to re-run the full-project `tsc --noEmit`, `npm run build`, and `npm run lint` four separate times in this session; every attempt was still executing (not stuck, not erroring — `next build` reached `✓ Running next.config.ts` and was proceeding into the build itself) when the tool's execution window closed. As with the two prior features built in this session, this sandbox reaches your project through a bridge whose per-command execution window is shorter than a full type-check/build/lint takes to finish on this codebase's size. **I am not claiming a successful build, because none of these commands completed here.**

The local esbuild syntax sweep (121 files, zero errors) and the manual signature/consumer tracing in §14 are real verification, but they are not a substitute for `tsc`/`next build`/`eslint` actually finishing. Please run, from `C:\Users\racha\claude_work\foodie-lover-next`:

```
npx tsc -p tsconfig.json --noEmit
npm run build
npm run lint
```

If `npm run build` fails with `EPERM: operation not permitted, unlink '...\.next\BUILD_ID'`, delete (or rename) the `.next` folder first — this is a known artifact of an earlier interrupted build attempt in this session, not something this fix caused. A `_next_stale_backup_<timestamp>` folder from that earlier session may still be sitting in your project root; safe to delete once your own build succeeds.

## 16. Remaining hard-coded / not-yet-wired configuration

Being transparent about scope: the audit surfaced several settings that exist as dead `restaurant_settings` rows or are hard-coded, which this fix intentionally did **not** wire into new business behavior, because doing so would mean building new features (tax calculation, currency formatting, order-type gating) rather than fixing configuration *resolution* — which the request explicitly asked me to hold off on ("Before implementing additional major features..."). Flagging each so you can decide if/when to pick them up:

- **Tax rate, currency, currency symbol** (`restaurant_settings.tax_rate/currency/currency_symbol`) — seeded with defaults but **never read anywhere**. The ₹ symbol is hard-coded as a literal character in 24+ JSX locations across the app, and no tax percentage is applied to any order total anywhere in the codebase today. Wiring these up would mean adding real tax-calculation and currency-formatting logic — a genuine feature, not a config-priority fix.
- **`delivery_enabled` / `pickup_enabled` / `online_ordering` / `allow_table_ordering`** — seeded, **never read**. No order-type selector anywhere in the app currently checks these before letting a customer choose delivery/pickup/dine-in/online ordering. Wiring them up means adding gating logic to the online/table/checkout flows — again a feature, not a resolution fix. The **duplicate key-name bug** between these (`delivery_enabled` vs. the old `allow_delivery`, `pickup_enabled` vs. the old `allow_pickup`) *was* fixed at the seeding layer (§12); if your live database already has both old and new key names sitting in `restaurant_settings` from past app boots, they're harmless (nothing reads either), but you can clean them up with:
  ```sql
  DELETE FROM restaurant_settings WHERE key IN ('allow_delivery', 'allow_pickup');
  ```
  Optional, low-risk, not required for anything in this fix to work.
- **`email_notifications`, `whatsapp_number`, `service_charge`, `waiter_call_cooldown`, `receipt_email_from`** — all seeded, all **never read** anywhere. `whatsapp_number` also has a separate, equally-dead `localStorage['fl_whatsapp_number']` mechanism from an older code path — another small duplication, left as-is since nothing reads either copy.
- **`FROM_EMAIL`** — deliberately kept ENV-only (not upgraded to Category A) because `lib/email.ts` already documents, correctly, that the sender must be on a Resend-verified domain; an Admin-editable "from" address could silently break all email delivery. The dead `receipt_email_from` Admin key is vestigial from this same reasoning — left unwired on purpose.
- **`NEXT_PUBLIC_RESTAURANT_ID` and `NEXT_PUBLIC_APP_URL`** — deliberately kept ENV+Default only, no Admin layer. The restaurant ID is the tenant selector itself (an Admin field to "change your own tenant ID" would be nonsensical and is also needed client-side for realtime channel identity, which forces it to stay `NEXT_PUBLIC_*`/build-time). The app URL must exactly match the actual deployed domain for email links and QR codes to work — an Admin-typed value here has real potential to silently break every outgoing email/QR link if mistyped, with no verification step like Resend's domain check to catch it.
- **`restaurants.name`** (a *different* column from `restaurant_settings.restaurant_name`, both meaning "restaurant name") — set once at first `/api/init` and never read again anywhere. Not consolidated with `restaurant_settings.restaurant_name` in this fix (would require a migration + touching the `/api/init` seed path further); flagged here as a minor duplication for future cleanup, not currently causing any user-visible problem since nothing reads it.
- **Print agent configuration** (`print-agent/index.js`'s own env vars) — this is a separate standalone Node process that restaurant staff run on their own printer-connected PC. It cannot reach `restaurant_settings` or this resolver at all (different deployment, different machine, no Supabase service-role access by design). Its ENV vars remain exactly as before — out of scope for a server-side resolver that only exists inside the Next.js deployment.

---

### Files touched this fix

**New:** `lib/config-server.ts`, `app/api/admin/config-diagnostics/route.ts`, `docs/configuration-report.md`, `docs/_config-audit-mapping.md`

**Modified:** `lib/email-server.ts`, `app/api/ai/chat/route.ts`, `app/api/rewards/spin-invite/route.ts`, `app/api/rewards/eligibility/route.ts`, `app/api/rewards/spin-verify/route.ts`, `app/spin/page.tsx`, `app/api/admin/restaurant-config/route.ts`, `app/api/init/route.ts`, `app/admin/page.tsx`

**No database migration was required** — every column and table this fix reads from (`restaurant_settings`, `restaurants.kitchen_mode`, `spin_config`) already existed.
