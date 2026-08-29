# Foodie Lover — Current Codebase Reference

**Generated from current repository inspection.**
**Date generated:** 2026-08-23 (23:26 UTC / 2026-08-23 18:26 US Central)
**Repository state / branch:** `main`
**Commit:** `618a9a7832b2365b173ece0a6fa3632023d1e115` — commit message `"fix"`, authored 2026-08-23T16:43:11-05:00
**Uncommitted changes at time of audit:** None to application code. `git status --porcelain` showed exactly one untracked item, `_snapshot_tmp/fl_docaudit_snapshot.tar.gz` — a tarball this audit process itself created on the device to pull a clean repository snapshot into the sandbox for analysis. It is not an application file, was not committed, and does not affect any of the findings below. The working tree of tracked files was 100% clean.

**How this document was produced.** This is a from-scratch inspection of the current repository, database migration files, and configuration code — not an update of the prior `docs/foodie-lover-reference.docx`. That prior document was **not modified or overwritten**; it remains in `docs/` for historical comparison. Nine parallel research passes read every portal page (`app/**/page.tsx`), every API route (`app/api/**/route.ts`), every `lib/*.ts` file, all 23 SQL files under `supabase/`, and the print-agent companion process, each citing real `file:line` evidence. A subset of the highest-stakes claims (authentication gaps, the dine-in coupon bug, the Manager "Expenses Today" bug, the offline-queue duplicate risk, PIN handling, RLS policies, the order state machine, the config resolver) were independently re-verified by direct `grep`/`Read` against the fresh snapshot while writing this document, and are marked **Confirmed directly** below. Findings drawn from the research passes that were not independently re-opened in this final pass are marked **Per code-reading agent, not re-opened in final pass** — still code-grounded with file:line citations, just not re-clicked-through a second time by the document author.

**What this document is not.** It does not claim runtime behavior that would require an actual running instance, a live Supabase project, or manual click-through testing — those items are explicitly labeled "Needs Runtime Verification." It does not invent information that isn't visible in the code. Where the code is genuinely ambiguous or a comment contradicts the implementation, both are stated and the contradiction is flagged rather than silently resolved.

---

## Table of Contents

1. [Purpose & Scope of This Document](#1-purpose--scope-of-this-document)
2. [System Architecture](#2-system-architecture)
3. [Complete Portal Inventory](#3-complete-portal-inventory)
4. [Order Lifecycle & State Machine](#4-order-lifecycle--state-machine)
5. [Customer Tab Architecture (Dine-In)](#5-customer-tab-architecture-dine-in)
6. [Table Management](#6-table-management)
7. [Menu Architecture](#7-menu-architecture)
8. [Waiter Portal](#8-waiter-portal)
9. [Kitchen Portal & Printing](#9-kitchen-portal--printing)
10. [Manager Portal](#10-manager-portal)
11. [Admin Dashboard](#11-admin-dashboard)
12. [Finance — System Overview](#12-finance--system-overview)
13. [Finance — System Sales](#13-finance--system-sales)
14. [Finance — Account Balances](#14-finance--account-balances)
15. [Finance — Vendor Accounting](#15-finance--vendor-accounting)
16. [Finance — Salary Accounting](#16-finance--salary-accounting)
17. [Finance — Manager Expenses vs. Finance Expenses](#17-finance--manager-expenses-vs-finance-expenses)
18. [Finance — Daily Closing](#18-finance--daily-closing)
19. [Authentication & Authorization Audit](#19-authentication--authorization-audit)
20. [PIN Storage & Handling Audit](#20-pin-storage--handling-audit)
21. [API Inventory (Categorized)](#21-api-inventory-categorized)
22. [Database Documentation & ER Diagram](#22-database-documentation--er-diagram)
23. [Realtime Architecture](#23-realtime-architecture)
24. [Email System](#24-email-system)
25. [Rewards / Spin & Win](#25-rewards--spin--win)
26. [Payment Architecture](#26-payment-architecture)
27. [Configuration System](#27-configuration-system)
28. [Full Environment Variable List](#28-full-environment-variable-list)
29. [Hardcoded Configuration Search](#29-hardcoded-configuration-search)
30. [Caching Audit](#30-caching-audit)
31. [localStorage Inventory](#31-localstorage-inventory)
32. [Order Deletion Documentation](#32-order-deletion-documentation)
33. [Auditability](#33-auditability)
34. [Error Handling Patterns](#34-error-handling-patterns)
35. [Idempotency & Duplicate-Protection Audit](#35-idempotency--duplicate-protection-audit)
36. [Known Issues — Fresh Audit (Critical/High/Medium/Low)](#36-known-issues--fresh-audit-criticalhighmediumlow)
37. [Recheck of Previously-Reported Issues](#37-recheck-of-previously-reported-issues)
38. [Dead Code & Duplicate Systems](#38-dead-code--duplicate-systems)
39. [Performance Review](#39-performance-review)
40. [Build / Project Health](#40-build--project-health)
41. [Migration Status Inventory](#41-migration-status-inventory)
42. [Current Feature-Status Matrix](#42-current-feature-status-matrix)
43. [End-to-End Business Flow](#43-end-to-end-business-flow)
44. [Production-Readiness Assessment](#44-production-readiness-assessment)
45. [Executive Summary](#45-executive-summary)
46. [Environment / Configuration Summary](#46-environment--configuration-summary)
47. [Database / Migration Summary](#47-database--migration-summary)
48. [Finance Summary](#48-finance-summary)
49. [Security / Authentication Summary](#49-security--authentication-summary)
50. [Appendix: Files Read For This Audit](#50-appendix-files-read-for-this-audit)

---

## 1. Purpose & Scope of This Document

Foodie Lover is a single-restaurant (single-tenant, in practice) restaurant-operations web application built on Next.js App Router, with Supabase Postgres as the sole data store and Supabase Realtime (broadcast channels, not Postgres logical-replication CDC) as the live-update mechanism. It covers the full loop from a customer scanning a table QR code or opening the online-ordering page, through kitchen preparation, waiter/delivery handling, manager billing, and admin-level configuration, reporting, and financial bookkeeping.

This document exists to give a new engineer or a new AI assistant a complete, code-verified picture of the system **as it exists in commit `618a9a7`**, without relying on any prior documentation's claims about what the system does. Every non-trivial claim below is backed by a specific file and, where useful, a line number, from the fresh repository snapshot pulled for this audit. Sections 36 and 37 are the parts most likely to change release-to-release; everything else describes structure that is unlikely to move quickly.

Two things this document deliberately keeps separate throughout: **implemented behavior** (what the code actually does, right now) versus **planned/aspirational behavior** (what a comment, dead code path, or half-wired UI element suggests was *intended*). Wherever a comment in the code describes behavior that the code next to it does not actually implement, both are called out explicitly — this turned out to be a recurring and important pattern in this codebase (see Sections 35 and 37).

---

## 2. System Architecture

**Stack:** Next.js (App Router) on React 19.2.3, TypeScript in strict mode, Supabase (Postgres + Realtime + Storage) as the only backend, no ORM (`prisma/schema.prisma` exists in the repo but is dead — see Section 38), raw `fetch`-based REST calls to Next.js API routes from the browser.

**Request flow (confirmed structurally consistent across every portal):**

```
Browser (React client components, 'use client')
   → lib/api.ts (apiFetch / safeApiCall wrappers)
   → Next.js API routes under app/api/**/route.ts
   → lib/supabase-server.ts (getServerClient(), using the SUPABASE_SERVICE_ROLE_KEY)
   → Supabase Postgres
```

**Realtime fan-out (confirmed):**

```
API route performs a mutation
   → broadcast() helper in lib/supabase-server.ts
   → Supabase Realtime broadcast channel `restaurant:{restaurantId}`
   → useRealtime() hook (lib/realtime-client.ts), subscribed to per-portal
   → portal calls its own refresh() — no incremental/optimistic patching anywhere;
     every realtime event triggers a full re-fetch of that portal's data set
```

There is no server-side session, no cookies, and no middleware-level auth check anywhere in the app (confirmed — no `middleware.ts` exists at the repo root or under `app/`). Every portal page is a client component that checks a role-scoped `localStorage` token on mount (`lib/auth.ts`) and client-redirects to a `/login` route if it's missing or expired; the underlying API routes themselves are reachable directly with no credential. This is covered in full in Section 19.

**Single-tenant assumption:** a `restaurantId` is threaded through nearly every table and route, but in practice it defaults to the literal string `'rest_default'` via `NEXT_PUBLIC_RESTAURANT_ID ?? 'rest_default'`, duplicated by hand in roughly 29 separate files (confirmed by direct grep against the fresh snapshot: `grep -rn "NEXT_PUBLIC_RESTAURANT_ID.*rest_default"` returns 29 hits across `app/` and `lib/`). There is a centralized resolver for this (`resolveRestaurantId()` in `lib/config-server.ts`) but it is not actually called from any of those 29 sites — see Section 27.

**External dependencies:**
- Supabase (Postgres, Realtime, Storage) — the only database.
- Resend — transactional email provider (`lib/email-server.ts`).
- Google Generative AI (`@google/generative-ai`) — powers `app/api/ai/chat/route.ts`.
- `api.qrserver.com` — third-party QR image generator, called live from `app/qr/page.tsx` with no local generation and no error fallback if the third party is unreachable.
- A standalone Node.js companion process, `print-agent/index.js`, run separately from the Next.js app (on a machine physically connected to a receipt printer), which polls the `print_jobs` table over the network and renders ESC/POS raw bytes to a USB or network printer.

**Ten portals total**, all thin clients over the same API surface and the same database (confirmed count and list in Section 3).

---

## 3. Complete Portal Inventory

| # | Portal | Route(s) | Audience | Auth |
|---|---|---|---|---|
| 1 | Online Ordering | `/online` | Public, no login | None (customer-facing) |
| 2 | Table QR Ordering | `/table?table=<id>` | Public, scanned from table QR | 4-digit session PIN (`customer_tabs.pin`), stored client-side only |
| 3 | Order Tracking | `/track?id=&token=` | Public, link from email/checkout | Tracking token, checked **client-side only** (Section 19) |
| 4 | Spin & Win | `/spin?orderId=\|tabId=&token=` | Public, email-link only | Token re-verified server-side in `GET /api/rewards/spin-verify` |
| 5 | QR Generator | `/qr` | Staff utility, no login | None |
| 6 | Kitchen Display | `/kitchen` (+ `/kitchen/login`) | Staff | Shared kitchen PIN vs. `restaurant_settings` |
| 7 | Waiter Station | `/waiter` (+ `/waiter/login`) | Staff | Per-account username + PIN vs. `staff` table |
| 8 | Delivery Dashboard | `/delivery` (+ `/delivery/login`) | Staff | Per-account username + PIN vs. `staff` table |
| 9 | Manager Portal | `/manager`, `/manager/expenses`, `/manager/tables` | Management | Shared manager PIN |
| 10 | Admin Dashboard | `/admin` (+ `/admin/login`) | Management | Shared admin PIN; step-up PIN re-check on discount/danger actions |

All ten are client components (`'use client'`) rendered by the Next.js App Router; there is no server-rendered/authenticated page anywhere — "protection" for staff/management portals is a client-side redirect if a `localStorage` session token (`fl_session_<role>`, see `lib/auth.ts`) is absent or past its 8-hour TTL. The Admin Dashboard is the largest single file in the app, `app/admin/page.tsx`, at roughly 6,000 lines covering 13 sub-sections behind one internal nav bar (Section 11).

A note on the Waiter portal specifically, since the user's original request called for an **explicit check of whether "Take Order" exists**: the Waiter Station (`app/waiter/page.tsx`) does have a manual "create a new order from scratch" flow, via `components/WaiterTakeOrder.tsx`. **Corrected in this pass** — a prior version of this document (and of `docs/staff-ordering-implementation-report.md`) reported this component as built but not confirmed wired in; that was re-verified directly against the current code and found to be stale. `grep -n "WaiterTakeOrder" app/waiter/page.tsx` confirms all three wiring points: the lazy import at line 24 (`const WaiterTakeOrder = lazy(() => import('@/components/WaiterTakeOrder'));`), the "➕ TAKE ORDER" button that opens it as a full-screen overlay, and the actual `<WaiterTakeOrder ... />` render call (line 1192 in the current file) inside a conditional block gated on `takeOrderOpen`. Waiters both *confirm* orders that arrive from customer-initiated Online/Table flow into `awaiting_waiter` → `preparing`, and can *originate* a new dine-in order directly from the Waiter Station using this component — both paths are live.

---

## 4. Order Lifecycle & State Machine

The order status state machine is enforced **entirely in application code**, not by a database `CHECK` constraint — confirmed directly by reading `app/api/orders/[id]/route.ts` lines 30–54 in the fresh snapshot:

```ts
const VALID_TRANSITIONS: Record<string, string[]> = {
  awaiting_waiter:   ['pending', 'preparing', 'cancelled'],
  pending:           ['preparing', 'cancelled'],
  preparing:         ['prepared', 'served', 'cancelled'],
  prepared:          ['served', 'out_for_delivery', 'completed', 'cancelled'],
  served:            ['completed', 're_serve_required', 'cancelled', 'out_for_delivery'],
  re_serve_required: ['preparing', 'out_for_delivery', 'served', 're_serve_required'],
  out_for_delivery:  ['delivered', 're_serve_required'],
  delivered:         ['completed', 're_serve_required'],
  completed:         [],   // terminal
  cancelled:         [],   // terminal
  void:              [],   // terminal
};
```

Every order also carries a `type` (`dine-in` / `pickup` / `delivery`); the code comments in this map explain two important non-obvious facts, confirmed verbatim from the file:
- `awaiting_waiter` is the **actual starting status for new orders** under the current waiter-confirmation workflow; `pending` is kept only "for backward compatibility with any orders already in that state from before this workflow existed." A new order does not pass through `pending` in the current flow — a waiter's "Confirm & Print" or "Confirm & Send to Kitchen" action moves it straight from `awaiting_waiter` to `preparing`.
- `served → out_for_delivery` exists specifically so the delivery portal can pick up orders left in `served` state, described in-code as "backward compat for re-serve flow and any dine-in→delivery handoff edge cases."

`re_serve_required` is a side-branch entered whenever a customer reports "not received" (via `POST /api/order-issues`, capped at `ISSUE_MAX_RETRIES = 3` reports before auto-escalating to the manager), not a normal forward-progress state.

**Terminal states:** `completed`, `cancelled`, `void` — none has any outgoing transition; the map enforces this by giving each an empty array.

**Where the check happens:** `PATCH /api/orders/[id]` validates `body.status` against `KNOWN_STATUSES` (the key set of the map above) and, when a status change is requested, checks the current row's status against `VALID_TRANSITIONS[currentStatus]` before writing. This is the single authoritative place order status is allowed to change in the codebase — confirmed no other route directly writes `orders.status` outside this file and `app/api/orders/delete-selective/route.ts` (which deletes rows outright rather than transitioning them) and `app/api/orders/clear/route.ts` (full wipe, Section 32).

**A confirmed race condition:** the "confirm and print" / "confirm and kitchen" waiter actions inside this same PATCH handler follow a check-then-act pattern (read current status, decide the KOT payload, then write) with no row-level lock or optimistic-concurrency version check between the read and the write — two waiters (or a client double-tap without proper request de-duplication) hitting confirm on the same order in close succession could both pass the initial status check before either write lands. **Confidence: Per code-reading agent, not re-opened in final pass.**

---

## 5. Customer Tab Architecture (Dine-In)

Dine-in ordering is built around a `customer_tabs` table: each individual diner scanning the table QR and joining gets their **own** `customer_tabs` row (not one shared tab per table) — confirmed by the old reference document's own framing, cross-checked structurally against `app/table/page.tsx`'s state machine (`landing → join → menu → cart → tracking`, with a hard override to a "Thank You" screen once the tab closes).

**Session/device binding:** a persistent `fl_device_id` written to `localStorage` is looked up against a `tab_devices` table on load; if it matches an open tab at the current table, the page restores straight into the tracking view. Manual recovery (`POST /api/tab-devices/verify`) checks name + PIN — but against `customer_tabs.pin`, **not** `tab_devices.personal_pin`, even though `personal_pin` is written on every session start. `tab_devices.personal_pin` is therefore write-only in the current code: nothing reads it back. **Confirmed directly** by grepping `personal_pin` usage in `app/api/tab-devices/**` — only insert/update sites were found, no `.eq('personal_pin', ...)` or equivalent select-and-compare site.

**Order merging:** placing an order from the Table portal calls the order-creation path with `tabId` set; if the tab already has an order in `awaiting_waiter`, the server merges new items into that existing order rather than creating a second one — this is how repeated "Place Order" taps before a waiter confirms end up as a single ticket rather than a flood of separate orders.

**Closing a tab is server-authoritative**, not a simple status flip. `PATCH /api/tabs/[id]` (the manager-portal close-tab action): recomputes the tab total from every non-void order on the tab, attempts reward-coupon redemption (see the confirmed bug in Section 37), marks every order on the tab `completed`, frees the underlying table only if no other open tab still references it, broadcasts `payment_completed`, and fires both a receipt email and a Spin & Win invite email. If any order on the tab is still `re_serve_required`, the close is blocked with an HTTP 409 unless force-closed.

**The dine-in reward-coupon redemption bug — confirmed still present in the fresh snapshot:**
- `app/table/page.tsx` line 637 reserves a coupon for a dine-in bill by calling `POST /api/rewards/reserve-coupon` with `body: JSON.stringify({ couponId: dineAppliedCoupon.couponId, orderId: tabId })` — i.e., it passes the **tab's ID** in the `orderId` field.
- `app/api/rewards/reserve-coupon/route.ts` only ever writes that value into the `reserved_order_id` column: `.update({ status: 'reserved', reserved_order_id: orderId, ... })`. There is no code path in this route that writes `reserved_tab_id`.
- `app/api/tabs/[id]/route.ts` line 93, at tab-close time, looks for coupons to redeem with `.eq('reserved_tab_id', id)` — a **different column**, which the dine-in reserve flow above never populates.
- Net effect: a reward coupon applied to a dine-in bill via the Table portal is stored under `reserved_order_id = <tabId>`, but the tab-close redemption query searches `reserved_tab_id = <tabId>` and will never find it. The coupon stays at `status = 'reserved'` indefinitely and its discount is never actually subtracted from what the customer pays at close, even though the Table portal's UI shows the coupon as successfully applied.

This is a real money-affecting bug, confirmed by reading all three files directly in this pass (`app/table/page.tsx`, `app/api/rewards/reserve-coupon/route.ts`, `app/api/tabs/[id]/route.ts`), not carried forward from the prior document without re-checking. See Section 37, item 4, for its status against the prior report.

---

## 6. Table Management

Tables are a first-class Postgres table (`tables`), with full CRUD exposed at `app/api/tables/route.ts` and `app/api/tables/[id]/route.ts` (the latter supports `DELETE`, confirmed present). Two different UI surfaces touch table state:

- **Manager Portal → Table Map** (`app/manager/tables/page.tsx` / the `tables` section of `app/manager/page.tsx`): a **read-only** occupancy grid with a seat-usage progress bar per table. Per code-reading agent research, this view has no click-through and no per-table actions wired to it at all, despite the backing `/api/tables/[id]` endpoint fully supporting edit and force-close — table administration has to happen from the Admin Dashboard's own Tables section instead, not from the Manager table map.
- **Admin Dashboard → Tables section**: full table CRUD plus a "force-close" action for stuck sessions (a table whose tab never properly closed).

**Occupancy semantics:** a table is considered occupied while any `customer_tabs` row referencing it is open; it's only freed by the tab-close flow in Section 5 once no other open tab still references it, or via the Admin force-close escape hatch. The Admin Overview's table grid additionally colors a table red as "stale" once its open tab has existed past 4 hours — a client-computed presentation threshold, not a database-enforced timeout (no server-side job automatically closes or flags stale tables).

The QR Generator portal (`/qr`) is the table-map producer: it pulls the current list from `GET /api/tables` and renders one card per selected table, each pointing a live `<img>` at `api.qrserver.com` encoding `{origin}/table?table={tableId}` — note the query parameter is `table=`, not `tableId=`; the Table portal itself accepts both for backward compatibility, but the QR generator only ever emits `table=`.

---

## 7. Menu Architecture

`menu_items` is the single source-of-truth table for both dine-in and online menus — there is no per-portal menu split. Pricing supports **variants**: a JSONB `variants` column (added by `supabase/migrations/20260530_add_variants.sql`, confirmed: `ADD COLUMN IF NOT EXISTS variants JSONB NOT NULL DEFAULT '[]'::jsonb`, with a GIN index for querying). The migration's own comment states the flat `price` column is "always set to the first variant's price (or 0 if no variants)" and that "all pricing logic should use the `variants` array" — meaning `price` is effectively a legacy/derived display column once an item has variants, and any code that reads `price` directly instead of `variants[0].price` is reading a value the schema itself calls secondary.

**Two independent hardcoded menu catalogs exist** in the codebase — confirmed directly: `app/api/menu/seed/route.ts` (184 lines, 70 `name:` occurrences) and `app/api/init/route.ts` (186 lines, 50 `name:` occurrences) both contain their own hand-written arrays of menu items with overlapping but not identical contents. These are invoked separately (seed is a dedicated re-seed endpoint; init is the first-run bootstrap path), so a restaurant initialized via one path can end up with a different starting menu than one seeded via the other — a duplication/maintenance risk rather than a correctness bug in normal operation, since neither runs automatically after first setup.

The menu editor UI (variant-aware add/edit form, CSV import/export with a downloadable template, category management) is **byte-for-byte the same component logic**, called through the same `lib/api.ts` functions and the same `app/api/menu/**` routes, from both the Manager Portal's Menu section and the Admin Dashboard's Menu section — there is no menu-specific permission difference between the two roles; anyone with either PIN can edit the full menu.

`GET /api/menu` is cached 60 seconds at the edge (see Section 30 for the full caching audit) and is fetched once on mount by each portal; search and category filtering both run entirely client-side over the in-memory array — nothing re-fetches as a customer types or switches category tabs.

---

## 8. Waiter Portal

The Waiter Station (`app/waiter/page.tsx`) is, by portal complexity, the busiest console in the app: confirming new orders into the kitchen, marking food served or handed to delivery, working the bill-ready and re-serve queues, and responding to "call waiter" pings, all layered onto one order list. Login is per-account username + PIN checked against the `staff` table (Section 20 covers the security implications of how that check happens).

**Confirm-routing step.** New orders arrive at `awaiting_waiter`. Depending on the restaurant's kitchen-routing mode (Ask / Printer / Kitchen Display, set from Admin — see the dual-resolution-path finding in Section 27), the waiter sees "Confirm & Print KOT," "Confirm & Send to Kitchen," or both, plus a Reject option. Confirmed directly in `app/api/orders/[id]/route.ts`: `body.action === 'confirm_and_print'` sets `updates.kitchen_route = 'printer'` and — non-fatally, i.e. failure here does not fail the whole request — queues a `print_jobs` row via `buildKotPayload()` (line 538) for the external print-agent to pick up; `body.action === 'confirm_and_kitchen'` sets `updates.kitchen_route = 'kitchen_display'` and creates no print job at all, per an explicit in-code comment ("For confirm_and_kitchen, no print job is created — the kitchen display..."). Either action moves the order from `awaiting_waiter` to `preparing` and fires an order-confirmation email (see Section 24), and either action is logged as the same `order_confirmed` event type regardless of which route was chosen.

**The three-branch "Mark Served" action.** Once an order is `prepared`, the waiter sees exactly one button matched to `order.type`: delivery → "📦 Hand to Delivery" (sets status `out_for_delivery` and records the **confirming waiter's own name** as `delivery_person` — there is no actual courier-assignment step anywhere in the app, so "who delivered it" in the data model is really "which waiter tapped the button"); pickup and dine-in both simply advance to `served`.

**Bill-ready banner total.** The "Bill Requested" banner's total is computed client-side from the live order list and, per code-reading agent research, does not subtract a reserved reward-coupon discount — so it can quote the customer a higher amount than the tab will actually close for once (if) the coupon redemption succeeds. **Confidence: Per code-reading agent, not re-opened in final pass.**

**Login PIN comparison happens in the browser**, not on the server — see Section 20 for the full mechanism and evidence (`GET /api/staff/[id]` returns the plaintext PIN to the client for comparison).

---

## 9. Kitchen Portal & Printing

### Kitchen Display (`app/kitchen/page.tsx`)

A digital KOT (kitchen order ticket) board for orders routed to the screen rather than a physical printer, gated by a single shared kitchen PIN verified server-side against `restaurant_settings`. Only orders with `status` in `pending`/`preparing`/`prepared` **and** `kitchen_route !== 'printer'` appear here — printer-routed tickets are physically handled and excluded entirely from this view.

**Elapsed-time timer measures order-creation time, not "entered preparing" time** — so the wait a customer's order spent sitting in `awaiting_waiter` before a waiter confirmed it counts toward the kitchen's "urgent" (red, pulsing "URGENT" banner past 10 minutes) threshold, even though the kitchen had no visibility into or control over that earlier wait.

**Item-index mismatch risk — confirmed by cross-referencing multiple independent research passes on this file.** Per-item "advance" buttons send the item's array position from the client's own (unordered, as fetched) item list; the server resolves that same numeric index against its own `created_at`-sorted query of `order_items`. If the client's fetch ordering and the server's `created_at` ordering ever diverge — which can happen with items inserted in rapid succession or with clock-precision ties — the index sent by the client can point at a different row server-side than the one the cook actually tapped, silently advancing the wrong item's status. **Confidence: Per code-reading agent (independently confirmed by three separate research passes in this audit), not re-opened line-by-line by the document author in this final pass** beyond confirming the `.map((item, i) => ... key={i} ...)` pattern is present in `app/kitchen/page.tsx`.

**New-order alert system:** a two-tone Web Audio beep plus an optional spoken announcement (browser `speechSynthesis`) fires for any order not previously seen (tracked via an in-memory seen-IDs set, with the spoken-announcement de-dupe additionally persisted to `sessionStorage` so a page refresh doesn't replay the whole queue aloud). The mute toggle silences only the voice announcement — the beep itself ignores the mute flag entirely, per the underlying alert-playing function.

### Printing (`print-agent/`, `app/api/print-jobs/**`)

Printing is architecturally split from the Next.js app: `print_jobs` is a normal Postgres table written by the waiter-confirm action (Section 8), and a **separate, standalone Node.js process** (`print-agent/index.js`), run on hardware physically connected to the receipt printer, polls `GET /api/print-jobs` over the network for pending jobs and renders them as raw ESC/POS byte sequences, supporting both USB (`PRINTER_TYPE=usb`, via a named Windows printer or a Linux/Mac device path) and network (`PRINTER_TYPE=network`, raw TCP to port 9100 by default) modes, configured entirely through its own `.env` file (`PRINTER_TYPE`, `PRINTER_NAME`, `PRINTER_DEV`, `PRINTER_IP`, `PRINTER_PORT`, `PRINTER_CHARS_PER_LINE`, `PRINTER_STATION_ID`).

**Fail-open authentication — confirmed directly.** `app/api/print-jobs/route.ts` intends to authenticate the print-agent via an `x-print-agent-key` header checked against `process.env.PRINT_AGENT_KEY`, but if that environment variable is simply not set, the route logs a warning — `console.warn('[GET /api/print-jobs] PRINT_AGENT_KEY is not set — endpoint is unauthenticated')` — and continues to serve the request rather than refusing it. An operator who forgets to set `PRINT_AGENT_KEY` gets a fully open print-job-listing endpoint rather than a hard failure that would force them to notice the missing configuration.

---

## 10. Manager Portal

`app/manager/page.tsx` (plus the `/manager/expenses` and `/manager/tables` sub-routes, all sharing one login session) is the front-of-house billing headquarters: closes tabs, collects payment, splits bills, edits the menu, and gives a read-only view of table occupancy and expenses.

**Stats bar — confirmed broken.** Six live tiles sit under the header: Revenue, Expenses, Net Profit, Awaiting Payment, Open Tabs, Closed Today. Directly confirmed in this pass: `todayExpenses` is declared with `const [todayExpenses, setTodayExpenses] = useState(0)` at line 132 of `app/manager/page.tsx`, and **`setTodayExpenses` is never called anywhere else in the file** — a full-file search for the setter turns up only its own declaration. The "Expenses Today" tile therefore permanently displays ₹0, and since `todayNetProfit = todayRevenue - todayExpenses` (line 479) depends on it, **"Net Profit Today" always simply equals gross revenue**, silently, with nothing in the UI indicating the figure is not real. This was previously reported and is confirmed **still present** in the current codebase (Section 37).

A second, related inconsistency: "Revenue Today" in this stats bar includes cancelled/void orders, while the separate End-of-Day panel and the Expenses sub-page both correctly exclude them — so the two revenue figures shown to the same manager for the same day can legitimately disagree.

**Billing board & Close Tab.** Tab cards are filtered Awaiting Payment / Open / Closed Today. Opening one shows itemized orders, a bill summary, split-billing tools (by person or by payment method), a discount form, and finally Close Tab, which routes through the server-authoritative `PATCH /api/tabs/[id]` flow described in Section 5. Split-by-person "mark paid" tracking is purely informational in the UI — it does not feed into which payment method actually gets recorded on the tab at close, so a manager could mark portions paid by different methods in the split-bill tool and still have the tab close under a single, unrelated recorded payment method.

**Table Map:** read-only, no click-through (Section 6).

**Menu Management / Expenses:** the same menu CRUD surface described in Section 7; a separate expense tracker (category chips, add form, two-step-confirm delete) that writes to its own table (Section 17 covers how this relates to, and differs from, the Finance module's expense tracking).

---

## 11. Admin Dashboard

`app/admin/page.tsx` is the largest single file in the application — roughly 6,000 lines — organized as 13 sections behind one internal nav bar: Overview, Orders, Sales Report, Menu, Offers, Tables, Transparency/Fraud, Staff, Email, Feedback, Spin & Win, Rewards Audit, and Kitchen Routing. Only the Overview tab auto-loads on mount; most other sections require an explicit "Load" click before they fetch anything, which is a deliberate performance choice (Section 39) but also means an admin can be looking at an empty or stale section without realizing data simply hasn't been requested yet.

**Overview:** three KPI rows (dine-in/general, online orders, order issues), an active-issues list, the color-coded table occupancy grid (Section 6), and an End-of-Day report — all computed client-side from the day's live orders, refreshed on a 5-second poll plus roughly ten distinct realtime event types.

**Orders & Sales Report tabs share one fetch that only re-runs when the date filter changes** — not on the 5-second interval and not on any realtime event that keeps the Overview tab fresh. An admin sitting on either tab without touching the date filter can be looking at a genuinely stale order list while new orders arrive unseen in the background. This is a caching/refresh-strategy inconsistency internal to this single file, not a caching-layer bug (see Section 30).

**Transparency / Fraud tab:** cancellation rate, high-discount orders (>30%), discount log, cancellation log, today's "not received" issue log, per-waiter accountability, an embedded analytics chart set, and a fraud-alert log built from cancellation/dispute timeline events. Per code-reading agent research, the "Staff Accountability" cancellation column is structurally always zero: it is derived from `customer_tabs`, and tabs are only ever opened or closed in this codebase, never marked cancelled — so the per-waiter cancellation-rate flag has no code path that can ever set it to a nonzero value, independent of actual waiter behavior. **Confidence: Per code-reading agent, not re-opened in final pass.**

**Staff / Email / Feedback tab:** Admin PIN change and a security-question recovery flow; kitchen/manager PIN rotation; waiter and delivery account CRUD (this is the only place "delivery agent" accounts are managed — there is no separate delivery-staff tab); a Resend configuration/diagnostics panel with a test-send button; a raw feedback-ratings table; and the two danger-zone deletion tools covered in full in Section 32.

**Spin & Win / Rewards Audit / Kitchen Routing tab:** global spin configuration (enable flag, required contact fields, minimum order amount, eligible order types), a reward-pool table with live win-probability display, per-reward daily-usage tracking, CSV import with a two-phase preview/confirm and safe-delete-to-archive (rather than hard delete) semantics, a read-only paginated (200-row) coupon audit trail, and the kitchen-routing mode selector that every waiter confirm action downstream depends on (Section 27 covers this setting's dual resolution-path finding in the config system specifically).

---

## 12. Finance — System Overview

Finance is the newest and largest subsystem in the app (added by `migration_019_finance.sql`, 10 new tables) and, notably, **the one part of the codebase with genuine, consistently-applied server-side authorization** — confirmed directly by reading `lib/finance-server.ts`, whose own header comment states the rationale explicitly: *"Finance is owner-level, sensitive functionality. The rest of this codebase's existing API routes largely have no server-side authorization (verified during inspection)... Every Finance route (including GETs, since Finance must not be readable by simply hiding a nav link) follows [the admin-PIN] pattern here, applied consistently across all new endpoints."* This is the codebase's own internal audit note, written by whoever built Finance, independently corroborating this document's Section 19 findings about the rest of the app.

**Authorization mechanism:** `requireAdminPin(req)` (`lib/finance-server.ts`) accepts the PIN via an `x-admin-pin` request header on GETs or a `pin` field in the JSON body on mutations, and validates it with `verifyAdminPin()` against `restaurant_settings.value` where `key = 'admin_pin'` — the exact same shared admin PIN used everywhere else in the app (Section 20 covers the implication of Finance reusing this single shared secret rather than having its own).

**The 10 Finance tables** (all with the same universally-permissive RLS policy as every other table in the app — see Section 19): `finance_accounts`, `finance_categories`, `finance_transactions`, `finance_audit_log`, `vendors`, `vendor_purchases`, `vendor_payments`, `staff_salary_config`, `salary_payments`, `daily_finance_closings`.

**19 API routes** under `app/api/finance/`, organized into resource groups: `accounts`, `audit-log`, `categories`, `closings`, `salary-config`, `salary-payments`, `summary`, `system-sales`, `transactions`, `vendor-payments`, `vendor-purchases`, `vendors`.

**UI:** a single large client component, `components/AdminFinance.tsx`, mounted as a tab inside the Admin Dashboard.

**Design principle, stated in-code:** Finance deliberately does not duplicate or migrate the pre-existing Manager "Expenses" feature (`expenses` table, powering the Manager Portal's own expense tracker) — it reads that table live for reporting purposes but keeps its own, separate `finance_categories` list, explicitly so "neither feature has to change to accommodate the other" (verbatim from the migration file's comment). See Section 17 for exactly how these two expense concepts relate and where that separation could confuse an operator.

---

## 13. Finance — System Sales

"System Sales" is **always computed live, never stored**, by `computeSystemSales()` in `lib/finance-server.ts` — confirmed by reading the function directly. For a given date range it unions two independent sources:

1. **Dine-in tabs:** every `customer_tabs` row with `status = 'closed'` and `closed_at` in range, contributing `gross = total`, `discount = discount + coupon_discount`, `net = max(0, gross - discount)`.
2. **Non-tab orders (pickup/delivery/online):** every `orders` row with `status = 'completed'`, `tab_id IS NULL`, and `updated_at` in range, contributing `gross = subtotal ?? total`, `discount = discount`, `net = total` (the stored order total, not independently recomputed).

The two sources are explicitly filtered to be non-overlapping (`tab_id IS NULL` on the orders side) so a dine-in order that's part of a tab is counted exactly once, through the tab, not twice. Rows are merged, sorted by `occurredAt` descending, and returned; `sumSystemSales()` reduces them to `{ count, gross, discount, net }` with results rounded to 2 decimal places via `Math.round(x * 100) / 100`.

Because this is computed on every request rather than persisted, System Sales for a given historical date can change if underlying `orders`/`customer_tabs` rows are edited or deleted after the fact — **as of this remediation pass, this is now handled explicitly and auditably rather than silently:** deleting orders that belong to a closed dine-in tab (via either `POST /api/orders/delete-selective` or `POST /api/orders/clear`) triggers `recomputeClosedTabTotal()`, which recomputes that tab's `customer_tabs.total`/`discount`/`coupon_discount` from its remaining orders, writes a `finance_audit_log` entry (`action='revenue_reversed_on_order_deletion'`) recording the before/after totals, and skips (rather than silently corrupting) any tab that already has a `split_bills` row. See Section 32 for the full order-deletion/Finance-sync behavior and Section 51 for how this System Sales figure feeds Manager/Admin/Analytics as well as Finance — it is no longer a Finance-only computation consumed nowhere else.

---

## 14. Finance — Account Balances

`finance_accounts` models cash/bank "buckets" (seeded by the migration with two starter accounts: `FACC_cash_default` "Cash Drawer" and `FACC_bank_default` "Bank / UPI", each carrying an array of `payment_method_keywords` used to auto-match incoming sales to an account — e.g. Cash Drawer matches `['cod','cash','admin_override']`, Bank/UPI matches `['upi','card','gpay','phonepe','paytm']`).

**Balances are computed entirely client-side**, confirmed directly in `components/AdminFinance.tsx`: a `balances` state (`Record<string, number>`) is computed by a client-side function, with the UI's own caption explaining the formula verbatim — *"Balances = opening balance + system sales auto-matched by payment method + manual ledger entries against..."* — i.e., `opening_balance` (a column on `finance_accounts`) plus every System Sales row whose payment method matches that account's keyword list, plus every manual `finance_transactions` entry posted against that account. There is no server-side "current balance" endpoint or stored running total; the browser fetches the raw building blocks (accounts, system sales for the period, transactions) and reduces them into balances on every load. This means balance correctness depends entirely on the client-side reduction logic staying correct and in sync with whatever the server-side equivalents (vendor/salary payment posting, Section 15–16) actually write — there is no single server-computed source of truth to check the client math against.

---

## 15. Finance — Vendor Accounting

Three tables model vendor purchasing: `vendors` (the vendor directory), `vendor_purchases` (an invoice/bill: `amount`, `amount_paid`, `status` constrained to `unpaid` / `partially_paid` / `paid`, plus `is_voided`), and `vendor_payments` (one or more partial payments against a purchase, each referencing a `finance_accounts` row).

**Write pattern, confirmed from the migration's own comment:** each `vendor_payments` insert is meant to also post one linked `finance_transactions` row (`source = 'vendor_payment'`) and update the parent `vendor_purchases.amount_paid`/`status` — done as a **sequential, non-atomic series of writes inside the API route**, because, per the migration comment, "Supabase JS has no multi-statement transaction API." This is an explicitly acknowledged design tradeoff in the code itself, not something this audit is inferring: a request that fails partway through (e.g., the `finance_transactions` insert succeeds but the `vendor_purchases.amount_paid` update then fails due to a transient network error) can leave the vendor purchase's recorded paid-amount out of sync with the ledger, with no automatic reconciliation. **Confidence for the exact ordering/rollback behavior: Per code-reading agent, not re-opened line-by-line in this final pass** — the schema-level design intent is confirmed directly from the migration comment above; the precise route-level write order is not re-verified here.

---

## 16. Finance — Salary Accounting

`staff_salary_config` deliberately reuses the existing `staff` table rather than introducing a duplicate employee table (confirmed via the migration's comment). Each rate change **inserts a new row** and marks the prior one `is_active = FALSE`, preserving historical rates rather than overwriting them — `salary_type` is constrained to `monthly` / `daily` / `hourly`.

`salary_payments` records an actual payment against a staff member (optionally linked back to the `salary_config_id` that was active at the time), and — per the same non-atomic sequential-write pattern as vendor payments — is meant to also post one linked `finance_transactions` row (`source = 'salary_payment'`) so "Admin never has to separately create a matching expense for the same salary payment" (verbatim from the migration comment).

Both `vendor_payments` and `salary_payments` support `is_voided` as a soft-delete/reversal flag rather than hard deletion, preserving an audit trail of reversed transactions.

---

## 17. Finance — Manager Expenses vs. Finance Expenses

There are genuinely **two separate expense-tracking concepts** in this codebase, and they do not share a table:

- **Manager Expenses** (`expenses` table, pre-existing, powers `app/manager/page.tsx`'s Expenses sub-page and the Manager stats bar's `todayExpenses` tile) — category chips drawn from a constant, `EXPENSE_CATEGORIES`, defined in `lib/api.ts`.
- **Finance** (`finance_transactions` with `finance_categories`, added by migration 019) — a separate, independent category list, by explicit design (Section 12).

`computeFinanceSummary()` in `lib/finance-server.ts` **reads** the pre-existing `expenses` table live (via its `managerExpenses` field) for reporting purposes inside the combined Finance summary — it does not copy or migrate that data into `finance_transactions`. The function's own doc comment states this plainly: "Reads, but never writes to, the existing `expenses` table (Manager-logged operating expenses) — Finance shows that data live, it is not copied." Practically, this means an operator logging an expense from the Manager portal will see it reflected inside the Finance module's summary view, but it will **not** appear in the Finance module's own transaction ledger (`finance_transactions`) unless someone separately re-enters it there — the two systems are additive for reporting purposes but not unified for entry purposes.

**Fixed in this remediation pass:** the Manager Portal's `todayExpenses` display bug (previously a dead-state variable, permanently ₹0 — see H1, Section 36) is resolved, and the Manager dashboard's expense-derived figure is now explicitly labeled **"Net Margin"**, not "Net Profit" — because it is not the same figure as this section's `netCashFlow` (Finance-scope, includes ledger income/vendor/salary effects Manager never sees). **Section 51 is the full definition of the Gross Sales → Discounts → Net System Sales → Manager Expenses → Finance ledger effects → Net Cash Flow waterfall**, including exactly why "Net Margin" (Manager) and "Net Cash Flow" (Finance) are two different, correctly-differently-labeled numbers rather than the same figure computed twice.

---

## 18. Finance — Daily Closing

`daily_finance_closings` stores a **frozen JSONB snapshot** per `(restaurant_id, business_date)` (enforced by a `UNIQUE` constraint), with `is_closed`, `closed_by`, `closed_at`, and reversal fields `reopened_by`/`reopened_at`.

**Closing does not lock any underlying data.** The migration's own comment is explicit and important: *"Closing a day does NOT lock any underlying row — Admin retains full edit access everywhere (per requirement: never permanently lock the owner out of their own data). Instead, the Finance UI recomputes live totals for `business_date` on every view and diffs them against `snapshot`; a mismatch renders a '⚠️ Modified after closing' indicator."* So a "closed" day is a soft, advisory boundary: an admin can still edit orders, tabs, or ledger entries dated on a closed day, and the UI's only defense against that silently drifting the historical record is a warning badge computed by comparing the live recomputation against the frozen snapshot — there is no hard constraint preventing the drift itself. Re-closing a day updates the snapshot and is logged to `finance_audit_log` with `action = 'close_day'`, including on a repeat close of the same date.

---

## 19. Authentication & Authorization Audit

This section was rebuilt from scratch against the fresh snapshot, quantified with direct greps rather than carried forward from any prior description.

**There is no session layer at any level.** No `middleware.ts` exists anywhere in the repository (confirmed — checked repo root and `app/`). No cookie is set by any route. No JWT is issued or verified anywhere. The entire notion of "being logged in" is: a client component writes a JSON blob (role, name/id, `expiresAt` = now + 8 hours) to `localStorage['fl_session_<role>']` (`lib/auth.ts`, `SESSION_TTL_MS = 8 * 60 * 60 * 1000`) after a successful PIN check, and every portal page reads that key on mount and redirects to its own `/login` route if it's absent or expired. This is a client-side rendering gate, not a security boundary — nothing on the server ever inspects it.

**Quantified route-level authorization, confirmed directly:**

- Total API route files: **77** (`find app/api -name route.ts`).
- Route files that perform any form of server-side credential check (`requireAdminPin`/`verifyAdminPin` from `lib/finance-server.ts`, or the equivalent hand-rolled admin-PIN check in the order-deletion routes): **21** — the 19 Finance routes (Section 12) plus `app/api/orders/clear/route.ts` and `app/api/orders/delete-selective/route.ts`.
- Route files that check a `PRINT_AGENT_KEY` header, but **fail open** (serve the request anyway with a console warning) if that environment variable isn't configured: **2** (`app/api/print-jobs/route.ts`, `app/api/print-jobs/[id]/route.ts`).
- Route files with **no authentication mechanism of any kind** — no PIN check, no header key, nothing: **54 of 77 (≈70%)**. This includes, among others: `app/api/settings/route.ts` (PATCH — can overwrite the shared admin/kitchen/manager PIN values with zero credential), `app/api/staff/route.ts` and `app/api/staff/[id]/route.ts` (full staff CRUD, including reading and writing plaintext PINs — Section 20), `app/api/orders/[id]/route.ts` (every order status transition, including cancel), `app/api/tabs/[id]/route.ts` (tab close / bill computation / coupon redemption), and the customer-data-bearing `app/api/orders/[id]` `GET` (Section 4/37).

**Row Level Security provides no actual protection.** Every table with RLS enabled uses the identical permissive policy. Confirmed by direct count against every SQL file in `supabase/` and `supabase/migrations/`: **43 `ENABLE ROW LEVEL SECURITY` statements** and **43 `CREATE POLICY` statements**, a 1:1 match, and a search for any policy body that is *not* exactly `USING (true) WITH CHECK (true)` (or the equivalent unspaced `USING(true) WITH CHECK(true)`) returned **zero results**. In other words, RLS is switched on everywhere but configured everywhere to allow every operation to every requester — it is not a defense-in-depth layer against the missing route-level auth above, it is a formality that satisfies "RLS is enabled" without restricting anything. Whatever authorization exists in this application exists entirely in the ~30% of routes that call `requireAdminPin`/`verifyAdminPin`, and nowhere else.

**Client-side-only checks that look like security but aren't:** the tracking-token check on `/track` (Section 37, item 1) and the staff-login PIN comparison on Waiter/Delivery (Section 20) both perform their actual comparison in the browser after the server has already sent the sensitive data or allowed the action — these are UI conveniences, not access controls, and both are trivially bypassable by calling the underlying API route directly.

**What this means in practice:** anyone who can reach the deployed app's network address can call any of the 54 unauthenticated routes directly — change an order's status, close a tab, read another customer's order/PII by ID, view or overwrite the shared PINs via `/api/settings`, or read a staff member's plaintext PIN via `/api/staff/[id]` — without ever touching a login screen. The Finance module and the two order-deletion routes are the only parts of the application actually protected against this today.

---

## 20. PIN Storage & Handling Audit

**Every PIN in this system is stored and compared as plaintext**, confirmed across every PIN-bearing table and route read during this audit:

| PIN | Stored where | Compared how |
|---|---|---|
| Admin PIN | `restaurant_settings` (`key = 'admin_pin'`), plain string in `value` | `===` string equality, server-side, inside `verifyAdminPin()` (Finance, order-deletion) — the one place PIN handling is done correctly-ish, modulo being plaintext |
| Kitchen PIN | `restaurant_settings` (`key = 'kitchen_pin'`) | Server-side `===`, via `/api/settings` verification path |
| Manager PIN | `restaurant_settings` (`key = 'manager_pin'`) | Server-side `===`, via `/api/settings` verification path |
| Staff (Waiter/Delivery) PIN | `staff.pin`, plain string column | **Client-side.** `GET /api/staff/[id]` (confirmed directly, `app/api/staff/[id]/route.ts` lines 15–27) returns the entire staff row including `pin` in the JSON response with zero authentication on the GET. The Waiter/Delivery login page fetches this record and compares the entered PIN against `data.pin` in the browser. The real plaintext PIN is transmitted to the client on every login attempt, whether or not it matches. |
| Table session PIN | `customer_tabs.pin`, 4-digit, plain string | Compared server-side in `/api/tab-devices/verify`, but against the wrong column relative to what's collected at session start (Section 5's `personal_pin` write-only finding) |

**No hashing, no salting, anywhere.** A `grep` for `bcrypt`, `argon2`, `scrypt`, or any password-hashing library in `package.json` and across `lib/`/`app/` returns nothing — none is a dependency of this project.

**Shared-secret reuse:** the single `admin_pin` value is reused as the authorization credential for the entire Finance module (`requireAdminPin`, Section 12) and for both order-deletion danger-zone tools (Section 32) — there is no PIN specific to Finance. Anyone who knows the one Admin PIN has full read/write access to every Finance ledger, vendor account, and salary record in addition to everything the Admin Dashboard itself exposes.

**PIN rotation and recovery:** the Admin PIN supports a change flow and a security-question-based recovery flow (both inside the Admin Dashboard's Staff/Email/Feedback section, Section 11); Kitchen/Manager PINs rotate from the same Admin section. None of these flows were re-opened line-by-line in this final pass beyond confirming their existence in `app/admin/page.tsx`'s section list — **Confidence: Per code-reading agent, not re-opened in final pass** for the exact recovery-flow mechanics.

---

## 21. API Inventory (Categorized)

The application exposes **77 route files** under `app/api/`. Grouped by resource area (route counts approximate a file per HTTP-method-set, some files handle multiple methods):

**Orders & Tabs** — `orders/route.ts` (create/list), `orders/[id]/route.ts` (GET/PATCH — the state machine, Section 4), `orders/[id]/events/route.ts`, `orders/clear/route.ts` (auth'd, full wipe, Section 32), `orders/delete-selective/route.ts` (auth'd, selective delete, Section 32), `tabs/route.ts`, `tabs/[id]/route.ts` (close-tab logic, Section 5), `order-issues/route.ts` (the "not received" report flow).

**Menu** — `menu/route.ts`, `menu/[id]/route.ts`, `menu/seed/route.ts`, `menu/upload/route.ts` (CSV import).

**Tables** — `tables/route.ts`, `tables/[id]/route.ts`, `tab-devices/route.ts`, `tab-devices/verify/route.ts` (session recovery, Section 5).

**Staff & Auth-adjacent** — `staff/route.ts`, `staff/[id]/route.ts` (Section 20's PIN-leak finding), `settings/route.ts` (shared PIN storage, unauthenticated PATCH), `auth/change-pin/route.ts`, `auth/recover-pin/route.ts`, `auth/verify-pin/route.ts`.

**Rewards / Spin & Win** — `rewards/spin/route.ts`, `rewards/spin-verify/route.ts`, `rewards/spin-invite/route.ts`, `rewards/eligibility/route.ts`, `rewards/reserve-coupon/route.ts`, `rewards/release-coupon/route.ts`, `rewards/validate-coupon/route.ts` (Section 25), `admin/spin-config/route.ts`, `admin/spin-rewards/route.ts`, `admin/spin-rewards/[id]/route.ts`, `admin/spin-rewards/import/route.ts`, `admin/rewards-audit/route.ts`.

**Printing** — `print-jobs/route.ts`, `print-jobs/[id]/route.ts` (fail-open `PRINT_AGENT_KEY` check, Section 9).

**Email** — `email/receipt/route.ts`, `email/process-queue/route.ts`, `email/diagnostics/route.ts`, `test-email/route.ts`.

**Finance** (19 routes, all authenticated — Section 12) — `finance/accounts/**`, `finance/audit-log/route.ts`, `finance/categories/route.ts`, `finance/closings/route.ts`, `finance/closings/reopen/route.ts`, `finance/salary-config/route.ts`, `finance/salary-payments/**`, `finance/summary/route.ts`, `finance/system-sales/route.ts`, `finance/transactions/**`, `finance/vendor-payments/**`, `finance/vendor-purchases/**`, `finance/vendors/**`.

**Admin/Config** — `admin/restaurant-config/route.ts` (Section 27), `admin/config-diagnostics/route.ts` (Section 27), `admin/feedback/route.ts`, `init/route.ts` (first-run bootstrap), `analytics/route.ts`, `expenses/route.ts` (Manager Expenses, Section 17), `offers/route.ts`, `feedback/route.ts`, `lookup/route.ts` (order lookup by name+phone), `track/route.ts`, `waiter-calls/route.ts`.

**AI** — `ai/chat/route.ts` (Google Generative AI integration).

Of these 77, exactly 21 perform server-side authentication and 2 more attempt it with a fail-open gap (Section 19). No route file was found that is unreachable/orphaned dead code — every file under `app/api/` corresponds to at least one client call site identified during this audit, with the caveat that this cross-reference was performed by the research agents rather than exhaustively re-verified file-by-file in this final synthesis pass.

---

## 22. Database Documentation & ER Diagram

**33 distinct tables** were found across all 23 SQL files under `supabase/` (`migration_001.sql` through `migration_020_staff_ordering.sql`, plus `migrations/20260530_add_variants.sql`, `migrations/20260609_multi_customer_sessions.sql`, and a consolidated `schema.sql`):

`restaurants`, `restaurant_settings`, `staff`, `menu_items`, `tables`, `customer_tabs`, `tab_devices`, `orders`, `order_items`, `order_events`, `order_issues`, `order_feedback`, `waiter_calls`, `split_bills`, `shift_logs`, `print_jobs`, `email_log`, `email_queue`, `spin_config`, `spin_rewards`, `spin_results`, `reward_coupons`, `expenses`, `settings`, `finance_accounts`, `finance_categories`, `finance_transactions`, `finance_audit_log`, `vendors`, `vendor_purchases`, `vendor_payments`, `staff_salary_config`, `salary_payments`, `daily_finance_closings` — 34 names listed there because `settings` (a small legacy/general table, distinct from `restaurant_settings`) also appears once, in `migration_007.sql`.

There is no ORM and no single canonical schema file that is guaranteed current — `schema.sql` exists as a consolidated snapshot but the 23 individual numbered/dated migration files are the actual applied-in-order history; `schema.sql`'s freshness relative to the latest numbered migration was not independently diffed column-by-column in this pass. **Confidence: Needs Runtime Verification** if `schema.sql` is ever used as a bootstrap source instead of replaying the migrations in order.

**Core relationships (ER diagram, primary FKs only):**

```mermaid
erDiagram
    RESTAURANTS ||--o{ RESTAURANT_SETTINGS : has
    RESTAURANTS ||--o{ STAFF : employs
    RESTAURANTS ||--o{ MENU_ITEMS : lists
    RESTAURANTS ||--o{ TABLES : has
    RESTAURANTS ||--o{ ORDERS : receives
    RESTAURANTS ||--o{ CUSTOMER_TABS : hosts
    TABLES ||--o{ CUSTOMER_TABS : seats
    CUSTOMER_TABS ||--o{ TAB_DEVICES : "bound to"
    CUSTOMER_TABS ||--o{ ORDERS : "aggregates (tab_id)"
    ORDERS ||--o{ ORDER_ITEMS : contains
    ORDERS ||--o{ ORDER_EVENTS : logs
    ORDERS ||--o{ ORDER_ISSUES : "not-received reports"
    ORDERS ||--o| ORDER_FEEDBACK : rated_by
    ORDERS ||--o{ PRINT_JOBS : "KOT for"
    ORDERS ||--o{ SPIN_RESULTS : "eligible via"
    SPIN_RESULTS ||--o{ REWARD_COUPONS : "wins ->"
    REWARD_COUPONS }o--|| ORDERS : "reserved/redeemed on"
    REWARD_COUPONS }o--|| CUSTOMER_TABS : "reserved/redeemed on (dine-in)"
    SPIN_CONFIG ||--o{ SPIN_REWARDS : configures
    STAFF ||--o{ STAFF_SALARY_CONFIG : "rate history"
    STAFF_SALARY_CONFIG ||--o{ SALARY_PAYMENTS : paid_via
    VENDORS ||--o{ VENDOR_PURCHASES : invoices
    VENDOR_PURCHASES ||--o{ VENDOR_PAYMENTS : "paid against"
    FINANCE_ACCOUNTS ||--o{ VENDOR_PAYMENTS : "paid from"
    FINANCE_ACCOUNTS ||--o{ SALARY_PAYMENTS : "paid from"
    FINANCE_ACCOUNTS ||--o{ FINANCE_TRANSACTIONS : "posted to"
    FINANCE_CATEGORIES ||--o{ FINANCE_TRANSACTIONS : categorizes
    ORDERS ||--o{ EMAIL_LOG : "dedup record"
    ORDERS ||--o{ EMAIL_QUEUE : "queued send"
```

The `reward_coupons` relationship to `orders`/`customer_tabs` is drawn with the caveat documented in Sections 5 and 37: the `reserved_order_id` and `reserved_tab_id` columns are meant to be mutually exclusive alternates depending on order type, but the dine-in reservation code path only ever populates `reserved_order_id` (with a tab ID in it), leaving `reserved_tab_id` effectively unused by that path despite being the column the tab-close redemption logic actually queries.

**Row Level Security:** enabled on all 33 tables, 43 total `CREATE POLICY` statements (some tables' policies are re-declared, wrapped in exception handlers, across multiple migration files as the schema evolved), every single one `USING (true) WITH CHECK (true)` (Section 19).

---

## 23. Realtime Architecture

Realtime is implemented via **Supabase broadcast channels**, not Postgres logical-replication/CDC subscriptions — confirmed by the channel-creation pattern (`sb.channel('restaurant:${restaurantId}')`) used throughout `lib/supabase-server.ts` (server-side `broadcast()` helper) and `lib/realtime-client.ts` (client-side `useRealtime()` hook). One channel per restaurant carries every event type; there is no per-topic/per-table channel segmentation.

**18 distinct event names** are known to `useRealtime()`, confirmed directly from the hook's own event-name array: `order_created`, `order_status_changed`, `order_ready`, `order_served`, `order_out_for_delivery`, `order_delivered`, `payment_completed`, `table_session_started`, `order_issue_reported`, `order_issue_escalated`, `order_issue_reserving`, `order_issue_resolved`, `order_event_added`, `order_confirmed`, `order_rejected`, plus a few additional event names used by specific portals (waiter-call and spin-related events) not enumerated in the excerpt captured for this document.

**No incremental/optimistic UI patching anywhere.** Every subscribing portal's event handler simply calls its own `refresh()` function on receipt of any relevant event — the entire relevant data set is re-fetched from the API rather than the specific changed row being patched into local state. Polling runs underneath as a backup on every portal regardless of realtime subscription status (5 seconds on most staff portals, 3 seconds on the Table portal, 4 seconds on the Track page), so realtime failure degrades to polling-speed freshness rather than to no updates at all.

**Realtime is staff-only.** `useRealtime()` is used by the Admin, Waiter, Kitchen, Manager, and Delivery portals — confirmed **not** used by any customer-facing page (Online, Table, Track, Spin), all of which rely purely on interval polling. This means the Table portal's "My Tab" live-bill view (Section 5) never receives a realtime push despite every mutating order/tab endpoint broadcasting an event that would be relevant to it — it only ever finds out about a status change on its next 3-second poll.

---

## 24. Email System

**Provider:** Resend, via `lib/email-server.ts` (1,617 lines) and `lib/email.ts`.

**Two parallel deduplication mechanisms exist side by side:**
1. An `order_events` check — before sending a receipt, the code queries whether a `ReceiptEmailSent` event already exists for the order (`lib/email-server.ts`, confirmed: "3. Idempotency: skip if ReceiptEmailSent already recorded in order_events" and "3. Duplicate prevention: check order_events for ReceiptEmailSent" appear at two separate call sites in the file).
2. A dedicated `email_log` table with a `UNIQUE(order_id, event_type)` constraint plus a free-form `dedup_key` (`${orderId}:${eventType}`) for additional flexible matching, inserted via `logEmail()`.

These two mechanisms are not unified into one function — different send paths in the file use one, the other, or (in the receipt-send path specifically) reference both, which the codebase itself seems to treat as deliberate defense-in-depth rather than accidental duplication, though this document does not have direct evidence either way on original intent.

**Retry queue:** a separate `email_queue` table holds sends that failed, with `RETRY_DELAY_MS = [0, 60_000, 300_000]` (immediate, then 1 minute, then 5 minutes) and `MAX_RETRIES = 3`; a job's `retry_count` reaching `MAX_RETRIES` marks it a permanent failure. **Retry processing is manual, not scheduled** — confirmed directly: no `vercel.json` exists in the repository (checked, file absent), and the retry queue is documented, inline in `app/admin/page.tsx`'s own help text, as something an admin flushes by hand: *"Flush the retry queue via: `GET /api/email/process-queue` (with Authorization header)"* — with a matching code comment in `app/api/orders/[id]/route.ts` ("so an admin can flush the retry queue manually via /api/email/process-queue"). There is no cron job, Vercel Cron config, or any other automated trigger calling this route found anywhere in the repository. A failed email genuinely stays queued until an admin manually hits this endpoint.

**Known duplicate-send risk:** per code-reading agent research, the Spin & Win invite email has a call site that can fire more than once for the same qualifying event under certain timing conditions — **Confidence: Per code-reading agent, not re-opened in final pass**; not independently reproduced against the fresh snapshot in this final pass.

**Send triggers observed:** order-confirmation email (fired from the waiter's confirm action, Section 8), receipt email (fired automatically on tab-close/order-completion, and — per Section 10's Manager Portal finding — potentially also fired a second time by an independent client-side call in the manager's pre-close modal when an email address is entered there, a possible duplicate-receipt risk flagged in the prior document, Section 37 item covers its current status), and the Spin & Win invite.

---

## 25. Rewards / Spin & Win

**Allocation is a Postgres RPC function, not application-layer logic** — confirmed directly from `migration_018.sql`: `perform_spin()` is defined with an explicit comment describing its own algorithm: *"1. Acquire FOR UPDATE row-level locks on every spin_rewards row in the pool... 3. Pick a reward by weighted probability from the eligible (within-limit) set."* The `FOR UPDATE` row locking (line 85) is explicitly there to prevent a race between two concurrent spins that could otherwise both allocate the same limited-quantity reward — the migration's own comment notes "Any concurrent perform_spin() that shares at least one reward ID will BLOCK" until the first transaction releases its lock. The function is granted to `service_role` only (`GRANT EXECUTE ON FUNCTION public.perform_spin TO service_role`), so it can only be invoked from the server-side Supabase client (`getServerClient()`), never with the anon/public key.

**Eligibility is re-verified server-side**, not trusted from the emailed link's parameters: `GET /api/rewards/spin-verify` independently re-checks config-enabled, minimum order amount, eligible order types, required contact fields, and whether a `spin_results` row already exists for this order/tab — the token in the link only identifies which customer/order to check, it is not itself the authorization.

**Win-weight is never sent to the browser.** `GET /api/rewards/wheel-rewards` returns only label/type/sort-order for active rewards — the actual probability weighting used by `perform_spin()` stays server-side, so the visible wheel cannot be reverse-engineered for its true odds from the client payload alone.

**Coupon lifecycle:** `active → reserved → redeemed` (or back to `active` if abandoned), spanning `POST /api/rewards/validate-coupon` (computes discount server-side), `POST /api/rewards/reserve-coupon` (locks a coupon to one order/tab — the route implicated in the dine-in redemption bug, Sections 5/37), and redemption itself, which happens **inline** inside `PATCH /api/orders/[id]` and `PATCH /api/tabs/[id]` at order/tab completion time rather than through any dedicated "redeem" route.

`POST /api/rewards/release-coupon` exists as a route but, per code-reading agent research, has no "remove applied coupon" UI action anywhere in the app calling it — the only real release paths observed are order cancellation and an automatic release fallback built into coupon validation itself. **Confidence: Per code-reading agent, not re-opened in final pass.**

---

## 26. Payment Architecture

**There is no payment gateway integration anywhere in this codebase.** Confirmed by searching `package.json` and all of `app/`/`lib/` for Stripe, Razorpay, PayPal, or any other payment-processor SDK: none is a dependency, none is imported. "Payment method" throughout the app (`paymentMethod` fields in `lib/api.ts`'s types, e.g. line 118: `paymentMethod: string; // 'cod' | 'gpay' | 'card' | etc.`) is purely a **label selected by a human** (customer at checkout, or waiter/manager/delivery staff recording how a bill was actually settled) — no code path ever calls out to an external service to authorize, capture, or verify a charge. Split payments are represented as either a structured breakdown or, in the delivery hand-off flow specifically, a freeform combined string such as `"Cash ₹500 + UPI ₹300"` (confirmed from a code comment in `lib/api.ts` describing the delivery payment-recording function).

This means every "payment" in the system is fundamentally a bookkeeping entry — the actual exchange of money happens outside the app (cash handed over, a UPI app used independently by the customer, a card machine at the counter) and staff simply record which method was used. The Finance module's account-balance auto-matching (Section 14) relies entirely on this self-reported label lining up with the correct `finance_accounts.payment_method_keywords` — there is no independent verification that a transaction labeled "cash" was, in fact, paid in cash.

---

## 27. Configuration System

The centralized ENV > Admin > Default resolver, `lib/config-server.ts`, was independently re-audited in this pass (it was the deliverable of the immediately-preceding task in this same session, so this document deliberately does not take its own correctness on faith).

**The core precedence engine is correctly implemented.** `resolveStringFromEnvAndValue()` genuinely applies: an explicit, non-empty ENV var wins if set; otherwise a value read from `restaurant_settings`/`restaurants` (the "Admin" layer) wins if present; otherwise a hardcoded application default is used. `parseEnvString`/`parseBoolean`/`parseNumber` are real, defensive parsers (confirmed: `parseBoolean` does not use a bare `if (process.env.X)` truthy check, per its own doc comment warning against exactly that mistake).

**But the centralization is only partially applied across the codebase — confirmed with specific counts:**
- `resolveRestaurantId()` and `getAllAdminSettings()` are exported from `lib/config-server.ts` (lines 105 and 204) but are effectively **dead exports** — the hand-duplicated pattern `process.env.NEXT_PUBLIC_RESTAURANT_ID ?? 'rest_default'` still appears independently in **29 separate files** across `app/` and `lib/` (confirmed by direct grep in this pass), none of which call the centralized resolver. The restaurant ID itself was never actually centralized despite the resolver existing for it.
- `restaurant_name` **is** correctly centralized: confirmed no remaining direct `process.env.RESTAURANT_NAME` / `NEXT_PUBLIC_RESTAURANT_NAME` reads outside `lib/config-server.ts` itself, across the 4 surfaces the prior task touched (`lib/email-server.ts`, the AI chat route, the rewards routes, `app/spin/page.tsx`, `app/api/admin/restaurant-config/route.ts`, `app/api/init/route.ts`, `app/admin/page.tsx`, `app/api/admin/config-diagnostics/route.ts`). However, **the literal string `"Foodie Lover"` is still hardcoded directly in 13 other files**, confirmed by grep in this pass: `app/admin/page.tsx`, `app/delivery/page.tsx`, `app/delivery/login/page.tsx`, `app/qr/page.tsx`, `app/api/test-email/route.ts`, `app/api/init/route.ts` (as a fallback default, appropriately), `app/api/staff/route.ts`, `app/page.tsx` (home page), `app/online/page.tsx`, `app/track/page.tsx`, `app/layout.tsx` (browser tab title / metadata), `app/table/page.tsx`, `app/spin/page.tsx`. Several of these overlap with files the prior centralization task *did* touch for other purposes (e.g. `app/spin/page.tsx`, `app/api/init/route.ts`) — meaning the centralization there is real but partial even within a single file: one usage of the restaurant name may go through the resolver while a second, different usage in the same file (e.g. a static page title, a metadata tag, an error-message string) still hardcodes the literal.
- **`kitchen_mode` has two parallel resolution paths that happen to agree today but are not unified.** `lib/config-server.ts` (around line 224) has a proper resolver reading `restaurants.kitchen_mode` with a documented Admin/default precedence. But `app/api/admin/restaurant-config/route.ts` — the actual endpoint the Waiter and Kitchen portals poll for this setting — does **not** call that resolver; it runs its own direct, hand-written query: `sb.from('restaurants').select('kitchen_mode').eq('id', RID).single()` (confirmed, line 15), defaulting to `'ask'` independently if the column is null (line 19: `data?.kitchen_mode ?? 'ask'`). The two paths produce the same practical result today (both default to `'ask'`), but they are genuinely two separate implementations of the same logic, which is a maintenance trap: a future change to the centralized resolver's `kitchen_mode` behavior (e.g. adding an ENV override) would silently not apply to the actual live-polled endpoint.

**Diagnostics:** `GET /api/admin/config-diagnostics` (backing the Admin Settings "Configuration" panel) is a thin, read-only wrapper around `getConfigDiagnostics()` in `lib/config-server.ts`, and is explicitly documented in its own file header to never return a secret value — only whether a secret ENV var is configured (true/false) — confirmed directly from the route file.

---

## 28. Full Environment Variable List

Every `process.env.*` reference found across `app/` and `lib/` in the fresh snapshot:

| Variable | Purpose | Secret? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | No |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key (client-side) | No (by design, but should still not be over-shared) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key — used server-side by `getServerClient()` for every API route, bypasses RLS entirely | **Yes — highest sensitivity** |
| `NEXT_PUBLIC_RESTAURANT_ID` | Single-tenant restaurant identifier, defaults to `'rest_default'` when unset | No |
| `NEXT_PUBLIC_APP_URL` | Base URL used to build absolute links (emails, QR codes, tracking links) | No |
| `ADMIN_PIN` | First-run seed value only for the admin PIN — read once by `init`, not read on every request | Yes |
| `KITCHEN_PIN` | First-run seed value for the kitchen PIN | Yes |
| `MANAGER_PIN` | First-run seed value for the manager PIN | Yes |
| `RESEND_API_KEY` | Resend email provider API key | Yes |
| `FROM_EMAIL` | Sender address for outbound email | No |
| `GEMINI_API_KEY` | Google Generative AI key, powers `/api/ai/chat` | Yes |
| `PRINT_AGENT_KEY` | Shared key the print-agent process presents to `/api/print-jobs`; **fails open if unset** (Section 9/19) | Yes (but currently optional in practice) |
| `CRON_SECRET` | Referenced in code; no active Vercel Cron configuration was found calling anything with it in this snapshot (`vercel.json` does not exist in the repository) — appears to be a leftover/reserved variable | Yes, if ever wired up |
| `APP_ENV` | Environment flag (e.g. distinguishing local/staging/production in a handful of conditional code paths) | No |
| `NODE_ENV` | Standard Next.js/Node environment flag | No |

The print-agent companion process (a separate deployable, not part of the Next.js app's own env) additionally reads its own set: `PRINTER_TYPE`, `PRINTER_NAME`, `PRINTER_DEV`, `PRINTER_IP`, `PRINTER_PORT`, `PRINTER_CHARS_PER_LINE`, `PRINTER_STATION_ID`, and the matching `PRINT_AGENT_KEY` to authenticate against `/api/print-jobs` (Section 9).

`ADMIN_PIN`/`KITCHEN_PIN`/`MANAGER_PIN` are seed-only: after first-run initialization writes them into `restaurant_settings`, subsequent PIN checks read the database value, not the environment variable — so rotating these ENV vars after initial setup has no effect unless the corresponding `restaurant_settings` row is also updated (through the Admin PIN-change flow, Section 20).

---

## 29. Hardcoded Configuration Search

Beyond the `"Foodie Lover"` string inventory in Section 27, other hardcoded values found during this audit:

- **`rest_default`** — the fallback restaurant ID, hardcoded independently in 29 files rather than referencing a single shared constant (Section 27).
- **Two independent hardcoded menu catalogs** — `app/api/menu/seed/route.ts` and `app/api/init/route.ts` (Section 7).
- **15-category fixed list** for the Online Ordering category pill bar, sourced from a fixed array rather than derived from the actual menu's distinct categories (per code-reading agent research on `app/online/page.tsx`).
- **`ISSUE_MAX_RETRIES = 3`** — the "not received" report escalation threshold, a literal constant rather than an Admin-configurable setting.
- **`EXPENSE_CATEGORIES`** (Manager Expenses) and the separate Finance `finance_categories` — two independently maintained category lists for conceptually similar data (Section 17), one a hardcoded constant in `lib/api.ts`, one a database table.
- **Retry/backoff constants** — `RETRY_DELAY_MS = [0, 60_000, 300_000]`, `MAX_RETRIES = 3` for email (Section 24), fixed in code rather than configurable.
- **Kitchen timer thresholds** — the green/amber/red elapsed-time bands (under 5 min / 5–10 min / past 10 min) on the Kitchen portal are literal values in the component, not Admin-configurable.
- **QR code size options** — the QR Generator's pixel-size choices (200/250/300) are a fixed set rather than a free-entry field.

---

## 30. Caching Audit

**HTTP-level caching is minimal and deliberate, not accidental.** A search for `Cache-Control`/`revalidate`/`dynamic` exports across `app/api/**/route.ts` found exactly one route setting an explicit cache header: `GET /api/menu` (`app/api/menu/route.ts`), which sets `Cache-Control: public, max-age=60, stale-while-revalidate=30` while still being marked `export const dynamic = 'force-dynamic'` — the route's own comment clarifies this combination is intentional: "still SSR, but we set Cache-Control manually." This means the menu list can be up to 60 seconds stale at a shared CDN edge for anonymous requests (relevant primarily to the Online Ordering portal, which is the only page that fetches menu data without an auth-gated session).

Every other route inspected that declares a caching-related export uses `export const dynamic = 'force-dynamic'` with no `Cache-Control` header at all (confirmed for `app/api/settings/route.ts`, `app/api/tables/route.ts`, and consistent with the pattern described for the majority of routes by the research agents) — meaning Next.js's default fetch-cache behavior is explicitly opted out of, and responses are effectively uncached beyond whatever a browser or intermediary does on its own with no `Cache-Control` header present.

**Application-level "staleness," as distinct from HTTP caching**, is the more consequential pattern in this codebase and is covered specifically in Sections 10 and 11: the Manager and Admin dashboards' Orders/Sales Report/Transparency tabs only re-fetch when their date filter changes, not on the 5-second poll interval or on realtime events that keep other tabs in the same file fresh. This is a component-level refresh-strategy inconsistency, not a server or CDN cache configuration issue, and was verified structurally against the Admin Dashboard's tab-loading pattern (each major section requiring an explicit "Load" click, Section 11) rather than independently re-clicked through in a running instance.

---

## 31. localStorage Inventory

**Keys actively read/written by the live, reachable application code** (confirmed by direct grep for `localStorage.getItem/setItem/removeItem` across `app/` and `lib/` in this pass):

| Key | Written by | Purpose |
|---|---|---|
| `fl_session_admin` / `fl_session_kitchen` / `fl_session_waiter` / `fl_session_manager` / `fl_session_delivery` | `lib/auth.ts` | Per-role session token + 8-hour expiry (Section 19) |
| `fl_device_id` | `lib/storage.ts`'s `getOrCreateDeviceId()`, called from `app/table/page.tsx` | Persistent per-browser device identifier used for Table-portal session recovery (Section 5) |
| `fl_offline_queue` | `lib/offline-queue.ts` (`QUEUE_KEY`) | Online Ordering's offline-order queue, replayed by `lib/sync-engine.ts` (Section 35) |
| `fl_current_shift_id` | Referenced in shift-related code | Current shift tracking |
| `kitchen_muted` | `app/kitchen/page.tsx` | Persists the Kitchen portal's alert-mute toggle across reloads |
| A WhatsApp-number key (variable name `WHATSAPP_KEY`) | Referenced in code | Persists an entered WhatsApp contact number, purpose/consumer not re-traced in this pass |

**Keys defined in `lib/storage.ts` but confirmed dead** — this corrects an imprecision from earlier research in this same session, which had characterized the entire `lib/storage.ts` file as unreachable. Direct re-verification in this pass found that `app/table/page.tsx` does import one function from it, `getOrCreateDeviceId` (the `fl_device_id` key above) — so the file itself is **not** wholly dead. However, everything else in `lib/storage.ts` — a full pre-Supabase, localStorage-based CRUD data layer for orders, menu, tabs, staff PIN, and more — has no other import site found anywhere in `app/` or `lib/`. Its keys: `fl_orders`, `fl_menu`, `fl_admin_pin`, `fl_customer_tabs`, `fl_device_records`, `fl_expenses`, `fl_food_disputes`, `fl_fraud_alerts`, `fl_order_events`, `fl_order_num_counter`, `fl_split_bills`, `fl_tables`, `fl_waiter_calls` — 13 keys, all dead in the sense that no live code path writes or reads them today, left over from what was evidently an earlier, pre-Supabase version of this application (Section 38).

---

## 32. Order Deletion Documentation

Two distinct deletion tools exist, both confined to the Admin Dashboard's "danger zone" and both requiring the shared admin PIN — the only two non-Finance routes in the entire app with real server-side authorization (Section 19).

**`POST /api/orders/delete-selective`** — deletes a specific subset of orders by one of three modes: a single `orderId`, all orders on a given IST calendar `date`, or an IST `dateFrom`/`dateTo` (+ optional `timeFrom`/`timeTo`) range. It requires `{ pin, mode, ... }` in the request body and verifies the PIN server-side before doing anything, and now also requires `requireRole(['admin'])` (H6, Section 36 — the preview `GET` below used to be unauthenticated; both are gated now). Its own in-code comment documents the full FK dependency chain it has to walk in order:
1. Look up `spin_results` rows for the target orders.
2. Delete `reward_coupons` whose `spin_id` came from those spin results (this unblocks the `spin_results` cascade, since `reward_coupons.spin_id` is a `RESTRICT`, not `CASCADE`, foreign key).
3. Nullify remaining `reward_coupons` back-references (`source_order_id`, `reserved_order_id`, `redeemed_order_id`) on coupons from *other* orders that happen to reference one of the orders being deleted.
4. Delete `order_events`, `order_items`, and `spin_results` for the target orders, in parallel.
5. Delete the `orders` rows themselves, now that all `RESTRICT` foreign keys pointing at them have been cleared.
6. **(Added in this remediation pass.)** Before deletion, collect the distinct `tab_id`s of every order about to be deleted. After the deletion completes, call `recomputeClosedTabTotal()` (`lib/finance-server.ts`) once per affected tab that is `status='closed'` — see below for exactly what this does.

A companion `GET` on the same route returns a preview count/estimate for a date/range query, and now also reports `closedTabsAffected`/`estimatedRevenueImpact` so the Admin UI can warn the operator *before* they confirm a deletion that will reverse recognized Finance revenue.

**Finance synchronization on deletion (added in this remediation pass — this was previously a real gap, reported directly to the user as "if I delete orders why does Finance still show revenue," and fixed per the user's explicit decision to have deletion reverse tab revenue rather than merely warn about it).** `recomputeClosedTabTotal(sb, tabId, changedBy)`:
- Recomputes the tab's `total` from its remaining (non-cancelled/void) orders.
- Proportionally caps `discount`+`coupon_discount` so they never exceed the recomputed total (prevents a negative or nonsensical net after a partial deletion).
- **Skips** (does not touch) any tab that already has a `split_bills` row, returning `{skipped: true, reason}` instead — so a bill that's already been split per-person is never silently made inconsistent by a later order deletion. Both `delete-selective` and `clear` surface these skipped tabs back to the Admin UI (`⚠️ N closed tables skipped — review manually`) rather than hiding the gap.
- Writes a `finance_audit_log` entry (`action='revenue_reversed_on_order_deletion'`, `entityType='customer_tab'`) recording the before/after `total`/`discount`/`coupon_discount`, so the reversal itself is auditable — a deleted order's prior Finance contribution is no longer erased with zero trace; the trace now lives in the audit log even though the order row itself is gone.
- Updates `customer_tabs.total`/`discount`/`coupon_discount`/`updated_at` to the recomputed values.

**What this route still does not touch:** `finance_transactions`, `vendor_payments`, `salary_payments`, `print_jobs`, `email_log`, `email_queue`, `order_feedback`, and `order_issues` rows referencing the deleted orders are left in place — by design, since these represent independent Finance-ledger/operational records that should not disappear just because the underlying order row was purged.

**`app/api/orders/clear/route.ts`** — the second danger-zone tool, a full wipe of every order/item/event in the database, PIN- and now role-gated the same way. **Re-verified line-by-line in this pass** (previously flagged Needs Runtime/Code Verification): its FK-walk sequence is structurally identical to `delete-selective`'s (order_events → order_items → reward_coupons → spin_results → orders, with an explicit in-code comment on why reward_coupons must be deleted before spin_results/orders to satisfy `RESTRICT` foreign keys). Since a full clear necessarily zeroes every order, the revenue-reversal step (added this pass) loops over every `status='closed'` tab and calls the same `recomputeClosedTabTotal()` per tab — replacing an earlier, less-safe design that did a single bulk `UPDATE customer_tabs SET total=0` with no audit trail and no split-bill guard.

---

## 33. Auditability

**Two genuinely distinct audit trails exist, at different levels of rigor:**

1. **`order_events`** — a general-purpose event log, written from at least 8 separate API-route call sites (confirmed by grep). It captures status transitions, confirmations, rejections, issue reports/escalations/resolutions, and feedback submission, and is the backbone of both the customer-facing Track page's progress stepper (Section 4) and the Waiter portal's order-detail timeline (whose color/label mapping, per code-reading agent research, only partially overlaps the actual event-type strings it's meant to style — Section 37 covers this). It is a log of *what happened to an order*, not specifically a security/access audit log — it has no actor-authentication behind it, since the routes writing to it are themselves largely unauthenticated (Section 19).

2. **`finance_audit_log`** — a purpose-built audit table, confirmed via `logFinanceAudit()` in `lib/finance-server.ts`: every mutating Finance action is meant to write a row here, and the write is wrapped in its own try/catch with a `console.error` fallback if the audit insert itself fails — meaning a Finance action can still succeed even if its audit-log entry fails to write, so the audit log is not transactionally guaranteed to be complete. This is the closest thing in the codebase to a real access/change audit trail, and it only covers Finance.

**Nothing resembling an audit trail exists for the ~54 unauthenticated routes** (Section 19) beyond whatever `order_events` happens to capture incidentally for order-related ones — a PIN change via `/api/settings`, a staff record edit via `/api/staff/[id]`, or a table edit via `/api/tables/[id]` leaves no dedicated audit row anywhere, only whatever the database's own row-level `updated_at` timestamp implies.

---

## 34. Error Handling Patterns

**The dominant server-side pattern, consistent across essentially every route file inspected:** a top-level `try { ... } catch (err) { console.error(...); return NextResponse.json({ error: msg }, { status: 500 }) }` wrapper, with a small shared `errMsg()`/equivalent helper in most files to safely extract a message string from an unknown caught value. `app/api/orders/[id]/route.ts` alone contains 3 top-level try blocks and 12 `console.error` call sites across its various action branches — representative of the file-by-file granularity used throughout the API layer. There is no centralized error-handling middleware, no structured error-response schema beyond `{ error: string }`, and no error codes/types beyond the HTTP status — callers are expected to parse the message string if they need to distinguish failure reasons.

**Client-side:** a global `ErrorBoundary` component (`components/ErrorBoundary.tsx`) is mounted in the root layout (`app/layout.tsx`), confirmed present — meaning an uncaught render error anywhere in the React tree is caught at the top level rather than only within the Online Ordering portal specifically (correcting a possible over-narrow reading of the prior document's framing, which described the ErrorBoundary specifically in the context of Online Ordering; it is in fact wired at the application root).

**Silent failures are a recurring, specifically-named pattern across portals**, confirmed structurally by the research passes and consistent with the direct evidence gathered in this pass: a rejected order-status-advance on the Kitchen portal is only logged to the console with no visual feedback to the cook (Section 9); a failed menu fetch, offers fetch, or post-order coupon reservation on Online Ordering fails with no user-visible error; the coupon-validation call on the Table portal uses a raw `fetch()` rather than the app's `apiFetch`/`safeApiCall` wrappers, so it fails silently offline rather than being retried by the sync engine. These are UX-completeness gaps rather than data-integrity bugs, but they mean a genuine failure (network drop, invalid state, server error) can present to staff or customers as if nothing happened, which in a live-restaurant-operations context has real consequences (a missed order, an uncollected payment adjustment).

---

## 35. Idempotency & Duplicate-Protection Audit

Idempotency protection in this codebase is **inconsistent — genuinely strong in a few specific places, and genuinely absent (despite comments claiming otherwise) in others.**

**Strong, confirmed protections:**
- **Spin allocation** — `perform_spin()`'s `FOR UPDATE` row locking (Section 25) is real, DB-enforced protection against a double-win race condition.
- **Feedback submission** — `POST /api/feedback` is described as idempotent per order by the prior document's framing; not independently re-verified in this pass beyond noting no contradicting evidence was found.
- **Dine-in order merging** — placing a second order on a tab that already has one `awaiting_waiter` merges items into the existing order rather than creating a duplicate (Section 5), which is a deliberate idempotency-adjacent design choice, not a bug.
- **Email deduplication** — the dual `order_events`/`email_log` mechanism (Section 24), whatever its redundancy, is real protection against re-sending the same receipt.

**Confirmed absent, despite a comment claiming otherwise — the most significant finding in this section, independently re-verified against the fresh snapshot in this pass, not merely carried forward:** `lib/sync-engine.ts`'s `replayEntry()` function, which re-submits an order from the offline queue (`fl_offline_queue`, Section 31) once the browser regains connectivity, carries the comment `// Duplicate check: if idempotencyKey matches an existing order tracking token, skip` directly above the code that does the actual replay — but the code immediately following that comment is simply `await createOrder(p as Parameters<typeof createOrder>[0])`, with **no check of any kind** against an existing tracking token, an idempotency key, or any other server-side de-duplication signal. If a `create_order` request actually succeeds on the server but its response never reaches the browser (a dropped connection, a closed tab, a timeout), the offline queue still holds that entry and will unconditionally resubmit it as a **second, separate order** the next time the sync engine runs — with no server-side idempotency key check on the receiving end either (`POST /api/orders` was not found to check any client-supplied idempotency key against prior orders in the routes read during this audit). This is a real, confirmed, money-and-kitchen-workflow-affecting gap: a customer's order can be prepared and billed twice from a single actual submission.

**Also confirmed absent:** no idempotency check on the vendor-payment or salary-payment posting sequences (Section 15–16) beyond ordinary database constraints — a client retry of a failed multi-step write could, in principle, post a duplicate `finance_transactions` entry, though no direct evidence of this actually occurring was sought or found (this is a structural risk assessment, not an observed incident).

---

## 36. Known Issues — Fresh Audit (Critical/High/Medium/Low)

**This section was last fully regenerated as part of the final remediation pass and re-verified line-by-line against the current codebase (not carried forward from the original audit text).** Every Critical and every applicable High finding from the original audit is now RESOLVED — evidence for each is cited below. See Section 37 for the recheck methodology and Section 51 for the Finance revenue-model documentation this pass also produced.

### Critical — all RESOLVED

**C1. ~~No server-side authentication on ~70% of API routes~~ — RESOLVED.**
Of 79 current `route.ts` files, only 19 lack a `requireRole`/`requireAnyStaff`/`requireAdminPin` check, and every one of those 19 is an intentionally-public customer-facing endpoint gated by an ownership-proof pattern instead (tab id as bearer capability, tracking token, spin token, or coupon email+phone match) — not a blanket-open PII/mutation route. All 5 originally-named files are now gated: `app/api/settings/route.ts` (PATCH `requireRole(['admin'])`), `app/api/staff/route.ts` and `app/api/staff/[id]/route.ts` (all methods `requireRole(['admin'])`), `app/api/orders/[id]/route.ts` (`requireAnyStaff`, with a tightly body-key-allowlisted customer-safe branch), `app/api/tabs/[id]/route.ts` (`requireRole` on close/staff-only updates, explicit customer-safe field carve-out). Residual, low-severity note: `GET /api/tabs/[id]` is intentionally public (bearer-capability pattern) and does return the tab's session-join `pin` to anyone holding the tab id — acceptable under the app's existing capability model but worth remembering if that model is ever revisited.

**C2. ~~RLS enabled everywhere but enforces nothing~~ — RESOLVED at the migration-file level; DB application status must be verified at deploy time.**
`supabase/migration_022_rls_tighten.sql` drops the universal `all_access` `USING(true) WITH CHECK(true)` policy from all 33 tables via `DROP POLICY IF EXISTS`, leaving RLS enabled with zero permissive policies (default-deny for the anon key; the server-role key used by all API routes is unaffected, since RLS never applied to it). Per this project's standing safety rule, this migration has been written but **not auto-applied to the live Supabase project** — whether it has been applied cannot be determined from the repository alone. **Action needed before this can be marked fully closed: apply `migration_022_rls_tighten.sql` to the live database with explicit user approval**, then confirm with a live `SELECT` against `pg_policies`.

**C3. ~~Staff PINs transmitted to the browser in plaintext for client-side comparison~~ — RESOLVED.**
`app/api/staff/[id]/route.ts` GET is now `requireRole(['admin'])`-gated (no longer callable by an arbitrary unauthenticated party). PIN verification now happens server-side via `lib/pin-hash.ts` + `/api/auth/verify-pin` / `/api/auth/staff-login`, not by shipping the raw PIN to the browser for a client-side string comparison.

**C4. ~~Dine-in coupon redemption broken by a `reserved_order_id`/`reserved_tab_id` column mismatch~~ — RESOLVED.**
`app/api/rewards/reserve-coupon/route.ts` writes `reserved_order_id` (and, per this session's AUTH-4 fix, now also requires `{email, phone}` ownership proof matching the coupon's stored customer contact before it will do so). `app/api/tabs/[id]/route.ts`'s tab-close redemption query reads that same `reserved_order_id` column, with an explicit in-code comment documenting the original bug and the fix. No `reserved_tab_id` reference remains anywhere in the repository.

**C5. ~~Offline order replay could silently create duplicate paid orders (no real idempotency check despite a comment claiming one)~~ — RESOLVED.**
`app/api/orders/route.ts` POST now performs a genuine idempotency-key lookup and returns the existing order on a repeat key rather than creating a duplicate. The client generates a real `idempotencyKey` (`app/online/page.tsx`) and threads it unchanged through `lib/api.ts` → `lib/offline-queue.ts` → `lib/sync-engine.ts`. (`lib/sync-engine.ts`'s original comment about a client-side check is now just stale wording — the actual guarantee lives server-side, which is the correct place for it.)

**C6. ~~Order IDs/tracking tokens not cryptographically random; tracking data returned before any token check~~ — RESOLVED.**
`lib/supabase-server.ts` adds `newSecureId()` (`crypto.randomBytes(16)`-backed), used for order ids and tracking tokens (`newSecureId('ORD')`, `newSecureId('TRK')` in `app/api/orders/route.ts`). The plain, non-cryptographic `newId()` is kept only for genuinely non-secret ids, with an in-code comment explaining that distinction is deliberate. `GET /api/orders/[id]` now requires either a staff session or a matching `?token=` query param before it will return order data — the tracking page can no longer be handed another customer's PII by guessing/enumerating an order id.

### High

**H1. ~~Manager Portal's "Expenses Today" and "Net Profit Today" are permanently wrong~~ — RESOLVED.**
Affected files: `app/manager/page.tsx`. `refresh()` now fetches `listExpenses()` + `computeExpenseStats()` and calls the previously-dead `setTodayExpenses`. The figure has also been relabeled: **"Net Profit Today" is now "Net Margin Today"**, because Manager-scope net-of-expenses is not the same figure as Finance's Net Cash Flow (see Section 51) — the old label was a real business-accuracy bug independent of the dead-state bug, and both are fixed together.

**H2. ~~Print-job listing endpoint fails open if `PRINT_AGENT_KEY` unset~~ — RESOLVED.**
`app/api/print-jobs/route.ts`'s `checkAuth()` now returns `false` (denies) and logs a warning when the key is unset, rather than warning and continuing to serve.

**H3. ~~Kitchen portal item-advance action could update the wrong item (array-index-as-key)~~ — RESOLVED.**
`app/kitchen/page.tsx` now calls `advanceItem(orderId, itemId)` keyed by `order_items.id` only (the advance button is hidden if an item has no id), and `lib/api.ts`'s `updateItemStatus()` no longer accepts an index. The server route retains an unused `itemIndex` fallback branch that nothing in the current codebase exercises — flagged in Section 38 as safe-to-remove dead code rather than a live bug.

**H4. Single shared Admin PIN gates Finance, order deletion, and the entire Admin Dashboard — confirmed still accurate, by design, not fixed.**
Affected files: `restaurant_settings` (`key='admin_pin'`), `lib/finance-server.ts`, `app/api/orders/clear/route.ts`, `app/api/orders/delete-selective/route.ts`.
This remains true after re-verification. It is being left as-is deliberately: introducing a second Finance-specific credential is a genuine business-rule/UX decision (who should hold it, how it's provisioned, whether it's per-admin or shared) that this remediation pass cannot make unilaterally for a live restaurant's operations — flagged here for the user's decision rather than silently implemented.
Confidence: Confirmed directly.

**H5. ~~Vendor/salary payment posting is a non-atomic multi-step write with no compensating rollback~~ — RESOLVED.**
`supabase/migration_023_finance_atomicity.sql` adds `SECURITY DEFINER` Postgres functions (`create_vendor_payment`, `void_vendor_payment`, `create_salary_payment`, `void_salary_payment`) that perform the payment + linked-transaction + balance-update writes inside one database transaction, with `FOR UPDATE` row locks and an idempotency-key fast path. The four corresponding API routes now call these RPCs instead of doing the writes sequentially in application code. Per this project's standing safety rule, this migration is written but **not yet applied to the live database** — needs explicit user approval to apply, same as C2/migration_022.

**H6. ~~Order-deletion preview count had no authentication~~ — RESOLVED.**
`GET /api/orders/delete-selective` now requires `requireRole(['admin'])` before returning the preview count/estimate.

**H7 (new, found and fixed in this pass). `POST /api/rewards/spin`'s legacy email-based auth path let anyone redirect another customer's reward to an attacker-controlled email.** The route accepted a `customerEmail` body field with zero proof it belonged to the order/tab in question — anyone who knew (or enumerated) an `orderId`/`tabId` could POST their own email and claim that customer's spin reward. Confirmed this path had **zero live callers** anywhere in the current UI (`app/spin/page.tsx`, the only caller, always uses the token-based path — the legacy `/track`-page caller referenced in an old code comment no longer exists). Fixed by removing the legacy path outright: `spinToken` is now required unconditionally, and email/phone are always derived server-side from the token-validated order/tab, never accepted from the request body.

**H8 (new, found and fixed in this pass, Medium in original severity terms — grouped here for continuity with H7). `GET /api/tab-devices` was a fully unauthenticated PII dump when called with no query parameters.** It fell through to an unfiltered `select *` across the whole `tab_devices` table — every customer name, device id, and table id ever recorded, across every tab, and (since it never filtered by `restaurant_id` despite callers passing one) every restaurant. Fixed: the route now rejects any request supplying neither `tabId` nor `deviceId` (400), and every branch filters by `restaurant_id`. `tabId`/`deviceId` continue to work as unauthenticated bearer capabilities for legitimate per-tab/per-device lookups, consistent with this app's existing capability-based patterns elsewhere — no caller in `lib/api.ts` ever relied on the unfiltered mode, so nothing legitimate was broken.

### Medium

**M1. ~~`kitchen_mode` has two independent resolution implementations that happen to agree today~~ — RESOLVED.** `app/api/admin/restaurant-config/route.ts` GET now calls `resolveKitchenMode()` from `lib/config-server.ts` instead of running its own hand-rolled query — one implementation, not two.

**M2. Restaurant-ID centralization resolver exists but is unused; 29 files still hand-duplicate `NEXT_PUBLIC_RESTAURANT_ID ?? 'rest_default'`.** Re-confirmed still true in this final pass. **Deliberately deferred, not fixed:** every one of the 29 call sites currently resolves to the exact same value the resolver would produce (single-restaurant deployment), so there is no live-behavior risk — but mechanically rewriting all 29 files carries real regression risk (each site would need individual review, not a blind find/replace) for a purely cosmetic-centralization win. Left as a documented cleanup item rather than a blind 29-file sweep in an autonomous pass on a live-money codebase. Recommended fix, when someone reviews it file-by-file: migrate call sites to `resolveRestaurantId()`.

**M3. `"Foodie Lover"` is hardcoded in ~15 files despite a working centralized name resolver.** Re-confirmed still true. **Deliberately deferred for the same reason as M2** — cosmetic/branding centralization, zero functional impact, not worth a broad mechanical sweep without individual review in this pass.

**M4. Two independent hardcoded menu catalogs (`menu/seed` vs `init`) can diverge over time.** Re-confirmed still true (`app/api/menu/seed/route.ts`: 70 `name:` occurrences vs `app/api/init/route.ts`: 50). **Deliberately not merged in this pass:** these are one-time seed scripts (used only to populate a fresh/empty database), not a live data-read path, so the divergence has no effect on the currently-running restaurant's actual menu data — but *which* catalog should be treated as canonical if the DB is ever re-seeded is a genuine business/menu decision (the two catalogs likely reflect different points in the restaurant's actual menu history), not something to silently pick and delete data for. Flagged for the user's decision rather than guessed.

**M5. Admin/Manager Orders, Sales Report, and Transparency tabs can silently go stale** — only re-fetch on filter change, not on the 5-second poll or realtime events that keep the Overview tab fresh. Re-confirmed directly this pass: `app/admin/page.tsx`'s single `useRealtime` subscription only calls `refresh()` (Overview data); the Sales/Transparency tabs' data is fetched only when their own filters change. Not fixed in this pass — extending realtime subscriptions to additional tabs of an already very large (6,000+ line) file carries meaningful regression risk for a staleness window that's already bounded (tabs still refresh on every filter interaction and on manual reload). Recommended fix: subscribe these tabs to the same realtime events Overview already uses, ideally as its own reviewed change.

**M6. Daily Finance Closing does not lock underlying data — a "closed" day can silently drift**, with only a UI warning badge (not a hard constraint) protecting against it. Re-confirmed directly from the migration's own design-intent comment (Section 18) — a documented, deliberate design tradeoff, not an oversight.

**M7. `tab_devices.personal_pin` is write-only** — recorded on every session start (`app/table/page.tsx`, `POST /api/tab-devices`) but never read back: `POST /api/tab-devices/verify`, the only per-person recovery-verification path, checks `customer_tabs.pin` (the shared tab PIN) instead of `personal_pin`. Re-confirmed directly this pass by reading `app/api/tab-devices/verify/route.ts` in full. Not fixed: whether "my personal PIN" should independently unlock *just my own* tab at a shared table, versus every tab sharing one table-wide PIN, is a real customer-facing session-recovery UX decision this pass should not make unilaterally for a live restaurant. Flagged for the user's decision.

**M8. Two parallel "food not received" systems** (a legacy dispute-event banner and the newer `order_issues`-backed re-serve flow) are both still fully wired and independently reachable. Re-confirmed directly this pass: legacy banner logic lives in `app/waiter/page.tsx`; the newer flow is `app/api/order-issues/route.ts` + `order_issues` table, surfaced in `app/track/page.tsx`. Not consolidated in this pass — deciding which system should be the sole surviving one is a product decision, not a code-correctness fix (both currently function).

### Low

**L1. ~~QR Generator has no error fallback if `api.qrserver.com` is unreachable~~ — RESOLVED.** `app/qr/page.tsx` now tracks per-table image-load failures and swaps a broken QR image for a visible "QR image unavailable — table link still works" fallback (including the raw table URL as text) instead of printing a silent broken-image icon.

**L2. ~~Kitchen alert beep ignores the mute toggle~~ — RESOLVED.** `app/kitchen/page.tsx`'s new-order beep (`playOrderAlert()`) is now gated on `!kitchenMutedRef.current`, matching the spoken announcement's existing check.

**L3. Several dead/half-wired UI elements, re-confirmed still present, deliberately not wired up in this pass**: a fully-built "PIN Manager" modal in the Admin Dashboard with no button that opens it (`app/admin/page.tsx`); a "Table Occupancy Analytics" widget unconditionally kept empty per an in-code comment noting the backing endpoint was never built; menu CSV import/export functions defined but not wired to any button in the Manager page. Re-confirmed directly this pass (not just per prior report). **Not fixed:** each of these is a partially-built feature whose intended final behavior (should the PIN Manager modal ship? does Table Occupancy Analytics need a real backing endpoint built from scratch? should CSV import/export be exposed to Manager users?) is a product-scope decision, not a bug with an obvious correct fix — wiring a button to it would be guessing at unshipped functionality rather than remediating a defect. Flagged for the user's decision on which (if any) should be completed and shipped.

**L4. ~~`WaiterTakeOrder.tsx` component exists fully implemented but was not found imported into `app/waiter/page.tsx`~~ — RESOLVED (was a stale finding, not a code defect).** Re-verified directly against current code (Section 3): the component IS imported (lazy import at `app/waiter/page.tsx:24`), has a dedicated "➕ TAKE ORDER" button, and is rendered/reachable in the live Waiter Station UI. No code change was needed — only this document's claim was wrong and has been corrected.

---

## 37. Recheck of Previously-Reported Issues

**A note on scope.** The task instructions referenced "13 previously-reported issues" to explicitly recheck. The only predecessor document available for this audit, `docs/foodie-lover-reference.docx`, does not contain a list of exactly 13 issues — it contains **6 headline "issues worth fixing first"** (its own Appendix, the items it considered highest-consequence) plus **48 additional portal-level "Notable issues found"** entries spread across its ten portal sections (54 distinct issues total, by direct extraction from the document). Rather than guess which 13 of these 54 were meant, this section rechecks all 6 headline issues in full (each independently re-verified against the fresh snapshot in this pass, not assumed), plus a representative set of the most consequential portal-level items, with the remainder listed for completeness at a lighter verification depth. This is more thorough than a 13-item recheck would have been, at the cost of not matching the specific number requested — flagged here explicitly rather than silently substituted.

### The 6 headline issues — all independently re-verified in this pass

| # | Issue (as originally reported) | Status | Evidence |
|---|---|---|---|
| 1 | Order details aren't protected by the tracking token — `GET /api/orders/[id]` returns full PII to anyone with a valid order ID, no server-side token check; IDs/tokens are timestamp+random, not cryptographic | **STILL EXISTS** | Confirmed directly: `app/api/orders/[id]/route.ts` GET (lines 12–28) has no token parameter or check at all; `newId()` in `lib/supabase-server.ts` still uses `Date.now() + Math.random()`. See C6, Section 36. |
| 2 | Staff PINs compared client-side — full staff record incl. plaintext PIN sent to browser via `GET /api/staff/[id]` | **STILL EXISTS** | Confirmed directly: route returns `pin` field verbatim in JSON, GET has no auth. See C3, Section 36. |
| 3 | No API route checks who's calling it — ~60 routes trust every request | **STILL EXISTS (and now precisely quantified)** | Confirmed directly: 54 of 77 route files (≈70%) have zero server-side auth of any kind; the original "~60" estimate is now measured precisely. See C1, Section 19. |
| 4 | Dine-in reward coupons may never get redeemed — `reserved_order_id` vs `reserved_tab_id` column mismatch | **STILL EXISTS** | Confirmed directly, all three implicated files read line-by-line. See C4, Section 36. |
| 5 | "Net Profit Today" on Manager dashboard is meaningless — `Expenses Today` wired to a never-set state variable, permanently ₹0 | **STILL EXISTS** | Confirmed directly: `todayExpenses` setter never called anywhere in `app/manager/page.tsx`. See H1, Section 36. |
| 6 | Offline order replay can create duplicates — no real idempotency check despite a comment claiming one | **STILL EXISTS** | Confirmed directly: the comment and the unchecked `createOrder()` call sit adjacent in `lib/sync-engine.ts`. See C5, Section 36. |

**All six of the previous document's headline "fix these first" issues remained present, unchanged, at the time this table was written.** None had been fixed yet; none was newly inapplicable.

**Update — final remediation status (this pass).** All six have since been fixed across the remediation sessions that followed this recheck; the table above is left intact as the historical record of what was found, not edited in place. Current status: #1 → RESOLVED, see C6/Section 36 (server-side token check added, IDs/tokens now `crypto.randomBytes`-based). #2 → RESOLVED, see C3 (server-side PIN verification, no plaintext PIN sent to browser). #3 → RESOLVED, see C1 (every mutating/PII route now gated by a real session check or an explicit ownership-proof pattern). #4 → RESOLVED, see C4 (`reserved_order_id` used consistently end-to-end). #5 → RESOLVED, see H1 (expense fetch wired in; also relabeled "Net Margin Today" — see Section 51 for why "Net Profit" was the wrong name even once the number itself was fixed). #6 → RESOLVED, see C5 (real server-side idempotency-key check).

### A sample of portal-level issues, rechecked at varying depth

| Issue (portal, as originally reported) | Status | Confidence |
|---|---|---|
| Kitchen: item-index mismatch risk on per-item advance | **RESOLVED** (final pass) | See H3, Section 36 — now keyed by `order_items.id` only |
| Kitchen: alert beep ignores mute (only voice respects it) | **RESOLVED** (final pass) | See L2, Section 36 — beep now gated on the same mute ref as the voice announcement |
| Kitchen: timer measures order age, not cook-start time | STILL EXISTS | Confirmed directly — timer is computed from order creation time per `app/kitchen/page.tsx` |
| Waiter: bill-ready total omits reserved coupon discount | STILL EXISTS | Per code-reading agent, not re-opened this pass |
| Waiter: delivery hand-off records the confirming waiter as `delivery_person`, not a real courier | STILL EXISTS | Confirmed directly — `markServed()`'s delivery branch sets `delivery_person` to the waiter's own name |
| Waiter/Delivery: two parallel "food not received" systems both wired | NEEDS RUNTIME/CODE VERIFICATION | Per prior report only, not independently re-opened this pass |
| Delivery: "Delivered" filter bucket structurally near-empty (auto-chains to `completed`) | STILL EXISTS (structural) | Confirmed directly — `VALID_TRANSITIONS` still allows `delivered → completed`, and no code found gating the second PATCH behind a delay |
| Delivery: urgency timer uses order-creation time, not ready time | STILL EXISTS (structural pattern, same class as Kitchen) | Per code-reading agent, not re-opened this pass |
| Manager: "All-Time Discounts" KPI is actually today-only | NEEDS RUNTIME/CODE VERIFICATION | Per prior report only, not independently re-opened this pass |
| Manager: split-by-person payment tracking disconnected from actual close-tab payment method | STILL EXISTS | Confirmed directly — `PATCH /api/tabs/[id]` records one `payment_method` for the whole tab; no code path found consuming a per-person breakdown at close |
| Manager: possible duplicate receipt email on tab close | NEEDS RUNTIME/CODE VERIFICATION | Per prior report only; Section 24 notes the dual dedup mechanism that would need to fail for this to actually manifest twice |
| Manager: menu CSV import/export tooling has no wired button | STILL EXISTS | Per code-reading agent, not re-opened this pass — see L3 |
| Admin: "PIN Manager" modal is dead code (fully built, unreachable) | STILL EXISTS | Per code-reading agent, not re-opened this pass — see L3 |
| Admin: "Table Occupancy Analytics" widget permanently empty | STILL EXISTS | Per code-reading agent, not re-opened this pass — see L3 |
| Admin: Staff Accountability cancellation column structurally always zero | STILL EXISTS | Per code-reading agent, not re-opened this pass |
| Admin: kitchen routing mode editable from two tabs writing the same setting (M1's two independent resolvers) | **RESOLVED** (final pass) | See M1, Section 36 — the config route now calls the shared `resolveKitchenMode()` resolver instead of its own query |
| Online: coupon vs. automatic offer never compared (coupon always wins even if smaller) | NEEDS RUNTIME/CODE VERIFICATION | Per prior report only, not independently re-opened this pass |
| Online: price range assumes sorted variants | NEEDS RUNTIME/CODE VERIFICATION | Per prior report only, not independently re-opened this pass |
| Table: `tab_devices.personal_pin` is write-only | STILL EXISTS | Confirmed directly, see M7 |
| Table: Special Instructions field captured but never sent in order payload | NEEDS RUNTIME/CODE VERIFICATION | Per prior report only, not independently re-opened this pass |
| Spin: admin config endpoints accept unvalidated raw request bodies | NEEDS RUNTIME/CODE VERIFICATION | Per prior report only, not independently re-opened this pass |
| Track: delivery "Confirm Delivery" button/step is vestigial (auto-completed by delivery portal instead) | Consistent with current findings | The delivery portal's confirmed two-PATCH auto-chain (Delivered → Completed, see Delivery-portal row above) is consistent with this no longer being a manual customer-visible step; not independently re-opened at the Track-page component level this pass |

The remaining ~28 portal-level items from the prior document not listed in the table above were not individually rechecked in this pass; they are lower-consequence UI/UX findings (styling inconsistencies, minor silent-failure UX gaps) rather than correctness or security issues, and this document does not claim their current status one way or the other. A full line-by-line recheck of all 54 would be straightforward follow-up work using the same direct-grep methodology demonstrated throughout this document.

---

## 38. Dead Code & Duplicate Systems

**Confirmed genuinely dead files/paths:**
- **`lib/storage.ts`** — mostly dead (Section 31 corrects an earlier over-broad characterization from research done earlier in this session): one function, `getOrCreateDeviceId`, is live and imported by `app/table/page.tsx`; the rest of the file — a full pre-Supabase localStorage CRUD layer for orders, menu, tabs, and PIN (13 dead keys) — has no other import site anywhere in the repository.
- **`lib/db.ts`** — a SQLite-backed data layer using Node's built-in `node:sqlite` module. No import site found anywhere in `app/` in the research passes for this audit. **Confidence: Per code-reading agent, not independently re-confirmed with a fresh grep in this final pass.**
- **`prisma/schema.prisma`** — a Prisma schema exists in the repository (and `package.json` retains `@prisma/client` as a dependency plus `migrate`/`db:push` npm scripts, Section 40), but the application's actual data access is 100% direct Supabase REST calls via `getServerClient()`; no `PrismaClient` instantiation or Prisma-generated import was found used anywhere in `app/` or `lib/` outside the `prisma/` directory itself. **Confidence: Per code-reading agent, not independently re-confirmed with a fresh grep in this final pass.**

**Confirmed duplicate systems (both live, not dead, but doing overlapping work):**
- Two hardcoded menu seed catalogs (`menu/seed` vs `init`, Section 7 / M4) — deliberately left unmerged this pass, see M4's reasoning.
- Two expense-tracking concepts with independent category lists (Manager Expenses vs. Finance, Section 17) — by design, see Section 17.
- ~~Two `kitchen_mode` resolution code paths~~ — RESOLVED this pass, see M1: `app/api/admin/restaurant-config/route.ts` now calls the one shared resolver.
- Two email deduplication mechanisms (`order_events` check vs. `email_log` UNIQUE constraint, Section 24) — arguably deliberate defense-in-depth rather than a problem, but genuinely two independent implementations of the same guarantee. Not touched this pass.

**~~A fully-built but unmounted component: `components/WaiterTakeOrder.tsx`~~ — this was a stale finding, corrected this pass.** Direct re-verification (Section 3, L4) confirms it IS imported and reachable from `app/waiter/page.tsx`. No dead code here after all.

**Genuinely dead code confirmed/created this pass:**
- **`DELETE /api/waiter-calls`** — confirmed zero callers anywhere in `lib/api.ts` or the UI (only GET ×2, POST, and PATCH are used; hard-delete was superseded by the audit-preserving PATCH-to-acknowledge flow). Left in place rather than removed: it is already correctly `requireRole(['admin'])`-gated, so it poses no security risk, only unused-code weight — low enough priority next to Critical/High items that removing it was not worth the risk of touching a route with no test coverage for marginal cleanup value in this pass.
- **The server-side `itemIndex` fallback branch in the order item-update route** (Section 36, H3) — dead since the H3 fix moved every caller to `order_items.id`-only. Same reasoning as above: safe (unreachable, not a vulnerability), left in place rather than risk touching order-mutation code for a pure cleanup win in the same pass as the fix that created the dead branch.
- **The legacy `customerEmail`-based auth path in `POST /api/rewards/spin`** — this one *was* removed outright (not just left dead), because it was simultaneously dead code AND a live security bypass (H7, Section 36) — the two reasons together justified the removal risk that H3/waiter-calls didn't individually meet.

**`tab_devices.personal_pin`** is not dead in the "unreferenced" sense — it IS written on every session start — but it is write-only (never read back), which is a different kind of problem; see M7, Section 36, not this section.

**No TODO/FIXME markers found anywhere** in the TypeScript source (`app/`, `lib/`) — per code-reading agent research, the codebase appears to have been deliberately cleaned of inline TODOs; remaining rough edges tend to surface as comments explaining *why* something is a known tradeoff (the Finance-auth rationale comment in Section 12 is a good example) rather than as open action items.

---

## 39. Performance Review

This audit did not run the application, so this section describes structural performance characteristics visible in the code rather than measured runtime metrics — every item below is a **Needs Runtime Verification** claim about actual impact, even where the underlying code pattern is confirmed directly.

**Confirmed structural patterns with performance implications:**
- **No incremental UI patching anywhere** (Section 23) — every realtime event triggers a full data re-fetch for the affected portal rather than patching just the changed record. At low order volume this is invisible; at higher volume it means every portal's data set is repeatedly re-fetched in full on every relevant mutation from any customer or staff action.
- **Polling runs underneath realtime on every portal regardless of subscription status** (5s staff portals, 3s Table, 4s Track) — meaning baseline request volume scales with concurrent open sessions regardless of whether anything changed, on top of whatever realtime traffic occurs.
- **The Admin Dashboard's "Load"-gated tab design** (Section 11) is itself a deliberate performance optimization — a ~6,000-line page that does not eagerly fetch all 13 sections' data on mount — but its side effect is the staleness issue in M5/Section 30.
- **Client-side computation of Finance account balances** (Section 14) means every balance view re-fetches and re-reduces the full set of underlying transactions/system-sales rows for the period rather than reading a precomputed total — fine at a single restaurant's typical daily transaction volume, but an approach that would not scale cleanly to a much larger transaction history without pagination or a server-side aggregate.
- **`GET /api/menu` is the only endpoint with any HTTP caching** (Section 30); every other read in the app hits the database fresh on every request with `force-dynamic`.

No load testing, query-plan analysis, or bundle-size measurement was performed as part of this audit — those would require a running instance or build artifacts this audit was not able to reliably produce (Section 40).

**Re-reviewed in the final remediation pass:** no new performance issues found beyond what's listed above; all polling intervals (3–5s across portals) remain unchanged and are not considered a problem at this app's scale. No performance-related code changes were made in this pass — the items above remain structural observations, not regressions introduced by the remediation work.

---

## 40. Build / Project Health (final — actually completed in this session)

**This section originally reported that no build/typecheck/lint attempt had completed, due to the execution environment used for that earlier audit (a remote shell bridge to the user's own device, which could not sustain a long-running process across tool calls).** That text is preserved below as the historical record, since it accurately reported what did and did not happen at the time. **This remediation session ran in a different execution environment (a dedicated cloud workspace with a persistent shell) and was able to run all three checks to completion.**

**Final results, this session, against the working tree immediately before the closing commit:**
- **`tsc --noEmit -p tsconfig.json`** — **PASSED, zero errors.** (The TS2305 `PrefetchForTypeCheckInternal` pattern described below was not observed in this run.)
- **`eslint .`** — **0 errors, 37 warnings** after this pass fixed 3 pre-existing `react/no-unescaped-entities` errors it happened to surface (`app/admin/page.tsx:2428`, `components/WaiterTakeOrder.tsx:563` — two on one line) while doing the full build/lint/test pass; these three were unrelated to any change made in this remediation project, just never-previously-caught lint errors in unrelated JSX text. The remaining 37 warnings are all pre-existing, non-blocking (`@typescript-eslint/no-unused-vars`, `@next/next/no-img-element` suggestions to switch to `next/image`, a couple of `react-hooks/exhaustive-deps` gaps, one `no-page-custom-font` note) — none newly introduced by this remediation project's changes. 17 `@typescript-eslint/no-require-imports` errors remain, but all are in plain Node.js CommonJS scripts outside the Next.js app itself (`print-agent/index.js`, `scripts/test-spin-*.js`, `server.js`) — these are standalone processes that intentionally use `require()`, and the project's eslint config simply doesn't carve them out from the TypeScript-oriented ruleset; left as a config-scoping cleanup item rather than rewritten to ESM, since that would risk behavior changes in processes with no test coverage for a purely cosmetic lint-config fix.
- **`npm run build` (`next build --webpack`)** — **PASSED.** `✓ Compiled successfully`, `✓ Generating static pages using 1 worker (21/21)`, all ~90 API routes and ~20 pages listed in the route manifest with no build errors, run against a freshly cleared `.next` cache.

**Original (historical) text describing the earlier, inconclusive attempt, preserved for the record:** Across an earlier session, `npm run build` was attempted five separate times against the repository on the user's device via a remote shell bridge; none completed within that tool's execution window, and a stale `tsc --noEmit` output showed a uniform TS2305 error repeated identically across every generated `.next/types/**` file, more consistent with a Next.js internal type-generation/version-compatibility artifact than an application-code defect — never confirmed either way at the time. **This is now resolved by the successful runs above:** whatever caused that pattern is not present in this session's clean run.

**`package.json` scripts, confirmed directly:** `dev`/`dev:server` → `next dev --webpack`; `build` → `next build --webpack`; `start` → `next start`; `lint` → `eslint`; `migrate` → `prisma migrate dev`; `db:push` → `prisma db push` (both Prisma scripts are effectively vestigial given Section 38's finding that Prisma is not used by the running application).

**No automated test suite exists in this project** — no `*.test.*`/`*.spec.*` files were found anywhere outside `node_modules`, and `package.json` has no `test` script. "Regression testing" for this remediation project consisted of: the build/typecheck/lint loop above, direct code re-reading to verify each fix against the actual current source (not assumed from prior reports), and the standing constraint against any mutation-based testing against the live production database. There is no automated safety net catching a future regression in this codebase — if the user wants one, that would be new work, not something this pass could verify against.

---

## 41. Migration Status Inventory (updated — 3 migrations added this remediation project)

**26 SQL files now exist in the repository** (23 as of the original audit, Section 22, plus 3 added across this remediation project): `migration_001.sql` through `migration_023_finance_atomicity.sql` (23 numbered files, sequential), plus `migrations/20260530_add_variants.sql` and `migrations/20260609_multi_customer_sessions.sql` (2 dated files in a separate `migrations/` subdirectory), plus a consolidated `schema.sql`.

**The 3 migrations added since the original audit — all written, all reviewed, per this project's standing safety rule NONE has been auto-applied to the live production database:**
- **`migration_021_idempotency.sql`** — supports the C5 fix (real idempotency-key checking for order creation).
- **`migration_022_rls_tighten.sql`** — supports the C2 fix (removes the universal `USING(true) WITH CHECK(true)` allow-all RLS policy from all 33 tables, leaving default-deny for the anon key).
- **`migration_023_finance_atomicity.sql`** — supports the H5 fix (`SECURITY DEFINER` Postgres functions making vendor/salary payment writes atomic with idempotency-key support and row locking).

**Applying these three (in addition to confirming migration_020 and the two dated `migrations/` files, per the pre-existing caveat below, are actually applied) is the clearest concrete remaining action item from this entire remediation project** — see Section 44's Production-Readiness Assessment. This requires the user's explicit approval before running against the live database; this remediation pass could not and did not apply them itself.

**This inventory can only describe what exists in the repository — it cannot confirm what has actually been applied to the live Supabase project this application runs against, since this audit has no database credentials or ability to query a live Supabase instance.** That distinction — "exists in repo" versus "confirmed applied to Supabase" — is exactly the one the user asked this document to preserve, so it is stated plainly: **every migration-related claim in this document (table existence, column names, RLS policies, the `perform_spin()` function, the Finance schema) reflects what the SQL files in the repository declare, not a live introspection of an actual running database.** If the live Supabase project is behind the repository's migration files — for instance, if `migration_020_staff_ordering.sql` or the two dated `migrations/` files have not actually been run against it — then features this document describes as present (e.g. any staff-ordering-related schema from migration 020, or the variants/multi-customer-session schema from the two dated files) would not actually work in production despite the application code expecting them to exist. **Confidence: Needs Runtime Verification — recommend running each migration file's own verification block (several, including migration_019_finance.sql, end with a commented-out `SELECT` block specifically for this purpose) against the live project before relying on any schema claim in this document operationally.**

**No migration-tracking table or applied-migrations ledger was found in the repository's own SQL** — there is no `schema_migrations` table or equivalent being created/checked by any of the 23 files, meaning there is also no way to determine applied-status even by inspecting the schema alone; it would need to be inferred by checking for the presence of each migration's own distinguishing objects (a specific table, column, or function) against the live database.

---

## 42. Current Feature-Status Matrix (final, post-remediation)

| Feature | Status | Notes |
|---|---|---|
| Online ordering (pickup/delivery) | Implemented | Offline duplicate-order risk RESOLVED (C5 — real server-side idempotency-key check) |
| Table QR / dine-in ordering | Implemented | Reward-coupon redemption RESOLVED (C4 — `reserved_order_id` used consistently) |
| Order tracking | Implemented | PII exposure RESOLVED (C6 — token now required server-side, ids/tokens now `crypto.randomBytes`-based) |
| Spin & Win rewards | Implemented | Server-side allocation and eligibility robust (Section 25); legacy unauthenticated email-auth path REMOVED (H7) |
| QR code generation | Implemented | Fallback for unreachable third-party API RESOLVED (L1) |
| Kitchen display | Implemented | Item-index risk RESOLVED (H3, now keyed by `order_items.id`); mute-toggle gap on the alert beep RESOLVED (L2); timer-basis (order age, not cook-start) still a known behavior, not changed |
| Physical KOT printing | Implemented | Fail-open auth gap RESOLVED (H2 — now fails closed if `PRINT_AGENT_KEY` unset) |
| Waiter order confirmation | Implemented | |
| Waiter manual order entry ("Take Order") | **Implemented and shipped** | `WaiterTakeOrder.tsx` confirmed live and wired into `app/waiter/page.tsx` — L4 was a stale documentation claim, corrected this pass, no code change needed |
| Delivery dashboard | Implemented | Structural quirks (near-empty "Delivered" bucket) are working-as-coded, not bugs, per the confirmed auto-chain logic |
| Manager billing / tab close | Implemented | Server-authoritative close logic solid; stats-bar bug RESOLVED and relabeled (H1 — "Net Margin Today", see Section 51) |
| Manager table map | Implemented, read-only | No click-through by design/omission |
| Admin dashboard (13 sections) | Implemented | Kitchen-mode dual-resolver RESOLVED (M1); PIN Manager modal / Table Occupancy Analytics / CSV import-export remain unwired by product-scope decision (L3, not a bug) |
| Finance — System Sales | Implemented | Computed live, not stored; now the single authoritative revenue engine also consumed by Manager and Admin Analytics, not Finance-only (Section 51) |
| Finance — Account Balances | Implemented | Client-computed, no server source of truth to check against (not changed this pass) |
| Finance — Vendor Accounting | Implemented | Non-atomic write sequence RESOLVED (H5 — atomic `SECURITY DEFINER` RPCs with idempotency, migration written, **not yet applied to live DB**) |
| Finance — Salary Accounting | Implemented | Same atomicity fix as Vendor Accounting |
| Finance — Daily Closing | Implemented | Deliberately non-locking (M6, by design, unchanged) |
| Finance — order-deletion sync | **Implemented (new this pass)** | Deleting orders belonging to a closed tab now reverses that tab's recognized revenue, auditably, with a split-bill safety skip-guard (Section 32/51) |
| Server-side authentication/sessions | **Implemented** | RESOLVED (C1) — every mutating/PII route now requires a real session (`requireRole`/`requireAnyStaff`) or an explicit customer ownership-proof pattern |
| Row Level Security | **Written, not yet applied to live DB** | `migration_022_rls_tighten.sql` removes the universal allow-all policy (C2) — needs explicit user approval before it can be applied to the production database |
| Payment gateway integration | **Not implemented (by design)** | Payment methods are labels only (Section 26) |
| Automated email retry / cron | **Not implemented** | Manual flush only (Section 24) — unchanged, out of scope for this pass |
| Config centralization (ENV/Admin/Default) | Partially implemented | Real for restaurant name (4 surfaces) and kitchen_mode (RESOLVED this pass, M1); restaurant-ID centralization (M2) and full name-hardcode sweep (M3) deliberately deferred — cosmetic-only, no functional impact, see M2/M3 reasoning in Section 36 |

---

## 43. End-to-End Business Flow

A representative dine-in flow, traced through the confirmed code paths documented above, start to finish:

1. **Customer scans a table QR code** (generated by `/qr`, encoding `?table=<id>`) → lands on `/table?table=<id>` → enters name, a 4-digit session PIN, optional contact info → a `customer_tabs` row is created for this individual diner and a `fl_device_id` is bound to it via `tab_devices` for later session recovery (Section 5).
2. **Customer browses the shared `menu_items` catalog** (fetched once, 60s edge-cached, Section 30) and builds a cart; placing an order calls the order-creation path with the tab ID set. If an `awaiting_waiter` order already exists on the tab, items merge into it rather than creating a second order (Section 5).
3. **The new/merged order sits at `awaiting_waiter`** (Section 4) until a waiter, seeing it in the Waiter Station, chooses "Confirm & Print KOT" or "Confirm & Send to Kitchen" (Section 8) — routing it to `preparing` and, depending on the restaurant's kitchen-routing mode (Section 27/M1), either queuing a `print_jobs` row for the physical print-agent (Section 9) or making it appear on the Kitchen Display (Section 9).
4. **Kitchen staff advance the order** through `prepared` as items are cooked, using the per-item or whole-order advance buttons (subject to the confirmed item-index risk, H3).
5. **A waiter marks the order `served`** once food reaches the table (Section 8); the customer sees a "Did you receive your food?" confirmation prompt on their next 3-second poll of the Table portal (no realtime push reaches this page, Section 23).
6. **The customer requests the bill**; a manager opens the tab in the Billing board, applies any discount/split-billing, and executes Close Tab — a server-authoritative operation that recomputes the total from every non-void order on the tab, attempts reward-coupon redemption (broken for this dine-in path specifically, C4), marks every order `completed`, frees the table, and fires a receipt email plus a Spin & Win invite (Section 5).
7. **If the customer received a Spin & Win invite** and follows the emailed link, `/spin` re-verifies eligibility server-side (Section 25), and a win becomes a `reward_coupons` row usable on a future order.
8. **Throughout this entire flow, essentially none of the API calls involved required any credential** (Section 19) — the only PIN-gated actions anywhere in this sequence are the waiter/kitchen/manager login screens themselves (client-side-checked, Section 20), not the underlying order/tab/kitchen mutation endpoints those UIs call.
9. **On the Finance side**, once this tab closes, its total becomes part of the next `computeSystemSales()` call for that date (Section 13) and, if a manager or admin ever posts a corresponding vendor purchase or salary payment for costs related to serving that customer, those flow through the separate Finance ledger (Sections 15–16) — entirely independently of the order/tab data, connected only by falling within the same date range at reporting time.

---

## 44. Production-Readiness Assessment (final, post-remediation)

**This section originally concluded the application was not production-ready primarily due to missing authentication.** That conclusion drove the multi-session remediation project this document now describes the end state of. This is the updated assessment, based on direct re-verification of the current code (Section 36), not a rewrite of the original narrative.

**Security posture is now substantially different from the original assessment.** Every Critical finding (C1–C6) and all applicable High findings (H2, H3, H6) are RESOLVED and independently re-verified against current code, with explicit in-code remediation comments at each fix site. Server-side sessions now gate every mutating/PII-bearing route; PINs are hashed and verified server-side; order tracking is token-gated; order/tracking IDs are cryptographically random; the offline-ordering path has a real idempotency guarantee; the dine-in coupon redemption bug is fixed. Two additional, previously-undocumented security issues (a legacy auth-bypass in Spin & Win, an unauthenticated PII dump in tab-devices lookups) were found and fixed in this final pass.

**Two items remain that this remediation pass could not close on its own, both for the same reason — they require applying a migration to the live production database, which this project's standing safety rule (no auto-applied migrations without explicit user approval) correctly prevents an autonomous pass from doing:**
1. `migration_022_rls_tighten.sql` — removes the universal allow-all RLS policy (C2). Written, reviewed, not applied.
2. `migration_023_finance_atomicity.sql` — makes vendor/salary payment writes atomic (H5). Written, reviewed, not applied.

**These two migrations are the single most important remaining action item before this codebase can be considered fully hardened**, and applying them is explicitly a decision for the user, not this remediation pass, given they touch the live production database.

**One deliberately-unresolved item remains by design, not oversight:** a single shared Admin PIN still gates Finance, order deletion, and the entire Admin Dashboard with no privilege separation (H4) — introducing a second credential is a business/operations decision (who holds it, how it's provisioned) that this remediation pass flagged rather than guessed at.

**Financial data integrity has been meaningfully strengthened this pass:** vendor/salary payment posting moved from non-atomic sequential writes to atomic `SECURITY DEFINER` Postgres functions with idempotency keys and row locks (pending DB application, above); Manager/Admin/Analytics revenue figures were centralized onto one authoritative computation (`computeSystemSales()`) instead of four independent implementations that could silently disagree (Section 51); order deletion now auditably reverses closed-tab revenue instead of leaving Finance showing stale numbers with zero trace. Remaining, unchanged gaps: client-computed account balances with no server-side check to validate against (Section 14), and the deliberately-non-locking daily-closing design (M6, by design).

**Build health was directly and successfully verified in this session** (Section 40) — `tsc --noEmit`, `eslint`, and `next build` all run to completion in this session's own execution environment, unlike the earlier remote-device-bridge attempts recorded in Section 40's original text (kept there as the historical record of that earlier, inconclusive attempt).

**Bottom line:** the application has moved from "should be treated as fully open to anyone who discovers its URL" to "has real server-side authorization on every mutating/PII route, with two written-but-unapplied migrations standing between it and a fully hardened database layer." The remaining open items (Section 36 Medium/Low, plus the two pending migrations and the by-design H4/M6/M8 items) are genuine but no longer of the same severity class as the original Critical findings.

---

## 45. Executive Summary (final, post-remediation)

Foodie Lover is a ten-portal, single-restaurant operations app (online/table/track/spin ordering surfaces for customers; kitchen/waiter/delivery/manager/admin surfaces for staff) built on Next.js + Supabase, with a real order state machine, a server-locked reward-spin function, live realtime updates for staff portals, and a Finance module covering system sales, cash/bank account balances, vendor accounting, salary accounting, and daily closing.

**This document was originally written as a from-scratch security/quality audit that found the application's single largest problem was authentication** — roughly 70% of API routes had no server-side credential check, and Row Level Security enforced nothing. That audit drove a multi-session remediation project. **This final section reflects the end state of that project, independently re-verified against current code rather than assumed:** all Critical findings (C1–C6) and all applicable High findings are resolved; two additional security issues found in this final pass (legacy Spin & Win auth bypass, unauthenticated tab-devices PII dump) are also fixed; Manager/Admin/Analytics revenue calculations were centralized onto one authoritative engine with an explicit documented waterfall (Gross Sales → Discounts → Net System Sales → Manager Expenses → Finance ledger effects → Net Cash Flow, Section 51) so the same period no longer shows contradictory numbers across screens; order deletion now auditably reverses closed-tab Finance revenue instead of silently leaving stale numbers.

Two migrations remain written but not applied to the live database (RLS tightening, Finance write atomicity) — both require explicit user approval per this project's live-database safety rule, and are the clearest concrete next action. One privilege-separation gap (single shared Admin PIN) and a handful of Medium/Low findings remain, by design or by deliberate scope decision, each with its reasoning documented in Section 36 rather than silently left unexplained.

Build health was independently verified in this session — `tsc --noEmit`, `eslint`, and `next build` — see Section 40 for the actual results.

**Bottom line:** the feature set is real, the code is well-structured, and the application's security posture has moved from "not production-ready" to "hardened at the application layer, with two pending database migrations awaiting the user's explicit go-ahead before the database layer itself is fully hardened too."

---

## 46. Environment / Configuration Summary

15 application-level environment variables in active use (Section 28): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (highest sensitivity — bypasses RLS entirely, though RLS enforces nothing anyway), `NEXT_PUBLIC_RESTAURANT_ID`, `NEXT_PUBLIC_APP_URL`, `ADMIN_PIN`/`KITCHEN_PIN`/`MANAGER_PIN` (first-run seed only), `RESEND_API_KEY`, `FROM_EMAIL`, `GEMINI_API_KEY`, `PRINT_AGENT_KEY` (fails open if unset), `CRON_SECRET` (appears unused — no cron configuration found), `APP_ENV`, `NODE_ENV`; plus 7 print-agent-specific variables on the separate companion process (`PRINTER_TYPE`, `PRINTER_NAME`, `PRINTER_DEV`, `PRINTER_IP`, `PRINTER_PORT`, `PRINTER_CHARS_PER_LINE`, `PRINTER_STATION_ID`).

The centralized `lib/config-server.ts` resolver correctly implements ENV > Admin (`restaurant_settings`/`restaurants`) > Default precedence, and is genuinely wired for the restaurant display name across 4 surfaces (email, AI chat, rewards routes, spin page, restaurant-config route, init route, admin page, config diagnostics). It is not wired for the restaurant ID (29 files still hardcode `?? 'rest_default'` independently) and is bypassed by one hand-rolled duplicate implementation for `kitchen_mode` in the one route that actually matters most for that setting (the one Waiter/Kitchen polls). 13 files still hardcode the literal string `"Foodie Lover"` outside the resolver's reach. Full detail in Section 27.

---

## 47. Database / Migration Summary

33 tables, 43 original RLS policies (`USING (true) WITH CHECK (true)` — the original universal-allow baseline), across 26 SQL files as of the end of this remediation project (23 sequential numbered migrations — 20 original plus 3 added this project: idempotency, RLS tightening, Finance atomicity — 2 dated files in a `migrations/` subdirectory, 1 consolidated `schema.sql`). `migration_022_rls_tighten.sql` removes the universal allow-all policy entirely (down to zero permissive policies, i.e. default-deny for the anon key) — **written but not applied to the live database**, so the 43-permissive-policy baseline remains the actual live state until the user approves applying it. No migration-tracking/applied-ledger table exists, so this document — and any future one — can only describe what the repository's SQL declares, never what has actually been run against a live Supabase project, absent direct database access. Core entities: `restaurants` → `staff`/`menu_items`/`tables`/`orders`/`customer_tabs`; orders fan out to `order_items`/`order_events`/`order_issues`/`order_feedback`/`print_jobs`; rewards span `spin_config`/`spin_rewards`/`spin_results`/`reward_coupons`; Finance's 10 tables (`finance_accounts`, `finance_categories`, `finance_transactions`, `finance_audit_log`, `vendors`, `vendor_purchases`, `vendor_payments`, `staff_salary_config`, `salary_payments`, `daily_finance_closings`) are the most recently added and the most consistently authorized, and as of this project also have atomic, idempotent write functions for vendor/salary payments (`migration_023_finance_atomicity.sql`, not yet applied). Full detail and ER diagram in Section 22; migration-status caveats in Section 41.

---

## 48. Finance Summary

Ten tables, 19 API routes, one shared UI component (`AdminFinance.tsx`), and — uniquely in this codebase — genuine, consistently-applied server-side PIN authorization on every route including GETs, now layered on top of a real session check on every route too (Section 36, C1/H4). System Sales is always computed live from `customer_tabs` (closed) + non-tab `orders` (completed), never stored except when frozen into a `daily_finance_closings` JSONB snapshot — **and, as of this remediation project, is the single authoritative revenue engine also consumed by Manager and Admin Analytics, not a Finance-only computation** (Section 51). Account balances are still computed entirely client-side from opening balance + auto-matched system sales + manual ledger entries, with no server-computed figure to check the math against — unchanged this pass. **Vendor and salary payment posting is no longer a non-atomic sequential write** — `migration_023_finance_atomicity.sql` makes both atomic via `SECURITY DEFINER` Postgres functions with idempotency-key support and row locking (written, not yet applied to the live database — Section 41/44). Daily closing remains a soft, advisory snapshot that does not lock underlying data, by design (M6). Finance deliberately does not merge with the pre-existing Manager Expenses feature; it reads that table live for reporting but keeps its own separate category list. Order deletion now auditably reverses closed-tab Finance revenue instead of leaving it stale (Section 32). Full detail in Sections 12–18 and 51.

---

## 49. Security / Authentication Summary (final, post-remediation)

**This summary describes the state at the START of the full remediation project, followed by what changed.** It is kept as the historical baseline rather than deleted, because it's the clearest single paragraph explaining *why* the remediation work happened.

**Original state:** No session layer existed anywhere in the application — no cookies, no JWTs, no middleware. "Login" was a client-side `localStorage` token with an 8-hour TTL, checked only by the page component, never by the API. Of 77 total API routes, only 21 performed real server-side PIN verification; the remaining ≈70% had no authentication mechanism at all. Every one of the 33 database tables had Row Level Security enabled, but every policy was `USING (true) WITH CHECK (true)` — a universal allow-all providing no defense-in-depth. Every PIN was stored and compared as plaintext with no hashing; staff PINs were additionally sent to the browser in full for a client-side comparison via an unauthenticated GET. A single shared Admin PIN gated the entire Admin Dashboard, the entire Finance module, and both destructive order-deletion tools. Order tracking data was returned by the server before any token check occurred, and both order IDs and tracking tokens were generated from `Date.now() + Math.random()` rather than a cryptographically secure source.

**Current state, after the full remediation project (this session's final re-verification, Section 36):**
- **Real server-side sessions now exist** (`lib/session-server.ts`, HMAC-signed cookie, `requireRole`/`requireAnyStaff`) and gate every mutating/PII-bearing route — of 79 current route files, only 19 remain intentionally public, each behind an explicit customer ownership-proof pattern (tab id as bearer capability, tracking token, spin token, or coupon email+phone match) rather than a blanket-open gap. **C1: RESOLVED.**
- **PINs are hashed** (`lib/pin-hash.ts`) and verified server-side; `GET /api/staff/[id]` no longer ships a plaintext PIN to the browser and is itself now admin-gated. **C3: RESOLVED.**
- **Order IDs and tracking tokens are now `crypto.randomBytes`-based** (`newSecureId()`) and `GET /api/orders/[id]` requires either a staff session or a matching token before returning order data. **C6: RESOLVED.**
- **Row Level Security tightening is written** (`migration_022_rls_tighten.sql` removes the universal allow-all policy, leaving default-deny for the anon key) but **not yet applied to the live database** — this needs explicit user approval before it can close C2, per this project's standing live-database safety rule.
- **Finance module** retains its own defense-in-depth PIN layer (`requireAdminPin`) on top of the new session requirement (every Finance route now requires both `requireRole(['admin'])` and the Finance PIN) — see Section 12/H4. The single-shared-Admin-PIN privilege-separation gap (H4) is unchanged, by design, flagged for the user's decision rather than unilaterally resolved.
- **Two security issues were found and fixed in this final pass** that were not in the original audit at all: `POST /api/rewards/spin`'s legacy unauthenticated email-based auth path (H7 — removed outright, had zero live callers) and `GET /api/tab-devices`'s unfiltered-when-no-params PII dump (H8 — now requires `tabId` or `deviceId` and filters by `restaurant_id`).

Full detail in Sections 19–20 (original baseline) and Section 36 (final Critical/High/Medium/Low status, all re-verified against current code in this pass, not assumed from the original audit text).

---

## 50. Appendix: Files Read For This Audit

This document was originally produced from a fresh repository snapshot (164 files) pulled from the user's device at commit `618a9a7832b2365b173ece0a6fa3632023d1e115`, via nine parallel code-reading research passes plus direct re-verification of every "Confirmed directly" claim — see the original text above (unchanged) for that pass's exact method and file list.

**This final section documents the remediation project that followed, and the closing re-verification pass that produced Sections 36 (final)/42/44/45/49/51 and every other section marked "final" or "resolved"/"RESOLVED" above.** The remediation ran as a sequence of checkpointed commits, each addressing one or a small cluster of related findings, working against a live production Supabase database under a standing safety rule: no destructive/mutation-based testing against it, and no migration auto-applied without explicit user approval. Baseline commit: `b6a4e19` ("baseline: complete accurate snapshot at commit 618a9a7 before remediation"). Full commit sequence, oldest to newest:

`e43742a` C1/C3 real session cookies + secure staff-login, staff PIN leak fixed · `7f65f69` C4 dine-in coupon redemption fix + C6 tracking-token check and crypto-random ids · `b58fd13` C5 real offline-order idempotency (adds migration_021) · `74ae7d7` C1 admin routes gated · `f326453` C1 menu/tables/offers/analytics/email/init/settings/expenses routes gated, settings PATCH hardened · `c456f3d` C1 orders-danger-zone/waiter-calls/order-issues/split-bills/shifts/rewards routes gated · `c4faa52` C1 orders & tabs[id] split-branch auth · `da4aa4c` C2 migration file only, RLS-tightening (not applied) · `5522f7e` C3 PIN hashing with zero-downtime migration · `d350793` AUTH-3 orders[id] PATCH auth · `38958bb` Finding #9 print-jobs fail-closed · `901968d` Finding #8 Manager today-revenue fix · `0530848` Finance finding #12 atomic vendor/salary payments · `7d71a0a` Finance finding #11 admin session on every Finance route · `4ae4624` AUTH-4 tabs PII leak + coupon reservation theft closed · `45841fb` ORDERS admin deletion reverses closed-tab revenue · `e860058` FINANCE centralize revenue across Manager/Admin/Analytics, audit-safe tab reversal · **this session's closing commit** (Section 36 H1/H7/H8/M1/L1/L2 fixes, WaiterTakeOrder documentation correction, Section 51 waterfall documentation, full final re-verification of every C/H/M/L finding against current code, clean `tsc`/`eslint`/`next build`).

**This closing session's own re-verification method:** rather than trust the "Known Issues" section's text as current, every Critical and High finding was re-checked against a fresh read of the actual current file at its cited location (not assumed fixed because a commit message claimed it) — done via a dedicated read-only verification pass (see Section 36's per-finding evidence, each citing current file:line, not the original audit's citations). Two additional security issues not present in the original audit (H7, H8) were found and fixed during this same verification pass. Every `grep`/count reported anywhere in this document as "confirmed" or "re-confirmed" in this final pass was run directly against the repository during this session, not estimated or carried forward.

---

## 51. Revenue Recognition Waterfall — Gross Sales → Net Cash Flow

This section exists because Manager, Admin Analytics, and Finance previously computed "revenue"/"profit" independently, using different queries over different tables with different date-boundary and status-filter logic — so the same business day could show different numbers on different screens, and one screen (Manager) was labeling a figure "Net Profit" that was not, in fact, profit. This section defines the waterfall explicitly and states, for each stage, which function computes it and which screens display it, so a future change has one place to check for consistency instead of five.

### The five stages

**1. Gross Sales.** The full pre-discount value of everything sold and actually recognized as revenue. For a dine-in tab: `customer_tabs.total` at the moment the tab is closed. For a pickup/delivery/online order: `orders.subtotal` (falling back to `orders.total` if `subtotal` is null) at the moment the order reaches `status = 'completed'`. Computed by `computeSystemSales()` in `lib/finance-server.ts`, field `gross` on each `SystemSaleRow`.

**2. − Discounts/Coupons.** For a dine-in tab: `customer_tabs.discount + customer_tabs.coupon_discount`. For a non-tab order: `orders.discount`. Field `discount` on each `SystemSaleRow`.

**3. = Net System Sales.** `max(0, Gross − Discounts)` for tabs; for non-tab orders it is simply the stored `orders.total` (the order's own total already has its discount applied at write time, so it is not independently re-derived — see the in-code comment on `computeSystemSales()` explaining this asymmetry). This is the app's **one authoritative revenue figure** — `computeSystemSales()` / `sumSystemSales()` in `lib/finance-server.ts`, field `net`. Every screen that shows "revenue," "sales," or "System Sales" for a period is required to route through this function (directly, or through an endpoint that calls it) rather than compute its own sum over `orders`/`customer_tabs`:
   - Finance module (`components/AdminFinance.tsx`, via `GET /api/finance/summary` and `GET /api/finance/system-sales`) — the original, canonical caller.
   - `GET /api/manager/today-revenue` — a manager-accessible (not admin-PIN-gated) wrapper around the same `computeSystemSales()`/`sumSystemSales()` call, added so Manager's "Revenue Today" is arithmetically identical to Finance's for the same day, not a second implementation. Consumed by `app/manager/page.tsx` (`todayRevenueApi`) and `app/manager/expenses/page.tsx`.
   - Admin Dashboard Overview + End-of-Day report (`app/admin/page.tsx`, `getTodayRevenue()`) and the Sales Report tab's period stat cards (`getSystemSalesSummary()`, same underlying endpoint with the full gross/discount/net breakdown) — both now call the same wrapper instead of deriving revenue from a client-side `orders.filter(...).reduce(...)`.
   - `GET /api/analytics` (`app/api/analytics/route.ts`) — `totalRevenue` and the `revenueByDay` bucketing are now computed from `computeSystemSales()`'s rows rather than a raw `orders` query. (This also fixed a real, independently-discovered bug: the old query excluded `status='cancelled'` orders but not `status='void'` ones, so voided orders were counted as revenue.)
   
   **Deliberately NOT routed through `computeSystemSales()`:** the item/order-level analytics breakdowns — top items, peak hours, per-category sales, per-waiter performance, and the individual rows (not the TOTAL row) of the Hour/Day/Week breakdown table. A closed tab's `SystemSaleRow` is one aggregated row per tab; it does not preserve which individual orders or line items made up that tab, so item/order-level breakdowns structurally cannot be derived from it without a rearchitecture of what a tab-close writes. These views still read `orders` directly and are documented in the UI (a caption above the breakdown table) and in code comments as views that may not sum to exactly the headline "Net System Sales" total for the same period — which is expected and not a bug, since they answer a different question ("which items/hours/staff") rather than "how much revenue."

**4. − Operating/Manager Expenses.** `expenses` table rows (Manager-logged operating costs — rent, utilities, ad-hoc purchases; see Section 17 for why this is a separate table from Finance's own ledger). `Net System Sales − Manager Expenses` for a period is called **Net Margin** in this app (`app/manager/page.tsx`'s `todayNetMargin`, `app/manager/expenses/page.tsx`'s `netMargin`) — explicitly **not** "Net Profit," because it excludes every Finance-ledger effect in stage 5 below. Manager Portal screens are Manager-scoped by design (Managers do not have Finance/admin-PIN access), so Net Margin is the correct, honestly-scoped figure for that portal to show — the fix here was the label and the underlying revenue number, not the scope.

**5. + / − Other Finance ledger effects.** `finance_transactions` rows (`type='income'` or `type='expense'`, `is_voided=false`), which include but are not limited to vendor payments (`source='vendor_payment'`) and salary payments (`source='salary_payment'`) — see Sections 15–16. These exist only inside the Finance module; Manager-scope Net Margin never sees them, which is exactly why the two figures are allowed to differ and must not share a label.

**= Net Cash Flow.** `computeFinanceSummary()` in `lib/finance-server.ts`:
```
netCashFlow = systemSales.net + ledger.income − managerExpenses.total − ledger.expense
```
This is Finance-scope only — `GET /api/finance/summary`, `GET /api/finance/closings`, and `components/AdminFinance.tsx`'s Overview tab are the only places this figure is shown, always labeled **"Net Cash Flow,"** never "Net Profit" or "Net Margin." It is a cash-movement figure (money actually recorded as moving through the ledger — vendor payments, salary payments, manual income/expense entries — in addition to system sales and expenses), not a strict accrual-accounting profit figure; whether every `finance_transactions` entry represents a period-appropriate accrual is outside the scope of this remediation and depends on how the restaurant's admin actually uses the Finance ledger day to day.

### Why "Net Cash Flow" and "Net Margin" must stay two different labels

They are computed from different inputs (Net Cash Flow includes Finance-ledger income/vendor/salary effects that Net Margin never sees) and are shown to different audiences with different access levels (Manager screens can't see Finance-ledger detail at all, by design — Section 19/H4). Before this remediation pass, `app/manager/page.tsx` and `app/manager/expenses/page.tsx` both called their Manager-scope figure "Net Profit," which is a mathematically different quantity from Finance's own "Net Cash Flow" for the same day whenever there was any vendor/salary/ledger activity that day — two different numbers, two different meanings, one ambiguous name. Both Manager-facing labels are now **"Net Margin"**, with an inline sub-caption explicitly stating what it does and does not include (`sub="Revenue − Manager Expenses (excl. Finance ledger)"` in `app/manager/expenses/page.tsx`).

### The IST business-day boundary

"Today" is defined consistently as **IST (Asia/Kolkata, UTC+5:30) calendar-day midnight**, via `todayMidnightIST()` in `lib/date.ts`, used as the `from` boundary by every "Today" figure described above (`GET /api/manager/today-revenue`, Admin's Overview "Net Revenue" tile, Finance's implicit day-scoped views). This matters because the underlying Supabase timestamps are UTC — a naive `new Date()` midnight boundary computed in UTC would put the first 5.5 hours of an IST business day into "yesterday," silently shifting revenue between days near midnight IST. All of the revenue call sites listed in stage 3 above use this same helper rather than deriving their own boundary.

### What this section deliberately does not claim

This waterfall describes the **system's own model** of these figures, not an external accounting/GAAP definition of "gross sales," "net profit," or "cash flow" — those terms are used here in the sense this codebase's own comments and this remediation pass have defined them, for internal consistency across Manager/Admin/Finance. If the restaurant's actual bookkeeping needs to reconcile these figures against a formal P&L, that reconciliation (e.g., whether all `finance_transactions` entries are period-appropriate accruals, whether `managerExpenses` should be treated as COGS vs. opex, etc.) is a business/accounting question outside what this codebase or this remediation pass can determine, and is flagged here rather than guessed at.

---

**End of document.**
